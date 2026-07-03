import { useAppStore } from '../../store/useAppStore';
import {
  ADAPTIVE_MIN_DAY_KCAL,
  ADAPTIVE_MIN_LOGGED_DAYS,
  ADAPTIVE_MIN_SPAN_DAYS,
  ADAPTIVE_WINDOW_DAYS,
  computeAdaptiveTdee,
} from '../../lib/adaptive';
import { dailyTargetInfo } from '../../lib/recommend';
import { todayISO } from '../../lib/dates';
import { kgToDisplay, weightUnit } from '../../lib/units';
import { CardTitle } from '../ui';

const fmt = (n: number) => n.toLocaleString('en-US');

/** Accessible toggle: a real checkbox (sr-only) driving a styled switch track. */
function SwitchRow({
  label,
  help,
  checked,
  onChange,
}: {
  label: string;
  help: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-2.5">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="mt-0.5 block text-xs text-muted">{help}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        aria-hidden="true"
        className="relative h-5 w-9 shrink-0 rounded-full bg-line transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-4"
      />
    </label>
  );
}

const SOURCE_LABELS = {
  manual: 'Manual goal',
  recommended: 'Recommended',
  'recommended-adaptive': 'Self-calibrated',
} as const;

/**
 * v0.2 calorie-target options: exercise earn-back + self-calibrating TDEE.
 * Toggles write prefs immediately; the panel always shows today's effective
 * target so the user sees exactly what the app tracks against.
 */
export default function TargetOptions() {
  const goals = useAppStore((s) => s.goals);
  const profile = useAppStore((s) => s.profile);
  const prefs = useAppStore((s) => s.prefs);
  const metrics = useAppStore((s) => s.metrics);
  const foods = useAppStore((s) => s.foods);
  const workouts = useAppStore((s) => s.workouts);
  const setPrefs = useAppStore((s) => s.setPrefs);

  const today = todayISO();
  const info = dailyTargetInfo({ goals, profile, prefs, metrics, foods, workouts }, today, today);
  const rec = info.recommendation;
  const adaptive =
    prefs.adaptiveTdee && rec ? computeAdaptiveTdee({ foods, metrics }, today, rec.tdee) : null;

  const units = goals.units;
  const deltaStr =
    adaptive != null
      ? `${adaptive.deltaKg >= 0 ? '+' : ''}${kgToDisplay(adaptive.deltaKg, units)} ${weightUnit(units)}`
      : '';

  return (
    <section className="card">
      <CardTitle
        title="Calorie target options"
        sub="Fine-tune how the daily calorie target is computed. Changes apply immediately."
      />

      <div className="divide-y divide-line">
        <SwitchRow
          label="Earn back exercise calories"
          help={"Adds each day's estimated workout burn to that day's calorie target."}
          checked={prefs.earnBackExercise}
          onChange={(v) => setPrefs({ earnBackExercise: v })}
        />
        <SwitchRow
          label="Self-calibrating TDEE"
          help="Calibrates maintenance calories from logged intake vs your actual weight trend."
          checked={prefs.adaptiveTdee}
          onChange={(v) => setPrefs({ adaptiveTdee: v })}
        />
      </div>

      {prefs.adaptiveTdee && (
        <div className="mt-3 flex flex-col gap-1 rounded-xl bg-page p-3 text-sm">
          {!rec ? (
            <p className="text-xs text-muted">
              Self-calibration starts from the formula estimate. Add height, age and sex in the
              profile above and log a weigh-in on the Metrics page to enable it.
            </p>
          ) : adaptive ? (
            <>
              <p className="font-semibold text-ink">
                Observed TDEE {fmt(adaptive.observedTdee)} kcal vs formula {fmt(rec.tdee)} kcal
              </p>
              <div className="flex justify-between text-ink2">
                <span>Days used</span>
                <span>{adaptive.daysUsed} fully-logged days</span>
              </div>
              <div className="flex justify-between text-ink2">
                <span>Weight change</span>
                <span>
                  {deltaStr} over {adaptive.spanDays} days
                </span>
              </div>
              <div className="flex justify-between text-ink2">
                <span>Average intake</span>
                <span>{fmt(adaptive.avgIntake)} kcal/day</span>
              </div>
              {adaptive.clamped && (
                <p className="text-xs text-bad">
                  Estimate hit the sanity clamp around the formula TDEE — treat it with caution and
                  keep logging consistently.
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-muted">
              Not enough data yet. Self-calibration needs at least {ADAPTIVE_MIN_LOGGED_DAYS}{' '}
              fully-logged days of {fmt(ADAPTIVE_MIN_DAY_KCAL)}+ kcal and weigh-ins spanning at
              least {ADAPTIVE_MIN_SPAN_DAYS} days, all within the last {ADAPTIVE_WINDOW_DAYS} days.
              It kicks in automatically once enough data exists.
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-1 rounded-xl bg-page p-3 text-sm">
        <div className="flex items-center justify-between gap-2 font-semibold text-ink">
          <span>{"Today's target"}</span>
          <span>{fmt(info.target)} kcal</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="chip bg-accent-wash text-ink2">{SOURCE_LABELS[info.source]}</span>
          {info.burnKcal > 0 && (
            <span className="text-xs text-muted">
              includes +{fmt(info.burnKcal)} kcal earned back from exercise
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
