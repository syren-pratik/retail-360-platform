'use client';

import { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { MerchDemandFullPayload } from '@/app/lib/merch-demand-types';
import { formatLakhsCrores } from '@/app/lib/merch-format';
import DeepDiveInsights from '../../shared/DeepDiveInsights';
import { AIInsightButton } from '@/app/components/charts/ChartCard';

// ANCHOR = '2026-05-17'

type PlanRow = {
  department: string;
  category: string;
  subcategory: string;
  quarter: string;
  plan_revenue_inr: number;
  actual_revenue_inr: number;
  forecast_to_end_inr: number;
  variance_pct: number;
  status: 'on_track' | 'at_risk' | 'will_miss' | 'will_beat';
};

const STATUS_BADGE: Record<string, string> = {
  on_track: 'badge-positive',
  at_risk: 'badge-warning',
  will_miss: 'badge-negative',
  will_beat: 'badge-positive',
};

const STATUS_LABEL: Record<string, string> = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  will_miss: 'Will Miss',
  will_beat: 'Will Beat',
};

const INSIGHTS = [
  {
    headline: 'Grocery & Staples is the largest gap driver',
    detail:
      'Represents 60% of total plan gap. Edible Oil and Atta are the primary sub-categories at risk.',
    severity: 'negative' as const,
  },
  {
    headline: 'Beverages and Snacks beating plan',
    detail:
      'Both departments tracking ahead of plan — driven by Eid pre-purchase and summer demand.',
    severity: 'positive' as const,
  },
  {
    headline: 'Dairy & Frozen: structural miss',
    detail:
      'Underperforming for 4 consecutive weeks. May need plan revision for Q3.',
    severity: 'negative' as const,
  },
  {
    headline: 'Personal Care: at-risk but recoverable',
    detail:
      'Festival period should drive Personal Care recovery in the remaining 6 weeks of the quarter.',
    severity: 'warning' as const,
  },
];

interface Props {
  core: MerchDemandFullPayload;
}

