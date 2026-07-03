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

## State right now — v0.2 pages COMPLETE (6-agent workflow + integration)
- All five pages upgraded + Reports real page + `lib/reports.ts`; new components
  under components/{nutrition,workouts,checkin,reports,settings}/. Pages track
  against dailyTargetInfo (earned-back note + adaptive chip).
- IconButton grew a `variant="neutral"` (non-destructive hover) — used by edit/
  star/template/close buttons; deletes keep the danger hover.
- Data-entry forms carry `noValidate`: native step/min checks silently blocked
  submits (e.g. stored sleep 6.4 vs step=0.25 made the metrics editor unsavable —
  found by e2e). JS parsing remains the validator; Metrics date input now has the
  same explicit onChange guard as Nutrition/Workouts.
- tsc strict clean; 136 unit tests green (11 files); production build green
  (main ~761 kB + lazy 44 kB barcode ponyfill chunk).
- Playwright e2e vs the preview build: 41/41 steps green (sample load, chips,
  barcode manual path incl. offline degradation, fasting, all edit-in-place flows,
  templates, burn chips, check-in, earned-back, adaptive panel, Reports, theme
  toggle, persistence). Screenshots (light/dark/mobile) reviewed.

## Next immediate steps
1. Adversarial review workflow over `git diff 82fbe79 → HEAD` (foundation + pages
   were never reviewed): multi-lens finders → dedup → 3-vote refutation panel;
   fix confirmed findings, re-verify (tsc/tests/build + targeted e2e).
2. Final memory-bank sync (progress/decisionLog), commit, push.
3. NOTE: this branch does NOT auto-deploy (workflow triggers only on the default
   branch) — merging to default publishes v0.2.

## Active obstacles
None. Sandbox: no camera + OFF/USDA unreachable → barcode camera path and remote
search degrade gracefully (verified); manual barcode entry is the testable path.
