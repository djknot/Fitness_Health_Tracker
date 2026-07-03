import type { AppData, Exercise, FoodEntry, MealType, MetricEntry, Workout } from '../types';
import { addDays, parseISODate } from './dates';
import { round1 } from './units';
import { uid } from './id';

type ExerciseTemplate = Omit<Exercise, 'id'>;

const STRENGTH_TEMPLATES: { name: string; exercises: ExerciseTemplate[] }[] = [
  {
    name: 'Push day',
    exercises: [
      { name: 'Bench Press', kind: 'strength', sets: [{ reps: 8, weightKg: 60 }, { reps: 8, weightKg: 60 }, { reps: 6, weightKg: 65 }] },
      { name: 'Overhead Press', kind: 'strength', sets: [{ reps: 10, weightKg: 35 }, { reps: 8, weightKg: 37.5 }, { reps: 8, weightKg: 37.5 }] },
      { name: 'Push-up', kind: 'strength', sets: [{ reps: 15, weightKg: null }, { reps: 12, weightKg: null }] },
    ],
  },
  {
    name: 'Pull day',
    exercises: [
      { name: 'Deadlift', kind: 'strength', sets: [{ reps: 5, weightKg: 100 }, { reps: 5, weightKg: 105 }, { reps: 3, weightKg: 110 }] },
      { name: 'Barbell Row', kind: 'strength', sets: [{ reps: 8, weightKg: 55 }, { reps: 8, weightKg: 55 }, { reps: 8, weightKg: 55 }] },
      { name: 'Pull-up', kind: 'strength', sets: [{ reps: 8, weightKg: null }, { reps: 6, weightKg: null }, { reps: 6, weightKg: null }] },
    ],
  },
  {
    name: 'Leg day',
    exercises: [
      { name: 'Squat', kind: 'strength', sets: [{ reps: 8, weightKg: 80 }, { reps: 6, weightKg: 85 }, { reps: 6, weightKg: 85 }] },
      { name: 'Lunge', kind: 'strength', sets: [{ reps: 10, weightKg: 20 }, { reps: 10, weightKg: 20 }, { reps: 10, weightKg: 20 }] },
      { name: 'Leg Press', kind: 'strength', sets: [{ reps: 10, weightKg: 120 }, { reps: 10, weightKg: 130 }] },
    ],
  },
];

const RUN_TEMPLATE: { name: string; exercises: ExerciseTemplate[] } = {
  name: 'Morning run',
  exercises: [{ name: 'Running', kind: 'cardio', sets: [], durationMin: 32, distanceKm: 5.2 }],
};

type MealTemplate = { name: string; calories: number; proteinG: number; carbsG: number; fatG: number };

const MEALS: Record<MealType, MealTemplate[]> = {
  breakfast: [
    { name: 'Oatmeal with berries', calories: 320, proteinG: 12, carbsG: 55, fatG: 8 },
    { name: 'Greek yogurt & granola', calories: 350, proteinG: 20, carbsG: 45, fatG: 10 },
    { name: 'Eggs on toast', calories: 380, proteinG: 22, carbsG: 30, fatG: 18 },
  ],
  lunch: [
    { name: 'Chicken salad', calories: 520, proteinG: 42, carbsG: 25, fatG: 28 },
    { name: 'Turkey sandwich', calories: 480, proteinG: 30, carbsG: 50, fatG: 16 },
    { name: 'Burrito bowl', calories: 650, proteinG: 35, carbsG: 70, fatG: 22 },
  ],
  dinner: [
    { name: 'Salmon, rice & greens', calories: 640, proteinG: 40, carbsG: 60, fatG: 24 },
    { name: 'Pasta with chicken', calories: 700, proteinG: 45, carbsG: 80, fatG: 18 },
    { name: 'Veggie stir-fry & noodles', calories: 590, proteinG: 32, carbsG: 68, fatG: 20 },
  ],
  snack: [
    { name: 'Protein shake', calories: 180, proteinG: 30, carbsG: 8, fatG: 3 },
    { name: 'Apple & peanut butter', calories: 250, proteinG: 7, carbsG: 28, fatG: 13 },
    { name: 'Trail mix', calories: 210, proteinG: 6, carbsG: 18, fatG: 14 },
  ],
};

function instantiate(template: { name: string; exercises: ExerciseTemplate[] }, date: string): Workout {
  return {
    id: uid(),
    date,
    name: template.name,
    exercises: template.exercises.map((ex) => ({
      ...ex,
      id: uid(),
      sets: ex.sets.map((s) => ({ ...s })),
    })),
  };
}

/**
 * Four weeks of plausible demo data ending today: a gentle weight downtrend,
 * Mon/Wed/Fri lifts plus a Saturday run, three meals a day, water, and sleep.
 */
export function sampleData(today: string): AppData {
  const DAYS = 28;
  const workouts: Workout[] = [];
  const foods: FoodEntry[] = [];
  const metrics: MetricEntry[] = [];
  const waterByDate: Record<string, number> = {};

  let strengthRotation = 0;
  for (let offset = DAYS - 1; offset >= 0; offset--) {
    const date = addDays(today, -offset);
    const dayIndex = DAYS - 1 - offset; // 0 = oldest
    const weekday = parseISODate(date).getDay();
    const isToday = offset === 0;

    // Body metrics: downtrend with a natural wobble; weigh-ins most days.
    if (dayIndex % 7 !== 3) {
      metrics.push({
        id: uid(),
        date,
        weightKg: round1(82.4 - dayIndex * 0.055 + Math.sin(dayIndex * 1.7) * 0.35),
        sleepHours: round1(Math.min(9, Math.max(5.5, 7.2 + Math.sin(dayIndex * 0.9) * 1.1))),
        ...(dayIndex % 7 === 0
          ? { waistCm: round1(88 - dayIndex * 0.04), bodyFatPct: round1(21.5 - dayIndex * 0.03) }
          : {}),
      });
    }

    // Workouts: Mon/Wed/Fri strength rotation, Saturday run.
    if (weekday === 1 || weekday === 3 || weekday === 5) {
      workouts.push(instantiate(STRENGTH_TEMPLATES[strengthRotation % STRENGTH_TEMPLATES.length], date));
      strengthRotation++;
    } else if (weekday === 6) {
      workouts.push(instantiate(RUN_TEMPLATE, date));
    }

    // Meals: rotate templates; today only has breakfast + lunch logged so far.
    const mealsToday: MealType[] = isToday
      ? ['breakfast', 'lunch']
      : dayIndex % 2 === 0
        ? ['breakfast', 'lunch', 'dinner', 'snack']
        : ['breakfast', 'lunch', 'dinner'];
    for (const meal of mealsToday) {
      const template = MEALS[meal][dayIndex % 3];
      foods.push({ id: uid(), date, meal, ...template });
    }

    waterByDate[date] = isToday ? 1000 : 1750 + ((dayIndex * 37) % 5) * 250;
  }

  return {
    workouts,
    foods,
    metrics,
    waterByDate,
    goals: {
      units: 'metric',
      dailyCalories: 2200,
      dailyWaterMl: 2500,
      weeklyWorkouts: 4,
      targetWeightKg: 78,
    },
    profile: {
      heightCm: 178,
      age: 34,
      sex: 'male',
      activityLevel: 'moderate',
      weeklyRateKg: 0.5,
      useRecommendedTarget: true,
    },
  };
}
