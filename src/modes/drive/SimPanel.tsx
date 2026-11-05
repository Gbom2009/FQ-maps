import { useRef, useState } from "react";
import { useDrive } from "../../store/drive";
import { usePlan } from "../../store/plan";
import { useT } from "../../i18n";
import { parseGpx } from "../../features/handoff/gpx";
import { simPathFromTrack } from "../../location/simulator";
import * as session from "./session";

const SPEEDS = [0.5, 1, 2, 4, 8];

/** Dev panel: fake GPS controls. Shown in Drive mode when the simulator is the location source. */
export function SimPanel() {
  const t = useT();
  const { simMultiplier, simNoiseM, simPaused, set } = useDrive();
  const active = usePlan((s) => s.active);
  const [open, setOpen] = useState(() => window.innerWidth >= 768);
  const [gpxMsg, setGpxMsg] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const loadGpx = async (f: File) => {
    try {
      const track = parseGpx(await f.text());
      session.simLoadPath(simPathFromTrack(track.points, track.times));
      set({ simPaused: false });
      setGpxMsg(`${track.name ?? f.name} · ${track.points.length} pts`);
    } catch (e) {
      setGpxMsg(`${t("sim.gpxError")}: ${(e as Error).message}`);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="pointer-events-auto absolute left-4 top-[13.5rem] h-11 border border-fq-warn bg-fq-bg/92 px-3 text-[11px] text-fq-warn max-md:left-auto max-md:right-4 max-md:top-[12rem]">
        SIM {simMultiplier}×
      </button>
    );
  }

  return (
    <section className="pointer-events-auto absolute left-4 top-[13.5rem] w-60 border border-fq-warn bg-fq-bg/95 p-3 text-[12px] max-md:left-auto max-md:right-4 max-md:top-[12rem]">
      <div className="mb-2 flex items-center justify-between">
        <span className="uppercase tracking-widest text-fq-warn">{t("sim.title")}</span>
        <button onClick={() => setOpen(false)} className="h-7 w-7 text-fq-muted" aria-label="close">–</button>
      </div>
      <div className="flex gap-1">
        {SPEEDS.map((s) => (
          <button key={s} aria-pressed={simMultiplier === s}
            onClick={() => { set({ simMultiplier: s }); session.simSet({ multiplier: s }); }}
            className={`h-9 flex-1 border ${simMultiplier === s ? "border-fq-warn text-fq-warn" : "border-fq-line text-fq-text"}`}>
            {s}×
          </button>
        ))}
      </div>
      <label className="mt-3 block text-fq-muted">
        {t("sim.noise")}: {simNoiseM} m
        <input type="range" min={0} max={30} value={simNoiseM}
          onChange={(e) => { const v = Number(e.target.value); set({ simNoiseM: v }); session.simSet({ noiseM: v }); }}
          className="mt-1 w-full accent-[var(--fq-warn)]" />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => { session.simSet({ paused: !simPaused }); set({ simPaused: !simPaused }); }}
          className="h-10 border border-fq-line text-fq-strong">{simPaused ? t("sim.play") : t("sim.pause")}</button>
        <button disabled={!active} onClick={session.simGoOffRoute}
          className="h-10 border border-fq-danger text-fq-danger disabled:opacity-40">{t("sim.offRoute")}</button>
        <button onClick={() => file.current?.click()} className="col-span-2 h-10 border border-fq-line text-fq-text">
          {t("sim.loadGpx")}
        </button>
      </div>
      <input ref={file} type="file" accept=".gpx,application/gpx+xml" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void loadGpx(f); e.target.value = ""; }} />
      {gpxMsg && <div className="mt-2 break-words text-[11px] text-fq-muted">{gpxMsg}</div>}
    </section>
  );
}
