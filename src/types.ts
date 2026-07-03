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
  /** Cardio only. */
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

export interface MetricEntry {
  id: string;
  date: string;
  weightKg?: number;
  bodyFatPct?: number;
  waistCm?: number;
  sleepHours?: number;
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

export interface AppData {
  workouts: Workout[];
  foods: FoodEntry[];
  /** Total water intake per date, in ml. */
  waterByDate: Record<string, number>;
  metrics: MetricEntry[];
  goals: Goals;
  profile: Profile;
}
