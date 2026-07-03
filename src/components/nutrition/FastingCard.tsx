import { useEffect, useState } from 'react';
import { Timer, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import {
  activeFast,
  completedFasts,
  fastDurationHours,
  formatHoursMinutes,
} from '../../lib/fasting';
import { relativeDayLabel, toISODate } from '../../lib/dates';
import { Button, CardTitle, IconButton } from '../ui';

/** "Today, 7:12 AM" — fast timestamps are full ISO datetimes, so `new Date` is correct here. */
function startLabel(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${relativeDayLabel(toISODate(d))}, ${time}`;
}

export function FastingCard() {
  const fasts = useAppStore((s) => s.fasts);
  const startFast = useAppStore((s) => s.startFast);
  const endFast = useAppStore((s) => s.endFast);
  const deleteFast = useAppStore((s) => s.deleteFast);

  const active = activeFast(fasts);
  const activeId = active?.id;
  const [now, setNow] = useState(() => new Date());

  // Live duration: render immediately, then tick every 30 s while a fast runs.
  useEffect(() => {
    if (!activeId) return;
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, [activeId]);

  const recent = completedFasts(fasts).slice(0, 3);

  return (
    <section className="card">
      <CardTitle
        title="Fasting"
        sub={active ? `Started ${startLabel(active.start)}` : 'Intermittent fasting timer'}
        action={active ? <span className="chip bg-accent-wash text-accent">Active</span> : undefined}
      />

      {active ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Timer size={20} className="text-accent" />
            <span className="text-2xl font-semibold tabular-nums text-ink">
              {formatHoursMinutes(fastDurationHours(active, now))}
            </span>
          </div>
          <Button onClick={() => endFast(active.id, new Date().toISOString())}>End fast</Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-ink2">No active fast.</p>
            <p className="text-xs text-muted">Tip: 16:8 = 16 h fasted, 8 h eating window.</p>
          </div>
          <Button onClick={() => startFast(new Date().toISOString())}>Start fast</Button>
        </div>
      )}

      {recent.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-ink2">Recent fasts</p>
          <div className="divide-y divide-line">
            {recent.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-2 py-2">
                <span className="text-sm text-ink">{startLabel(f.start)}</span>
                <div className="flex items-center gap-1">
                  <span className="whitespace-nowrap text-sm text-ink2">
                    {formatHoursMinutes(fastDurationHours(f, now))}
                  </span>
                  <IconButton
                    label="Delete fast"
                    onClick={() => {
                      if (window.confirm('Delete this fast?')) deleteFast(f.id);
                    }}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
