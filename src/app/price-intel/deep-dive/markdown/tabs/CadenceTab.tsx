'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import { formatLakhsCrores } from '@/app/lib/merch-format';

interface Props { core: PriceIntelCore }

// Cadence data: plan vs actual by depth tier, 8 weeks
const CADENCE_DATA = [
  { week: 'W1', plan_10: 420000, actual_10: 380000, plan_20: 280000, actual_20: 310000, plan_30: 180000, actual_30: 140000 },
  { week: 'W2', plan_10: 450000, actual_10: 410000, plan_20: 310000, actual_20: 290000, plan_30: 200000, actual_30: 180000 },
  { week: 'W3', plan_10: 480000, actual_10: 460000, plan_20: 340000, actual_20: 360000, plan_30: 220000, actual_30: 210000 },
  { week: 'W4', plan_10: 510000, actual_10: 520000, plan_20: 380000, actual_20: 350000, plan_30: 250000, actual_30: 280000 },
  { week: 'W5', plan_10: 540000, actual_10: 560000, plan_20: 420000, actual_20: 440000, plan_30: 290000, actual_30: 310000 },
  { week: 'W6', plan_10: 580000, actual_10: 590000, plan_20: 460000, actual_20: 470000, plan_30: 330000, actual_30: 350000 },
  { week: 'W7', plan_10: 620000, actual_10: 600000, plan_20: 500000, actual_20: 510000, plan_30: 380000, actual_30: 360000 },
  { week: 'W8', plan_10: 650000, actual_10: 640000, plan_20: 540000, actual_20: 550000, plan_30: 420000, actual_30: 430000 },
];

const WEEK_TABLE = CADENCE_DATA.map((w) => ({
  week: w.week,
  planned_total: w.plan_10 + w.plan_20 + w.plan_30,
  actual_total: w.actual_10 + w.actual_20 + w.actual_30,
  plan_10: w.plan_10,
  actual_10: w.actual_10,
  plan_20: w.plan_20,
  actual_20: w.actual_20,
  plan_30: w.plan_30,
  actual_30: w.actual_30,
  variance: (w.actual_10 + w.actual_20 + w.actual_30) - (w.plan_10 + w.plan_20 + w.plan_30),
}));

export default function CadenceTab({}: Props) {
  return (
    <div className="px-8 py-6">
      <div className="card p-6 mb-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Markdown Cadence — Plan vs Actual by Depth Tier</h3>
        <p className="text-xs text-[var(--text-secondary)] mb-4">8-week cadence · Spend grouped by markdown depth (10% / 20% / 30%+)</p>
        <div style={{ height: 560 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={CADENCE_DATA} margin={{ top: 16, right: 24, bottom: 8, left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#111827' }} stroke="#D1D5DB" />
              <YAxis tickFormatter={(v: number) => formatLakhsCrores(v)} tick={{ fontSize: 11, fill: '#111827' }} stroke="#D1D5DB" />
              <Tooltip
                contentStyle={{ fontSize: 12, background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}
                formatter={(v: unknown, name: unknown): [string, string] => [formatLakhsCrores(v as number), String(name)]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="plan_10" name="Plan 10%" fill="#C7D2FE" stackId="plan" />
              <Bar dataKey="plan_20" name="Plan 20%" fill="#A5B4FC" stackId="plan" />
              <Bar dataKey="plan_30" name="Plan 30%+" fill="#818CF8" stackId="plan" radius={[3, 3, 0, 0]} />
              <Bar dataKey="actual_10" name="Actual 10%" fill="#86EFAC" stackId="actual" />
              <Bar dataKey="actual_20" name="Actual 20%" fill="#4ADE80" stackId="actual" />
              <Bar dataKey="actual_30" name="Actual 30%+" fill="#22C55E" stackId="actual" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Week-by-week table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-default)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Weekly Cadence Table</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
                {['Week', 'Plan Total', 'Actual Total', 'Variance', 'Plan 10%', 'Actual 10%', 'Plan 20%', 'Actual 20%', 'Plan 30%+', 'Actual 30%+'].map((h) => (
                  <th key={h} className="text-right first:text-left px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WEEK_TABLE.map((row) => (
                <tr key={row.week} className="border-b border-[var(--border-default)] last:border-0 hover:bg-[var(--bg-secondary)]">
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{row.week}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{formatLakhsCrores(row.planned_total)}</td>
                  <td className="px-4 py-3 text-right font-medium text-[var(--text-primary)]">{formatLakhsCrores(row.actual_total)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${row.variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {row.variance >= 0 ? '+' : ''}{formatLakhsCrores(row.variance)}
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{formatLakhsCrores(row.plan_10)}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-primary)]">{formatLakhsCrores(row.actual_10)}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{formatLakhsCrores(row.plan_20)}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-primary)]">{formatLakhsCrores(row.actual_20)}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{formatLakhsCrores(row.plan_30)}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-primary)]">{formatLakhsCrores(row.actual_30)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
