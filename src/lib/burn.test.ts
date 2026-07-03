import { describe, expect, it } from 'vitest';
import type { Exercise, Workout } from '../types';
import { dayBurnKcal, exerciseBurnKcal, metFor, MINUTES_PER_SET, workoutBurnKcal } from './burn';

const cardio = (id: string, name: string, durationMin?: number): Exercise => ({
  id,
  name,
  kind: 'cardio',
  sets: [],
  durationMin,
});

const strength = (id: string, name: string, setCount: number, durationMin?: number): Exercise => ({
  id,
  name,
  kind: 'strength',
  sets: Array.from({ length: setCount }, () => ({ reps: 8, weightKg: 60 })),
  durationMin,
});

const workoutOn = (id: string, date: string, exercises: Exercise[]): Workout => ({
  id,
  date,
  name: 'Workout',
  exercises,
});

describe('metFor', () => {
  it('matches keywords case-insensitively anywhere in the name', () => {
    expect(metFor({ name: 'Morning Run', kind: 'cardio' })).toBe(9.8);
    expect(metFor({ name: 'cycling', kind: 'cardio' })).toBe(7.5);
  });

  it('defaults unrecognised cardio to 6.0', () => {
    expect(metFor({ name: 'Zumba', kind: 'cardio' })).toBe(6.0);
  });

  it('defaults unrecognised strength to 4.0', () => {
    expect(metFor({ name: 'Bench Press', kind: 'strength' })).toBe(4.0);
  });

  it('does not mistake a strength "Barbell Row" for the cardio rowing machine', () => {
    // 'rowing' keyword (7.0) must not swallow strength rows.
    expect(metFor({ name: 'Barbell Row', kind: 'strength' })).toBe(4.0);
    expect(metFor({ name: 'Dumbbell Row', kind: 'strength' })).toBe(4.0);
    expect(metFor({ name: 'Rowing Machine', kind: 'cardio' })).toBe(7.0);
  });
});

describe('exerciseBurnKcal', () => {
  it('prefers an explicit duration over the per-set estimate', () => {
    // MET 4.0 × 80 kg × 30/60 h — the 4 logged sets are ignored.
    expect(exerciseBurnKcal(strength('e1', 'Bench Press', 4, 30), 80)).toBe(160);
  });

  it('estimates strength duration from sets when none was logged', () => {
    const expected = (4.0 * 80 * (4 * MINUTES_PER_SET)) / 60;
    expect(exerciseBurnKcal(strength('e1', 'Bench Press', 4), 80)).toBeCloseTo(expected, 10);
  });

  it('returns 0 when there are no minutes to work from', () => {
    expect(exerciseBurnKcal(cardio('e1', 'Zumba'), 80)).toBe(0); // cardio without duration
    expect(exerciseBurnKcal(cardio('e1', 'Zumba', 0), 80)).toBe(0);
    expect(exerciseBurnKcal(strength('e1', 'Bench Press', 0), 80)).toBe(0); // no sets either
  });

  it('returns 0 when the body weight is not positive', () => {
    expect(exerciseBurnKcal(cardio('e1', 'Morning Run', 30), 0)).toBe(0);
    expect(exerciseBurnKcal(cardio('e1', 'Morning Run', 30), -70)).toBe(0);
  });
});

describe('workoutBurnKcal', () => {
  it('sums the exercises and rounds to a whole kcal', () => {
    const w = workoutOn('w1', '2026-07-01', [
      cardio('e1', 'Evening Walk', 40), // 3.5 × 80 × 40/60 = 186.67
      strength('e2', 'Squats', 3), // 4.0 × 80 × 7.5/60 = 40
    ]);
    expect(workoutBurnKcal(w, 80)).toBe(227);
  });

  it('is 0 for an empty workout', () => {
    expect(workoutBurnKcal(workoutOn('w1', '2026-07-01', []), 80)).toBe(0);
  });
});

describe('dayBurnKcal', () => {
  const workouts = [
    workoutOn('w1', '2026-07-01', [cardio('e1', 'Run', 30)]), // 9.8 × 80 × 0.5 = 392
    workoutOn('w2', '2026-07-01', [cardio('e2', 'Swim', 30)]), // 8.0 × 80 × 0.5 = 320
    workoutOn('w3', '2026-07-02', [cardio('e3', 'Run', 60)]), // 784
  ];

  it('sums every workout on exactly the given date', () => {
    expect(dayBurnKcal(workouts, '2026-07-01', 80)).toBe(712);
    expect(dayBurnKcal(workouts, '2026-07-02', 80)).toBe(784);
  });

  it('is 0 on a date with no workouts', () => {
    expect(dayBurnKcal(workouts, '2026-06-30', 80)).toBe(0);
  });
});
