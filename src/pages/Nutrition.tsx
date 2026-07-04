import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  ScanBarcode,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { MEAL_TYPES, type FoodEntry, type MealType, type QuickFood } from '../types';
import { useAppStore } from '../store/useAppStore';
import { addDays, formatLong, todayISO } from '../lib/dates';
import { nutritionOn } from '../lib/stats';
import { dailyTargetInfo, macroTargets, type DailyTargetInfo } from '../lib/recommend';
import type { FoodRecord } from '../lib/foodDb';
import { computeNutrition, searchFoods } from '../lib/foodSearch';
import { quickFoodKey } from '../lib/quickfoods';
import { Button, CardTitle, Field, IconButton, PageHeader, Select, TextInput } from '../components/ui';
import { Meter } from '../components/Meter';
import { MacroBar } from '../components/MacroBar';
import { BarcodeScanner } from '../components/nutrition/BarcodeScanner';
import { FastingCard } from '../components/nutrition/FastingCard';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const TARGET_SOURCE_LABELS: Record<DailyTargetInfo['source'], string> = {
  manual: 'manual goal',
  recommended: 'recommended',
  'recommended-adaptive': 'adaptive',
};

/** Parse an optional numeric field; empty or invalid input becomes undefined. */
function optionalNumber(s: string): number | undefined {
  if (s.trim() === '') return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/** Empty, or a finite number ≥ 0 — macros are optional but never negative. */
function macroValid(s: string): boolean {
  if (s.trim() === '') return true;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0;
}

/** One-tap logging chips (favorites / recents); horizontally scrollable on mobile. */
function QuickChips({
  label,
  items,
  onPick,
}: {
  label: string;
  items: QuickFood[];
  onPick: (qf: QuickFood) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-0.5">
      <span className="shrink-0 text-[11px] font-medium text-muted">{label}</span>
      {items.map((qf) => (
        <button
          key={qf.id}
          type="button"
          onClick={() => onPick(qf)}
          title={`Log ${qf.name} (${qf.calories} kcal)`}
          className="chip shrink-0 bg-accent-wash text-ink2 transition-colors hover:bg-accent-soft hover:text-ink"
        >
          {qf.name}
          <span className="text-muted">{qf.calories}</span>
        </button>
      ))}
    </div>
  );
}

function AddFoodRow({ date, meal }: { date: string; meal: MealType }) {
  const addFood = useAppStore((s) => s.addFood);
  const usdaApiKey = useAppStore((s) => s.prefs.usdaApiKey);
  const customFoods = useAppStore((s) => s.customFoods);
  const favoriteFoods = useAppStore((s) => s.favoriteFoods);
  const recentFoods = useAppStore((s) => s.recentFoods);

  const [name, setName] = useState('');
  const [grams, setGrams] = useState('');
  const [qtyUnit, setQtyUnit] = useState<'g' | 'ml' | 'oz'>('g');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [selected, setSelected] = useState<FoodRecord | null>(null);
  const [results, setResults] = useState<FoodRecord[]>([]);
  const [remoteError, setRemoteError] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showMacros, setShowMacros] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  useEffect(() => {
    if (selected || name.trim().length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setSearching(true);
      searchFoods(name.trim(), {
        signal: ctrl.signal,
        usdaApiKey: usdaApiKey || undefined,
        customFoods,
      })
        .then((r) => {
          setResults(r.results);
          setRemoteError(r.remoteError);
        })
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [name, selected, usdaApiKey, customFoods]);

  const favorites = favoriteFoods.slice(0, 8);
  const recents = useMemo(() => {
    const favKeys = new Set(favoriteFoods.map(quickFoodKey));
    return recentFoods.filter((r) => !favKeys.has(quickFoodKey(r))).slice(0, 8);
  }, [favoriteFoods, recentFoods]);

  const logQuick = (qf: QuickFood) =>
    addFood({
      date,
      meal,
      name: qf.name,
      calories: qf.calories,
      proteinG: qf.proteinG,
      carbsG: qf.carbsG,
      fatG: qf.fatG,
    });

  const applyNutrition = (food: FoodRecord, g: number) => {
    const n = computeNutrition(food, g);
    setKcal(String(n.calories));
    setProtein(String(n.proteinG));
    setCarbs(String(n.carbsG));
    setFat(String(n.fatG));
  };

  // The per-100 basis is grams (or millilitres for liquids), so g and ml scale
  // 1:1; ounces convert to grams first.
  const toGrams = (qty: number, unit: 'g' | 'ml' | 'oz') => (unit === 'oz' ? qty * 28.3495 : qty);

  const recompute = (qtyStr: string, unit: 'g' | 'ml' | 'oz') => {
    if (!selected) return;
    const qty = Number(qtyStr);
    if (Number.isFinite(qty) && qty > 0) applyNutrition(selected, toGrams(qty, unit));
  };

  const onSelect = (food: FoodRecord) => {
    setSelected(food);
    setName(food.name);
    setQtyUnit('g'); // servingG is in grams
    const g = food.servingG ?? 100;
    setGrams(String(g));
    applyNutrition(food, g);
    setShowMacros(true);
    setResults([]);
  };

  const onBarcodeFound = (food: FoodRecord) => {
    setScanOpen(false);
    // Fold the brand into the name so the logged entry keeps it.
    onSelect(
      food.brand ? { ...food, name: `${food.name} (${food.brand})`, brand: undefined } : food,
    );
  };

  const onGramsChange = (v: string) => {
    setGrams(v);
    recompute(v, qtyUnit);
  };

  const onUnitChange = (u: 'g' | 'ml' | 'oz') => {
    setQtyUnit(u);
    recompute(grams, u);
  };

  const kcalNum = Number(kcal);
  const canAdd = name.trim().length > 0 && Number.isFinite(kcalNum) && kcalNum > 0;

  const handleAdd = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canAdd) return;
    addFood({
      date,
      meal,
      name: selected ? `${selected.name}${grams ? ` (${grams} ${qtyUnit})` : ''}` : name.trim(),
      calories: Math.round(kcalNum),
      proteinG: optionalNumber(protein),
      carbsG: optionalNumber(carbs),
      fatG: optionalNumber(fat),
    });
    setName('');
    setGrams('');
    setQtyUnit('g');
    setKcal('');
    setProtein('');
    setCarbs('');
    setFat('');
    setSelected(null);
    setResults([]);
  };

  return (
    <div>
      <QuickChips label="★ Favorites" items={favorites} onPick={logQuick} />
      <QuickChips label="Recent" items={recents} onPick={logQuick} />

      {/* noValidate: values seeded from lookups/store can be any precision — JS parsing
          validates; native step/min checks would silently block submission. */}
      <form onSubmit={handleAdd} noValidate>
        <div className="relative mt-3">
          <div className="flex gap-2">
            <TextInput
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                // Editing the name detaches the picked food so search works again
                // and the typed text is what actually gets saved.
                setSelected(null);
              }}
              placeholder="Add food — search or type your own…"
              className="flex-1 min-w-40"
            />
            <Button
              variant="ghost"
              aria-label="Scan barcode"
              title="Scan barcode"
              onClick={() => setScanOpen(true)}
            >
              <ScanBarcode size={16} />
              <span className="hidden sm:inline">Scan</span>
            </Button>
          </div>

          {results.length > 0 && !selected && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-auto rounded-xl border border-edge bg-surface shadow-lg">
              {results.map((food, i) => (
                <button
                  key={`${food.name}|${food.brand ?? ''}|${i}`}
                  type="button"
                  onClick={() => onSelect(food)}
                  className="block w-full text-left px-3 py-2 hover:bg-accent-wash"
                >
                  <span className="block text-sm text-ink">
                    {food.name}
                    {food.brand ? ` · ${food.brand}` : ''}
                    {(food.source === 'custom' || food.source === 'usda') && (
                      <span className="ml-1.5 inline-block rounded-full bg-accent-wash px-1.5 align-middle text-[10px] font-medium text-accent">
                        {food.source === 'usda' ? 'USDA' : 'custom'}
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-muted">
                    {`${food.per100g.kcal} kcal / 100 g${food.servingLabel ? ` · ${food.servingLabel}` : ''}${
                      food.source === 'local'
                        ? '  ·  common food'
                        : food.source === 'off'
                          ? '  ·  Open Food Facts'
                          : ''
                    }`}
                  </span>
                </button>
              ))}
              <div className="sticky bottom-0 border-t border-line bg-surface px-3 py-1.5 text-[11px] text-muted">
                {searching
                  ? 'Searching…'
                  : remoteError
                    ? 'Online food databases unreachable — showing local matches'
                    : usdaApiKey
                      ? 'Local database + Open Food Facts + USDA'
                      : 'Local database + Open Food Facts'}
              </div>
            </div>
          )}
        </div>

        {selected && (
          <div className="mt-2">
            <span className="chip bg-accent-wash text-ink2">
              {selected.name}
              {selected.brand ? ` · ${selected.brand}` : ''}
              <button type="button" aria-label="Clear selected food" onClick={() => setSelected(null)}>
                <X size={12} />
              </button>
            </span>
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-end gap-2">
          <Field label="Amount">
            <div className="flex items-center gap-1.5">
              <TextInput
                type="number"
                value={grams}
                onChange={(e) => onGramsChange(e.target.value)}
                aria-label="Amount"
                className="w-16"
              />
              <Select
                value={qtyUnit}
                onChange={(e) => onUnitChange(e.target.value as 'g' | 'ml' | 'oz')}
                aria-label="Amount unit"
                className="w-16"
              >
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="oz">oz</option>
              </Select>
            </div>
          </Field>
          <Field label="Calories">
            <div className="flex items-center gap-1.5">
              <TextInput
                type="number"
                value={kcal}
                onChange={(e) => setKcal(e.target.value)}
                aria-label="Calories"
                className="w-20"
              />
              <span className="text-sm text-ink2">kcal</span>
            </div>
          </Field>
          <Button type="submit" disabled={!canAdd}>
            Add
          </Button>
          <Button variant="ghost" className="text-xs" onClick={() => setShowMacros((v) => !v)}>
            {showMacros ? '– macros' : '+ macros'}
          </Button>
        </div>

        {showMacros && (
          <div className="mt-2 flex flex-wrap gap-3">
            <Field label="Protein">
              <div className="flex items-center gap-1.5">
                <TextInput
                  type="number"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  aria-label="Protein (g)"
                  className="w-16"
                />
                <span className="text-sm text-ink2">g</span>
              </div>
            </Field>
            <Field label="Carbs">
              <div className="flex items-center gap-1.5">
                <TextInput
                  type="number"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  aria-label="Carbs (g)"
                  className="w-16"
                />
                <span className="text-sm text-ink2">g</span>
              </div>
            </Field>
            <Field label="Fat">
              <div className="flex items-center gap-1.5">
                <TextInput
                  type="number"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  aria-label="Fat (g)"
                  className="w-16"
                />
                <span className="text-sm text-ink2">g</span>
              </div>
            </Field>
          </div>
        )}
      </form>

      {scanOpen && <BarcodeScanner onFound={onBarcodeFound} onClose={() => setScanOpen(false)} />}
    </div>
  );
}

/** Inline editor for a logged entry; add-form parsing rules (kcal ≥ 0, macros optional ≥ 0). */
function EditFoodRow({ entry, onDone }: { entry: FoodEntry; onDone: () => void }) {
  const updateFood = useAppStore((s) => s.updateFood);

  const [name, setName] = useState(entry.name);
  const [kcal, setKcal] = useState(String(entry.calories));
  const [protein, setProtein] = useState(entry.proteinG != null ? String(entry.proteinG) : '');
  const [carbs, setCarbs] = useState(entry.carbsG != null ? String(entry.carbsG) : '');
  const [fat, setFat] = useState(entry.fatG != null ? String(entry.fatG) : '');
  const [meal, setMeal] = useState<MealType>(entry.meal);

  const kcalNum = Number(kcal);
  const canSave =
    name.trim().length > 0 &&
    kcal.trim() !== '' &&
    Number.isFinite(kcalNum) &&
    kcalNum >= 0 &&
    macroValid(protein) &&
    macroValid(carbs) &&
    macroValid(fat);

  const handleSave = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSave) return;
    updateFood(entry.id, {
      name: name.trim(),
      meal,
      calories: Math.round(kcalNum),
      proteinG: optionalNumber(protein),
      carbsG: optionalNumber(carbs),
      fatG: optionalNumber(fat),
    });
    onDone();
  };

  return (
    <form onSubmit={handleSave} className="py-2" noValidate>
      <div className="flex flex-wrap gap-2">
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Food name"
          placeholder="Food name"
          className="flex-1 min-w-40"
        />
        <div className="flex items-center gap-1.5">
          <TextInput
            type="number"
            value={kcal}
            onChange={(e) => setKcal(e.target.value)}
            aria-label="Calories"
            className="w-20"
          />
          <span className="text-sm text-ink2">kcal</span>
        </div>
        <Select
          value={meal}
          onChange={(e) => setMeal(e.target.value as MealType)}
          aria-label="Meal"
          className="w-32"
        >
          {MEAL_TYPES.map((m) => (
            <option key={m} value={m}>
              {capitalize(m)}
            </option>
          ))}
        </Select>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <TextInput
            type="number"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            placeholder="Protein"
            aria-label="Protein (g)"
            className="w-20"
          />
          <span className="text-sm text-ink2">g</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TextInput
            type="number"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
            placeholder="Carbs"
            aria-label="Carbs (g)"
            className="w-20"
          />
          <span className="text-sm text-ink2">g</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TextInput
            type="number"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
            placeholder="Fat"
            aria-label="Fat (g)"
            className="w-20"
          />
          <span className="text-sm text-ink2">g</span>
        </div>
        <div className="ml-auto flex gap-2">
          <Button type="submit" disabled={!canSave}>
            Save
          </Button>
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}

