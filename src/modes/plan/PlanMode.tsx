import logo from "../../assets/logo.svg";
import { useT } from "../../i18n";

/** Plan mode shell — full UI. Logo lives here (and on the splash) only. */
export function PlanMode() {
  const t = useT();
  return (
    <>
      <header className="pointer-events-auto absolute left-4 right-4 top-[max(1rem,env(safe-area-inset-top))] flex items-center gap-4 border border-fq-line bg-fq-bg/85 px-4 py-3 backdrop-blur">
        {/* Logo has white strokes — always sits on the black stage, also in day theme. */}
        <img src={logo} alt="Team Funqtion" className="h-11 w-11 bg-[#040404] p-1" />
        <div className="leading-tight">
          <div className="font-display text-lg tracking-[-0.03em] text-fq-strong">FUNQTION MAPS</div>
          <div className="text-[11px] text-fq-primary">{t("tagline")}</div>
        </div>
        <input
          disabled
          placeholder={t("plan.search")}
          className="ml-auto hidden h-11 w-80 border border-fq-line bg-fq-surface px-3 text-sm text-fq-text placeholder:text-fq-muted sm:block"
        />
      </header>
      <aside className="pointer-events-auto absolute bottom-24 left-4 max-w-xs border border-fq-line bg-fq-bg/85 p-4 text-[13px] text-fq-muted backdrop-blur">
        {t("plan.soon")}
      </aside>
    </>
  );
}
