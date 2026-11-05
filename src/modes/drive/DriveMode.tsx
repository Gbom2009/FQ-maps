import { useT } from "../../i18n";
import { usePlan } from "../../store/plan";
import { useApp } from "../../store/app";
import { formatClock, formatDistance, formatDuration } from "../../nav/format";

/**
 * Drive mode shell — glanceable, 64pt+ targets, no logo.
 * Phase 2: shows the handed-over route. Phase 3 adds live guidance,
 * speed, voice and the safety lock.
 */
export function DriveMode() {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const setMode = useApp((s) => s.setMode);
  const { active, endDrive } = usePlan();
  const dest = active?.stops[active.stops.length - 1];
  const first = active?.route.legs[0]?.maneuvers[0];

  return (
    <>
      <section className="pointer-events-auto absolute left-4 top-[max(1rem,env(safe-area-inset-top))] w-[min(26rem,calc(100%-2rem))] border border-fq-line bg-fq-bg/90 p-5">
        <div className="text-[11px] uppercase tracking-widest text-fq-primary">{t("drive.nextDrop")}</div>
        {active ? (
          <>
            <div className="mt-1 text-lg leading-snug text-fq-strong">{first?.instruction}</div>
            <div className="mt-2 text-[12px] text-fq-muted">{t("drive.to")} {dest?.name} · {t("drive.guidanceSoon")}</div>
          </>
        ) : (
          <>
            <div className="mt-1 font-display text-3xl text-fq-strong">— —</div>
            <div className="text-fq-muted">{t("drive.noRoute")}</div>
          </>
        )}
      </section>

      {active && (
        <section className="pointer-events-auto absolute bottom-28 left-32 right-36 flex items-center justify-around border border-fq-line bg-fq-bg/90 px-4 py-3 max-md:left-4 max-md:right-4 max-md:bottom-[13.5rem]">
          <div className="text-center">
            <div className="font-display text-2xl text-fq-primary">{formatClock(new Date(Date.now() + active.route.timeS * 1000))}</div>
            <div className="text-[11px] text-fq-muted">ETA</div>
          </div>
          <div className="text-center">
            <div className="font-display text-2xl text-fq-strong">{formatDuration(active.route.timeS, lang)}</div>
          </div>
          <div className="text-center">
            <div className="font-display text-2xl text-fq-strong">{formatDistance(active.route.lengthM, lang)}</div>
          </div>
        </section>
      )}

      <div className="pointer-events-auto absolute bottom-28 right-4 flex flex-col gap-3">
        <button className="fq-bracket h-16 min-w-16 bg-fq-bg/90 px-4 text-sm">{t("drive.mute")}</button>
        <button className="fq-bracket h-16 min-w-16 bg-fq-bg/90 px-4 text-sm">{t("drive.recenter")}</button>
        <button disabled={!active} onClick={() => { endDrive(); setMode("plan"); }}
          className="fq-bracket h-16 min-w-16 bg-fq-bg/90 px-4 text-sm disabled:opacity-40">
          {t("drive.end")}
        </button>
      </div>

      <div className="pointer-events-auto absolute bottom-28 left-4 flex h-24 w-24 flex-col items-center justify-center border border-fq-line bg-fq-bg/90">
        <span className="font-display text-4xl text-fq-strong">0</span>
        <span className="text-[11px] text-fq-muted">km/h</span>
      </div>
    </>
  );
}
