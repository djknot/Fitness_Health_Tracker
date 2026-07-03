# Active Context

## Active branch
`claude/fitness-health-tracking-app-f7yhxv` (default). `gh-pages` = CI-managed builds.
Live app: https://djknot.github.io/Fitness_Health_Tracker/

## Current focus
**v0.2 feature batch — IN PROGRESS.** User-approved scope: all "easy tier" items
(mood, extra measurements, fasting, edit-in-place, workout templates, exercise burn,
favorites/recents, daily check-in card, manual theme toggle) + barcode scanning,
USDA food DB, custom foods, Reports page, exercise-calories-feed-target (earn-back),
and self-calibrating TDEE — earn-back and adaptive TDEE both user-toggleable in prefs.
No AI features (explicitly declined).

## State right now — foundation DONE and pushed (checkpoint commit after 82fbe79)
- types.ts v2: MetricEntry (+mood/chest/hips/arm/thigh), Fast, WorkoutTemplate,
  CustomFood, QuickFood, Prefs (theme/usdaApiKey/earnBackExercise/adaptiveTdee),
  FoodRecord moved here (source: local|off|usda|custom).
- Store v2 (persist version 2, migrate spreads emptyData defaults): new slices
  fasts/templates/customFoods/favoriteFoods/recentFoods/prefs; update* actions for
  workout/food/metric/customFood; toggleFavoriteFood; start/endFast; addFood pushes
  recents LRU (lib/quickfoods.ts).
- New libs: burn.ts (METs, MINUTES_PER_SET fallback), adaptive.ts (28d window, ≥14
  logged days ≥1000 kcal, weigh-in span ≥14d, clamp 0.6–1.4×formula), usda.ts
  (mapUsdaFoods pure + searchUsda), fasting.ts, quickfoods.ts; foodSearch.searchFoods
  now takes {signal, usdaApiKey, customFoods} and merges custom→local→OFF∥USDA;
  lookupBarcode(code) added; recommend.ts refactored (targetsFromTdee) + NEW
  dailyTargetInfo(data, date) = base target (manual|recommended|recommended-adaptive)
  + earn-back burn → THE function pages should track against.
- Theme: prefs.theme stamps data-theme on <html> (App.useApplyTheme); index.css has
  [data-theme] overrides after the media query; useIsDark()/useChartTheme() respect it.
- Routing/nav: /reports added (PLACEHOLDER page only); bottom nav now 6 cols.
- sample.ts/backup.ts cover all new slices (backups are backward compatible).
- barcode-detector@3.2.0 installed (use ponyfill import, lazy-load in scanner).

## Next immediate steps
1. Run the 6-agent page workflow (specs in progress.md "v0.2 build plan"): Nutrition
   (favorites/recents chips, barcode scanner modal + manual code entry, fasting card,
   edit rows, dailyTargetInfo), Workouts (templates, strength duration, burn chips,
   edit), Metrics+Dashboard (new fields, mood, BMI, check-in card, burn-aware target),
   Reports (real page), Settings (theme select, USDA key, toggles, custom-foods CRUD,
   adaptive preview), tests (burn/adaptive/fasting/quickfoods/usda-mapping/target).
2. Integrate: tsc, vitest, build, Playwright e2e (extend verify script), screenshots.
3. Adversarial review workflow → fix confirmed findings.
4. Memory-bank sync, commit, push (auto-deploys to the live URL).

## Active obstacles
None. Note: sandbox cannot reach github.io or use device camera — verify barcode via
manual-code-entry path; OFF/USDA network may be blocked in sandbox (degrade gracefully).
