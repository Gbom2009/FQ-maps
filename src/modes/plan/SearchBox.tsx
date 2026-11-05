import { useEffect, useRef, useState } from "react";
import { search, searchPhoton, type Place } from "../../nav/geocode";
import { usePlan } from "../../store/plan";
import { useApp } from "../../store/app";
import { useT } from "../../i18n";

const DEBOUNCE_MS = 400;

export function SearchBox() {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const addStop = usePlan((s) => s.addStop);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [source, setSource] = useState<"pdok" | "photon" | "none">("none");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ctrl = useRef<AbortController | null>(null);

  useEffect(() => {
    ctrl.current?.abort();
    if (q.trim().length < 3) { setResults([]); setSource("none"); setError(null); return; }
    const c = new AbortController();
    ctrl.current = c;
    const id = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await search(q, lang, c.signal);
        if (c.signal.aborted) return;
        setResults(r.places); setSource(r.source); setError(r.places.length ? null : r.error ?? null);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      } finally {
        if (!c.signal.aborted) setBusy(false);
      }
    }, DEBOUNCE_MS);
    return () => { clearTimeout(id); c.abort(); };
  }, [q, lang]);

  const morePhoton = async () => {
    setBusy(true);
    try {
      const extra = await searchPhoton(q, lang);
      setResults((cur) => [...cur, ...extra.filter((e) => !cur.some((c) => c.id === e.id))]);
      setSource("photon");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const pick = (p: Place) => { addStop(p); setQ(""); setResults([]); setOpen(false); };

  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === "Enter" && results[0]) pick(results[0]); if (e.key === "Escape") setOpen(false); }}
        placeholder={t("plan.search")}
        aria-label={t("plan.search")}
        className="h-12 w-full select-text border border-fq-line bg-fq-surface px-3 text-sm text-fq-strong placeholder:text-fq-muted"
      />
      {busy && <span className="absolute right-3 top-3.5 text-xs text-fq-primary">…</span>}
      {open && (results.length > 0 || error || (q.trim().length >= 3 && !busy)) && (
        <ul className="absolute inset-x-0 top-full z-20 max-h-80 overflow-auto border border-t-0 border-fq-line bg-fq-bg">
          {results.map((p) => (
            <li key={p.id}>
              <button onClick={() => pick(p)}
                className="block w-full px-3 py-2.5 text-left hover:bg-fq-surface focus-visible:bg-fq-surface">
                <div className="text-sm text-fq-strong">{p.name}</div>
                {p.detail && <div className="truncate text-[11px] text-fq-muted">{p.detail}</div>}
              </button>
            </li>
          ))}
          {!busy && results.length === 0 && !error && (
            <li className="px-3 py-2.5 text-[13px] text-fq-muted">{t("plan.noResults")}</li>
          )}
          {error && <li className="px-3 py-2.5 text-[13px] text-fq-danger">{t("plan.searchError")} ({error})</li>}
          {source === "pdok" && (
            <li>
              <button onClick={morePhoton} className="block w-full px-3 py-2.5 text-left text-[12px] text-fq-primary hover:bg-fq-surface">
                {t("plan.morePhoton")}
              </button>
            </li>
          )}
          <li className="px-3 py-1.5 text-[10px] text-fq-muted">
            {source === "photon" ? "Photon · © OpenStreetMap" : source === "pdok" ? "PDOK Locatieserver" : ""}
          </li>
        </ul>
      )}
    </div>
  );
}
