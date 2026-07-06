import { useCallback, useMemo, useRef, useState } from 'react';
import { BookmarkPlus, Dumbbell, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { Exercise, Units, Workout } from '../types';
import { todayISO } from '../lib/dates';
import { kgToDisplay, weightUnit } from '../lib/units';
import {
  latestWeight,
  workoutCardioMin,
  workoutSetCount,
  workoutsInWeekOf,
  workoutVolumeKg,
} from '../lib/stats';
import { workoutBurnKcal } from '../lib/burn';
import { uid } from '../lib/id';
import { Button, EmptyState, IconButton, PageHeader } from '../components/ui';
import { DateNav } from '../components/DateNav';
import WorkoutBuilder from '../components/workouts/WorkoutBuilder';
import type { BuilderSeed } from '../components/workouts/WorkoutBuilder';

/** Fresh exercise ids + copied sets arrays, so templates never share references with workouts. */
function cloneExercises(exercises: Exercise[]): Exercise[] {
  return exercises.map((ex) => ({ ...ex, id: uid(), sets: ex.sets.map((st) => ({ ...st })) }));
}

function exerciseDetail(ex: Exercise, units: Units): string {
  if (ex.kind === 'strength') {
    if (ex.sets.length === 0) return '';
    const parts = ex.sets.map(
      (s) => `${s.reps}×${s.weightKg == null ? 'BW' : kgToDisplay(s.weightKg, units)}`,
    );
    const hasWeight = ex.sets.some((s) => s.weightKg != null);
    return parts.join(', ') + (hasWeight ? ` ${weightUnit(units)}` : '');
  }
  const parts: string[] = [];
  if (ex.durationMin != null) parts.push(`${ex.durationMin} min`);
  if (ex.distanceKm != null) parts.push(`${ex.distanceKm} km`);
  return parts.join(' · ');
}

function WorkoutCard({
  workout,
  units,
  weightKg,
  onEdit,
  onDelete,
}: {
  workout: Workout;
  units: Units;
  /** Latest logged body weight (kg), for the burn estimate. */
  weightKg: number;
  onEdit: () => void;
  /** Deletion is routed through the page so it can also close an open editor. */
  onDelete: () => void;
}) {
  const addTemplate = useAppStore((s) => s.addTemplate);
  const setCount = workoutSetCount(workout);
  const volumeKg = workoutVolumeKg(workout);
  const cardioMin = workoutCardioMin(workout);
  const burnKcal = workoutBurnKcal(workout, weightKg);

  return (
    <section className="card">
      <div className="flex items-center gap-1">
        <h3 className="min-w-0 flex-1 truncate font-semibold text-sm text-ink">{workout.name}</h3>
        <IconButton
          variant="neutral"
          label="Save as template"
          onClick={() =>
            addTemplate({ name: workout.name, exercises: cloneExercises(workout.exercises) })
          }
        >
          <BookmarkPlus size={16} />
        </IconButton>
        <IconButton variant="neutral" label="Edit workout" onClick={onEdit}>
          <Pencil size={16} />
        </IconButton>
        <IconButton
          label="Delete workout"
          onClick={() => {
            if (window.confirm(`Delete "${workout.name}"?`)) onDelete();
          }}
        >
          <Trash2 size={16} />
        </IconButton>
      </div>
      {(setCount > 0 || volumeKg > 0 || cardioMin > 0 || burnKcal > 0) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {setCount > 0 && (
            <span className="chip bg-accent-wash text-ink2">
              {setCount} {setCount === 1 ? 'set' : 'sets'}
            </span>
          )}
          {volumeKg > 0 && (
            <span className="chip bg-accent-wash text-ink2">
              {Math.round(kgToDisplay(volumeKg, units)).toLocaleString('en-US')} {weightUnit(units)}
            </span>
          )}
          {cardioMin > 0 && <span className="chip bg-accent-wash text-ink2">{cardioMin} min</span>}
          {burnKcal > 0 && (
            <span
              className="chip bg-accent-wash text-ink2"
              title={
                workout.caloriesKcal != null
                  ? 'Calories you entered for this workout'
                  : 'Estimated calories: METs × body weight × duration'
              }
            >
              {workout.caloriesKcal != null ? '' : '~'}
              {burnKcal} kcal
            </span>
          )}
        </div>
      )}
      <div className="mt-2 flex flex-col gap-1">
        {workout.exercises.map((ex) => {
          const detail = exerciseDetail(ex, units);
          return (
            <div
              key={ex.id}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5"
            >
              <span className="text-sm text-ink">{ex.name}</span>
              {detail !== '' && <span className="text-xs text-muted">{detail}</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function Workouts() {
  const workouts = useAppStore((s) => s.workouts);
  const metrics = useAppStore((s) => s.metrics);
  const goals = useAppStore((s) => s.goals);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const deleteWorkout = useAppStore((s) => s.deleteWorkout);

  const [builder, setBuilder] = useState<{ seed: BuilderSeed; nonce: number } | null>(null);
  const nonceRef = useRef(0);
  const dirtyRef = useRef(false);

  const handleDirtyChange = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty;
  }, []);

  const openWith = (seed: BuilderSeed) => {
    nonceRef.current += 1;
    dirtyRef.current = seed.name.trim() !== '' || seed.exercises.length > 0;
    setBuilder({ seed, nonce: nonceRef.current });
  };

  /** A blank draft dated to the day you are currently viewing. */
  const newSeed = (): BuilderSeed => ({
    editing: null,
    date: selectedDate,
    name: '',
    exercises: [],
  });

  const closeBuilder = () => {
    dirtyRef.current = false;
    setBuilder(null);
  };

  /** True when it is safe to replace the draft: builder closed, pristine, or user confirmed. */
  const confirmReplaceDraft = (message: string) =>
    builder == null || !dirtyRef.current || window.confirm(message);

  const startEdit = (w: Workout) => {
    if (!confirmReplaceDraft(`Discard the current draft and edit "${w.name}"?`)) return;
    openWith({ editing: w, date: w.date, name: w.name, exercises: w.exercises });
  };

  /** Delete a workout; if it is the one open in the editor, close the now-stale editor. */
  const handleDelete = (w: Workout) => {
    deleteWorkout(w.id);
    if (builder?.seed.editing?.id === w.id) closeBuilder();
  };

  const weightKg = useMemo(() => latestWeight(metrics)?.weightKg ?? 70, [metrics]);
  // "This week" is a present-tense metric — always the real current week, not the
  // week of whatever past date is being browsed.
  const weekCount = workoutsInWeekOf(workouts, todayISO()).length;

  // Only the selected day's workouts — history is reached by changing the date.
  const dayWorkouts = useMemo(
    () => workouts.filter((w) => w.date === selectedDate),
    [workouts, selectedDate],
  );

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <PageHeader
        title="Workouts"
        sub={`${weekCount} of ${goals.weeklyWorkouts} workouts this week`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <DateNav />
            <Button
              onClick={() => {
                if (!builder) openWith(newSeed());
                else if (confirmReplaceDraft('Discard the current draft?')) closeBuilder();
              }}
            >
              <Plus size={16} />
              Log workout
            </Button>
          </div>
        }
      />

      {builder && (
        <WorkoutBuilder
          key={builder.nonce}
          seed={builder.seed}
          onDone={closeBuilder}
          onDirtyChange={handleDirtyChange}
        />
      )}

      {dayWorkouts.length === 0 ? (
        <section className="card">
          <EmptyState
            icon={<Dumbbell size={22} />}
            title="No workouts on this day"
            body="Log a session for this day, or use the date picker to view another day."
            action={
              <Button
                onClick={() => {
                  if (!builder) openWith(newSeed());
                }}
              >
                Log workout
              </Button>
            }
          />
        </section>
      ) : (
        <div className="flex flex-col gap-2">
          {dayWorkouts.map((w) => (
            <WorkoutCard
              key={w.id}
              workout={w}
              units={goals.units}
              weightKg={weightKg}
              onEdit={() => startEdit(w)}
              onDelete={() => handleDelete(w)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
