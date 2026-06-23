'use client';

import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import { formatLakhsCrores } from '@/app/lib/merch-format';

interface Props {
  core: PriceIntelCore;
  onSKUSelect: (skuId: string) => void;
}

function AgingTile({
  label, units, value, flag, pct,
}: { label: string; units: number; value: number; flag?: boolean; pct: number }) {
  return (
    <div className={`card p-4 ${flag ? 'border-rose-300' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-medium text-[var(--text-secondary)]">{label}</p>
        {flag && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-100 text-rose-700">⚠ At risk</span>}
      </div>
      <p className="text-xl font-semibold text-[var(--text-primary)]">{units.toLocaleString('en-IN')}</p>
      <p className="text-xs text-[var(--text-secondary)] mt-0.5">units · {formatLakhsCrores(value)}</p>
      <div className="mt-2 h-1.5 bg-[var(--border-default)] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${flag ? 'bg-rose-400' : 'bg-indigo-400'}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-[var(--text-tertiary)] mt-1">{pct.toFixed(0)}% of total inventory value</p>
    </div>
  );
}

export default function AgingTab({ core, onSKUSelect }: Props) {
  const aging = core.inventory_aging;
  const totalValue = aging.bucket_0_4w.value_inr + aging.bucket_5_8w.value_inr + aging.bucket_9_12w.value_inr + aging.bucket_13w_plus.value_inr;

  // Older SKUs (9-12W and 13W+) for the table
  const atRiskSKUs = core.skus
    .filter((s) => s.inventory_age_bucket === '9-12W' || s.inventory_age_bucket === '13W+')
    .sort((a, b) => {
      const order = { '13W+': 0, '9-12W': 1 };
      return (order[a.inventory_age_bucket as '13W+' | '9-12W'] ?? 2) - (order[b.inventory_age_bucket as '13W+' | '9-12W'] ?? 2);
    });

  return (
    <div className="px-8 py-6">
      {/* 4 Aging bucket tiles */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <AgingTile
          label="0–4 Weeks"
          units={aging.bucket_0_4w.units}
          value={aging.bucket_0_4w.value_inr}
          flag={false}
          pct={(aging.bucket_0_4w.value_inr / totalValue) * 100}
        />
        <AgingTile
          label="5–8 Weeks"
          units={aging.bucket_5_8w.units}
          value={aging.bucket_5_8w.value_inr}
          flag={aging.bucket_5_8w.flag}
          pct={(aging.bucket_5_8w.value_inr / totalValue) * 100}
        />
        <AgingTile
          label="9–12 Weeks"
          units={aging.bucket_9_12w.units}
          value={aging.bucket_9_12w.value_inr}
          flag={aging.bucket_9_12w.flag}
          pct={(aging.bucket_9_12w.value_inr / totalValue) * 100}
        />
        <AgingTile
          label="13W+"
          units={aging.bucket_13w_plus.units}
          value={aging.bucket_13w_plus.value_inr}
          flag={aging.bucket_13w_plus.flag}
          pct={(aging.bucket_13w_plus.value_inr / totalValue) * 100}
        />
      </div>

      <div className="card p-4 mb-6 bg-amber-50 border-amber-200">
        <p className="text-sm text-amber-800">{aging.insight}</p>
      </div>

      {/* SKU-level aging table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-default)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">At-Risk Inventory — 9W+ SKUs</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {atRiskSKUs.length} SKUs · Click row to open detail drawer
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
                {['SKU', 'Category', 'Age bucket', 'Weeks of supply', 'Sell-through %', 'Value ₹', 'Recommended action'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {atRiskSKUs.map((sku) => (
                <tr
                  key={sku.sku_id}
                  className="border-b border-[var(--border-default)] last:border-0 hover:bg-[var(--bg-secondary)] cursor-pointer"
                  onClick={() => onSKUSelect(sku.sku_id)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--text-primary)]">{sku.product_name}</p>
                    <p className="text-[10px] font-mono text-[var(--text-tertiary)]">{sku.sku_id}</p>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{sku.category}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${sku.inventory_age_bucket === '13W+' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                      {sku.inventory_age_bucket}
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-medium ${sku.weeks_of_supply > 10 ? 'text-rose-600' : 'text-amber-600'}`}>
                    {sku.weeks_of_supply.toFixed(1)}W
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-[var(--border-default)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${sku.sell_through_pct >= sku.sell_through_target_pct ? 'bg-emerald-400' : 'bg-rose-400'}`}
                          style={{ width: `${Math.min(100, sku.sell_through_pct)}%` }}
                        />
                      </div>
                      <span className={sku.sell_through_pct < sku.sell_through_target_pct ? 'text-rose-600 font-medium' : ''}>
                        {sku.sell_through_pct.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {formatLakhsCrores(sku.current_price_inr * sku.weeks_of_supply * 100)}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                    {sku.recommendation_priority === 'High'
                      ? 'Immediate markdown — trigger clearance'
                      : sku.weeks_of_supply > 12
                        ? 'Accelerate sell-through'
                        : 'Monitor weekly'}
                  </td>
                </tr>
              ))}
              {atRiskSKUs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-[var(--text-secondary)]">No at-risk inventory this week</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
