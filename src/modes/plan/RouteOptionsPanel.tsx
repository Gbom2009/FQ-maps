import { usePlan } from "../../store/plan";
import { useT } from "../../i18n";
import type { RouteOptions } from "../../nav/valhalla";

export function RouteOptionsPanel() {
  const t = useT();
  const { options, setOption } = usePlan();
  const toggles: { k: keyof RouteOptions; label: string }[] = [
    { k: "avoidMotorways", label: t("plan.opt.avoidMotorways") },
    { k: "avoidTolls", label: t("plan.opt.avoidTolls") },
    { k: "avoidFerries", label: t("plan.opt.avoidFerries") },
  ];
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {([false, true] as const).map((short) => (
          <button key={String(short)} aria-pressed={options.shortest === short}
            onClick={() => setOption("shortest", short)}
            className="fq-bracket h-10 flex-1 text-[12px]">
            {short ? t("plan.opt.shortest") : t("plan.opt.fastest")}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {toggles.map(({ k, label }) => (
          <label key={k} className="flex min-h-9 items-center gap-2 text-[12px] text-fq-text">
            <input type="checkbox" checked={options[k] as boolean} onChange={(e) => setOption(k, e.target.checked)}
              className="h-4 w-4 accent-[var(--fq-primary)]" />
            {label}
          </label>
        ))}
        <label className="flex min-h-9 items-center gap-2 text-[12px] text-fq-muted" title={t("plan.opt.trailerSoon")}>
          <input type="checkbox" disabled className="h-4 w-4" />
          {t("plan.opt.trailer")} <span className="text-[10px]">({t("plan.opt.trailerSoon")})</span>
        </label>
      </div>
    </div>
  );
}
