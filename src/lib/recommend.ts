import type { ActivityLevel, AppData, Profile, Sex } from '../types';
import { latestWeight } from './stats';

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary (little exercise)',
  light: 'Lightly active (1–3 sessions/week)',
  moderate: 'Moderately active (3–5 sessions/week)',
  active: 'Very active (6–7 sessions/week)',
  veryActive: 'Extremely active (physical job + training)',
};

/** Approximate energy content of 1 kg of body weight change. */
const KCAL_PER_KG = 7700;
/** Safety floor — never recommend eating below this. */
export const MIN_DAILY_KCAL = 1200;
/** Pace cap — faster than this is not sustainable/safe to recommend. */
export const MAX_WEEKLY_RATE_KG = 1;

/** Mifflin-St Jeor basal metabolic rate (kcal/day). */
export function mifflinStJeorBmr(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161));
}

export interface Recommendation {
  bmr: number;
  tdee: number;
  targetCalories: number;
  /** Signed kcal/day adjustment applied to TDEE (negative = deficit). */
  dailyDelta: number;
  direction: 'lose' | 'gain' | 'maintain';
  /** Set when the safety floor clipped the target. */
  flooredAt?: number;
  /** Suggested split: protein 1.8 g/kg (≤35% kcal), fat 27.5% kcal, carbs the rest. */
  macros: { proteinG: number; carbsG: number; fatG: number };
}

/**
 * Recommended daily intake from current state vs goal.
 * Returns null when the profile is incomplete (needs height, age, sex)
 * or there is no current weight to work from.
 */
export function recommend(
  profile: Profile,
  currentWeightKg: number | undefined,
  targetWeightKg: number | undefined,
): Recommendation | null {
  const { heightCm, age, sex, activityLevel } = profile;
  if (currentWeightKg == null || currentWeightKg <= 0) return null;
  if (heightCm == null || heightCm <= 0 || age == null || age <= 0 || sex == null) return null;

  const bmr = mifflinStJeorBmr(currentWeightKg, heightCm, age, sex);
  const tdee = Math.round(bmr * ACTIVITY_FACTORS[activityLevel]);

  const diff = targetWeightKg != null ? targetWeightKg - currentWeightKg : 0;
  const direction: Recommendation['direction'] =
    targetWeightKg == null || Math.abs(diff) < 0.75 ? 'maintain' : diff < 0 ? 'lose' : 'gain';
  const rate = Math.min(Math.abs(profile.weeklyRateKg) || 0.5, MAX_WEEKLY_RATE_KG);
  const dailyDelta =
    direction === 'maintain'
      ? 0
      : Math.round((KCAL_PER_KG * rate) / 7) * (direction === 'lose' ? -1 : 1);

  let targetCalories = tdee + dailyDelta;
  let flooredAt: number | undefined;
  if (targetCalories < MIN_DAILY_KCAL) {
    targetCalories = MIN_DAILY_KCAL;
    flooredAt = MIN_DAILY_KCAL;
  }

  const proteinG = Math.round(Math.min(1.8 * currentWeightKg, (0.35 * targetCalories) / 4));
  const fatG = Math.round((0.275 * targetCalories) / 9);
  const carbsG = Math.max(0, Math.round((targetCalories - proteinG * 4 - fatG * 9) / 4));

  return { bmr, tdee, targetCalories, dailyDelta, direction, flooredAt, macros: { proteinG, carbsG, fatG } };
}

export interface CalorieTargetInfo {
  /** The number the app tracks daily intake against. */
  target: number;
  source: 'manual' | 'recommended';
  /** Full detail whenever computable, regardless of source. */
  recommendation: Recommendation | null;
}

/** The effective daily calorie target: recommended when enabled and computable, else manual. */
export function calorieTargetInfo(
  data: Pick<AppData, 'goals' | 'profile' | 'metrics'>,
): CalorieTargetInfo {
  const currentWeightKg = latestWeight(data.metrics)?.weightKg;
  const rec = recommend(data.profile, currentWeightKg, data.goals.targetWeightKg);
  if (data.profile.useRecommendedTarget && rec) {
    return { target: rec.targetCalories, source: 'recommended', recommendation: rec };
  }
  return { target: data.goals.dailyCalories, source: 'manual', recommendation: rec };
}
