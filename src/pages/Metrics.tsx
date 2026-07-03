import { useState } from 'react';
import { ChevronDown, HeartPulse, Pencil, Trash2 } from 'lucide-react';
import type { MetricEntry, Units } from '../types';
import { useAppStore } from '../store/useAppStore';
import { addDays, relativeDayLabel, todayISO } from '../lib/dates';
import {
  cmToDisplay,
  displayToCm,
  displayToKg,
  formatWeight,
  kgToDisplay,
  lengthUnit,
  weightUnit,
} from '../lib/units';
import { latestWeight, sleepSeries, weightSeries } from '../lib/stats';
import {
  Button,
  CardTitle,
  ChartEmpty,
  EmptyState,
  Field,
  IconButton,
  PageHeader,
  TextInput,
} from '../components/ui';
import { WeightChart } from '../components/WeightChart';
import { SleepChart } from '../components/SleepChart';
import { MoodPicker, moodEmoji, toMood, type Mood } from '../components/checkin/MoodPicker';

const MORE_KEYS = ['chest', 'hips', 'arm', 'thigh'] as const;
type MoreKey = (typeof MORE_KEYS)[number];
const MORE_LABELS: Record<MoreKey, string> = {
  chest: 'Chest',
  hips: 'Hips',
  arm: 'Arm',
  thigh: 'Thigh',
};
const EMPTY_MORE: Record<MoreKey, string> = { chest: '', hips: '', arm: '', thigh: '' };

function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Healthy range';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

function hasValues(m: MetricEntry): boolean {
  return (
    m.weightKg != null ||
    m.bodyFatPct != null ||
    m.waistCm != null ||
    m.chestCm != null ||
    m.hipsCm != null ||
    m.armCm != null ||
    m.thighCm != null ||
    m.sleepHours != null ||
    m.mood != null
  );
}

/** Compact labeled length chip, converted to display units; renders nothing when unset. */
function LenChip({ cm, label, units }: { cm: number | undefined; label: string; units: Units }) {
  if (cm == null) return null;
  return (
    <span className="chip bg-accent-wash text-ink2">
      {cmToDisplay(cm, units)} {lengthUnit(units)} {label}
    </span>
  );
}

