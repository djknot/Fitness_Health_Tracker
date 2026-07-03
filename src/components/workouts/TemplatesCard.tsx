import { Play, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { WorkoutTemplate } from '../../types';
import { Button, CardTitle, IconButton } from '../ui';

/** Saved-routine picker + manager: start the builder from a template, or delete one. */
export default function TemplatesCard({ onStart }: { onStart: (t: WorkoutTemplate) => void }) {
  const templates = useAppStore((s) => s.templates);
  const deleteTemplate = useAppStore((s) => s.deleteTemplate);

  return (
    <section className="card">
      <CardTitle
        title="Templates"
        sub={templates.length > 0 ? 'Start the builder from a saved routine.' : undefined}
      />
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
              <Button variant="ghost" className="shrink-0" onClick={() => onStart(t)}>
                <Play size={14} />
                Start
              </Button>
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
    </section>
  );
}
