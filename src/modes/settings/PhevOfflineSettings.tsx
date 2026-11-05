import { useEffect, useRef, useState } from "react";
import { usePhev, type Connector } from "../../features/phev/store";
import { onChargerStatus, setUserOcmKey, userOcmKey, type ChargerStatus } from "../../map/phevLayers";
import { ocmKey } from "../../features/phev/chargers";
import { deletePack, importPack, storageEstimate, useOffline, type OfflineMode } from "../../features/offline/packs";
import { useT } from "../../i18n";

const head = "mb-2 text-[11px] uppercase tracking-widest text-fq-muted";
const check = "flex min-h-9 items-center gap-3 text-sm text-fq-text";
const box = "h-5 w-5 accent-[var(--fq-primary)]";
const mb = (n: number) => `${(n / 1e6).toFixed(n > 1e8 ? 0 : 1)} MB`;

export function PhevSettings() {
  const t = useT();
  const p = usePhev();
  const [status, setStatus] = useState<ChargerStatus>({ state: "off" });
  const [key, setKey] = useState(userOcmKey());
  useEffect(() => onChargerStatus(setStatus), []);
  const hasKey = !!ocmKey(key);
  return (
    <div>
      <div className={head}>{t("phev.title")}</div>
      <label className={check}><input type="checkbox" className={box} checked={p.zoneAlerts} onChange={(e) => p.set({ zoneAlerts: e.target.checked })} />{t("phev.zoneAlerts")}</label>
      <label className={check}><input type="checkbox" className={box} checked={p.evHints} onChange={(e) => p.set({ evHints: e.target.checked })} />{t("phev.evHints")}</label>
      <label className={check}><input type="checkbox" className={box} checked={p.showZones} onChange={(e) => p.set({ showZones: e.target.checked })} />{t("phev.showZones")}</label>
      <p className="mb-3 text-[11px] text-fq-muted">{t("phev.zonesNote")}</p>

      <label className={check}><input type="checkbox" className={box} checked={p.chargers} onChange={(e) => p.set({ chargers: e.target.checked })} />{t("phev.chargers")}</label>
      {p.chargers && (
        <div className="ml-8 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <label><span className="block text-[10px] uppercase tracking-widest text-fq-muted">{t("phev.minKw")}</span>
              <select value={p.chargerMinKw} onChange={(e) => p.set({ chargerMinKw: Number(e.target.value) })}
                className="h-10 w-full border border-fq-line bg-fq-surface px-2 text-sm text-fq-strong">
                {[0, 7, 11, 22, 50].map((k) => <option key={k} value={k}>{k ? `≥ ${k} kW` : t("phev.any")}</option>)}
              </select></label>
            <label><span className="block text-[10px] uppercase tracking-widest text-fq-muted">{t("phev.connector")}</span>
              <select value={p.chargerConnector} onChange={(e) => p.set({ chargerConnector: e.target.value as Connector })}
                className="h-10 w-full border border-fq-line bg-fq-surface px-2 text-sm text-fq-strong">
                <option value="any">{t("phev.any")}</option><option value="type2">Type 2</option><option value="ccs">CCS</option>
              </select></label>
          </div>
          {!hasKey || status.state === "nokey" ? (
            <div className="space-y-1">
              <p className="text-[11px] text-fq-warn">{t("phev.needKey")}</p>
              <input value={key} onChange={(e) => setKey(e.target.value)} onBlur={() => setUserOcmKey(key)} placeholder="Open Charge Map API key"
                className="h-10 w-full select-text border border-fq-line bg-fq-surface px-2 text-sm text-fq-strong" />
            </div>
          ) : (
            <p className="text-[11px] text-fq-muted">
              {status.state === "zoom" ? t("phev.zoomIn") : status.state === "loading" ? "…" : status.state === "ok" ? `${status.count} ${t("phev.found")}` : status.state === "error" ? `${t("phev.error")} (${status.message})` : ""}
              {" · "}Open Charge Map (CC BY-SA 4.0)
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function OfflineSettings() {
  const t = useT();
  const o = useOffline();
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [est, setEst] = useState<{ usage?: number; quota?: number }>({});
  useEffect(() => { void storageEstimate().then(setEst); }, [o.packs]);

  const doImport = async (f: File) => {
    setBusy(true); setMsg(null);
    try { const info = await importPack(f); setMsg(`${info.name} ${t("offline.imported")}`); }
    catch (e) { setMsg(`${t("offline.importError")}: ${(e as Error).message}`); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <div className={head}>{t("offline.title")}</div>
      <div className="mb-2 flex gap-2">
        {(["auto", "always", "never"] as OfflineMode[]).map((m) => (
          <button key={m} aria-pressed={o.mode === m} onClick={() => o.set({ mode: m })} className="fq-bracket h-10 flex-1 text-[12px]">
            {t(`offline.mode.${m}`)}
          </button>
        ))}
      </div>
      <ul className="space-y-2">
        {o.packs.map((pk) => (
          <li key={pk.name} className={`flex items-center gap-2 border p-2 ${o.activePack === pk.name ? "border-fq-primary" : "border-fq-line"}`}>
            <button onClick={() => o.set({ activePack: pk.name })} className="min-w-0 flex-1 text-left">
              <div className="truncate text-sm text-fq-strong">{pk.name}</div>
              <div className="text-[11px] text-fq-muted">{mb(pk.sizeBytes)} · z{pk.minZoom}–{pk.maxZoom}
                {pk.bounds ? ` · ${pk.bounds.map((b) => b.toFixed(2)).join(", ")}` : ""}</div>
            </button>
            <button onClick={() => void deletePack(pk.name)} className="h-9 w-8 text-fq-muted hover:text-fq-danger" aria-label="delete">×</button>
          </li>
        ))}
      </ul>
      <button disabled={busy} onClick={() => file.current?.click()} className="fq-bracket mt-2 h-10 w-full text-[12px] disabled:opacity-50">
        {busy ? "…" : `+ ${t("offline.import")}`}
      </button>
      <input ref={file} type="file" accept=".pmtiles" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void doImport(f); e.target.value = ""; }} />
      {msg && <p className="mt-1 text-[11px] text-fq-muted">{msg}</p>}
      <p className="mt-2 text-[11px] text-fq-muted">
        {t("offline.hint")}{est.quota ? ` · ${mb(est.usage ?? 0)} / ${mb(est.quota)}` : ""}
      </p>
      <p className="mt-1 text-[11px] text-fq-muted">{t("offline.routeCache")}</p>
    </div>
  );
}
