'use client';

import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import ChartCard from '@/app/components/charts/ChartCard';
import { NoDataFallback } from '@/app/components/ui/NoDataFallback';

interface StockoutTrendData {
  date: string;
  stockout_count: number;
  lost_sales: number;
}

interface StockoutTrendProps {
  data: StockoutTrendData[];
}

type ViewMode = 'count' | 'lost_sales';

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: StockoutTrendData }>;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const formattedDate = new Date(data.date ?? '').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg shadow-lg p-3">
      <p className="text-xs text-[var(--text-tertiary)] mb-1">{formattedDate}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4 text-sm">
          <span className="text-[var(--text-secondary)]">Stockouts:</span>
          <span className="font-medium text-red-600">{(data.stockout_count ?? 0)}</span>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <span className="text-[var(--text-secondary)]">Lost Sales:</span>
          <span className="font-medium text-red-600">₹{((data.lost_sales ?? 0) / 1000).toFixed(0)}K</span>
        </div>
      </div>
    </div>
  );
}

export default function StockoutTrend({ data }: StockoutTrendProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('count');

  // Calculate trend (comparing last 30 days to previous 30 days)
  const trend = useMemo(() => {
    if ((data ?? []).length < 60) return null;

    const recent30 = (data ?? []).slice(-30);
    const previous30 = (data ?? []).slice(-60, -30);

    const recentAvg = (recent30 ?? []).reduce((sum, d) => sum + (d.stockout_count ?? 0), 0) / (recent30?.length ?? 1);
    const previousAvg = (previous30 ?? []).reduce((sum, d) => sum + (d.stockout_count ?? 0), 0) / (previous30?.length ?? 1);

    const change = ((recentAvg - previousAvg) / (previousAvg || 1)) * 100;
    return {
      value: Math.abs(change).toFixed(0),
      isUp: change > 0,
    };
  }, [data]);

  // Format data for the chart
  const chartData = useMemo(() => {
    return (data ?? []).map(d => ({
      ...d,
      displayDate: new Date(d.date ?? '').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    }));
  }, [data]);

  // Guard against null/undefined data - after all hooks
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <NoDataFallback title="No data" message="Data is not available." />;
  }

  const dataKey = viewMode === 'count' ? 'stockout_count' : 'lost_sales';
  const yAxisFormatter = viewMode === 'count'
    ? (val: number) => val.toString()
    : (val: number) => `₹${(val / 100000).toFixed(0)}L`;

  return (
    <ChartCard
      id="stockout-trend"
      title="Stockout Trend"
      subtitle="60-day stockout pattern"
      height={280}
      data={data as unknown as Record<string, unknown>[]}
    >
      <div className="h-full flex flex-col">
        {/* Header with toggle and trend */}
        <div className="flex items-center justify-between mb-3">
          {/* Toggle buttons */}
          <div className="flex rounded-md border border-[var(--border-default)] overflow-hidden">
            <button
              onClick={() => setViewMode('count')}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === 'count'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-white text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              Count
            </button>
            <button
              onClick={() => setViewMode('lost_sales')}
              className={`px-3 py-1 text-xs font-medium transition-colors border-l border-[var(--border-default)] ${
                viewMode === 'lost_sales'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-white text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              Lost Sales ₹
            </button>
          </div>

          {/* Trend annotation */}
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium ${
              trend.isUp ? 'text-red-600' : 'text-green-600'
            }`}>
              {trend.isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>{trend.isUp ? '↑' : '↓'} {trend.value}% MoM</span>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 10, bottom: 20, left: 40 }}
            >
              <defs>
                <linearGradient id="stockoutGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#DC2626" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#DC2626" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />

              <XAxis
                dataKey="displayDate"
                tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border-subtle)' }}
                interval={9}
              />

              <YAxis
                tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={yAxisFormatter}
                width={50}
              />

              <Tooltip content={<CustomTooltip />} />

              <Area
                type="monotone"
                dataKey={dataKey}
                stroke="#DC2626"
                strokeWidth={2}
                fill="url(#stockoutGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartCard>
  );
}
