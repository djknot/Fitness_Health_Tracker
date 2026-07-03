interface MeterProps {
  value: number;
  max: number;
  /** When true (e.g. calories), exceeding max turns the fill warning/critical. */
  overIsBad?: boolean;
  label: string;
  className?: string;
}

/**
 * Horizontal progress meter. The unfilled track is a lighter step of the
 * accent ramp; the fill carries state (accent → warning → critical).
 */
export function Meter({ value, max, overIsBad = false, label, className = '' }: MeterProps) {
  const ratio = max > 0 ? value / max : 0;
  const pct = Math.max(0, Math.min(100, ratio * 100));
  const fill =
    overIsBad && ratio >= 1.2 ? 'bg-bad' : overIsBad && ratio > 1 ? 'bg-warning' : 'bg-accent';
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(Math.min(value, max))}
      aria-valuetext={`${Math.round(value)} of ${Math.round(max)}`}
      aria-label={label}
      className={`h-2 w-full overflow-hidden rounded-full bg-accent-soft ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-300 ${fill}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
