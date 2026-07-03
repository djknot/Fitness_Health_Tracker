import type { AppData, FoodEntry, MetricEntry, Workout } from '../types';
import { addDays, lastNDays, startOfWeek } from './dates';

export interface DayNutrition {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export function nutritionOn(foods: FoodEntry[], date: string): DayNutrition {
  const out: DayNutrition = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  for (const f of foods) {
    if (f.date !== date) continue;
    out.calories += f.calories;
    out.proteinG += f.proteinG ?? 0;
    out.carbsG += f.carbsG ?? 0;
    out.fatG += f.fatG ?? 0;
  }
  return out;
}

/** Total calories per day for the last `days` days ending at `end` (zero-filled). */
export function caloriesSeries(
  foods: FoodEntry[],
  end: string,
  days: number,
): { date: string; calories: number }[] {
  const byDate = new Map<string, number>();
  for (const f of foods) byDate.set(f.date, (byDate.get(f.date) ?? 0) + f.calories);
  return lastNDays(days, end).map((date) => ({ date, calories: byDate.get(date) ?? 0 }));
}

/** Workouts inside the Mon–Sun week containing `date`. */
export function workoutsInWeekOf(workouts: Workout[], date: string): Workout[] {
  const start = startOfWeek(date);
  const endExclusive = addDays(start, 7);
  // ISO dates compare correctly as strings.
  return workouts.filter((w) => w.date >= start && w.date < endExclusive);
}

/** Every date with any logged activity (workout, food, metric, or water). */
export function loggedDates(
  data: Pick<AppData, 'workouts' | 'foods' | 'metrics' | 'waterByDate'>,
): Set<string> {
  const s = new Set<string>();
  for (const w of data.workouts) s.add(w.date);
  for (const f of data.foods) s.add(f.date);
  for (const m of data.metrics) s.add(m.date);
  for (const [date, ml] of Object.entries(data.waterByDate)) if (ml > 0) s.add(date);
  return s;
}

/**
 * Consecutive days with logged activity, counting back from today.
 * An empty "today" doesn't break the streak until the day is over,
 * so counting may start at yesterday instead.
 */
export function logStreak(logged: Set<string>, today: string): number {
  let day = logged.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (logged.has(day)) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

/** Weight entries deduped by date (the most recently added wins), ascending by date. */
export function weightSeries(metrics: MetricEntry[]): { date: string; weightKg: number }[] {
  const byDate = new Map<string, number>();
  for (const m of metrics) if (m.weightKg != null) byDate.set(m.date, m.weightKg);
  return [...byDate.entries()]
    .map(([date, weightKg]) => ({ date, weightKg }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface WeightSnapshot {
  date: string;
  weightKg: number;
  /** Change vs the previous weigh-in; null if this is the first one. */
  deltaKg: number | null;
}

export function latestWeight(metrics: MetricEntry[]): WeightSnapshot | null {
  const series = weightSeries(metrics);
  const last = series[series.length - 1];
  if (!last) return null;
  const prev = series[series.length - 2];
  return { ...last, deltaKg: prev ? last.weightKg - prev.weightKg : null };
}

/** Sleep hours per day for the last `days` days ending at `end` (0 = not logged). */
export function sleepSeries(
  metrics: MetricEntry[],
  end: string,
  days: number,
): { date: string; hours: number }[] {
  const byDate = new Map<string, number>();
  for (const m of metrics) if (m.sleepHours != null) byDate.set(m.date, m.sleepHours);
  return lastNDays(days, end).map((date) => ({ date, hours: byDate.get(date) ?? 0 }));
}

/** Total lifted volume (Σ reps × weight) in kg, bodyweight sets counting 0. */
export function workoutVolumeKg(w: Workout): number {
  let vol = 0;
  for (const ex of w.exercises) for (const s of ex.sets) vol += s.reps * (s.weightKg ?? 0);
  return Math.round(vol);
}

export function workoutSetCount(w: Workout): number {
  return w.exercises.reduce((n, ex) => n + ex.sets.length, 0);
}

export function workoutCardioMin(w: Workout): number {
  return w.exercises.reduce((n, ex) => n + (ex.durationMin ?? 0), 0);
}
