import { Suspense } from 'react';
import ChartExpansionShell from './ChartExpansionShell';

export default function ChartExpansionPage({ params }: { params: { chartId: string } }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[60vh] gap-3">
        <div className="animate-spin w-5 h-5 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full" />
        <span className="text-sm text-[var(--text-secondary)]">Loading chart analysis…</span>
      </div>
    }>
      <ChartExpansionShell chartId={params.chartId} />
    </Suspense>
  );
}
