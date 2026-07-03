# Active Context

## Active branch
`claude/v0.2-memory-dynamic-workflows-qp37oq` (v0.2 work). Default branch
`claude/fitness-health-tracking-app-f7yhxv` deploys via CI → gh-pages.
Live app: https://djknot.github.io/Fitness_Health_Tracker/

## Current focus
**v0.2 feature batch — pages BUILT, e2e-verified; adversarial review next.**
Scope (user-approved): mood, extra measurements, fasting, edit-in-place, workout
templates, exercise burn, favorites/recents, daily check-in card, manual theme
toggle, barcode scanning, USDA food DB, custom foods, Reports page, earn-back,
self-calibrating TDEE (both toggleable in prefs). No AI features.

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
- v0.2 is feature-complete, reviewed, and verified on this branch. Optional polish
  backlog remains (bundle code-splitting, service worker).
- NOTE: this branch does NOT auto-deploy (the Pages workflow triggers only on the
  default branch) — merging to default publishes v0.2 to the live URL.

## Active obstacles
None. Sandbox: no camera + OFF/USDA unreachable → barcode camera path and remote
search degrade gracefully (verified); manual barcode entry is the testable path.
