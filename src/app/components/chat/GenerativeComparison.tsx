'use client';

interface ComparisonItem {
  label: string;
  metrics: Record<string, string>;
}

interface GenerativeComparisonProps {
  items: ComparisonItem[];
}

const formatMetricLabel = (key: string): string => {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export default function GenerativeComparison({ items }: GenerativeComparisonProps) {
  if (!items || items.length === 0) return null;

  // Get all unique metric keys
  const allMetrics = Array.from(
    new Set(items.flatMap((item) => Object.keys(item.metrics)))
  );

  return (
    <div className="mt-3 max-w-[340px]">
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
        {items.map((item, index) => (
          <div
            key={index}
            className="p-3 bg-[var(--bg-secondary)] rounded-lg text-center"
          >
            <p className="text-xs font-semibold text-[var(--accent-primary)] mb-2">
              {item.label}
            </p>
            <div className="space-y-2">
              {allMetrics.map((metricKey) => (
                <div key={metricKey}>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {formatMetricLabel(metricKey)}
                  </p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {item.metrics[metricKey] || '—'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
