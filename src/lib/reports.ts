import type { AppData, Fast, FoodEntry, MetricEntry, Workout } from '../types';
import { addDays, formatMedium, startOfWeek, toISODate } from './dates';
import { completedFasts, fastDurationHours } from './fasting';
import { weightSeries, workoutVolumeKg } from './stats';
import { round1 } from './units';

/** Inclusive local-calendar date range spanning `days` days. */
export interface DateRange {
  start: string;
  end: string;
  days: number;
}

export interface RangeOption {
  key: string;
  label: string;
  days: number;
}

/** Report range presets (days ending today). */
export const RANGE_OPTIONS: readonly RangeOption[] = [
  { key: '4w', label: '4W', days: 28 },
  { key: '8w', label: '8W', days: 56 },
  { key: '3m', label: '3M', days: 91 },
  { key: '6m', label: '6M', days: 182 },
  { key: '1y', label: '1Y', days: 365 },
];

/** The `days`-day range ending at `end`, inclusive on both sides. */
export function rangeEndingAt(end: string, days: number): DateRange {
  return { start: addDays(end, -(days - 1)), end, days };
}

/** ISO dates compare correctly as strings. */
export function inRange(date: string, r: DateRange): boolean {
  return date >= r.start && date <= r.end;
}

/**
 * Monday week-starts of every Mon–Sun week that overlaps the range, ascending.
 * The first (and last) bucket may extend past the range edges; per-week
 * aggregations below only count entries inside the range itself.
 */
export function weekStarts(r: DateRange): string[] {
  const out: string[] = [];
  for (let w = startOfWeek(r.start); w <= r.end; w = addDays(w, 7)) out.push(w);
  return out;
}

/** One weekly chart point; `value: null` means "no data logged that week". */
export interface WeekValue {
  weekStart: string;
  value: number | null;
}

/** Workouts per Mon-start week (zero-filled — 0 workouts is real data). */
export function workoutsPerWeek(workouts: Workout[], r: DateRange): { weekStart: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const w of workouts) {
    if (!inRange(w.date, r)) continue;
    const ws = startOfWeek(w.date);
    counts.set(ws, (counts.get(ws) ?? 0) + 1);
  }
  return weekStarts(r).map((weekStart) => ({ weekStart, value: counts.get(weekStart) ?? 0 }));
}

/** Total calories per date for entries inside the range. A date key exists iff food was logged. */
export function caloriesByDate(foods: FoodEntry[], r: DateRange): Map<string, number> {
  const byDate = new Map<string, number>();
  for (const f of foods) {
    if (inRange(f.date, r)) byDate.set(f.date, (byDate.get(f.date) ?? 0) + f.calories);
  }
  return byDate;
}

/** Average daily calories per week, over days with logged food only (null = nothing logged). */
export function avgCaloriesPerWeek(foods: FoodEntry[], r: DateRange): WeekValue[] {
  const byDate = caloriesByDate(foods, r);
  const sums = new Map<string, { total: number; days: number }>();
  for (const [date, calories] of byDate) {
    const ws = startOfWeek(date);
    const cur = sums.get(ws) ?? { total: 0, days: 0 };
    cur.total += calories;
    cur.days += 1;
    sums.set(ws, cur);
  }
  return weekStarts(r).map((weekStart) => {
    const s = sums.get(weekStart);
    return { weekStart, value: s ? Math.round(s.total / s.days) : null };
  });
}

/** Per-date metric values inside the range, deduped by date (the most recently added wins). */
function metricByDate(
  metrics: MetricEntry[],
  r: DateRange,
  pick: (m: MetricEntry) => number | undefined,
): Map<string, number> {
  const byDate = new Map<string, number>();
  for (const m of metrics) {
    const v = pick(m);
    if (v != null && inRange(m.date, r)) byDate.set(m.date, v);
  }
  return byDate;
}

/** Average sleep hours per week over logged nights only (null = none logged). */
export function avgSleepPerWeek(metrics: MetricEntry[], r: DateRange): WeekValue[] {
  const byDate = metricByDate(metrics, r, (m) => m.sleepHours);
  const sums = new Map<string, { total: number; days: number }>();
  for (const [date, hours] of byDate) {
    const ws = startOfWeek(date);
    const cur = sums.get(ws) ?? { total: 0, days: 0 };
    cur.total += hours;
    cur.days += 1;
    sums.set(ws, cur);
  }
  return weekStarts(r).map((weekStart) => {
    const s = sums.get(weekStart);
    return { weekStart, value: s ? round1(s.total / s.days) : null };
  });
}

export interface WorkoutSummary {
  count: number;
  /** count ÷ weeks in range, 1 decimal. */
  perWeek: number;
  totalVolumeKg: number;
}

export function workoutSummary(workouts: Workout[], r: DateRange): WorkoutSummary {
  const inR = workouts.filter((w) => inRange(w.date, r));
  const totalVolumeKg = inR.reduce((sum, w) => sum + workoutVolumeKg(w), 0);
  return { count: inR.length, perWeek: round1(inR.length / (r.days / 7)), totalVolumeKg };
}

export interface CalorieSummary {
  /** Days in range with at least one food entry. */
  loggedDays: number;
  /** Average daily intake over logged days only; null when nothing is logged. */
  avgCalories: number | null;
}

export function calorieSummary(foods: FoodEntry[], r: DateRange): CalorieSummary {
  const byDate = caloriesByDate(foods, r);
  if (byDate.size === 0) return { loggedDays: 0, avgCalories: null };
  let total = 0;
  for (const v of byDate.values()) total += v;
  return { loggedDays: byDate.size, avgCalories: Math.round(total / byDate.size) };
}

