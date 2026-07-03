import { describe, expect, it } from 'vitest';
import type { Fast, FoodEntry, MetricEntry, Workout } from '../types';
import {
  avgCaloriesPerWeek,
  avgSleepPerWeek,
  calorieAdherence,
  calorieSummary,
  dailyLogCounts,
  fastSummary,
  heatmapWeeks,
  inRange,
  monthLabels,
  moodSummary,
  rangeEndingAt,
  sleepSummary,
  weekStarts,
  weightChangeInRange,
  workoutsPerWeek,
  workoutSummary,
} from './reports';

const food = (id: string, date: string, calories: number): FoodEntry => ({
  id,
  date,
  meal: 'lunch',
  name: 'Food',
  calories,
});

const workoutOn = (id: string, date: string, exercises: Workout['exercises'] = []): Workout => ({
  id,
  date,
  name: 'Workout',
  exercises,
});

// 2026-07-03 is a Friday; 28 days back starts Saturday 2026-06-06.
const R28 = rangeEndingAt('2026-07-03', 28);

describe('rangeEndingAt / inRange', () => {
  it('builds an inclusive range counting back from the end date', () => {
    expect(R28).toEqual({ start: '2026-06-06', end: '2026-07-03', days: 28 });
    expect(rangeEndingAt('2026-07-03', 1)).toEqual({ start: '2026-07-03', end: '2026-07-03', days: 1 });
  });

  it('includes both edges and excludes dates outside', () => {
    expect(inRange('2026-06-05', R28)).toBe(false);
    expect(inRange('2026-06-06', R28)).toBe(true);
    expect(inRange('2026-07-03', R28)).toBe(true);
    expect(inRange('2026-07-04', R28)).toBe(false);
  });
});

describe('weekStarts', () => {
  it('lists Mondays of every week overlapping the range, ascending', () => {
    expect(weekStarts(R28)).toEqual([
      '2026-06-01',
      '2026-06-08',
      '2026-06-15',
      '2026-06-22',
      '2026-06-29',
    ]);
  });
});

describe('workoutsPerWeek', () => {
  it('zero-fills empty weeks and ignores out-of-range workouts', () => {
    const workouts = [
      workoutOn('out-before', '2026-06-05'),
      workoutOn('w1', '2026-06-06'), // Sat of week 2026-06-01
      workoutOn('w2', '2026-06-08'),
      workoutOn('w3', '2026-06-10'),
      workoutOn('w4', '2026-07-03'),
      workoutOn('out-after', '2026-07-04'),
    ];
    expect(workoutsPerWeek(workouts, R28)).toEqual([
      { weekStart: '2026-06-01', value: 1 },
      { weekStart: '2026-06-08', value: 2 },
      { weekStart: '2026-06-15', value: 0 },
      { weekStart: '2026-06-22', value: 0 },
      { weekStart: '2026-06-29', value: 1 },
    ]);
  });
});

describe('avgCaloriesPerWeek', () => {
  it('averages over logged days only and marks empty weeks null', () => {
    const foods = [
      food('out', '2026-06-05', 999),
      food('f1', '2026-06-08', 2000),
      food('f2', '2026-06-09', 800),
      food('f3', '2026-06-09', 400), // same-day entries sum: 1200
      food('f4', '2026-07-03', 1500),
    ];
    expect(avgCaloriesPerWeek(foods, R28)).toEqual([
      { weekStart: '2026-06-01', value: null },
      { weekStart: '2026-06-08', value: 1600 }, // (2000 + 1200) / 2 logged days
      { weekStart: '2026-06-15', value: null },
      { weekStart: '2026-06-22', value: null },
      { weekStart: '2026-06-29', value: 1500 },
    ]);
  });
});

describe('avgSleepPerWeek', () => {
  it('dedupes same-date entries (later wins) and averages logged nights', () => {
    const metrics: MetricEntry[] = [
      { id: 'm0', date: '2026-06-08', sleepHours: 6 },
      { id: 'm1', date: '2026-06-08', sleepHours: 8 }, // later insertion wins
      { id: 'm2', date: '2026-06-09', sleepHours: 7 },
    ];
    const rows = avgSleepPerWeek(metrics, R28);
    expect(rows[1]).toEqual({ weekStart: '2026-06-08', value: 7.5 });
    expect(rows[2]).toEqual({ weekStart: '2026-06-15', value: null });
  });
});

