# Active Context

## Active branch
`claude/fitness-health-tracking-app-f7yhxv` (repo default branch). Publishing branch:
`gh-pages` (CI-managed, force-pushed builds only — never edit by hand).

## Current focus
None — FitTrack v0.1 is complete, reviewed, and **live in production**:
https://djknot.github.io/Fitness_Health_Tracker/

## State right now
- App deployed via GitHub Pages (Source: Deploy from a branch → gh-pages / root).
- CI on every push to the default branch: npm ci → tests (57) → build → force-push
  dist/ to gh-pages → GitHub's "pages build and deployment" publishes (verified green,
  run 28645191274).
- Repo is public (required for free-plan Pages); user's tracked data stays in-browser.
- All quality gates passed this session: tsc strict, 57/57 unit tests, production build,
  Playwright e2e (light/dark/mobile), 34-agent adversarial review → 6 bugs fixed.

## Next immediate steps (when work resumes)
Pick from the backlog in progress.md — top candidates: service worker for offline
app-shell, edit-in-place for logged entries, recharts code-splitting, barcode scanning.

## Active obstacles
None. (Note for future sessions: actions/deploy-pages API rejects this site — see
decisionLog 2026-07-03; keep the gh-pages branch mechanism.)
