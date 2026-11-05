import { usePlan } from "../../store/plan";
import { useApp } from "../../store/app";
import { useT } from "../../i18n";
import { formatClock, formatDistance, formatDuration } from "../../nav/format";

/** `compact` (collapsed phone sheet): only the selected route + start button. */
export function Alternatives({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const { routes, selected, select, loading, error, stops, startDrive } = usePlan();

  if (stops.length < 2) return null;
  if (error) return <p className="text-[13px] text-fq-danger">{t("plan.routeError")} ({error})</p>;
  if (loading && !routes.length) return <p className="text-[13px] text-fq-muted">{t("plan.routing")}</p>;
  if (!routes.length) return null;

  const fastest = Math.min(...routes.map((r) => r.timeS));
  return (
    <div className={`space-y-2 ${loading ? "opacity-60" : ""}`}>
      {routes.length > 1 && <div className={`text-[11px] uppercase tracking-widest text-fq-muted ${compact ? "max-md:hidden" : ""}`}>{t("plan.alternatives")}</div>}
      {routes.map((r, i) => {
        const tags = [r.hasHighway && t("plan.tag.highway"), r.hasToll && t("plan.tag.toll"), r.hasFerry && t("plan.tag.ferry")].filter(Boolean);
        const extra = r.timeS - fastest;
        return (
          <button key={r.id} onClick={() => select(i)} aria-pressed={selected === i}
            className={`block w-full border px-3 py-2.5 text-left ${selected === i ? "border-fq-primary" : "border-fq-line hover:border-fq-muted"} ${compact && selected !== i ? "max-md:hidden" : ""}`}>
            <div className="flex items-baseline gap-3">
              <span className={`font-display text-xl ${selected === i ? "text-fq-primary" : "text-fq-strong"}`}>
                {formatDuration(r.timeS, lang)}
              </span>
              <span className="text-[13px] text-fq-text">{formatDistance(r.lengthM, lang)}</span>
              <span className="ml-auto text-[11px] text-fq-muted">
                {t("plan.arrive")} {formatClock(new Date(Date.now() + r.timeS * 1000))}
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-fq-muted">
              {extra > 60 ? `+${formatDuration(extra, lang)} · ` : ""}{tags.join(" · ")}
            </div>
          </button>
        );
      })}
      <button onClick={startDrive}
        className="fq-bracket mt-2 h-16 w-full bg-fq-primary text-base font-normal uppercase tracking-widest text-[#040404]! ">
        {t("plan.startDrive")}
      </button>
    </div>
  );
}
