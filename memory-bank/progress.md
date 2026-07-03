# Progress

## Milestones
- [x] **M0 — Scope agreed** (2026-07-03): local-first web PWA; workouts + nutrition + metrics + dashboard.
- [ ] **M1 — v0.1 scaffold & core app** (in progress): all five pages functional, tests green, pushed.
- [ ] **M2 — Polish pass**: PWA service worker/offline, edit-in-place for entries, richer exercise library.
- [ ] **M3 — Optional sync**: account/backend or file-sync story (only if requested).

## Built (this session, 2026-07-03)
- Project scaffold: Vite 6 + React 19 + TS strict, Tailwind v4, npm deps installed & lockfile.
- PWA shell: `index.html` meta (theme-color light/dark), `manifest.webmanifest`, SVG app icons (any + maskable).
- Data model (`src/types.ts`): workouts/exercises/sets, food entries + meal types, metric entries, goals, AppData.
- Pure logic library with docs: dates (local-ISO helpers), units (kg/lb, cm/in), stats
  (daily nutrition, calorie/sleep/weight series, Mon-week workout filter, logging streak, volume),
  defaults, deterministic 28-day sample dataset, JSON backup serialize/parse/download.
- Zustand persisted store (`fittrack-v1`) with add/delete/water/goals/replaceAll/resetAll actions.
- Memory bank + CLAUDE.md workflow files.

## In progress
- UI layer: theme tokens, layout shell, primitives, Meter/StatCard, Recharts components.
- Pages: Dashboard, Workouts, Nutrition, Metrics, Settings.

## Left to build (M1)
- [ ] Unit tests for `lib/` (vitest) — dates, stats, units.
- [ ] `npm run build` green (tsc strict + vite).
- [ ] End-to-end browser verification + light/dark screenshots.
- [ ] README (setup, scripts, data/privacy notes, roadmap).
- [ ] Initial commit + push to `claude/fitness-health-tracking-app-f7yhxv`.

## Known gaps / backlog
- No service worker yet (app shell not offline-cacheable; manifest-only PWA).
- No edit for logged entries (append/delete only).
- Water/measurement units always metric-ml/cm in UI when imperial selected for weight? — No:
  weight & waist convert; water stays ml (logged as backlog decision).
- No PNG icons for iOS home screen (SVG only).
