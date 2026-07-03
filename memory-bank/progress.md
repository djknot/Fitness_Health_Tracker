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

## Built (continued — same session)
- Mid-build scope additions: food lookup by name/brand/quantity (`lib/foodDb.ts` local DB
  + `lib/foodSearch.ts` Open Food Facts, `computeNutrition` gram scaling) and recommended
  daily intake (`lib/recommend.ts`: Mifflin-St Jeor → TDEE → goal-adjusted target,
  `calorieTargetInfo` used app-wide; `Profile` added to store/backup/sample).
- All five pages (Dashboard, Workouts, Nutrition, Metrics, Settings) — built by a
  6-agent Workflow against frozen contracts; tsc strict clean after 3 tooltip-typing
  fixes in chart components (Recharts 3 readonly payload).
- Unit tests: 5 files, 57 tests, all green. `npm run build` green (bundle ~700 kB,
  mostly recharts — chunking is backlog).
- E2E verified via Playwright against the production build: sample-data load, workout
  logging, food search + autofill (Apple 182 g → 95 kcal), water +250, weigh-in,
  recommendation preview (BMR 1,757 / TDEE 2,723 / target 2,173 verified), persistence
  across reload; light/dark/mobile screenshots reviewed; CaloriesChart y-axis clipping fixed.

## In progress
- Adversarial review workflow (4 finder lenses × 3-vote verification) before final commit.

## Left to build (M1)
- [ ] Apply confirmed review findings (if any).
- [ ] Final commit + push (pages, tests, README, memory-bank sync).

## Known gaps / backlog
- No service worker yet (app shell not offline-cacheable; manifest-only PWA).
- No edit for logged entries (append/delete only).
- Water stays ml in imperial mode; cardio distance stays km (logged decisions).
- No PNG icons for iOS home screen (SVG only).
- Bundle is one ~700 kB chunk (recharts) — add manualChunks/code-splitting later.
- Open Food Facts unreachable → local-only results with a status note (works as designed).
