import type { Fix, LocationProvider } from "../../location/provider";
import { RealGps } from "../../location/realGps";
import { Simulator, type SimPath } from "../../location/simulator";
import { buildGeometry, GuidanceTracker, DESTINATION_TYPES, type RouteGeometry, type GuidanceState } from "../../nav/guidance";
import { PromptPlanner, promptText, speak, stopSpeaking } from "../../nav/voice";
import { fetchSpeedLimits, segmentAt, effectiveLimit, isMotorwayClass, type LimitSegment } from "../../nav/speed";
import { getRoutes, type Route } from "../../nav/valhalla";
import { decodePolyline } from "../../nav/polyline";
import { usePlan, towRouting, type ActiveRoute, type Stop } from "../../store/plan";
import { useDrive, LOCK_KMH, UNLOCK_AFTER_MS } from "../../store/drive";
import { useApp } from "../../store/app";
import { translate } from "../../i18n";
import { towCapFor } from "../../features/vehicles/profiles";
import type { TowProfile } from "../../features/vehicles/store";
import { computeTowWarnings, fetchHeights, type TowWarning } from "../../features/vehicles/towWarnings";
import { recordTrip } from "../../features/stats/tripLog";
import { activeVehicle } from "../../features/vehicles/store";
import { haversine } from "../../nav/geo";

/**
 * Drive session controller (framework-free). Owns the location provider,
 * guidance tracker, voice planner, speed-limit lookup and rerouting.
 * React only reads the resulting state from useDrive.
 */

const REROUTE_MIN_GAP_MS = 8000;
const REROUTE_RETRY_MS = 15000;
/** Maneuver types the simulator brakes for (turns, roundabouts, arrival). */
const SLOW_TYPES = new Set([4, 5, 6, 9, 10, 11, 12, 13, 14, 15, 16, 26]);

let provider: LocationProvider | null = null;
let sim: Simulator | null = null;
let geo: RouteGeometry | null = null;
let tracker: GuidanceTracker | null = null;
let planner = new PromptPlanner();
let limits: LimitSegment[] = [];
let sessionId: number | null = null;
let lastReroute = 0;
let slowSince: number | null = null;
let tow: TowProfile | null = null;
let heights: [number, number][] = [];
let towWarnings: TowWarning[] = [];
let warned = new Set<number>();
/** announce tow warnings this far ahead */
const TOW_WARN_M = 300;

export const simulator = () => sim;

function say(text: string) {
  if (!useDrive.getState().muted) speak(text, useApp.getState().lang);
}
const t = (k: Parameters<typeof translate>[1]) => translate(useApp.getState().lang, k);

export function simPathFromRoute(g: RouteGeometry): SimPath {
  const speeds = new Array<number>(Math.max(0, g.shape.length - 1)).fill(50 / 3.6);
  g.maneuvers.forEach((m, i) => {
    const end = g.maneuvers[i + 1]?.globalIndex ?? g.shape.length - 1;
    const v = m.timeS > 0 && m.lengthM > 0 ? m.lengthM / m.timeS : 50 / 3.6;
    for (let k = m.globalIndex; k < end; k++) speeds[k] = v;
  });
  const slowAt = g.maneuvers.filter((m) => SLOW_TYPES.has(m.type)).map((m) => m.along);
  return { shape: g.shape, speeds, slowAt };
}

function loadRoute(route: Route) {
  geo = buildGeometry(route);
  tracker = new GuidanceTracker(geo);
  planner = new PromptPlanner();
  limits = [];
  heights = [];
  towWarnings = tow ? computeTowWarnings(geo, []) : [];
  warned = new Set();
  useDrive.getState().set({ limitsStatus: "loading", towWarning: null });
  const forSession = sessionId;
  const g = geo;
  const refreshWarnings = () => { if (tow && geo === g) towWarnings = computeTowWarnings(g, limits, heights); };
  fetchSpeedLimits(route.legs.map((l) => l.shape), decodePolyline, tow ? "truck" : "auto")
    .then((l) => { if (sessionId === forSession) { limits = l; refreshWarnings(); useDrive.getState().set({ limitsStatus: "ok" }); } })
    .catch(() => { if (sessionId === forSession) useDrive.getState().set({ limitsStatus: "error" }); });
  if (tow) {
    fetchHeights(route.shape)
      .then((h) => { if (sessionId === forSession) { heights = h; refreshWarnings(); } })
      .catch(() => { /* no elevation: descents just aren’t warned */ });
  }
}

