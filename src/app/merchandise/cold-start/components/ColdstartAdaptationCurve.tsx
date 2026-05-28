'use client';

import React from 'react';
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
import type { ColdstartAdaptationPoint } from '@/app/lib/coldstart-types';
import { useColdstartFilters } from '../ColdstartFilterContext';

interface Props {
  data: ColdstartAdaptationPoint[];
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pt = (payload[0] as any)?.payload as ColdstartAdaptationPoint | undefined;
  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-lg text-xs min-w-[180px]">
      <p className="font-semibold text-[var(--text-primary)] mb-2">Day {label} · α = {pt?.alpha.toFixed(2)}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex justify-between gap-4 mb-0.5">
          <span style={{ color: p.color }}>
            {p.name === 'pure_analog' ? 'Analog prior' :
             p.name === 'pure_local' ? 'Local data' :
             p.name === 'blended' ? 'Blended' : p.name}
          </span>
          <span className="font-mono font-medium">{p.value.toFixed(2)} units</span>
        </div>
      ))}
    </div>
  );
};

export default function ColdstartAdaptationCurve({ data }: Props) {
  const { filters } = useColdstartFilters();

  return (
    <ChartCard
      id="coldstart-adaptation-curve"
      title="Adaptation Curve"
      subtitle="blended = α × local + (1−α) × analog · α grows from 0 → 1 as local data accumulates"
      height={300}
      exportFilename="coldstart_adaptation_curve"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
          {/* Phase zones */}
          <ReferenceArea x1={1}  x2={30} fill="#fef3c7" fillOpacity={0.35} />
          <ReferenceArea x1={30} x2={60} fill="#dbeafe" fillOpacity={0.30} />
          <ReferenceArea x1={60} x2={90} fill="#d1fae5" fillOpacity={0.35} />

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
            width={32}
            tickFormatter={(v: number) => `${v.toFixed(0)}`}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Phase labels */}
          <ReferenceLine x={15} stroke="transparent"
            label={{ value: 'Analog dominant', fontSize: 8, fill: '#b45309', position: 'top' }} />
          <ReferenceLine x={45} stroke="transparent"
            label={{ value: 'Blending active', fontSize: 8, fill: '#1d4ed8', position: 'top' }} />
          <ReferenceLine x={75} stroke="transparent"
            label={{ value: 'Local dominant', fontSize: 8, fill: '#065f46', position: 'top' }} />

          {/* Selected day */}
          <ReferenceLine
            x={filters.selected_day_num}
            stroke="var(--accent-primary)"
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{ value: `D${filters.selected_day_num}`, fontSize: 9, fill: 'var(--accent-primary)', position: 'insideTopLeft' }}
          />

          <Line type="monotone" dataKey="pure_analog" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="pure_analog" />
          <Line type="monotone" dataKey="pure_local"  stroke="#10b981" strokeWidth={1.5} dot={false} name="pure_local" />
          <Line type="monotone" dataKey="blended"     stroke="#3b82f6" strokeWidth={2.5} dot={false} name="blended" />

          <Legend
            formatter={(value) => (
              <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                {value === 'pure_analog' ? 'Analog prior' :
                 value === 'pure_local' ? 'Local data' :
                 value === 'blended' ? 'Blended (champion)' : value}
              </span>
            )}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
