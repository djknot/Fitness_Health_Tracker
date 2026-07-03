import type { FoodRecord } from '../types';

const ENDPOINT = 'https://api.nal.usda.gov/fdc/v1/foods/search';

interface UsdaNutrient {
  nutrientId?: number;
  nutrientNumber?: string;
  value?: number;
  unitName?: string;
}

interface UsdaFood {
  description?: string;
  brandOwner?: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: UsdaNutrient[];
}

export interface UsdaSearchResponse {
  foods?: UsdaFood[];
}

function nutrient(food: UsdaFood, id: number, number: string): number | undefined {
  const n = food.foodNutrients?.find(
    (x) => x.nutrientId === id || x.nutrientNumber === number,
  );
  return typeof n?.value === 'number' && Number.isFinite(n.value) ? n.value : undefined;
}

/** Pure mapper from a FoodData Central search response to FoodRecords (per 100 g). */
export function mapUsdaFoods(body: UsdaSearchResponse): FoodRecord[] {
  const out: FoodRecord[] = [];
  for (const f of body.foods ?? []) {
    const kcal = nutrient(f, 1008, '208');
    if (!f.description?.trim() || kcal == null || kcal <= 0) continue;
    const servingG =
      typeof f.servingSize === 'number' && f.servingSizeUnit?.toLowerCase().startsWith('g')
        ? f.servingSize
        : undefined;
    out.push({
      name: f.description.trim(),
      brand: (f.brandName || f.brandOwner || undefined)?.trim() || undefined,
      per100g: {
        kcal: Math.round(kcal),
        proteinG: nutrient(f, 1003, '203') ?? 0,
        carbsG: nutrient(f, 1005, '205') ?? 0,
        fatG: nutrient(f, 1004, '204') ?? 0,
      },
      servingG,
      source: 'usda',
    });
  }
  return out;
}

/** Search the USDA FoodData Central database (values are per 100 g). */
export async function searchUsda(
  query: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<FoodRecord[]> {
  const params = new URLSearchParams({
    query,
    pageSize: '8',
    api_key: apiKey,
    dataType: 'Foundation,SR Legacy,Branded',
  });
  const timeout = AbortSignal.timeout(6000);
  const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!res.ok) throw new Error(`USDA returned ${res.status}`);
  return mapUsdaFoods((await res.json()) as UsdaSearchResponse);
}
