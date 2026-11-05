import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Fix } from "../location/provider";
import type { GuidanceState } from "../nav/guidance";

const isIOS = typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

export interface DriveState {
  // --- persisted preferences
  muted: boolean;
  /** location source: simulator (default on PC) or real GPS */
  source: "sim" | "real";
  /** show the simulator dev panel (hidden by default on iOS) */
  devTools: boolean;
  simMultiplier: number;
  simNoiseM: number;

  // --- live session
  fix: Fix | null;
  guidance: GuidanceState | null;
  /** effective speed limit at the current position */
  limitKmh?: number;
  /** posted (OSM) limit and tow cap, shown separately in tow mode */
  postedKmh?: number;
  capKmh?: number;
  /** upcoming tow hazard (sharp turn / narrow road / steep descent) */
  towWarning: import("../features/vehicles/towWarnings").TowWarning | null;
  limitsStatus: "none" | "loading" | "ok" | "error";
  /** milieuzone ahead / EV-mode hint for the HUD */
  zoneNotice: { kind: "zone" | "ev"; text: string; along: number } | null;
  follow: boolean;
  rerouting: boolean;
  rerouteError: string | null;
  reroutes: number;
  arrived: boolean;
  gpsError: string | null;
  simPaused: boolean;
  /** safety lock: moving > 10 km/h */
  locked: boolean;

  set: (p: Partial<DriveState>) => void;
}

export const useDrive = create<DriveState>()(
  persist(
    (set) => ({
      muted: false,
      source: isIOS ? "real" : "sim",
      devTools: !isIOS,
      simMultiplier: 1,
      simNoiseM: 4,

      fix: null,
      guidance: null,
      limitsStatus: "none",
      towWarning: null,
      zoneNotice: null,
      follow: true,
      rerouting: false,
      rerouteError: null,
      reroutes: 0,
      arrived: false,
      gpsError: null,
      simPaused: false,
      locked: false,

      set: (p) => set(p),
    }),
    {
      name: "fq-drive",
      partialize: ({ muted, source, devTools, simMultiplier, simNoiseM }) => ({ muted, source, devTools, simMultiplier, simNoiseM }),
    },
  ),
);

export const LOCK_KMH = 10;
/** Unlock only after being slow for this long, so a stop-and-go doesn't flicker. */
export const UNLOCK_AFTER_MS = 4000;
