import { describe, expect, it } from 'vitest';
import type { FoodEntry, MetricEntry } from '../types';
import { computeAdaptiveTdee } from './adaptive';
import { addDays } from './dates';

const TODAY = '2026-07-03';

/** `n` logged days of `kcal` each (one entry per day), ending `endOffset` days before TODAY. */
const foodDays = (n: number, kcal: number, endOffset = 0): FoodEntry[] =>
  Array.from({ length: n }, (_, i): FoodEntry => ({
    id: `f${endOffset + i}`,
    date: addDays(TODAY, -(endOffset + i)),
    meal: 'lunch',
    name: 'Meal',
    calories: kcal,
  }));

const weighIn = (daysAgo: number, weightKg: number): MetricEntry => ({
  id: `m${daysAgo}`,
  date: addDays(TODAY, -daysAgo),
  weightKg,
});

const fullyLogged = foodDays(14, 2000);
const flatWeights = [weighIn(14, 80), weighIn(0, 80)];

describe('computeAdaptiveTdee', () => {
  it('returns null when the formula TDEE is not positive', () => {
    expect(computeAdaptiveTdee({ foods: fullyLogged, metrics: flatWeights }, TODAY, 0)).toBeNull();
    expect(computeAdaptiveTdee({ foods: fullyLogged, metrics: flatWeights }, TODAY, -100)).toBeNull();
  });

  it('returns null with fewer than 14 fully-logged days', () => {
    expect(
      computeAdaptiveTdee({ foods: foodDays(13, 2000), metrics: flatWeights }, TODAY, 2000),
    ).toBeNull();
  });

  it('does not count days under 1000 kcal toward the minimum', () => {
    // 14 logged days, but one is only 999 kcal -> 13 qualifying days.
    const foods = [...foodDays(13, 2000), ...foodDays(1, 999, 13)];
    expect(computeAdaptiveTdee({ foods, metrics: flatWeights }, TODAY, 2000)).toBeNull();
  });

  it('returns null with fewer than two weigh-ins inside the window', () => {
    expect(
      computeAdaptiveTdee({ foods: fullyLogged, metrics: [weighIn(0, 80)] }, TODAY, 2000),
    ).toBeNull();
    // A second weigh-in before the 28-day window does not count.
    expect(
      computeAdaptiveTdee(
        { foods: fullyLogged, metrics: [weighIn(35, 82), weighIn(0, 80)] },
        TODAY,
        2000,
      ),
    ).toBeNull();
  });

  it('returns null when the weigh-ins span fewer than 14 days', () => {
    expect(
      computeAdaptiveTdee(
        { foods: fullyLogged, metrics: [weighIn(13, 80), weighIn(0, 80)] },
        TODAY,
        2000,
      ),
    ).toBeNull();
  });

  it('observes TDEE equal to the average intake when weight is flat', () => {
    expect(computeAdaptiveTdee({ foods: fullyLogged, metrics: flatWeights }, TODAY, 2000)).toEqual({
      observedTdee: 2000,
      daysUsed: 14,
      deltaKg: 0,
      spanDays: 14,
      avgIntake: 2000,
      clamped: false,
    });
  });

  it('subtracts the weight-change energy from intake over the span', () => {
    // Lost 1 kg over 14 days while eating 2000 kcal/day.
    const res = computeAdaptiveTdee(
      { foods: fullyLogged, metrics: [weighIn(14, 80), weighIn(0, 79)] },
      TODAY,
      2400,
    );
    expect(res).not.toBeNull();
    expect(res!.observedTdee).toBe(Math.round(2000 - (-1 * 7700) / 14)); // 2550
    expect(res!.deltaKg).toBe(-1);
    expect(res!.spanDays).toBe(14);
    expect(res!.avgIntake).toBe(2000);
    expect(res!.clamped).toBe(false);
  });

  it('clamps to 0.6x the formula TDEE from below', () => {
    const res = computeAdaptiveTdee({ foods: fullyLogged, metrics: flatWeights }, TODAY, 5000);
    expect(res!.observedTdee).toBe(3000);
    expect(res!.clamped).toBe(true);
  });

  it('clamps to 1.4x the formula TDEE from above', () => {
    const res = computeAdaptiveTdee(
      { foods: foodDays(14, 3000), metrics: flatWeights },
      TODAY,
      2000,
    );
    expect(res!.observedTdee).toBe(2800);
    expect(res!.clamped).toBe(true);
  });

  it('excludes under-logged days from the intake average', () => {
    // An 800 kcal day inside the window must not drag the average down.
    const foods = [...foodDays(14, 2200), ...foodDays(1, 800, 14)];
    const res = computeAdaptiveTdee({ foods, metrics: flatWeights }, TODAY, 2200);
    expect(res!.daysUsed).toBe(14);
    expect(res!.avgIntake).toBe(2200);
    expect(res!.observedTdee).toBe(2200);
  });
});
