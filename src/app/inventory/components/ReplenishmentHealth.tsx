'use client';

import { useState } from 'react';
import type { ReplenishmentData, StoreHealthScore } from './InventoryDashboardContent';

interface Props {
  data: ReplenishmentData | null;
}

const STATUS_COLORS: Record<string, string> = {
  critical: '#EF4444',
  at_risk: '#F59E0B',
  healthy: '#10B981',
};

export default function ReplenishmentHealth({ data }: Props) {
  const [tab, setTab] = useState<'stores' | 'leadtime' | 'funnel'>('stores');

  const summary = data?.summary;
  const stores = data?.store_health_scores ?? [];
  const leadTime = data?.lead_time_by_supplier_category ?? [];
  const safetyStock = data?.safety_stock_by_abc ?? [];
  const funnel = data?.replenishment_funnel ?? [];

  const funnelMax = funnel[0]?.count ?? 1;

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Replenishment Health</h3>
          {summary && (
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              <span className={`font-medium ${summary.on_time_pct >= 90 ? 'text-emerald-600' : summary.on_time_pct >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                {summary.on_time_pct.toFixed(0)}% on time
              </span>
              {' · '}
              {summary.stores_below_safety_stock} stores below safety stock
              {' · '}
              avg {summary.avg_lead_time_days.toFixed(1)}d lead time
            </p>
          )}
        </div>
        {summary && (
          <div className="text-right">
            <p className="text-xs font-semibold text-amber-600">₹{summary.urgent_pending_cr.toFixed(1)}Cr</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">urgent pending</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {([
          { key: 'stores', label: 'Store Health' },
          { key: 'leadtime', label: 'Lead Times' },
          { key: 'funnel', label: 'Funnel' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              tab === t.key
                ? 'bg-[var(--accent-primary)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Store health */}
      {tab === 'stores' && (
        <div className="space-y-1 overflow-y-auto max-h-[260px]">
          <div className="grid grid-cols-[1fr_80px_72px_64px] gap-2 px-2 py-1">
            <span className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide">Store</span>
            <span className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide text-right">Score</span>
            <span className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide text-right">SKUs↓</span>
            <span className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide text-center">Status</span>
          </div>
          {stores.slice(0, 12).map((s: StoreHealthScore) => (
            <div
              key={s.store_id}
              className="grid grid-cols-[1fr_80px_72px_64px] gap-2 items-center px-2 py-1.5 rounded hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <div>
                <p className="text-xs font-medium text-[var(--text-primary)] truncate">{s.store_name}</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">{s.city}</p>
              </div>
              <div className="flex items-center justify-end gap-1.5">
                <div className="w-14 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${s.health_score}%`,
                      background: s.health_score >= 80 ? '#10B981' : s.health_score >= 60 ? '#F59E0B' : '#EF4444',
                    }}
                  />
                </div>
                <span className={`text-xs font-medium ${s.health_score >= 80 ? 'text-emerald-600' : s.health_score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                  {s.health_score}
                </span>
              </div>
              <span className="text-xs text-right font-medium text-[var(--text-primary)]">{s.skus_below_safety}</span>
              <div className="flex justify-center">
                <span
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                  style={{
                    background: STATUS_COLORS[s.status] + '18',
                    color: STATUS_COLORS[s.status],
                    border: `1px solid ${STATUS_COLORS[s.status]}40`,
                  }}
                >
                  {s.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))}
          {/* Safety stock by ABC */}
          {safetyStock.length > 0 && (
            <div className="pt-3 mt-3 border-t border-[var(--border-subtle)]">
              <p className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide mb-2">Safety Stock Coverage by ABC</p>
              <div className="space-y-1.5">
                {safetyStock.map(s => (
                  <div key={s.abc_class} className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--text-secondary)] w-6">{s.abc_class}</span>
                    <div className="flex-1 h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${s.coverage_pct}%`,
                          background: s.coverage_pct >= s.target_pct ? '#10B981' : s.coverage_pct >= s.target_pct * 0.9 ? '#F59E0B' : '#EF4444',
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium text-[var(--text-primary)] w-10 text-right">{s.coverage_pct.toFixed(0)}%</span>
                    <span className="text-[10px] text-[var(--text-tertiary)] w-14 text-right">tgt {s.target_pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lead time */}
      {tab === 'leadtime' && (
        <div className="space-y-1.5 overflow-y-auto max-h-64">
          <div className="grid grid-cols-[1fr_90px_64px_64px] gap-2 px-2 py-1">
            <span className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide">Supplier / Category</span>
            <span className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide text-right">Avg Days</span>
            <span className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide text-right">Target</span>
            <span className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide text-center">Status</span>
          </div>
          {leadTime.map((lt, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_90px_64px_64px] gap-2 items-center px-2 py-1.5 rounded hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <div>
                <p className="text-xs font-medium text-[var(--text-primary)] truncate">{lt.supplier}</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">{lt.category}</p>
              </div>
              <span className={`text-xs font-medium text-right ${
                lt.status === 'critical' ? 'text-red-600' : lt.status === 'over' ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                {lt.avg_lead_days.toFixed(1)}d
              </span>
              <span className="text-xs text-right text-[var(--text-secondary)]">{lt.committed_days}d</span>
              <div className="flex justify-center">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  lt.status === 'critical' ? 'bg-red-50 text-red-700 border border-red-200' :
                  lt.status === 'over' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {lt.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Funnel */}
      {tab === 'funnel' && (
        <div className="space-y-2.5 overflow-y-auto max-h-64 py-2">
          {funnel.map((stage, i) => {
            const pct = (stage.count / funnelMax) * 100;
            const onSchedulePct = stage.on_schedule_pct;
            return (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-primary)] font-medium">{stage.stage}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-secondary)]">{stage.count.toLocaleString()} orders</span>
                    <span className={`text-xs font-medium ${onSchedulePct >= 90 ? 'text-emerald-600' : onSchedulePct >= 75 ? 'text-amber-600' : 'text-red-600'}`}>
                      {onSchedulePct.toFixed(0)}% on schedule
                    </span>
                  </div>
                </div>
                <div className="h-6 bg-[var(--bg-secondary)] rounded overflow-hidden relative">
                  <div
                    className="h-full rounded transition-all"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, #6366F1 0%, #818CF8 100%)`,
                    }}
                  />
                  <div
                    className="absolute top-0 left-0 h-full bg-emerald-400 opacity-60 rounded"
                    style={{ width: `${pct * (onSchedulePct / 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-indigo-400" />
              <span className="text-[10px] text-[var(--text-secondary)]">Total orders</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400 opacity-70" />
              <span className="text-[10px] text-[var(--text-secondary)]">On schedule</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
