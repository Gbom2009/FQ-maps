/**
 * Vehicle + trailer profiles and tow logic (pure, tested).
 * Dimensions in metres, weights in kg. Undefined = not filled in yet.
 */
export interface Vehicle {
  id: string;
  name: string;
  lengthM?: number;
  widthM?: number;
  heightM?: number;
  /** kerb/operating weight */
  weightKg?: number;
  /** pure-electric range, for PHEV hints (Phase 5) */
  evRangeKm?: number;
}

export interface Trailer {
  id: string;
  name: string;
  /** body + drawbar */
  lengthM?: number;
  widthM?: number;
  heightM?: number;
  /** loaded weight */
  weightKg?: number;
}

/** Tow speed caps per road type (km/h). */
export interface TowCaps { motorway: number; rural: number; urban: number }

/** NL car + trailer defaults. The user must verify these for their combination. */
export const NL_TOW_DEFAULTS: TowCaps = { motorway: 90, rural: 80, urban: 50 };

export const DEFAULT_VEHICLES: Vehicle[] = [
  { id: "rr-p440e", name: "Range Rover Sport P440e" },
  { id: "jeep-4xe", name: "Jeep Grand Cherokee 4xe" },
  { id: "vw-golf", name: "VW Golf" },
];

export const DEFAULT_TRAILERS: Trailer[] = [
  { id: "dj-gear", name: "DJ gear trailer" },
  { id: "boat", name: "Boottrailer" },
];

/** Fallbacks when a field is empty — conservative typical values, flagged in the UI. */
const FALLBACK = {
  car: { lengthM: 4.9, widthM: 2.0, heightM: 1.8, weightKg: 2500 },
  trailer: { lengthM: 4.0, widthM: 2.0, heightM: 2.0, weightKg: 1500 },
};

export interface TruckDims {
  lengthM: number;
  widthM: number;
  heightM: number;
  /** tonnes, as Valhalla wants */
  weightT: number;
  /** which values came from fallbacks instead of the profile */
  estimated: string[];
}

/** Combined dimensions of car + trailer for Valhalla `truck` costing. */
export function combinedDims(v: Vehicle, t: Trailer): TruckDims {
  const estimated: string[] = [];
  const pick = <K extends keyof typeof FALLBACK.car>(obj: Vehicle | Trailer, k: K, which: "car" | "trailer") => {
    const val = obj[k];
    if (val === undefined || !(val > 0)) { estimated.push(`${which}.${k}`); return FALLBACK[which][k]; }
    return val;
  };
  const cl = pick(v, "lengthM", "car"), cw = pick(v, "widthM", "car"), ch = pick(v, "heightM", "car"), cwt = pick(v, "weightKg", "car");
  const tl = pick(t, "lengthM", "trailer"), tw = pick(t, "widthM", "trailer"), th = pick(t, "heightM", "trailer"), twt = pick(t, "weightKg", "trailer");
  return {
    lengthM: round1(cl + tl),
    widthM: round1(Math.max(cw, tw)),
    heightM: round1(Math.max(ch, th)),
    weightT: round1((cwt + twt) / 1000),
    estimated,
  };
}
const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Tow cap for a road. Road class tells motorway; a posted limit ≤ 50
 * is treated as built-up area (NL "bebouwde kom").
 */
export function towCapFor(caps: TowCaps, roadClass?: string, postedKmh?: number): number {
  if (roadClass === "motorway" || roadClass === "trunk") return caps.motorway;
  if (postedKmh !== undefined && postedKmh <= 50) return caps.urban;
  if (roadClass === "residential" || roadClass === "service_other" || roadClass === "living_street") return caps.urban;
  return caps.rural;
}
