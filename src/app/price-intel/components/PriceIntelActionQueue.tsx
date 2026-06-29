'use client';

import { useState } from 'react';
import { AlertCircle, Info, CheckCircle, ChevronRight, Check, BellOff } from 'lucide-react';
import type { PriceIntelActionItem } from '@/app/lib/price-intel-types';
import { formatMoneyAuto } from '@/app/lib/format-money';

interface Props {
  items: PriceIntelActionItem[];
  onSKUSelect: (skuId: string) => void;
}

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', bg: 'bg-rose-100', text: 'text-rose-700', icon: <AlertCircle size={12} /> },
  review: { label: 'Review', bg: 'bg-amber-100', text: 'text-amber-700', icon: <Info size={12} /> },
  info:   { label: 'Info',   bg: 'bg-blue-100',  text: 'text-blue-700',  icon: <CheckCircle size={12} /> },
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  free_rider:             'Free Rider',
  cost_passthrough:       'Cost Passthrough',
  margin_floor:           'Margin Floor',
  sell_through:           'Sell Through',
  elasticity_opportunity: 'Elasticity',
  promo_ending:           'Promo Ending',
  competitor_gap:         'Competitor Gap',
  markdown_trigger:       'Markdown',
};

export default function PriceIntelActionQueue({ items, onSKUSelect }: Props) {
  const [filter, setFilter] = useState<'all' | 'urgent' | 'review'>('all');
  const [acted, setActed] = useState<Record<string, 'approved' | 'snoozed'>>({});

  // Campaign IDs (CAMP-*) don't map to individual SKUs — skip drawer for them
  const isSKULink = (skuId: string) => skuId.startsWith('PRD-');

  const filtered = items
    .filter((i) => filter === 'all' || i.priority === filter)
    .sort((a, b) => {
      const order = { urgent: 0, review: 1, info: 2 };
      const po = order[a.priority] - order[b.priority];
      if (po !== 0) return po;
      return b.financial_impact_inr - a.financial_impact_inr;
    })
    .slice(0, 10);

  const urgentCount = items.filter((i) => i.priority === 'urgent').length;

  return (
    <div className="card p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Action Queue</h3>
          <p className="text-xs text-[var(--text-tertiary)]">{urgentCount} urgent · {items.length} total</p>
        </div>
        <div className="flex gap-1">
          {(['all', 'urgent', 'review'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                filter === f
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border-default)]'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-[var(--text-tertiary)] text-center py-8">No items</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => {
              const cfg = PRIORITY_CONFIG[item.priority];
              const action = acted[item.id];
              return (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 p-2.5 rounded-lg border transition-colors ${
                    isSKULink(item.sku_id) ? 'cursor-pointer' : ''
                  } ${
                    action === 'approved'
                      ? 'border-emerald-200 bg-emerald-50'
                      : action === 'snoozed'
                      ? 'border-[var(--border-default)] opacity-50'
                      : 'border-[var(--border-default)] hover:bg-[var(--bg-secondary)]'
                  }`}
                  onClick={() => { if (isSKULink(item.sku_id)) onSKUSelect(item.sku_id); }}
                >
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 mt-0.5 ${cfg.bg} ${cfg.text}`}>
                    {cfg.icon}
                    <span>{cfg.label}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-medium text-[var(--text-primary)] truncate">{item.product_name}</span>
                      <span className="text-[10px] text-[var(--text-tertiary)] shrink-0">{item.department}</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-tight line-clamp-1">{item.headline}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded text-[var(--text-tertiary)]">
                        {ALERT_TYPE_LABELS[item.alert_type] ?? item.alert_type}
                      </span>
                      {!isSKULink(item.sku_id) && (
                        <span className="text-[10px] bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded font-medium">
                          Campaign
                        </span>
                      )}
                      <span className="text-[10px] text-rose-600 font-medium">
                        {formatMoneyAuto(item.financial_impact_inr)} at stake
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {action ? (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${action === 'approved' ? 'text-emerald-600' : 'text-[var(--text-tertiary)]'}`}>
                        {action === 'approved' ? 'Approved' : 'Snoozed'}
                      </span>
                    ) : (
                      <>
                        <button
                          className="p-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                          title="Approve"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActed((prev) => ({ ...prev, [item.id]: 'approved' }));
                          }}
                        >
                          <Check size={11} />
                        </button>
                        <button
                          className="p-1 rounded bg-[var(--bg-secondary)] text-[var(--text-tertiary)] hover:bg-[var(--border-default)] transition-colors"
                          title="Snooze"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActed((prev) => ({ ...prev, [item.id]: 'snoozed' }));
                          }}
                        >
                          <BellOff size={11} />
                        </button>
                      </>
                    )}
                    {isSKULink(item.sku_id) && <ChevronRight size={14} className="text-[var(--text-tertiary)] ml-1" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
