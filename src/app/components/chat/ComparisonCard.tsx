'use client';

import { Check } from 'lucide-react';

export interface ComparisonItem {
  label: string;
  metrics: {
    name: string;
    value: string;
    winner?: boolean;
  }[];
}

export interface ComparisonData {
  items: ComparisonItem[];
  insight?: string;
}

interface ComparisonCardProps {
  comparison: ComparisonData;
}

export default function ComparisonCard({ comparison }: ComparisonCardProps) {
  if (!comparison?.items || comparison.items.length < 2) return null;

  const [item1, item2] = comparison.items;
  const allMetrics = item1.metrics.map((m) => m.name);

  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg p-3 my-2">
      {/* Header */}
      <div className="text-sm font-semibold text-[var(--text-primary)] mb-3">
        {item1.label} vs {item2.label}
      </div>

      {/* Comparison Table */}
      <div className="space-y-2">
        {/* Column Headers */}
        <div className="grid grid-cols-[1fr,80px,80px,24px] gap-2 text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide">
          <div></div>
          <div className="text-center font-medium">{item1.label}</div>
          <div className="text-center font-medium">{item2.label}</div>
          <div></div>
        </div>

        {/* Metric Rows */}
        {(allMetrics ?? []).map((metricName) => {
          const m1 = item1.metrics.find((m) => m.name === metricName);
          const m2 = item2.metrics.find((m) => m.name === metricName);

          return (
            <div
              key={metricName}
              className="grid grid-cols-[1fr,80px,80px,24px] gap-2 items-center py-1.5 border-t border-[var(--border-subtle)]"
            >
              <div className="text-xs text-[var(--text-secondary)]">{metricName}</div>
              <div
                className={`text-xs font-medium text-center ${
                  m1?.winner ? 'text-green-600' : 'text-[var(--text-primary)]'
                }`}
              >
                {m1?.value || '—'}
              </div>
              <div
                className={`text-xs font-medium text-center ${
                  m2?.winner ? 'text-green-600' : 'text-[var(--text-primary)]'
                }`}
              >
                {m2?.value || '—'}
              </div>
              <div className="flex justify-center">
                {m1?.winner && (
                  <Check size={14} className="text-green-500" />
                )}
                {m2?.winner && (
                  <div className="w-3.5" /> // Spacer when item2 wins (check appears visually on right)
                )}
                {m2?.winner && (
                  <Check size={14} className="text-green-500 -ml-3.5" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Insight */}
      {comparison.insight && (
        <div className="mt-3 pt-2 border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
          {comparison.insight}
        </div>
      )}
    </div>
  );
}
