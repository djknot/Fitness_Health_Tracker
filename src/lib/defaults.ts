import type { AppData, Goals, Profile } from '../types';

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

export function emptyData(): AppData {
  return {
    workouts: [],
    foods: [],
    waterByDate: {},
    metrics: [],
    goals: { ...DEFAULT_GOALS },
    profile: { ...DEFAULT_PROFILE },
  };
}
