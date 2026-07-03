import { describe, expect, it } from 'vitest';
import type { Goals, Profile } from '../types';
import { calorieTargetInfo, mifflinStJeorBmr, recommend } from './recommend';

const maleProfile: Profile = {
  heightCm: 180,
  age: 30,
  sex: 'male',
  activityLevel: 'sedentary',
  weeklyRateKg: 0.5,
  useRecommendedTarget: false,
};

const goals: Goals = {
  units: 'metric',
  dailyCalories: 2200,
  dailyWaterMl: 2000,
  weeklyWorkouts: 3,
  targetWeightKg: 75,
};

describe('mifflinStJeorBmr', () => {
  it('matches the formula for a male', () => {
    expect(mifflinStJeorBmr(80, 180, 30, 'male')).toBe(1780);
  });

  it('matches the formula for a female (rounded)', () => {
    expect(mifflinStJeorBmr(60, 165, 40, 'female')).toBe(Math.round(10 * 60 + 6.25 * 165 - 5 * 40 - 161));
  });
});

describe('recommend', () => {
  it('computes tdee, deficit and target for a sedentary male losing weight', () => {
    const rec = recommend(maleProfile, 80, 75);
    expect(rec).not.toBeNull();
    expect(rec!.tdee).toBe(Math.round(1780 * 1.2));
    expect(rec!.direction).toBe('lose');
    expect(rec!.dailyDelta).toBe(-550);
    expect(rec!.targetCalories).toBe(rec!.tdee - 550);
  });

  it('caps the weekly rate at 1 kg/week', () => {
    const rec = recommend({ ...maleProfile, weeklyRateKg: 2 }, 80, 75);
    expect(rec!.dailyDelta).toBe(-1100);
  });

  it('clips to the 1200 kcal safety floor and reports it', () => {
    const rec = recommend(
      { ...maleProfile, heightCm: 150, age: 70, sex: 'female', weeklyRateKg: 1 },
      55,
      50,
    );
    expect(rec!.targetCalories).toBe(1200);
    expect(rec!.flooredAt).toBe(1200);
  });

  it('maintains when there is no target weight', () => {
    const rec = recommend(maleProfile, 80, undefined);
    expect(rec!.direction).toBe('maintain');
    expect(rec!.dailyDelta).toBe(0);
    expect(rec!.targetCalories).toBe(rec!.tdee);
  });

  it('maintains when the target is within 0.75 kg of current weight', () => {
    expect(recommend(maleProfile, 80, 80.5)!.direction).toBe('maintain');
  });

  it('returns null when height, age, sex or current weight is missing', () => {
    expect(recommend({ ...maleProfile, heightCm: undefined }, 80, 75)).toBeNull();
    expect(recommend({ ...maleProfile, age: undefined }, 80, 75)).toBeNull();
    expect(recommend({ ...maleProfile, sex: undefined }, 80, 75)).toBeNull();
    expect(recommend(maleProfile, undefined, 75)).toBeNull();
  });

  it('suggests protein as min(1.8 g/kg, 35% of kcal) and non-negative carbs', () => {
    const rec = recommend(maleProfile, 80, 75)!;
    expect(rec.macros.proteinG).toBe(
      Math.round(Math.min(1.8 * 80, (0.35 * rec.targetCalories) / 4)),
    );
    expect(rec.macros.carbsG).toBeGreaterThanOrEqual(0);
  });
});

describe('calorieTargetInfo', () => {
  const metrics = [{ id: 'm1', date: '2026-07-01', weightKg: 80 }];

  it('uses the manual goal when the recommended target is off', () => {
    const info = calorieTargetInfo({ goals, profile: maleProfile, metrics });
    expect(info.source).toBe('manual');
    expect(info.target).toBe(goals.dailyCalories);
    expect(info.recommendation).not.toBeNull();
  });

  it('uses the recommendation when enabled and computable', () => {
    const profile = { ...maleProfile, useRecommendedTarget: true };
    const info = calorieTargetInfo({ goals, profile, metrics });
    expect(info.source).toBe('recommended');
    expect(info.recommendation).not.toBeNull();
    expect(info.target).toBe(info.recommendation!.targetCalories);
  });

  it('falls back to manual when enabled but the profile is incomplete', () => {
    const profile = { ...maleProfile, useRecommendedTarget: true, heightCm: undefined };
    const info = calorieTargetInfo({ goals, profile, metrics });
    expect(info.source).toBe('manual');
    expect(info.target).toBe(goals.dailyCalories);
    expect(info.recommendation).toBeNull();
  });
});
