import { useState } from 'react';
import { Apple, Pencil, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { CustomFood } from '../../types';
import { Button, CardTitle, EmptyState, Field, IconButton, TextInput } from '../ui';
import { numOrUndefined, useSavedFlash } from './shared';

/** '' is valid (optional), otherwise must parse to a number ≥ 0. */
const optionalNonNegative = (s: string) => {
  if (s.trim() === '') return true;
  const n = numOrUndefined(s);
  return n != null && n >= 0;
};

/**
 * Manage user-defined foods (per-100 g basis). These rank first in food search.
 * Per-100 g numbers are grams/kcal and unit-agnostic — no draftUnits coupling.
 */
export default function CustomFoods() {
  const customFoods = useAppStore((s) => s.customFoods);
  const addCustomFood = useAppStore((s) => s.addCustomFood);
  const updateCustomFood = useAppStore((s) => s.updateCustomFood);
  const deleteCustomFood = useAppStore((s) => s.deleteCustomFood);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [serving, setServing] = useState('');
  const [saved, flashSaved] = useSavedFlash();

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setBrand('');
    setKcal('');
    setProtein('');
    setCarbs('');
    setFat('');
    setServing('');
  };

  const startEdit = (f: CustomFood) => {
    setEditingId(f.id);
    setName(f.name);
    setBrand(f.brand ?? '');
    setKcal(String(f.per100g.kcal));
    setProtein(String(f.per100g.proteinG));
    setCarbs(String(f.per100g.carbsG));
    setFat(String(f.per100g.fatG));
    setServing(f.servingG != null ? String(f.servingG) : '');
  };

  const kcalNum = numOrUndefined(kcal);
  const servingNum = numOrUndefined(serving);
  const canSave =
    name.trim() !== '' &&
    kcalNum != null &&
    kcalNum >= 0 &&
    optionalNonNegative(protein) &&
    optionalNonNegative(carbs) &&
    optionalNonNegative(fat) &&
    (serving.trim() === '' || (servingNum != null && servingNum > 0));

  const save = () => {
    if (!canSave || kcalNum == null) return;
    const payload = {
      name: name.trim(),
      brand: brand.trim() || undefined,
      per100g: {
        kcal: kcalNum,
        proteinG: numOrUndefined(protein) ?? 0,
        carbsG: numOrUndefined(carbs) ?? 0,
        fatG: numOrUndefined(fat) ?? 0,
      },
      servingG: servingNum != null && servingNum > 0 ? servingNum : undefined,
    };
    if (editingId) updateCustomFood(editingId, payload);
    else addCustomFood(payload);
    resetForm();
    flashSaved();
  };

  const remove = (f: CustomFood) => {
    if (!window.confirm(`Delete "${f.name}"?`)) return;
    if (editingId === f.id) resetForm();
    deleteCustomFood(f.id);
  };

  return (
    <section className="card">
      <CardTitle title="Custom foods" sub="Per 100 g. Available in food search on Nutrition." />

      {customFoods.length === 0 ? (
        <EmptyState
          icon={<Apple size={22} />}
          title="No custom foods yet"
          body="Add foods you eat often — they rank first in search."
        />
      ) : (
        <ul className="flex flex-col gap-1">
          {customFoods.map((f) => (
            <li key={f.id} className="flex items-center gap-2">
              <div className="min-w-0 flex-1 py-1">
                <p className="truncate text-sm font-medium text-ink">
                  {f.name}
                  {f.brand && <span className="font-normal text-muted"> · {f.brand}</span>}
                </p>
                <p className="text-xs text-muted">
                  {f.per100g.kcal} kcal · P {f.per100g.proteinG} g · C {f.per100g.carbsG} g · F{' '}
                  {f.per100g.fatG} g per 100 g
                  {f.servingG != null && ` · serving ${f.servingG} g`}
                </p>
              </div>
              <IconButton variant="neutral" label={`Edit "${f.name}"`} onClick={() => startEdit(f)}>
                <Pencil size={16} />
              </IconButton>
              <IconButton label={`Delete "${f.name}"`} onClick={() => remove(f)}>
                <Trash2 size={16} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 border-t border-line pt-3">
        <h3 className="mb-2 text-sm font-semibold text-ink">
          {editingId ? 'Edit food' : 'Add a food'}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <TextInput
              value={name}
              placeholder="e.g. Overnight oats"
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Brand (optional)">
            <TextInput value={brand} onChange={(e) => setBrand(e.target.value)} />
          </Field>
          <Field label="Calories (kcal / 100 g)">
            <TextInput
              type="number"
              min={0}
              value={kcal}
              onChange={(e) => setKcal(e.target.value)}
            />
          </Field>
          <Field label="Typical serving (g, optional)">
            <TextInput
              type="number"
              min={0}
              placeholder="e.g. 250"
              value={serving}
              onChange={(e) => setServing(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-3 gap-3 sm:col-span-2">
            <Field label="Protein (g / 100 g)">
              <TextInput
                type="number"
                min={0}
                placeholder="0"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
              />
            </Field>
            <Field label="Carbs (g / 100 g)">
              <TextInput
                type="number"
                min={0}
                placeholder="0"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
              />
            </Field>
            <Field label="Fat (g / 100 g)">
              <TextInput
                type="number"
                min={0}
                placeholder="0"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
              />
            </Field>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={save} disabled={!canSave}>
            {editingId ? 'Save changes' : 'Add food'}
          </Button>
          {editingId && (
            <Button variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          )}
          {saved && <span className="text-xs text-good">Saved ✓</span>}
        </div>
      </div>
    </section>
  );
}
