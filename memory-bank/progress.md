# Progress

## Milestones
- [x] **M0 — Scope agreed** (2026-07-03): local-first web PWA; workouts + nutrition + metrics + dashboard.
- [x] **M1 — v0.1 shipped** (2026-07-03): all five pages + food lookup + intake
  recommendation, 57 tests green, adversarial review fixes applied, **deployed to
  https://djknot.github.io/Fitness_Health_Tracker/** (gh-pages branch, CI-automated).
- [ ] **M2 — Polish pass**: PWA service worker/offline, edit-in-place for entries, richer exercise library, recharts code-splitting.
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

## Review round (completed)
- Adversarial review workflow: 4 finder lenses, 3-vote refutation panel per finding
  (34 agents). 9 confirmed findings → 6 unique bugs, all fixed and behaviorally
  re-verified via Playwright (unit-switch conversion, draft re-seeding, food-search
  selection clearing, workout date guard, goal-crossing delta color, Meter aria).
  1 finding refuted (SleepChart domain clipping — recharts extends the domain).

## M1 status: COMPLETE
- [x] All five pages, food lookup, intake recommendation, tests (57), build, e2e.
- [x] Review fixes applied and verified.
- [x] Pushed to `claude/fitness-health-tracking-app-f7yhxv` (foundation `1365453`,
  features `d30c355`, review fixes follow).

## Built (v0.2 session, 2026-07-03) — branch claude/v0.2-memory-dynamic-workflows-qp37oq
- Foundation (commit 2a30524): types v2, store v2 (persist v2 + migrate), libs
  burn/adaptive/usda/fasting/quickfoods, searchFoods opts, lookupBarcode,
  dailyTargetInfo pipeline, theme plumbing, /reports route.
- Pages via 6-agent workflow (disjoint file ownership, frozen contracts):
  - Nutrition: favorites/recents one-tap chips, star-to-favorite on rows, barcode
    scanner modal (camera + always-available manual path), fasting card, edit-in-place
    rows, source tags (custom/USDA), burn-aware daily target.
  - Workouts: builder extracted to WorkoutBuilder, templates (save from draft or row,
    start-from-template with dirty-draft confirm), optional strength duration, burn
    chips, edit-in-place.
  - Metrics: chest/hips/arm/thigh in a "More measurements" disclosure, MoodPicker
    (1–5 radiogroup), BMI card, chip-style history rows with inline editor.
  - Dashboard: dailyTargetInfo meter (+earned-back note, adaptive chip), daily
    check-in card (merged today-entry detection, patch-or-add save).
  - Reports: range picker (4W–1Y), 8 summary tiles, weekly trend charts with
    reference lines, calorie adherence bar, consistency heatmap; pure lib/reports.ts.
  - Settings: theme select, USDA key manager, earn-back + adaptive switches with
    status panel (observed vs formula TDEE), custom-foods CRUD, About v0.2.
- Integration fixes (orchestrator): IconButton variant prop; noValidate on numeric
  entry forms (native stepMismatch silently blocked editor saves — e2e-caught bug);
  Metrics date onChange guard.
- Tests 57 → 137 green (burn, adaptive, fasting, quickfoods, usda mapping, reports,
  targetsFromTdee + dailyTargetInfo). Build green. Playwright e2e 43/43 with
  light/dark/mobile + dark-heatmap screenshots reviewed.

## Review round (v0.2, completed) — branch claude/v0.2-memory-dynamic-workflows-qp37oq
- Adversarial Find workflow (5 lenses over the v0.2 diff). The 3-vote Verify phase
  was cut short by model-credit limits, so findings were verified on Opus by hand.
- 6 fixes applied + re-verified (tsc/tests/build/e2e): (1) restored native range
  validation on Metrics/CheckinCard (step="any" + drop noValidate — the noValidate
  had disabled min/max); (2) Dashboard 7-day chart references baseTarget not the
  earn-back target; (3) burn MET 'row'→'rowing' (strength rows no longer read as the
  rowing machine) + test; (4) heatmap dark-mode cells bordered, ramp strengthened;
  (5) barcode focus-restore + aria-live status; (6) Workouts dirty-draft discard
  confirm + close-editor-on-delete-of-edited.
- 2 findings refuted (no change): barcode detect-after-close (aborts on unmount),
  custom-food servingLabel (never populated).

## Known gaps / backlog
- No service worker yet (app shell not offline-cacheable; manifest-only PWA).
- No edit for logged entries (append/delete only).
- Water stays ml in imperial mode; cardio distance stays km (logged decisions).
- No PNG icons for iOS home screen (SVG only).
- Bundle is one ~700 kB chunk (recharts) — add manualChunks/code-splitting later.
- Open Food Facts unreachable → local-only results with a status note (works as designed).
