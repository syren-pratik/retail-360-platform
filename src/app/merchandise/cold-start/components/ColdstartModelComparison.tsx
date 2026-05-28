'use client';

import React from 'react';
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
import ChartCard from '@/app/components/charts/ChartCard';
import type { ColdstartModelVariant } from '@/app/lib/coldstart-types';
import { useColdstartFilters } from '../ColdstartFilterContext';
import type { ModelFilter } from '../ColdstartFilterContext';

interface Props {
  variants: ColdstartModelVariant[];
}

const ITERATION_STEPS: {
  id: ModelFilter;
  step: string;
  description: string;
  mape: number;
  isChampion: boolean;
}[] = [
  { id: 'naive_baseline',  step: 'Baseline',     description: 'National avg scaled to Lucknow population',                          mape: 0.442, isChampion: false },
  { id: 'original_analog', step: 'Analog (raw)', description: 'Direct transfer from analog cities — uncalibrated',                  mape: 0.540, isChampion: false },
  { id: 'fix1_store_type', step: 'Fix 1',        description: 'Analog weighted by store format (Express / Dark Store / Hypermarket)',mape: 0.541, isChampion: false },
  { id: 'fix2_blending',   step: 'Fix 2',        description: 'Bayesian blend: analog prior + live Lucknow data (alpha = d/90)',    mape: 0.277, isChampion: true  },
  { id: 'fix3_festival',   step: 'Fix 3',        description: 'Festival calendar uplift — reduces MAPE vs raw analog',              mape: 0.544, isChampion: false },
  { id: 'all_3_combined',  step: 'All 3',        description: 'Store type + blending + festival combined',                          mape: 0.312, isChampion: false },
];

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-lg text-xs">
      <p className="font-medium text-[var(--text-primary)] mb-1">{label}</p>
      <p className="text-[var(--text-secondary)]">MAPE: {(payload[0].value * 100).toFixed(1)}%</p>
    </div>
  );
};

export default function ColdstartModelComparison({ variants }: Props) {
  const { filters, dispatch } = useColdstartFilters();

  const chartData = variants.map((v) => ({
    id: v.id,
    name: v.label,
    mape: v.mape,
    color: v.color,
    isSelected: filters.model === v.id,
    isChampion: v.id === 'fix2_blending',
  }));

  function selectModel(id: string) {
    const newModel = id as ModelFilter;
    // Toggle: clicking the already-selected model resets to 'all'
    dispatch({ type: 'setModel', payload: filters.model === newModel ? 'all' : newModel });
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Bar chart */}
      <ChartCard
        id="coldstart-model-bar"
        title="Model MAPE Comparison"
        subtitle="Click a bar to filter · lower is better · 90-day holdout"
        height={280}
        exportFilename="coldstart_model_comparison"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 54, bottom: 4, left: 8 }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onClick={(data: any) => {
              const id = data?.activePayload?.[0]?.payload?.id as string | undefined;
              if (id) selectModel(id);
            }}
            style={{ cursor: 'pointer' }}
          >
            <XAxis
              type="number"
              domain={[0, 0.65]}
              tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 10, fill: 'var(--text-primary)' }}
              width={110}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="mape" radius={[0, 4, 4, 0]} maxBarSize={24}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.color}
                  opacity={
                    filters.model === 'all'
                      ? (entry.isChampion ? 1 : 0.65)
                      : entry.isSelected ? 1 : 0.3
                  }
                  stroke={entry.isSelected ? entry.color : 'none'}
                  strokeWidth={entry.isSelected ? 2 : 0}
                />
              ))}
              <LabelList
                dataKey="mape"
                position="right"
                formatter={(v: unknown) => typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : ''}
                style={{ fontSize: 11, fill: 'var(--text-primary)', fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Iteration timeline table */}
      <ChartCard
        id="coldstart-iteration-table"
        title="Iteration Timeline"
        subtitle="Click a row to filter the page to that model"
        height={280}
        exportFilename="coldstart_iteration_timeline"
      >
        <div className="overflow-auto h-full">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="text-left py-1.5 px-2 text-[var(--text-secondary)] font-medium w-14">Step</th>
                <th className="text-left py-1.5 px-2 text-[var(--text-secondary)] font-medium">What changed</th>
                <th className="text-right py-1.5 px-2 text-[var(--text-secondary)] font-medium w-14">MAPE</th>
                <th className="text-right py-1.5 px-2 text-[var(--text-secondary)] font-medium w-16">vs prev</th>
              </tr>
            </thead>
            <tbody>
              {ITERATION_STEPS.map((row, i) => {
                const prev = i > 0 ? ITERATION_STEPS[i - 1].mape : null;
                const delta = prev !== null ? row.mape - prev : null;
                const isSelected = filters.model === row.id;
                const rowBg = isSelected
                  ? 'bg-blue-50'
                  : row.isChampion
                  ? 'bg-emerald-50'
                  : '';
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-[var(--border-default)] last:border-0 cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors ${rowBg}`}
                    onClick={() => selectModel(row.id)}
                  >
                    <td className={`py-1.5 px-2 font-semibold ${row.isChampion ? 'text-emerald-700' : isSelected ? 'text-blue-600' : 'text-[var(--text-primary)]'}`}>
                      {row.step}
                      {row.isChampion && (
                        <span className="ml-1 text-[9px] bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded font-normal">
                          best
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-[var(--text-secondary)] leading-tight">{row.description}</td>
                    <td className="py-1.5 px-2 text-right font-mono font-medium text-[var(--text-primary)]">
                      {(row.mape * 100).toFixed(1)}%
                    </td>
                    <td className={`py-1.5 px-2 text-right font-mono ${
                      delta === null ? '' : delta < 0 ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {delta === null ? '—' : `${delta > 0 ? '+' : ''}${(delta * 100).toFixed(1)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
