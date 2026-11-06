import { useVehicles } from "../../features/vehicles/store";
import { NL_TOW_DEFAULTS, type Trailer, type Vehicle } from "../../features/vehicles/profiles";
import { useT } from "../../i18n";

const num = "fq-input";
const lbl = "fq-label";

/** Number input that stores undefined when cleared. */
function NumField({ label, value, step, onChange }: { label: string; value?: number; step: number; onChange: (v?: number) => void }) {
  return (
    <label>
      <span className={lbl}>{label}</span>
      <input type="number" inputMode="decimal" min={0} step={step} className={num} value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
    </label>
  );
}

function Dims<T extends Vehicle | Trailer>({ item, onChange, extra }: { item: T; onChange: (p: Partial<T>) => void; extra?: React.ReactNode }) {
  const t = useT();
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <NumField label={`${t("vehicle.length")} (m)`} step={0.1} value={item.lengthM} onChange={(v) => onChange({ lengthM: v } as Partial<T>)} />
      <NumField label={`${t("vehicle.width")} (m)`} step={0.05} value={item.widthM} onChange={(v) => onChange({ widthM: v } as Partial<T>)} />
      <NumField label={`${t("vehicle.height")} (m)`} step={0.05} value={item.heightM} onChange={(v) => onChange({ heightM: v } as Partial<T>)} />
      <NumField label={`${t("vehicle.weight")} (kg)`} step={50} value={item.weightKg} onChange={(v) => onChange({ weightKg: v } as Partial<T>)} />
      {extra}
    </div>
  );
}

export function VehiclesSettings() {
  const t = useT();
  const s = useVehicles();
  return (
    <div className="space-y-6">
      <div>
        <div className="fq-label">{t("vehicle.vehicles")}</div>
        <div className="space-y-3">
          {s.vehicles.map((v) => (
            <div key={v.id} className={`fq-card p-3 ${v.id === s.activeVehicleId ? "border-fq-primary" : "border-fq-line"}`}>
              <div className="mb-2 flex items-center gap-2">
                <input className={`${num} flex-1`} value={v.name} onChange={(e) => s.updateVehicle(v.id, { name: e.target.value })} />
                <button aria-pressed={v.id === s.activeVehicleId} onClick={() => s.setActiveVehicle(v.id)} className="fq-btn h-10 px-3 text-[12px]">
                  {v.id === s.activeVehicleId ? t("vehicle.active") : t("vehicle.use")}
                </button>
                {s.vehicles.length > 1 && <button onClick={() => s.removeVehicle(v.id)} className="h-10 w-8 text-fq-muted hover:text-fq-danger" aria-label="remove">×</button>}
              </div>
              <Dims item={v} onChange={(p) => s.updateVehicle(v.id, p)}
                extra={<NumField label={`${t("vehicle.evRange")} (km)`} step={1} value={v.evRangeKm} onChange={(x) => s.updateVehicle(v.id, { evRangeKm: x })} />} />
            </div>
          ))}
          <button onClick={s.addVehicle} className="fq-btn h-10 px-4 text-[12px]">+ {t("vehicle.add")}</button>
        </div>
      </div>

      <div>
        <div className="fq-label">{t("vehicle.trailers")}</div>
        <div className="space-y-3">
          {s.trailers.map((tr) => (
            <div key={tr.id} className={`fq-card p-3 ${tr.id === s.activeTrailerId ? "border-fq-primary" : "border-fq-line"}`}>
              <div className="mb-2 flex items-center gap-2">
                <input className={`${num} flex-1`} value={tr.name} onChange={(e) => s.updateTrailer(tr.id, { name: e.target.value })} />
                <button aria-pressed={tr.id === s.activeTrailerId} onClick={() => s.setActiveTrailer(tr.id === s.activeTrailerId ? null : tr.id)}
                  className="fq-btn h-10 px-3 text-[12px]">
                  {tr.id === s.activeTrailerId ? t("vehicle.attached") : t("vehicle.attach")}
                </button>
                <button onClick={() => s.removeTrailer(tr.id)} className="h-10 w-8 text-fq-muted hover:text-fq-danger" aria-label="remove">×</button>
              </div>
              <Dims item={tr} onChange={(p) => s.updateTrailer(tr.id, p)} />
              <p className="mt-1 text-[10px] text-fq-muted">{t("vehicle.trailerHint")}</p>
            </div>
          ))}
          <button onClick={s.addTrailer} className="fq-btn h-10 px-4 text-[12px]">+ {t("vehicle.addTrailer")}</button>
        </div>
      </div>

      <div>
        <div className="fq-label">{t("tow.caps")}</div>
        <div className="grid grid-cols-3 gap-2">
          <NumField label={t("tow.motorway")} step={5} value={s.towCaps.motorway} onChange={(v) => s.setTowCaps({ motorway: v ?? NL_TOW_DEFAULTS.motorway })} />
          <NumField label={t("tow.rural")} step={5} value={s.towCaps.rural} onChange={(v) => s.setTowCaps({ rural: v ?? NL_TOW_DEFAULTS.rural })} />
          <NumField label={t("tow.urban")} step={5} value={s.towCaps.urban} onChange={(v) => s.setTowCaps({ urban: v ?? NL_TOW_DEFAULTS.urban })} />
        </div>
        <p className="mt-2 text-[11px] text-fq-warn">⚠ {t("tow.verify")}</p>
      </div>
    </div>
  );
}
