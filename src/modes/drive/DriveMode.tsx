import { useT } from "../../i18n";

/**
 * Drive mode shell — glanceable, 64pt+ targets, no logo.
 * Phase 3 fills in the maneuver card, speed, ETA and the safety lock.
 */
export function DriveMode() {
  const t = useT();
  return (
    <>
      <section className="pointer-events-auto absolute left-4 top-[max(1rem,env(safe-area-inset-top))] w-[min(26rem,calc(100%-2rem))] border border-fq-line bg-fq-bg/90 p-5">
        <div className="text-[11px] uppercase tracking-widest text-fq-primary">{t("drive.nextDrop")}</div>
        <div className="mt-1 font-display text-3xl text-fq-strong">— —</div>
        <div className="text-fq-muted">{t("drive.noRoute")}</div>
      </section>

      <div className="pointer-events-auto absolute bottom-28 right-4 flex flex-col gap-3">
        {(["drive.mute", "drive.recenter", "drive.end"] as const).map((k) => (
          <button key={k} className="fq-bracket h-16 min-w-16 bg-fq-bg/90 px-4 text-sm">
            {t(k)}
          </button>
        ))}
      </div>

      <div className="pointer-events-auto absolute bottom-28 left-4 flex h-24 w-24 flex-col items-center justify-center border border-fq-line bg-fq-bg/90">
        <span className="font-display text-4xl text-fq-strong">0</span>
        <span className="text-[11px] text-fq-muted">km/h</span>
      </div>
    </>
  );
}
