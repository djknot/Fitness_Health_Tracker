import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplets, Dumbbell, Flame, Utensils } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { addDays, formatLong, relativeDayLabel, todayISO } from '../lib/dates';
import {
  caloriesSeries,
  latestWeight,
  loggedDates,
  logStreak,
  nutritionOn,
  weightSeries,
  workoutCardioMin,
  workoutSetCount,
  workoutsInWeekOf,
  workoutVolumeKg,
} from '../lib/stats';
import { dailyTargetInfo } from '../lib/recommend';
import { formatWeight, kgToDisplay, weightUnit } from '../lib/units';
import { sampleData } from '../lib/sample';
import { Button, CardTitle, PageHeader } from '../components/ui';
import { Meter } from '../components/Meter';
import { StatCard } from '../components/StatCard';
import { CheckinCard } from '../components/checkin/CheckinCard';
import { WeightChart } from '../components/WeightChart';
import { CaloriesChart } from '../components/CaloriesChart';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const workouts = useAppStore((s) => s.workouts);
  const foods = useAppStore((s) => s.foods);
  const waterByDate = useAppStore((s) => s.waterByDate);
  const metrics = useAppStore((s) => s.metrics);
  const goals = useAppStore((s) => s.goals);
  const profile = useAppStore((s) => s.profile);
  const prefs = useAppStore((s) => s.prefs);
  const dataVersion = useAppStore((s) => s.dataVersion);
  const replaceAll = useAppStore((s) => s.replaceAll);

  const today = todayISO();
  const hasData =
    workouts.length > 0 ||
    foods.length > 0 ||
    metrics.length > 0 ||
    Object.values(waterByDate).some((ml) => ml > 0);

  if (!hasData) {
    return (
      <div className="flex flex-col gap-4 sm:gap-5">
        <PageHeader title={greeting()} sub={formatLong(today)} />
        <section className="card">
          <h2 className="text-sm font-semibold text-ink">Welcome to FitTrack</h2>
          <p className="mt-1 max-w-md text-sm text-ink2">
            Track workouts, nutrition, and body metrics — everything stays on this device.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => navigate('/workouts')}>Log a workout</Button>
            <Button variant="ghost" onClick={() => replaceAll(sampleData(todayISO()))}>
              Load sample data
            </Button>
          </div>
        </section>
      </div>
    );
  }

  const day = nutritionOn(foods, today);
  const targetInfo = dailyTargetInfo({ goals, profile, prefs, metrics, foods, workouts }, today);
  const weekCount = workoutsInWeekOf(workouts, today).length;
  const streak = logStreak(loggedDates({ workouts, foods, metrics, waterByDate }), today);
  const water = waterByDate[today] ?? 0;

  const snap = latestWeight(metrics);
  let weightSub = 'Last 30 days';
  if (snap) weightSub += ` · now ${formatWeight(snap.weightKg, goals.units)}`;
  if (goals.targetWeightKg != null) {
    weightSub += ` · goal ${formatWeight(goals.targetWeightKg, goals.units)}`;
  }

  let deltaAction: ReactNode = null;
  if (snap && snap.deltaKg != null) {
    const delta = snap.deltaKg;
    const target = goals.targetWeightKg;
    let good: boolean | null = null;
    if (target != null) {
      // Compare distance-to-goal before vs after so reaching or crossing the
      // target still counts as progress.
      const distNow = Math.abs(snap.weightKg - target);
      const distBefore = Math.abs(snap.weightKg - delta - target);
      good = distNow < distBefore ? true : distNow > distBefore ? false : null;
    }
    const shown = kgToDisplay(delta, goals.units);
    const colorClass = good === null ? 'text-ink2' : good ? 'text-good' : 'text-bad';
    deltaAction = (
      <span className={`text-xs font-medium ${colorClass}`}>
        {shown >= 0 ? '+' : ''}
        {shown} {weightUnit(goals.units)} vs last
      </span>
    );
  }

  const recent = [...workouts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <PageHeader title={greeting()} sub={formatLong(today)} />

      <CheckinCard key={dataVersion} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          icon={Utensils}
          label="Calories today"
          value={day.calories.toLocaleString('en-US')}
          sub={`of ${targetInfo.target.toLocaleString('en-US')} kcal ${
            targetInfo.source === 'manual' ? 'target' : 'recommended'
          }`}
        >
          {(targetInfo.burnKcal > 0 || targetInfo.source === 'recommended-adaptive') && (
            <div className="flex flex-wrap items-center gap-1.5">
              {targetInfo.burnKcal > 0 && (
                <span
                  className="text-xs font-medium text-ink2"
                  title={`Estimated ${targetInfo.burnKcal.toLocaleString('en-US')} kcal burned in today's workouts, added to your ${targetInfo.baseTarget.toLocaleString('en-US')} kcal base target.`}
                >
                  +{targetInfo.burnKcal.toLocaleString('en-US')} earned back
                </span>
              )}
              {targetInfo.source === 'recommended-adaptive' && (
                <span
                  className="chip bg-accent-wash px-2 py-0.5 text-accent"
                  title="Target recalibrated from your logged intake and actual weight trend over the last 4 weeks."
                >
                  adaptive
                </span>
              )}
            </div>
          )}
          <Meter
            value={day.calories}
            max={targetInfo.target}
            overIsBad
            label="Calories today"
            className="mt-1"
          />
        </StatCard>
        <StatCard
          icon={Droplets}
          label="Water"
          value={`${water.toLocaleString('en-US')} ml`}
          sub={`of ${goals.dailyWaterMl.toLocaleString('en-US')} ml`}
        >
          <Meter value={water} max={goals.dailyWaterMl} label="Water" className="mt-1" />
        </StatCard>
        <StatCard
          icon={Dumbbell}
          label="Workouts this week"
          value={String(weekCount)}
          sub={`of ${goals.weeklyWorkouts} planned`}
        >
          <Meter
            value={weekCount}
            max={goals.weeklyWorkouts}
            label="Workouts this week"
            className="mt-1"
          />
        </StatCard>
        <StatCard
          icon={Flame}
          label="Logging streak"
          value={`${streak} ${streak === 1 ? 'day' : 'days'}`}
          sub="consecutive days logged"
        />
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <section className="card">
          <CardTitle title="Weight trend" sub={weightSub} action={deltaAction} />
          <WeightChart
            series={weightSeries(metrics).filter((p) => p.date >= addDays(today, -29))}
            targetWeightKg={goals.targetWeightKg}
            units={goals.units}
          />
        </section>
        <section className="card">
          {/* Reference line = base target (before today's earn-back), so it reads
              sensibly across all 7 days rather than being inflated by today's workout. */}
          <CardTitle
            title="Calories"
            sub={`Last 7 days · target ${targetInfo.baseTarget.toLocaleString('en-US')} kcal`}
          />
          <CaloriesChart data={caloriesSeries(foods, today, 7)} target={targetInfo.baseTarget} />
        </section>
      </div>

      <section className="card">
        <CardTitle
          title="Recent workouts"
          action={
            <Button variant="ghost" onClick={() => navigate('/workouts')}>
              View all
            </Button>
          }
        />
        {recent.length === 0 ? (
          <p className="text-sm text-muted">No workouts yet — log your first one.</p>
        ) : (
          <ul className="divide-y divide-line">
            {recent.map((w) => {
              const sets = workoutSetCount(w);
              const volumeKg = workoutVolumeKg(w);
              const cardioMin = workoutCardioMin(w);
              return (
                <li
                  key={w.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{w.name}</p>
                    <p className="text-xs text-muted">{relativeDayLabel(w.date, today)}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                    {sets > 0 && <span className="chip bg-accent-wash text-ink2">{sets} sets</span>}
                    {volumeKg > 0 && (
                      <span className="chip bg-accent-wash text-ink2">
                        {Math.round(kgToDisplay(volumeKg, goals.units)).toLocaleString('en-US')}{' '}
                        {weightUnit(goals.units)}
                      </span>
                    )}
                    {cardioMin > 0 && (
                      <span className="chip bg-accent-wash text-ink2">{cardioMin} min</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