function checkTowWarnings(g: GuidanceState) {
  if (!tow) return;
  const d = useDrive.getState();
  const ahead = towWarnings.find((w) => w.along >= g.along - 20 && w.along - g.along <= TOW_WARN_M);
  if (ahead && !warned.has(ahead.along)) {
    warned.add(ahead.along);
    const k = ahead.kind === "sharp" ? "tow.voice.sharp" : ahead.kind === "narrow" ? "tow.voice.narrow" : "tow.voice.descent";
    say(t(k));
  }
  const show = ahead ?? null;
  if (show?.along !== d.towWarning?.along) d.set({ towWarning: show });
}

function updateLock(f: Fix) {
  const d = useDrive.getState();
  if (f.speedKmh > LOCK_KMH) { slowSince = null; if (!d.locked) d.set({ locked: true }); return; }
  if (!d.locked) return;
  slowSince ??= f.t;
  if (f.t - slowSince >= UNLOCK_AFTER_MS) d.set({ locked: false });
}

// ---- trip log (Setlist, Phase 5 shows it): distance actually driven --------
let trip: { startedAt: number; startAlong: number; km: number; last: [number, number] | null } | null = null;

function trackTrip(f: Fix) {
  if (!trip || f.speedKmh < 2) return;
  const p: [number, number] = [f.lon, f.lat];
  if (trip.last) trip.km += haversine(trip.last, p) / 1000;
  trip.last = p;
}

function finishTrip(arrived: boolean) {
  const a = usePlan.getState().active;
  if (!trip || !a || trip.km < 0.2) { trip = null; return; }
  recordTrip({
    startedAt: trip.startedAt, endedAt: Date.now(), km: Math.round(trip.km * 10) / 10,
    vehicle: a.tow?.vehicle.name ?? activeVehicle()?.name, trailer: a.tow?.trailer.name,
    gigId: a.gigId, destination: a.stops[a.stops.length - 1]?.name, arrived,
  });
  trip = null;
}

function onFix(f: Fix) {
  updateLock(f);
  trackTrip(f);
  const d = useDrive.getState();
  if (!geo || !tracker || d.arrived) { d.set({ fix: f, gpsError: null }); return; }

  const g = tracker.update(f);
  const seg = segmentAt(limits, geoSegment(g));
  const capKmh = tow ? towCapFor(tow.caps, seg?.roadClass, seg?.limitKmh) : undefined;
  // HUD uses the lower of the posted limit and the tow cap
  const limitKmh = effectiveLimit(seg?.limitKmh, capKmh);
  d.set({ fix: f, guidance: g, limitKmh, postedKmh: seg?.limitKmh, capKmh, gpsError: null });
  checkTowWarnings(g);

  // voice
  if (g.next >= 0) {
    const m = geo.maneuvers[g.next];
    const fast = isMotorwayClass(seg?.roadClass) || f.speedKmh > 75;
    const stage = planner.check(g.next, g.distToNext, fast);
    if (stage) {
      const finalStop = m.leg === geo.legEnds.length - 1 && DESTINATION_TYPES.has(m.type);
      say(promptText(m, stage, g.distToNext, useApp.getState().lang, finalStop));
    }
  }

  if (g.arrived) {
    d.set({ arrived: true });
    finishTrip(true);
    setTimeout(() => { if (sim) sim.paused = true; }, 3000);
    return;
  }
  if (g.offRoute) void reroute(f, g);
}

/** Shape index nearest the snapped point (segment index tracked by projection). */
function geoSegment(g: GuidanceState): number {
  // binary search cum for along
  const cum = geo!.cum;
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= g.along) lo = mid; else hi = mid; }
  return lo;
}

