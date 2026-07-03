import { describe, expect, it } from 'vitest';
import type { FoodEntry, MetricEntry, Workout } from '../types';
import {
  caloriesSeries,
  latestWeight,
  loggedDates,
  logStreak,
  nutritionOn,
  sleepSeries,
  weightSeries,
  workoutCardioMin,
  workoutSetCount,
  workoutsInWeekOf,
  workoutVolumeKg,
} from './stats';

const food = (id: string, date: string, calories: number, macros?: Partial<FoodEntry>): FoodEntry => ({
  id,
  date,
  meal: 'lunch',
  name: 'Food',
  calories,
  ...macros,
});

const workoutOn = (id: string, date: string): Workout => ({
  id,
  date,
  name: 'Workout',
  exercises: [],
});

const foods: FoodEntry[] = [
  food('f1', '2026-07-03', 300, { proteinG: 10, carbsG: 50, fatG: 5 }),
  food('f2', '2026-07-03', 400), // no macros logged
  food('f3', '2026-07-02', 800, { proteinG: 30 }),
];

describe('nutritionOn', () => {
  it('sums only the matching date and treats missing macros as 0', () => {
    expect(nutritionOn(foods, '2026-07-03')).toEqual({
      calories: 700,
      proteinG: 10,
      carbsG: 50,
      fatG: 5,
    });
  });

  it('returns zeros for a date with no entries', () => {
    expect(nutritionOn(foods, '2026-06-30')).toEqual({ calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  });
});

describe('caloriesSeries', () => {
  it('zero-fills missing days and stays date-ascending', () => {
    expect(caloriesSeries(foods, '2026-07-03', 3)).toEqual([
      { date: '2026-07-01', calories: 0 },
      { date: '2026-07-02', calories: 800 },
      { date: '2026-07-03', calories: 700 },
    ]);
  });
});

describe('workoutsInWeekOf', () => {
  // Week of Wed 2026-07-01 runs Mon 2026-06-29 through Sun 2026-07-05.
  const workouts = [
    workoutOn('w-prev-sun', '2026-06-28'),
    workoutOn('w-mon', '2026-06-29'),
    workoutOn('w-sun', '2026-07-05'),
    workoutOn('w-next-mon', '2026-07-06'),
  ];

  it('includes Monday and Sunday of the same week only', () => {
    const ids = workoutsInWeekOf(workouts, '2026-07-01').map((w) => w.id);
    expect(ids).toEqual(['w-mon', 'w-sun']);
  });
});

describe('loggedDates', () => {
  it('unions all four sources and ignores zero water days', () => {
    const set = loggedDates({
      workouts: [workoutOn('w1', '2026-07-01')],
      foods: [food('f1', '2026-07-02', 500)],
      metrics: [{ id: 'm1', date: '2026-06-30', weightKg: 80 }],
      waterByDate: { '2026-06-29': 500, '2026-06-28': 0 },
    });
    expect([...set].sort()).toEqual(['2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02']);
    expect(set.has('2026-06-28')).toBe(false);
  });
});

describe('logStreak', () => {
  it('is 0 for no logged days', () => {
    expect(logStreak(new Set(), '2026-07-03')).toBe(0);
  });

  it('counts today plus consecutive prior days', () => {
    const set = new Set(['2026-07-03', '2026-07-02', '2026-07-01']);
    expect(logStreak(set, '2026-07-03')).toBe(3);
  });

  it('stops at a gap', () => {
    const set = new Set(['2026-07-03', '2026-07-02', '2026-06-30']);
    expect(logStreak(set, '2026-07-03')).toBe(2);
  });

  it('counts from yesterday when today is not yet logged', () => {
    const set = new Set(['2026-07-02', '2026-07-01']);
    expect(logStreak(set, '2026-07-03')).toBe(2);
  });
});

const weighIns: MetricEntry[] = [
  { id: 'a', date: '2026-07-02', weightKg: 80 },
  { id: 'b', date: '2026-07-01', weightKg: 81 },
  { id: 'c', date: '2026-07-02', weightKg: 79.5 }, // later insertion for same date wins
  { id: 'd', date: '2026-07-03', sleepHours: 8 }, // no weight -> excluded
];

describe('weightSeries', () => {
  it('dedupes same-date entries (later wins) and sorts ascending', () => {
    expect(weightSeries(weighIns)).toEqual([
      { date: '2026-07-01', weightKg: 81 },
      { date: '2026-07-02', weightKg: 79.5 },
    ]);
  });
});

describe('latestWeight', () => {
  it('returns null delta for a single weigh-in', () => {
    expect(latestWeight([{ id: 'a', date: '2026-07-01', weightKg: 81 }])).toEqual({
      date: '2026-07-01',
      weightKg: 81,
      deltaKg: null,
    });
  });

  it('computes a signed delta vs the previous weigh-in', () => {
    expect(latestWeight(weighIns)).toEqual({ date: '2026-07-02', weightKg: 79.5, deltaKg: -1.5 });
  });

  it('returns null with no weigh-ins at all', () => {
    expect(latestWeight([{ id: 'd', date: '2026-07-03', sleepHours: 8 }])).toBeNull();
  });
});

describe('sleepSeries', () => {
  it('zero-fills unlogged days', () => {
    const metrics: MetricEntry[] = [
      { id: 'm1', date: '2026-07-01', sleepHours: 7.5 },
      { id: 'm2', date: '2026-07-03', sleepHours: 8 },
    ];
    expect(sleepSeries(metrics, '2026-07-03', 3)).toEqual([
      { date: '2026-07-01', hours: 7.5 },
      { date: '2026-07-02', hours: 0 },
      { date: '2026-07-03', hours: 8 },
    ]);
  });
});

describe('workout aggregates', () => {
  const workout: Workout = {
    id: 'w1',
    date: '2026-07-01',
    name: 'Push + cardio',
    exercises: [
      {
        id: 'e1',
        name: 'Bench press',
        kind: 'strength',
        sets: [
          { reps: 5, weightKg: 100 },
          { reps: 5, weightKg: 100 },
        ],
      },
      { id: 'e2', name: 'Push-ups', kind: 'strength', sets: [{ reps: 10, weightKg: null }] },
      { id: 'e3', name: 'Run', kind: 'cardio', sets: [], durationMin: 30, distanceKm: 5 },
      { id: 'e4', name: 'Bike', kind: 'cardio', sets: [], durationMin: 15 },
    ],
  };

  it('workoutVolumeKg counts bodyweight (null) sets as 0', () => {
    expect(workoutVolumeKg(workout)).toBe(1000);
  });

  it('workoutSetCount counts sets across exercises', () => {
    expect(workoutSetCount(workout)).toBe(3);
  });

  it('workoutCardioMin sums cardio durations', () => {
    expect(workoutCardioMin(workout)).toBe(45);
  });
});
