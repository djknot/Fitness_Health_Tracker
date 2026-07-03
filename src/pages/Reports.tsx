import { useState } from 'react';
import { BarChart3, Dumbbell, Flame, Moon, Scale, Smile, Timer, Utensils, Weight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { formatMedium, todayISO } from '../lib/dates';
import { formatHoursMinutes } from '../lib/fasting';
import { dailyTargetInfo } from '../lib/recommend';
import {
  RANGE_OPTIONS,
  avgCaloriesPerWeek,
  avgSleepPerWeek,
  calorieAdherence,
  calorieSummary,
  dailyLogCounts,
  fastSummary,
  heatmapWeeks,
  inRange,
  moodSummary,
  rangeEndingAt,
  sleepSummary,
  weightChangeInRange,
  workoutsPerWeek,
  workoutSummary,
} from '../lib/reports';
import { loggedDates, logStreak, weightSeries } from '../lib/stats';
import { kgToDisplay, weightUnit } from '../lib/units';
import { CardTitle, ChartEmpty, EmptyState, PageHeader } from '../components/ui';
import { StatCard } from '../components/StatCard';
import { WeightChart } from '../components/WeightChart';
import { AdherenceBar } from '../components/reports/AdherenceBar';
import { ChartDetails } from '../components/reports/ChartDetails';
import { Heatmap } from '../components/reports/Heatmap';
import { WeeklyBarChart } from '../components/reports/WeeklyBarChart';

/** Mood 1–5 → face. */
const MOOD_EMOJI = ['😞', '🙁', '😐', '🙂', '😄'];

function RangePicker({ days, onChange }: { days: number; onChange: (days: number) => void }) {
  return (
    <div role="group" aria-label="Report range" className="flex flex-wrap gap-1.5">
      {RANGE_OPTIONS.map((o) => {
        const active = o.days === days;
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.days)}
            className={`chip transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              active ? 'bg-accent text-white' : 'bg-accent-wash text-ink2 hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function Reports() {
  const workouts = useAppStore((s) => s.workouts);
  const foods = useAppStore((s) => s.foods);
  const waterByDate = useAppStore((s) => s.waterByDate);
  const metrics = useAppStore((s) => s.metrics);
  const fasts = useAppStore((s) => s.fasts);
  const goals = useAppStore((s) => s.goals);
  const profile = useAppStore((s) => s.profile);
  const prefs = useAppStore((s) => s.prefs);

  const [days, setDays] = useState(56);

  const today = todayISO();
  const range = rangeEndingAt(today, days);
  const wUnit = weightUnit(goals.units);

  const hasData =
    workouts.length > 0 ||
    foods.length > 0 ||
    metrics.length > 0 ||
    fasts.length > 0 ||
    Object.values(waterByDate).some((ml) => ml > 0);

  if (!hasData) {
    return (
      <div className="flex flex-col gap-4 sm:gap-5">
        <PageHeader title="Reports" sub="Weekly and monthly summaries" />
        <section className="card">
          <EmptyState
            icon={<BarChart3 size={22} />}
            title="Nothing to report yet"
            body="Log workouts, food, water, or metrics and your trends will show up here."
          />
        </section>
      </div>
    );
  }

  // Summaries over the selected range only.
  const wSum = workoutSummary(workouts, range);
  const cSum = calorieSummary(foods, range);
  const change = weightChangeInRange(metrics, range);
  const sSum = sleepSummary(metrics, range);
  const mSum = moodSummary(metrics, range);
  const fSum = fastSummary(fasts, range);
  const streak = logStreak(loggedDates({ workouts, foods, metrics, waterByDate }), today);

  // Historic per-day targets are not stored, so adherence and the calories
  // reference line both use today's base target (pre earn-back).
  const baseTarget = dailyTargetInfo({ goals, profile, prefs, metrics, foods, workouts }, today).baseTarget;
  const adherence = calorieAdherence(foods, range, baseTarget);

  const weeklyWorkoutData = workoutsPerWeek(workouts, range);
  const weeklyCalorieData = avgCaloriesPerWeek(foods, range);
  const weeklySleepData = avgSleepPerWeek(metrics, range);
  const weightData = weightSeries(metrics).filter((p) => inRange(p.date, range));

  const counts = dailyLogCounts({ workouts, foods, metrics, waterByDate }, range);
  const weeks = heatmapWeeks(counts, range);

  let changeValue = '—';
  let changeSub = 'Needs 2+ weigh-ins in range';
  if (change) {
    const shown = kgToDisplay(change.changeKg, goals.units);
    changeValue = `${shown >= 0 ? '+' : ''}${shown} ${wUnit}`;
    changeSub = `${kgToDisplay(change.firstKg, goals.units)} → ${kgToDisplay(change.lastKg, goals.units)} ${wUnit}`;
  }

  const moodValue =
    mSum.avgMood != null
      ? `${MOOD_EMOJI[Math.min(4, Math.max(0, Math.round(mSum.avgMood) - 1))]} ${mSum.avgMood.toFixed(1)}`
      : '—';

  const weekLabel = (weekStart: string) => `Week of ${formatMedium(weekStart)}`;
  const kcalTarget = baseTarget.toLocaleString('en-US');

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <PageHeader
        title="Reports"
        sub={`Last ${range.days} days · ${formatMedium(range.start)} – ${formatMedium(range.end)}`}
        action={<RangePicker days={days} onChange={setDays} />}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          icon={Dumbbell}
          label="Workouts"
          value={String(wSum.count)}
          sub={`${wSum.perWeek} per week avg`}
        />
        <StatCard
          icon={Weight}
          label="Volume lifted"
          value={`${Math.round(kgToDisplay(wSum.totalVolumeKg, goals.units)).toLocaleString('en-US')} ${wUnit}`}
          sub="total in range"
        />
        <StatCard
          icon={Utensils}
          label="Avg calories"
          value={cSum.avgCalories != null ? `${cSum.avgCalories.toLocaleString('en-US')} kcal` : '—'}
          sub={`${cSum.loggedDays} of ${range.days} days logged`}
        />
        <StatCard icon={Scale} label="Weight change" value={changeValue} sub={changeSub} />
        <StatCard
          icon={Moon}
          label="Avg sleep"
          value={sSum.avgHours != null ? `${sSum.avgHours} h` : '—'}
          sub={`${sSum.loggedDays} ${sSum.loggedDays === 1 ? 'night' : 'nights'} logged`}
        />
        <StatCard
          icon={Smile}
          label="Avg mood"
          value={moodValue}
          sub={`of 5 · ${mSum.loggedDays} ${mSum.loggedDays === 1 ? 'day' : 'days'} logged`}
        />
        <StatCard
          icon={Timer}
          label="Fasts completed"
          value={String(fSum.completed)}
          sub={fSum.avgHours != null ? `${formatHoursMinutes(fSum.avgHours)} avg` : 'in this range'}
        />
        <StatCard
          icon={Flame}
          label="Current streak"
          value={`${streak} ${streak === 1 ? 'day' : 'days'}`}
          sub="consecutive days logged"
        />
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <section className="card">
          <CardTitle title="Workouts per week" sub={`Goal ${goals.weeklyWorkouts} per week`} />
          {wSum.count > 0 ? (
            <>
              <WeeklyBarChart
                data={weeklyWorkoutData}
                integerY
                formatValue={(v) => `${v} ${v === 1 ? 'workout' : 'workouts'}`}
                refValue={goals.weeklyWorkouts}
                refLabel="goal"
              />
              <ChartDetails
                caption="Workouts per week"
                columns={['Week', 'Workouts']}
                rows={weeklyWorkoutData.map((w) => ({
                  label: weekLabel(w.weekStart),
                  value: String(w.value),
                }))}
              />
            </>
          ) : (
            <ChartEmpty message="No workouts in this range." />
          )}
        </section>

        <section className="card">
          <CardTitle
            title="Calories per week"
            sub={`Avg on logged days · current target ${kcalTarget} kcal`}
          />
          {cSum.loggedDays > 0 ? (
            <>
              <WeeklyBarChart
                data={weeklyCalorieData}
                formatValue={(v) => `${v.toLocaleString('en-US')} kcal avg`}
                refValue={baseTarget}
                refLabel="current target"
              />
              <ChartDetails
                caption="Average calories on logged days per week"
                columns={['Week', 'Avg calories']}
                rows={weeklyCalorieData.map((w) => ({
                  label: weekLabel(w.weekStart),
                  value: w.value != null ? `${w.value.toLocaleString('en-US')} kcal` : '—',
                }))}
              />
            </>
          ) : (
            <ChartEmpty message="No food logged in this range." />
          )}
        </section>

        <section className="card">
          <CardTitle
            title="Weight trend"
            sub={`${weightData.length} ${weightData.length === 1 ? 'weigh-in' : 'weigh-ins'} in range`}
          />
          <WeightChart series={weightData} targetWeightKg={goals.targetWeightKg} units={goals.units} />
          {weightData.length >= 2 && (
            <ChartDetails
              caption="Weigh-ins in range"
              columns={['Date', `Weight (${wUnit})`]}
              rows={weightData.map((p) => ({
                label: formatMedium(p.date),
                value: String(kgToDisplay(p.weightKg, goals.units)),
              }))}
            />
          )}
        </section>

        <section className="card">
          <CardTitle title="Sleep per week" sub="Avg hours on logged nights" />
          {sSum.loggedDays > 0 ? (
            <>
              <WeeklyBarChart
                data={weeklySleepData}
                formatValue={(v) => `${v} h avg`}
              />
              <ChartDetails
                caption="Average sleep per week"
                columns={['Week', 'Avg sleep']}
                rows={weeklySleepData.map((w) => ({
                  label: weekLabel(w.weekStart),
                  value: w.value != null ? `${w.value} h` : '—',
                }))}
              />
            </>
          ) : (
            <ChartEmpty message="No sleep logged in this range." />
          )}
        </section>
      </div>

      <section className="card">
        <CardTitle
          title="Calorie adherence"
          sub={`Logged days vs current target ${kcalTarget} kcal · ±10%`}
        />
        {adherence.loggedDays > 0 ? (
          <>
            <AdherenceBar adherence={adherence} />
            <p className="mt-3 text-sm text-ink2">
              <span className="font-semibold text-ink">{adherence.withinPct}%</span> of logged days
              within ±10% of your current target
            </p>
          </>
        ) : (
          <ChartEmpty className="h-24" message="Log food to see adherence." />
        )}
      </section>

      <section className="card">
        <CardTitle
          title="Consistency"
          sub={`Active ${counts.size} of ${range.days} days · darker cells mean more logs`}
        />
        <Heatmap weeks={weeks} activeDays={counts.size} totalDays={range.days} />
      </section>
    </div>
  );
}
