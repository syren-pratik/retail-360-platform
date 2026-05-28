'use client';

import React, { useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import ChartCard from '@/app/components/charts/ChartCard';
import type { ColdstartSKUDrillPoint } from '@/app/lib/coldstart-types';
import { useColdstartFilters } from '../ColdstartFilterContext';

interface Props {
  series: ColdstartSKUDrillPoint[];
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: number;
}) => {
  if (!active || !payload?.length) return null;
  const predicted = payload.find((p) => p.name === 'predicted')?.value;
  const actual = payload.find((p) => p.name === 'actual')?.value;
  const lower = payload.find((p) => p.name === 'lower_95')?.value;
  const ciRange = payload.find((p) => p.name === 'ci_range')?.value;
  const upper = lower !== undefined && ciRange !== undefined ? lower + ciRange : undefined;
  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-lg text-xs min-w-[180px]">
      <p className="font-semibold text-[var(--text-primary)] mb-2">Day {label}</p>
      {predicted !== undefined && (
        <div className="flex justify-between gap-4 mb-0.5">
          <span className="text-blue-600">Predicted</span>
          <span className="font-mono font-medium">{predicted.toFixed(1)} units</span>
        </div>
      )}
      {actual !== undefined && (
        <div className="flex justify-between gap-4 mb-0.5">
          <span className="text-emerald-600">Actual</span>
          <span className="font-mono font-medium">{actual.toFixed(1)} units</span>
        </div>
      )}
      {lower !== undefined && upper !== undefined && (
        <div className="flex justify-between gap-4 text-[var(--text-tertiary)]">
          <span>95% CI</span>
          <span className="font-mono">[{lower.toFixed(0)}, {upper.toFixed(0)}]</span>
        </div>
      )}
    </div>
  );
};

export default function ColdstartSKUDrill({ series }: Props) {
  const { filters } = useColdstartFilters();

  const chartData = useMemo(
    () => series.filter((d) => d.sku_id === filters.selected_sku_id),
    [series, filters.selected_sku_id]
  );

  const summaryTiles = useMemo(() => {
    if (!chartData.length) return null;
    const absMAPE = (slice: ColdstartSKUDrillPoint[]) => {
      if (!slice.length) return null;
      const mape = slice.reduce((acc, d) => {
        if (d.actual === 0) return acc;
        return acc + Math.abs((d.predicted - d.actual) / d.actual);
      }, 0) / slice.length;
      return (mape * 100).toFixed(1);
    };
    return [
      { label: 'Week 1 (D1–D7)',    mape: absMAPE(chartData.filter((d) => d.day <= 7)) },
      { label: 'Month 1 (D1–D30)',  mape: absMAPE(chartData.filter((d) => d.day <= 30)) },
      { label: 'Month 2–3 (D31–D90)', mape: absMAPE(chartData.filter((d) => d.day > 30)) },
    ];
  }, [chartData]);

  const isEmpty = chartData.length === 0;

  return (
    <ChartCard
      id="coldstart-sku-drill"
      title="SKU Accuracy Drill-Down"
      subtitle={`${filters.selected_sku_id} · 90-day predicted vs actual with 95% CI band · vertical line = selected day`}
      height={320}
      exportFilename="coldstart_sku_drill"
      isEmpty={isEmpty}
    >
      <div className="space-y-3">
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
            {/* CI band: transparent base + colored range on top */}
            <Area
              dataKey="lower_95"
              fill="transparent"
              stroke="none"
              stackId="ci"
              legendType="none"
              name="lower_95"
            />
            <Area
              dataKey="ci_range"
              fill="rgba(59,130,246,0.12)"
              stroke="none"
              stackId="ci"
              legendType="none"
              name="ci_range"
            />

            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `D${v}`}
              interval={8}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
              axisLine={false}
              tickLine={false}
              width={34}
              tickFormatter={(v: number) => v.toFixed(0)}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Selected-day reference line */}
            <ReferenceLine
              x={filters.selected_day_num}
              stroke="var(--accent-primary)"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{ value: `D${filters.selected_day_num}`, fontSize: 9, fill: 'var(--accent-primary)', position: 'top' }}
            />

            <Line
              type="monotone"
              dataKey="predicted"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="predicted"
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#10b981"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="3 2"
              name="actual"
            />

            <Legend
              formatter={(value) => (
                <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                  {value === 'predicted' ? 'Predicted' : value === 'actual' ? 'Actual' : value}
                </span>
              )}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Summary tiles */}
        {summaryTiles && (
          <div className="grid grid-cols-3 gap-3">
            {summaryTiles.map((tile) => (
              <div key={tile.label} className="bg-[var(--bg-secondary)] rounded-lg px-3 py-2 text-center">
                <p className="text-[10px] text-[var(--text-secondary)] mb-0.5">{tile.label}</p>
                <p className={`text-base font-mono font-bold ${
                  tile.mape === null ? 'text-[var(--text-tertiary)]' :
                  Number(tile.mape) < 30 ? 'text-emerald-600' :
                  Number(tile.mape) < 40 ? 'text-amber-600' : 'text-red-500'
                }`}>
                  {tile.mape !== null ? `${tile.mape}%` : '—'}
                </p>
                <p className="text-[9px] text-[var(--text-tertiary)]">MAPE</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </ChartCard>
  );
}
