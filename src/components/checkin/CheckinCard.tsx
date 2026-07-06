import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { MetricEntry } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { todayISO } from '../../lib/dates';
import { displayToKg, formatWeight, kgToDisplay, weightUnit } from '../../lib/units';
import { latestWeight } from '../../lib/stats';
import { Button, CardTitle, Field, TextInput } from '../ui';
import { MoodPicker, moodDesc, moodEmoji, toMood, type Mood } from './MoodPicker';

const parseNum = (s: string): number | null => {
  if (s.trim() === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/**
 * One-tap daily check-in: weight, sleep and mood for the selected day.
 * Shows a compact summary once all three are logged; otherwise a quick form
 * that patches that day's metric entry (or creates one). The parent remounts
 * this card when `date` changes so the drafts re-seed from the new day.
 */
export function CheckinCard({ date }: { date: string }) {
  const metrics = useAppStore((s) => s.metrics);
  const goals = useAppStore((s) => s.goals);
  const addMetric = useAppStore((s) => s.addMetric);
  const updateMetric = useAppStore((s) => s.updateMetric);

  const dayEntries = metrics.filter((m) => m.date === date);
  // The check-in always patches the most recently added entry for the day, so
  // merge the day's fields the same way (last defined value wins).
  const merged: Pick<MetricEntry, 'weightKg' | 'sleepHours' | 'mood'> = {};
  for (const m of dayEntries) {
    if (m.weightKg != null) merged.weightKg = m.weightKg;
    if (m.sleepHours != null) merged.sleepHours = m.sleepHours;
    if (m.mood != null) merged.mood = m.mood;
  }

  const wUnit = weightUnit(goals.units);
  // Prefill the day's own weigh-in; fall back to the latest weight ONLY for today,
  // so saving a sleep/mood-only check-in on a past day can't fabricate a weight
  // measurement for a day the user never weighed in on.
  const prefillKg =
    merged.weightKg ?? (date === todayISO() ? latestWeight(metrics)?.weightKg : undefined);
  const [weight, setWeight] = useState(() =>
    prefillKg != null ? String(kgToDisplay(prefillKg, goals.units)) : '',
  );
  const [sleep, setSleep] = useState(() =>
    merged.sleepHours != null ? String(merged.sleepHours) : '',
  );
  const [mood, setMood] = useState<Mood | undefined>(() => toMood(merged.mood));

  const checkedIn =
    merged.weightKg != null && merged.sleepHours != null && toMood(merged.mood) != null;

  const weightNum = parseNum(weight);
  const sleepNum = parseNum(sleep);
  const weightOk = weightNum != null && weightNum > 0;
  const sleepOk = sleepNum != null && sleepNum >= 0 && sleepNum <= 24;
  const canSave = weightOk || sleepOk || mood != null;

  const save = () => {
    if (!canSave) return;
    const patch: Partial<Omit<MetricEntry, 'id'>> = {};
    if (weightOk) patch.weightKg = displayToKg(weightNum, goals.units);
    if (sleepOk) patch.sleepHours = sleepNum;
    if (mood != null) patch.mood = mood;
    const existing = dayEntries[dayEntries.length - 1];
    if (existing) updateMetric(existing.id, patch);
    else addMetric({ date, ...patch });
  };

  return (
    <section className="card">
      <CardTitle
        title="Daily check-in"
        sub={checkedIn ? 'All logged for this day' : 'Weight, sleep and mood in one tap'}
        action={
          checkedIn ? (
            <span className="chip bg-accent-wash text-accent">
              <CheckCircle2 size={13} aria-hidden />
              Checked in
            </span>
          ) : undefined
        }
      />

      {checkedIn ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="chip bg-accent-wash text-ink2">
            {formatWeight(merged.weightKg as number, goals.units)}
          </span>
          <span className="chip bg-accent-wash text-ink2">{merged.sleepHours} h sleep</span>
          <span className="chip bg-accent-wash text-ink2" title={`Mood: ${merged.mood} of 5`}>
            <span aria-hidden>{moodEmoji(merged.mood)}</span>
            {moodDesc(merged.mood)}
          </span>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[8rem_7rem_auto] sm:items-end">
            <Field label={`Weight (${wUnit})`}>
              <TextInput
                type="number"
                step="any"
                min={0}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </Field>
            <Field label="Sleep (h)">
              <TextInput
                type="number"
                step="any"
                min={0}
                max={24}
                value={sleep}
                onChange={(e) => setSleep(e.target.value)}
              />
            </Field>
            <MoodPicker className="col-span-2 sm:col-span-1" value={mood} onChange={setMood} />
          </div>
          <div className="mt-3">
            <Button type="submit" variant="primary" disabled={!canSave}>
              Save check-in
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
