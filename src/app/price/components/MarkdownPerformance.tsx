'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { MarkdownData } from '@/app/lib/price-types';

interface MarkdownPerformanceProps {
  data: MarkdownData;
}

const bucketColors = ['#10B981', '#22C55E', '#F59E0B', '#EF4444'];

export default function MarkdownPerformance({ data }: MarkdownPerformanceProps) {
  const chartData = useMemo(() => {
    return (data?.by_bucket ?? []).map((bucket, index) => ({
      ...bucket,
      color: bucketColors[index] || '#94A3B8',
    }));
  }, [data?.by_bucket]);

  const CustomTooltip = ({ active, payload }: {
    active?: boolean;
    payload?: Array<{ payload: typeof chartData[0] }>;
  }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-[var(--border-default)]">
        <div className="text-sm font-medium text-[var(--text-primary)] mb-2">
          {d.bucket}
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-[var(--text-tertiary)]">SKUs:</span>
            <span className="font-medium">{d.count}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[var(--text-tertiary)]">Avg Discount:</span>
            <span className="font-medium text-red-600">{d.avg_discount}%</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[var(--text-tertiary)]">Recovery Rate:</span>
            <span className={`font-medium ${d.recovery_rate >= 70 ? 'text-green-600' : d.recovery_rate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
              {d.recovery_rate}%
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Markdown Performance
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Clearance speed distribution
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="flex items-center gap-6 mb-4 p-3 bg-[var(--bg-secondary)] rounded-lg">
        <div>
          <div className="text-lg font-semibold text-[var(--text-primary)]">
            {data?.summary?.total_markdown_skus ?? 0}
          </div>
          <div className="text-xs text-[var(--text-tertiary)]">Total SKUs</div>
        </div>
        <div className="h-8 w-px bg-[var(--border-default)]" />
        <div>
          <div className="text-lg font-semibold text-green-600">
            {data?.summary?.recovery_rate ?? 0}%
          </div>
          <div className="text-xs text-[var(--text-tertiary)]">Avg Recovery</div>
        </div>
        <div className="h-8 w-px bg-[var(--border-default)]" />
        <div>
          <div className="text-lg font-semibold text-red-600">
            {data?.summary?.still_active_30d_plus ?? 0}
          </div>
          <div className="text-xs text-[var(--text-tertiary)]">Stuck &gt;30d</div>
        </div>
      </div>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 20, left: 10, bottom: 10 }}
          >
            <XAxis
              dataKey="bucket"
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border-subtle)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {(chartData ?? []).map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
              <LabelList
                dataKey="recovery_rate"
                position="top"
                formatter={(value) => `${value}%`}
                style={{ fill: 'var(--text-secondary)', fontSize: 10 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-[var(--text-tertiary)]">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-500" />
          Fast (&lt;7d)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-400" />
          Good (8-14d)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-500" />
          Slow (15-30d)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-500" />
          Stuck (&gt;30d)
        </span>
      </div>
    </div>
  );
}
