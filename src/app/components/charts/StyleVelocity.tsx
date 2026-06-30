'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from 'recharts';
import ChartCard from './ChartCard';
import { LIFECYCLE_STAGE_COLORS } from '@/app/lib/palette-apparel';

interface Style {
  style_id: string;
  style_name: string;
  brand: string;
  category: string;
  season_tag: string;
  weeks_in_intro: number;
  weeks_in_core: number;
  weeks_in_markdown_1: number;
  weeks_in_markdown_2: number;
  weeks_in_markdown_3: number;
  weeks_in_clearance: number;
  stuck_warning: string;
}

export interface StyleVelocityData {
  styles: Style[];
  benchmarks?: Record<string, number>;
}

interface Props {
  data: StyleVelocityData | null;
}

const STAGES = [
  { key: 'weeks_in_intro', label: 'Intro', color: LIFECYCLE_STAGE_COLORS.Intro },
  { key: 'weeks_in_core', label: 'Core', color: LIFECYCLE_STAGE_COLORS.Core },
  { key: 'weeks_in_markdown_1', label: 'Markdown 1', color: LIFECYCLE_STAGE_COLORS['Markdown 1'] },
  { key: 'weeks_in_markdown_2', label: 'Markdown 2', color: LIFECYCLE_STAGE_COLORS['Markdown 2'] },
  { key: 'weeks_in_markdown_3', label: 'Markdown 3', color: LIFECYCLE_STAGE_COLORS['Markdown 3'] },
  { key: 'weeks_in_clearance', label: 'Clearance', color: LIFECYCLE_STAGE_COLORS.Clearance },
] as const;

interface ChartRow {
  name: string;
  fullName: string;
  warning: string;
  Intro: number;
  Core: number;
  'Markdown 1': number;
  'Markdown 2': number;
  'Markdown 3': number;
  Clearance: number;
}

interface TipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string; payload: ChartRow }>;
  label?: string;
}

export default function StyleVelocity({ data }: Props) {
  const rows = useMemo<ChartRow[]>(() => {
    if (!data?.styles) return [];
    return data.styles
      .map((s) => {
        const total =
          s.weeks_in_intro +
          s.weeks_in_core +
          s.weeks_in_markdown_1 +
          s.weeks_in_markdown_2 +
          s.weeks_in_markdown_3 +
          s.weeks_in_clearance;
        return {
          name: s.style_id,
          fullName: s.style_name,
          warning: s.stuck_warning,
          total,
          Intro: s.weeks_in_intro,
          Core: s.weeks_in_core,
          'Markdown 1': s.weeks_in_markdown_1,
          'Markdown 2': s.weeks_in_markdown_2,
          'Markdown 3': s.weeks_in_markdown_3,
          Clearance: s.weeks_in_clearance,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 18)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ total: _t, ...rest }) => rest);
  }, [data]);

  if (!data || !rows.length) {
    return (
      <ChartCard id="style-velocity" title="Style Velocity Ladder" height={420}>
        <div className="text-sm text-[var(--text-secondary)] flex h-full items-center justify-center">
          No style velocity data available.
        </div>
      </ChartCard>
    );
  }

  const Tip = ({ active, payload, label }: TipProps) => {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    return (
      <div className="bg-white border border-[var(--border-default)] rounded-lg p-2.5 shadow-sm text-xs">
        <p className="font-medium text-sm">{row.fullName}</p>
        <p className="text-[var(--text-tertiary)] mb-1">{label} · {row.warning.replace(/_/g, ' ')}</p>
        {payload.map((p) => (
          <div key={p.name} className="flex justify-between gap-3">
            <span style={{ color: p.color }}>{p.name}</span>
            <span className="font-medium">{p.value}w</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <ChartCard
      id="style-velocity"
      title="Style Velocity Ladder"
      subtitle="Weeks spent in each lifecycle stage — Intro → Clearance"
      height={460}
      data={rows as unknown as Record<string, unknown>[]}
      exportFilename="style-velocity"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 5, right: 16, left: 70, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
          <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9CA3AF" unit="w" />
          <YAxis
            dataKey="name"
            type="category"
            width={70}
            tick={{ fontSize: 10 }}
            stroke="#9CA3AF"
            interval={0}
          />
          <Tooltip content={<Tip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {STAGES.map((s) => (
            <Bar key={s.label} dataKey={s.label} stackId="lifecycle" fill={s.color} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
