'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import PriceIntelChartCard from './PriceIntelChartCard';
import type { PriceIntelMarkdownCadenceStep } from '@/app/lib/price-intel-types';
import { APPAREL_MARKDOWN_STEP_COLORS } from '@/app/lib/palette-apparel';
import { formatMoneyAuto } from '@/app/lib/format-money';

interface Props {
  steps: PriceIntelMarkdownCadenceStep[];
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: PriceIntelMarkdownCadenceStep }>;
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-lg text-xs space-y-1">
      <p className="font-medium text-[var(--text-primary)]">{d.label}</p>
      <p className="text-[var(--text-secondary)]">Units remaining: {d.units_remaining.toLocaleString()}</p>
      <p className="text-[var(--text-secondary)]">Sold in step: {d.units_sold_in_step.toLocaleString()}</p>
      <p className="text-[var(--text-secondary)]">Margin: {d.margin_pct}%</p>
      <p className="text-[var(--text-secondary)]">
        Days: {d.actual_days_in_step}/{d.target_days_in_step === 9999 ? '∞' : d.target_days_in_step}
      </p>
      <p className="text-[var(--text-secondary)]">Revenue: {formatMoneyAuto(d.revenue_usd)}</p>
      {d.is_stuck && <p className="text-rose-600 font-medium">Stuck — exceeds target</p>}
    </div>
  );
};

export default function PriceIntelMarkdownCadenceLadder({ steps }: Props) {
  const stuckCount = steps.filter((s) => s.is_stuck).length;
  return (
    <PriceIntelChartCard
      id="markdown_cadence_ladder"
      title="Markdown Cadence Ladder"
      subtitle="Full Price → Clearance · 6 steps"
      data={steps as unknown as Record<string, unknown>[]}
    >
      {stuckCount > 0 && (
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] text-rose-700">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          {stuckCount} step{stuckCount > 1 ? 's' : ''} stuck
        </div>
      )}
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={steps} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
            axisLine={{ stroke: 'var(--border-default)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
            axisLine={{ stroke: 'var(--border-default)' }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-secondary)' }} />
          <Bar dataKey="units_remaining" radius={[4, 4, 0, 0]}>
            {steps.map((s, i) => (
              <Cell
                key={i}
                fill={APPAREL_MARKDOWN_STEP_COLORS[s.step] || '#94A3B8'}
                stroke={s.is_stuck ? '#E11D48' : undefined}
                strokeWidth={s.is_stuck ? 2 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </PriceIntelChartCard>
  );
}
