# Funqtion Maps ("FQ Nav")

Personal navigation app for Team Funqtion — **FEEL THE MUSIQ**.
Tauri 2 + React + TypeScript + Vite + Tailwind v4 + MapLibre GL. See `CLAUDE.md` for the full spec.

## Status
- Phase 1 — skeleton: branded map, Plan / Drive / Settings, NL/EN, day/night.
- Phase 2 — plan core: PDOK→Photon search, pins, multi-stop, Valhalla routes + alternatives.
- Phase 3 — drive core: follow camera, HUD, Dutch voice, speed limits, off-route + reroute, safety lock, simulator.

## Test-driving with the simulator
On PC the location source defaults to **Simulator** (Settings → Locatiebron). Plan a route, press
**Start rijden**, and the car drives it at the planned speeds. The yellow panel in Drive mode:
- **0.5×–8×** time warp, **GPS-ruis** (noise in metres)
- **Van route af** — veers off the route to test off-route detection + rerouting
- **GPX afspelen…** — replay any `.gpx` track as fake GPS
- **Pauze** — the car parks (0 km/h), which also releases the safety lock after 4 s

Safety lock: above 10 km/h only Drive mode works (mute, recenter, next stop, end route).

## Develop

```bash
npm install
npm run dev          # web only, http://localhost:1420
npm run tauri dev    # desktop window (needs Rust)
```

Rust for the desktop shell: install from https://rustup.rs (on Windows also the
"Desktop development with C++" workload of Visual Studio Build Tools; WebView2 ships with Windows 11).

## Windows .exe
- Local: `npm run tauri build` → `src-tauri/target/release/bundle/nsis/`.
- CI: `.github/workflows/build-windows.yml` builds on `windows-latest` and uploads the installer as an artifact.

## iPhone / iPad
Phase 6. Sideloading options (free Apple ID 7-day, paid account, AltStore/SideStore) will be documented here.
CarPlay is not realistic for a sideloaded app — it needs an Apple-granted navigation entitlement. The iPad mini on the mount is the dashboard.

## Brand
Tokens in `src/theme/tokens.css`, taken from `github.com/gbom2009/funqtion-site` (`css/tokens.css`, `img/logo.svg`).
Fonts (JetBrains Mono, Archivo Black) are bundled via Fontsource so the app works offline.
App icons are generated from `app-icon.svg` with `npx tauri icon app-icon.svg`.

## Data sources
- Map tiles: OpenFreeMap (© OpenStreetMap contributors). Dev use only; no bulk downloading.
- All endpoints: `src/config/services.ts`, overridable via `.env` (see `.env.example`).
