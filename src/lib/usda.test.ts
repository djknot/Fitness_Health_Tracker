import { describe, expect, it } from 'vitest';
import { mapUsdaFoods, type UsdaSearchResponse } from './usda';

type UsdaFood = NonNullable<UsdaSearchResponse['foods']>[number];

/** A minimal valid food (100 kcal via nutrientId) with overrides. */
const usdaFood = (overrides: Partial<UsdaFood> = {}): UsdaFood => ({
  description: 'Test food',
  foodNutrients: [{ nutrientId: 1008, value: 100 }],
  ...overrides,
});

const map = (...foods: UsdaFood[]) => mapUsdaFoods({ foods });

describe('mapUsdaFoods', () => {
  it('maps kcal and macros via nutrientId, trimming the name and rounding kcal', () => {
    const foods = map(
      usdaFood({
        description: '  Chicken breast ',
        foodNutrients: [
          { nutrientId: 1008, value: 165.4 },
          { nutrientId: 1003, value: 31 },
          { nutrientId: 1005, value: 0.5 },
          { nutrientId: 1004, value: 3.6 },
        ],
      }),
    );
    expect(foods).toEqual([
      {
        name: 'Chicken breast',
        brand: undefined,
        per100g: { kcal: 165, proteinG: 31, carbsG: 0.5, fatG: 3.6 },
        servingG: undefined,
        source: 'usda',
      },
    ]);
  });

  it('maps via nutrientNumber when nutrientId is absent', () => {
    const [food] = map(
      usdaFood({
        foodNutrients: [
          { nutrientNumber: '208', value: 51.6 },
          { nutrientNumber: '203', value: 1.1 },
          { nutrientNumber: '205', value: 11.4 },
          { nutrientNumber: '204', value: 0.2 },
        ],
      }),
    );
    expect(food.per100g).toEqual({ kcal: 52, proteinG: 1.1, carbsG: 11.4, fatG: 0.2 });
  });

  it('defaults missing macros to 0', () => {
    expect(map(usdaFood())[0].per100g).toEqual({ kcal: 100, proteinG: 0, carbsG: 0, fatG: 0 });
  });

  it('skips foods without a usable description or positive kcal', () => {
    expect(
      map(
        usdaFood({ description: undefined }),
        usdaFood({ description: '   ' }),
        usdaFood({ foodNutrients: [{ nutrientId: 1003, value: 10 }] }), // no energy at all
        usdaFood({ foodNutrients: [{ nutrientId: 1008, value: 0 }] }),
        usdaFood({ foodNutrients: [{ nutrientId: 1008, value: -20 }] }),
      ),
    ).toEqual([]);
  });

  it('keeps servingG only for gram-based serving units', () => {
    expect(map(usdaFood({ servingSize: 85, servingSizeUnit: 'g' }))[0].servingG).toBe(85);
    expect(map(usdaFood({ servingSize: 240, servingSizeUnit: 'GRM' }))[0].servingG).toBe(240);
    expect(map(usdaFood({ servingSize: 240, servingSizeUnit: 'ml' }))[0].servingG).toBeUndefined();
    expect(map(usdaFood({ servingSize: 85 }))[0].servingG).toBeUndefined();
  });

  it('prefers brandName over brandOwner and omits brand when both are absent', () => {
    expect(map(usdaFood({ brandName: 'BrandX ', brandOwner: 'OwnerCo' }))[0].brand).toBe('BrandX');
    expect(map(usdaFood({ brandOwner: 'OwnerCo' }))[0].brand).toBe('OwnerCo');
    expect(map(usdaFood())[0].brand).toBeUndefined();
  });

  it('returns [] for an empty body', () => {
    expect(mapUsdaFoods({})).toEqual([]);
    expect(mapUsdaFoods({ foods: [] })).toEqual([]);
  });
});