export default function PlanOverviewTab({ core }: Props) {
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const rows = (core.plan_vs_actual ?? []) as PlanRow[];

  const departments = useMemo(
    () => Array.from(new Set(rows.map((r) => r.department))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    let r = rows;
    if (deptFilter !== 'all') r = r.filter((row) => row.department === deptFilter);
    if (statusFilter !== 'all') r = r.filter((row) => row.status === statusFilter);
    return [...r].sort((a, b) =>
      sortDir === 'asc'
        ? a.variance_pct - b.variance_pct
        : b.variance_pct - a.variance_pct,
    );
  }, [rows, deptFilter, statusFilter, sortDir]);

  const grouped = useMemo(() => {
    const map = new Map<string, PlanRow[]>();
    filtered.forEach((r) => {
      if (!map.has(r.department)) map.set(r.department, []);
      map.get(r.department)!.push(r);
    });
    return map;
  }, [filtered]);

  const grandTotalPlan = filtered.reduce((s, r) => s + r.plan_revenue_inr, 0);
  const grandTotalActual = filtered.reduce((s, r) => s + r.actual_revenue_inr, 0);
  const grandTotalForecast = filtered.reduce((s, r) => s + r.forecast_to_end_inr, 0);
  const grandVariance =
    grandTotalPlan > 0
      ? ((grandTotalForecast - grandTotalPlan) / grandTotalPlan) * 100
      : 0;

  const statusOptions = [
    { key: 'all', label: 'All' },
    { key: 'on_track', label: 'On Track' },
    { key: 'at_risk', label: 'At Risk' },
    { key: 'will_miss', label: 'Will Miss' },
    { key: 'will_beat', label: 'Will Beat' },
  ];

  return (
    <div className="space-y-6">
      {/* Filter controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Department select */}
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="text-xs border border-[var(--border-default)] rounded-md px-3 py-1.5 bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
        >
          <option value="all">All Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        {/* Status pills */}
        <div className="flex items-center gap-1.5">
          {statusOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setStatusFilter(opt.key)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                statusFilter === opt.key
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border-default)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Sort direction toggle */}
        <button
          type="button"
          onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
          className="flex items-center gap-1 px-3 py-1.5 text-xs border border-[var(--border-default)] rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
        >
          Variance
          {sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {/* Export CSV */}
        <button
          type="button"
          onClick={() => {}}
          className="px-3 py-1.5 text-xs border border-[var(--border-default)] rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
        >
          Export CSV
        </button>
        <AIInsightButton id="merch-dd-plan-overview" title="Plan Overview" data={filtered as unknown as Record<string, unknown>[]} />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--border-default)] overflow-hidden bg-[var(--bg-primary)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
                  Category
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
                  Q2 Plan
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
                  Actual to Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
                  Forecast to End
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
                  Variance %
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from(grouped.entries()).map(([dept, deptRows]) => {
                const deptPlan = deptRows.reduce((s, r) => s + r.plan_revenue_inr, 0);
                const deptActual = deptRows.reduce((s, r) => s + r.actual_revenue_inr, 0);
                const deptForecast = deptRows.reduce((s, r) => s + r.forecast_to_end_inr, 0);
                const deptVariance =
                  deptPlan > 0 ? ((deptForecast - deptPlan) / deptPlan) * 100 : 0;

                return (
                  <>
                    {/* Department header row */}
                    <tr key={`dept-header-${dept}`} className="bg-[var(--bg-secondary)]">
                      <td
                        colSpan={7}
                        className="px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"
                      >
                        {dept}
                      </td>
                    </tr>

                    {/* Category rows */}
                    {deptRows.map((row, i) => (
                      <tr
                        key={`${dept}-row-${i}`}
                        className="hover:bg-[var(--bg-secondary)] transition-colors border-b border-[var(--border-subtle)]"
                      >
                        <td className="px-4 py-2.5">
                          <p className="text-xs font-medium text-[var(--text-primary)]">
                            {row.subcategory}
                          </p>
                          <p className="text-[10px] text-[var(--text-tertiary)]">{row.category}</p>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-[var(--text-secondary)] text-right tabular-nums">
                          {formatLakhsCrores(row.plan_revenue_inr)}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-right tabular-nums font-medium">
                          {formatLakhsCrores(row.actual_revenue_inr)}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-right tabular-nums text-[var(--text-secondary)]">
                          {formatLakhsCrores(row.forecast_to_end_inr)}
                        </td>
                        <td
                          className={`px-4 py-2.5 text-xs text-right tabular-nums font-semibold ${
                            row.variance_pct >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {row.variance_pct >= 0 ? '+' : ''}
                          {row.variance_pct.toFixed(1)}%
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span
                            className={`badge ${STATUS_BADGE[row.status]} text-[10px]`}
                          >
                            {STATUS_LABEL[row.status]}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {/* Department subtotal */}
                    <tr
                      key={`dept-subtotal-${dept}`}
                      className="bg-[var(--bg-secondary)] font-semibold border-t border-[var(--border-default)]"
                    >
                      <td className="px-4 py-2 text-xs text-[var(--text-secondary)]">
                        {dept} Total
                      </td>
                      <td className="px-4 py-2 text-xs text-right tabular-nums">
                        {formatLakhsCrores(deptPlan)}
                      </td>
                      <td className="px-4 py-2 text-xs text-right tabular-nums">
                        {formatLakhsCrores(deptActual)}
                      </td>
                      <td className="px-4 py-2 text-xs text-right tabular-nums">
                        {formatLakhsCrores(deptForecast)}
                      </td>
                      <td
                        className={`px-4 py-2 text-xs text-right tabular-nums font-bold ${
                          deptVariance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {deptVariance >= 0 ? '+' : ''}
                        {deptVariance.toFixed(1)}%
                      </td>
                      <td />
                    </tr>
                  </>
                );
              })}

              {/* Grand total row */}
              <tr className="bg-[var(--bg-secondary)] border-t-2 border-[var(--border-default)] font-bold">
                <td className="px-4 py-3 text-xs text-[var(--text-primary)] font-bold uppercase tracking-wide">
                  Grand Total
                </td>
                <td className="px-4 py-3 text-xs text-right tabular-nums text-[var(--text-primary)]">
                  {formatLakhsCrores(grandTotalPlan)}
                </td>
                <td className="px-4 py-3 text-xs text-right tabular-nums text-[var(--text-primary)]">
                  {formatLakhsCrores(grandTotalActual)}
                </td>
                <td className="px-4 py-3 text-xs text-right tabular-nums text-[var(--text-primary)]">
                  {formatLakhsCrores(grandTotalForecast)}
                </td>
                <td
                  className={`px-4 py-3 text-xs text-right tabular-nums font-bold ${
                    grandVariance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {grandVariance >= 0 ? '+' : ''}
                  {grandVariance.toFixed(1)}%
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <DeepDiveInsights insights={INSIGHTS} />
    </div>
  );
}
