import { useState } from 'react';
import { HeartPulse, Trash2 } from 'lucide-react';
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

function NumCell({ value }: { value: number | undefined }) {
  return (
    <td className="py-2 pr-3 tabular-nums text-ink2">
      {value != null ? value : <span className="text-muted">—</span>}
    </td>
  );
}

export default function Metrics() {
  const metrics = useAppStore((s) => s.metrics);
  const goals = useAppStore((s) => s.goals);
  const addMetric = useAppStore((s) => s.addMetric);
  const deleteMetric = useAppStore((s) => s.deleteMetric);

  const today = todayISO();
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [waist, setWaist] = useState('');
  const [sleep, setSleep] = useState('');

  const snap = latestWeight(metrics);
  const wUnit = weightUnit(goals.units);
  const lUnit = lengthUnit(goals.units);

  const canSave =
    date !== '' && (weight !== '' || bodyFat !== '' || waist !== '' || sleep !== '');

  const save = () => {
    if (!canSave) return;
    addMetric({
      date,
      weightKg: weight !== '' ? displayToKg(Number(weight), goals.units) : undefined,
      bodyFatPct: bodyFat !== '' ? Number(bodyFat) : undefined,
      waistCm: waist !== '' ? displayToCm(Number(waist), goals.units) : undefined,
      sleepHours: sleep !== '' ? Number(sleep) : undefined,
    });
    setWeight('');
    setBodyFat('');
    setWaist('');
    setSleep('');
  };

  const weightData = weightSeries(metrics).filter((p) => p.date >= addDays(today, -89));
  const hasSleep = metrics.some((m) => m.sleepHours != null);
  const rows = [...metrics].sort((a, b) => b.date.localeCompare(a.date));

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
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Field label="Date">
              <TextInput
                type="date"
                max={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
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
          <div className="mt-3">
            <Button type="submit" variant="primary" disabled={!canSave}>
              Save entry
            </Button>
          </div>
        </form>
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
            body="Weight, body fat, waist and sleep will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">{`Weight (${wUnit})`}</th>
                  <th className="py-2 pr-3 font-medium">Body fat %</th>
                  <th className="py-2 pr-3 font-medium">{`Waist (${lUnit})`}</th>
                  <th className="py-2 pr-3 font-medium">Sleep (h)</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2 pr-3 text-ink">{relativeDayLabel(m.date)}</td>
                    <NumCell
                      value={m.weightKg != null ? kgToDisplay(m.weightKg, goals.units) : undefined}
                    />
                    <NumCell value={m.bodyFatPct} />
                    <NumCell
                      value={m.waistCm != null ? cmToDisplay(m.waistCm, goals.units) : undefined}
                    />
                    <NumCell value={m.sleepHours} />
                    <td className="py-1 text-right">
                      <IconButton
                        label="Delete entry"
                        onClick={() => {
                          if (window.confirm('Delete this entry?')) deleteMetric(m.id);
                        }}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
