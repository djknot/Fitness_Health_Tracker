import type { CalorieAdherence } from '../../lib/reports';

/**
 * Three-segment horizontal bar of logged days under / within / over the ±10%
 * band around the current calorie target. Status colors are correct here —
 * this is over/under-target semantics — and the legend carries the counts in
 * text so identity is never color-alone.
 */
export function AdherenceBar({ adherence }: { adherence: CalorieAdherence }) {
  const { under, within, over, loggedDays } = adherence;
  if (loggedDays === 0) return null;

  const segments = [
    { key: 'under', label: 'Under', count: under, dot: 'bg-warning' },
    { key: 'within', label: 'Within', count: within, dot: 'bg-good' },
    { key: 'over', label: 'Over', count: over, dot: 'bg-bad' },
  ];

  return (
    <div>
      <div
        role="img"
        aria-label={`${under} ${under === 1 ? 'day' : 'days'} under target, ${within} within the band, ${over} over target`}
        className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full"
      >
        {segments
          .filter((s) => s.count > 0)
          .map((s) => (
            <div
              key={s.key}
              className={`h-full ${s.dot}`}
              style={{ flexGrow: s.count, flexBasis: 0, minWidth: '0.5rem' }}
            />
          ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink2">
        {segments.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${s.dot}`} aria-hidden />
            {s.label} · {s.count} {s.count === 1 ? 'day' : 'days'}
          </span>
        ))}
      </div>
    </div>
  );
}
