import { useChartTheme } from '../theme/chart';

interface MacroBarProps {
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/**
 * Stacked macro split by calorie contribution (protein/carbs 4 kcal/g, fat 9),
 * with 2px surface gaps between segments and a dot-key legend.
 */
export function MacroBar({ proteinG, carbsG, fatG }: MacroBarProps) {
  const theme = useChartTheme();
  const segments = [
    { name: 'Protein', grams: proteinG, kcal: proteinG * 4, color: theme.series1 },
    { name: 'Carbs', grams: carbsG, kcal: carbsG * 4, color: theme.series2 },
    { name: 'Fat', grams: fatG, kcal: fatG * 9, color: theme.series3 },
  ];
  const total = segments.reduce((n, s) => n + s.kcal, 0);
  if (total <= 0) return null;
  const visible = segments.filter((s) => s.kcal > 0);

  return (
    <div>
      <div className="flex h-2.5 w-full gap-0.5" role="img" aria-label={`Macros: ${segments.map((s) => `${s.name} ${Math.round(s.grams)} grams`).join(', ')}`}>
        {visible.map((s, i) => (
          <div
            key={s.name}
            className={`h-full ${i === 0 ? 'rounded-l-full' : 'rounded-l-xs'} ${i === visible.length - 1 ? 'rounded-r-full' : 'rounded-r-xs'}`}
            style={{ width: `${(s.kcal / total) * 100}%`, backgroundColor: s.color }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5 text-xs text-ink2">
            <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
            {s.name} {Math.round(s.grams)}g
          </span>
        ))}
      </div>
    </div>
  );
}
