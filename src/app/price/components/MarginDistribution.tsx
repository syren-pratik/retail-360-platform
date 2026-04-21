'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { MarginDistributionData } from '@/app/lib/price-types';

interface MarginDistributionProps {
  data: MarginDistributionData | null | undefined;
}

export default function MarginDistribution({ data }: MarginDistributionProps) {
  // Compute chart data (must be before any early returns due to rules of hooks)
  const chartData = useMemo(() => {
    if (!data?.current) return [];
    return data.current.map((curr, index) => ({
      range: curr.range,
      current: curr.count,
      projected: data.projected?.[index]?.count ?? 0,
      currentRevenue: curr.avg_revenue,
      projectedRevenue: data.projected?.[index]?.avg_revenue ?? 0,
    }));
  }, [data]);

  // Calculate shift statistics (must be before any early returns due to rules of hooks)
  const shiftStats = useMemo(() => {
    const currentData = data?.current ?? [];
    const projectedData = data?.projected ?? [];

    const lowMarginCurrent = currentData
      .filter(b => b.range === '<5%' || b.range === '5-10%')
      .reduce((sum, b) => sum + b.count, 0);
    const lowMarginProjected = projectedData
      .filter(b => b.range === '<5%' || b.range === '5-10%')
      .reduce((sum, b) => sum + b.count, 0);
    const highMarginCurrent = currentData
      .filter(b => b.range === '20-25%' || b.range === '25%+')
      .reduce((sum, b) => sum + b.count, 0);
    const highMarginProjected = projectedData
      .filter(b => b.range === '20-25%' || b.range === '25%+')
      .reduce((sum, b) => sum + b.count, 0);

    return {
      lowMarginReduction: lowMarginCurrent - lowMarginProjected,
      highMarginIncrease: highMarginProjected - highMarginCurrent,
    };
  }, [data]);

  // Handle null/undefined data after hooks
  if (!data || !data.current || !data.projected || chartData.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-[var(--text-tertiary)]">Margin distribution data not available</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-[var(--border-default)]">
        <div className="text-sm font-medium text-[var(--text-primary)] mb-2">
          Margin: {label}
        </div>
        <div className="space-y-1 text-xs">
          {(payload ?? []).map((entry, index) => (
            <div key={index} className="flex justify-between gap-4">
              <span className="text-[var(--text-tertiary)] capitalize">
                {entry.dataKey === 'current' ? 'Current' : 'Projected'}:
              </span>
              <span className="font-medium" style={{ color: entry.color }}>
                {entry.value} products
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Margin Distribution
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Current vs projected after implementing recommendations
          </p>
        </div>
      </div>

      {/* Shift insight */}
      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
        <span className="text-green-800">
          Implementing recommendations moves <strong>{shiftStats.lowMarginReduction}</strong> products
          from low margin (&lt;10%) to higher tiers, and adds <strong>{shiftStats.highMarginIncrease}</strong> products
          to the high margin (&gt;20%) brackets.
        </span>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
          >
            <XAxis
              dataKey="range"
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border-subtle)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              label={{
                value: 'Products',
                angle: -90,
                position: 'insideLeft',
                offset: 0,
                style: { fill: 'var(--text-secondary)', fontSize: 11 }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => (
                <span className="text-xs text-[var(--text-secondary)]">
                  {value === 'current' ? 'Current' : 'Projected'}
                </span>
              )}
            />
            <Bar
              dataKey="current"
              fill="#94A3B8"
              radius={[4, 4, 0, 0]}
              name="current"
            />
            <Line
              type="monotone"
              dataKey="projected"
              stroke="#10B981"
              strokeWidth={3}
              dot={{ fill: '#10B981', strokeWidth: 2, r: 5 }}
              activeDot={{ r: 7 }}
              name="projected"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-center justify-center gap-6 text-xs text-[var(--text-tertiary)]">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-400" />
          Current distribution
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          Projected after changes
        </span>
      </div>
    </div>
  );
}
