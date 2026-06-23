'use client';

import { useMerchFilters } from '../MerchFilterContext';
import type { MerchDemandPrecomputedHorizon, MerchDemandFullPayload, MerchDemandForecastPoint } from '@/app/lib/merch-demand-types';
import type { MerchSKUDetailData } from '@/app/lib/merch-data-loader';
import { formatLakhsCrores } from '@/app/lib/merch-format';
import MerchSKUDetailView from './MerchSKUDetailView';
import { AIInsightButton } from '@/app/components/charts/ChartCard';

type TopSKUEntry = MerchDemandPrecomputedHorizon['top_skus'][number];

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return <div className="w-[60px] h-6 flex-shrink-0" />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 60, H = 24;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - ((v - min) / range) * (H - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="flex-shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RiskBadge({ risk }: { risk: TopSKUEntry['risk'] }) {
  const cls =
    risk.variant === 'negative' ? 'badge badge-negative' :
    risk.variant === 'warning'  ? 'badge badge-warning' :
    'badge badge-neutral';
  return <span className={cls}>{risk.label}</span>;
}

const SPARKLINE_COLORS: Record<string, string> = {
  neutral:  '#3B82F6',
  warning:  '#F59E0B',
  negative: '#F43F5E',
};

interface Props {
  precomp: MerchDemandPrecomputedHorizon | null;
  core: MerchDemandFullPayload;
  selectedSubcategory: string | null;
  selectedSKUId: string | null;
  skuDetailData: MerchSKUDetailData | null;
  skuDetailLoading: boolean;
  onSKUSelect: (id: string | null) => void;
  horizon: number;
}

export default function MerchSKUDrillPanel({
  precomp,
  core,
  selectedSubcategory,
  selectedSKUId,
  skuDetailData,
  skuDetailLoading,
  onSKUSelect,
  horizon,
}: Props) {
  const { state } = useMerchFilters();

  // MODE 2 — SKU detail
  if (selectedSKUId) {
    const sku = core.skus.find((s) => s.sku_id === selectedSKUId);

    if (skuDetailLoading || !sku) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-2 py-12">
          <div className="animate-spin w-5 h-5 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full" />
          <p className="text-xs text-[var(--text-tertiary)]">Loading SKU detail…</p>
        </div>
      );
    }

    const hasSKUDetail = skuDetailData !== null && skuDetailData.sku_id === selectedSKUId;
    const payloadToUse: MerchDemandFullPayload = hasSKUDetail && skuDetailData
      ? {
          ...core,
          daily_forecast_points: skuDetailData.daily_series.map((p): MerchDemandForecastPoint => ({
            sku_id: selectedSKUId,
            store_id: 'ALL',
            date: p.date,
            is_actual: p.is_actual,
            actual_units: p.actual_units,
            forecast_units: p.forecast_units,
            lower_95: p.lower_95,
            upper_95: p.upper_95,
            lower_80: null,
            upper_80: null,
            revenue_inr: p.revenue_inr,
            confidence: 'Medium',
          })),
        }
      : core;

    return (
      <div className="overflow-y-auto" style={{ maxHeight: 480 }}>
        {!hasSKUDetail && (
          <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-700">
            Detailed forecast data available for top-30 SKUs only.
            Showing summary drivers and what-if simulator.
          </div>
        )}
        <MerchSKUDetailView
          key={selectedSKUId}
          sku={sku}
          payload={payloadToUse}
          filters={state}
          onBack={() => onSKUSelect(null)}
        />
      </div>
    );
  }

  // MODE 1 — top SKU list
  const rows = (precomp?.top_skus ?? []).filter(
    (r) => !selectedSubcategory || r.sku.subcategory === selectedSubcategory,
  );

  return (
    <div className="flex flex-col h-full">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[var(--text-primary)]">Top SKUs by Forecast Revenue</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            {horizon}d horizon · ranked by ₹ forecast · click to inspect
          </p>
        </div>
        <AIInsightButton id="merch-top-skus-forecast-revenue" title="Top SKUs by Forecast Revenue" data={rows as unknown as Record<string, unknown>[]} />
      </div>

      {rows.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-sm text-[var(--text-tertiary)] py-8">
          {precomp ? 'No SKUs match current scope' : 'Select a department to load SKUs'}
        </div>
      ) : (
        <div className="space-y-1 overflow-y-auto" style={{ maxHeight: 340 }}>
          {rows.map((row, idx) => (
            <button
              key={row.sku.sku_id}
              type="button"
              onClick={() => onSKUSelect(row.sku.sku_id)}
              className="w-full text-left p-2 rounded-lg border border-[var(--border-default)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--text-tertiary)] w-4 flex-shrink-0 tabular-nums">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--text-primary)] truncate leading-tight">
                    {row.sku.product_name}
                  </p>
                  <p className="text-[10px] text-[var(--text-tertiary)] font-mono leading-tight mt-0.5">
                    {row.sku.sku_id}
                  </p>
                </div>
                <Sparkline data={row.sparkline} color={SPARKLINE_COLORS[row.risk.variant] ?? '#3B82F6'} />
                <span className="text-xs font-semibold text-[var(--text-primary)] tabular-nums flex-shrink-0 w-16 text-right">
                  {formatLakhsCrores(row.revenue_at_stake)}
                </span>
              </div>
              <div className="mt-1 ml-6">
                <RiskBadge risk={row.risk} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
