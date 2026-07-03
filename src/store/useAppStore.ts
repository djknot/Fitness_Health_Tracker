import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppData, FoodEntry, Goals, MetricEntry, Profile, Workout } from '../types';
import { emptyData } from '../lib/defaults';
import { uid } from '../lib/id';

interface AppStore extends AppData {
  /** Bumped on wholesale dataset replacement so forms can re-seed drafts. Not persisted. */
  dataVersion: number;
  addWorkout(w: Omit<Workout, 'id'>): void;
  deleteWorkout(id: string): void;
  addFood(f: Omit<FoodEntry, 'id'>): void;
  deleteFood(id: string): void;
  /** Adjust water for a date by ±ml, clamped at 0. */
  addWater(date: string, deltaMl: number): void;
  addMetric(m: Omit<MetricEntry, 'id'>): void;
  deleteMetric(id: string): void;
  setGoals(g: Partial<Goals>): void;
  setProfile(p: Partial<Profile>): void;
  /** Replace the whole dataset (import / sample data / reset). */
  replaceAll(data: AppData): void;
  resetAll(): void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...emptyData(),
      dataVersion: 0,

      addWorkout: (w) => set((s) => ({ workouts: [...s.workouts, { ...w, id: uid() }] })),
      deleteWorkout: (id) => set((s) => ({ workouts: s.workouts.filter((w) => w.id !== id) })),

      addFood: (f) => set((s) => ({ foods: [...s.foods, { ...f, id: uid() }] })),
      deleteFood: (id) => set((s) => ({ foods: s.foods.filter((f) => f.id !== id) })),

      addWater: (date, deltaMl) =>
        set((s) => ({
          waterByDate: {
            ...s.waterByDate,
            [date]: Math.max(0, (s.waterByDate[date] ?? 0) + deltaMl),
          },
        })),

      addMetric: (m) => set((s) => ({ metrics: [...s.metrics, { ...m, id: uid() }] })),
      deleteMetric: (id) => set((s) => ({ metrics: s.metrics.filter((m) => m.id !== id) })),

      setGoals: (g) => set((s) => ({ goals: { ...s.goals, ...g } })),
      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),

      replaceAll: (data) => set((s) => ({ ...data, dataVersion: s.dataVersion + 1 })),
      resetAll: () => set((s) => ({ ...emptyData(), dataVersion: s.dataVersion + 1 })),
    }),
    {
      name: 'fittrack-v1',
      version: 1,
      partialize: (s) => ({
        workouts: s.workouts,
        foods: s.foods,
        waterByDate: s.waterByDate,
        metrics: s.metrics,
        goals: s.goals,
        profile: s.profile,
      }),
      // Deep-merge goals/profile so fields added in later versions keep their defaults.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppData>;
        return {
          ...current,
          ...p,
          goals: { ...current.goals, ...(p.goals ?? {}) },
          profile: { ...current.profile, ...(p.profile ?? {}) },
        };
      },
    },
  ),
);
