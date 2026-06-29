'use client';

import { TrendingUp, TrendingDown, AlertTriangle, ShoppingCart } from 'lucide-react';
import type { PriceIntelKPIs } from '@/app/lib/price-intel-types';
import { formatMoneyAuto } from '@/app/lib/format-money';
import { formatPercentSigned } from '@/app/lib/merch-format';

interface Props {
  kpis: PriceIntelKPIs;
}

function KPITile({
  label,
  value,
  sub,
  trend,
  trendLabel,
  color,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: number;
  trendLabel?: string;
  color: 'default' | 'positive' | 'negative' | 'warning';
  icon: React.ReactNode;
}) {
  const colorMap = {
    default:  'text-[var(--text-primary)]',
    positive: 'text-emerald-600',
    negative: 'text-rose-600',
    warning:  'text-amber-600',
  };
  return (
    <div className="card p-4 flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[var(--text-tertiary)]">{icon}</span>
        <span className="text-xs text-[var(--text-secondary)] font-medium truncate">{label}</span>
      </div>
      <div className={`text-2xl font-bold tabular-nums ${colorMap[color]}`}>{value}</div>
      {trend !== undefined && trendLabel && (
        <div className={`flex items-center gap-1 mt-1 text-xs ${trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{formatPercentSigned(trend)} {trendLabel}</span>
        </div>
      )}
      {sub && !trend && <div className="text-xs text-[var(--text-tertiary)] mt-1">{sub}</div>}
    </div>
  );
}

export default function PriceIntelKPIStrip({ kpis }: Props) {
  return (
    <div className="flex gap-3">
      <KPITile
        label="Margin Realization"
        value={`${kpis.margin_realization_pct.toFixed(1)}%`}
        trend={kpis.margin_realization_trend}
        trendLabel="vs last week"
        color={kpis.margin_realization_trend >= 0 ? 'positive' : 'negative'}
        icon={<TrendingUp size={14} />}
      />
      <KPITile
        label="Margin Leakage"
        value={formatMoneyAuto(kpis.total_margin_leakage_inr)}
        sub="this week"
        color="negative"
        icon={<TrendingDown size={14} />}
      />
      <KPITile
        label="Promo ROI Index"
        value={`${kpis.promo_roi_index.toFixed(2)}×`}
        trend={kpis.promo_roi_trend}
        trendLabel="vs last week"
        color={kpis.promo_roi_index >= 1.5 ? 'positive' : 'warning'}
        icon={<ShoppingCart size={14} />}
      />
      <KPITile
        label="Sell-Through"
        value={`${kpis.sell_through_pct.toFixed(1)}%`}
        trend={kpis.sell_through_vs_target}
        trendLabel="vs target"
        color={kpis.sell_through_vs_target >= 0 ? 'positive' : 'warning'}
        icon={<AlertTriangle size={14} />}
      />
    </div>
  );
}
