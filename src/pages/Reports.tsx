import { BarChart3 } from 'lucide-react';
import { EmptyState, PageHeader } from '../components/ui';

/** Placeholder — the full reports page (summaries, heatmap, trends) lands with v0.2. */
export default function Reports() {
  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <PageHeader title="Reports" sub="Weekly and monthly summaries" />
      <section className="card">
        <EmptyState
          icon={<BarChart3 size={22} />}
          title="Coming soon"
          body="Averages, adherence, and long-range trends are on the way."
        />
      </section>
    </div>
  );
}
