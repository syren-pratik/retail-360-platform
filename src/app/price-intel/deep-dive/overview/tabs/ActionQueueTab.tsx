'use client';

import { useState, useMemo } from 'react';
import type { PriceIntelCore, PriceIntelActionItem } from '@/app/lib/price-intel-types';
import { formatMoneyAuto } from '@/app/lib/format-money';

interface Props {
  core: PriceIntelCore;
  onSKUSelect: (skuId: string) => void;
}

type SortKey = keyof PriceIntelActionItem;

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, review: 1, info: 2 };

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-rose-100 text-rose-700',
  review: 'bg-amber-100 text-amber-700',
  info: 'bg-blue-100 text-blue-700',
};

const ALERT_COLORS: Record<string, string> = {
  free_rider: 'bg-rose-50 text-rose-600',
  cost_passthrough: 'bg-orange-50 text-orange-600',
  margin_floor: 'bg-red-50 text-red-600',
  sell_through: 'bg-amber-50 text-amber-600',
  elasticity_opportunity: 'bg-emerald-50 text-emerald-600',
  promo_ending: 'bg-blue-50 text-blue-600',
  markdown_trigger: 'bg-indigo-50 text-indigo-700',
};

export default function ActionQueueTab({ core, onSKUSelect }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('priority');
  const [sortAsc, setSortAsc] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sorted = useMemo(() => {
    return [...core.action_queue].sort((a, b) => {
      let av: string | number, bv: string | number;
      if (sortKey === 'priority') {
        av = PRIORITY_ORDER[a.priority] ?? 99;
        bv = PRIORITY_ORDER[b.priority] ?? 99;
      } else if (sortKey === 'financial_impact_inr') {
        av = a.financial_impact_inr;
        bv = b.financial_impact_inr;
      } else {
        av = String(a[sortKey] ?? '');
        bv = String(b[sortKey] ?? '');
      }
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [core.action_queue, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(true); }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === sorted.length) setSelected(new Set());
    else setSelected(new Set(sorted.map((i) => i.id)));
  }

  const Th = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      className="text-left px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide cursor-pointer hover:text-[var(--text-primary)] whitespace-nowrap select-none"
      onClick={() => toggleSort(k)}
    >
      {label} {sortKey === k ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <div className="px-8 py-6">
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-default)] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Action Queue</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {core.action_queue.length} items · {core.action_queue.filter((a) => a.priority === 'urgent').length} urgent
            </p>
          </div>
          {selected.size > 0 && (
            <button
              className="px-4 py-2 text-sm font-medium bg-[var(--accent-primary)] text-white rounded-md hover:opacity-90"
              onClick={() => { console.log('Bulk approve:', Array.from(selected)); setSelected(new Set()); }}
            >
              Approve {selected.size} selected
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selected.size === sorted.length && sorted.length > 0}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                <Th k="priority" label="Priority" />
                <Th k="alert_type" label="Type" />
                <Th k="product_name" label="Product / Campaign" />
                <Th k="department" label="Department" />
                <Th k="headline" label="Headline" />
                <Th k="financial_impact_inr" label="Impact" />
                <Th k="confidence" label="Confidence" />
                <Th k="action_window" label="Window" />
                <Th k="status" label="Status" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => (
                <tr
                  key={item.id}
                  className={`border-b border-[var(--border-default)] last:border-0 hover:bg-[var(--bg-secondary)] ${item.sku_id.startsWith('PRD-') ? 'cursor-pointer' : ''}`}
                  onClick={() => { if (item.sku_id.startsWith('PRD-')) onSKUSelect(item.sku_id); }}
                >
                  <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}>
                    <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} className="rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${PRIORITY_COLORS[item.priority] ?? ''}`}>
                      {item.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${ALERT_COLORS[item.alert_type] ?? 'bg-slate-50 text-slate-600'}`}>
                        {item.alert_type.replace(/_/g, ' ')}
                      </span>
                      {!item.sku_id.startsWith('PRD-') && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-50 text-violet-700">
                          Campaign
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)] max-w-[160px]">
                    <p className="truncate">{item.product_name}</p>
                    <p className="text-[10px] font-mono text-[var(--text-tertiary)]">{item.sku_id}</p>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] text-xs whitespace-nowrap">{item.department}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] text-xs max-w-[220px]">
                    <p className="line-clamp-2">{item.headline}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-600 whitespace-nowrap">
                    {formatMoneyAuto(item.financial_impact_inr)}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-secondary)] capitalize">{item.confidence}</td>
                  <td className="px-4 py-3 text-xs text-[var(--text-secondary)] whitespace-nowrap">{item.action_window}</td>
                  <td className="px-4 py-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 capitalize">{item.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
