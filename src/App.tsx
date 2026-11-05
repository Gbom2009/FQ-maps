import { useEffect, useState } from "react";
import { MapView } from "./map/MapView";
import { PlanMode } from "./modes/plan/PlanMode";
import { DriveMode } from "./modes/drive/DriveMode";
import { SettingsMode } from "./modes/settings/SettingsMode";
import { Splash } from "./Splash";
import { useApp, type Mode } from "./store/app";
import { useT } from "./i18n";

const MODES: Mode[] = ["plan", "drive", "settings"];

export default function App() {
  const { mode, setMode, theme, lang } = useApp();
  const t = useT();
  const [splash, setSplash] = useState(true);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = lang;
  }, [theme, lang]);

  useEffect(() => {
    const id = setTimeout(() => setSplash(false), 1400);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapView mode={mode === "drive" ? "drive" : "plan"} />
      <div className="pointer-events-none absolute inset-0">
        {mode === "plan" && <PlanMode />}
        {mode === "drive" && <DriveMode />}
        {mode === "settings" && <SettingsMode />}
      </div>

      <nav className="absolute inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] flex border border-fq-line bg-fq-bg/90 backdrop-blur">
        {MODES.map((m) => (
          <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}
            className="fq-bracket h-16 flex-1 text-sm uppercase tracking-widest">
            {t(`mode.${m}`)}
          </button>
        ))}
      </nav>

      {splash && <Splash />}
    </div>
  );
}
