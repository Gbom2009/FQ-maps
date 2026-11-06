import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Engine = "piper" | "system";
export type PiperStatus = "none" | "downloading" | "loading" | "ready" | "error";

/** Dutch Piper voices worth offering (all run offline once downloaded). */
export const PIPER_VOICES = [
  { id: "nl_NL-mls-medium", label: "Nederlands — mls (medium)", mb: 77 },
  { id: "nl_BE-nathalie-medium", label: "Vlaams — Nathalie (vrouw)", mb: 63 },
  { id: "nl_BE-rdh-medium", label: "Vlaams — RDH (man)", mb: 63 },
] as const;
export type PiperVoiceId = (typeof PIPER_VOICES)[number]["id"];

interface VoiceState {
  engine: Engine;
  piperVoice: PiperVoiceId;
  /** chosen system voice (voiceURI); empty = best available */
  systemVoice: string;
  rate: number;
  volume: number;
  /** voices downloaded to this device */
  downloaded: PiperVoiceId[];
  // --- runtime (not persisted)
  status: PiperStatus;
  progress: number;
  error: string | null;
  set: (p: Partial<Omit<VoiceState, "set">>) => void;
}

export const useVoice = create<VoiceState>()(
  persist(
    (set) => ({
      engine: "system",
      piperVoice: "nl_NL-mls-medium",
      systemVoice: "",
      rate: 1,
      volume: 1,
      downloaded: [],
      status: "none",
      progress: 0,
      error: null,
      set: (p) => set(p),
    }),
    {
      name: "fq-voice",
      partialize: ({ engine, piperVoice, systemVoice, rate, volume, downloaded }) => ({ engine, piperVoice, systemVoice, rate, volume, downloaded }),
    },
  ),
);
