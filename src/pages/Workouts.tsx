import { useMemo, useRef, useState } from 'react';
import { Dumbbell, Plus, Trash2, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { Exercise, ExerciseKind, Units, Workout } from '../types';
import { relativeDayLabel, todayISO } from '../lib/dates';
import { displayToKg, kgToDisplay, weightUnit } from '../lib/units';
import {
  workoutCardioMin,
  workoutSetCount,
  workoutsInWeekOf,
  workoutVolumeKg,
} from '../lib/stats';
import { uid } from '../lib/id';
import {
  Button,
  CardTitle,
  EmptyState,
  Field,
  IconButton,
  PageHeader,
  Select,
  TextInput,
} from '../components/ui';

const EXERCISE_SUGGESTIONS = [
  'Bench Press',
  'Incline Bench Press',
  'Squat',
  'Front Squat',
  'Deadlift',
  'Romanian Deadlift',
  'Overhead Press',
  'Barbell Row',
  'Dumbbell Row',
  'Pull-up',
  'Chin-up',
  'Push-up',
  'Dip',
  'Lunge',
  'Leg Press',
  'Leg Curl',
  'Lat Pulldown',
  'Bicep Curl',
  'Tricep Extension',
  'Lateral Raise',
  'Hip Thrust',
  'Plank',
  'Running',
  'Cycling',
  'Rowing',
  'Swimming',
  'Walking',
  'Yoga',
];

interface DraftSet {
  reps: string;
  weight: string;
}

interface DraftExercise {
  key: number;
  name: string;
  kind: ExerciseKind;
  sets: DraftSet[];
  duration: string;
  distance: string;
}

function WorkoutForm({ onClose }: { onClose: () => void }) {
  const goals = useAppStore((s) => s.goals);
  const addWorkout = useAppStore((s) => s.addWorkout);

  const keyCounter = useRef(0);
  const makeExercise = (): DraftExercise => {
    keyCounter.current += 1;
    return {
      key: keyCounter.current,
      name: '',
      kind: 'strength',
      sets: [{ reps: '10', weight: '' }],
      duration: '',
      distance: '',
    };
  };

  const [date, setDate] = useState(todayISO());
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<DraftExercise[]>(() => [makeExercise()]);

  const updateExercise = (key: number, patch: Partial<DraftExercise>) =>
    setExercises((exs) => exs.map((ex) => (ex.key === key ? { ...ex, ...patch } : ex)));

  const removeExercise = (key: number) =>
    setExercises((exs) => exs.filter((ex) => ex.key !== key));

  const updateSet = (key: number, index: number, patch: Partial<DraftSet>) =>
    setExercises((exs) =>
      exs.map((ex) =>
        ex.key === key
          ? { ...ex, sets: ex.sets.map((st, i) => (i === index ? { ...st, ...patch } : st)) }
          : ex,
      ),
    );

  const addSet = (key: number) =>
    setExercises((exs) =>
      exs.map((ex) => {
        if (ex.key !== key) return ex;
        const last = ex.sets[ex.sets.length - 1] ?? { reps: '10', weight: '' };
        return { ...ex, sets: [...ex.sets, { ...last }] };
      }),
    );

  const removeSet = (key: number, index: number) =>
    setExercises((exs) =>
      exs.map((ex) =>
        ex.key === key ? { ...ex, sets: ex.sets.filter((_, i) => i !== index) } : ex,
      ),
    );

  const canSave = date !== '' && exercises.some((ex) => ex.name.trim() !== '');

  const resetDrafts = () => {
    setDate(todayISO());
    setName('');
    setExercises([makeExercise()]);
  };

  const save = () => {
    const built: Exercise[] = exercises
      .filter((ex) => ex.name.trim() !== '')
      .map((ex) => ({
        id: uid(),
        name: ex.name.trim(),
        kind: ex.kind,
        sets:
          ex.kind === 'strength'
            ? ex.sets
                .filter((st) => Number(st.reps) > 0)
                .map((st) => ({
                  reps: Number(st.reps),
                  weightKg:
                    st.weight.trim() === '' ? null : displayToKg(Number(st.weight), goals.units),
                }))
            : [],
        durationMin:
          ex.kind === 'cardio' && Number(ex.duration) > 0 ? Number(ex.duration) : undefined,
        distanceKm:
          ex.kind === 'cardio' && Number(ex.distance) > 0 ? Number(ex.distance) : undefined,
      }));
    addWorkout({ date, name: name.trim() || 'Workout', exercises: built });
    resetDrafts();
    onClose();
  };

  return (
    <section className="card">
      <CardTitle title="Log workout" />
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Date">
            <TextInput
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => {
                const v = e.target.value;
                if (v && v <= todayISO()) setDate(v);
              }}
            />
          </Field>
          <Field label="Workout name">
            <TextInput
              value={name}
              placeholder="Push day"
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
        </div>

        {exercises.map((ex) => (
          <div key={ex.key} className="rounded-xl border border-line p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <TextInput
                list="exercise-suggestions"
                placeholder="Exercise name"
                aria-label="Exercise name"
                value={ex.name}
                onChange={(e) => updateExercise(ex.key, { name: e.target.value })}
              />
              <Select
                className="w-28 shrink-0"
                aria-label="Exercise type"
                value={ex.kind}
                onChange={(e) => updateExercise(ex.key, { kind: e.target.value as ExerciseKind })}
              >
                <option value="strength">Strength</option>
                <option value="cardio">Cardio</option>
              </Select>
              {exercises.length > 1 && (
                <IconButton label="Remove exercise" onClick={() => removeExercise(ex.key)}>
                  <X size={16} />
                </IconButton>
              )}
            </div>

            {ex.kind === 'strength' ? (
              <>
                {ex.sets.map((st, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted w-10 shrink-0">{`Set ${i + 1}`}</span>
                    <TextInput
                      type="number"
                      min={1}
                      aria-label={`Set ${i + 1} reps`}
                      value={st.reps}
                      onChange={(e) => updateSet(ex.key, i, { reps: e.target.value })}
                    />
                    <TextInput
                      type="number"
                      step={0.5}
                      placeholder="BW"
                      aria-label={`Set ${i + 1} weight`}
                      value={st.weight}
                      onChange={(e) => updateSet(ex.key, i, { weight: e.target.value })}
                    />
                    <span className="text-xs text-muted">{weightUnit(goals.units)}</span>
                    {ex.sets.length > 1 && (
                      <IconButton label="Remove set" onClick={() => removeSet(ex.key, i)}>
                        <X size={16} />
                      </IconButton>
                    )}
                  </div>
                ))}
                <Button variant="ghost" className="self-start" onClick={() => addSet(ex.key)}>
                  + Add set
                </Button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Duration (min)">
                  <TextInput
                    type="number"
                    min={0}
                    value={ex.duration}
                    onChange={(e) => updateExercise(ex.key, { duration: e.target.value })}
                  />
                </Field>
                <Field label="Distance (km)">
                  <TextInput
                    type="number"
                    min={0}
                    step={0.1}
                    value={ex.distance}
                    onChange={(e) => updateExercise(ex.key, { distance: e.target.value })}
                  />
                </Field>
              </div>
            )}
          </div>
        ))}

        <div>
          <Button
            variant="ghost"
            onClick={() => setExercises((exs) => [...exs, makeExercise()])}
          >
            + Add exercise
          </Button>
        </div>

        <datalist id="exercise-suggestions">
          {EXERCISE_SUGGESTIONS.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>

        <div className="flex items-center gap-2">
          <Button disabled={!canSave} onClick={save}>
            Save workout
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              resetDrafts();
              onClose();
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    </section>
  );
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

function WorkoutCard({ workout, units }: { workout: Workout; units: Units }) {
  const deleteWorkout = useAppStore((s) => s.deleteWorkout);
  const setCount = workoutSetCount(workout);
  const volumeKg = workoutVolumeKg(workout);
  const cardioMin = workoutCardioMin(workout);

  return (
    <section className="card">
      <div className="flex items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate font-semibold text-sm text-ink">{workout.name}</h3>
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
        <IconButton
          label="Delete workout"
          onClick={() => {
            if (window.confirm(`Delete "${workout.name}"?`)) deleteWorkout(workout.id);
          }}
        >
          <Trash2 size={16} />
        </IconButton>
      </div>
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
  const goals = useAppStore((s) => s.goals);
  const [formOpen, setFormOpen] = useState(false);

  const thisWeekCount = workoutsInWeekOf(workouts, todayISO()).length;

  const grouped = useMemo(() => {
    const byDate = new Map<string, Workout[]>();
    const sorted = [...workouts].sort((a, b) => b.date.localeCompare(a.date));
    for (const w of sorted) {
      const list = byDate.get(w.date);
      if (list) list.push(w);
      else byDate.set(w.date, [w]);
    }
    return [...byDate.entries()];
  }, [workouts]);

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <PageHeader
        title="Workouts"
        sub={`${thisWeekCount} of ${goals.weeklyWorkouts} workouts this week`}
        action={
          <Button onClick={() => setFormOpen((open) => !open)}>
            <Plus size={16} />
            Log workout
          </Button>
        }
      />

      {formOpen && <WorkoutForm onClose={() => setFormOpen(false)} />}

      {workouts.length === 0 ? (
        <section className="card">
          <EmptyState
            icon={<Dumbbell size={22} />}
            title="No workouts yet"
            body="Log your first session to start building history."
            action={<Button onClick={() => setFormOpen(true)}>Log workout</Button>}
          />
        </section>
      ) : (
        grouped.map(([date, dayWorkouts]) => (
          <div key={date} className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              {relativeDayLabel(date)}
            </h2>
            {dayWorkouts.map((w) => (
              <WorkoutCard key={w.id} workout={w} units={goals.units} />
            ))}
          </div>
        ))
      )}
    </div>
  );
}
