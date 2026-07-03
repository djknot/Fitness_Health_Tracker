import { useEffect, useState, type FormEvent } from 'react';
import { ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import { MEAL_TYPES, type MealType } from '../types';
import { useAppStore } from '../store/useAppStore';
import { addDays, formatLong, todayISO } from '../lib/dates';
import { nutritionOn } from '../lib/stats';
import { calorieTargetInfo } from '../lib/recommend';
import type { FoodRecord } from '../lib/foodDb';
import { computeNutrition, searchFoods } from '../lib/foodSearch';
import { Button, CardTitle, IconButton, PageHeader, TextInput } from '../components/ui';
import { Meter } from '../components/Meter';
import { MacroBar } from '../components/MacroBar';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Parse an optional numeric field; empty or invalid input becomes undefined. */
function optionalNumber(s: string): number | undefined {
  if (s.trim() === '') return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function AddFoodRow({ date, meal }: { date: string; meal: MealType }) {
  const addFood = useAppStore((s) => s.addFood);

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

  useEffect(() => {
    if (selected || name.trim().length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setSearching(true);
      searchFoods(name.trim(), { signal: ctrl.signal })
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
  }, [name, selected]);

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
    <form onSubmit={handleAdd}>
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
                </span>
                <span className="block text-xs text-muted">
                  {`${food.per100g.kcal} kcal / 100 g${food.servingLabel ? ` · ${food.servingLabel}` : ''}  ·  ${
                    food.source === 'local' ? 'common food' : 'Open Food Facts'
                  }`}
                </span>
              </button>
            ))}
            <div className="sticky bottom-0 border-t border-line bg-surface px-3 py-1.5 text-[11px] text-muted">
              {searching
                ? 'Searching…'
                : remoteError
                  ? 'Online food database unreachable — showing local matches'
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
  );
}

export default function Nutrition() {
  const foods = useAppStore((s) => s.foods);
  const waterByDate = useAppStore((s) => s.waterByDate);
  const metrics = useAppStore((s) => s.metrics);
  const goals = useAppStore((s) => s.goals);
  const profile = useAppStore((s) => s.profile);
  const addWater = useAppStore((s) => s.addWater);
  const deleteFood = useAppStore((s) => s.deleteFood);

  const [date, setDate] = useState(todayISO());
  const today = todayISO();

  const day = nutritionOn(foods, date);
  const targetInfo = calorieTargetInfo({ goals, profile, metrics });
  const water = waterByDate[date] ?? 0;
  const remaining = targetInfo.target - day.calories;

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <PageHeader
        title="Nutrition"
        sub={formatLong(date)}
        action={
          <div className="flex items-center gap-2">
            <Button variant="ghost" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}>
              <ChevronLeft size={18} />
            </Button>
            <Button
              variant="ghost"
              aria-label="Next day"
              disabled={date === today}
              onClick={() => setDate(addDays(date, 1))}
            >
              <ChevronRight size={18} />
            </Button>
            <TextInput
              type="date"
              value={date}
              max={today}
              onChange={(e) => {
                const v = e.target.value;
                if (v && v <= today) setDate(v);
              }}
              className="w-40"
            />
            {date !== today && (
              <Button variant="ghost" onClick={() => setDate(today)}>
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
            {targetInfo.source === 'recommended'
              ? 'Tracking against your recommended intake'
              : 'Tracking against your manual target — see Settings'}
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
                const macroParts: string[] = [];
                if (f.proteinG != null) macroParts.push(`P ${Math.round(f.proteinG)}`);
                if (f.carbsG != null) macroParts.push(`C ${Math.round(f.carbsG)}`);
                if (f.fatG != null) macroParts.push(`F ${Math.round(f.fatG)}`);
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
