'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface DecompositionDataPoint {
  date: string;
  baseline: number;
  trend: number;
  seasonal: number;
  promotion: number;
}

interface DemandDecompositionProps {
  data: DecompositionDataPoint[];
}

type AggregationType = 'daily' | 'weekly' | 'monthly';

const COLORS = {
  baseline: '#94A3B8',      // gray
  trend: '#3B82F6',         // blue
  seasonal: '#14B8A6',      // teal
  promotion: '#A855F7',     // purple
  total: '#1E293B',         // dark for line
};

// Aggregate data based on selected view
function aggregateData(data: DecompositionDataPoint[], type: AggregationType): DecompositionDataPoint[] {
  if (!data || !Array.isArray(data) || data.length === 0) return [];
  if (type === 'daily') return data;

  const groups: Record<string, DecompositionDataPoint[]> = {};

  (data ?? []).forEach((point) => {
    const date = new Date(point.date);
    let key: string;

    if (type === 'weekly') {
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay());
      key = startOfWeek.toISOString().split('T')[0];
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    if (!groups[key]) groups[key] = [];
    groups[key].push(point);
  });

  return Object.entries(groups).map(([key, points]) => ({
    date: key,
    baseline: Math.round(points.reduce((sum, p) => sum + p.baseline, 0) / points.length),
    trend: Math.round(points.reduce((sum, p) => sum + p.trend, 0) / points.length),
    seasonal: Math.round(points.reduce((sum, p) => sum + p.seasonal, 0) / points.length),
    promotion: Math.round(points.reduce((sum, p) => sum + p.promotion, 0) / points.length),
  }));
}

function formatDate(dateStr: string, type: AggregationType): string {
  const d = new Date(dateStr);
  if (type === 'daily') {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
  if (type === 'weekly') {
    return `W${Math.ceil(d.getDate() / 7)} ${d.toLocaleDateString('en-IN', { month: 'short' })}`;
  }
  return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

export default function DemandDecomposition({ data }: DemandDecompositionProps) {
  const [aggregation, setAggregation] = useState<AggregationType>('daily');

  const aggregatedData = aggregateData(data, aggregation);

  // Add total to each data point
  const chartData = (aggregatedData ?? []).map((d) => ({
    ...d,
    total: (d.baseline ?? 0) + (d.trend ?? 0) + (d.seasonal ?? 0) + (d.promotion ?? 0),
  }));

  return (
    <div className="h-full flex flex-col">
      {/* Toggle buttons */}
      <div className="flex items-center gap-2 mb-4">
        {(['daily', 'weekly', 'monthly'] as AggregationType[]).map((type) => (
          <button
            key={type}
            onClick={() => setAggregation(type)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              aggregation === type
                ? 'bg-[var(--accent-primary)] text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatDate(String(v), aggregation)}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-lg text-xs">
                      <p className="font-semibold mb-2">{formatDate(String(label), aggregation)}</p>
                      {payload.map((entry) => (
                        <div key={entry.name} className="flex items-center justify-between gap-4 py-0.5">
                          <span className="flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-sm"
                              style={{ backgroundColor: entry.color }}
                            />
                            {entry.name}
                          </span>
                          <span className="font-medium">
                            {Number(entry.value).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                      <p className="mt-2 text-[var(--text-tertiary)] text-[10px]">Hover for details</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="rect"
              iconSize={10}
              wrapperStyle={{ fontSize: 11 }}
            />
            <Area
              type="monotone"
              dataKey="baseline"
              stackId="1"
              stroke={COLORS.baseline}
              fill={COLORS.baseline}
              name="Base"
            />
            <Area
              type="monotone"
              dataKey="trend"
              stackId="1"
              stroke={COLORS.trend}
              fill={COLORS.trend}
              name="Trend"
            />
            <Area
              type="monotone"
              dataKey="seasonal"
              stackId="1"
              stroke={COLORS.seasonal}
              fill={COLORS.seasonal}
              name="Seasonality"
            />
            <Area
              type="monotone"
              dataKey="promotion"
              stackId="1"
              stroke={COLORS.promotion}
              fill={COLORS.promotion}
              name="Promo Lift"
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke={COLORS.total}
              strokeWidth={2}
              dot={false}
              name="Total"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
