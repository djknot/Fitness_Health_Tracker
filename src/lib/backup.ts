import type { AppData } from '../types';
import { DEFAULT_GOALS, DEFAULT_PREFS, DEFAULT_PROFILE } from './defaults';

export function serializeBackup(data: AppData): string {
  return JSON.stringify(
    {
      app: 'fittrack',
      exportedAt: new Date().toISOString(),
      workouts: data.workouts,
      foods: data.foods,
      waterByDate: data.waterByDate,
      metrics: data.metrics,
      fasts: data.fasts,
      templates: data.templates,
      customFoods: data.customFoods,
      favoriteFoods: data.favoriteFoods,
      recentFoods: data.recentFoods,
      goals: data.goals,
      profile: data.profile,
      prefs: data.prefs,
    },
    null,
    2,
  );
}

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** Parse and minimally validate a backup file (v0.1 backups load fine); throws with a friendly message. */
export function parseBackup(text: string): AppData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  const obj = raw as Partial<AppData> & { app?: string };
  if (!obj || !Array.isArray(obj.workouts) || !Array.isArray(obj.foods) || !Array.isArray(obj.metrics)) {
    throw new Error('That file does not look like a FitTrack backup.');
  }
  return {
    workouts: obj.workouts,
    foods: obj.foods,
    metrics: obj.metrics,
    waterByDate:
      obj.waterByDate && typeof obj.waterByDate === 'object' ? { ...obj.waterByDate } : {},
    fasts: arr(obj.fasts),
    templates: arr(obj.templates),
    customFoods: arr(obj.customFoods),
    favoriteFoods: arr(obj.favoriteFoods),
    recentFoods: arr(obj.recentFoods),
    goals: { ...DEFAULT_GOALS, ...(obj.goals ?? {}) },
    profile: { ...DEFAULT_PROFILE, ...(obj.profile ?? {}) },
    prefs: { ...DEFAULT_PREFS, ...(obj.prefs ?? {}) },
  };
}

export function downloadTextFile(filename: string, text: string, mime = 'application/json'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
