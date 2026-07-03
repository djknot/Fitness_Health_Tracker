import { searchLocalFoods, type FoodRecord } from './foodDb';
import { round1 } from './units';

export interface FoodNutrition {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/** Scale a food's per-100g values to the given quantity in grams. */
export function computeNutrition(food: FoodRecord, grams: number): FoodNutrition {
  const k = grams / 100;
  return {
    calories: Math.round(food.per100g.kcal * k),
    proteinG: round1(food.per100g.proteinG * k),
    carbsG: round1(food.per100g.carbsG * k),
    fatG: round1(food.per100g.fatG * k),
  };
}

interface OffProduct {
  product_name?: string;
  brands?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string | undefined>;
}

function num(v: number | string | undefined): number | undefined {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
}

const OFF_ENDPOINT = 'https://world.openfoodfacts.org/cgi/search.pl';

/** Query the Open Food Facts public database (branded products; no API key). */
export async function searchOpenFoodFacts(query: string, signal?: AbortSignal): Promise<FoodRecord[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '8',
    fields: 'product_name,brands,nutriments,serving_quantity',
  });
  const timeout = AbortSignal.timeout(6000);
  const res = await fetch(`${OFF_ENDPOINT}?${params.toString()}`, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!res.ok) throw new Error(`Food database returned ${res.status}`);
  const body = (await res.json()) as { products?: OffProduct[] };

  const out: FoodRecord[] = [];
  for (const p of body.products ?? []) {
    const n = p.nutriments ?? {};
    const kj = num(n['energy_100g']);
    const kcal = num(n['energy-kcal_100g']) ?? (kj != null ? kj / 4.184 : undefined);
    if (!p.product_name?.trim() || kcal == null || kcal <= 0) continue;
    out.push({
      name: p.product_name.trim(),
      brand: p.brands?.split(',')[0]?.trim() || undefined,
      per100g: {
        kcal: Math.round(kcal),
        proteinG: num(n['proteins_100g']) ?? 0,
        carbsG: num(n['carbohydrates_100g']) ?? 0,
        fatG: num(n['fat_100g']) ?? 0,
      },
      servingG: num(p.serving_quantity),
      source: 'off',
    });
  }
  return out;
}

export interface FoodSearchResult {
  results: FoodRecord[];
  /** True when the online lookup failed (offline etc.) and only local results are shown. */
  remoteError: boolean;
}

const recordKey = (f: FoodRecord) => `${f.name.toLowerCase()}|${(f.brand ?? '').toLowerCase()}`;

/**
 * Combined lookup: instant local matches first, then Open Food Facts results.
 * A caller-initiated abort re-throws so stale results are never rendered;
 * network failures degrade to local-only with `remoteError: true`.
 */
export async function searchFoods(query: string, signal?: AbortSignal): Promise<FoodSearchResult> {
  const local = searchLocalFoods(query, 6);
  let remote: FoodRecord[] = [];
  let remoteError = false;
  try {
    remote = await searchOpenFoodFacts(query, signal);
  } catch (err) {
    if (signal?.aborted) throw err;
    remoteError = true;
  }
  const seen = new Set(local.map(recordKey));
  const merged = [...local];
  for (const f of remote) {
    const k = recordKey(f);
    if (!seen.has(k)) {
      seen.add(k);
      merged.push(f);
    }
  }
  return { results: merged.slice(0, 12), remoteError };
}
