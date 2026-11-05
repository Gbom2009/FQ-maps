import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { buildMapStyle } from "../theme/mapStyle";
import { HOME } from "../config/services";
import { useApp } from "../store/app";
import { usePlan, type Stop } from "../store/plan";
import { setRoutes, ALT_LAYER } from "./routeLayers";
import { onLongPress } from "./longPress";
import { reverse } from "../nav/geocode";
import { translate } from "../i18n";
import type { Route } from "../nav/valhalla";
type Map = maplibregl.Map;

// MapLibre 6 looks for its worker next to its own module. In dev that works
// (maplibre-gl is excluded from pre-bundling, see vite.config.ts); in a
// production bundle it doesn't, so ship the worker as an asset and point at it.
if (import.meta.env.PROD) maplibregl.setWorkerUrl(workerUrl);

interface Props {
  /** Drive mode uses a tilted, heading-up camera; Plan mode is flat north-up. */
  mode: "drive" | "plan";
}

function stopMarkerEl(i: number, n: number): HTMLElement {
  const el = document.createElement("div");
  const last = i === n - 1 && n > 1;
  el.textContent = i === 0 ? "A" : last ? "" : String(i);
  el.style.cssText = [
    "width:28px;height:28px;display:flex;align-items:center;justify-content:center",
    "font:700 12px var(--fq-font-body);border:2px solid #040404;cursor:grab",
    last
      ? "background:var(--fq-primary);border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 0 14px var(--fq-primary)"
      : i === 0
        ? "background:#f0f0f0;color:#040404;border-radius:50%"
        : "background:#040404;color:#f0f0f0;border-color:#f0f0f0;border-radius:50%",
  ].join(";");
  return el;
}

function fitTo(map: Map, route: Route | undefined, stops: Stop[]) {
  const pad = window.innerWidth < 768
    ? { top: 110, bottom: Math.round(window.innerHeight * 0.45) + 110, left: 30, right: 30 }
    : { top: 110, bottom: 110, left: 460, right: 60 };
  if (route) {
    const [a, b, c, d] = route.bbox;
    map.fitBounds([[a, b], [c, d]], { padding: pad, duration: 700, maxZoom: 15 });
  } else if (stops.length === 1) {
    map.easeTo({ center: [stops[0].lon, stops[0].lat], zoom: 14, duration: 700 });
  }
}

export function MapView({ mode }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const theme = useApp((s) => s.theme);
  const { stops, routes, selected, active } = usePlan();

  // ---- mount ------------------------------------------------------------
  useEffect(() => {
    if (!el.current) return;
    const m = new maplibregl.Map({
      container: el.current,
      style: buildMapStyle(useApp.getState().theme),
      center: HOME,
      zoom: 12,
      attributionControl: { compact: true },
    });
    map.current = m;
    if (import.meta.env.DEV) (window as unknown as { __fqMap: Map }).__fqMap = m;
    m.on("error", (e) => console.warn("[map]", e.error?.message ?? e));

    // Re-add our overlay layers whenever a (theme) style finishes loading.
    m.on("style.load", () => syncRoutes(m));

    // Click an alternative to select it.
    m.on("click", ALT_LAYER, (e) => {
      const idx = e.features?.[0]?.properties?.idx;
      if (typeof idx === "number") usePlan.getState().select(idx);
    });
    m.on("mouseenter", ALT_LAYER, () => { m.getCanvas().style.cursor = "pointer"; });
    m.on("mouseleave", ALT_LAYER, () => { m.getCanvas().style.cursor = ""; });

    // Long-press / right-click → drop pin → "add stop" popup.
    const offLong = onLongPress(m, async (at) => {
      if (modeRef.current !== "plan") return;
      const lang = useApp.getState().lang;
      const box = document.createElement("div");
      box.style.cssText = "font:300 13px var(--fq-font-body);color:var(--fq-text);min-width:180px";
      box.innerHTML = `<div style="color:var(--fq-muted)">…</div>`;
      const popup = new maplibregl.Popup({ closeButton: true, className: "fq-popup", maxWidth: "260px" })
        .setLngLat(at).setDOMContent(box).addTo(m);
      const place = await reverse(at.lat, at.lng);
      box.innerHTML = "";
      const name = document.createElement("div");
      name.style.cssText = "color:var(--fq-text-strong);font-weight:400";
      name.textContent = place.name;
      const detail = document.createElement("div");
      detail.style.cssText = "color:var(--fq-muted);font-size:11px;margin-bottom:10px";
      detail.textContent = place.detail ?? "";
      const btn = document.createElement("button");
      btn.className = "fq-bracket";
      btn.style.cssText = "height:44px;width:100%;color:var(--fq-primary);font:400 13px var(--fq-font-body)";
      btn.textContent = `+ ${translate(lang, "plan.addStop")}`;
      btn.onclick = () => { usePlan.getState().addStop(place); popup.remove(); };
      box.append(name, detail, btn);
    });

    return () => { offLong(); markers.current.forEach((mk) => mk.remove()); m.remove(); map.current = null; };
  }, []);

  // ---- theme --------------------------------------------------------------
  const firstTheme = useRef(true);
  useEffect(() => {
    if (firstTheme.current) { firstTheme.current = false; return; }
    // diff:false → full reload, so "style.load" fires and our route layers get re-added
    map.current?.setStyle(buildMapStyle(theme), { diff: false });
  }, [theme]);

  // ---- routes -------------------------------------------------------------
  function syncRoutes(m: Map) {
    const p = usePlan.getState();
    if (modeRef.current === "drive") setRoutes(m, p.active ? [p.active.route] : [], 0);
    else setRoutes(m, p.routes, p.selected);
  }
  useEffect(() => {
    const m = map.current;
    if (m?.isStyleLoaded()) syncRoutes(m);
  }, [routes, selected, active, mode]);

  // Fit to the route when a new set of routes arrives (Plan mode only).
  useEffect(() => {
    const m = map.current;
    if (m && mode === "plan") fitTo(m, routes[0], stops);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes]);

  // ---- stop markers -------------------------------------------------------
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach((mk) => mk.remove());
    const shown = mode === "drive" ? active?.stops ?? [] : stops;
    if (mode === "plan" && stops.length === 1) fitTo(m, undefined, stops);
    markers.current = shown.map((s, i) => {
      const mk = new maplibregl.Marker({ element: stopMarkerEl(i, shown.length), draggable: mode === "plan" })
        .setLngLat([s.lon, s.lat]).addTo(m);
      mk.on("dragend", async () => {
        // Drag a stop marker to move it; re-geocode the new spot.
        const ll = mk.getLngLat();
        const place = await reverse(ll.lat, ll.lng);
        usePlan.getState().replaceStop(s.key, place);
      });
      return mk;
    });
  }, [stops, active, mode]);

  // ---- camera per mode ----------------------------------------------------
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (mode === "drive") {
      const start = active?.route.shape[0];
      m.easeTo({ pitch: 55, zoom: 15.5, duration: 800, ...(start ? { center: start } : {}) });
    } else {
      m.easeTo({ pitch: 0, bearing: 0, duration: 800 });
    }
  }, [mode, active]);

  // MapLibre forces position:relative on its container, so size it via a wrapper.
  return (
    <div className="absolute inset-0">
      <div ref={el} className="h-full w-full" data-testid="map" />
    </div>
  );
}
