# Product Context

## Why this project exists
FitTrack is a personal fitness & health tracker for logging workouts, nutrition, and
body metrics in one place — without accounts, subscriptions, or shipping personal
health data to a server. All data lives on the user's own device.

## Target problems
- Fitness data scattered across separate apps (lifting app, calorie app, scale app).
- Commercial trackers require accounts and harvest sensitive health data.
- Friction: logging a meal or workout should take seconds, not a sign-up flow.

## Target user
A single individual tracking their own training, eating, and body trends
(initially the repo owner). One user per browser profile; no multi-user support.

## Core product requirements (v1)
1. **Workout logging** — strength (exercises → sets × reps × weight) and cardio
   (duration/distance); browsable history; delete entries.
2. **Nutrition tracking** — food entries per meal (breakfast/lunch/dinner/snack)
   with calories + optional macros; daily calorie target; water intake tracker.
3. **Body metrics** — weight, body-fat %, waist, sleep hours over time with trend charts.
4. **Dashboard & goals** — today's calories/water, workouts this week vs target,
   current weight vs goal, logging streak, weight-trend and 7-day calorie charts.
5. **Local-first** — all data in browser localStorage; JSON export/import for backup;
   works offline once loaded; installable PWA (manifest provided).
6. **Units** — metric or imperial display; storage is always canonical metric.

## Explicit non-goals (v1)
- No accounts, auth, sync, or backend of any kind.
- No social features, coaching, or AI recommendations.
- No native mobile app (responsive PWA instead); no service worker yet.

## UX principles
- Mobile-first layout (bottom tab bar) that scales up to desktop (sidebar).
- Quick-add flows on every page; empty states invite the first log.
- Light & dark theme follow the OS preference automatically.
