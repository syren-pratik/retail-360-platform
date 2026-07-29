'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import ChartCard from '@/app/components/charts/ChartCard';
import type { ColdstartPredDecompPoint } from '@/app/lib/coldstart-types';
import { useColdstartFilters } from '../ColdstartFilterContext';
import { useTenant } from '@/app/context/TenantContext';

interface Props {
  data: ColdstartPredDecompPoint[];
}

const STACK_COLORS_GROCERY: Record<string, string> = {
  jaipur_contribution:    '#f59e0b',
  ahmedabad_contribution: '#6366f1',
  kolkata_contribution:   '#10b981',
  festival_uplift:        '#f97316',
  local_blend:            '#3b82f6',
};
const STACK_LABELS_GROCERY: Record<string, string> = {
  jaipur_contribution:    'Jaipur (38.8%)',
  ahmedabad_contribution: 'Ahmedabad (30.8%)',
  kolkata_contribution:   'Kolkata (30.4%)',
  festival_uplift:        'Festival uplift',
  local_blend:            'Local blend (α)',
};
const STACK_KEYS_GROCERY = ['jaipur_contribution', 'ahmedabad_contribution', 'kolkata_contribution', 'festival_uplift', 'local_blend'];

const STACK_COLORS_APPAREL: Record<string, string> = {
  dallas_contribution:  '#f59e0b',
  houston_contribution: '#6366f1',
  atlanta_contribution: '#10b981',
  festival_uplift:      '#f97316',
  local_blend:          '#3b82f6',
};
const STACK_LABELS_APPAREL: Record<string, string> = {
  dallas_contribution:  'Dallas (34%)',
  houston_contribution: 'Houston (26%)',
  atlanta_contribution: 'Atlanta (18%)',
  festival_uplift:      'BTS uplift',
  local_blend:          'Local blend (α)',
};
const STACK_KEYS_APPAREL = ['dallas_contribution', 'houston_contribution', 'atlanta_contribution', 'festival_uplift', 'local_blend'];

const SNAP_DAYS = [1, 15, 30, 60, 90];

export default function ColdstartPredictionDecomposition({ data }: Props) {
  const { filters } = useColdstartFilters();
  const { isApparel, isRetail } = useTenant();
  const STACK_COLORS = isApparel ? STACK_COLORS_APPAREL : STACK_COLORS_GROCERY;
  const STACK_LABELS = isApparel ? STACK_LABELS_APPAREL : STACK_LABELS_GROCERY;
  const STACK_KEYS = isApparel ? STACK_KEYS_APPAREL : STACK_KEYS_GROCERY;
  const skuData = data.filter((d) => d.sku_id === filters.selected_sku_id);

  // For selected day: find closest snap day
  const closestDay = SNAP_DAYS.reduce((prev, curr) =>
    Math.abs(curr - filters.selected_day_num) < Math.abs(prev - filters.selected_day_num) ? curr : prev
  );
  const selected = skuData.find((d) => d.day_num === closestDay);

  const chartData = skuData.map((d) => ({
    name: `D${d.day_num}`,
    day_num: d.day_num,
    jaipur_contribution: d.jaipur_contribution,
    ahmedabad_contribution: d.ahmedabad_contribution,
    kolkata_contribution: d.kolkata_contribution,
    festival_uplift: d.festival_uplift,
    local_blend: d.local_blend,
    actual: d.actual,
  }));

  const alpha = (filters.selected_day_num / 90).toFixed(2);

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Stacked bar chart */}
      <ChartCard
        id="coldstart-pred-decomp-chart"
        title="Prediction Decomposition"
        subtitle={`SKU ${filters.selected_sku_id} · analog contributions + local blend across 5 snapshots`}
        height={260}
        exportFilename="coldstart_pred_decomp"
        data={chartData as unknown as Record<string, unknown>[]}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
              axisLine={false}
              tickLine={false}
              width={32}
              tickFormatter={(v: number) => `${v.toFixed(0)}`}
            />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [
                typeof value === 'number' ? value.toFixed(2) : String(value),
                STACK_LABELS[name as string] ?? name,
              ]}
            />
            {STACK_KEYS.map((key) => (
              <Bar key={key} dataKey={key} stackId="pred" fill={STACK_COLORS[key]} maxBarSize={48}>
                {key === 'local_blend' && (
                  <LabelList
                    dataKey="actual"
                    position="top"
                    formatter={(v: unknown) => typeof v === 'number' ? `A:${v.toFixed(0)}` : ''}
                    style={{ fontSize: 9, fill: 'var(--text-tertiary)' }}
                  />
                )}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Math breakdown panel */}
      <ChartCard
        id="coldstart-pred-decomp-math"
        title="Blend Formula — Selected Day"
        subtitle={`Day ${closestDay} snapshot · α = ${alpha} · blended = α × local + (1−α) × analog`}
        height={260}
        exportFilename="coldstart_pred_math"
      >
        {selected ? (
          <div className="space-y-3 text-xs">
            {/* Formula display */}
            <div className="bg-blue-50 rounded-lg px-3 py-2 font-mono text-[11px] text-blue-800">
              <p>blended = <span className="font-bold">{alpha}</span> × local + <span className="font-bold">{(1 - Number(alpha)).toFixed(2)}</span> × analog</p>
            </div>

            {/* Component breakdown */}
            <div className="space-y-1.5">
              {STACK_KEYS.map((key) => {
                const val = selected[key as keyof ColdstartPredDecompPoint] as number;
                const total = selected.total_prediction;
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: STACK_COLORS[key] }}
                    />
                    <span className="text-[var(--text-secondary)] flex-1">{STACK_LABELS[key]}</span>
                    <span className="font-mono font-semibold text-[var(--text-primary)] w-14 text-right">
                      {val.toFixed(1)} units
                    </span>
                    <span className="text-[var(--text-tertiary)] w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-[var(--border-default)] pt-2 flex justify-between">
              <span className="font-medium text-[var(--text-primary)]">Total prediction</span>
              <span className="font-mono font-bold text-[var(--text-primary)]">{selected.total_prediction.toFixed(1)} units</span>
            </div>
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>Actual (holdout)</span>
              <span className="font-mono font-semibold text-[var(--text-primary)]">{selected.actual.toFixed(1)} units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Error</span>
              <span className={`font-mono font-semibold ${
                Math.abs(selected.total_prediction - selected.actual) / Math.max(selected.actual, 0.1) < 0.3
                  ? 'text-emerald-600' : 'text-red-500'
              }`}>
                {selected.actual > 0
                  ? `${(((selected.total_prediction - selected.actual) / selected.actual) * 100).toFixed(1)}%`
                  : 'N/A'}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-[var(--text-tertiary)]">
            No decomposition data for this SKU
          </div>
        )}
      </ChartCard>
    </div>
  );
}
