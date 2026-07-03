import type { QuickFood } from '../types';

/** Dedup key: same name (case-insensitive) + same calories = same quick food. */
export const quickFoodKey = (f: Pick<QuickFood, 'name' | 'calories'>): string =>
  `${f.name.trim().toLowerCase()}|${f.calories}`;

/** LRU-push onto the recents list: newest first, deduped, capped. */
export function pushRecent(list: QuickFood[], item: QuickFood, cap = 20): QuickFood[] {
  const key = quickFoodKey(item);
  return [item, ...list.filter((f) => quickFoodKey(f) !== key)].slice(0, cap);
}
