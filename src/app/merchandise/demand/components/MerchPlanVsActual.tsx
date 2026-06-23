'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { MerchDemandFullPayload } from '@/app/lib/merch-demand-types';
import { formatLakhsCrores } from '@/app/lib/merch-format';
import { AIInsightButton } from '@/app/components/charts/ChartCard';

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

const STATUS_BADGE: Record<PlanRow['status'], string> = {
  on_track:  'badge-positive',
  at_risk:   'badge-warning',
  will_miss: 'badge-negative',
  will_beat: 'badge-positive',
};

const STATUS_LABEL: Record<PlanRow['status'], string> = {
  on_track:  'On Track',
  at_risk:   'At Risk',
  will_miss: 'Will Miss',
  will_beat: 'Will Beat',
};

type SortKey = 'variance_pct' | 'plan_revenue_inr' | 'actual_revenue_inr' | 'forecast_to_end_inr';

interface TableProps {
  rows: PlanRow[];
}

function PlanTable({ rows }: TableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('variance_pct');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return sortDir === 'asc' ? diff : -diff;
    });
  }, [rows, sortKey, sortDir]);

  const totals = useMemo(() => ({
    plan: rows.reduce((s, r) => s + r.plan_revenue_inr, 0),
    actual: rows.reduce((s, r) => s + r.actual_revenue_inr, 0),
    forecast: rows.reduce((s, r) => s + r.forecast_to_end_inr, 0),
  }), [rows]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
    ) : null;

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      type="button"
      onClick={() => handleSort(k)}
      className="flex items-center gap-0.5 hover:text-[var(--text-primary)] transition-colors"
    >
      {label}
      <SortIcon k={k} />
    </button>
  );

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-[var(--text-tertiary)]">
        No plan vs actual data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[var(--border-default)] text-[var(--text-tertiary)]">
            <th className="text-left px-4 py-3 font-medium">Department / Category</th>
            <th className="text-left px-4 py-3 font-medium">Quarter</th>
            <th className="text-right px-4 py-3 font-medium cursor-pointer">
              <SortBtn k="plan_revenue_inr" label="Plan" />
            </th>
            <th className="text-right px-4 py-3 font-medium cursor-pointer">
              <SortBtn k="actual_revenue_inr" label="Actual to Date" />
            </th>
            <th className="text-right px-4 py-3 font-medium cursor-pointer">
              <SortBtn k="forecast_to_end_inr" label="Forecast to End" />
            </th>
            <th className="text-right px-4 py-3 font-medium cursor-pointer">
              <SortBtn k="variance_pct" label="Variance %" />
            </th>
            <th className="text-center px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {sorted.map((row, idx) => {
            const varColor = row.variance_pct >= 0 ? 'text-emerald-600' : 'text-rose-600';
            return (
              <tr key={idx} className="hover:bg-[var(--bg-secondary)] transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-[var(--text-primary)] truncate max-w-[200px]">
                    {row.subcategory}
                  </div>
                  <div className="text-[10px] text-[var(--text-tertiary)] truncate max-w-[200px]">
                    {row.department} · {row.category}
                  </div>
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{row.quarter}</td>
                <td className="px-4 py-3 text-right tabular-nums text-[var(--text-secondary)]">
                  {formatLakhsCrores(row.plan_revenue_inr)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-[var(--text-primary)] font-medium">
                  {formatLakhsCrores(row.actual_revenue_inr)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-[var(--text-secondary)]">
                  {formatLakhsCrores(row.forecast_to_end_inr)}
                </td>
                <td className={`px-4 py-3 text-right tabular-nums font-semibold ${varColor}`}>
                  {row.variance_pct >= 0 ? '+' : ''}{row.variance_pct.toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`badge ${STATUS_BADGE[row.status]} text-[10px]`}>
                    {STATUS_LABEL[row.status]}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-[var(--border-default)] bg-[var(--bg-secondary)] font-semibold text-[var(--text-primary)]">
            <td className="px-4 py-3" colSpan={2}>Total</td>
            <td className="px-4 py-3 text-right tabular-nums">{formatLakhsCrores(totals.plan)}</td>
            <td className="px-4 py-3 text-right tabular-nums">{formatLakhsCrores(totals.actual)}</td>
            <td className="px-4 py-3 text-right tabular-nums">{formatLakhsCrores(totals.forecast)}</td>
            <td className="px-4 py-3 text-right tabular-nums text-[var(--text-secondary)]">—</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

interface Props {
  core: MerchDemandFullPayload;
}

export default function MerchPlanVsActual({ core }: Props) {
  const router = useRouter();

  const rows = (core.plan_vs_actual ?? []) as PlanRow[];

  const statusCounts = useMemo(() => {
    const counts = { on_track: 0, at_risk: 0, will_miss: 0, will_beat: 0 };
    for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;
    return counts;
  }, [rows]);

  return (
    <section className="card p-0 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Plan vs Actual</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {rows.length} subcategories ·{' '}
            <span className="text-emerald-600">{statusCounts.on_track} on track</span> ·{' '}
            <span className="text-amber-600">{statusCounts.at_risk} at risk</span> ·{' '}
            <span className="text-rose-600">{statusCounts.will_miss} will miss</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
        <AIInsightButton id="merch-plan-vs-actual" title="Plan vs Actual" data={rows as unknown as Record<string, unknown>[]} />
        <button
          onClick={() => router.push('/merchandise/demand/deep-dive/plan')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] border border-[var(--border-default)] rounded-md hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 6V2h4M10 6v4H6M7.5 2H10v2.5M4.5 10H2V7.5" />
          </svg>
          Deep Dive
        </button>
        </div>
      </div>

      <PlanTable rows={rows.slice(0, 10)} />

      {rows.length > 10 && (
        <div className="p-4 text-center border-t border-[var(--border-subtle)]">
          <button
            onClick={() => router.push('/merchandise/demand/deep-dive/plan')}
            className="text-sm text-[var(--accent-primary)] hover:underline"
          >
            View all {rows.length} subcategories
          </button>
        </div>
      )}
    </section>
  );
}
