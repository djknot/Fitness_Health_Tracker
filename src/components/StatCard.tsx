import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export interface StatDelta {
  text: string;
  /** true = good (green), false = bad (red), null = neutral. */
  good: boolean | null;
}

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  delta?: StatDelta;
  /** Extra content under the value, e.g. a <Meter>. */
  children?: ReactNode;
  /** When set, the whole card becomes a button that navigates to the linked page. */
  onClick?: () => void;
}

export function StatCard({ icon: Icon, label, value, sub, delta, children, onClick }: StatCardProps) {
  const interactive = onClick != null;
  const className = `card flex flex-col gap-1.5 text-left ${
    interactive
      ? 'cursor-pointer transition-colors hover:border-accent hover:bg-accent-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
      : ''
  }`;

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-ink2">{label}</span>
        <Icon size={16} className="shrink-0 text-muted" aria-hidden />
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-2xl font-semibold leading-none text-ink">{value}</span>
        {delta && (
          <span
            className={`text-xs font-medium ${
              delta.good === null ? 'text-ink2' : delta.good ? 'text-good' : 'text-bad'
            }`}
          >
            {delta.text}
          </span>
        )}
      </div>
      {sub && <span className="text-xs text-muted">{sub}</span>}
      {children}
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`${label}: ${value}${sub ? `, ${sub}` : ''}. Open details.`}
        className={className}
      >
        {body}
      </button>
    );
  }
  return <section className={className}>{body}</section>;
}
