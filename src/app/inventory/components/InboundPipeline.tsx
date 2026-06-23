'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import type { InboundData, InboundShipment } from './InventoryDashboardContent';
import { AIInsightButton } from '@/app/components/charts/ChartCard';

interface Props {
  data: InboundData | null;
}

const STATUS_STYLES: Record<string, string> = {
  on_track: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  at_risk: 'bg-amber-50 text-amber-700 border-amber-200',
  delayed: 'bg-red-50 text-red-700 border-red-200',
  scheduled: 'bg-gray-50 text-gray-600 border-gray-200',
};

const STATUS_DOT: Record<string, string> = {
  on_track: '#10B981',
  at_risk: '#F59E0B',
  delayed: '#EF4444',
  scheduled: '#9CA3AF',
};

export default function InboundPipeline({ data }: Props) {
  const [tab, setTab] = useState<'gantt' | 'delayed' | 'capacity'>('gantt');

  const summary = data?.summary;
  const gantt = data?.gantt_14d ?? [];
  const delayed = data?.delayed_impact ?? [];
  const capacity = data?.receiving_capacity ?? [];

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Inbound Pipeline</h3>
          {summary && (
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              <span className="font-medium text-[var(--text-primary)]">{summary.in_transit.count}</span> in transit (₹{summary.in_transit.value_cr.toFixed(1)}Cr)
              {' · '}
              <span className="text-red-600 font-medium">{summary.delayed.count} delayed</span>
              {' · '}
              {summary.on_time_probability_pct.toFixed(0)}% on-time probability
            </p>
          )}
        </div>
        <div className="flex items-start gap-1.5">
          <AIInsightButton id="inventory-inbound-pipeline" title="Inbound Pipeline" data={gantt as unknown as Record<string, unknown>[]} />
          {summary && (
            <div className="text-right">
              <p className="text-xs font-semibold text-[var(--text-primary)]">{summary.due_this_week.count}</p>
              <p className="text-[10px] text-[var(--text-tertiary)]">due this week</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {([
          { key: 'gantt', label: 'Shipments' },
          { key: 'delayed', label: 'Delayed Impact' },
          { key: 'capacity', label: 'Capacity' },
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

      {/* Gantt-style shipment list */}
      {tab === 'gantt' && (
        <div className="space-y-1 overflow-y-auto max-h-64">
          <div className="grid grid-cols-[1fr_80px_70px_64px] gap-2 px-2 py-1">
            <span className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide">Supplier · Category</span>
            <span className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide text-right">Value</span>
            <span className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide text-right">ETA</span>
            <span className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide text-center">Status</span>
          </div>
          {gantt.map((s: InboundShipment) => (
            <div
              key={s.shipment_id}
              className="grid grid-cols-[1fr_80px_70px_64px] gap-2 items-center px-2 py-1.5 rounded hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: STATUS_DOT[s.status] ?? '#9CA3AF' }}
                  />
                  <p className="text-xs font-medium text-[var(--text-primary)] truncate">{s.supplier}</p>
                  {s.resolves_stockout && (
                    <span className="text-[9px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 px-1 rounded shrink-0">
                      fixes OOS
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[var(--text-tertiary)] pl-3">{s.category} · {s.store_name}</p>
              </div>
              <span className="text-xs font-medium text-right text-[var(--text-primary)]">₹{s.value_cr.toFixed(2)}Cr</span>
              <span className="text-xs text-right text-[var(--text-secondary)]">
                {new Date(s.expected_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
              </span>
              <div className="flex justify-center">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${STATUS_STYLES[s.status] ?? STATUS_STYLES.scheduled}`}>
                  {s.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delayed impact */}
      {tab === 'delayed' && (
        <div className="space-y-2 overflow-y-auto max-h-64">
          {delayed.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] text-center py-8">No delayed shipments</p>
          ) : (
            delayed.map(d => (
              <div key={d.shipment_id} className="p-3 rounded-lg border border-red-100 bg-red-50 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-red-900">{d.supplier} — {d.category}</p>
                    <p className="text-[10px] text-red-600 mt-0.5">
                      {d.delay_days}d delay · {d.skus_affected} SKUs · {d.stores_affected} stores
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-red-700">₹{d.rev_at_risk_cr.toFixed(1)}Cr</p>
                    <p className="text-[10px] text-red-500">rev at risk</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-red-600">
                  <span>Original ETA: {new Date(d.original_eta).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                  <span>→</span>
                  <span className="font-semibold">New ETA: {new Date(d.new_eta).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                </div>
                {d.action_required && (
                  <p className="text-[10px] text-red-800 font-medium border-t border-red-200 pt-1.5">
                    Action: {d.action_required}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Warehouse capacity */}
      {tab === 'capacity' && (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={capacity} margin={{ top: 4, right: 8, bottom: 16, left: 4 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9 }}
                tickFormatter={v => new Date(v).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                angle={-35}
                textAnchor="end"
                interval={1}
              />
              <YAxis tick={{ fontSize: 10 }} label={{ value: 'Pallets', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: '#9CA3AF' } }} />
              <Tooltip
                formatter={(v: unknown, name: unknown) => [
                  `${(v as number).toLocaleString()} pallets`,
                  name === 'inbound_pallets' ? 'Inbound' : 'Capacity',
                ]}
                labelFormatter={(l: unknown) => new Date(String(l)).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
              />
              <ReferenceLine y={capacity[0]?.capacity_pallets} stroke="#EF4444" strokeDasharray="4 2" label={{ value: 'Capacity', position: 'right', style: { fontSize: 9, fill: '#EF4444' } }} />
              <Bar dataKey="inbound_pallets" name="inbound_pallets" radius={[3, 3, 0, 0]}>
                {capacity.map((c, i) => (
                  <Cell key={i} fill={c.over_capacity ? '#EF4444' : c.utilization_pct > 85 ? '#F59E0B' : '#6366F1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-3 justify-center mt-1">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-indigo-500" /><span className="text-[10px] text-[var(--text-secondary)]">Normal</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-amber-400" /><span className="text-[10px] text-[var(--text-secondary)]">&gt;85%</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-red-400" /><span className="text-[10px] text-[var(--text-secondary)]">Over capacity</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
