'use client';

import { useState } from 'react';
import type { PriceIntelCampaign } from '@/app/lib/price-intel-types';
import { formatMoneyAuto } from '@/app/lib/format-money';
import { formatPercent } from '@/app/lib/merch-format';

interface Props {
  campaigns: PriceIntelCampaign[];
}

const STATUS_STYLES = {
  live:    'bg-emerald-100 text-emerald-700',
  ended:   'bg-[var(--bg-secondary)] text-[var(--text-tertiary)]',
  paused:  'bg-amber-100 text-amber-700',
  review:  'bg-blue-100 text-blue-700',
};

const MECHANIC_LABELS: Record<string, string> = {
  pct_off:    '% Off',
  bogo:       'BOGO',
  bundle:     'Bundle',
  multipack:  'Multipack',
  cashback:   'Cashback',
};

export default function PromoCampaignsTable({ campaigns }: Props) {
  const [sort, setSort] = useState<'roi' | 'revenue' | 'name'>('roi');

  const sorted = [...campaigns].sort((a, b) => {
    if (sort === 'roi') return b.roi - a.roi;
    if (sort === 'revenue') return b.incremental_revenue_inr - a.incremental_revenue_inr;
    return a.campaign_name.localeCompare(b.campaign_name);
  });

  return (
    <div className="card p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Campaigns</h3>
        <div className="flex gap-1">
          {(['roi', 'revenue', 'name'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-2 py-0.5 text-[11px] rounded font-medium transition-colors ${
                sort === s
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border-default)]'
              }`}
            >
              {s === 'roi' ? 'ROI' : s === 'revenue' ? 'Revenue' : 'A–Z'}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              <th className="text-left py-1.5 px-2 text-[var(--text-secondary)] font-medium">Campaign</th>
              <th className="text-left py-1.5 px-2 text-[var(--text-secondary)] font-medium">Mechanic</th>
              <th className="text-right py-1.5 px-2 text-[var(--text-secondary)] font-medium">ROI</th>
              <th className="text-right py-1.5 px-2 text-[var(--text-secondary)] font-medium">Incr. Rev</th>
              <th className="text-right py-1.5 px-2 text-[var(--text-secondary)] font-medium">Free Rider</th>
              <th className="text-right py-1.5 px-2 text-[var(--text-secondary)] font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr key={c.campaign_id} className="border-b border-[var(--border-default)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                <td className="py-1.5 px-2">
                  <p className="font-medium text-[var(--text-primary)] truncate max-w-[140px]">{c.campaign_name}</p>
                  <p className="text-[var(--text-tertiary)] text-[10px]">{c.department}</p>
                </td>
                <td className="py-1.5 px-2 text-[var(--text-secondary)]">
                  {MECHANIC_LABELS[c.mechanic] ?? c.mechanic}
                </td>
                <td className={`py-1.5 px-2 text-right font-mono font-semibold ${c.roi >= 1.5 ? 'text-emerald-600' : c.roi >= 1.0 ? 'text-[var(--text-primary)]' : 'text-rose-600'}`}>
                  {c.roi.toFixed(2)}×
                </td>
                <td className="py-1.5 px-2 text-right font-mono text-[var(--text-primary)]">
                  {formatMoneyAuto(c.incremental_revenue_inr)}
                </td>
                <td className={`py-1.5 px-2 text-right font-mono ${c.free_rider_ratio_pct > 30 ? 'text-rose-600' : 'text-[var(--text-secondary)]'}`}>
                  {formatPercent(c.free_rider_ratio_pct)}
                </td>
                <td className="py-1.5 px-2 text-right">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_STYLES[c.status]}`}>
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
