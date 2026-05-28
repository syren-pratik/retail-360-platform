'use client';

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Legend,
} from 'recharts';
import ChartCard from '@/app/components/charts/ChartCard';
import type { ColdstartMAPEPoint } from '@/app/lib/coldstart-types';
import { useColdstartFilters } from '../ColdstartFilterContext';

interface Props {
  data: ColdstartMAPEPoint[];
  convergenceDay: number;
}

const MODEL_COLORS: Record<string, string> = {
  naive_baseline:  '#94a3b8',
  original_analog: '#ef4444',
  fix1_store_type: '#f97316',
  fix2_blending:   '#3b82f6',
  fix3_festival:   '#f59e0b',
  all_3_combined:  '#8b5cf6',
};

const MODEL_LABELS: Record<string, string> = {
  naive_baseline:  'Naive Baseline',
  original_analog: 'Original Analog',
  fix1_store_type: 'Fix 1: Store Type',
  fix2_blending:   'Fix 2: Blending',
  fix3_festival:   'Fix 3: Festival',
  all_3_combined:  'All 3 Combined',
};

const ALL_MODEL_KEYS = [
  'naive_baseline', 'original_analog', 'fix1_store_type',
  'fix2_blending', 'fix3_festival', 'all_3_combined',
] as const;

type ModelKey = typeof ALL_MODEL_KEYS[number];

const FESTIVAL_MARKERS = [
  { day: 35, label: 'Onam start' },
  { day: 75, label: 'Diwali start' },
];

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
  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-lg text-xs min-w-[200px]">
      <p className="font-semibold text-[var(--text-primary)] mb-2">Day {label}</p>
      {payload
        .sort((a, b) => a.value - b.value)
        .map((p, i) => (
          <div key={i} className="flex justify-between gap-4 mb-0.5">
            <span style={{ color: p.color }}>{MODEL_LABELS[p.name] ?? p.name}</span>
            <span className="font-mono font-medium text-[var(--text-primary)]">
              {(p.value * 100).toFixed(1)}%
            </span>
          </div>
        ))}
    </div>
  );
};

export default function ColdstartMAPEOverTime({ data, convergenceDay }: Props) {
  const { filters } = useColdstartFilters();

  const filteredData = useMemo(() => {
    const horizonRanges: Record<string, [number, number]> = {
      week1:  [1, 7],
      month1: [1, 30],
      month2: [31, 60],
      month3: [61, 90],
      full:   [1, 90],
    };
    const [start, end] = horizonRanges[filters.horizon] ?? [1, 90];
    return data.filter((d) => d.day >= start && d.day <= end);
  }, [data, filters.horizon]);

  // Show all lines but bold the selected model
  const isSelected = (id: string) => filters.model === 'all' || filters.model === id;
  const isBold = (id: string) => filters.model !== 'all' && filters.model === id;

  const selectedLabel = filters.model !== 'all'
    ? MODEL_LABELS[filters.model] ?? filters.model
    : 'All models';

  const subtitle = `${selectedLabel} · 90-day Lucknow holdout${filters.horizon !== 'full' ? ` · ${filters.horizon}` : ''}`;

  return (
    <ChartCard
      id="coldstart-mape-over-time"
      title="MAPE Over Time — 90-Day Holdout Window"
      subtitle={subtitle}
      height={340}
      exportFilename="coldstart_mape_over_time"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={filteredData} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
          {/* Zone shading */}
          <ReferenceArea y1={0} y2={0.30} fill="#dcfce7" fillOpacity={0.35} />
          <ReferenceArea y1={0.30} y2={0.40} fill="#fef9c3" fillOpacity={0.35} />

          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `D${v}`}
            interval={8}
          />
          <YAxis
            domain={[0, 0.70]}
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
            axisLine={false}
            tickLine={false}
            width={38}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Threshold lines */}
          <ReferenceLine y={0.30} stroke="#16a34a" strokeDasharray="4 3" strokeWidth={1}
            label={{ value: '<30% good', fontSize: 9, fill: '#16a34a', position: 'insideTopRight' }} />
          <ReferenceLine y={0.40} stroke="#ca8a04" strokeDasharray="4 3" strokeWidth={1}
            label={{ value: '<40% acceptable', fontSize: 9, fill: '#ca8a04', position: 'insideTopRight' }} />

          {/* Convergence day */}
          <ReferenceLine
            x={convergenceDay}
            stroke="#3b82f6"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{ value: `Fix2 converges D${convergenceDay}`, fontSize: 9, fill: '#3b82f6', position: 'insideTopLeft' }}
          />

          {/* Festival markers */}
          {FESTIVAL_MARKERS.map((f) => (
            <ReferenceLine
              key={f.label}
              x={f.day}
              stroke="#f97316"
              strokeDasharray="2 4"
              strokeWidth={1}
              label={{ value: f.label, fontSize: 9, fill: '#f97316', position: 'top' }}
            />
          ))}

          {/* Model lines */}
          {ALL_MODEL_KEYS.map((key) => (
            isSelected(key) && (
              <Line
                key={key}
                type="monotone"
                dataKey={key as ModelKey}
                stroke={MODEL_COLORS[key]}
                strokeWidth={isBold(key) ? 3 : filters.model === 'all' ? 1.5 : 1}
                strokeOpacity={filters.model === 'all' ? 0.8 : isBold(key) ? 1 : 0.35}
                dot={false}
                name={key}
              />
            )
          ))}

          <Legend
            formatter={(value) => (
              <span style={{
                fontSize: 10,
                color: 'var(--text-secondary)',
                fontWeight: filters.model === value ? 700 : 400,
              }}>
                {MODEL_LABELS[value] ?? value}
              </span>
            )}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
