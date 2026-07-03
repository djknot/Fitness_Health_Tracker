import type { Fast } from '../types';

/** The currently-running fast, if any. */
export function activeFast(fasts: Fast[]): Fast | undefined {
  return fasts.find((f) => !f.end);
}

/** Duration in hours; running fasts measure against `now`. */
export function fastDurationHours(f: Fast, now: Date): number {
  const end = f.end ? Date.parse(f.end) : now.getTime();
  return Math.max(0, (end - Date.parse(f.start)) / 3_600_000);
}

/** "16 h 32 m" */
export function formatHoursMinutes(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m === 60 ? `${h + 1} h 0 m` : `${h} h ${m} m`;
}

/** Completed fasts, newest first. */
export function completedFasts(fasts: Fast[]): Fast[] {
  return fasts
    .filter((f): f is Fast & { end: string } => !!f.end)
    .sort((a, b) => b.start.localeCompare(a.start));
}