/** Consumed-vs-target progress for one macro; renders nothing without a target. */
function MacroTargetRow({
  label,
  consumed,
  target,
}: {
  label: string;
  consumed: number;
  target?: number;
}) {
  if (target == null || target <= 0) return null;
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium text-ink2">{label}</span>
        <span className="text-muted">
          {Math.round(consumed)} / {target} g
        </span>
      </div>
      <Meter value={consumed} max={target} label={`${label} target`} className="mt-1" />
    </div>
  );
}

export default function Nutrition() {
  const foods = useAppStore((s) => s.foods);
  const workouts = useAppStore((s) => s.workouts);
  const waterByDate = useAppStore((s) => s.waterByDate);
  const metrics = useAppStore((s) => s.metrics);
  const goals = useAppStore((s) => s.goals);
  const profile = useAppStore((s) => s.profile);
  const prefs = useAppStore((s) => s.prefs);
  const favoriteFoods = useAppStore((s) => s.favoriteFoods);
  const savedMeals = useAppStore((s) => s.savedMeals);
  const addWater = useAppStore((s) => s.addWater);
  const deleteFood = useAppStore((s) => s.deleteFood);
  const toggleFavoriteFood = useAppStore((s) => s.toggleFavoriteFood);
  const addSavedMeal = useAppStore((s) => s.addSavedMeal);
  const deleteSavedMeal = useAppStore((s) => s.deleteSavedMeal);
  const logSavedMeal = useAppStore((s) => s.logSavedMeal);

  const [date, setDate] = useState(todayISO());
  const [editingId, setEditingId] = useState<string | null>(null);
  const today = todayISO();

  const changeDate = (d: string) => {
    setDate(d);
    setEditingId(null);
  };

  const day = nutritionOn(foods, date);
  const targetInfo = dailyTargetInfo({ goals, profile, prefs, metrics, foods, workouts }, date);
  const water = waterByDate[date] ?? 0;
  const remaining = targetInfo.target - day.calories;
  const macros = macroTargets(goals, targetInfo.recommendation);

  const favoriteKeys = useMemo(() => new Set(favoriteFoods.map(quickFoodKey)), [favoriteFoods]);

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <PageHeader
        title="Nutrition"
        sub={formatLong(date)}
        action={
          <div className="flex items-center gap-2">
            <Button variant="ghost" aria-label="Previous day" onClick={() => changeDate(addDays(date, -1))}>
              <ChevronLeft size={18} />
            </Button>
            <Button
              variant="ghost"
              aria-label="Next day"
              disabled={date === today}
              onClick={() => changeDate(addDays(date, 1))}
            >
              <ChevronRight size={18} />
            </Button>
            <TextInput
              type="date"
              value={date}
              max={today}
              onChange={(e) => {
                const v = e.target.value;
                if (v && v <= today) changeDate(v);
              }}
              className="w-40"
            />
            {date !== today && (
              <Button variant="ghost" onClick={() => changeDate(today)}>
                Today
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <section className="card">
          <CardTitle title="Daily summary" />
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span
              className={`text-3xl font-bold leading-none ${remaining >= 0 ? 'text-ink' : 'text-bad'}`}
            >
              {Math.abs(remaining).toLocaleString('en-US')}
            </span>
            <span className="text-sm font-medium text-ink2">
              kcal {remaining >= 0 ? 'left' : 'over'}
            </span>
          </div>
          <p className="mt-1 text-sm text-ink2">
            {day.calories.toLocaleString('en-US')} of {targetInfo.target.toLocaleString('en-US')} kcal
            eaten
          </p>
          <Meter value={day.calories} max={targetInfo.target} overIsBad label="Calories" className="mt-2" />
          <p className="mt-1 text-xs text-muted">
            Target: {TARGET_SOURCE_LABELS[targetInfo.source]}
            {targetInfo.burnKcal > 0 && (
              <>
                {' · '}
                <span
                  className="cursor-help underline decoration-dotted"
                  title="Estimated calories burned by this day's logged workouts, added to your daily target."
                >
                  +{targetInfo.burnKcal.toLocaleString('en-US')} kcal earned back
                </span>
              </>
            )}
          </p>
          <div className="mt-3">
            <MacroBar proteinG={day.proteinG} carbsG={day.carbsG} fatG={day.fatG} />
          </div>
          {(macros.proteinG != null || macros.carbsG != null || macros.fatG != null) && (
            <div className="mt-3 flex flex-col gap-2">
              <MacroTargetRow label="Protein" consumed={day.proteinG} target={macros.proteinG} />
              <MacroTargetRow label="Carbs" consumed={day.carbsG} target={macros.carbsG} />
              <MacroTargetRow label="Fat" consumed={day.fatG} target={macros.fatG} />
            </div>
          )}
        </section>

        <section className="card">
          <CardTitle title="Water" />
          <div>
            <span className="text-2xl font-semibold text-ink">{water.toLocaleString('en-US')}</span>{' '}
            <span className="text-base text-ink2">/ {goals.dailyWaterMl.toLocaleString('en-US')} ml</span>
          </div>
          <Meter value={water} max={goals.dailyWaterMl} label="Water" className="mt-2" />
          <div className="mt-3 flex gap-2">
            <Button variant="ghost" disabled={water <= 0} onClick={() => addWater(date, -250)}>
              −250
            </Button>
            <Button onClick={() => addWater(date, 250)}>+250 ml</Button>
            <Button variant="ghost" onClick={() => addWater(date, 500)}>
              +500
            </Button>
          </div>
        </section>
      </div>

      <FastingCard />

      {savedMeals.length > 0 && (
        <section className="card">
          <CardTitle title="Saved meals" sub="Log a whole meal in one tap." />
          <ul className="flex flex-col gap-1">
            {savedMeals.map((m) => {
              const kcal = m.items.reduce((n, it) => n + it.calories, 0);
              return (
                <li key={m.id} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1 py-1">
                    <p className="truncate text-sm font-medium text-ink">{m.name}</p>
                    <p className="text-xs text-muted">
                      {capitalize(m.meal)} · {m.items.length}{' '}
                      {m.items.length === 1 ? 'item' : 'items'} · {kcal.toLocaleString('en-US')} kcal
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => logSavedMeal(m.id, date)}
                  >
                    <Plus size={14} /> Log
                  </Button>
                  <IconButton
                    label={`Delete saved meal "${m.name}"`}
                    onClick={() => {
                      if (window.confirm(`Delete saved meal "${m.name}"?`)) deleteSavedMeal(m.id);
                    }}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {MEAL_TYPES.map((meal) => {
        const entries = foods.filter((f) => f.date === date && f.meal === meal);
        const total = entries.reduce((n, f) => n + f.calories, 0);
        return (
          <section key={meal} className="card">
            <CardTitle
              title={capitalize(meal)}
              sub={entries.length ? `${total.toLocaleString('en-US')} kcal` : 'No entries yet'}
              action={
                entries.length > 0 ? (
                  <Button
                    variant="ghost"
                    className="text-xs"
                    title="Save these items as a reusable meal"
                    onClick={() => {
                      const nm = window.prompt('Name this meal:', `My ${meal}`);
                      if (nm && nm.trim()) {
                        addSavedMeal({
                          name: nm.trim(),
                          meal,
                          items: entries.map((f) => ({
                            name: f.name,
                            calories: f.calories,
                            proteinG: f.proteinG,
                            carbsG: f.carbsG,
                            fatG: f.fatG,
                          })),
                        });
                      }
                    }}
                  >
                    <BookmarkPlus size={14} /> Save as meal
                  </Button>
                ) : undefined
              }
            />
            <div className="divide-y divide-line">
              {entries.map((f) => {
                if (editingId === f.id) {
                  return <EditFoodRow key={f.id} entry={f} onDone={() => setEditingId(null)} />;
                }
                const macroParts: string[] = [];
                if (f.proteinG != null) macroParts.push(`P ${Math.round(f.proteinG)}`);
                if (f.carbsG != null) macroParts.push(`C ${Math.round(f.carbsG)}`);
                if (f.fatG != null) macroParts.push(`F ${Math.round(f.fatG)}`);
                const isFav = favoriteKeys.has(quickFoodKey(f));
                return (
                  <div key={f.id} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <p className="text-sm text-ink">{f.name}</p>
                      {macroParts.length > 0 && (
                        <p className="text-xs text-muted">{macroParts.join(' · ')}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-ink2 whitespace-nowrap">
                        {f.calories.toLocaleString('en-US')} kcal
                      </span>
                      <IconButton
                        variant="neutral"
                        label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                        onClick={() =>
                          toggleFavoriteFood({
                            name: f.name,
                            calories: f.calories,
                            proteinG: f.proteinG,
                            carbsG: f.carbsG,
                            fatG: f.fatG,
                          })
                        }
                      >
                        <Star
                          size={16}
                          className={isFav ? 'text-warning' : undefined}
                          fill={isFav ? 'currentColor' : 'none'}
                        />
                      </IconButton>
                      <IconButton variant="neutral" label="Edit entry" onClick={() => setEditingId(f.id)}>
                        <Pencil size={16} />
                      </IconButton>
                      <IconButton
                        label="Delete entry"
                        onClick={() => {
                          if (window.confirm(`Delete "${f.name}"?`)) deleteFood(f.id);
                        }}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </div>
                  </div>
                );
              })}
            </div>
            <AddFoodRow date={date} meal={meal} />
          </section>
        );
      })}
    </div>
  );
}
