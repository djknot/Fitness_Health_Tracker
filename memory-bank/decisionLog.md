# Decision Log

Newest first. Format: date — decision — rationale/tradeoff.

## 2026-07-05 — Deploy self-heals GitHub's flaky Pages publish
GitHub's own "pages build and deployment" (runs after we force-push gh-pages) hit
the transient "Deployment failed, try again later" once (1 of 13), silently leaving
the live site a version behind — a real user was stranded and cache-clearing did
nothing because the server itself was stale. deploy.yml now has a final step
(needs `actions: write`) that finds that publish run via `gh`, `gh run watch
--exit-status`, and `gh run rerun --failed` up to 3× — so a flake auto-recovers and
a genuine failure shows red instead of passing silently. Kept the branch-push route
(actions/deploy-pages was abandoned earlier); this just babysits GitHub's step.
v0.2 edit-in-place seeds inputs from stored values; some (e.g. sleep 6.4 h against
`step=0.25`) aren't step-multiples, so native constraint validation raised a
stepMismatch and the form silently refused to submit — the metrics row editor was
unsavable (caught by e2e). First patch added `noValidate`, but that ALSO disabled
`min`/`max`, letting negative weight / sleep>24 persist (found in the review round).
Resolution: `step="any"` on every numeric input (accepts any decimal → no
stepMismatch) while KEEPING `min`/`max` and dropping `noValidate`, so the browser
enforces ranges on submit. Pattern for all data-entry forms. (Nutrition keeps its
JS-only validation — its number inputs carry no native min/max/step.)

## 2026-07-03 — Burn MET keyword is `'rowing'`, not `'row'`
`metFor` substring-matches exercise names to MET values. `'row'` swallowed strength
"Barbell Row"/"Dumbbell Row" into the cardio rowing-machine MET (7.0) vs the strength
default (4.0). Narrowed to `'rowing'`: a cardio "Row" now falls to the cardio default
(6.0, close enough) while strength rows read correctly. Burn is an estimate; the
relative error on a strength row was the larger of the two.

## 2026-07-03 — Pages publish mechanism: gh-pages branch (deploy-pages API abandoned)
actions/deploy-pages@v4 rejected every deployment for this site within ~5 s
("Deployment failed, try again later") across five attempts spanning 20+ minutes —
with the repo public, Pages enabled with Source=GitHub Actions, email verified, and
artifact/build green. Root cause opaque (Pages backend). Pivoted to the classic route:
CI builds and force-pushes `dist/` to the `gh-pages` branch (plain git in the workflow,
`contents: write`, no third-party action); Pages serves that branch via GitHub's own
"pages build and deployment" pipeline. `.nojekyll` included. Same URL, same automation.

## 2026-07-03 — Hosting: GitHub Pages via Actions from the working branch
Static local-first app → free Pages hosting fits perfectly; localStorage is per-origin
so users keep their data across deploys. Vite `base: '/Fitness_Health_Tracker/'`,
router `basename={import.meta.env.BASE_URL}`, relative URLs in the PWA manifest, and a
`404.html` copy of `index.html` as the SPA fallback. Workflow deploys on push to
`claude/fitness-health-tracking-app-f7yhxv` (the repo's default branch — first branch
ever pushed) and runs tests before building.

## 2026-07-03 — Settings drafts are unit-coupled and version-keyed
Adversarial review (34-agent workflow, 9 confirmed findings → 6 unique bugs) drove two
patterns now load-bearing in Settings: (1) every weight/length draft string is parsed
and labelled with `draftUnits` (never `goals.units`), and `onUnitsChange` converts all
drafts in lockstep — a draft value and its unit must never diverge; (2) the store keeps
a non-persisted `dataVersion` bumped by `replaceAll`/`resetAll`, and Settings remounts
on it (`key={dataVersion}`) so seeded-once drafts can't mask or revert imported data.
Also fixed in the same round: Workouts date input guarded like Nutrition's (no ''/future
dates persisted), food-search selection clears when the name is edited, dashboard weight
delta compares distance-to-goal before/after (crossing the goal now reads as progress),
Meter clamps aria-valuenow with aria-valuetext carrying the true over-target value.

