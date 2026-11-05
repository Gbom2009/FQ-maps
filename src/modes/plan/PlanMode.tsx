import { useState } from "react";
import logo from "../../assets/logo.svg";
import { useT } from "../../i18n";
import { usePlan } from "../../store/plan";
import { SearchBox } from "./SearchBox";
import { StopList } from "./StopList";
import { RouteOptionsPanel } from "./RouteOptionsPanel";
import { Alternatives } from "./Alternatives";

/**
 * Plan mode — full UI. Desktop/iPad: side panel on the left.
 * Phone: header on top, panel as a collapsible bottom sheet above the mode bar.
 * Logo lives here (and on the splash) only.
 */
export function PlanMode() {
  const t = useT();
  const hasRoute = usePlan((s) => s.routes.length > 0);
  const [collapsed, setCollapsed] = useState(false);
  const hide = collapsed && hasRoute ? "max-md:hidden" : "";

  return (
    <div className="pointer-events-none absolute inset-x-4 top-[max(1rem,env(safe-area-inset-top))] bottom-24 flex flex-col gap-3 md:right-auto md:w-[420px]">
      <header className="pointer-events-auto flex items-center gap-4 border border-fq-line bg-fq-bg/90 px-4 py-3 backdrop-blur">
        {/* Logo has white strokes — always sits on the black stage, also in day theme. */}
        <img src={logo} alt="Team Funqtion" className="h-11 w-11 bg-[#040404] p-1" />
        <div className="leading-tight">
          <div className="font-display text-lg tracking-[-0.03em] text-fq-strong">FUNQTION MAPS</div>
          <div className="text-[11px] text-fq-primary">{t("tagline")}</div>
        </div>
      </header>

      <section className="pointer-events-auto mt-auto flex max-h-[45vh] flex-col gap-4 overflow-auto border border-fq-line bg-fq-bg/95 p-4 backdrop-blur md:mt-0 md:max-h-none md:flex-1">
        {hasRoute && (
          <button onClick={() => setCollapsed(!collapsed)} aria-expanded={!collapsed}
            className="-mb-2 -mt-2 h-8 text-[12px] text-fq-muted md:hidden">
            {collapsed ? `▴ ${t("plan.showDetails")}` : `▾ ${t("plan.hideDetails")}`}
          </button>
        )}
        <div className={hide}><SearchBox /></div>
        <div className={hide}><StopList /></div>
        <div className={hide}><RouteOptionsPanel /></div>
        <Alternatives compact={collapsed} />
      </section>
    </div>
  );
}
