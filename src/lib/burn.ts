import type { Exercise, Workout } from '../types';

/**
 * MET values (Compendium of Physical Activities, approximate).
 * Burn kcal = MET × weight(kg) × hours.
 */
const MET_BY_KEYWORD: [string, number][] = [
  ['run', 9.8],
  ['jog', 7.0],
  ['cycl', 7.5],
  ['bik', 7.5],
  ['rowing', 7.0], // 'rowing' not 'row' — else strength "Barbell Row" gets the cardio MET
  ['swim', 8.0],
  ['walk', 3.5],
  ['hik', 6.0],
  ['yoga', 2.5],
  ['stretch', 2.3],
  ['plank', 3.8],
  ['jump rope', 11.0],
  ['elliptical', 5.0],
  ['stair', 9.0],
];

const DEFAULT_CARDIO_MET = 6.0;
const DEFAULT_STRENGTH_MET = 4.0;
/** Estimated minutes per strength set when no duration was logged. */
export const MINUTES_PER_SET = 2.5;

export function metFor(ex: Pick<Exercise, 'name' | 'kind'>): number {
  const name = ex.name.toLowerCase();
  for (const [kw, met] of MET_BY_KEYWORD) if (name.includes(kw)) return met;
  return ex.kind === 'cardio' ? DEFAULT_CARDIO_MET : DEFAULT_STRENGTH_MET;
}

/** Estimated kcal burned by one exercise for a person of the given weight. */
export function exerciseBurnKcal(ex: Exercise, weightKg: number): number {
  const minutes = ex.durationMin ?? (ex.kind === 'strength' ? ex.sets.length * MINUTES_PER_SET : 0);
  if (minutes <= 0 || weightKg <= 0) return 0;
  return metFor(ex) * weightKg * (minutes / 60);
}

export function workoutBurnKcal(w: Workout, weightKg: number): number {
  return Math.round(w.exercises.reduce((sum, ex) => sum + exerciseBurnKcal(ex, weightKg), 0));
}

/** Total estimated burn across all workouts on a date. */
export function dayBurnKcal(workouts: Workout[], date: string, weightKg: number): number {
  return workouts
    .filter((w) => w.date === date)
    .reduce((sum, w) => sum + workoutBurnKcal(w, weightKg), 0);
}