## 2026-07-03 — Food lookup: bundled local DB + Open Food Facts (no API key)
User asked for nutrition lookup by food/brand/quantity. Hybrid in `lib/foodDb.ts` +
`lib/foodSearch.ts`: ~95 curated generic foods per-100g work offline/instantly; branded
products come from the free, CORS-enabled Open Food Facts search API (no key, no signup).
Quantity in grams scales per-100g values (`computeNutrition`). Degrades gracefully to
local-only when offline (`remoteError` flag). Tradeoff: food-name search terms do leave
the device when online lookup fires — disclosed in Settings→About. USDA FDC rejected
(needs API key); fully-bundled big DB rejected (bundle size).

## 2026-07-03 — Recommended intake: Mifflin-St Jeor BMR × activity − goal pace
User asked for recommended daily calories from current state vs goal. `lib/recommend.ts`:
BMR (Mifflin-St Jeor, needs profile height/age/sex) × activity factor (1.2–1.9) = TDEE;
daily delta = 7,700 kcal/kg × weekly pace ÷ 7, signed by target-vs-current weight
(latest logged weigh-in = "current state"); pace capped at 1 kg/week; 1,200 kcal safety
floor; macros protein 1.8 g/kg (≤35% kcal), fat 27.5% kcal, carbs remainder.
`calorieTargetInfo()` returns the effective target the whole app tracks against —
recommended when `profile.useRecommendedTarget` and computable, else the manual goal.
Explicit "estimates only, not medical advice" copy in Settings.

## 2026-07-03 — v1 platform: local-first React SPA (PWA), no backend
User chose "Web app" over full-stack or React Native. Fastest path to a usable tracker;
zero infra; health data stays on-device. Tradeoff: no cross-device sync (revisit at M3).

## 2026-07-03 — Persistence: localStorage via zustand/persist (not IndexedDB)
Dataset is small structured JSON (years of entries ≪ 5 MB). `persist` gives
hydration + versioned migrations for free. Revisit if media (photos) or bulk history arrives.

## 2026-07-03 — Canonical metric storage; convert only at display edge
kg/cm/ml + local-ISO date strings in the store; `lib/units.ts` converts for imperial display.
Prevents drift/rounding corruption when the user flips units.

## 2026-07-03 — Recharts 3 (not 2.x)
React 19 removed `defaultProps` for function components, which breaks recharts 2.x axes.
recharts ^3 is the React-19-compatible line (installed 3.9.1).

## 2026-07-03 — Tailwind v4 CSS-first theming with semantic tokens
`--app-*` CSS variables for light/dark (auto `prefers-color-scheme`, no manual toggle in v1),
exposed as utilities via `@theme inline`. Charts can't reliably read CSS vars inside SVG
attrs across browsers → `useChartTheme()` hook hands resolved hex to Recharts.

## 2026-07-03 — Chart palette = validated dataviz reference palette
Slots: blue `#2a78d6`/`#3987e5`, aqua `#1baf7a`/`#199e70`, yellow `#eda100`/`#c98500`
(light/dark). Ran the palette validator: PASS both modes (light aqua/yellow are sub-3:1 →
relief rule: direct labels + list/table twins accompany charts). Single-series charts use
slot 1; macro split uses slots 1–3; status colors reserved for target semantics.

## 2026-07-03 — Week starts Monday; streak = any-log days
`workoutsInWeekOf` uses Mon–Sun; streak counts consecutive days with any logged item and
tolerates an empty "today" (starts at yesterday) so mornings don't show a broken streak.

## 2026-07-03 — No service worker in v1
Manifest-only PWA: installable, but app shell needs network on first nav. Avoids
stale-cache debugging during early iteration; SW is the top M2 item.
