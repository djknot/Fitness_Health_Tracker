import type { CustomFood, FoodRecord } from '../types';
import { searchLocalFoods, searchRecords } from './foodDb';
import { round1 } from './units';
import { searchUsda } from './usda';

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
  /** True when every attempted online lookup failed and only local results are shown. */
  remoteError: boolean;
}

export interface FoodSearchOptions {
  signal?: AbortSignal;
  /** When set, USDA FoodData Central is queried alongside Open Food Facts. */
  usdaApiKey?: string;
  /** User-defined foods, ranked above everything else. */
  customFoods?: CustomFood[];
}

const recordKey = (f: FoodRecord) => `${f.name.toLowerCase()}|${(f.brand ?? '').toLowerCase()}`;

/**
 * Combined lookup: custom foods, then the built-in database (both instant),
 * then Open Food Facts and (with an API key) USDA in parallel.
 * A caller-initiated abort re-throws so stale results are never rendered;
 * network failures degrade to local-only with `remoteError: true`.
 */
export async function searchFoods(
  query: string,
  opts: FoodSearchOptions = {},
): Promise<FoodSearchResult> {
  const { signal, usdaApiKey, customFoods = [] } = opts;
  const instant: FoodRecord[] = [
    ...searchRecords(customFoods, query, 4),
    ...searchLocalFoods(query, 6),
  ];

  const attempts: Promise<FoodRecord[]>[] = [searchOpenFoodFacts(query, signal)];
  if (usdaApiKey) attempts.push(searchUsda(query, usdaApiKey, signal));
  const settled = await Promise.allSettled(attempts);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  const remote = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  const remoteError = settled.every((r) => r.status === 'rejected');

  const seen = new Set<string>();
  const merged: FoodRecord[] = [];
  for (const f of [...instant, ...remote]) {
    const k = recordKey(f);
    if (!seen.has(k)) {
      seen.add(k);
      merged.push(f);
    }
  }
  return { results: merged.slice(0, 14), remoteError };
}

/** Look up a single product by barcode via Open Food Facts. Returns null when unknown. */
export async function lookupBarcode(code: string, signal?: AbortSignal): Promise<FoodRecord | null> {
  const timeout = AbortSignal.timeout(6000);
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,nutriments,serving_quantity`,
    { signal: signal ? AbortSignal.any([signal, timeout]) : timeout },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Food database returned ${res.status}`);
  const body = (await res.json()) as { status?: number; product?: OffProduct };
  const p = body.product;
  if (!body.status || !p?.product_name?.trim()) return null;
  const n = p.nutriments ?? {};
  const kj = num(n['energy_100g']);
  const kcal = num(n['energy-kcal_100g']) ?? (kj != null ? kj / 4.184 : undefined);
  if (kcal == null || kcal <= 0) return null;
  return {
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
  };
}
