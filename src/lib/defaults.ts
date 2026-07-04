import type { AppData, Goals, Prefs, Profile } from '../types';

export const DEFAULT_GOALS: Goals = {
  units: 'metric',
  dailyCalories: 2200,
  dailyWaterMl: 2500,
  weeklyWorkouts: 4,
};

export const DEFAULT_PROFILE: Profile = {
  activityLevel: 'light',
  weeklyRateKg: 0.5,
  useRecommendedTarget: false,
};

export const DEFAULT_PREFS: Prefs = {
  theme: 'system',
  earnBackExercise: false,
  adaptiveTdee: false,
};

export function emptyData(): AppData {
  return {
    workouts: [],
    foods: [],
    waterByDate: {},
    metrics: [],
    fasts: [],
    templates: [],
    customFoods: [],
    favoriteFoods: [],
    recentFoods: [],
    savedMeals: [],
    goals: { ...DEFAULT_GOALS },
    profile: { ...DEFAULT_PROFILE },
    prefs: { ...DEFAULT_PREFS },
  };
}
