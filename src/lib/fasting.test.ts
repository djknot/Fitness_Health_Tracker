import { describe, expect, it } from 'vitest';
import type { Fast } from '../types';
import { activeFast, completedFasts, fastDurationHours, formatHoursMinutes } from './fasting';

const fast = (id: string, start: string, end?: string): Fast => ({ id, start, end });

const ended = fast('a', '2026-07-01T20:00:00.000Z', '2026-07-02T12:00:00.000Z'); // 16 h
const running = fast('b', '2026-07-03T08:00:00.000Z');

describe('activeFast', () => {
  it('returns the fast that has no end yet', () => {
    expect(activeFast([ended, running])).toBe(running);
  });

  it('returns undefined when every fast has ended', () => {
    expect(activeFast([ended])).toBeUndefined();
  });

  it('returns undefined for an empty list', () => {
    expect(activeFast([])).toBeUndefined();
  });
});

describe('fastDurationHours', () => {
  const now = new Date('2026-07-03T12:30:00.000Z');

  it('measures an ended fast from start to end', () => {
    expect(fastDurationHours(ended, now)).toBe(16);
  });

  it('measures a running fast against the provided now', () => {
    expect(fastDurationHours(running, now)).toBe(4.5);
  });
});

describe('formatHoursMinutes', () => {
  it('splits fractional hours into hours and minutes', () => {
    expect(formatHoursMinutes(16.533)).toBe('16 h 32 m');
  });

  it('rolls 60 minutes over into the next hour', () => {
    expect(formatHoursMinutes(16.9999)).toBe('17 h 0 m');
  });

  it('formats zero', () => {
    expect(formatHoursMinutes(0)).toBe('0 h 0 m');
  });
});

describe('completedFasts', () => {
  it('drops the running fast and sorts newest-first by start', () => {
    const older = fast('c', '2026-06-28T18:00:00.000Z', '2026-06-29T10:00:00.000Z');
    expect(completedFasts([older, running, ended])).toEqual([ended, older]);
  });

  it('returns [] when only a running fast exists', () => {
    expect(completedFasts([running])).toEqual([]);
  });
});