export interface WeightChange {
  firstKg: number;
  lastKg: number;
  /** last − first (negative = lost weight). */
  changeKg: number;
}

/** First → last weigh-in inside the range; null unless there are 2+ weigh-in dates. */
export function weightChangeInRange(metrics: MetricEntry[], r: DateRange): WeightChange | null {
  const series = weightSeries(metrics).filter((p) => inRange(p.date, r));
  if (series.length < 2) return null;
  const first = series[0];
  const last = series[series.length - 1];
  return { firstKg: first.weightKg, lastKg: last.weightKg, changeKg: last.weightKg - first.weightKg };
}

export interface SleepSummary {
  loggedDays: number;
  avgHours: number | null;
}

export function sleepSummary(metrics: MetricEntry[], r: DateRange): SleepSummary {
  const byDate = metricByDate(metrics, r, (m) => m.sleepHours);
  if (byDate.size === 0) return { loggedDays: 0, avgHours: null };
  let total = 0;
  for (const v of byDate.values()) total += v;
  return { loggedDays: byDate.size, avgHours: round1(total / byDate.size) };
}

export interface MoodSummary {
  loggedDays: number;
  /** 1–5 scale, 1 decimal. */
  avgMood: number | null;
}

export function moodSummary(metrics: MetricEntry[], r: DateRange): MoodSummary {
  const byDate = metricByDate(metrics, r, (m) => m.mood);
  if (byDate.size === 0) return { loggedDays: 0, avgMood: null };
  let total = 0;
  for (const v of byDate.values()) total += v;
  return { loggedDays: byDate.size, avgMood: round1(total / byDate.size) };
}

export interface FastSummary {
  completed: number;
  avgHours: number | null;
}

/** Fasts whose end datetime falls on a local date inside the range (running fasts excluded). */
export function fastSummary(fasts: Fast[], r: DateRange): FastSummary {
  // Fast.start/end are full ISO datetimes — new Date(ts) is correct here.
  // completedFasts guarantees `end`, but its declared return type doesn't carry that.
  const done = completedFasts(fasts).filter(
    (f): f is Fast & { end: string } => f.end != null && inRange(toISODate(new Date(f.end)), r),
  );
  if (done.length === 0) return { completed: 0, avgHours: null };
  // `now` is never read for completed fasts, so the epoch keeps this deterministic.
  const epoch = new Date(0);
  const total = done.reduce((sum, f) => sum + fastDurationHours(f, epoch), 0);
  return { completed: done.length, avgHours: total / done.length };
}

export interface CalorieAdherence {
  /** Logged days below target × (1 − tolerance). */
  under: number;
  /** Logged days inside the ± tolerance band (boundaries inclusive). */
  within: number;
  /** Logged days above target × (1 + tolerance). */
  over: number;
  loggedDays: number;
  /** Rounded percentage of logged days within the band; null with no logged days. */
  withinPct: number | null;
}

/** Buckets every logged day in range against the (current) daily calorie target. */
export function calorieAdherence(
  foods: FoodEntry[],
  r: DateRange,
  target: number,
  tolerance = 0.1,
): CalorieAdherence {
  const byDate = caloriesByDate(foods, r);
  const lo = target * (1 - tolerance);
  const hi = target * (1 + tolerance);
  let under = 0;
  let within = 0;
  let over = 0;
  for (const calories of byDate.values()) {
    if (calories < lo) under++;
    else if (calories > hi) over++;
    else within++;
  }
  const loggedDays = byDate.size;
  return {
    under,
    within,
    over,
    loggedDays,
    withinPct: loggedDays > 0 ? Math.round((within / loggedDays) * 100) : null,
  };
}

/**
 * Log events per date inside the range: each workout, food entry, and metric
 * entry counts 1; a day with any water (>0 ml) counts 1 more. Dates without
 * logs are absent, so `map.size` is the number of active days.
 */
export function dailyLogCounts(
  data: Pick<AppData, 'workouts' | 'foods' | 'metrics' | 'waterByDate'>,
  r: DateRange,
): Map<string, number> {
  const counts = new Map<string, number>();
  const bump = (date: string) => {
    if (inRange(date, r)) counts.set(date, (counts.get(date) ?? 0) + 1);
  };
  for (const w of data.workouts) bump(w.date);
  for (const f of data.foods) bump(f.date);
  for (const m of data.metrics) bump(m.date);
  for (const [date, ml] of Object.entries(data.waterByDate)) if (ml > 0) bump(date);
  return counts;
}

export interface HeatmapDay {
  date: string;
  count: number;
  /** False for padding days of the first/last week that fall outside the range. */
  inRange: boolean;
}

export interface HeatmapWeek {
  weekStart: string;
  /** Always 7 entries, Monday first. */
  days: HeatmapDay[];
}

/** Mon-start week columns covering the range, each padded to a full Mon–Sun. */
export function heatmapWeeks(counts: Map<string, number>, r: DateRange): HeatmapWeek[] {
  return weekStarts(r).map((weekStart) => ({
    weekStart,
    days: Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      return { date, count: counts.get(date) ?? 0, inRange: inRange(date, r) };
    }),
  }));
}

/**
 * Month label per week column: set where the month changes (and on the first
 * column), null elsewhere. The first column's label is dropped when the second
 * column starts a new month, so adjacent labels never collide.
 */
export function monthLabels(weekStarts: string[]): (string | null)[] {
  const month = (iso: string) => formatMedium(iso).split(' ')[0];
  const out = weekStarts.map((ws, i) => {
    const m = month(ws);
    return i === 0 || m !== month(weekStarts[i - 1]) ? m : null;
  });
  if (out.length > 1 && out[0] != null && out[1] != null) out[0] = null;
  return out;
}
