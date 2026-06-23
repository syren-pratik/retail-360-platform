'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import type { MerchDemandFullPayload } from '@/app/lib/merch-demand-types';
import { formatLakhsCrores } from '@/app/lib/merch-format';
import DeepDiveInsights from '../../shared/DeepDiveInsights';
import { AIInsightButton } from '@/app/components/charts/ChartCard';

// ANCHOR = '2026-05-17'

type PlanRow = {
  department: string;
  plan_revenue_inr: number;
  forecast_to_end_inr: number;
  variance_pct: number;
};

const DEPT_CONTRIBUTIONS: { dept: string; contribution: number }[] = [
  { dept: 'Grocery & Staples', contribution: -21_000_000 },
  { dept: 'Beverages', contribution: +8_000_000 },
  { dept: 'Dairy & Frozen', contribution: -14_000_000 },
  { dept: 'Snacks & Biscuits', contribution: +5_000_000 },
  { dept: 'Personal Care', contribution: -6_000_000 },
];

const DRIVERS: Record<string, string> = {
  'Grocery & Staples': 'Edible Oil (-₹0.8Cr), Atta & Flours (-₹0.6Cr)',
  Beverages: 'Summer demand surge, Eid pre-purchase effect',
  'Dairy & Frozen': 'Ice Cream shortfall, supply disruption in W5-W6',
  'Snacks & Biscuits': 'Festival snacking surge, new product launches',
  'Personal Care': 'Premium segment slowdown, price sensitivity',
};

const INSIGHTS = [
  {
    headline: 'Grocery & Staples is the biggest gap driver at -₹2.1Cr',
    detail:
      'Edible Oil pricing pressure and Atta supply issues are the root causes. Procurement action needed.',
    severity: 'negative' as const,
  },
  {
    headline: 'Beverages and Snacks are offsetting some of the gap',
    detail:
      'Without Beverages (+₹0.8Cr) and Snacks (+₹0.5Cr) beats, the overall gap would be -₹4.8Cr.',
    severity: 'positive' as const,
  },
  {
    headline: 'Dairy shortfall is structural — not seasonal',
    detail:
      'Ice Cream supply chain disruption in W5-W6 caused most of the Dairy gap. One-time event.',
    severity: 'warning' as const,
  },
  {
    headline: 'Total gap: -₹3.3Cr vs Q2 Plan',
    detail:
      'Net gap after department contributions. Achievable to recover if Grocery & Staples trend improves.',
    severity: 'negative' as const,
  },
];

interface Props {
  core: MerchDemandFullPayload;
}

export default function WaterfallTab({ core }: Props) {
  const rows = (core.plan_vs_actual ?? []) as PlanRow[];

  const waterfallData = useMemo(() => {
    const totalPlan = rows.reduce((s, r) => s + r.plan_revenue_inr, 0) || 350_000_000;
    const result: {
      name: string;
      base: number;
      value: number;
      positive: boolean;
      isTotal?: boolean;
    }[] = [];

    // Start bar: Q2 Plan
    result.push({ name: 'Q2 Plan', base: 0, value: totalPlan, positive: true, isTotal: true });

    // Running total
    let running = totalPlan;
    for (const dc of DEPT_CONTRIBUTIONS) {
      const isPositive = dc.contribution >= 0;
      const base = isPositive ? running : running + dc.contribution;
      result.push({
        name: dc.dept.split(' ')[0],
        base,
        value: Math.abs(dc.contribution),
        positive: isPositive,
        isTotal: false,
      });
      running += dc.contribution;
    }

    // End bar: Q2 Forecast
    result.push({
      name: 'Forecast',
      base: 0,
      value: running,
      positive: running >= totalPlan,
      isTotal: true,
    });

    return result;
  }, [rows]);

  return (
    <div className="space-y-6">
      {/* Waterfall chart */}
      <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Revenue Gap Waterfall — Q2 FY2026
            </h3>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              How each department contributes to (or offsets) the overall plan gap
            </p>
          </div>
          <AIInsightButton id="merch-dd-revenue-gap-waterfall" title="Revenue Gap Waterfall — Q2 FY2026" data={waterfallData as unknown as Record<string, unknown>[]} />
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={waterfallData}
            margin={{ top: 20, right: 24, left: 0, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: '#64748B' }}
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#94A3B8' }}
              tickFormatter={(v: unknown) => formatLakhsCrores(Number(v))}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip
              formatter={(v: unknown, name: unknown) => [
                formatLakhsCrores(Number(v)),
                String(name),
              ]}
              contentStyle={{ fontSize: 11 }}
              cursor={{ fill: '#F1F5F9' }}
            />
            {/* Invisible spacer bar */}
            <Bar
              dataKey="base"
              stackId="wf"
              fill="transparent"
              isAnimationActive={false}
            />
            {/* Visible value bar */}
            <Bar
              dataKey="value"
              stackId="wf"
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            >
              {waterfallData.map((d, i) => (
                <Cell
                  key={i}
                  fill={
                    d.isTotal
                      ? 'var(--chart-blue)'
                      : d.positive
                      ? 'var(--chart-emerald)'
                      : 'var(--chart-rose)'
                  }
                />
              ))}
              <LabelList
                dataKey="value"
                position="top"
                formatter={(v: unknown) => formatLakhsCrores(Number(v))}
                style={{ fontSize: 9, fill: '#64748B' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-2 justify-center">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--chart-blue)' }} />
            <span className="text-xs text-[var(--text-tertiary)]">Total</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--chart-emerald)' }} />
            <span className="text-xs text-[var(--text-tertiary)]">Above Plan</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--chart-rose)' }} />
            <span className="text-xs text-[var(--text-tertiary)]">Below Plan</span>
          </div>
        </div>
      </div>

      {/* Department contribution summary */}
      <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Department Contribution Detail
          </h3>
          <AIInsightButton id="merch-dd-department-contribution-detail" title="Department Contribution Detail" data={DEPT_CONTRIBUTIONS as unknown as Record<string, unknown>[]} />
        </div>
        <div className="px-4 py-2">
          {DEPT_CONTRIBUTIONS.map((dc) => (
            <div
              key={dc.dept}
              className="flex justify-between items-start py-2 border-b border-[var(--border-subtle)]"
            >
              <div>
                <p className="text-xs font-medium text-[var(--text-primary)]">{dc.dept}</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">{DRIVERS[dc.dept]}</p>
              </div>
              <span
                className={`text-sm font-semibold tabular-nums ${
                  dc.contribution >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {dc.contribution >= 0 ? '+' : ''}
                {formatLakhsCrores(dc.contribution)}
              </span>
            </div>
          ))}

          {/* Net total */}
          <div className="flex justify-between items-center py-3 mt-1">
            <p className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide">
              Net Gap
            </p>
            <span
              className={`text-sm font-bold tabular-nums ${
                DEPT_CONTRIBUTIONS.reduce((s, d) => s + d.contribution, 0) >= 0
                  ? 'text-emerald-600'
                  : 'text-rose-600'
              }`}
            >
              {DEPT_CONTRIBUTIONS.reduce((s, d) => s + d.contribution, 0) >= 0 ? '+' : ''}
              {formatLakhsCrores(
                DEPT_CONTRIBUTIONS.reduce((s, d) => s + d.contribution, 0),
              )}
            </span>
          </div>
        </div>
      </div>

      <DeepDiveInsights insights={INSIGHTS} />
    </div>
  );
}
