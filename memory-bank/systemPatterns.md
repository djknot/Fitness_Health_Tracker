# System Patterns

## Stack
- **React 19 + TypeScript (strict) + Vite 6** — SPA, no SSR.
- **Tailwind CSS v4** via `@tailwindcss/vite`; CSS-first config in `src/index.css`.
- **Zustand 5** with `persist` middleware → localStorage key `fittrack-v1`.
- **React Router 7** (`BrowserRouter`): `/`, `/workouts`, `/nutrition`, `/metrics`, `/settings`.
- **Recharts 3** for charts (v3 required for React 19 compatibility).
- **lucide-react** icons; system font stack; **Vitest** for unit tests.

## Architecture
```
src/
  types.ts          # Data model: Workout/Exercise/StrengthSet, FoodEntry, MetricEntry, Goals, AppData
  lib/              # Pure, unit-testable logic — no React, no DOM (except backup.ts download helper)
    dates.ts        #   local-calendar ISO date helpers (no UTC drift), Monday week start
    units.ts        #   metric<->imperial conversion at the display edge
    stats.ts        #   aggregations: daily nutrition, calorie/sleep/weight series, streaks, volume
    defaults.ts     #   DEFAULT_GOALS + emptyData()
    sample.ts       #   deterministic 28-day demo dataset
    backup.ts       #   JSON export/import (validated)
    id.ts           #   uid() via crypto.randomUUID with fallback
  store/useAppStore.ts  # Single Zustand store: all AppData + actions; persisted (partialize: data only)
  theme/            # Chart palette constants + prefers-color-scheme hook
  components/       # Layout (sidebar/bottom-nav), UI primitives, Meter, StatCard, charts
  pages/            # Dashboard, Workouts, Nutrition, Metrics, Settings (thin; read store + lib)
```

## Key patterns (do not contradict)
1. **Canonical metric storage.** Weights in kg, lengths in cm, water in ml, dates as
   local `YYYY-MM-DD` strings. Unit conversion happens only in UI via `lib/units.ts`.
2. **Dates are local-calendar strings.** Never `new Date(iso)` (UTC pitfall) — use
   `parseISODate`/`toISODate` from `lib/dates.ts`. ISO strings compare lexicographically.
3. **Pure logic in `lib/`, thin pages.** Aggregations/stats are pure functions with
   unit tests; components only wire store state to markup.
4. **Store is the single source of truth.** All mutations via store actions; entries are
   append + delete (no in-place edit in v1). `replaceAll` powers import/sample/reset.
5. **Design tokens over raw hex.** Semantic CSS variables (`--app-*`) defined in
   `src/index.css` for light+dark (auto via `prefers-color-scheme`), mapped to Tailwind
   utilities through `@theme inline` (e.g. `bg-surface`, `text-ink`, `border-line`).
6. **Chart discipline** (from the dataviz reference palette, validated for CVD):
   single-series charts use slot 1 blue (`#2a78d6` light / `#3987e5` dark); macros use
   slots 1–3; hairline solid gridlines; bars ≤24px with 4px rounded data-end; 2px lines;
   tooltips with values leading; no dual axes; charts get a table/list twin for a11y.
   Recharts receives resolved hex from a `useChartTheme()` hook (matchMedia), not CSS vars.
7. **Status colors are reserved** for over/under-target semantics (`good`/`warning`/`critical`),
   never for chart series identity.

## Data flow
UI event → store action → zustand `set` → persist middleware writes localStorage →
subscribed components re-render → derived stats recomputed via `lib/stats.ts` selectors.
