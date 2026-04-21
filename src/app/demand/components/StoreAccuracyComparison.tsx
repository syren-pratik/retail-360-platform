'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Maximize2, AlertTriangle } from 'lucide-react';
import { StoreAccuracyData, StoreAccuracySummary } from '@/app/lib/demand-types';

interface StoreAccuracyComparisonProps {
  data: StoreAccuracyData[];
  summary: StoreAccuracySummary;
}

// Color based on MAPE
const getMapeColor = (mape: number): string => {
  if (mape < 10) return '#10B981'; // Green - Good
  if (mape < 15) return '#F59E0B'; // Amber - Warning
  return '#EF4444'; // Red - Poor
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: StoreAccuracyData }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-sm">
        <p className="font-medium text-sm mb-1">{data.store_name}</p>
        <p className="text-xs text-[var(--text-tertiary)] mb-2">{data.city}, {data.region}</p>
        <p className="text-sm">
          MAPE: <span className={`font-medium ${data.mape < 10 ? 'text-green-600' : data.mape < 15 ? 'text-amber-600' : 'text-red-600'}`}>
            {(data.mape ?? 0).toFixed(1)}%
          </span>
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          Bias: <span className={`font-medium ${data.bias > 0 ? 'text-blue-600' : 'text-orange-600'}`}>
            {data.bias > 0 ? '+' : ''}{(data.bias ?? 0).toFixed(1)}%
          </span>
        </p>
        <p className="text-xs text-[var(--text-tertiary)] mt-2 border-t pt-2 border-[var(--border-subtle)]">
          Issue: {data.top_issue}
        </p>
      </div>
    );
  }
  return null;
};

export default function StoreAccuracyComparison({ data, summary }: StoreAccuracyComparisonProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sort by MAPE (worst at top)
  const sortedData = useMemo(() =>
    [...(data ?? [])].sort((a, b) => b.mape - a.mape),
    [data]
  );

  // Stores needing attention (MAPE > 12%)
  const needsAttention = useMemo(() =>
    (sortedData ?? []).filter(s => s.mape > 12),
    [sortedData]
  );

  return (
    <div className="card h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Store Forecast Accuracy
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            MAPE by store (sorted by worst performing)
          </p>
        </div>
        <button
          className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
          title="Expand"
        >
          <Maximize2 size={16} />
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 bg-green-50 rounded-lg">
          <div className="text-lg font-semibold text-green-700">{summary.stores_under_10_mape}</div>
          <div className="text-xs text-green-600">Good (&lt;10%)</div>
        </div>
        <div className="text-center p-2 bg-amber-50 rounded-lg">
          <div className="text-lg font-semibold text-amber-700">{summary.stores_10_to_15_mape}</div>
          <div className="text-xs text-amber-600">Warning (10-15%)</div>
        </div>
        <div className="text-center p-2 bg-red-50 rounded-lg">
          <div className="text-lg font-semibold text-red-700">{summary.stores_over_15_mape}</div>
          <div className="text-xs text-red-600">Poor (&gt;15%)</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[220px]">
        {isMounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={(sortedData ?? []).slice(0, 10)}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border-subtle)"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border-default)' }}
                domain={[0, 20]}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="store_name"
                tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                tickLine={false}
                axisLine={false}
                width={100}
                tickFormatter={(v) => v.length > 12 ? (v ?? '').substring(0, 12) + '...' : v}
              />
              <ReferenceLine
                x={10}
                stroke="#10B981"
                strokeDasharray="5 5"
                strokeOpacity={0.7}
              />
              <ReferenceLine
                x={15}
                stroke="#F59E0B"
                strokeDasharray="5 5"
                strokeOpacity={0.7}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="mape"
                radius={[0, 4, 4, 0]}
              >
                {(sortedData ?? []).slice(0, 10).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getMapeColor(entry.mape)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="animate-pulse bg-[var(--bg-secondary)] rounded h-full" />
        )}
      </div>

      {/* Attention Needed */}
      {(needsAttention ?? []).length > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
          <div className="flex items-start gap-2 text-sm">
            <AlertTriangle size={14} className="text-[var(--status-warning)] mt-0.5 flex-shrink-0" />
            <p className="text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--status-warning)]">
                {(needsAttention ?? []).length} stores
              </span>
              {' '}need attention: {(needsAttention ?? []).slice(0, 3).map(s => s.store_name).join(', ')}
              {(needsAttention ?? []).length > 3 && ` +${(needsAttention ?? []).length - 3} more`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
