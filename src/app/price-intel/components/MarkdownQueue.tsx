'use client';

import { useState } from 'react';

import type { PriceIntelMarkdownQueueItem } from '@/app/lib/price-intel-types';
import { formatLakhsCrores, formatPercent } from '@/app/lib/merch-format';

interface Props {
  items: PriceIntelMarkdownQueueItem[];
  onSKUSelect: (skuId: string) => void;
}

const URGENCY_CONFIG = (score: number) => {
  if (score >= 8) return { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Critical' };
  if (score >= 5) return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'High' };
  return { bg: 'bg-blue-100', text: 'text-blue-600', label: 'Medium' };
};

export default function MarkdownQueue({ items, onSKUSelect }: Props) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved'>('pending');

  const filtered = items
    .filter((i) => statusFilter === 'all' || i.status === statusFilter)
    .sort((a, b) => b.urgency_score - a.urgency_score);

  return (
    <div className="card p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Markdown Queue</h3>
          <p className="text-xs text-[var(--text-tertiary)]">{items.filter((i) => i.status === 'pending').length} pending decisions</p>
        </div>
        <div className="flex gap-1">
          {(['pending', 'approved', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-2 py-0.5 text-[11px] rounded font-medium transition-colors ${
                statusFilter === f
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border-default)]'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              <th className="text-left py-1.5 px-2 text-[var(--text-secondary)] font-medium">Product</th>
              <th className="text-right py-1.5 px-2 text-[var(--text-secondary)] font-medium">ST%</th>
              <th className="text-right py-1.5 px-2 text-[var(--text-secondary)] font-medium">Days left</th>
              <th className="text-right py-1.5 px-2 text-[var(--text-secondary)] font-medium">Rec. depth</th>
              <th className="text-right py-1.5 px-2 text-[var(--text-secondary)] font-medium">Revenue at risk</th>
              <th className="text-right py-1.5 px-2 text-[var(--text-secondary)] font-medium">Urgency</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-[var(--text-tertiary)]">
                  No markdown candidates for this selection — all SKUs are tracking to target.
                </td>
              </tr>
            )}
            {filtered.map((item) => {
              const urg = URGENCY_CONFIG(item.urgency_score);
              return (
                <tr
                  key={item.sku_id}
                  className="border-b border-[var(--border-default)] last:border-0 hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors"
                  onClick={() => onSKUSelect(item.sku_id)}
                >
                  <td className="py-1.5 px-2">
                    <p className="font-medium text-[var(--text-primary)] truncate max-w-[150px]">{item.product_name}</p>
                    <p className="text-[var(--text-tertiary)] text-[10px]">{item.department} · {item.inventory_age_bucket}</p>
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      <span className="font-mono text-[var(--text-primary)]">{formatPercent(item.current_sell_through_pct)}</span>
                      <span className="text-[var(--text-tertiary)]">/ {formatPercent(item.target_sell_through_pct)}</span>
                    </div>
                  </td>
                  <td className={`py-1.5 px-2 text-right font-mono ${item.days_remaining <= 7 ? 'text-rose-600 font-semibold' : 'text-[var(--text-secondary)]'}`}>
                    {item.days_remaining}d
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono text-[var(--text-primary)] font-semibold">
                    −{formatPercent(item.recommended_depth_pct, 0)}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono text-rose-600 font-medium">
                    {formatLakhsCrores(item.revenue_at_risk_inr)}
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${urg.bg} ${urg.text}`}>
                      {urg.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