describe('workoutSummary', () => {
  it('counts, averages per week, and sums volume inside the range only', () => {
    const bench = {
      id: 'e1',
      name: 'Bench',
      kind: 'strength' as const,
      sets: [
        { reps: 5, weightKg: 100 },
        { reps: 5, weightKg: 100 },
      ],
    };
    const pushups = {
      id: 'e2',
      name: 'Push-ups',
      kind: 'strength' as const,
      sets: [{ reps: 10, weightKg: null }],
    };
    const workouts = [
      workoutOn('out', '2026-06-01', [bench]),
      workoutOn('w1', '2026-06-10', [bench]),
      workoutOn('w2', '2026-06-12', [pushups]),
    ];
    expect(workoutSummary(workouts, R28)).toEqual({ count: 2, perWeek: 0.5, totalVolumeKg: 1000 });
  });
});

describe('calorieSummary', () => {
  it('averages over logged days only', () => {
    const foods = [food('f1', '2026-06-08', 2000), food('f2', '2026-06-09', 800), food('f3', '2026-06-09', 400)];
    expect(calorieSummary(foods, R28)).toEqual({ loggedDays: 2, avgCalories: 1600 });
  });

  it('returns null with nothing logged in range', () => {
    expect(calorieSummary([food('out', '2026-06-05', 500)], R28)).toEqual({
      loggedDays: 0,
      avgCalories: null,
    });
  });
});

describe('weightChangeInRange', () => {
  const metrics: MetricEntry[] = [
    { id: 'out', date: '2026-06-01', weightKg: 90 }, // before range
    { id: 'a', date: '2026-06-10', weightKg: 80 },
    { id: 'b', date: '2026-07-01', weightKg: 78.5 },
    { id: 'c', date: '2026-07-01', weightKg: 78 }, // same-date later insertion wins
  ];

  it('measures first → last weigh-in inside the range', () => {
    expect(weightChangeInRange(metrics, R28)).toEqual({ firstKg: 80, lastKg: 78, changeKg: -2 });
  });

  it('needs at least two weigh-in dates in range', () => {
    expect(weightChangeInRange([{ id: 'a', date: '2026-06-10', weightKg: 80 }], R28)).toBeNull();
    expect(weightChangeInRange([], R28)).toBeNull();
  });
});

describe('sleepSummary / moodSummary', () => {
  it('averages logged days to one decimal', () => {
    const metrics: MetricEntry[] = [
      { id: 'm1', date: '2026-06-10', sleepHours: 7.25 },
      { id: 'm2', date: '2026-06-11', sleepHours: 8 },
    ];
    expect(sleepSummary(metrics, R28)).toEqual({ loggedDays: 2, avgHours: 7.6 });
  });

  it('ignores entries outside the range and without the field', () => {
    const metrics: MetricEntry[] = [
      { id: 'm1', date: '2026-06-05', mood: 1 }, // out of range
      { id: 'm2', date: '2026-06-10', mood: 3 },
      { id: 'm3', date: '2026-06-11', mood: 4 },
      { id: 'm4', date: '2026-06-12', weightKg: 80 }, // no mood
    ];
    expect(moodSummary(metrics, R28)).toEqual({ loggedDays: 2, avgMood: 3.5 });
  });

  it('returns nulls with no logged days', () => {
    expect(sleepSummary([], R28)).toEqual({ loggedDays: 0, avgHours: null });
    expect(moodSummary([], R28)).toEqual({ loggedDays: 0, avgMood: null });
  });
});

