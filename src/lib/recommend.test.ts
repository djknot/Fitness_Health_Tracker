import { describe, expect, it } from 'vitest';
import type { FoodEntry, Goals, MetricEntry, Prefs, Profile, Workout } from '../types';
import { addDays } from './dates';
import {
  calorieTargetInfo,
  dailyTargetInfo,
  macroTargets,
  mifflinStJeorBmr,
  recommend,
  targetsFromTdee,
  type Recommendation,
} from './recommend';

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

describe('targetsFromTdee', () => {
  it('maintains when there is no target weight', () => {
    const t = targetsFromTdee(2500, 80, undefined, 0.5);
    expect(t.direction).toBe('maintain');
    expect(t.dailyDelta).toBe(0);
    expect(t.targetCalories).toBe(2500);
  });

  it('maintains when the target is within 0.75 kg of the current weight', () => {
    const t = targetsFromTdee(2500, 80, 80.5, 0.5);
    expect(t.direction).toBe('maintain');
    expect(t.dailyDelta).toBe(0);
    expect(t.targetCalories).toBe(2500);
  });

  it('applies a deficit when losing and a surplus when gaining', () => {
    const lose = targetsFromTdee(2500, 80, 75, 0.5);
    expect(lose.direction).toBe('lose');
    expect(lose.dailyDelta).toBe(-550);
    expect(lose.targetCalories).toBe(1950);

    const gain = targetsFromTdee(2500, 60, 65, 0.5);
    expect(gain.direction).toBe('gain');
    expect(gain.dailyDelta).toBe(550);
    expect(gain.targetCalories).toBe(3050);
  });

  it('caps the weekly rate at 1 kg/week', () => {
    expect(targetsFromTdee(2500, 80, 75, 3).dailyDelta).toBe(-1100);
  });

  it('floors the target at 1200 kcal and reports it', () => {
    const t = targetsFromTdee(1500, 55, 50, 1); // 1500 − 1100 = 400 → floored
    expect(t.targetCalories).toBe(1200);
    expect(t.flooredAt).toBe(1200);
    expect(targetsFromTdee(2500, 80, 75, 0.5).flooredAt).toBeUndefined();
  });

  it('computes protein as min(1.8 g/kg, 35% of kcal) and keeps carbs non-negative', () => {
    // 1.8 g/kg wins: 144 g vs 218.75 g from calories.
    expect(targetsFromTdee(2500, 80, undefined, 0.5).macros.proteinG).toBe(144);

    // 35% of calories wins for a heavy person on few calories.
    const capped = targetsFromTdee(1400, 100, undefined, 0.5);
    expect(capped.macros.proteinG).toBe(
      Math.round(Math.min(1.8 * 100, (0.35 * capped.targetCalories) / 4)),
    );

    const floored = targetsFromTdee(1500, 55, 50, 1);
    expect(floored.macros.proteinG).toBe(99); // min(1.8 × 55, 0.35 × 1200 / 4)
    expect(floored.macros.carbsG).toBeGreaterThanOrEqual(0);
  });
});

