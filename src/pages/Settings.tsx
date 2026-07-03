import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Download, FlaskConical, Trash2, Upload } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { ActivityLevel, AppData, Profile, Sex, Units } from '../types';
import { todayISO } from '../lib/dates';
import {
  cmToDisplay,
  displayToCm,
  displayToKg,
  kgToDisplay,
  lengthUnit,
  weightUnit,
} from '../lib/units';
import { latestWeight } from '../lib/stats';
import { ACTIVITY_LABELS, MAX_WEEKLY_RATE_KG, recommend } from '../lib/recommend';
import { downloadTextFile, parseBackup, serializeBackup } from '../lib/backup';
import { sampleData } from '../lib/sample';
import { Button, CardTitle, Field, PageHeader, Select, TextInput } from '../components/ui';

/** Show a transient "Saved ✓" flag for 2 s; the timer is cleared on unmount. */
function useSavedFlash(): [boolean, () => void] {
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );
  const flash = () => {
    setSaved(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSaved(false), 2000);
  };
  return [saved, flash];
}

/** '' or non-numeric → undefined, else the parsed number. */
function numOrUndefined(s: string): number | undefined {
  const t = s.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/** Parse a positive number, falling back when blank/invalid/non-positive. */
function positiveOr(s: string, fallback: number): number {
  const n = numOrUndefined(s);
  return n != null && n > 0 ? n : fallback;
}

/** "height", "height and age", "height, age and sex" */
function listJoin(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function SettingsView() {
  const metrics = useAppStore((s) => s.metrics);
  const goals = useAppStore((s) => s.goals);
  const profile = useAppStore((s) => s.profile);
  const setGoals = useAppStore((s) => s.setGoals);
  const setProfile = useAppStore((s) => s.setProfile);
  const replaceAll = useAppStore((s) => s.replaceAll);
  const resetAll = useAppStore((s) => s.resetAll);

  // ----- Goals & units drafts (seeded once from the store) -----
  const [draftUnits, setDraftUnits] = useState<Units>(goals.units);
  const [calories, setCalories] = useState(() => String(goals.dailyCalories));
  const [water, setWater] = useState(() => String(goals.dailyWaterMl));
  const [weekly, setWeekly] = useState(() => String(goals.weeklyWorkouts));
  const [targetWeight, setTargetWeight] = useState(() =>
    goals.targetWeightKg != null ? String(kgToDisplay(goals.targetWeightKg, goals.units)) : '',
  );
  const [goalsSaved, flashGoalsSaved] = useSavedFlash();

  const onUnitsChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as Units;
    if (next === draftUnits) return;
    // Keep every weight/length draft equivalent across the unit switch —
    // they are parsed with draftUnits, so value and unit must move together.
    const convertWeight = (prev: string) => {
      const n = numOrUndefined(prev);
      return n == null ? prev : String(kgToDisplay(displayToKg(n, draftUnits), next));
    };
    const convertLength = (prev: string) => {
      const n = numOrUndefined(prev);
      return n == null ? prev : String(cmToDisplay(displayToCm(n, draftUnits), next));
    };
    setTargetWeight(convertWeight);
    setPace(convertWeight);
    setHeight(convertLength);
    setDraftUnits(next);
  };

  const saveGoals = () => {
    const target = numOrUndefined(targetWeight);
    setGoals({
      units: draftUnits,
      dailyCalories: positiveOr(calories, goals.dailyCalories),
      dailyWaterMl: positiveOr(water, goals.dailyWaterMl),
      weeklyWorkouts: positiveOr(weekly, goals.weeklyWorkouts),
      targetWeightKg: target != null && target > 0 ? displayToKg(target, draftUnits) : undefined,
    });
    flashGoalsSaved();
  };

  // ----- Profile drafts (seeded once from the store) -----
  const [height, setHeight] = useState(() =>
    profile.heightCm != null ? String(cmToDisplay(profile.heightCm, goals.units)) : '',
  );
  const [age, setAge] = useState(() => (profile.age != null ? String(profile.age) : ''));
  const [sex, setSex] = useState<'' | Sex>(profile.sex ?? '');
  const [activity, setActivity] = useState<ActivityLevel>(profile.activityLevel);
  const [pace, setPace] = useState(() => String(kgToDisplay(profile.weeklyRateKg, goals.units)));
  // NOTE: height/pace drafts are always interpreted with draftUnits (never
  // goals.units) — onUnitsChange converts them in lockstep with the select.
  const [useRec, setUseRec] = useState(profile.useRecommendedTarget);
  const [profileSaved, flashProfileSaved] = useSavedFlash();

  const heightNum = numOrUndefined(height);
  const paceNum = numOrUndefined(pace);
  const draftProfile: Profile = {
    heightCm: heightNum != null ? displayToCm(heightNum, draftUnits) : undefined,
    age: numOrUndefined(age),
    sex: sex === '' ? undefined : sex,
    activityLevel: activity,
    weeklyRateKg: paceNum != null ? displayToKg(paceNum, draftUnits) : 0.5,
    useRecommendedTarget: useRec,
  };
  const currentWeightKg = latestWeight(metrics)?.weightKg;
  const rec = recommend(draftProfile, currentWeightKg, goals.targetWeightKg);

  const effectiveRateKg = Math.min(Math.abs(draftProfile.weeklyRateKg) || 0.5, MAX_WEEKLY_RATE_KG);
  const paceDisplay = kgToDisplay(effectiveRateKg, draftUnits);

  const missing: string[] = [];
  if (draftProfile.heightCm == null || draftProfile.heightCm <= 0) missing.push('height');
  if (draftProfile.age == null || draftProfile.age <= 0) missing.push('age');
  if (draftProfile.sex == null) missing.push('sex');
  if (currentWeightKg == null || currentWeightKg <= 0) missing.push('a logged weigh-in (Metrics page)');

  const saveProfile = () => {
    setProfile({
      heightCm: draftProfile.heightCm,
      age: draftProfile.age,
      sex: draftProfile.sex,
      activityLevel: activity,
      weeklyRateKg: draftProfile.weeklyRateKg,
      useRecommendedTarget: useRec,
    });
    flashProfileSaved();
  };

  // ----- Your data actions -----
  const exportBackup = () => {
    downloadTextFile(
      `fittrack-backup-${todayISO()}.json`,
      serializeBackup(useAppStore.getState()),
    );
  };

  const onImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const input = e.target;
    file
      .text()
      .then((text) => {
        let d: AppData;
        try {
          d = parseBackup(text);
        } catch (err) {
          window.alert((err as Error).message);
          return;
        }
        if (
          window.confirm(
            `Replace current data with this backup? (${d.workouts.length} workouts, ${d.foods.length} food entries, ${d.metrics.length} metric entries)`,
          )
        ) {
          replaceAll(d);
        }
      })
      .catch(() => window.alert('Could not read that file.'))
      .finally(() => {
        input.value = '';
      });
  };

  const loadSample = () => {
    if (window.confirm('Replace current data with sample data?')) {
      replaceAll(sampleData(todayISO()));
    }
  };

  const deleteAll = () => {
    if (
      window.confirm('Delete all FitTrack data from this browser?') &&
      window.confirm('This cannot be undone. Are you sure?')
    ) {
      resetAll();
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <PageHeader title="Settings" />

      <section className="card">
        <CardTitle title="Goals & units" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Units">
            <Select value={draftUnits} onChange={onUnitsChange}>
              <option value="metric">Metric (kg, cm)</option>
              <option value="imperial">Imperial (lb, in)</option>
            </Select>
          </Field>
          <Field label="Daily calories (manual target)">
            <TextInput
              type="number"
              min={0}
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
            />
          </Field>
          <Field label="Daily water (ml)">
            <TextInput
              type="number"
              min={0}
              value={water}
              onChange={(e) => setWater(e.target.value)}
            />
          </Field>
          <Field label="Weekly workout goal">
            <TextInput
              type="number"
              min={0}
              value={weekly}
              onChange={(e) => setWeekly(e.target.value)}
            />
          </Field>
          <Field label={`Target weight (${weightUnit(draftUnits)})`}>
            <TextInput
              type="number"
              min={0}
              step={0.1}
              placeholder="none"
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
            />
          </Field>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={saveGoals}>Save</Button>
          {goalsSaved && <span className="text-xs text-good">Saved ✓</span>}
        </div>
      </section>

      <section className="card">
        <CardTitle
          title="Profile & recommended intake"
          sub="Used to compute your daily calorie recommendation (Mifflin-St Jeor)."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={`Height (${lengthUnit(draftUnits)})`}>
            <TextInput
              type="number"
              min={0}
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
          </Field>
          <Field label="Age">
            <TextInput type="number" min={0} value={age} onChange={(e) => setAge(e.target.value)} />
          </Field>
          <Field label="Sex">
            <Select value={sex} onChange={(e) => setSex(e.target.value as '' | Sex)}>
              <option value="">Not set</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </Select>
            <p className="mt-1 text-xs text-muted">Used only for the BMR formula</p>
          </Field>
          <Field label="Activity level">
            <Select value={activity} onChange={(e) => setActivity(e.target.value as ActivityLevel)}>
              {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={`Pace (${weightUnit(draftUnits)}/week)`}>
            <TextInput
              type="number"
              min={0}
              step={0.1}
              value={pace}
              onChange={(e) => setPace(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted">max 1 kg / 2.2 lb per week</p>
          </Field>
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            className="size-4 accent-[color:var(--app-accent)]"
            checked={useRec}
            onChange={(e) => setUseRec(e.target.checked)}
          />
          Use recommended daily calorie target
        </label>

        <div className="mt-3 flex flex-col gap-1 rounded-xl bg-page p-3 text-sm">
          {rec ? (
            <>
              <div className="flex justify-between text-ink2">
                <span>Basal metabolic rate</span>
                <span>{rec.bmr.toLocaleString('en-US')} kcal</span>
              </div>
              <div className="flex justify-between text-ink2">
                <span>Maintenance (TDEE)</span>
                <span>{rec.tdee.toLocaleString('en-US')} kcal</span>
              </div>
              <div className="flex justify-between font-semibold text-ink">
                <span>Recommended daily target</span>
                <span>{rec.targetCalories.toLocaleString('en-US')} kcal</span>
              </div>
              <p className="text-xs text-muted">
                {rec.direction === 'lose'
                  ? `${Math.abs(rec.dailyDelta).toLocaleString('en-US')} kcal/day deficit to lose ~${paceDisplay} ${weightUnit(draftUnits)}/week`
                  : rec.direction === 'gain'
                    ? `${rec.dailyDelta.toLocaleString('en-US')} kcal/day surplus to gain ~${paceDisplay} ${weightUnit(draftUnits)}/week`
                    : 'Maintenance — no target weight set or already at goal'}
              </p>
              <p className="text-xs text-muted">
                Suggested macros: P {rec.macros.proteinG} g · C {rec.macros.carbsG} g · F{' '}
                {rec.macros.fatG} g
              </p>
              {rec.flooredAt != null && (
                <p className="text-xs text-bad">Clamped to the 1,200 kcal safety floor.</p>
              )}
            </>
          ) : (
            <p className="text-xs text-muted">
              Add {listJoin(missing)} to see your recommendation.
            </p>
          )}
          <p className="text-[11px] text-muted">Estimates only — not medical advice.</p>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={saveProfile}>Save profile</Button>
          {profileSaved && <span className="text-xs text-good">Saved ✓</span>}
        </div>
      </section>

      <section className="card">
        <CardTitle title="Your data" sub="Everything is stored locally in this browser." />
        <div className="divide-y divide-line">
          <div className="flex items-center justify-between gap-3 py-2.5">
            <p className="text-sm text-ink2">Export a JSON backup of all entries.</p>
            <Button variant="ghost" onClick={exportBackup}>
              <Download size={16} /> Export
            </Button>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <p className="text-sm text-ink2">Restore from a backup file (replaces current data).</p>
            <label className="btn btn-ghost cursor-pointer">
              <Upload size={16} /> Import
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={onImportFile}
              />
            </label>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <p className="text-sm text-ink2">Try the app with four weeks of demo data.</p>
            <Button variant="ghost" onClick={loadSample}>
              <FlaskConical size={16} /> Load sample
            </Button>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <p className="text-sm text-ink2">Permanently delete everything.</p>
            <Button variant="danger" onClick={deleteAll}>
              <Trash2 size={16} /> Delete all data
            </Button>
          </div>
        </div>
      </section>

      <section className="card">
        <CardTitle title="About FitTrack" />
        <p className="text-sm leading-relaxed text-ink2">
          FitTrack 0.1.0 — a local-first fitness &amp; health tracker. Your data never leaves this
          device, with one exception: food-name searches are sent to Open Food Facts when you use
          the food lookup. You can install FitTrack as an app from your browser menu (Add to Home
          Screen).
        </p>
      </section>
    </div>
  );
}

/**
 * Drafts are seeded from the store once per mount, so remount the whole view
 * whenever the dataset is replaced wholesale (import / sample / reset) —
 * otherwise stale drafts would mask, and on save silently revert, new data.
 */
export default function Settings() {
  const dataVersion = useAppStore((s) => s.dataVersion);
  return <SettingsView key={dataVersion} />;
}
