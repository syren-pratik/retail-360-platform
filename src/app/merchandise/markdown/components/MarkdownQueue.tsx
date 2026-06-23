'use client';

import { useState } from 'react';
import { AlertTriangle, Clock, ShieldCheck, ChevronRight, X, MapPin } from 'lucide-react';
import type { MarkdownQueueItem } from '../markdown-types';

// ─── Trigger badge ────────────────────────────────────────────────────────────
const TRIGGER_LABELS: Record<string, { label: string; color: string }> = {
  pace_gap:       { label: 'Pace gap',     color: 'badge-warning' },
  expiry_risk:    { label: 'Expiry risk',  color: 'badge-negative' },
  wos_excess:     { label: 'WOS excess',   color: 'badge-warning' },
  season_exit_risk: { label: 'Season exit', color: 'badge-negative' },
};

// ─── WOS visual bar ───────────────────────────────────────────────────────────
function WOSBar({ wos, remaining }: { wos: number; remaining: number }) {
  // Red if WOS > remaining, amber if > 75% of remaining, green otherwise
  const ratio = wos / Math.max(remaining, 1);
  const color = ratio > 1.5 ? 'bg-red-500' : ratio > 1 ? 'bg-amber-500' : 'bg-emerald-500';
  const fill = Math.min(100, (wos / 12) * 100); // 12W max scale

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${fill}%` }} />
      </div>
      <span className={`text-xs font-semibold ${ratio > 1 ? 'text-red-600' : 'text-[var(--text-secondary)]'}`}>
        {wos.toFixed(1)}W
      </span>
    </div>
  );
}

// ─── SKU Detail Drawer ────────────────────────────────────────────────────────
function SKUDetailDrawer({
  item,
  onClose,
  onApprove,
}: {
  item: MarkdownQueueItem;
  onClose: () => void;
  onApprove: (id: string) => void;
}) {
  const marginColor =
    item.projected_margin_at_recommendation_pct < 0
      ? 'text-red-600'
      : item.projected_margin_at_recommendation_pct < 10
      ? 'text-amber-600'
      : 'text-emerald-600';

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="fixed inset-0 bg-black/20" />
      <div
        className="relative bg-white w-full max-w-md h-full shadow-2xl overflow-y-auto animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[var(--border-default)] px-5 py-4 flex items-start justify-between">
          <div>
            <div className="text-xs text-[var(--text-tertiary)] mb-0.5">{item.brand} · {item.category}</div>
            <h3 className="text-base font-semibold text-[var(--text-primary)] leading-tight">
              {item.product_name}
            </h3>
            <div className="text-xs text-[var(--text-secondary)] mt-0.5">{item.pack_desc}</div>
          </div>
          <button onClick={onClose} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Sell-through vs target */}
          <div>
            <div className="text-xs font-medium text-[var(--text-secondary)] mb-2">Sell-Through Pace</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-red-50 rounded-lg text-center">
                <div className="text-xl font-semibold text-red-700">{item.current_sell_through_pct.toFixed(1)}%</div>
                <div className="text-xs text-red-600">Actual ST%</div>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-lg text-center">
                <div className="text-xl font-semibold text-[var(--text-secondary)]">{item.target_sell_through_pct.toFixed(1)}%</div>
                <div className="text-xs text-[var(--text-tertiary)]">Plan ST%</div>
              </div>
            </div>
          </div>

          {/* Inventory & WOS */}
          <div>
            <div className="text-xs font-medium text-[var(--text-secondary)] mb-2">Inventory Position</div>
            <div className="p-3 bg-[var(--bg-secondary)] rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-tertiary)]">Current stock</span>
                <span className="font-medium">{item.current_stock_units.toLocaleString('en-IN')} units</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-[var(--text-tertiary)]">Weeks of Supply</span>
                <WOSBar wos={item.weeks_of_supply} remaining={item.remaining_season_weeks} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-tertiary)]">Season remaining</span>
                <span className="font-medium">{item.remaining_season_weeks.toFixed(1)} weeks</span>
              </div>
              {item.expiry_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-tertiary)]">Expiry</span>
                  <span className={`font-medium ${(item.days_to_expiry ?? 999) < 30 ? 'text-red-600' : 'text-[var(--text-secondary)]'}`}>
                    {new Date(item.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    {(item.days_to_expiry ?? 999) < 30 && ` · ${item.days_to_expiry}d`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Price recommendation */}
          <div>
            <div className="text-xs font-medium text-[var(--text-secondary)] mb-2">Price Recommendation</div>
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs text-orange-600">Current price</div>
                  <div className="text-base font-semibold text-[var(--text-primary)]">₹{item.current_price_inr}</div>
                </div>
                <ChevronRight size={18} className="text-orange-400" />
                <div>
                  <div className="text-xs text-orange-600">Recommended</div>
                  <div className="text-xl font-bold text-orange-700">₹{item.recommended_price_inr}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-orange-600">Depth</div>
                  <div className="text-base font-semibold text-orange-700">
                    −{item.recommended_markdown_depth_pct.toFixed(0)}%
                  </div>
                </div>
              </div>
              <div className="text-xs text-orange-700">
                Consumer framing: <strong>₹{item.mrp_inr - item.recommended_price_inr} off</strong> (Indians respond 2× stronger to ₹X off vs % discount for grocery)
              </div>
            </div>
          </div>

          {/* Projected margin */}
          <div className="flex items-center gap-4 p-3 bg-[var(--bg-secondary)] rounded-lg">
            <div>
              <div className="text-xs text-[var(--text-tertiary)]">Margin at recommendation</div>
              <div className={`text-lg font-semibold ${marginColor}`}>
                {item.projected_margin_at_recommendation_pct.toFixed(1)}%
              </div>
            </div>
            <div className="h-8 w-px bg-[var(--border-default)]" />
            <div>
              <div className="text-xs text-[var(--text-tertiary)]">Margin impact</div>
              <div className="text-lg font-semibold text-red-600">
                −₹{Math.abs(item.margin_impact_inr / 100).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Store variance */}
          <div>
            <div className="text-xs font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-1">
              <MapPin size={11} />
              Store-Level Variance
            </div>
            <div className="space-y-2">
              {item.store_variance.map((sv) => (
                <div key={sv.store_id} className="flex items-center gap-3 p-2.5 bg-[var(--bg-secondary)] rounded-lg">
                  <div className="flex-1">
                    <div className="text-xs font-medium text-[var(--text-primary)]">{sv.store_name}</div>
                    <div className="text-[10px] text-[var(--text-tertiary)]">{sv.store_type} · {sv.region}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-[var(--text-primary)]">{sv.sell_through_pct.toFixed(1)}% ST</div>
                    <div className="text-[10px] text-[var(--text-tertiary)]">{sv.weeks_of_supply.toFixed(1)}W WOS</div>
                  </div>
                  <div className="bg-orange-100 text-orange-800 text-xs font-semibold px-2 py-1 rounded">
                    −{sv.recommended_depth_pct}%
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1.5">
              Same SKU needs different markdown depth by store — Metro clears faster than Tier-3.
              cx360 generates store-specific recommendations from store-level sell-through curves.
            </p>
          </div>
        </div>

        {/* Sticky actions */}
        <div className="sticky bottom-0 bg-white border-t border-[var(--border-default)] px-5 py-3 flex gap-2">
          <button
            onClick={() => { onApprove(item.sku_id); onClose(); }}
            className="btn-primary flex-1 text-sm"
          >
            Approve Markdown
          </button>
          <button className="btn-secondary text-sm px-3">Escalate</button>
          <button onClick={onClose} className="btn-secondary text-sm px-3">Reject</button>
        </div>
      </div>
    </div>
  );
}

// ─── Queue Card ───────────────────────────────────────────────────────────────
function QueueCard({
  item,
  onClick,
}: {
  item: MarkdownQueueItem;
  onClick: () => void;
}) {
  const trigger = TRIGGER_LABELS[item.trigger_reason] ?? { label: item.trigger_reason, color: 'badge-neutral' };
  const isExpiryUrgent = item.days_to_expiry !== null && item.days_to_expiry < 30;

  return (
    <div
      onClick={onClick}
      className="p-3 border border-[var(--border-default)] rounded-lg hover:border-orange-300 hover:shadow-sm cursor-pointer transition-all group"
    >
      {/* Row 1: name + trigger */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-[var(--text-primary)] truncate group-hover:text-orange-700 transition-colors">
            {item.product_name}
          </div>
          <div className="text-[10px] text-[var(--text-tertiary)]">{item.pack_desc} · {item.brand}</div>
        </div>
        <span className={`badge ${trigger.color} text-[10px] flex-shrink-0`}>{trigger.label}</span>
      </div>

      {/* Row 2: sell-through bar */}
      <div className="mb-1.5">
        <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mb-0.5">
          <span>ST: {item.current_sell_through_pct.toFixed(1)}%</span>
          <span>Target: {item.target_sell_through_pct.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-orange-400"
            style={{ width: `${Math.min(100, item.current_sell_through_pct)}%` }}
          />
          {/* Target marker */}
          <div
            className="absolute h-2.5 w-0.5 bg-[var(--text-secondary)] -mt-2 rounded"
            style={{ left: `${item.target_sell_through_pct}%` }}
          />
        </div>
      </div>

      {/* Row 3: key metrics */}
      <div className="flex items-center justify-between text-[10px] text-[var(--text-tertiary)]">
        <span className={item.weeks_of_supply > item.remaining_season_weeks ? 'text-red-600 font-semibold' : ''}>
          {item.weeks_of_supply.toFixed(1)}W WOS
        </span>
        {isExpiryUrgent && (
          <span className="text-red-600 font-semibold flex items-center gap-0.5">
            <AlertTriangle size={9} />
            Exp {item.days_to_expiry}d
          </span>
        )}
        <span className="text-orange-700 font-semibold">
          Rec: ₹{item.recommended_price_inr} (−{item.recommended_markdown_depth_pct.toFixed(0)}%)
        </span>
      </div>
    </div>
  );
}

// ─── Main Queue ───────────────────────────────────────────────────────────────
interface Props {
  queue: MarkdownQueueItem[];
}

const GUARDRAIL_CHECKS = [
  'No recommendation below product cost price',
  'MRP ceiling: all prices ≤ MRP (Indian legal requirement)',
  'Margin floor: category-level minimum margin verified',
  'Expiry validity: no markdown on expired stock',
  'Cold chain: frozen SKUs only approved for cold-chain-verified stores',
];

export default function MarkdownQueue({ queue }: Props) {
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<MarkdownQueueItem | null>(null);
  const [showGuardrails, setShowGuardrails] = useState(false);

  const pending = queue.filter((q) => !approvedIds.has(q.sku_id));

  const handleApproveAll = () => {
    setShowGuardrails(true);
  };

  const confirmApproveAll = () => {
    setApprovedIds(new Set(queue.map((q) => q.sku_id)));
    setShowGuardrails(false);
  };

  const handleApprove = (id: string) => {
    setApprovedIds((prev) => new Set(Array.from(prev).concat(id)));
  };

  return (
    <div className="card flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Markdown Queue
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Pending approvals · ranked by margin impact
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-warning text-[10px]">{pending.length} pending</span>
        </div>
      </div>

      {/* Queue items */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0 max-h-[480px] pr-1">
        {pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <ShieldCheck size={32} className="text-emerald-500 mb-2" />
            <div className="text-sm font-medium text-[var(--text-primary)]">All approved</div>
            <div className="text-xs text-[var(--text-tertiary)]">No pending markdowns</div>
          </div>
        ) : (
          pending.map((item) => (
            <QueueCard
              key={item.sku_id}
              item={item}
              onClick={() => setSelectedItem(item)}
            />
          ))
        )}
      </div>

      {/* Approve All button */}
      {pending.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
          <button
            onClick={handleApproveAll}
            className="w-full btn-primary text-sm py-2.5"
          >
            Approve All ({pending.length})
          </button>
          <p className="text-[10px] text-[var(--text-tertiary)] text-center mt-1.5">
            {GUARDRAIL_CHECKS.length} guardrails will run before execution
          </p>
        </div>
      )}

      {/* Guardrail confirmation modal */}
      {showGuardrails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30" onClick={() => setShowGuardrails(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 animate-scale-in">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={18} className="text-emerald-600" />
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Approve All — Guardrails</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-3">
              cx360 will run these checks before queuing {pending.length} markdowns:
            </p>
            <ul className="space-y-1.5 mb-4">
              {GUARDRAIL_CHECKS.map((check, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                  <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                  {check}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <button onClick={confirmApproveAll} className="btn-primary flex-1 text-sm">
                Confirm &amp; Approve All
              </button>
              <button onClick={() => setShowGuardrails(false)} className="btn-secondary text-sm px-4">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SKU detail drawer */}
      {selectedItem && (
        <SKUDetailDrawer
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onApprove={handleApprove}
        />
      )}

      {/* How WOS is calculated */}
      <div className="mt-3 text-[10px] text-[var(--text-tertiary)] space-y-0.5">
        <div className="flex items-center gap-1">
          <Clock size={9} />
          <span>WOS = closing stock ÷ avg weekly units (trailing 4W) · Databricks: fact_inventory_daily</span>
        </div>
        <div>Appears in queue when: WOS &gt; remaining season weeks OR expiry &lt; 45 days OR pace gap &gt; 10 pp</div>
      </div>
    </div>
  );
}
