'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { MarkdownData } from '@/app/lib/price-types';

interface MarkdownRecoveryProps {
  data: MarkdownData;
}

function formatCurrency(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return `₹${(value ?? 0).toLocaleString('en-IN')}`;
}

export default function MarkdownRecovery({ data }: MarkdownRecoveryProps) {
  const chartData = useMemo(() => {
    return (data?.recovery_trend ?? []).map(point => ({
      ...point,
      gap: (point.target ?? 0) - (point.cumulative_recovery ?? 0),
    }));
  }, [data?.recovery_trend]);

  const target = data?.summary?.total_original_value ?? 0;
  const recovered = data?.summary?.total_recovery ?? 0;
  const gap = target - recovered;
  const recoveryRate = data?.summary?.recovery_rate ?? 0;

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ value: number; dataKey: string }>;
    label?: string
  }) => {
    if (!active || !payload || !payload.length) return null;

    const recovery = payload.find(p => p.dataKey === 'cumulative_recovery')?.value || 0;
    const targetVal = payload.find(p => p.dataKey === 'target')?.value || target;
    const pct = ((recovery / targetVal) * 100).toFixed(1);

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-[var(--border-default)]">
        <div className="text-sm font-medium text-[var(--text-primary)] mb-2">
          {label}
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-[var(--text-tertiary)]">Recovered:</span>
            <span className="font-medium text-green-600">{formatCurrency(recovery)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[var(--text-tertiary)]">Target:</span>
            <span className="font-medium">{formatCurrency(targetVal)}</span>
          </div>
          <div className="flex justify-between gap-4 pt-1 border-t border-[var(--border-subtle)]">
            <span className="text-[var(--text-tertiary)]">Recovery %:</span>
            <span className="font-medium text-green-600">{pct}%</span>
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
            Markdown Recovery Trend
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Cumulative recovery vs target
          </p>
        </div>
      </div>

      {/* Recovery annotation */}
      <div className="mb-4 p-3 bg-[var(--bg-secondary)] rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-[var(--text-secondary)]">Current Recovery: </span>
            <span className="text-lg font-semibold text-green-600">{recoveryRate}%</span>
          </div>
          <div className="text-right text-sm">
            <span className="text-green-600 font-medium">{formatCurrency(recovered)}</span>
            <span className="text-[var(--text-tertiary)]"> of </span>
            <span className="text-[var(--text-primary)] font-medium">{formatCurrency(target)}</span>
          </div>
        </div>
        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all"
            style={{ width: `${recoveryRate}%` }}
          />
        </div>
        <div className="mt-1 text-xs text-red-600 text-right">
          Gap: {formatCurrency(gap)} ({(100 - recoveryRate).toFixed(1)}% unrecovered)
        </div>
      </div>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
          >
            <defs>
              <linearGradient id="recoveryGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="week"
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border-subtle)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatCurrency(value)}
              domain={[0, target]}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={target}
              stroke="#EF4444"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: `Target: ${formatCurrency(target)}`,
                position: 'right',
                fill: 'var(--text-secondary)',
                fontSize: 10,
              }}
            />
            <Area
              type="monotone"
              dataKey="cumulative_recovery"
              stroke="#10B981"
              strokeWidth={2}
              fill="url(#recoveryGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-[var(--text-tertiary)]">
        <span className="flex items-center gap-1.5">
          <span className="w-8 h-2 rounded bg-gradient-to-r from-green-400 to-green-600" />
          Cumulative recovery
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-8 border-t-2 border-dashed border-red-500" />
          Target value
        </span>
      </div>
    </div>
  );
}