function MetricRowEditor({
  entry,
  units,
  onSave,
  onCancel,
}: {
  entry: MetricEntry;
  units: Units;
  onSave: (patch: Partial<Omit<MetricEntry, 'id'>>) => void;
  onCancel: () => void;
}) {
  const numStr = (n: number | undefined) => (n != null ? String(n) : '');
  const lenStr = (cm: number | undefined) => (cm != null ? String(cmToDisplay(cm, units)) : '');

  const [weight, setWeight] = useState(
    entry.weightKg != null ? String(kgToDisplay(entry.weightKg, units)) : '',
  );
  const [bodyFat, setBodyFat] = useState(numStr(entry.bodyFatPct));
  const [waist, setWaist] = useState(lenStr(entry.waistCm));
  const [chest, setChest] = useState(lenStr(entry.chestCm));
  const [hips, setHips] = useState(lenStr(entry.hipsCm));
  const [arm, setArm] = useState(lenStr(entry.armCm));
  const [thigh, setThigh] = useState(lenStr(entry.thighCm));
  const [sleep, setSleep] = useState(numStr(entry.sleepHours));
  const [mood, setMood] = useState<Mood | undefined>(toMood(entry.mood));

  const wUnit = weightUnit(units);
  const lUnit = lengthUnit(units);
  const lengths: [string, string, (v: string) => void][] = [
    [`Waist (${lUnit})`, waist, setWaist],
    [`Chest (${lUnit})`, chest, setChest],
    [`Hips (${lUnit})`, hips, setHips],
    [`Arm (${lUnit})`, arm, setArm],
    [`Thigh (${lUnit})`, thigh, setThigh],
  ];

  const save = () => {
    const toCm = (s: string) => (s !== '' ? displayToCm(Number(s), units) : undefined);
    onSave({
      weightKg: weight !== '' ? displayToKg(Number(weight), units) : undefined,
      bodyFatPct: bodyFat !== '' ? Number(bodyFat) : undefined,
      waistCm: toCm(waist),
      chestCm: toCm(chest),
      hipsCm: toCm(hips),
      armCm: toCm(arm),
      thighCm: toCm(thigh),
      sleepHours: sleep !== '' ? Number(sleep) : undefined,
      mood,
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="rounded-xl border border-line bg-page p-3"
      // noValidate: stored values (e.g. sleep 6.4 h) aren't step-multiples; native
      // stepMismatch would silently block saving. JS parsing validates instead.
      noValidate
    >
      <p className="mb-2 text-xs font-medium text-ink2">Editing {relativeDayLabel(entry.date)}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label={`Weight (${wUnit})`}>
          <TextInput
            type="number"
            step={0.1}
            min={0}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </Field>
        <Field label="Body fat %">
          <TextInput
            type="number"
            step={0.1}
            min={0}
            max={75}
            value={bodyFat}
            onChange={(e) => setBodyFat(e.target.value)}
          />
        </Field>
        {lengths.map(([label, value, set]) => (
          <Field key={label} label={label}>
            <TextInput
              type="number"
              step={0.1}
              min={0}
              value={value}
              onChange={(e) => set(e.target.value)}
            />
          </Field>
        ))}
        <Field label="Sleep (h)">
          <TextInput
            type="number"
            step={0.25}
            min={0}
            max={24}
            value={sleep}
            onChange={(e) => setSleep(e.target.value)}
          />
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <MoodPicker value={mood} onChange={setMood} />
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Save changes
          </Button>
        </div>
      </div>
    </form>
  );
}

export default function Metrics() {
  const metrics = useAppStore((s) => s.metrics);
  const goals = useAppStore((s) => s.goals);
  const profile = useAppStore((s) => s.profile);
  const addMetric = useAppStore((s) => s.addMetric);
  const updateMetric = useAppStore((s) => s.updateMetric);
  const deleteMetric = useAppStore((s) => s.deleteMetric);

  const today = todayISO();
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [waist, setWaist] = useState('');
  const [sleep, setSleep] = useState('');
  const [more, setMore] = useState(EMPTY_MORE);
  const [mood, setMood] = useState<Mood | undefined>(undefined);
  const [moreOpen, setMoreOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const snap = latestWeight(metrics);
  const wUnit = weightUnit(goals.units);
  const lUnit = lengthUnit(goals.units);

  const canSave =
    date !== '' &&
    (weight !== '' ||
      bodyFat !== '' ||
      waist !== '' ||
      sleep !== '' ||
      MORE_KEYS.some((k) => more[k] !== '') ||
      mood != null);

  const save = () => {
    if (!canSave) return;
    const toCm = (s: string) => (s !== '' ? displayToCm(Number(s), goals.units) : undefined);
    addMetric({
      date,
      weightKg: weight !== '' ? displayToKg(Number(weight), goals.units) : undefined,
      bodyFatPct: bodyFat !== '' ? Number(bodyFat) : undefined,
      waistCm: toCm(waist),
      chestCm: toCm(more.chest),
      hipsCm: toCm(more.hips),
      armCm: toCm(more.arm),
      thighCm: toCm(more.thigh),
      sleepHours: sleep !== '' ? Number(sleep) : undefined,
      mood,
    });
    setWeight('');
    setBodyFat('');
    setWaist('');
    setSleep('');
    setMore(EMPTY_MORE);
    setMood(undefined);
  };

  const weightData = weightSeries(metrics).filter((p) => p.date >= addDays(today, -89));
  const hasSleep = metrics.some((m) => m.sleepHours != null);
  const rows = [...metrics].sort((a, b) => b.date.localeCompare(a.date));

  const heightCm = profile.heightCm;
  const bmi = heightCm != null && heightCm > 0 && snap ? snap.weightKg / (heightCm / 100) ** 2 : null;

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <PageHeader
        title="Body metrics"
        sub={
          snap
            ? `Current weight ${formatWeight(snap.weightKg, goals.units)}`
            : 'Log your first weigh-in'
        }
      />

      <section className="card">
        <CardTitle title="Log entry" />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          noValidate
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Field label="Date">
              <TextInput
                type="date"
                max={today}
                value={date}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v && v <= today) setDate(v);
                }}
              />
            </Field>
            <Field label={`Weight (${wUnit})`}>
              <TextInput
                type="number"
                step={0.1}
                min={0}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </Field>
            <Field label="Body fat %">
              <TextInput
                type="number"
                step={0.1}
                min={0}
                max={75}
                value={bodyFat}
                onChange={(e) => setBodyFat(e.target.value)}
              />
            </Field>
            <Field label={`Waist (${lUnit})`}>
              <TextInput
                type="number"
                step={0.1}
                min={0}
                value={waist}
                onChange={(e) => setWaist(e.target.value)}
              />
            </Field>
            <Field label="Sleep (h)">
              <TextInput
                type="number"
                step={0.25}
                min={0}
                max={24}
                value={sleep}
                onChange={(e) => setSleep(e.target.value)}
              />
            </Field>
          </div>

          <MoodPicker className="mt-3" label="Mood (optional)" value={mood} onChange={setMood} />

          <button
            type="button"
            aria-expanded={moreOpen}
            aria-controls="more-measurements"
            onClick={() => setMoreOpen((o) => !o)}
            className="mt-3 inline-flex items-center gap-1 rounded-lg text-xs font-medium text-ink2 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <ChevronDown
              size={14}
              aria-hidden
              className={`transition-transform ${moreOpen ? 'rotate-180' : ''}`}
            />
            More measurements
          </button>
          {moreOpen && (
            <div id="more-measurements" className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {MORE_KEYS.map((k) => (
                <Field key={k} label={`${MORE_LABELS[k]} (${lUnit})`}>
                  <TextInput
                    type="number"
                    step={0.1}
                    min={0}
                    value={more[k]}
                    onChange={(e) => setMore((v) => ({ ...v, [k]: e.target.value }))}
                  />
                </Field>
              ))}
            </div>
          )}

          <div className="mt-3">
            <Button type="submit" variant="primary" disabled={!canSave}>
              Save entry
            </Button>
          </div>
        </form>
      </section>

      <section className="card">
        <CardTitle title="BMI" sub="Body mass index" />
        {bmi != null ? (
          <>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-2xl font-semibold leading-none text-ink">{bmi.toFixed(1)}</span>
              <span className="chip bg-accent-wash text-ink2">{bmiCategory(bmi)}</span>
            </div>
            <p className="mt-1.5 text-xs text-muted">
              BMI ignores body composition — a muscular and a high-body-fat person can score the
              same.
            </p>
          </>
        ) : (
          <p className="text-sm text-ink2">
            {snap
              ? 'Set your height in Settings to see your BMI.'
              : 'Log a weigh-in (and set your height in Settings) to see your BMI.'}
          </p>
        )}
      </section>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <section className="card">
          <CardTitle title="Weight" sub="Last 90 days" />
          <WeightChart
            series={weightData}
            targetWeightKg={goals.targetWeightKg}
            units={goals.units}
          />
        </section>
        <section className="card">
          <CardTitle title="Sleep" sub="Last 14 days" />
          {hasSleep ? (
            <SleepChart data={sleepSeries(metrics, today, 14)} />
          ) : (
            <ChartEmpty message="Log sleep to see this chart." />
          )}
        </section>
      </div>

      <section className="card">
        <CardTitle title="All entries" />
        {metrics.length === 0 ? (
          <EmptyState
            icon={<HeartPulse size={22} />}
            title="No entries yet"
            body="Weight, body fat, measurements, sleep and mood will appear here."
          />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((m) =>
              editingId === m.id ? (
                <li key={m.id} className="py-3 first:pt-0 last:pb-0">
                  <MetricRowEditor
                    entry={m}
                    units={goals.units}
                    onSave={(patch) => {
                      updateMetric(m.id, patch);
                      setEditingId(null);
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                </li>
              ) : (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center gap-x-2 gap-y-1.5 py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="w-20 shrink-0 text-sm text-ink">{relativeDayLabel(m.date)}</span>
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                    {m.weightKg != null && (
                      <span className="chip bg-accent-wash text-ink2">
                        {formatWeight(m.weightKg, goals.units)}
                      </span>
                    )}
                    {m.bodyFatPct != null && (
                      <span className="chip bg-accent-wash text-ink2">{m.bodyFatPct}% fat</span>
                    )}
                    <LenChip cm={m.waistCm} label="waist" units={goals.units} />
                    <LenChip cm={m.chestCm} label="chest" units={goals.units} />
                    <LenChip cm={m.hipsCm} label="hips" units={goals.units} />
                    <LenChip cm={m.armCm} label="arm" units={goals.units} />
                    <LenChip cm={m.thighCm} label="thigh" units={goals.units} />
                    {m.sleepHours != null && (
                      <span className="chip bg-accent-wash text-ink2">{m.sleepHours} h sleep</span>
                    )}
                    {moodEmoji(m.mood) != null && (
                      <span
                        className="chip bg-accent-wash text-ink2"
                        title={`Mood ${m.mood} of 5`}
                      >
                        <span aria-hidden>{moodEmoji(m.mood)}</span>
                        <span className="sr-only">Mood {m.mood} of 5</span>
                      </span>
                    )}
                    {!hasValues(m) && <span className="text-xs text-muted">No values</span>}
                  </div>
                  <div className="flex shrink-0 items-center">
                    <IconButton variant="neutral" label="Edit entry" onClick={() => setEditingId(m.id)}>
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton
                      label="Delete entry"
                      onClick={() => {
                        if (window.confirm('Delete this entry?')) deleteMetric(m.id);
                      }}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
