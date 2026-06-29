'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip, CartesianGrid, LabelList } from 'recharts';
import ChartCard from './ChartCard';

interface Stage {
  stage: string;
  value_usd_k: number;
  type: 'total' | 'positive' | 'negative' | 'result';
  pct_of_skus?: number;
}

export interface MarkdownLifecycleData {
  network_waterfall: Stage[];
  per_style_waterfalls?: Array<{ style_id: string; style_name: string; stages: Stage[] }>;
}

interface Props {
  data: MarkdownLifecycleData | null;
}

const TYPE_COLORS: Record<Stage['type'], string> = {
  total: '#3B82F6',
  positive: '#10B981',
  negative: '#F59E0B',
  result: '#7C3AED',
};

interface ChartRow {
  stage: string;
  shortStage: string;
  base: number;
  delta: number;
  type: Stage['type'];
  pct_of_skus: number;
  signed: number;
}

interface TipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartRow }>;
}

export default function MarkdownLifecycleWaterfall({ data }: Props) {
  const rows = useMemo<ChartRow[]>(() => {
    if (!data?.network_waterfall?.length) return [];
    let running = 0;
    return data.network_waterfall.map((s) => {
      const v = s.value_usd_k;
      if (s.type === 'total' || s.type === 'result') {
        const row: ChartRow = {
          stage: s.stage,
          shortStage: s.stage.replace(/\s*\(.*?\)/, ''),
          base: 0,
          delta: Math.abs(v) === v ? v : Math.abs(v),
          type: s.type,
          pct_of_skus: s.pct_of_skus ?? 0,
          signed: v,
        };
        running = Math.abs(v);
        return row;
      }
      const delta = Math.abs(v);
      const base = Math.max(0, running - delta);
      const row: ChartRow = {
        stage: s.stage,
        shortStage: s.stage.replace(/\s*\(.*?\)/, ''),
        base,
        delta,
        type: s.type,
        pct_of_skus: s.pct_of_skus ?? 0,
        signed: v,
      };
      running -= delta;
      if (running < 0) running = 0;
      return row;
    });
  }, [data]);

  if (!data || !rows.length) {
    return (
      <ChartCard id="markdown-lifecycle-waterfall" title="Markdown Lifecycle Waterfall" height={420}>
        <div className="text-sm text-[var(--text-secondary)] flex h-full items-center justify-center">
          No markdown waterfall available.
        </div>
      </ChartCard>
    );
  }

  const Tip = ({ active, payload }: TipProps) => {
    if (!active || !payload?.length) return null;
    const r = payload[0].payload;
    return (
      <div className="bg-white border border-[var(--border-default)] rounded-lg p-2.5 shadow-sm text-xs">
        <p className="font-medium text-sm mb-0.5">{r.stage}</p>
        <p className="text-[var(--text-secondary)]">
          {r.signed >= 0 ? '+' : ''}
          ${Math.abs(r.signed).toLocaleString('en-US')}K
        </p>
        <p className="text-[var(--text-tertiary)]">{r.pct_of_skus.toFixed(0)}% of SKUs at this stage</p>
      </div>
    );
  };

  return (
    <ChartCard
      id="markdown-lifecycle-waterfall"
      title="Markdown Lifecycle Waterfall"
      subtitle="Full Price → 25% → 40% → 60% → Clearance — $K and % SKUs at each step"
      height={420}
      data={rows as unknown as Record<string, unknown>[]}
      exportFilename="markdown-lifecycle-waterfall"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 24, right: 8, left: 8, bottom: 28 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="shortStage"
            tick={{ fontSize: 10 }}
            stroke="#9CA3AF"
            interval={0}
            angle={-18}
            textAnchor="end"
            height={50}
          />
          <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" tickFormatter={(v: number) => `$${v}K`} />
          <Tooltip content={<Tip />} />
          <Bar dataKey="base" stackId="wf" fill="transparent" />
          <Bar dataKey="delta" stackId="wf">
            {rows.map((r, i) => (
              <Cell key={i} fill={TYPE_COLORS[r.type]} />
            ))}
            <LabelList
              dataKey="pct_of_skus"
              position="top"
              formatter={(v) => {
                const n = typeof v === 'number' ? v : Number(v);
                return Number.isFinite(n) && n ? `${n.toFixed(0)}%` : '';
              }}
              style={{ fontSize: 10, fill: '#6B7280' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
