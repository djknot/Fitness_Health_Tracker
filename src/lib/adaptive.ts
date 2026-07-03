import type { AppData } from '../types';
import { addDays } from './dates';
import { caloriesSeries, weightSeries } from './stats';

/** Energy content of 1 kg of body weight change. */
const KCAL_PER_KG = 7700;
export const ADAPTIVE_WINDOW_DAYS = 28;
export const ADAPTIVE_MIN_LOGGED_DAYS = 14;
/** Days with fewer calories than this are treated as incompletely logged and skipped. */
export const ADAPTIVE_MIN_DAY_KCAL = 1000;
/** Weigh-ins must span at least this many days inside the window. */
export const ADAPTIVE_MIN_SPAN_DAYS = 14;
/** Sanity clamp relative to the formula TDEE. */
const CLAMP_LOW = 0.6;
const CLAMP_HIGH = 1.4;

export interface AdaptiveTdee {
  /** Your maintenance calories observed from real data (clamped for sanity). */
  observedTdee: number;
  /** Fully-logged days used for the intake average. */
  daysUsed: number;
  /** Weight change across the analysed span (kg, signed). */
  deltaKg: number;
  /** Days between the first and last weigh-in used. */
  spanDays: number;
  avgIntake: number;
  clamped: boolean;
}

/**
 * Estimate actual TDEE from energy balance: intake − (Δweight × 7700)/days.
 * Returns null until there are ≥14 fully-logged intake days and weigh-ins
 * spanning ≥14 days inside the trailing 28-day window.
 */
export function computeAdaptiveTdee(
  data: Pick<AppData, 'foods' | 'metrics'>,
  today: string,
  formulaTdee: number,
): AdaptiveTdee | null {
  if (formulaTdee <= 0) return null;
  const windowStart = addDays(today, -(ADAPTIVE_WINDOW_DAYS - 1));

  const days = caloriesSeries(data.foods, today, ADAPTIVE_WINDOW_DAYS).filter(
    (d) => d.calories >= ADAPTIVE_MIN_DAY_KCAL,
  );
  if (days.length < ADAPTIVE_MIN_LOGGED_DAYS) return null;

  const weights = weightSeries(data.metrics).filter((p) => p.date >= windowStart && p.date <= today);
  if (weights.length < 2) return null;
  const first = weights[0];
  const last = weights[weights.length - 1];
  const spanDays = Math.round(
    (Date.parse(last.date) - Date.parse(first.date)) / (24 * 60 * 60 * 1000),
  );
  if (spanDays < ADAPTIVE_MIN_SPAN_DAYS) return null;

  const avgIntake = days.reduce((n, d) => n + d.calories, 0) / days.length;
  const deltaKg = last.weightKg - first.weightKg;
  const dailySurplus = (deltaKg * KCAL_PER_KG) / spanDays;
  const raw = avgIntake - dailySurplus;

  const low = formulaTdee * CLAMP_LOW;
  const high = formulaTdee * CLAMP_HIGH;
  const observedTdee = Math.round(Math.min(high, Math.max(low, raw)));

  return {
    observedTdee,
    daysUsed: days.length,
    deltaKg: Math.round(deltaKg * 100) / 100,
    spanDays,
    avgIntake: Math.round(avgIntake),
    clamped: raw < low || raw > high,
  };
}
