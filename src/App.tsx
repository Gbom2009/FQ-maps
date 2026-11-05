import { useEffect, useState } from "react";
import { MapView } from "./map/MapView";
import { PlanMode } from "./modes/plan/PlanMode";
import { DriveMode } from "./modes/drive/DriveMode";
import { SettingsMode } from "./modes/settings/SettingsMode";
import { Splash } from "./Splash";
import { useApp, type Mode } from "./store/app";
import { usePlan } from "./store/plan";
import { useDrive } from "./store/drive";
import { useT } from "./i18n";
import * as session from "./modes/drive/session";
import { keepAwake } from "./location/wakeLock";
import { isNight } from "./theme/sun";
import { HOME } from "./config/services";
import { setReminderBanner, startReminders } from "./features/gigs/reminders";

// Leave-by reminders run for the app lifetime.
startReminders();

const MODES: Mode[] = ["plan", "drive", "settings"];

export default function App() {
  const { mode, setMode, theme, setTheme, autoTheme, lang } = useApp();
  const active = usePlan((s) => s.active);
  const locked = useDrive((s) => s.locked);
  const source = useDrive((s) => s.source);
  const t = useT();
  const [splash, setSplash] = useState(true);
  const [reminder, setReminder] = useState<string | null>(null);
  useEffect(() => { setReminderBanner(setReminder); return () => setReminderBanner(() => {}); }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = lang;
  }, [theme, lang]);

  useEffect(() => {
    const id = setTimeout(() => setSplash(false), 1400);
    return () => clearTimeout(id);
  }, []);

  // ---- drive session lifecycle: one session per "Start driving" --------
  const sessionId = active?.sessionId;
  useEffect(() => {
    const a = usePlan.getState().active;
    if (a) session.start(a);
    else session.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, source]);
  // Free driving (no route): still show position/speed while in Drive mode.
  useEffect(() => {
    if (mode === "drive" && !usePlan.getState().active && source === "real") session.ensureProvider();
    if (mode !== "drive" && !usePlan.getState().active) session.stop();
  }, [mode, source]);

  useEffect(() => { keepAwake(!!active || mode === "drive"); }, [active, mode]);

  // ---- safety lock: moving → only Drive mode ----------------------------
  useEffect(() => { if (locked && mode !== "drive") setMode("drive"); }, [locked, mode, setMode]);

  // ---- automatic day/night ---------------------------------------------
  useEffect(() => {
    if (!autoTheme) return;
    const apply = () => {
      const f = useDrive.getState().fix;
      const night = isNight(new Date(), f?.lat ?? HOME[1], f?.lon ?? HOME[0]);
      const want = night ? "night" : "day";
      if (useApp.getState().theme !== want) setTheme(want);
    };
    apply();
    const id = setInterval(apply, 60_000);
    return () => clearInterval(id);
  }, [autoTheme, setTheme]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapView mode={mode === "drive" ? "drive" : "plan"} />
      <div className="pointer-events-none absolute inset-0">
        {mode === "plan" && <PlanMode />}
        {mode === "drive" && <DriveMode />}
        {mode === "settings" && <SettingsMode />}
      </div>

      <nav className="absolute inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] flex border border-fq-line bg-fq-bg/90 backdrop-blur">
        {MODES.map((m) => {
          const disabled = locked && m !== "drive";
          return (
            <button key={m} aria-pressed={mode === m} disabled={disabled} onClick={() => setMode(m)}
              title={disabled ? t("drive.lockedMsg") : undefined}
              className="fq-bracket h-16 flex-1 text-sm uppercase tracking-widest disabled:opacity-30">
              {disabled ? "🔒 " : ""}{t(`mode.${m}`)}
            </button>
          );
        })}
      </nav>

      {reminder && (
        <div role="alert" className="absolute inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-40 mx-auto flex max-w-lg items-center gap-3 border border-fq-primary bg-fq-bg/95 px-4 py-3 text-fq-strong">
          <span className="text-2xl">⏰</span>
          <span className="flex-1 text-sm">{reminder}</span>
          <button onClick={() => setReminder(null)} className="h-11 w-11 text-fq-muted" aria-label="close">×</button>
        </div>
      )}
      {splash && <Splash />}
    </div>
  );
}
