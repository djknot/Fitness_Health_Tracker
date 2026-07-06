# Active Context

## Active branch
`claude/v0.2-memory-dynamic-workflows-qp37oq` (v0.2 work). Default branch
`claude/fitness-health-tracking-app-f7yhxv` deploys via CI → gh-pages.
Live app: https://djknot.github.io/Fitness_Health_Tracker/

## Current focus
**v0.2 SHIPPED (merged to default via PR #1, deployed to the live URL).** Now on
post-v0.2 follow-ups requested by the user.
- Follow-up 1 (DONE): **manual workout-calorie override.** `Workout.caloriesKcal?`;
  `burn.workoutBurnKcal` returns it when set (else the MET estimate) so earn-back
  honors it too; optional "Calories burned" field in WorkoutBuilder (blank = auto,
  clearing on edit reverts since updateWorkout replaces wholesale); row chip shows
  an exact "N kcal" (no "~") for manual vs "~N kcal" for estimates.
  `hasManualBurn(w)` helper. Branch restarted from post-merge default (its PR was
  merged, so follow-up = fresh change on the same branch name).
- Follow-up 2 (DONE): **calorie clarity + nutrition-entry units.** (1) Dashboard
  calories card now headlines "Calories left" (big remaining number, "N of M kcal
  eaten" sub, red "X over" when past target); Nutrition daily summary leads with
  the same remaining figure. (2) Add-food + edit-row inputs now show their unit
  OUTSIDE the box (visible "kcal"/"g" + Field labels Amount/Calories/Protein/…).
  (3) Amount field has a g/ml/oz unit selector; toGrams() scales (g/ml 1:1 vs the
  per-100 basis, oz ×28.3495); logged name records the chosen unit "(150 ml)".
- Follow-up 3 (DONE): **saved meals + macro targets.** New `savedMeals` slice
  (SavedMeal{name,meal,items:MealItem[]}); store addSavedMeal/deleteSavedMeal/
  logSavedMeal (logs all items to their meal on a date, pushes recents); persist
  bumped v2→v3 (migrate backfills). Nutrition: "Save as meal" on a meal section
  captures its entries; "Saved meals" card re-logs/deletes. Goals gained optional
  proteinTargetG/carbsTargetG/fatTargetG (Settings, grams — unit-agnostic);
  `recommend.macroTargets(goals, rec)` = manual ?? recommended split; Nutrition
  daily summary shows per-macro consumed/target meters. backup/sample/emptyData
  cover the new slice. 143 unit tests; Playwright e2e 51/51.
- Follow-up 4 (DONE): two UI tweaks. (1) Dashboard weight-trend gained a range
  picker (1M/3M/6M/1Y/All, default 3M — was fixed 30d); WeightChart already handles
  long/sparse series (hides dots >31 pts, ChartEmpty <2). (2) Chip strips
  (favorites/recents/meals) used overflow-x-auto pb-0.5 so the overlay scrollbar
  covered chips — added a `.scroll-row` utility (thin styled scrollbar) + pb-2 in
  index.css. e2e 53/53.
- Follow-up 3c (DONE): macro/calorie CONSISTENCY. Bug: macro targets were sized to
  baseTarget while the calorie target included earn-back, so macros read ~100% while
  calories remained. Fix: extracted `macrosForCalories(kcal, weightKg)`; `dailyTargetInfo`
  now exposes `.macros` = auto split sized to the EFFECTIVE target (base+earn-back);
  `macroTargets(goals, auto)` merges manual ?? auto (manual still fixed/overrides).
  Nutrition uses targetInfo.macros. Sample no longer sets manual macro targets (so it
  demos the consistent auto split). 147 tests.
- Follow-up 3b (DONE): saved-meal DISCOVERABILITY — user couldn't find saved meals
  to select. Added a "Meals" chip row inside each meal section's add area
  (AddFoodRow), filtered to that section's meal; tapping logs the whole meal there.
  Top "Saved meals" card kept for delete/overview. (Repro confirmed no bug: fresh
  + v2-returning users both save/persist correctly — it was purely placement.)
- Follow-up 5 (DONE): **deploy self-heals GitHub's flaky Pages publish.** A real user
  was stranded a build behind when GitHub's "pages build and deployment" hit the
  transient "Deployment failed, try again later" (cache-clearing was useless — the
  server was stale). deploy.yml gained an `actions: write` verify step that watches
  that publish run and `gh run rerun --failed` up to 3×. First cut had a RACE (matched
  the run by name → grabbed the previous already-successful run, passed in ~2s without
  watching this deploy); fixed by recording the pushed gh-pages commit (`PAGES_SHA` via
  `$GITHUB_ENV`) and matching `.headSha == env.SHA`. PROVEN on the live deploy (run
  28725230621): verify step took 28s, polled → found OUR new publish run 28725241401
  (SHA 8d6c38ae) → watched it to ✅ success. Live site current (gh-pages = deploy f35d67d).
- Follow-up 6 (DONE): **global selected date + declutter.** New non-persisted store
  `selectedDate`/`setSelectedDate` (default today, resets each load) + shared `DateNav`
  (prev/next/date/Today); Dashboard, Workouts, Nutrition all read it in lockstep.
  Dashboard: Calories/Water/Workouts stat cards are now buttons → Nutrition/Workouts
  (StatCard `onClick`); "Recent workouts" section removed; check-in is date-aware
  (remounts on date). Workouts: only the selected day's workouts (grouped history +
  standalone Templates card removed); "Start from template" dropdown moved INTO the
  builder; the builder's editable Date field removed (logs to the viewed day). Nutrition:
  date from store; "Saved meals" card removed; per-section Saved-meal/Recent/Favorite
  `<select>` dropdowns replace the chip rows. Settings gained a "Saved routines & meals"
  card (the new home for deleting templates + saved meals). Review fixes: check-in
  weight only prefills for today (no past-day fabrication); this-week & streak stay
  anchored to today (day-scoped calories/water still follow the date). tsc/147 tests/
  build green; 29-check Playwright e2e; 4-agent adversarial review (2 clean, 4 real
  findings fixed). `capitalize`→`lib/strings.ts`.

## State right now — v0.2 pages COMPLETE + review round applied
- All five pages upgraded + Reports real page + `lib/reports.ts`; new components
  under components/{nutrition,workouts,checkin,reports,settings}/. Pages track
  against dailyTargetInfo (earned-back note + adaptive chip).
- IconButton grew a `variant="neutral"` (non-destructive hover) — used by edit/
  star/template/close buttons; deletes keep the danger hover.
- Review round (Find workflow: 5 lenses; Verify phase died on model-credit limits
  so findings were verified on Opus by hand). 6 fixes applied, 2 refuted:
  1. Metrics/CheckinCard numeric inputs → `step="any"` and `noValidate` REMOVED,
     restoring native min/max (the earlier `noValidate` had silently dropped range
     guards — negative weight / sleep>24 could persist). Decimals still accepted.
  2. Dashboard 7-day calories chart reference line uses `baseTarget` (pre earn-back),
     not the earn-back-inflated `target`.
  3. burn.ts MET keyword `'row'`→`'rowing'` so strength "Barbell Row" gets the
     strength default (4.0), not the cardio rowing MET (7.0). +regression test.
  4. Heatmap dark-mode contrast: every in-range cell now bordered; ramp 0.35/0.62/1.0.
  5. BarcodeScanner: focus restored to opener on close; lookup status is aria-live.
  6. Workouts: header button confirms before discarding a dirty draft; deleting the
     workout being edited now closes the stale editor (no more silent no-op save).
- Dynamic fix-verification workflow (7 Opus skeptics) then verified all 6 fixes
  correct + a 0-finding fresh sweep — AND overturned my two hand-refutations, which
  were real bugs, now also fixed:
  7. Custom-food servingLabel: sample.ts seeded one ('1 bowl') and the edit form
     never managed it, so editing left a stale label in search. Edit now clears
     servingLabel (defends imported backups too) + dropped it from the sample.
  8. BarcodeScanner camera-detect race: a detect() resolving after unmount started
     an unabortable lookup that overwrote the food form. Added a `cancelled` guard
     after the detect await. (Untestable in-sandbox — no camera — but logic-sound.)
  Lesson: adversarial VERIFICATION caught what my solo refutation missed — always
  run the verify workflow, don't hand-wave refutations.
- tsc strict clean; 137 unit tests green (11 files); production build green
  (main ~761 kB + lazy 44 kB barcode ponyfill chunk).
- Playwright e2e vs the preview build: 44/44 steps green (adds range-validation,
  barcode focus-restore, and custom-food servingLabel-normalization checks).
  Light/dark/mobile + dark-heatmap screenshots reviewed.

## Next immediate steps
- v0.2 + all follow-ups (1–5) shipped, merged to default, and live. Deploy safeguard
  now reliably auto-retries GitHub's Pages flake (race fixed + proven on a live run).
- Optional polish backlog remains (bundle code-splitting, service worker).
- Branch discipline: each follow-up's PR was merged, so the NEXT change restarts this
  branch from post-merge default (`git checkout -B <branch> origin/<default>`) — a
  merged PR is finished; never stack new commits on already-merged history.
- NOTE: this branch does NOT auto-deploy (the Pages workflow triggers only on the
  default branch) — merging to default publishes to the live URL.

## Active obstacles
None. Sandbox: no camera + OFF/USDA unreachable → barcode camera path and remote
search degrade gracefully (verified); manual barcode entry is the testable path.
