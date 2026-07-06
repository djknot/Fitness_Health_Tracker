import { useEffect, useRef, useState } from 'react';
import { BookmarkPlus, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { Exercise, ExerciseKind, Workout, WorkoutTemplate } from '../../types';
import { relativeDayLabel, todayISO } from '../../lib/dates';
import { displayToKg, kgToDisplay, weightUnit } from '../../lib/units';
import { MINUTES_PER_SET } from '../../lib/burn';
import { uid } from '../../lib/id';
import { Button, CardTitle, Field, IconButton, Select, TextInput } from '../ui';

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

/** Prefill for the builder. `editing` ties the draft to an existing workout. */
export interface BuilderSeed {
  editing: Workout | null;
  date: string;
  name: string;
  /** Copied into independent draft rows on mount — the source array is never mutated. */
  exercises: Exercise[];
}

export function emptySeed(): BuilderSeed {
  return { editing: null, date: todayISO(), name: '', exercises: [] };
}

const defaultSet = (): DraftSet => ({ reps: '10', weight: '' });

export default function WorkoutBuilder({
  seed,
  onDone,
  onDirtyChange,
}: {
  seed: BuilderSeed;
  /** Fired after save or cancel; the parent unmounts the builder so the next open starts fresh. */
  onDone: () => void;
  /** Reports whether the draft holds user content (guards template/edit overwrites). */
  onDirtyChange: (dirty: boolean) => void;
}) {
  const goals = useAppStore((s) => s.goals);
  const templates = useAppStore((s) => s.templates);
  const addWorkout = useAppStore((s) => s.addWorkout);
  const updateWorkout = useAppStore((s) => s.updateWorkout);
  const addTemplate = useAppStore((s) => s.addTemplate);

  const keyCounter = useRef(0);
  const makeExercise = (): DraftExercise => {
    keyCounter.current += 1;
    return {
      key: keyCounter.current,
      name: '',
      kind: 'strength',
      sets: [defaultSet()],
      duration: '',
      distance: '',
    };
  };

  /** Deep copy into draft strings, so a seeded template/workout is never mutated via shared refs. */
  const toDraft = (ex: Exercise): DraftExercise => {
    keyCounter.current += 1;
    return {
      key: keyCounter.current,
      name: ex.name,
      kind: ex.kind,
      sets: ex.sets.map((st) => ({
        reps: String(st.reps),
        weight: st.weightKg == null ? '' : String(kgToDisplay(st.weightKg, goals.units)),
      })),
      duration: ex.durationMin != null ? String(ex.durationMin) : '',
      distance: ex.distanceKm != null ? String(ex.distanceKm) : '',
    };
  };

  const [date, setDate] = useState(seed.date);
  const [name, setName] = useState(seed.name);
  const [exercises, setExercises] = useState<DraftExercise[]>(() =>
    seed.exercises.length > 0 ? seed.exercises.map(toDraft) : [makeExercise()],
  );
  // Optional manual calorie override (only ever seeded from an existing workout,
  // never from a template — a calorie count is session-specific, not part of a routine).
  const [calories, setCalories] = useState(
    seed.editing?.caloriesKcal != null ? String(seed.editing.caloriesKcal) : '',
  );

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
        const last = ex.sets[ex.sets.length - 1] ?? defaultSet();
        return { ...ex, sets: [...ex.sets, { ...last }] };
      }),
    );

  const removeSet = (key: number, index: number) =>
    setExercises((exs) =>
      exs.map((ex) =>
        ex.key === key ? { ...ex, sets: ex.sets.filter((_, i) => i !== index) } : ex,
      ),
    );

  const hasExercise = exercises.some((ex) => ex.name.trim() !== '');
  const canSave = date !== '' && date <= todayISO() && hasExercise;
  const canTemplate = name.trim() !== '' && hasExercise;
  const dirty = name.trim() !== '' || hasExercise;

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  /** Draft → domain exercises. Always fresh ids + fresh sets arrays (deep copy by construction). */
  const buildExercises = (): Exercise[] =>
    exercises
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
        durationMin: Number(ex.duration) > 0 ? Number(ex.duration) : undefined,
        distanceKm:
          ex.kind === 'cardio' && Number(ex.distance) > 0 ? Number(ex.distance) : undefined,
      }));

  const save = () => {
    const payload: Omit<Workout, 'id'> = {
      date,
      name: name.trim() || 'Workout',
      exercises: buildExercises(),
    };
    const notes = seed.editing?.notes;
    if (notes) payload.notes = notes;
    // Only attach a manual figure when the field holds a valid number; a blank
    // field omits it, so editing a workout and clearing the box reverts to the
    // MET estimate (updateWorkout replaces the record wholesale).
    const cal = Number(calories);
    if (calories.trim() !== '' && Number.isFinite(cal) && cal >= 0) {
      payload.caloriesKcal = Math.round(cal);
    }
    if (seed.editing) updateWorkout(seed.editing.id, payload);
    else addWorkout(payload);
    onDone();
  };

  const saveTemplate = () => {
    addTemplate({ name: name.trim(), exercises: buildExercises() });
  };

  /** Load a saved routine into the draft (name + a deep copy of its exercises). */
  const loadTemplate = (t: WorkoutTemplate) => {
    if (dirty && !window.confirm(`Replace the current draft with "${t.name}"?`)) return;
    setName(t.name);
    setExercises(t.exercises.length > 0 ? t.exercises.map(toDraft) : [makeExercise()]);
  };

  return (
    <section className="card">
      <CardTitle title={seed.editing ? 'Edit workout' : 'Log workout'} />
      {seed.editing && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-accent-wash px-3 py-2">
          <p className="text-sm text-ink2">
            Editing <span className="font-semibold text-ink">{seed.editing.name}</span>
            {' — '}
            {relativeDayLabel(seed.editing.date)}
          </p>
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {!seed.editing && templates.length > 0 && (
          <Field label="Start from template">
            <Select
              aria-label="Start from template"
              value=""
              onChange={(e) => {
                const t = templates.find((x) => x.id === e.target.value);
                if (t) loadTemplate(t);
                e.currentTarget.value = '';
              }}
            >
              <option value="">Choose a saved routine…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.exercises.length}{' '}
                  {t.exercises.length === 1 ? 'exercise' : 'exercises'}
                </option>
              ))}
            </Select>
          </Field>
        )}

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

        <Field label="Calories burned (optional)">
          <TextInput
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Auto-estimated from your exercises"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted">
            Leave blank to estimate from METs, or enter the number your watch or machine shows.
          </p>
        </Field>

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
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Duration (min)">
                    <TextInput
                      type="number"
                      min={0}
                      value={ex.duration}
                      onChange={(e) => updateExercise(ex.key, { duration: e.target.value })}
                    />
                    <p className="mt-1 text-xs text-muted">
                      Optional — improves the burn estimate (defaults to {MINUTES_PER_SET} min per
                      set).
                    </p>
                  </Field>
                </div>
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
          <Button variant="ghost" onClick={() => setExercises((exs) => [...exs, makeExercise()])}>
            + Add exercise
          </Button>
        </div>

        <datalist id="exercise-suggestions">
          {EXERCISE_SUGGESTIONS.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>

        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={!canSave} onClick={save}>
            {seed.editing ? 'Save changes' : 'Save workout'}
          </Button>
          <Button
            variant="ghost"
            disabled={!canTemplate}
            title="Save the current name and exercises as a reusable template"
            onClick={saveTemplate}
          >
            <BookmarkPlus size={14} />
            Save as template
          </Button>
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </div>
    </section>
  );
}
