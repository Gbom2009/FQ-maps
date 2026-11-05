import { usePlan } from "../../store/plan";
import { useT } from "../../i18n";
import type { RouteOptions } from "../../nav/valhalla";
import { useVehicles } from "../../features/vehicles/store";
import { combinedDims } from "../../features/vehicles/profiles";

export function RouteOptionsPanel() {
  const t = useT();
  const { options, setOption } = usePlan();
  const { vehicles, trailers, activeVehicleId, activeTrailerId, setActiveVehicle, setActiveTrailer, towCaps } = useVehicles();
  const v = vehicles.find((x) => x.id === activeVehicleId);
  const tr = trailers.find((x) => x.id === activeTrailerId);
  const dims = v && tr ? combinedDims(v, tr) : null;
  const sel = "h-10 w-full border border-fq-line bg-fq-surface px-2 text-[12px] text-fq-strong";
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
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select aria-label={t("vehicle.vehicle")} className={sel} value={activeVehicleId} onChange={(e) => setActiveVehicle(e.target.value)}>
          {vehicles.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <select aria-label={t("plan.opt.trailer")} className={`${sel} ${tr ? "border-fq-primary text-fq-primary" : ""}`} value={activeTrailerId ?? ""}
          onChange={(e) => setActiveTrailer(e.target.value || null)}>
          <option value="">{t("vehicle.noTrailer")}</option>
          {trailers.map((x) => <option key={x.id} value={x.id}>🚚 {x.name}</option>)}
        </select>
      </div>
      {dims && (
        <div className="text-[11px] leading-snug text-fq-muted">
          {t("tow.routing")}: {dims.lengthM} × {dims.widthM} × {dims.heightM} m · {dims.weightT} t · max {towCaps.motorway} km/h
          {dims.estimated.length > 0 && <span className="text-fq-warn"> · {t("tow.estimated")}</span>}
        </div>
      )}
    </div>
  );
}
