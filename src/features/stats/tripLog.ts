import { create } from "zustand";
import { persist } from "zustand/middleware";

/** One driven trip. Recorded by the drive session; the Setlist screen (Phase 5) reads it. */
export interface Trip {
  id: string;
  startedAt: number;
  endedAt: number;
  km: number;
  vehicle?: string;
  trailer?: string;
  gigId?: string;
  destination?: string;
  arrived: boolean;
}

interface TripState {
  trips: Trip[];
  add: (t: Trip) => void;
  remove: (id: string) => void;
}

export const useTrips = create<TripState>()(
  persist(
    (set, get) => ({
      trips: [],
      add: (t) => set({ trips: [t, ...get().trips].slice(0, 2000) }),
      remove: (id) => set({ trips: get().trips.filter((t) => t.id !== id) }),
    }),
    { name: "fq-trips" },
  ),
);

export function recordTrip(t: Omit<Trip, "id">) {
  useTrips.getState().add({ ...t, id: `trip-${t.startedAt.toString(36)}` });
}
