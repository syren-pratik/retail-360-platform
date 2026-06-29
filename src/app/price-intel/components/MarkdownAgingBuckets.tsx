'use client';

import PriceIntelChartCard from './PriceIntelChartCard';
import type { PriceIntelInventoryAging } from '@/app/lib/price-intel-types';
import { formatMoneyAuto, getLocaleAuto } from '@/app/lib/format-money';

interface Props {
  aging: PriceIntelInventoryAging;
}

interface BucketRow {
  label: string;
  units: number;
  value_inr: number;
  flag?: boolean;
  color: string;
  barPct: number;
}

export default function MarkdownAgingBuckets({ aging }: Props) {
  const totalValue =
    aging.bucket_0_4w.value_inr +
    aging.bucket_5_8w.value_inr +
    aging.bucket_9_12w.value_inr +
    aging.bucket_13w_plus.value_inr;

  const buckets: BucketRow[] = [
    {
      label: '0–4 Weeks',
      units: aging.bucket_0_4w.units,
      value_inr: aging.bucket_0_4w.value_inr,
      color: '#10B981',
      barPct: (aging.bucket_0_4w.value_inr / totalValue) * 100,
    },
    {
      label: '5–8 Weeks',
      units: aging.bucket_5_8w.units,
      value_inr: aging.bucket_5_8w.value_inr,
      flag: aging.bucket_5_8w.flag,
      color: '#6366F1',
      barPct: (aging.bucket_5_8w.value_inr / totalValue) * 100,
    },
    {
      label: '9–12 Weeks',
      units: aging.bucket_9_12w.units,
      value_inr: aging.bucket_9_12w.value_inr,
      flag: aging.bucket_9_12w.flag,
      color: '#F59E0B',
      barPct: (aging.bucket_9_12w.value_inr / totalValue) * 100,
    },
    {
      label: '13W+',
      units: aging.bucket_13w_plus.units,
      value_inr: aging.bucket_13w_plus.value_inr,
      flag: aging.bucket_13w_plus.flag,
      color: '#F43F5E',
      barPct: (aging.bucket_13w_plus.value_inr / totalValue) * 100,
    },
  ];

  return (
    <PriceIntelChartCard
      data={buckets as unknown as Record<string, unknown>[]}
      id="price-intel-aging-buckets"
      title="Inventory Aging"
      subtitle={aging.insight}
      height={240}
      exportFilename="price_intel_aging_buckets"
    >
      <div className="space-y-4 pt-2">
        {buckets.map((b) => (
          <div key={b.label}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-[var(--text-primary)]">{b.label}</span>
                {b.flag && (
                  <span className="text-[10px] bg-rose-100 text-rose-700 px-1 py-0.5 rounded">flag</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--text-tertiary)]">{b.units.toLocaleString(getLocaleAuto())} units</span>
                <span className="text-xs font-medium text-[var(--text-primary)]">{formatMoneyAuto(b.value_inr)}</span>
              </div>
            </div>
            <div className="relative h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${b.barPct}%`, background: b.color }}
              />
            </div>
          </div>
        ))}
        <div className="flex justify-between text-xs text-[var(--text-tertiary)] pt-1 border-t border-[var(--border-default)]">
          <span>Total inventory value</span>
          <span className="font-medium text-[var(--text-primary)]">{formatMoneyAuto(totalValue)}</span>
        </div>
      </div>
    </PriceIntelChartCard>
  );
}
