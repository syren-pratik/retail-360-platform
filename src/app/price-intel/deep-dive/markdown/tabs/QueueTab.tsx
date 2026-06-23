'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';
import type { PriceIntelCore, PriceIntelMarkdownQueueItem } from '@/app/lib/price-intel-types';
import { formatLakhsCrores } from '@/app/lib/merch-format';

interface Props { core: PriceIntelCore }

const URGENCY_COLOR = (score: number) =>
  score >= 70 ? 'bg-rose-100 text-rose-700' : score >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600';

function miniVelocityData(item: PriceIntelMarkdownQueueItem) {
  // Simulate sell-through progression over last 8 weeks
  const target = item.target_sell_through_pct;
  const current = item.current_sell_through_pct;
  const weeks = 8;
  return Array.from({ length: weeks }, (_, i) => ({
    w: i + 1,
    actual: Math.round(current * (i + 1) / weeks),
    target: Math.round(target * (i + 1) / weeks),
  }));
}

export default function QueueTab({ core }: Props) {
  const [approved, setApproved] = useState<Set<string>>(new Set());

  function approveItem(skuId: string) {
    setApproved((prev) => { const next = new Set(prev); next.add(skuId); return next; });
  }

  function approveAll() {
    setApproved(new Set(core.markdown_queue.map((i) => i.sku_id)));
  }

  const queue = core.markdown_queue;

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Markdown Queue</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{queue.length} items pending · Total revenue at risk: {formatLakhsCrores(queue.reduce((s, i) => s + i.revenue_at_risk_inr, 0))}</p>
        </div>
        <button
          onClick={approveAll}
          className="px-4 py-2 text-sm font-medium bg-[var(--accent-primary)] text-white rounded-md hover:opacity-90"
        >
          Approve All ({queue.filter((i) => !approved.has(i.sku_id)).length} pending)
        </button>
      </div>

      <div className="space-y-4">
        {queue.map((item) => {
          const isApproved = approved.has(item.sku_id);
          const velocityData = miniVelocityData(item);
          const projectedClearUnits = Math.round(item.units_at_risk * (1 + Math.abs(item.recommended_depth_pct) / 100 * 1.5));

          return (
            <div
              key={item.sku_id}
              className={`card p-5 ${isApproved ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-5">
                {/* Left: product info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-[var(--text-primary)]">{item.product_name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${URGENCY_COLOR(item.urgency_score)}`}>
                      Urgency {item.urgency_score}
                    </span>
                    {isApproved && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700">Approved</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--text-tertiary)] font-mono mb-3">{item.sku_id} · {item.category} · {item.inventory_age_bucket}</p>

                  <div className="grid grid-cols-5 gap-3 text-center mb-3">
                    {[
                      { label: 'Current ST', value: `${item.current_sell_through_pct.toFixed(1)}%`, bad: true },
                      { label: 'Target ST', value: `${item.target_sell_through_pct}%`, bad: false },
                      { label: 'Days left', value: `${item.days_remaining}d`, bad: item.days_remaining < 21 },
                      { label: 'Weeks of supply', value: `${item.weeks_of_supply}W`, bad: item.weeks_of_supply > 10 },
                      { label: 'Units at risk', value: item.units_at_risk.toLocaleString('en-IN'), bad: true },
                    ].map((kpi) => (
                      <div key={kpi.label} className="bg-[var(--bg-secondary)] rounded p-2">
                        <p className="text-[9px] text-[var(--text-tertiary)] uppercase">{kpi.label}</p>
                        <p className={`text-sm font-semibold ${kpi.bad ? 'text-rose-600' : 'text-[var(--text-primary)]'}`}>{kpi.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-sm">
                      <span className="text-[var(--text-secondary)]">Recommended: </span>
                      <span className="font-semibold text-rose-600">{item.recommended_depth_pct}% markdown</span>
                      <span className="text-[var(--text-secondary)] ml-1">→</span>
                      <span className="font-semibold text-[var(--text-primary)] ml-1">₹{item.recommended_price_inr}</span>
                    </div>
                    <div className="text-sm text-[var(--text-secondary)]">
                      Rev. at risk: <span className="font-semibold text-rose-600">{formatLakhsCrores(item.revenue_at_risk_inr)}</span>
                    </div>
                    <div className="text-sm text-[var(--text-secondary)]">
                      Proj. clear: <span className="font-semibold text-emerald-600">{projectedClearUnits.toLocaleString('en-IN')} units</span>
                    </div>
                  </div>
                </div>

                {/* Mini sell-through chart */}
                <div className="w-32 shrink-0">
                  <p className="text-[9px] text-[var(--text-tertiary)] uppercase text-center mb-1">Velocity 8W</p>
                  <div style={{ height: 72 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={velocityData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                        <Line dataKey="target" stroke="#94A3B8" strokeDasharray="3 2" dot={false} strokeWidth={1} />
                        <Line dataKey="actual" stroke="#F43F5E" dot={false} strokeWidth={1.5} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2 shrink-0">
                  {!isApproved ? (
                    <>
                      <button
                        onClick={() => approveItem(item.sku_id)}
                        className="px-3 py-1.5 text-xs font-medium bg-[var(--accent-primary)] text-white rounded-md hover:opacity-90"
                      >
                        Approve
                      </button>
                      <button className="px-3 py-1.5 text-xs font-medium border border-[var(--border-default)] rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">
                        Snooze
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-emerald-600 font-medium">✓ Done</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
