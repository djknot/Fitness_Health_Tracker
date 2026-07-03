# FitTrack — Fitness & Health Tracker

**Live app:** https://djknot.github.io/Fitness_Health_Tracker/ (deployed automatically
from this branch by GitHub Actions — open it on your phone and "Add to Home Screen"
to install it like an app).

A **local-first** fitness and health tracking web app. Log workouts, meals, water,
and body metrics; look up nutrition facts for foods by name or brand; and track your
daily intake against a calorie target that's **recommended from your own current state
and goal** — all stored privately in your browser, with no account and no backend.

## Features

- **Dashboard** — today's calories vs target, water, workouts this week, logging streak,
  30-day weight trend chart, 7-day calorie chart, and recent workouts.
- **Workout logging** — strength exercises (sets × reps × weight, bodyweight supported)
  and cardio (duration/distance), with an exercise-name autocomplete and grouped history.
- **Nutrition tracking** — per-meal food log (breakfast/lunch/dinner/snacks) with a
  **food lookup**: type a food or brand, pick a match, set the quantity in grams, and
  calories + macros are filled in automatically. Results come from a bundled database of
  ~95 common foods (instant, offline) plus the free
  [Open Food Facts](https://world.openfoodfacts.org) product database for branded items.
  Macro split (protein/carbs/fat) and a water tracker included.
- **Recommended daily intake** — set your height, age, sex, activity level, and pace in
  Settings, and FitTrack computes BMR (Mifflin-St Jeor) → maintenance (TDEE) → a
  goal-adjusted daily calorie target from your latest weigh-in vs your target weight
  (7,700 kcal per kg, capped at 1 kg/week, 1,200 kcal safety floor), plus suggested
  macros. Flip one toggle and the whole app tracks against the recommendation.
  *Estimates only — not medical advice.*
- **Body metrics** — weight, body fat %, waist, and sleep with trend charts and a
  history table.
- **Goals & units** — daily calories/water, weekly workouts, target weight; metric or
  imperial display (data is stored canonically in metric).
- **Your data is yours** — everything lives in `localStorage`; one-click JSON export,
  import, sample-data demo, and full reset. The only network call the app ever makes is
  the optional food-name search to Open Food Facts.
- **Installable PWA** — responsive mobile-first layout (bottom tab bar → desktop
  sidebar), light/dark theme following your OS.

## Getting started

Requires Node 20+.

```bash
npm install
npm run dev        # start the dev server
```

Other scripts:

```bash
npm run build      # typecheck (tsc strict) + production build to dist/
npm run preview    # serve the production build
npm test           # run unit tests (vitest)
npm run typecheck  # tsc --noEmit only
```

Tip: on first run, open **Settings → Load sample** (or "Load sample data" on the empty
dashboard) to explore the app with four weeks of demo data.

## Tech stack

| Layer | Choice |
|---|---|
| UI | React 19 + TypeScript (strict), Vite 6 |
| Styling | Tailwind CSS v4 (CSS-first tokens, automatic dark mode) |
| State | Zustand 5 with `persist` → `localStorage` (`fittrack-v1`) |
| Charts | Recharts 3 |
| Routing | React Router 7 |
| Icons | lucide-react |
| Tests | Vitest |

## Architecture notes

- `src/lib/` is pure, unit-tested logic (dates, units, stats, recommendation engine,
  food database/search, backup) — no React imports.
- `src/store/useAppStore.ts` is the single source of truth; pages are thin.
- All stored values are canonical metric (kg/cm/ml) and local-calendar `YYYY-MM-DD`
  date strings; unit conversion happens only at the display edge.
- Project context, patterns, and decision history live in [`memory-bank/`](memory-bank/)
  (see `CLAUDE.md` for the workflow).

## Roadmap

- Service worker for full offline app-shell caching (currently manifest-only PWA).
- Edit-in-place for logged entries (currently add + delete).
- Barcode scanning for the food lookup.
- Optional multi-device sync/backend.
