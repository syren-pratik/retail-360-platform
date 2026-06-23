'use client';

import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { CategoryHealthData, CategoryHealthItem } from './InventoryDashboardContent';
import { AIInsightButton } from '@/app/components/charts/ChartCard';

interface Props {
  data: CategoryHealthData | null;
}

const STATUS_COLORS: Record<string, string> = {
  critical: '#EF4444',
  at_risk: '#F59E0B',
  healthy: '#10B981',
  overstock: '#6366F1',
};

const STATUS_BG: Record<string, string> = {
  critical: 'bg-red-50 text-red-700 border-red-200',
  at_risk: 'bg-amber-50 text-amber-700 border-amber-200',
  healthy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  overstock: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${STATUS_BG[status] ?? 'bg-gray-50 text-gray-700 border-gray-200'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

export default function CategoryHealthGrid({ data }: Props) {
  const [view, setView] = useState<'grid' | 'chart'>('grid');

  const summary = data?.summary;
  const categories = data?.categories ?? [];

  const chartData = useMemo(() =>
    categories.map(c => ({
      name: c.name.length > 14 ? c.name.slice(0, 13) + '…' : c.name,
      fullName: c.name,
      rev_at_risk: c.rev_at_risk_cr,
      osa: c.osa_pct,
      status: c.status,
    })),
    [categories]
  );

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Category Health</h3>
          {summary && (
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              <span className="text-red-600 font-medium">{summary.critical} critical</span>
              {' · '}
              <span className="text-amber-600 font-medium">{summary.at_risk} at risk</span>
              {' · '}
              ₹{summary.total_rev_at_risk_cr.toFixed(1)}Cr revenue at risk
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <AIInsightButton id="inventory-category-health" title="Category Health" data={categories as unknown as Record<string, unknown>[]} />
          {(['grid', 'chart'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                view === v
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              {v === 'grid' ? 'Grid' : 'Chart'}
            </button>
          ))}
        </div>
      </div>

      {view === 'grid' ? (
        <div className="space-y-1.5 overflow-y-auto max-h-72">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_80px_56px_56px_64px] gap-2 px-2 py-1">
            <span className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide">Category</span>
            <span className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide text-right">Rev@Risk</span>
            <span className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide text-right">OSA%</span>
            <span className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide text-right">DOS</span>
            <span className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide text-center">Status</span>
          </div>
          {categories.map((cat: CategoryHealthItem) => (
            <div
              key={cat.name}
              className="grid grid-cols-[1fr_80px_56px_56px_64px] gap-2 items-center px-2 py-1.5 rounded hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <span className="text-xs font-medium text-[var(--text-primary)] truncate">{cat.name}</span>
              <span className="text-xs text-right font-medium text-[var(--text-primary)]">
                ₹{cat.rev_at_risk_cr.toFixed(1)}Cr
              </span>
              <span className={`text-xs text-right font-medium ${cat.osa_pct >= 95 ? 'text-emerald-600' : cat.osa_pct >= 88 ? 'text-amber-600' : 'text-red-600'}`}>
                {cat.osa_pct.toFixed(1)}%
              </span>
              <span className={`text-xs text-right font-medium ${cat.avg_dos < 14 ? 'text-red-600' : cat.avg_dos > 28 ? 'text-amber-600' : 'text-[var(--text-primary)]'}`}>
                {cat.avg_dos.toFixed(0)}d
              </span>
              <div className="flex justify-center">
                <StatusBadge status={cat.status} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 4 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `₹${v}Cr`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any) => [`₹${Number(v).toFixed(2)}Cr`, 'Rev at Risk']}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                labelFormatter={(_: any, payload: readonly any[]) =>
                  payload?.[0]?.payload?.fullName ?? ''
                }
              />
              <Bar dataKey="rev_at_risk" radius={[0, 3, 3, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={STATUS_COLORS[d.status] ?? '#6B7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Health trend mini bar */}
      {summary && (
        <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide">Health Distribution</span>
          </div>
          <div className="flex rounded-full overflow-hidden h-2">
            <div
              className="bg-red-400 transition-all"
              style={{ width: `${(summary.critical / (summary.critical + summary.at_risk + summary.healthy + summary.overstock)) * 100}%` }}
            />
            <div
              className="bg-amber-400 transition-all"
              style={{ width: `${(summary.at_risk / (summary.critical + summary.at_risk + summary.healthy + summary.overstock)) * 100}%` }}
            />
            <div
              className="bg-emerald-400 transition-all"
              style={{ width: `${(summary.healthy / (summary.critical + summary.at_risk + summary.healthy + summary.overstock)) * 100}%` }}
            />
            <div
              className="bg-indigo-400 transition-all"
              style={{ width: `${(summary.overstock / (summary.critical + summary.at_risk + summary.healthy + summary.overstock)) * 100}%` }}
            />
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            {[
              { label: 'Critical', color: 'bg-red-400', count: summary.critical },
              { label: 'At Risk', color: 'bg-amber-400', count: summary.at_risk },
              { label: 'Healthy', color: 'bg-emerald-400', count: summary.healthy },
              { label: 'Overstock', color: 'bg-indigo-400', count: summary.overstock },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${item.color}`} />
                <span className="text-[10px] text-[var(--text-secondary)]">{item.label} ({item.count})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
