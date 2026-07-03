import { describe, expect, it } from 'vitest';
import type { QuickFood } from '../types';
import { pushRecent, quickFoodKey } from './quickfoods';

const qf = (id: string, name: string, calories: number, extra: Partial<QuickFood> = {}): QuickFood => ({
  id,
  name,
  calories,
  ...extra,
});

describe('quickFoodKey', () => {
  it('trims and lowercases the name and pairs it with the calories', () => {
    expect(quickFoodKey({ name: '  Greek Yogurt ', calories: 150 })).toBe('greek yogurt|150');
  });

  it('treats the same name with different calories as different foods', () => {
    expect(quickFoodKey({ name: 'Greek Yogurt', calories: 150 })).not.toBe(
      quickFoodKey({ name: 'Greek Yogurt', calories: 120 }),
    );
  });
});

describe('pushRecent', () => {
  it('puts the new item first without mutating the input', () => {
    const list = [qf('a', 'Oats', 300), qf('b', 'Eggs', 150)];
    const next = pushRecent(list, qf('c', 'Apple', 80));
    expect(next.map((f) => f.id)).toEqual(['c', 'a', 'b']);
    expect(list.map((f) => f.id)).toEqual(['a', 'b']);
  });

  it('re-logging moves the food to the front and replaces its snapshot', () => {
    const list = [qf('a', 'Oats', 300, { proteinG: 10 }), qf('b', 'Eggs', 150)];
    const relog = qf('c', '  OATS ', 300, { proteinG: 12 });
    const next = pushRecent(list, relog);
    expect(next).toHaveLength(2);
    expect(next[0]).toBe(relog); // new snapshot wins
    expect(next.map((f) => f.id)).toEqual(['c', 'b']);
  });

  it('caps at 20 by default, dropping the oldest', () => {
    const list = Array.from({ length: 20 }, (_, i) => qf(`q${i}`, `Food ${i}`, 100 + i));
    const next = pushRecent(list, qf('new', 'Newest', 999));
    expect(next).toHaveLength(20);
    expect(next[0].id).toBe('new');
    expect(next[19].id).toBe('q18');
    expect(next.some((f) => f.id === 'q19')).toBe(false);
  });

  it('honors a custom cap', () => {
    const list = [qf('a', 'A', 1), qf('b', 'B', 2), qf('c', 'C', 3)];
    expect(pushRecent(list, qf('d', 'D', 4), 3).map((f) => f.id)).toEqual(['d', 'a', 'b']);
  });
});
