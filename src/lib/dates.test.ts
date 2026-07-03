import { describe, expect, it } from 'vitest';
import {
  addDays,
  formatMedium,
  lastNDays,
  parseISODate,
  relativeDayLabel,
  startOfWeek,
  toISODate,
  weekdayShort,
} from './dates';

describe('toISODate / parseISODate', () => {
  it('round-trips an ISO string through parse and format', () => {
    expect(toISODate(parseISODate('2026-07-03'))).toBe('2026-07-03');
    expect(toISODate(parseISODate('2024-01-05'))).toBe('2024-01-05');
  });

  it('formats a local Date with zero-padding', () => {
    expect(toISODate(new Date(2026, 0, 9))).toBe('2026-01-09');
  });

  it('parses to local midnight', () => {
    const d = parseISODate('2026-07-03');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(3);
    expect(d.getHours()).toBe(0);
  });
});

describe('addDays', () => {
  it('crosses month boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('crosses year boundaries', () => {
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
});

describe('lastNDays', () => {
  it('returns the last N dates ascending, inclusive of end', () => {
    expect(lastNDays(3, '2026-07-03')).toEqual(['2026-07-01', '2026-07-02', '2026-07-03']);
  });
});

describe('startOfWeek', () => {
  // 2026-07-01 is a Wednesday; the Monday of that week is 2026-06-29.
  it('returns the Monday for a Wednesday', () => {
    expect(startOfWeek('2026-07-01')).toBe('2026-06-29');
  });

  it('returns the same week Monday for a Sunday', () => {
    expect(startOfWeek('2026-07-05')).toBe('2026-06-29');
  });

  it('returns the date itself for a Monday', () => {
    expect(startOfWeek('2026-06-29')).toBe('2026-06-29');
  });
});

describe('relativeDayLabel', () => {
  const today = '2026-07-03';

  it('labels today and yesterday', () => {
    expect(relativeDayLabel('2026-07-03', today)).toBe('Today');
    expect(relativeDayLabel('2026-07-02', today)).toBe('Yesterday');
  });

  it('uses a medium date for older days in the same year', () => {
    expect(relativeDayLabel('2026-06-28', today)).toBe('Jun 28');
  });

  it('appends the year for other years', () => {
    expect(relativeDayLabel('2025-06-28', today)).toBe('Jun 28, 2025');
  });
});

describe('formatting helpers', () => {
  it('weekdayShort names the day', () => {
    expect(weekdayShort('2026-06-29')).toBe('Mon');
    expect(weekdayShort('2026-07-05')).toBe('Sun');
  });

  it('formatMedium renders "Mon D"', () => {
    expect(formatMedium('2026-06-28')).toBe('Jun 28');
    expect(formatMedium('2026-12-01')).toBe('Dec 1');
  });
});
