import { Fragment } from 'react';
import type { CSSProperties } from 'react';
import { formatMedium } from '../../lib/dates';
import { monthLabels } from '../../lib/reports';
import type { HeatmapWeek } from '../../lib/reports';
import { useChartTheme } from '../../theme/chart';

interface HeatmapProps {
  weeks: HeatmapWeek[];
  /** In-range days with at least one log. */
  activeDays: number;
  /** Total days in the selected range. */
  totalDays: number;
}

/** '#2a78d6' + 0.25 → 'rgba(42, 120, 214, 0.25)' (background alpha, so borders stay crisp). */
function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Month-label row (1rem) + 7 day rows of 12px cells. */
const GRID_ROWS = '1rem repeat(7, 0.75rem)';
const ROW_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

/**
 * GitHub-style consistency heatmap: one column per Mon-start week, one row per
 * weekday. Cell intensity encodes that day's log count via a single-hue
 * sequential ramp on chart series 1 (dataviz: sequential = one hue, light→dark).
 */
export function Heatmap({ weeks, activeDays, totalDays }: HeatmapProps) {
  const theme = useChartTheme();
  const labels = monthLabels(weeks.map((w) => w.weekStart));

  const fillFor = (count: number): CSSProperties | undefined => {
    if (count <= 0) return undefined;
    const alpha = count === 1 ? 0.25 : count === 2 ? 0.55 : 1;
    return { backgroundColor: withAlpha(theme.series1, alpha) };
  };

  return (
    <div>
      <p className="sr-only">
        Active {activeDays} of {totalDays} days in this range.
      </p>
      <div className="overflow-x-auto pb-1">
        <div className="flex w-max gap-1 pr-4" aria-hidden>
          {/* Weekday gutter shares the row template so labels line up with cells. */}
          <div className="grid gap-0.5 pr-1" style={{ gridTemplateRows: GRID_ROWS }}>
            <span />
            {ROW_LABELS.map((d, i) => (
              <span
                key={i}
                className="flex h-3 items-center justify-end text-[9px] leading-none text-muted"
              >
                {d}
              </span>
            ))}
          </div>
          <div
            className="grid gap-0.5"
            style={{ gridTemplateRows: GRID_ROWS, gridAutoFlow: 'column', gridAutoColumns: '0.75rem' }}
          >
            {weeks.map((week, wi) => (
              <Fragment key={week.weekStart}>
                <span className="whitespace-nowrap text-[10px] leading-none text-muted">
                  {labels[wi] ?? ''}
                </span>
                {week.days.map((day) =>
                  day.inRange ? (
                    <div
                      key={day.date}
                      title={`${formatMedium(day.date)} — ${day.count === 1 ? '1 log' : `${day.count} logs`}`}
                      className={`size-3 rounded-xs ${day.count === 0 ? 'border border-line bg-page' : ''}`}
                      style={fillFor(day.count)}
                    />
                  ) : (
                    <div key={day.date} className="size-3" />
                  ),
                )}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1 text-[10px] text-muted" aria-hidden>
        <span className="mr-0.5">Less</span>
        <span className="size-3 rounded-xs border border-line bg-page" />
        <span className="size-3 rounded-xs" style={{ backgroundColor: withAlpha(theme.series1, 0.25) }} />
        <span className="size-3 rounded-xs" style={{ backgroundColor: withAlpha(theme.series1, 0.55) }} />
        <span className="size-3 rounded-xs" style={{ backgroundColor: theme.series1 }} />
        <span className="ml-0.5">More</span>
      </div>
    </div>
  );
}
