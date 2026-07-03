import { describe, expect, it } from 'vitest';
import { LOCAL_FOODS, searchLocalFoods, type FoodRecord } from './foodDb';
import { computeNutrition } from './foodSearch';

describe('searchLocalFoods', () => {
  it('finds foods by substring', () => {
    const names = searchLocalFoods('chicken').map((f) => f.name);
    expect(names).toContain('Chicken breast (cooked)');
  });

  it('matches every token independently', () => {
    const names = searchLocalFoods('greek yogurt').map((f) => f.name);
    expect(names).toContain('Greek yogurt (nonfat)');
  });

  it('is case-insensitive', () => {
    const names = searchLocalFoods('GREEK Yogurt').map((f) => f.name);
    expect(names).toContain('Greek yogurt (nonfat)');
  });

  it('respects the limit', () => {
    expect(searchLocalFoods('a', 3)).toHaveLength(3);
  });

  it('returns nothing for empty or whitespace-only queries', () => {
    expect(searchLocalFoods('')).toEqual([]);
    expect(searchLocalFoods('   ')).toEqual([]);
  });
});

describe('computeNutrition', () => {
  const apple = LOCAL_FOODS.find((f) => f.name === 'Apple');

  it('scales per-100g values linearly', () => {
    expect(apple).toBeDefined();
    expect(computeNutrition(apple!, 200)).toEqual({
      calories: 104,
      proteinG: 0.6,
      carbsG: 28,
      fatG: 0.4,
    });
  });

  it('rounds calories to an integer and macros to 1 decimal', () => {
    const record: FoodRecord = {
      name: 'Test food',
      per100g: { kcal: 250, proteinG: 12.34, carbsG: 6.78, fatG: 1.11 },
      source: 'local',
    };
    expect(computeNutrition(record, 50)).toEqual({
      calories: 125,
      proteinG: 6.2,
      carbsG: 3.4,
      fatG: 0.6,
    });
  });
});
