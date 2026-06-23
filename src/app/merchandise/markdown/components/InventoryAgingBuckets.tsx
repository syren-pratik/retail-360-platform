'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import type { InventoryAgingData, AgingBucketData } from '../markdown-types';

function formatUnits(n: number): string {
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function formatInr(n: number): string {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  return `₹${(n / 1_000).toFixed(0)}K`;
}

const BUCKET_CONFIG: Record<string, {
  label: string;
  sublabel: string;
  why: string;
  ringColor: string;
  badgeBg: string;
  badgeText: string;
}> = {
  '0-4W': {
    label: '0 – 4 Weeks',
    sublabel: 'Fresh inventory',
    why: 'Recently received. Normal trading stock. No action needed.',
    ringColor: 'ring-emerald-200',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
  },
  '5-8W': {
    label: '5 – 8 Weeks',
    sublabel: 'Monitor zone',
    why: 'Moderate aging. For FMCG with 90-day shelf life, this is 55-90% of shelf life consumed.',
    ringColor: 'ring-emerald-200',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
  },
  '9-12W': {
    label: '9 – 12 Weeks',
    sublabel: 'Markdown candidate',
    why: 'High aging. Expiry risk for 90-day shelf life products. Immediate markdown recommended.',
    ringColor: 'ring-amber-300',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
  },
  '13W+': {
    label: '13+ Weeks',
    sublabel: 'Danger zone',
    why: 'Critical. Many FMCG products with 6-month shelf life have only 30-60% remaining. Write-off or deep markdown (−50%+) only option. Tier-3 stores often cannot clear at any price.',
    ringColor: 'ring-red-300',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-700',
  },
};

const SIGNAL_CONFIG: Record<string, { border: string; bg: string }> = {
  green: { border: 'border-emerald-200', bg: 'bg-emerald-50' },
  amber: { border: 'border-amber-200', bg: 'bg-amber-50' },
  red:   { border: 'border-red-300',   bg: 'bg-red-50'   },
};

interface BucketCardProps {
  bucket: AgingBucketData;
}

function BucketCard({ bucket }: BucketCardProps) {
  const [expanded, setExpanded] = useState(false);
  const cfg = BUCKET_CONFIG[bucket.bucket];
  const sig = SIGNAL_CONFIG[bucket.color_signal] ?? SIGNAL_CONFIG.green;
  const isPositiveTrend = bucket.trend_vs_prior_year_pct < 0; // fewer aged units = good
  const hasExpiryRisk = bucket.expiry_risk_units > 0;

  return (
    <div
      className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${sig.border} ${sig.bg} hover:shadow-md`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            {cfg.label}
          </div>
          <div className="text-[10px] text-[var(--text-tertiary)]">{cfg.sublabel}</div>
        </div>
        <span className={`badge text-[10px] ${cfg.badgeBg} ${cfg.badgeText}`}>
          {bucket.color_signal.toUpperCase()}
        </span>
      </div>

      {/* Unit count */}
      <div className="text-3xl font-bold text-[var(--text-primary)] my-2">
        {formatUnits(bucket.unit_count)}
        <span className="text-sm font-normal text-[var(--text-tertiary)] ml-1">units</span>
      </div>

      {/* INR value */}
      <div className="text-sm font-medium text-[var(--text-secondary)] mb-2">
        {formatInr(bucket.value_inr)} at cost
      </div>

      {/* YoY trend */}
      <div className="flex items-center gap-1 text-xs mb-2">
        {isPositiveTrend ? (
          <TrendingDown size={12} className="text-emerald-600" />
        ) : (
          <TrendingUp size={12} className="text-red-500" />
        )}
        <span className={isPositiveTrend ? 'text-emerald-600' : 'text-red-500'}>
          {bucket.trend_vs_prior_year_pct > 0 ? '+' : ''}
          {bucket.trend_vs_prior_year_pct.toFixed(1)}% vs PY
        </span>
        <span className="text-[var(--text-tertiary)]">same week</span>
      </div>

      {/* Expiry risk overlay */}
      {hasExpiryRisk && (
        <div className="flex items-start gap-1.5 p-2 bg-white/70 rounded-lg border border-red-200">
          <AlertTriangle size={11} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-[10px] text-red-700">
            <strong>{formatUnits(bucket.expiry_risk_units)} units</strong> expiring within this aging window — write-off risk if not cleared
          </div>
        </div>
      )}

      {/* Expanded: why it matters */}
      {expanded && (
        <div className="mt-2 pt-2 border-t border-white/50 text-[10px] text-[var(--text-secondary)]">
          {cfg.why}
        </div>
      )}
    </div>
  );
}

interface Props {
  data: InventoryAgingData;
}

export default function InventoryAgingBuckets({ data }: Props) {
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Inventory Aging Buckets
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Days in warehouse since receipt · FMCG expiry risk overlaid · Click to expand
          </p>
        </div>
        {data.expiry_overlap_units > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle size={13} className="text-red-500" />
            <span className="text-xs font-medium text-red-700">
              {formatUnits(data.expiry_overlap_units)} units at expiry risk
            </span>
          </div>
        )}
      </div>

      {/* 4 bucket cards */}
      <div className="grid grid-cols-4 gap-3">
        {data.buckets.map((bucket) => (
          <BucketCard key={bucket.bucket} bucket={bucket} />
        ))}
      </div>

      {/* Aging methodology note */}
      <div className="mt-4 p-3 bg-[var(--bg-secondary)] rounded-lg text-[10px] text-[var(--text-secondary)] space-y-1">
        <div className="font-medium text-[var(--text-primary)] text-xs mb-1">How aging is calculated for FMCG</div>
        <div>
          <strong>Aging days</strong> = Today&apos;s date − GRN date (goods received note) from WMS.
          Databricks: dim_inventory.grn_date JOIN fact_inventory_daily.sku_id.
        </div>
        <div>
          <strong>Expiry risk overlay:</strong> Where product expiry date (dim_product.expiry_date) falls within the aging bucket window.
          Frozen &amp; chilled: flagged at 5-8W (short shelf life). Dry grocery: flagged at 9-12W.
        </div>
        <div className="text-red-600">
          <strong>13W+ danger zone:</strong> Indian retail reality — Tier-3 stores sometimes cannot
          clear even at −60% discount due to low footfall. cx360 triggers write-off recommendation
          when projected sell-through at max markdown depth is still &lt; 50% for Tier-3.
        </div>
      </div>
    </div>
  );
}
