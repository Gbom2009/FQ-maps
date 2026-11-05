import { useEffect, useState } from "react";
import { useT } from "../../i18n";
import { usePlan } from "../../store/plan";
import { useApp } from "../../store/app";
import { useDrive } from "../../store/drive";
import { formatClock, formatDistance, formatDuration } from "../../nav/format";
import { isSpeeding } from "../../nav/speed";
import { buildGeometry } from "../../nav/guidance";
import { hasVoice, stopSpeaking } from "../../nav/voice";
import { ManeuverIcon } from "./ManeuverIcon";
import { SimPanel } from "./SimPanel";
import * as session from "./session";

/** Maneuver distance the way a HUD should show it: coarse when far, fine when close. */
function hudDistance(m: number, lang: "nl" | "en") {
  if (m < 100) return `${Math.max(0, Math.round(m / 10) * 10)} m`;
  if (m < 1000) return `${Math.round(m / 50) * 50} m`;
  return formatDistance(m, lang);
}

/**
 * Drive mode HUD — glanceable, 64pt+ targets, no logo.
 * Works landscape (iPad on the mount) and portrait (iPhone).
 */
export function DriveMode() {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const setMode = useApp((s) => s.setMode);
  const active = usePlan((s) => s.active);
  const endDrive = usePlan((s) => s.endDrive);
  const { fix, guidance: g, limitKmh, muted, follow, rerouting, rerouteError, arrived, gpsError, locked, source, devTools, set } = useDrive();

  // Guidance geometry is owned by the session; the HUD only needs maneuver text, so derive it cheaply.
  const [geo, setGeo] = useState(() => (active ? buildGeometry(active.route) : null));
  useEffect(() => { setGeo(active ? buildGeometry(active.route) : null); }, [active?.route]);
  const [noVoice, setNoVoice] = useState(false);
  useEffect(() => {
    const check = () => setNoVoice(!hasVoice(lang));
    check();
    const id = setTimeout(check, 1500); // voices load async
    return () => clearTimeout(id);
  }, [lang]);

  const next = g && geo && g.next >= 0 ? geo.maneuvers[g.next] : null;
  const after = g && geo && g.next >= 0 ? geo.maneuvers[g.next + 1] : null;
  const speed = Math.round(fix?.speedKmh ?? 0);
  const speeding = isSpeeding(fix?.speedKmh ?? 0, limitKmh);
  const multiStop = (active?.stops.length ?? 0) > 2;
  const nextStop = active && g ? active.stops[g.leg + 1] : null;

  const end = () => { session.stop(); endDrive(); setMode("plan"); };

  return (
    <>
      {/* --- next maneuver ("Next drop") ------------------------------------ */}
      <section className="pointer-events-auto absolute left-4 top-[max(1rem,env(safe-area-inset-top))] w-[min(28rem,calc(100%-2rem))] border border-fq-line bg-fq-bg/92 p-4">
        <div className="text-[11px] uppercase tracking-widest text-fq-primary">{t("drive.nextDrop")}</div>
        {!active ? (
          <>
            <div className="mt-1 font-display text-3xl text-fq-strong">— —</div>
            <div className="text-fq-muted">{fix ? t("drive.freeDrive") : t("drive.noRoute")}</div>
          </>
        ) : arrived ? (
          <div className="mt-1 flex items-center gap-4">
            <ManeuverIcon type={4} className="h-16 w-16 shrink-0 text-fq-primary" />
            <div>
              <div className="font-display text-2xl text-fq-strong">{t("drive.arrived")}</div>
              <div className="text-sm text-fq-muted">{active.stops[active.stops.length - 1]?.name}</div>
            </div>
          </div>
        ) : next && g ? (
          <>
            <div className="mt-1 flex items-center gap-4">
              <ManeuverIcon type={next.type} exit={next.roundaboutExit} className="h-20 w-20 shrink-0 text-fq-strong" />
              <div className="min-w-0">
                <div className="font-display text-5xl leading-none text-fq-strong">{hudDistance(g.distToNext, lang)}</div>
                <div className="mt-1.5 line-clamp-2 text-lg leading-snug text-fq-text">
                  {next.streetNames[0] ?? next.instruction}
                </div>
              </div>
            </div>
            {after && after.along - next.along < 400 && (
              <div className="mt-3 flex items-center gap-2 border-t border-fq-line pt-2 text-sm text-fq-muted">
                {t("drive.then")} <ManeuverIcon type={after.type} className="h-6 w-6" /> {after.streetNames[0] ?? ""}
              </div>
            )}
          </>
        ) : (
          <div className="mt-1 text-lg text-fq-muted">{gpsError ? `${t("drive.gpsError")}: ${gpsError}` : t("drive.waitingGps")}</div>
        )}
        {rerouting && <div className="mt-2 text-sm text-fq-warn">{t("drive.rerouting")}</div>}
        {rerouteError && !rerouting && <div className="mt-2 text-sm text-fq-danger">{t("drive.rerouteFailed")}</div>}
        {noVoice && !muted && <div className="mt-2 text-[11px] text-fq-muted">{t("drive.noVoice")}</div>}
      </section>

      {/* --- speed + limit ---------------------------------------------------- */}
      <div className="pointer-events-auto absolute bottom-28 left-4 flex items-end gap-2 max-md:bottom-[12.5rem]">
        <div className={`flex h-24 w-24 flex-col items-center justify-center border bg-fq-bg/92 ${speeding ? "border-fq-danger" : "border-fq-line"}`}>
          <span className={`font-display text-4xl ${speeding ? "text-fq-danger" : "text-fq-strong"}`}>{speed}</span>
          <span className="text-[11px] text-fq-muted">km/h</span>
        </div>
        {limitKmh !== undefined && (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-[6px] border-[#e3262b] bg-white font-display text-2xl text-[#040404]" aria-label={`${t("drive.limit")} ${limitKmh}`}>
            {limitKmh}
          </div>
        )}
      </div>

      {/* --- ETA strip ------------------------------------------------------- */}
      {active && g && !arrived && (
        <section className="pointer-events-auto absolute bottom-28 left-[15.5rem] right-32 flex items-center justify-around gap-2 border border-fq-line bg-fq-bg/92 px-3 py-2 max-md:left-4 max-md:right-4">
          <div className="text-center">
            <div className="font-display text-3xl text-fq-primary">{formatClock(new Date(Date.now() + g.remainingS * 1000))}</div>
            <div className="text-[11px] text-fq-muted">{t("drive.eta")}</div>
          </div>
          <div className="text-center">
            <div className="font-display text-2xl text-fq-strong">{formatDuration(g.remainingS, lang)}</div>
            <div className="text-[11px] text-fq-muted">{t("drive.remaining")}</div>
          </div>
          <div className="text-center">
            <div className="font-display text-2xl text-fq-strong">{formatDistance(g.remainingM, lang)}</div>
            <div className="text-[11px] text-fq-muted">{multiStop && nextStop ? `${t("drive.toStop")} ${formatDistance(g.legRemainingM, lang)}` : " "}</div>
          </div>
        </section>
      )}

      {/* --- big buttons (always usable, also when locked) ------------------ */}
      <div className="pointer-events-auto absolute right-4 top-1/2 flex -translate-y-1/2 flex-col gap-3 max-md:top-auto max-md:bottom-[17rem] max-md:translate-y-0">
        <button aria-pressed={muted} onClick={() => { if (!muted) stopSpeaking(); set({ muted: !muted }); }}
          className="fq-bracket h-16 w-24 bg-fq-bg/92 text-sm">{muted ? t("drive.unmute") : t("drive.mute")}</button>
        {!follow && (
          <button onClick={() => set({ follow: true })} className="fq-bracket h-16 w-24 bg-fq-bg/92 text-sm text-fq-primary!">
            {t("drive.recenter")}
          </button>
        )}
        {active && multiStop && !arrived && (
          <button onClick={session.skipStop} className="fq-bracket h-16 w-24 bg-fq-bg/92 text-sm">{t("drive.nextStop")}</button>
        )}
        <button disabled={!active} onClick={end} className="fq-bracket h-16 w-24 bg-fq-bg/92 text-sm disabled:opacity-40">
          {t("drive.end")}
        </button>
      </div>

      {locked && (
        <div className="pointer-events-none absolute right-4 top-[max(1rem,env(safe-area-inset-top))] border border-fq-line bg-fq-bg/92 px-3 py-1.5 text-[11px] text-fq-muted max-md:hidden">
          🔒 {t("drive.locked")}
        </div>
      )}

      {source === "sim" && devTools && <SimPanel />}
    </>
  );
}
