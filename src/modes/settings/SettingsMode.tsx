import { useApp } from "../../store/app";
import { useT } from "../../i18n";
import { useDrive } from "../../store/drive";

function Choice<T extends string>({ value, options, onChange }: {
  value: T; options: { v: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-3">
      {options.map((o) => (
        <button key={o.v} aria-pressed={value === o.v} onClick={() => onChange(o.v)}
          className="fq-bracket h-12 px-5 text-sm">
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsMode() {
  const t = useT();
  const { lang, setLang, theme, setTheme, autoTheme, setAutoTheme } = useApp();
  const { source, devTools, set } = useDrive();
  return (
    <div className="pointer-events-auto absolute inset-x-4 top-[max(1rem,env(safe-area-inset-top))] bottom-28 overflow-auto border border-fq-line bg-fq-bg/95 p-6">
      <h1 className="font-display text-3xl tracking-[-0.03em] text-fq-strong">{t("mode.settings")}</h1>
      <div className="mt-6 space-y-6 text-sm">
        <div>
          <div className="mb-2 text-[11px] uppercase tracking-widest text-fq-muted">{t("settings.language")}</div>
          <Choice value={lang} onChange={setLang} options={[{ v: "nl", label: "Nederlands" }, { v: "en", label: "English" }]} />
        </div>
        <div>
          <div className="mb-2 text-[11px] uppercase tracking-widest text-fq-muted">{t("settings.theme")}</div>
          <Choice value={theme} onChange={setTheme}
            options={[{ v: "night", label: t("settings.theme.night") }, { v: "day", label: t("settings.theme.day") }]} />
          <label className="mt-3 flex items-center gap-3 text-fq-muted">
            <input type="checkbox" checked={autoTheme} onChange={(e) => setAutoTheme(e.target.checked)}
              className="h-5 w-5 accent-[var(--fq-primary)]" />
            {t("settings.autoTheme")}
          </label>
        </div>
        <div>
          <div className="mb-2 text-[11px] uppercase tracking-widest text-fq-muted">{t("settings.source")}</div>
          <Choice value={source} onChange={(v) => set({ source: v })}
            options={[{ v: "real", label: t("settings.source.real") }, { v: "sim", label: t("settings.source.sim") }]} />
          <label className="mt-3 flex items-center gap-3 text-fq-muted">
            <input type="checkbox" checked={devTools} onChange={(e) => set({ devTools: e.target.checked })}
              className="h-5 w-5 accent-[var(--fq-primary)]" />
            {t("settings.devTools")}
          </label>
        </div>
        <div className="text-[11px] text-fq-muted">{t("settings.version")} {__APP_VERSION__}</div>
      </div>
    </div>
  );
}