async function reroute(f: Fix, g: GuidanceState | null, skipNextStop = false) {
  const d = useDrive.getState();
  const active = usePlan.getState().active;
  if (!active || d.rerouting) return;
  const now = Date.now();
  if (!skipNextStop && now - lastReroute < REROUTE_MIN_GAP_MS) return;
  lastReroute = now;

  const leg = g?.leg ?? 0;
  // stops still ahead: stops[leg+1 …]; skipping drops the next one
  const remaining = active.stops.slice(leg + 1 + (skipNextStop ? 1 : 0));
  if (!remaining.length) { stop(); usePlan.getState().endDrive(); return; }
  const here: Stop = { key: `here-${now}`, id: "here", name: t("drive.here"), lat: f.lat, lon: f.lon, source: "pin" };

  d.set({ rerouting: true, rerouteError: null });
  if (!skipNextStop) say(t("drive.voice.rerouting"));
  try {
    const [route] = await getRoutes({
      stops: [{ lat: f.lat, lon: f.lon, heading: f.speedKmh > 5 ? f.heading : undefined }, ...remaining],
      options: active.options,
      language: useApp.getState().lang,
      tow: towRouting(active.tow),
    });
    if (!route || sessionId !== active.sessionId) return;
    usePlan.getState().setActiveRoute(route, [here, ...remaining]);
    loadRoute(route);
    sim?.setPath(simPathFromRoute(geo!), { fromPosition: [f.lon, f.lat] });
    d.set({ rerouting: false, reroutes: d.reroutes + 1 });
    const first = geo!.maneuvers.find((m) => m.along > 5);
    if (first && !skipNextStop) say(first.verbalPre ?? first.instruction);
  } catch (e) {
    // offline / rate limited: keep guiding on the old route, try again later
    d.set({ rerouting: false, rerouteError: (e as Error).message });
    lastReroute = now - REROUTE_MIN_GAP_MS + REROUTE_RETRY_MS;
    tracker?.resetOffRoute();
  }
}

/** Start (or restart) tracking for the given active route. */
export function start(active: ActiveRoute) {
  stop();
  sessionId = active.sessionId;
  tow = active.tow ?? null;
  trip = { startedAt: Date.now(), startAlong: 0, km: 0, last: null };
  const d = useDrive.getState();
  d.set({ guidance: null, arrived: false, reroutes: 0, rerouting: false, rerouteError: null, follow: true, simPaused: false });
  loadRoute(active.route);
  ensureProvider();
  if (sim) sim.setPath(simPathFromRoute(geo!));
  const first = geo!.maneuvers[0];
  if (first) say(first.verbalPre ?? first.instruction);
}

/** Location without a route (free driving): just position + speed. */
export function ensureProvider() {
  if (provider) return;
  const d = useDrive.getState();
  if (d.source === "sim") {
    sim = new Simulator();
    sim.multiplier = d.simMultiplier;
    sim.noiseM = d.simNoiseM;
    provider = sim;
  } else {
    provider = new RealGps();
  }
  provider.start(onFix, (msg) => useDrive.getState().set({ gpsError: msg }));
}

export function stop() {
  finishTrip(false);
  provider?.stop();
  provider = null;
  sim = null;
  geo = null;
  tracker = null;
  sessionId = null;
  limits = [];
  tow = null;
  towWarnings = [];
  stopSpeaking();
  useDrive.getState().set({ guidance: null, fix: null, locked: false, arrived: false, limitKmh: undefined, postedKmh: undefined, capKmh: undefined, limitsStatus: "none", towWarning: null });
}

export function skipStop() {
  const f = useDrive.getState().fix;
  if (f) void reroute(f, useDrive.getState().guidance, true);
}

/** Dev panel: force the simulated car off the route. */
export function simGoOffRoute() { sim?.goOffRoute(); }
export function simSet(p: { multiplier?: number; noiseM?: number; paused?: boolean }) {
  if (!sim) return;
  if (p.multiplier !== undefined) sim.multiplier = p.multiplier;
  if (p.noiseM !== undefined) sim.noiseM = p.noiseM;
  if (p.paused !== undefined) sim.paused = p.paused;
}
export function simLoadPath(path: SimPath) {
  ensureProvider();
  sim?.setPath(path);
  if (sim) sim.paused = false;
}

/** Remaining route geometry for drawing (traveled part removed), throttled by caller. */
export function remainingShape(): [number, number][] | null {
  const g = useDrive.getState().guidance;
  if (!geo || !g) return null;
  const i = geoSegment(g);
  return [g.snapped, ...geo.shape.slice(i + 1)];
}
