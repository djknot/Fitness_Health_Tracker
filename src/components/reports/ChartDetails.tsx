interface ChartDetailsProps {
  /** Table caption for screen readers, e.g. "Workouts per week". */
  caption: string;
  columns: [string, string];
  rows: { label: string; value: string }[];
  summary?: string;
}

/** Compact accessible twin for a chart: a collapsed <details> holding the data as a table. */
export function ChartDetails({ caption, columns, rows, summary = 'View as table' }: ChartDetailsProps) {
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs text-muted transition-colors hover:text-ink2">
        {summary}
      </summary>
      <div className="mt-2 max-h-48 overflow-y-auto">
        <table className="w-full text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="text-left text-muted">
              <th className="py-1 pr-3 font-medium">{columns[0]}</th>
              <th className="py-1 font-medium">{columns[1]}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="py-1 pr-3 text-ink2">{r.label}</td>
                <td className="py-1 tabular-nums text-ink2">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
