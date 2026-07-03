import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ChevronLeft, ChevronRight, Pencil, ScanBarcode, Star, Trash2, X } from 'lucide-react';
import { MEAL_TYPES, type FoodEntry, type MealType, type QuickFood } from '../types';
import { useAppStore } from '../store/useAppStore';
import { addDays, formatLong, todayISO } from '../lib/dates';
import { nutritionOn } from '../lib/stats';
import { dailyTargetInfo, type DailyTargetInfo } from '../lib/recommend';
import type { FoodRecord } from '../lib/foodDb';
import { computeNutrition, searchFoods } from '../lib/foodSearch';
import { quickFoodKey } from '../lib/quickfoods';
import { Button, CardTitle, IconButton, PageHeader, Select, TextInput } from '../components/ui';
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

  const onSelect = (food: FoodRecord) => {
    setSelected(food);
    setName(food.name);
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
    if (selected) {
      const g = Number(v);
      if (Number.isFinite(g) && g > 0) applyNutrition(selected, g);
    }
  };

  const kcalNum = Number(kcal);
  const canAdd = name.trim().length > 0 && Number.isFinite(kcalNum) && kcalNum > 0;

  const handleAdd = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canAdd) return;
    addFood({
      date,
      meal,
      name: selected ? `${selected.name}${grams ? ` (${grams} g)` : ''}` : name.trim(),
      calories: Math.round(kcalNum),
      proteinG: optionalNumber(protein),
      carbsG: optionalNumber(carbs),
      fatG: optionalNumber(fat),
    });
    setName('');
    setGrams('');
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
          <div className="flex flex-wrap gap-2">
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
            <TextInput
              type="number"
              value={grams}
              onChange={(e) => onGramsChange(e.target.value)}
              placeholder="g"
              aria-label="Quantity (g)"
              className="w-20"
            />
            <TextInput
              type="number"
              value={kcal}
              onChange={(e) => setKcal(e.target.value)}
              placeholder="kcal"
              aria-label="Calories"
              className="w-24"
            />
            <Button type="submit" disabled={!canAdd}>
              Add
            </Button>
            <Button variant="ghost" className="text-xs" onClick={() => setShowMacros((v) => !v)}>
              + macros
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

        {showMacros && (
          <div className="mt-2 flex gap-2">
            <TextInput
              type="number"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              placeholder="P"
              aria-label="Protein (g)"
              className="w-20"
            />
            <TextInput
              type="number"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
              placeholder="C"
              aria-label="Carbs (g)"
              className="w-20"
            />
            <TextInput
              type="number"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
              placeholder="F"
              aria-label="Fat (g)"
              className="w-20"
            />
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
        <TextInput
          type="number"
          value={kcal}
          onChange={(e) => setKcal(e.target.value)}
          placeholder="kcal"
          aria-label="Calories"
          className="w-24"
        />
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
        <TextInput
          type="number"
          value={protein}
          onChange={(e) => setProtein(e.target.value)}
          placeholder="P"
          aria-label="Protein (g)"
          className="w-20"
        />
        <TextInput
          type="number"
          value={carbs}
          onChange={(e) => setCarbs(e.target.value)}
          placeholder="C"
          aria-label="Carbs (g)"
          className="w-20"
        />
        <TextInput
          type="number"
          value={fat}
          onChange={(e) => setFat(e.target.value)}
          placeholder="F"
          aria-label="Fat (g)"
          className="w-20"
        />
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

export default function Nutrition() {
  const foods = useAppStore((s) => s.foods);
  const workouts = useAppStore((s) => s.workouts);
  const waterByDate = useAppStore((s) => s.waterByDate);
  const metrics = useAppStore((s) => s.metrics);
  const goals = useAppStore((s) => s.goals);
  const profile = useAppStore((s) => s.profile);
  const prefs = useAppStore((s) => s.prefs);
  const favoriteFoods = useAppStore((s) => s.favoriteFoods);
  const addWater = useAppStore((s) => s.addWater);
  const deleteFood = useAppStore((s) => s.deleteFood);
  const toggleFavoriteFood = useAppStore((s) => s.toggleFavoriteFood);

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
          <div>
            <span className="text-2xl font-semibold text-ink">{day.calories.toLocaleString('en-US')}</span>{' '}
            <span className="text-base text-ink2">/ {targetInfo.target.toLocaleString('en-US')} kcal</span>
          </div>
          <p className="text-xs text-muted">
            {remaining >= 0
              ? `${remaining.toLocaleString('en-US')} kcal remaining`
              : `${(-remaining).toLocaleString('en-US')} kcal over target`}
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

      {MEAL_TYPES.map((meal) => {
        const entries = foods.filter((f) => f.date === date && f.meal === meal);
        const total = entries.reduce((n, f) => n + f.calories, 0);
        return (
          <section key={meal} className="card">
            <CardTitle
              title={capitalize(meal)}
              sub={entries.length ? `${total.toLocaleString('en-US')} kcal` : 'No entries yet'}
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