describe('dailyTargetInfo', () => {
  const TODAY = '2026-07-03';
  const basePrefs: Prefs = { theme: 'system', earnBackExercise: false, adaptiveTdee: false };
  const weighIns: MetricEntry[] = [{ id: 'm1', date: '2026-07-01', weightKg: 80 }];
  const walkWorkout: Workout = {
    id: 'w1',
    date: TODAY,
    name: 'Evening walk',
    exercises: [{ id: 'e1', name: 'Walk', kind: 'cardio', sets: [], durationMin: 40 }],
  };

  const base = {
    goals,
    profile: maleProfile,
    prefs: basePrefs,
    metrics: weighIns,
    foods: [] as FoodEntry[],
    workouts: [] as Workout[],
  };

  // 14 fully-logged days at 2000 kcal + weigh-ins spanning 14 days (flat at 80 kg)
  // pass every adaptive gate, exactly like the fixtures in adaptive.test.ts.
  const adaptiveFoods: FoodEntry[] = Array.from({ length: 14 }, (_, i): FoodEntry => ({
    id: `f${i}`,
    date: addDays(TODAY, -i),
    meal: 'lunch',
    name: 'Meal',
    calories: 2000,
  }));
  const adaptiveMetrics: MetricEntry[] = [
    { id: 'm-old', date: addDays(TODAY, -14), weightKg: 80 },
    { id: 'm-new', date: TODAY, weightKg: 80 },
  ];

  it('tracks the manual goal when the recommended target is off', () => {
    const info = dailyTargetInfo(base, TODAY, TODAY);
    expect(info.source).toBe('manual');
    expect(info.baseTarget).toBe(goals.dailyCalories);
    expect(info.burnKcal).toBe(0);
    expect(info.target).toBe(goals.dailyCalories);
    expect(info.recommendation).not.toBeNull();
    expect(info.adaptive).toBeNull();
  });

  it('tracks the formula recommendation when enabled and computable', () => {
    const profile = { ...maleProfile, useRecommendedTarget: true };
    const info = dailyTargetInfo({ ...base, profile }, TODAY, TODAY);
    expect(info.source).toBe('recommended');
    expect(info.recommendation).not.toBeNull();
    expect(info.baseTarget).toBe(info.recommendation!.targetCalories); // 2136 − 550 = 1586
    expect(info.baseTarget).toBe(1586);
  });

  it('stays on the formula recommendation when adaptive is on but not yet computable', () => {
    const profile = { ...maleProfile, useRecommendedTarget: true };
    const prefs = { ...basePrefs, adaptiveTdee: true };
    const info = dailyTargetInfo({ ...base, profile, prefs }, TODAY, TODAY); // no logged food
    expect(info.source).toBe('recommended');
    expect(info.adaptive).toBeNull();
  });

  it('recomputes the base target from the observed TDEE when adaptive data qualifies', () => {
    const profile = { ...maleProfile, useRecommendedTarget: true };
    const prefs = { ...basePrefs, adaptiveTdee: true };
    const info = dailyTargetInfo(
      { ...base, profile, prefs, metrics: adaptiveMetrics, foods: adaptiveFoods },
      TODAY,
      TODAY,
    );
    expect(info.source).toBe('recommended-adaptive');
    expect(info.adaptive).not.toBeNull();
    expect(info.adaptive!.observedTdee).toBe(2000); // flat weight → avg intake
    expect(info.baseTarget).toBe(
      targetsFromTdee(info.adaptive!.observedTdee, 80, goals.targetWeightKg, profile.weeklyRateKg)
        .targetCalories,
    );
    expect(info.baseTarget).toBe(1450); // 2000 − 550 deficit
  });

  it('adds no burn when earn-back is off', () => {
    const info = dailyTargetInfo({ ...base, workouts: [walkWorkout] }, TODAY, TODAY);
    expect(info.burnKcal).toBe(0);
    expect(info.target).toBe(info.baseTarget);
  });

  it("adds the date's rounded workout burn at the latest weigh-in weight when earn-back is on", () => {
    const prefs = { ...basePrefs, earnBackExercise: true };
    const info = dailyTargetInfo({ ...base, prefs, workouts: [walkWorkout] }, TODAY, TODAY);
    expect(info.burnKcal).toBe(187); // walk MET 3.5 × 80 kg × 40/60 h = 186.67
    expect(info.target).toBe(info.baseTarget + 187);
  });

  it('falls back to manual with a 70 kg burn estimate when there are no weigh-ins', () => {
    const profile = { ...maleProfile, useRecommendedTarget: true };
    const prefs = { ...basePrefs, earnBackExercise: true };
    const info = dailyTargetInfo(
      { ...base, profile, prefs, metrics: [], workouts: [walkWorkout] },
      TODAY,
      TODAY,
    );
    expect(info.recommendation).toBeNull();
    expect(info.source).toBe('manual');
    expect(info.baseTarget).toBe(goals.dailyCalories);
    expect(info.burnKcal).toBe(163); // 3.5 × 70 kg × 40/60 h = 163.33
    expect(info.target).toBe(goals.dailyCalories + 163);
  });
});

describe('macroTargets', () => {
  const rec = { macros: { proteinG: 120, carbsG: 200, fatG: 60 } } as Recommendation;

  it('uses manual goal values when they are set', () => {
    expect(macroTargets({ proteinTargetG: 180, carbsTargetG: 150, fatTargetG: 50 }, rec)).toEqual({
      proteinG: 180,
      carbsG: 150,
      fatG: 50,
    });
  });

  it('falls back to the recommended split for unset macros', () => {
    expect(macroTargets({ proteinTargetG: 180 }, rec)).toEqual({
      proteinG: 180,
      carbsG: 200,
      fatG: 60,
    });
  });

  it('is all-undefined with no manual targets and no recommendation', () => {
    expect(macroTargets({}, null)).toEqual({
      proteinG: undefined,
      carbsG: undefined,
      fatG: undefined,
    });
  });
})
