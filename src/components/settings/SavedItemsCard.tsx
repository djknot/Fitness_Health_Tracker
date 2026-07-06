import { Dumbbell, Utensils, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { capitalize } from '../../lib/strings';
import { CardTitle, IconButton } from '../ui';

/**
 * Manage the reusable items created elsewhere in the app: workout templates
 * (saved from the workout builder) and saved meals (saved from a Nutrition
 * section). Creation lives on those pages; this is the single place to delete
 * them, so the day-to-day pages stay uncluttered.
 */
export default function SavedItemsCard() {
  const templates = useAppStore((s) => s.templates);
  const savedMeals = useAppStore((s) => s.savedMeals);
  const deleteTemplate = useAppStore((s) => s.deleteTemplate);
  const deleteSavedMeal = useAppStore((s) => s.deleteSavedMeal);

  return (
    <section className="card">
      <CardTitle
        title="Saved routines & meals"
        sub="Create these from the Workouts and Nutrition pages; remove them here."
      />
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            <Dumbbell size={13} aria-hidden /> Workout templates
          </h3>
          {templates.length === 0 ? (
            <p className="text-sm text-muted">Save a workout as a template to reuse it.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {templates.map((t) => (
                <li key={t.id} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1 py-1">
                    <p className="truncate text-sm font-medium text-ink">{t.name}</p>
                    <p className="text-xs text-muted">
                      {t.exercises.length === 1 ? '1 exercise' : `${t.exercises.length} exercises`}
                    </p>
                  </div>
                  <IconButton
                    label={`Delete template "${t.name}"`}
                    onClick={() => {
                      if (window.confirm(`Delete template "${t.name}"?`)) deleteTemplate(t.id);
                    }}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            <Utensils size={13} aria-hidden /> Saved meals
          </h3>
          {savedMeals.length === 0 ? (
            <p className="text-sm text-muted">Use “Save as meal” in a Nutrition section to create one.</p>
          ) : (
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
          )}
        </div>
      </div>
    </section>
  );
}
