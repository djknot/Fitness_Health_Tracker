export type Units = 'metric' | 'imperial';

export type ExerciseKind = 'strength' | 'cardio';

export interface StrengthSet {
  reps: number;
  /** Weight lifted in kg; null for bodyweight sets. */
  weightKg: number | null;
}

export interface Exercise {
  id: string;
  name: string;
  kind: ExerciseKind;
  /** Strength only; empty for cardio. */
  sets: StrengthSet[];
  /** Cardio always; optional for strength (improves calorie-burn estimates). */
  durationMin?: number;
  distanceKm?: number;
}

export interface Workout {
  id: string;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  name: string;
  exercises: Exercise[];
  notes?: string;
}

/** A reusable workout routine. */
export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: Exercise[];
}

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export interface FoodEntry {
  id: string;
  date: string;
  meal: MealType;
  name: string;
  calories: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
}

/** A food lookup result / definition (per-100g basis). */
export interface FoodRecord {
  name: string;
  brand?: string;
  /** kcal & macro grams per 100 g (100 ml for liquids). */
  per100g: { kcal: number; proteinG: number; carbsG: number; fatG: number };
  /** Typical serving in grams — used as the default quantity. */
  servingG?: number;
  servingLabel?: string;
  source: 'local' | 'off' | 'usda' | 'custom';
}

/** A user-defined food, searchable alongside the built-in database. */
export interface CustomFood extends FoodRecord {
  id: string;
  source: 'custom';
}

/** Snapshot of a logged food for one-tap re-logging (favorites & recents). */
export interface QuickFood {
  id: string;
  name: string;
  calories: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
}

export interface MetricEntry {
  id: string;
  date: string;
  weightKg?: number;
  bodyFatPct?: number;
  waistCm?: number;
  chestCm?: number;
  hipsCm?: number;
  armCm?: number;
  thighCm?: number;
  sleepHours?: number;
  /** 1 (worst) – 5 (best). */
  mood?: number;
}

/** A fasting window; `end` is unset while the fast is running. Full ISO datetimes. */
export interface Fast {
  id: string;
  start: string;
  end?: string;
}

export interface Goals {
  units: Units;
  /** Manual daily calorie target, used when the recommended target is off. */
  dailyCalories: number;
  dailyWaterMl: number;
  weeklyWorkouts: number;
  targetWeightKg?: number;
}

export type Sex = 'male' | 'female';

export const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'veryActive'] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

/** Personal data used to compute the recommended daily intake. */
export interface Profile {
  heightCm?: number;
  age?: number;
  sex?: Sex;
  activityLevel: ActivityLevel;
  /** Desired pace toward the target weight, in kg per week (positive number). */
  weeklyRateKg: number;
  /** Track against the computed recommendation instead of the manual calorie goal. */
  useRecommendedTarget: boolean;
}

export type ThemePref = 'system' | 'light' | 'dark';

/** App preferences (v0.2). */
export interface Prefs {
  theme: ThemePref;
  /** Free key from https://fdc.nal.usda.gov/api-key-signup — enables USDA food search. */
  usdaApiKey?: string;
  /** Add estimated exercise burn to the day's calorie target. */
  earnBackExercise: boolean;
  /** Calibrate TDEE from logged intake vs actual weight trend when enough data exists. */
  adaptiveTdee: boolean;
}

export interface AppData {
  workouts: Workout[];
  foods: FoodEntry[];
  /** Total water intake per date, in ml. */
  waterByDate: Record<string, number>;
  metrics: MetricEntry[];
  fasts: Fast[];
  templates: WorkoutTemplate[];
  customFoods: CustomFood[];
  favoriteFoods: QuickFood[];
  recentFoods: QuickFood[];
  goals: Goals;
  profile: Profile;
  prefs: Prefs;
}
