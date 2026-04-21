'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import ChartCard from '@/app/components/charts/ChartCard';
import { NoDataFallback } from '@/app/components/ui/NoDataFallback';

interface DOSBucket {
  bucket: string;
  count: number;
  pct: number;
  value_at_risk: number;
  color: string;
}

interface DOSDistributionProps {
  data: DOSBucket[];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: DOSBucket }> }) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg shadow-lg p-3">
      <p className="font-semibold text-sm text-[var(--text-primary)] mb-2">
        {data.bucket}
      </p>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-[var(--text-tertiary)]">SKU-Store combos:</span>
          <span className="font-medium text-[var(--text-primary)]">{data.count}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[var(--text-tertiary)]">Percentage:</span>
          <span className="font-medium text-[var(--text-primary)]">{data.pct}%</span>
        </div>
        {(data.value_at_risk ?? 0) > 0 && (
          <div className="flex justify-between gap-4 pt-1 border-t border-[var(--border-subtle)]">
            <span className="text-[var(--text-tertiary)]">Value at Risk:</span>
            <span className="font-medium text-red-600">
              ₹{((data.value_at_risk ?? 0) / 100000).toFixed(1)}L
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DOSDistribution({ data }: DOSDistributionProps) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <NoDataFallback title="No data" message="Data is not available." />;
  }

  // Calculate totals for the subtitle
  const totalAtRisk = (data ?? []).reduce((sum, d) => sum + (d.value_at_risk ?? 0), 0);
  const criticalCount = (data ?? []).filter(d => (d.bucket ?? '').includes('Stockout') || (d.bucket ?? '').includes('Critical') || (d.bucket ?? '').includes('Low')).reduce((sum, d) => sum + (d.count ?? 0), 0);

  return (
    <ChartCard
      id="dos-distribution"
      title="Days of Supply Distribution"
      subtitle={`${criticalCount} SKU-stores at risk • ₹${(totalAtRisk / 100000).toFixed(1)}L value at risk`}
      height={280}
      data={data as unknown as Record<string, unknown>[]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 20, bottom: 40, left: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />

          <XAxis
            dataKey="bucket"
            tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-subtle)' }}
            angle={-20}
            textAnchor="end"
            height={50}
          />

          <YAxis
            tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            label={{
              value: 'SKU-Store Count',
              angle: -90,
              position: 'insideLeft',
              style: { fill: 'var(--text-secondary)', fontSize: 11 }
            }}
          />

          <Tooltip content={<CustomTooltip />} />

          <Bar
            dataKey="count"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          >
            {(data ?? []).map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color ?? '#6B7280'} />
            ))}
            <LabelList
              dataKey="count"
              position="top"
              fill="var(--text-secondary)"
              fontSize={10}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
