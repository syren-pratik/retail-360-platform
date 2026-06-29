'use client';

import { useState } from 'react';
import type { PriceIntelCore, PriceIntelCampaign } from '@/app/lib/price-intel-types';
import { formatMoneyAuto } from '@/app/lib/format-money';

interface Props { core: PriceIntelCore }

type SortKey = keyof PriceIntelCampaign;

const STATUS_COLOR: Record<string, string> = {
  live:   'bg-emerald-100 text-emerald-700',
  ended:  'bg-slate-100 text-slate-600',
  paused: 'bg-amber-100 text-amber-700',
  review: 'bg-blue-100 text-blue-700',
};

export default function CampaignsTab({ core }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('roi');
  const [sortAsc, setSortAsc] = useState(false);
  const [selected, setSelected] = useState<PriceIntelCampaign | null>(null);

  const sorted = [...core.campaigns].sort((a, b) => {
    const av = a[sortKey] as number | string;
    const bv = b[sortKey] as number | string;
    if (av < bv) return sortAsc ? -1 : 1;
    if (av > bv) return sortAsc ? 1 : -1;
    return 0;
  });

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortAsc((v) => !v);
    else { setSortKey(k); setSortAsc(false); }
  }

  const Th = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      onClick={() => toggleSort(k)}
      className="text-left px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide cursor-pointer hover:text-[var(--text-primary)] whitespace-nowrap select-none"
    >
      {label} {sortKey === k ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <div className="px-8 py-6">
      <div className="flex gap-6">
        {/* Campaign table */}
        <div className={`card overflow-hidden ${selected ? 'flex-1 min-w-0' : 'w-full'}`}>
          <div className="px-6 py-4 border-b border-[var(--border-default)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">All Campaigns</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">Click row to view details</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
                  <Th k="campaign_name" label="Campaign" />
                  <Th k="mechanic" label="Mechanic" />
                  <Th k="department" label="Dept" />
                  <Th k="status" label="Status" />
                  <Th k="roi" label="ROI" />
                  <Th k="free_rider_ratio_pct" label="Free-rider %" />
                  <Th k="lift_pct" label="Lift %" />
                  <Th k="spend_to_date_inr" label="Spend" />
                  <Th k="incremental_revenue_inr" label="Incremental" />
                  <Th k="post_promo_dip_pct" label="Post-dip %" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((c) => (
                  <tr
                    key={c.campaign_id}
                    onClick={() => setSelected(selected?.campaign_id === c.campaign_id ? null : c)}
                    className={`border-b border-[var(--border-default)] last:border-0 cursor-pointer hover:bg-[var(--bg-secondary)] ${
                      selected?.campaign_id === c.campaign_id ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)] whitespace-nowrap">{c.campaign_name}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] capitalize">{c.mechanic.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] text-xs whitespace-nowrap">{c.department.split(' ')[0]}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLOR[c.status] ?? ''}`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{c.roi.toFixed(2)}×</td>
                    <td className={`px-4 py-3 font-medium ${c.free_rider_ratio_pct > 50 ? 'text-rose-600' : 'text-amber-600'}`}>{c.free_rider_ratio_pct}%</td>
                    <td className="px-4 py-3 text-emerald-600">+{c.lift_pct.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{formatMoneyAuto(c.spend_to_date_inr)}</td>
                    <td className="px-4 py-3 text-emerald-600">{formatMoneyAuto(c.incremental_revenue_inr)}</td>
                    <td className={`px-4 py-3 ${c.post_promo_dip_pct < -6 ? 'text-rose-600' : 'text-[var(--text-secondary)]'}`}>{c.post_promo_dip_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Campaign detail panel */}
        {selected && (
          <div className="w-72 shrink-0 card p-5">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{selected.campaign_name}</h4>
            <p className="text-[10px] text-[var(--text-tertiary)] font-mono mb-4">{selected.campaign_id}</p>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Status', value: selected.status, color: STATUS_COLOR[selected.status] },
                { label: 'Mechanic', value: selected.mechanic.replace(/_/g, ' '), color: null },
                { label: 'Department', value: selected.department, color: null },
                { label: 'Dates', value: `${selected.start_date} – ${selected.end_date}`, color: null },
                { label: 'Budget', value: formatMoneyAuto(selected.budget_inr), color: null },
                { label: 'Spend to date', value: formatMoneyAuto(selected.spend_to_date_inr), color: null },
                { label: 'Incremental Rev.', value: formatMoneyAuto(selected.incremental_revenue_inr), color: 'text-emerald-600' },
                { label: 'ROI', value: `${selected.roi.toFixed(2)}×`, color: selected.roi >= 3 ? 'text-emerald-600' : 'text-amber-600' },
                { label: 'Free-rider ratio', value: `${selected.free_rider_ratio_pct}%`, color: 'text-rose-600' },
                { label: 'Post-promo dip', value: `${selected.post_promo_dip_pct}%`, color: selected.post_promo_dip_pct < -6 ? 'text-rose-600' : '' },
                { label: 'Net incremental', value: formatMoneyAuto(selected.net_incremental_inr), color: 'text-indigo-600' },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center border-b border-[var(--border-default)] pb-2 last:border-0">
                  <span className="text-xs text-[var(--text-tertiary)]">{row.label}</span>
                  <span className={`text-xs font-medium capitalize ${row.color ?? 'text-[var(--text-primary)]'}`}>{row.value}</span>
                </div>
              ))}
              <div>
                <p className="text-[10px] text-[var(--text-tertiary)] mb-1">Affected SKUs</p>
                <div className="flex flex-wrap gap-1">
                  {selected.affected_skus.slice(0, 6).map((id) => (
                    <span key={id} className="px-1.5 py-0.5 bg-[var(--bg-secondary)] rounded text-[10px] font-mono text-[var(--text-secondary)]">{id}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
