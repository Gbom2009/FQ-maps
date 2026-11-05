import type { StyleSpecification, LayerSpecification, ExpressionSpecification } from "maplibre-gl";
import { services } from "../config/services";

/**
 * Branded MapLibre style on the OpenMapTiles schema (served by OpenFreeMap).
 * Monochrome base like funqtion-site; orange is reserved for the route and
 * for POIs we care about (venues, chargers) — roads stay muted so the route
 * line is the hero. Legibility beats style.
 */
export type MapTheme = "night" | "day";

interface Palette {
  bg: string; water: string; park: string; landuse: string; building: string;
  motorway: string; trunk: string; primary: string; minor: string; casing: string;
  rail: string; boundary: string;
  label: string; labelHalo: string; roadLabel: string; waterLabel: string;
}

const palettes: Record<MapTheme, Palette> = {
  night: {
    bg: "#0b0b0b", water: "#121a22", park: "#0f1510", landuse: "#0e0e0e", building: "#181818",
    motorway: "#5a5a5a", trunk: "#4a4a4a", primary: "#3c3c3c", minor: "#262626", casing: "#040404",
    rail: "#2a2a2a", boundary: "#4a4a4a",
    label: "#d9d9d9", labelHalo: "#040404", roadLabel: "#8d8d8d", waterLabel: "#4f6a80",
  },
  day: {
    bg: "#efefec", water: "#b9cfdc", park: "#d6e3cf", landuse: "#e6e6e2", building: "#dcdcd8",
    motorway: "#9a9a9a", trunk: "#b0b0b0", primary: "#ffffff", minor: "#ffffff", casing: "#c4c4c0",
    rail: "#bdbdbd", boundary: "#9a9a9a",
    label: "#141414", labelHalo: "#f7f7f5", roadLabel: "#555555", waterLabel: "#4a6a80",
  },
};

const FONT_REG = ["Noto Sans Regular"];
const FONT_BOLD = ["Noto Sans Bold"];

const zoomWidth = (base: number): ExpressionSpecification =>
  ["interpolate", ["exponential", 1.5], ["zoom"], 6, base * 0.3, 12, base, 18, base * 8];

/** Glyphs are bundled in public/fonts (scripts/fetch-glyphs.mjs) so labels work offline. */
function glyphsUrl(): string {
  if (typeof location === "undefined") return services.tiles.glyphs;
  return `${location.origin}${import.meta.env.BASE_URL}fonts/{fontstack}/{range}.pbf`;
}

export interface StyleOptions {
  /** pmtiles:// URL of an offline pack (OpenMapTiles schema) instead of OpenFreeMap */
  tilesUrl?: string;
}

export function buildMapStyle(theme: MapTheme, opts: StyleOptions = {}): StyleSpecification {
  const p = palettes[theme];
  const road = (id: string, classes: string[], color: string, w: number, minzoom = 0): LayerSpecification => ({
    id, type: "line", source: "omt", "source-layer": "transportation", minzoom,
    filter: ["in", ["get", "class"], ["literal", classes]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": color, "line-width": zoomWidth(w) },
  });

  const layers: LayerSpecification[] = [
    { id: "bg", type: "background", paint: { "background-color": p.bg } },
    { id: "landuse", type: "fill", source: "omt", "source-layer": "landuse",
      filter: ["in", ["get", "class"], ["literal", ["residential", "industrial", "commercial", "retail"]]],
      paint: { "fill-color": p.landuse } },
    { id: "park", type: "fill", source: "omt", "source-layer": "park", paint: { "fill-color": p.park } },
    { id: "landcover-wood", type: "fill", source: "omt", "source-layer": "landcover",
      filter: ["in", ["get", "class"], ["literal", ["wood", "grass"]]],
      paint: { "fill-color": p.park, "fill-opacity": 0.6 } },
    { id: "water", type: "fill", source: "omt", "source-layer": "water", paint: { "fill-color": p.water } },
    { id: "waterway", type: "line", source: "omt", "source-layer": "waterway",
      paint: { "line-color": p.water, "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.5, 16, 3] } },
    { id: "building", type: "fill", source: "omt", "source-layer": "building", minzoom: 14,
      paint: { "fill-color": p.building } },
    { id: "boundary", type: "line", source: "omt", "source-layer": "boundary",
      filter: ["<=", ["get", "admin_level"], 4],
      paint: { "line-color": p.boundary, "line-dasharray": [3, 2], "line-width": 1 } },
    { id: "rail", type: "line", source: "omt", "source-layer": "transportation",
      filter: ["==", ["get", "class"], "rail"],
      paint: { "line-color": p.rail, "line-width": 1, "line-dasharray": [2, 2] } },
    // casings first, then fills
    road("road-major-casing", ["motorway", "trunk", "primary"], p.casing, 1.5, 5),
    road("road-minor", ["minor", "service", "tertiary", "secondary"], p.minor, 0.6, 11),
    road("road-primary", ["primary"], p.primary, 0.9, 7),
    road("road-trunk", ["trunk"], p.trunk, 1.0, 5),
    road("road-motorway", ["motorway"], p.motorway, 1.2, 4),
    { id: "water-label", type: "symbol", source: "omt", "source-layer": "water_name",
      layout: { "text-field": ["coalesce", ["get", "name:nl"], ["get", "name"]], "text-font": FONT_REG, "text-size": 12 },
      paint: { "text-color": p.waterLabel, "text-halo-color": p.labelHalo, "text-halo-width": 1 } },
    { id: "road-label", type: "symbol", source: "omt", "source-layer": "transportation_name", minzoom: 13,
      layout: { "symbol-placement": "line", "text-field": ["get", "name"], "text-font": FONT_REG,
        "text-size": ["interpolate", ["linear"], ["zoom"], 13, 11, 18, 15] },
      paint: { "text-color": p.roadLabel, "text-halo-color": p.labelHalo, "text-halo-width": 1.5 } },
    { id: "road-shield", type: "symbol", source: "omt", "source-layer": "transportation_name", minzoom: 7,
      filter: ["all", ["has", "ref"], ["in", ["get", "class"], ["literal", ["motorway", "trunk"]]]],
      layout: { "symbol-placement": "line", "symbol-spacing": 400, "text-field": ["get", "ref"],
        "text-font": FONT_BOLD, "text-size": 11, "text-rotation-alignment": "viewport" },
      paint: { "text-color": p.label, "text-halo-color": p.labelHalo, "text-halo-width": 2 } },
    { id: "place-label", type: "symbol", source: "omt", "source-layer": "place",
      filter: ["in", ["get", "class"], ["literal", ["city", "town", "village", "suburb"]]],
      layout: {
        "text-field": ["coalesce", ["get", "name:nl"], ["get", "name"]],
        "text-font": ["match", ["get", "class"], ["city", "town"], ["literal", FONT_BOLD], ["literal", FONT_REG]],
        "text-size": ["match", ["get", "class"], "city", 17, "town", 14, 12],
        "text-transform": "uppercase", "text-letter-spacing": 0.08,
      },
      paint: { "text-color": p.label, "text-halo-color": p.labelHalo, "text-halo-width": 1.5 } },
  ];

  return {
    version: 8,
    name: `funqtion-${theme}`,
    glyphs: glyphsUrl(),
    sources: {
      omt: opts.tilesUrl
        ? { type: "vector", url: opts.tilesUrl, attribution: "Offline pack · © OpenStreetMap" }
        : { type: "vector", url: services.tiles.tilejson, attribution: services.tiles.attribution },
    },
    layers,
  };
}
