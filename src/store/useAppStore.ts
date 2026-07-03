import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppData,
  CustomFood,
  Fast,
  FoodEntry,
  Goals,
  MetricEntry,
  Prefs,
  Profile,
  QuickFood,
  Workout,
  WorkoutTemplate,
} from '../types';
import { emptyData } from '../lib/defaults';
import { pushRecent, quickFoodKey } from '../lib/quickfoods';
import { uid } from '../lib/id';

interface AppStore extends AppData {
  /** Bumped on wholesale dataset replacement so forms can re-seed drafts. Not persisted. */
  dataVersion: number;

  addWorkout(w: Omit<Workout, 'id'>): void;
  updateWorkout(id: string, w: Omit<Workout, 'id'>): void;
  deleteWorkout(id: string): void;

  addFood(f: Omit<FoodEntry, 'id'>): void;
  updateFood(id: string, patch: Partial<Omit<FoodEntry, 'id'>>): void;
  deleteFood(id: string): void;

  /** Adjust water for a date by ±ml, clamped at 0. */
  addWater(date: string, deltaMl: number): void;

  addMetric(m: Omit<MetricEntry, 'id'>): void;
  updateMetric(id: string, patch: Partial<Omit<MetricEntry, 'id'>>): void;
  deleteMetric(id: string): void;

  startFast(startIso: string): void;
  endFast(id: string, endIso: string): void;
  deleteFast(id: string): void;

  addTemplate(t: Omit<WorkoutTemplate, 'id'>): void;
  deleteTemplate(id: string): void;

  addCustomFood(f: Omit<CustomFood, 'id' | 'source'>): void;
  updateCustomFood(id: string, patch: Partial<Omit<CustomFood, 'id' | 'source'>>): void;
  deleteCustomFood(id: string): void;

  /** Star/unstar a quick food (deduped by name+calories). */
  toggleFavoriteFood(qf: Omit<QuickFood, 'id'>): void;

  setGoals(g: Partial<Goals>): void;
  setProfile(p: Partial<Profile>): void;
  setPrefs(p: Partial<Prefs>): void;

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
      updateWorkout: (id, w) =>
        set((s) => ({ workouts: s.workouts.map((x) => (x.id === id ? { ...w, id } : x)) })),
      deleteWorkout: (id) => set((s) => ({ workouts: s.workouts.filter((w) => w.id !== id) })),

      addFood: (f) =>
        set((s) => ({
          foods: [...s.foods, { ...f, id: uid() }],
          recentFoods: pushRecent(s.recentFoods, {
            id: uid(),
            name: f.name,
            calories: f.calories,
            proteinG: f.proteinG,
            carbsG: f.carbsG,
            fatG: f.fatG,
          }),
        })),
      updateFood: (id, patch) =>
        set((s) => ({ foods: s.foods.map((f) => (f.id === id ? { ...f, ...patch, id } : f)) })),
      deleteFood: (id) => set((s) => ({ foods: s.foods.filter((f) => f.id !== id) })),

      addWater: (date, deltaMl) =>
        set((s) => ({
          waterByDate: {
            ...s.waterByDate,
            [date]: Math.max(0, (s.waterByDate[date] ?? 0) + deltaMl),
          },
        })),

      addMetric: (m) => set((s) => ({ metrics: [...s.metrics, { ...m, id: uid() }] })),
      updateMetric: (id, patch) =>
        set((s) => ({ metrics: s.metrics.map((m) => (m.id === id ? { ...m, ...patch, id } : m)) })),
      deleteMetric: (id) => set((s) => ({ metrics: s.metrics.filter((m) => m.id !== id) })),

      startFast: (startIso) =>
        set((s) =>
          s.fasts.some((f) => !f.end)
            ? s
            : { fasts: [...s.fasts, { id: uid(), start: startIso } as Fast] },
        ),
      endFast: (id, endIso) =>
        set((s) => ({ fasts: s.fasts.map((f) => (f.id === id ? { ...f, end: endIso } : f)) })),
      deleteFast: (id) => set((s) => ({ fasts: s.fasts.filter((f) => f.id !== id) })),

      addTemplate: (t) => set((s) => ({ templates: [...s.templates, { ...t, id: uid() }] })),
      deleteTemplate: (id) => set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),

      addCustomFood: (f) =>
        set((s) => ({ customFoods: [...s.customFoods, { ...f, id: uid(), source: 'custom' }] })),
      updateCustomFood: (id, patch) =>
        set((s) => ({
          customFoods: s.customFoods.map((f) =>
            f.id === id ? { ...f, ...patch, id, source: 'custom' } : f,
          ),
        })),
      deleteCustomFood: (id) =>
        set((s) => ({ customFoods: s.customFoods.filter((f) => f.id !== id) })),

      toggleFavoriteFood: (qf) =>
        set((s) => {
          const key = quickFoodKey(qf);
          const existing = s.favoriteFoods.find((f) => quickFoodKey(f) === key);
          return {
            favoriteFoods: existing
              ? s.favoriteFoods.filter((f) => f !== existing)
              : [{ ...qf, id: uid() }, ...s.favoriteFoods].slice(0, 30),
          };
        }),

      setGoals: (g) => set((s) => ({ goals: { ...s.goals, ...g } })),
      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      setPrefs: (p) => set((s) => ({ prefs: { ...s.prefs, ...p } })),

      replaceAll: (data) => set((s) => ({ ...data, dataVersion: s.dataVersion + 1 })),
      resetAll: () => set((s) => ({ ...emptyData(), dataVersion: s.dataVersion + 1 })),
    }),
    {
      name: 'fittrack-v1',
      version: 2,
      // v1 → v2: new slices (fasts/templates/customFoods/favorites/recents/prefs).
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<AppData>;
        if (version < 2) return { ...emptyData(), ...p };
        return p as AppData;
      },
      partialize: (s) => ({
        workouts: s.workouts,
        foods: s.foods,
        waterByDate: s.waterByDate,
        metrics: s.metrics,
        fasts: s.fasts,
        templates: s.templates,
        customFoods: s.customFoods,
        favoriteFoods: s.favoriteFoods,
        recentFoods: s.recentFoods,
        goals: s.goals,
        profile: s.profile,
        prefs: s.prefs,
      }),
      // Deep-merge object slices so fields added in later versions keep their defaults.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppData>;
        return {
          ...current,
          ...p,
          goals: { ...current.goals, ...(p.goals ?? {}) },
          profile: { ...current.profile, ...(p.profile ?? {}) },
          prefs: { ...current.prefs, ...(p.prefs ?? {}) },
        };
      },
    },
  ),
);
