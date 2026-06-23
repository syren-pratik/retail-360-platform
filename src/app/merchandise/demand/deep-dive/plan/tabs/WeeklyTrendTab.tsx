'use client';

import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { MerchDemandFullPayload } from '@/app/lib/merch-demand-types';
import { formatLakhsCrores } from '@/app/lib/merch-format';
import DeepDiveInsights from '../../shared/DeepDiveInsights';
import { AIInsightButton } from '@/app/components/charts/ChartCard';

// ANCHOR = '2026-05-17'

function seededNoise(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const DEPT_COLORS: Record<string, string> = {
  'Grocery & Staples': 'var(--chart-rose)',
  Beverages: 'var(--chart-blue)',
  'Dairy & Frozen': 'var(--chart-amber)',
  'Snacks & Biscuits': 'var(--chart-emerald)',
  'Personal Care': 'var(--chart-indigo)',
};

const WEEK_LABELS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];

const INSIGHTS = [
  {
    headline: 'Plan gap widening over 8 weeks',
    detail:
      'The aggregate variance has grown from -1.8% in W1 to -4.2% now. Trend is worsening.',
    severity: 'negative' as const,
  },
  {
    headline: 'Beverages improving week-over-week',
    detail:
      'Beverages went from -2.1% to +3.8%. Summer demand and Eid preparations driving recovery.',
    severity: 'positive' as const,
  },
  {
    headline: 'Grocery & Staples: consistently missing plan',
    detail:
      'Has been below plan in all 8 weeks. Root cause analysis needed — likely pricing pressure.',
    severity: 'negative' as const,
  },
  {
    headline: 'Snacks & Biscuits: strong late acceleration',
    detail:
      'Snacks moved from -1.2% to +2.4% in last 3 weeks. Eid snack demand surging.',
    severity: 'positive' as const,
  },
];

type PlanRow = {
  department: string;
  variance_pct: number;
  plan_revenue_inr: number;
  forecast_to_end_inr: number;
};

interface Props {
  core: MerchDemandFullPayload;
}

export default function WeeklyTrendTab({ core }: Props) {
  const [showAbsolute, setShowAbsolute] = useState(false);

  const rows = (core.plan_vs_actual ?? []) as PlanRow[];
  const departments = Array.from(new Set(rows.map((r) => r.department))).sort();

  const weeklyData = useMemo(() => {
    return WEEK_LABELS.map((week, wi) => {
      const point: Record<string, unknown> = { week };
      departments.forEach((dept, di) => {
        const deptRows = rows.filter((r) => r.department === dept);
        const currentVar =
          deptRows.reduce((s, r) => s + r.variance_pct, 0) /
          Math.max(deptRows.length, 1);
        // trend toward current variance over 8 weeks
        const weekVar =
          currentVar * (0.4 + (wi / 7) * 0.6) + seededNoise(wi * 13 + di) * 3 - 1.5;
        point[dept] = Number(weekVar.toFixed(2));
        if (showAbsolute) {
          const deptPlan =
            deptRows.reduce((s, r) => s + r.plan_revenue_inr, 0) / 8;
          point[dept + '_abs'] = (weekVar / 100) * deptPlan;
        }
      });
      return point;
    });
  }, [rows, departments, showAbsolute]);

  return (
    <div className="space-y-6">
      {/* Toggle + Line chart */}
      <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              8-Week Variance Trend by Department
            </h3>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              Tracking plan variance week-over-week through the quarter
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAbsolute((v) => !v)}
            className="px-3 py-1.5 text-xs border border-[var(--border-default)] rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            {showAbsolute ? 'Show as %' : 'Show as ₹ gap'}
          </button>
          <AIInsightButton id="merch-dd-8-week-variance-trend" title="8-Week Variance Trend by Department" data={weeklyData as unknown as Record<string, unknown>[]} />
        </div>

        <ResponsiveContainer width="100%" height={380}>
          <LineChart
            data={weeklyData}
            margin={{ top: 10, right: 24, left: 0, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: '#64748B' }}
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#94A3B8' }}
              tickFormatter={(v: unknown) =>
                showAbsolute
                  ? formatLakhsCrores(Number(v))
                  : `${Number(v).toFixed(1)}%`
              }
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip
              formatter={(v: unknown, name: unknown) => [
                showAbsolute
                  ? formatLakhsCrores(Number(v))
                  : `${Number(v).toFixed(1)}%`,
                String(name),
              ]}
              contentStyle={{ fontSize: 11 }}
            />
            <ReferenceLine y={0} stroke="#CBD5E1" strokeDasharray="4 2" />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
              iconType="circle"
              iconSize={8}
            />
            {departments.map((dept) => (
              <Line
                key={dept}
                type="monotone"
                dataKey={dept}
                stroke={DEPT_COLORS[dept] ?? '#94A3B8'}
                strokeWidth={2}
                dot={{ r: 3, fill: DEPT_COLORS[dept] ?? '#94A3B8' }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly table */}
      <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Weekly Variance Detail
          </h3>
          <AIInsightButton id="merch-dd-weekly-variance-detail" title="Weekly Variance Detail" data={weeklyData as unknown as Record<string, unknown>[]} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-default)]">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
                  Department
                </th>
                {WEEK_LABELS.map((w) => (
                  <th
                    key={w}
                    className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide"
                  >
                    {w}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
                  Current
                </th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => {
                const color = DEPT_COLORS[dept] ?? '#94A3B8';
                const deptRows = rows.filter((r) => r.department === dept);
                const currentVar =
                  deptRows.reduce((s, r) => s + r.variance_pct, 0) /
                  Math.max(deptRows.length, 1);

                return (
                  <tr
                    key={dept}
                    className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <td className="px-4 py-2.5 text-xs text-[var(--text-primary)] font-medium">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        {dept}
                      </div>
                    </td>
                    {weeklyData.map((point, wi) => {
                      const val = Number(point[dept] ?? 0);
                      return (
                        <td
                          key={wi}
                          className={`px-3 py-2.5 text-xs text-right tabular-nums font-medium ${
                            val >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {val >= 0 ? '+' : ''}
                          {val.toFixed(1)}%
                        </td>
                      );
                    })}
                    <td
                      className={`px-3 py-2.5 text-xs text-right tabular-nums font-bold ${
                        currentVar >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {currentVar >= 0 ? '+' : ''}
                      {currentVar.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <DeepDiveInsights insights={INSIGHTS} />
    </div>
  );
}
