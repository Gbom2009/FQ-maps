import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
type Map = maplibregl.Map;

// MapLibre 6 looks for its worker next to its own module. In dev that works
// (maplibre-gl is excluded from pre-bundling, see vite.config.ts); in a
// production bundle it doesn't, so ship the worker as an asset and point at it.
if (import.meta.env.PROD) maplibregl.setWorkerUrl(workerUrl);
import { buildMapStyle } from "../theme/mapStyle";
import { HOME } from "../config/services";
import { useApp } from "../store/app";

interface Props {
  /** Drive mode uses a tilted, heading-up camera; Plan mode is flat north-up. */
  mode: "drive" | "plan";
}

export function MapView({ mode }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const theme = useApp((s) => s.theme);

  useEffect(() => {
    if (!el.current) return;
    const m = new maplibregl.Map({
      container: el.current,
      style: buildMapStyle(theme),
      center: HOME,
      zoom: 12,
      attributionControl: { compact: true },
    });
    map.current = m;
    if (import.meta.env.DEV) (window as unknown as { __fqMap: Map }).__fqMap = m;
    m.on("error", (e) => console.warn("[map]", e.error?.message ?? e));
    // Home-base marker in brand orange.
    const dot = document.createElement("div");
    dot.style.cssText =
      "width:18px;height:18px;border-radius:50%;background:var(--fq-primary);box-shadow:0 0 0 4px rgba(246,135,18,.25),0 0 18px var(--fq-primary)";
    new maplibregl.Marker({ element: dot }).setLngLat(HOME).addTo(m);
    return () => { m.remove(); map.current = null; };
    // theme handled by the effect below; mount once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { map.current?.setStyle(buildMapStyle(theme)); }, [theme]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (mode === "drive") m.easeTo({ pitch: 55, zoom: 15.5, duration: 800 });
    else m.easeTo({ pitch: 0, bearing: 0, zoom: 12, duration: 800 });
  }, [mode]);

  // MapLibre forces position:relative on its container, so size it via a wrapper.
  return (
    <div className="absolute inset-0">
      <div ref={el} className="h-full w-full" data-testid="map" />
    </div>
  );
}