describe('fastSummary', () => {
  // Timezone-less ISO datetimes parse as local time, keeping this TZ-independent.
  const fasts: Fast[] = [
    { id: 'a', start: '2026-06-19T20:00:00', end: '2026-06-20T12:00:00' }, // 16 h
    { id: 'b', start: '2026-07-01T18:00:00', end: '2026-07-02T14:00:00' }, // 20 h
    { id: 'out', start: '2026-05-30T20:00:00', end: '2026-05-31T12:00:00' }, // ends before range
    { id: 'running', start: '2026-07-03T08:00:00' }, // no end
  ];

  it('counts fasts completed in range and averages their durations', () => {
    const s = fastSummary(fasts, R28);
    expect(s.completed).toBe(2);
    expect(s.avgHours).toBeCloseTo(18, 5);
  });

  it('returns null average with no completed fasts', () => {
    expect(fastSummary([{ id: 'running', start: '2026-07-03T08:00:00' }], R28)).toEqual({
      completed: 0,
      avgHours: null,
    });
  });
});

describe('calorieAdherence', () => {
  it('buckets logged days against ±10% of the target, boundaries inclusive', () => {
    const foods = [
      food('d1', '2026-06-08', 1500), // under
      food('d2', '2026-06-09', 1800), // exactly −10% → within
      food('d3', '2026-06-10', 2200), // exactly +10% → within
      food('d4', '2026-06-11', 2300), // over
      food('d5a', '2026-06-12', 1200), // sums with d5b to 2000 → within
      food('d5b', '2026-06-12', 800),
    ];
    expect(calorieAdherence(foods, R28, 2000)).toEqual({
      under: 1,
      within: 3,
      over: 1,
      loggedDays: 5,
      withinPct: 60,
    });
  });

  it('handles an empty range', () => {
    expect(calorieAdherence([], R28, 2000)).toEqual({
      under: 0,
      within: 0,
      over: 0,
      loggedDays: 0,
      withinPct: null,
    });
  });
});

describe('dailyLogCounts', () => {
  it('counts workouts, foods, metrics, and water>0 per in-range date', () => {
    const counts = dailyLogCounts(
      {
        workouts: [workoutOn('w1', '2026-07-01')],
        foods: [food('f1', '2026-07-01', 500), food('f2', '2026-07-01', 300), food('out', '2026-06-01', 400)],
        metrics: [{ id: 'm1', date: '2026-07-01', weightKg: 78 }],
        waterByDate: { '2026-07-01': 500, '2026-06-20': 250, '2026-06-30': 0 },
      },
      R28,
    );
    expect(counts.get('2026-07-01')).toBe(5); // workout + 2 foods + metric + water
    expect(counts.get('2026-06-20')).toBe(1); // water only
    expect(counts.has('2026-06-30')).toBe(false); // zero water is not a log
    expect(counts.has('2026-06-01')).toBe(false); // out of range
    expect(counts.size).toBe(2); // active days
  });
});

describe('heatmapWeeks', () => {
  it('pads full Mon–Sun weeks and flags out-of-range days', () => {
    const r = rangeEndingAt('2026-07-03', 7); // Sat 2026-06-27 … Fri 2026-07-03
    const counts = new Map([
      ['2026-06-27', 2],
      ['2026-07-01', 1],
    ]);
    const weeks = heatmapWeeks(counts, r);
    expect(weeks.map((w) => w.weekStart)).toEqual(['2026-06-22', '2026-06-29']);
    expect(weeks.every((w) => w.days.length === 7)).toBe(true);
    expect(weeks[0].days[0]).toEqual({ date: '2026-06-22', count: 0, inRange: false });
    expect(weeks[0].days[5]).toEqual({ date: '2026-06-27', count: 2, inRange: true });
    expect(weeks[1].days[2]).toEqual({ date: '2026-07-01', count: 1, inRange: true });
    expect(weeks[1].days[4]).toEqual({ date: '2026-07-03', count: 0, inRange: true });
    expect(weeks[1].days[5]).toEqual({ date: '2026-07-04', count: 0, inRange: false }); // future
  });
});

describe('monthLabels', () => {
  it('labels the first column and every month change', () => {
    expect(monthLabels(['2026-06-01', '2026-06-08'])).toEqual(['Jun', null]);
    expect(monthLabels(['2026-06-22', '2026-06-29', '2026-07-06'])).toEqual(['Jun', null, 'Jul']);
  });

  it('drops the first label when the second column already starts a month', () => {
    expect(monthLabels(['2026-06-29', '2026-07-06', '2026-07-13'])).toEqual([null, 'Jul', null]);
  });
});
