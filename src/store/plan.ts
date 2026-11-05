import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Place } from "../nav/geocode";
import { DEFAULT_OPTIONS, getRoutes, type Route, type RouteOptions } from "../nav/valhalla";
import { useApp } from "./app";

export interface Stop extends Place { key: string }

interface PlanState {
  stops: Stop[];
  options: RouteOptions;
  routes: Route[];
  selected: number;
  loading: boolean;
  error: string | null;
  /** Route handed over to Drive mode. */
  active: { route: Route; stops: Stop[] } | null;

  addStop: (p: Place, at?: number) => void;
  removeStop: (key: string) => void;
  replaceStop: (key: string, p: Place) => void;
  moveStop: (from: number, to: number) => void;
  reverseStops: () => void;
  clearStops: () => void;
  setOption: <K extends keyof RouteOptions>(k: K, v: RouteOptions[K]) => void;
  select: (i: number) => void;
  compute: () => Promise<void>;
  startDrive: () => void;
  endDrive: () => void;
}

let seq = 0;
const newKey = () => `s${Date.now().toString(36)}${(seq++).toString(36)}`;
let inflight: AbortController | null = null;

export const usePlan = create<PlanState>()(
  persist(
    (set, get) => ({
      stops: [],
      options: DEFAULT_OPTIONS,
      routes: [],
      selected: 0,
      loading: false,
      error: null,
      active: null,

      addStop: (p, at) => {
        const stops = [...get().stops];
        stops.splice(at ?? stops.length, 0, { ...p, key: newKey() });
        set({ stops });
        void get().compute();
      },
      removeStop: (key) => { set({ stops: get().stops.filter((s) => s.key !== key) }); void get().compute(); },
      replaceStop: (key, p) => {
        set({ stops: get().stops.map((s) => (s.key === key ? { ...p, key } : s)) });
        void get().compute();
      },
      moveStop: (from, to) => {
        const stops = [...get().stops];
        if (from === to || to < 0 || to >= stops.length) return;
        const [s] = stops.splice(from, 1);
        stops.splice(to, 0, s);
        set({ stops });
        void get().compute();
      },
      reverseStops: () => { set({ stops: [...get().stops].reverse() }); void get().compute(); },
      clearStops: () => { inflight?.abort(); set({ stops: [], routes: [], selected: 0, error: null, loading: false }); },
      setOption: (k, v) => { set({ options: { ...get().options, [k]: v } }); void get().compute(); },
      select: (i) => set({ selected: i }),

      compute: async () => {
        const { stops, options } = get();
        inflight?.abort();
        if (stops.length < 2) { set({ routes: [], selected: 0, error: null, loading: false }); return; }
        const ctrl = new AbortController();
        inflight = ctrl;
        set({ loading: true, error: null });
        try {
          const routes = await getRoutes(
            { stops, options, alternates: 2, language: useApp.getState().lang },
            ctrl.signal,
          );
          if (ctrl.signal.aborted) return;
          set({ routes: routes.slice(0, 3), selected: 0, loading: false });
        } catch (e) {
          if ((e as Error).name === "AbortError") return;
          set({ routes: [], loading: false, error: (e as Error).message });
        }
      },

      startDrive: () => {
        const { routes, selected, stops } = get();
        const route = routes[selected];
        if (!route) return;
        set({ active: { route, stops } });
        useApp.getState().setMode("drive");
      },
      endDrive: () => set({ active: null }),
    }),
    {
      name: "fq-plan",
      // routes are cached separately; recompute on load
      partialize: ({ stops, options, active }) => ({ stops, options, active }),
      onRehydrateStorage: () => (s) => { if (s && s.stops.length >= 2) void s.compute(); },
    },
  ),
);
