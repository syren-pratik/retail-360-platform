'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Legend,
} from 'recharts';
import type { MarkdownCadenceData } from '../markdown-types';

function formatInr(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1_00_000) return `₹${(abs / 1_00_000).toFixed(1)}L`;
  if (abs >= 1_000) return `₹${(abs / 1_000).toFixed(0)}K`;
  return `₹${abs}`;
}

interface Props {
  data: MarkdownCadenceData;
}

const PLAN_COLOR = '#6366F1';
const ACTUAL_COLORS: Record<string, string> = {
  '-15%': '#10B981', // on track / shallow
  '-25%': '#F59E0B', // moderate
  '-40%': '#F97316', // deep
  '-60%': '#EF4444', // critical
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: {
    tier: string;
    plan_sku_count: number;
    actual_sku_count: number;
    gap: number;
    gap_margin_impact_inr: number;
  }; name: string; value: number }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  const gap = d.gap;
  const isGapBad = gap < 0;

  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-[var(--border-default)] text-xs w-56">
      <div className="font-semibold text-[var(--text-primary)] mb-2">{d.tier} Markdown Tier</div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--text-tertiary)]">Plan (should be at this depth)</span>
          <span className="font-medium">{d.plan_sku_count} SKUs</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-tertiary)]">Actual (at this depth today)</span>
          <span className="font-medium">{d.actual_sku_count} SKUs</span>
        </div>
        <div className="pt-1 border-t border-[var(--border-subtle)]">
          <div className="flex justify-between">
            <span className={isGapBad ? 'text-red-600' : 'text-emerald-600'}>
              Gap ({isGapBad ? 'behind' : 'ahead'} plan)
            </span>
            <span className={`font-semibold ${isGapBad ? 'text-red-600' : 'text-emerald-600'}`}>
              {gap > 0 ? '+' : ''}{gap} SKUs
            </span>
          </div>
          {isGapBad && (
            <div className="flex justify-between mt-0.5">
              <span className="text-red-500">Margin risk of delay</span>
              <span className="text-red-600 font-semibold">{formatInr(d.gap_margin_impact_inr)}</span>
            </div>
          )}
        </div>
        {isGapBad && (
          <div className="mt-1.5 p-1.5 bg-amber-50 rounded text-amber-700">
            Behind plan = inventory stuck at slow velocity. Each week delayed increases write-off risk.
          </div>
        )}
      </div>
    </div>
  );
}

export default function MarkdownCadenceChart({ data }: Props) {
  const chartData = data.tiers.map((t) => ({
    ...t,
    color: ACTUAL_COLORS[t.tier] ?? '#94A3B8',
  }));

  const totalGapImpact = data.tiers.reduce((sum, t) => sum + Math.abs(t.gap_margin_impact_inr), 0);

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Markdown Cadence: Plan vs Actual
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            SKUs at each markdown depth tier — where markdowns should be vs where they are
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-sm font-semibold text-red-600">{formatInr(totalGapImpact)}</div>
          <div className="text-[10px] text-[var(--text-tertiary)]">total margin at risk from cadence gap</div>
        </div>
      </div>

      {/* Plan explainer */}
      <div className="mb-3 p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-700">
        <strong>How plan is set:</strong> At season start, category managers define a markdown escalation calendar —
        how many SKUs should reach each depth tier by each week. Modeled from prior 3-season clearance patterns.
        Week 8 plan = 145 SKUs at −15%, 98 at −25%, 54 at −40%, 22 at −60%.
      </div>

      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
            barCategoryGap="25%"
            barGap={4}
          >
            <XAxis
              dataKey="tier"
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              label={{ value: 'SKUs', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'var(--text-tertiary)' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="square"
              iconSize={8}
              wrapperStyle={{ fontSize: '11px', color: 'var(--text-secondary)' }}
            />
            <ReferenceLine y={0} stroke="var(--border-default)" />

            {/* Plan bars — indigo */}
            <Bar dataKey="plan_sku_count" name="Plan" fill={PLAN_COLOR} radius={[3, 3, 0, 0]} opacity={0.3} />

            {/* Actual bars — colored by tier severity */}
            <Bar dataKey="actual_sku_count" name="Actual" radius={[3, 3, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gap impact row */}
      <div className="mt-2 grid grid-cols-4 gap-2">
        {data.tiers.map((t) => (
          <div
            key={t.tier}
            className={`text-center p-2 rounded ${t.gap < 0 ? 'bg-red-50' : 'bg-emerald-50'}`}
          >
            <div className={`text-xs font-semibold ${t.gap < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
              {t.gap > 0 ? '+' : ''}{t.gap} SKUs
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)]">{t.tier} gap</div>
            {t.gap < 0 && (
              <div className="text-[10px] text-red-500 font-medium">{formatInr(t.gap_margin_impact_inr)} risk</div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-2 text-[10px] text-[var(--text-tertiary)]">
        Databricks: markdown_approvals.approved_depth_tier × markdown_plan_targets.plan_depth_week_target
      </div>
    </div>
  );
}
