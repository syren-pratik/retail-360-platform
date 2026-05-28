'use client';

import { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import KPICard from '@/app/components/kpi/KPICard';
import { formatLakhsCrores, formatPercent } from '@/app/lib/merch-format';
import type { MerchDemandKPIs } from '@/app/lib/merch-demand-types';

interface MerchKPIStripProps {
  kpis: MerchDemandKPIs;
}

function pctChange(first: number, last: number): number {
  if (first === 0) return 0;
  return Math.round(((last - first) / Math.abs(first)) * 1000) / 10;
}

// Tile 4 — custom shell that mirrors KPICard's .card outer exactly,
// but replaces the change badge with event-specific content and
// shows a Calendar icon in the sparkline slot.
function MerchEventKPITile({
  kpis,
  onClick,
}: {
  kpis: MerchDemandKPIs;
  onClick: () => void;
}) {
  return (
    <div
      className="card relative overflow-hidden cursor-pointer hover:shadow-sm transition-shadow"
      onClick={onClick}
    >
      {/* Calendar icon occupies the sparkline slot */}
      <div className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center opacity-70">
        <Calendar size={22} className="text-[var(--chart-indigo)]" />
      </div>

      <div className="flex items-start justify-between">
        <div className="flex-1 pr-10">
          <p className="text-sm text-[var(--text-secondary)] mb-1">Next Event</p>
          <p className="text-2xl font-semibold text-[var(--text-primary)] leading-tight">
            {kpis.next_event.event_name}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-xs text-[var(--text-tertiary)]">
          {kpis.next_event.days_until}d away · {kpis.next_event.skus_not_ramped} SKUs not ramped
        </p>
      </div>
    </div>
  );
}

export default function MerchKPIStrip({ kpis }: MerchKPIStripProps) {
  const riskSparkline = useMemo(
    () => kpis.demand_at_risk_trend_4w.map(p => p.value_inr),
    [kpis.demand_at_risk_trend_4w],
  );
  const overstockSparkline = useMemo(
    () => kpis.overstock_trend_4w.map(p => p.value_inr),
    [kpis.overstock_trend_4w],
  );
  const accuracySparkline = useMemo(
    () => kpis.accuracy_trend_4w.map(p => p.accuracy_pct),
    [kpis.accuracy_trend_4w],
  );

  const riskChange = useMemo(() => {
    const t = kpis.demand_at_risk_trend_4w;
    return t.length >= 2 ? pctChange(t[0].value_inr, t[t.length - 1].value_inr) : 0;
  }, [kpis.demand_at_risk_trend_4w]);

  const overstockChange = useMemo(() => {
    const t = kpis.overstock_trend_4w;
    return t.length >= 2 ? pctChange(t[0].value_inr, t[t.length - 1].value_inr) : 0;
  }, [kpis.overstock_trend_4w]);

  const accuracyChange = useMemo(() => {
    const t = kpis.accuracy_trend_4w;
    return t.length >= 2 ? pctChange(t[0].accuracy_pct, t[t.length - 1].accuracy_pct) : 0;
  }, [kpis.accuracy_trend_4w]);

  return (
    <div className="grid grid-cols-4 gap-4">

      {/* Tile 1 — Demand at Risk */}
      <div className="animate-fade-slide-up stagger-1">
        <div
          className="cursor-pointer"
          onClick={() => console.log('Sprint 4: scroll to action center')}
        >
          <KPICard
            label="Demand at Risk"
            value={formatLakhsCrores(kpis.demand_at_risk_inr)}
            change={riskChange}
            changeLabel="vs 4 weeks ago"
            invertColors={true}
            sparklineData={riskSparkline}
          />
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mt-1 px-1">
          {kpis.demand_at_risk_sku_count} SKUs affected
        </p>
      </div>

      {/* Tile 2 — Overstock Exposure */}
      <div className="animate-fade-slide-up stagger-2">
        <div
          className="cursor-pointer"
          onClick={() => console.log('Sprint 4: scroll to action center')}
        >
          <KPICard
            label="Overstock Exposure"
            value={formatLakhsCrores(kpis.overstock_exposure_inr)}
            change={overstockChange}
            changeLabel="vs 4 weeks ago"
            invertColors={true}
            sparklineData={overstockSparkline}
          />
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mt-1 px-1">
          {kpis.overstock_exposure_sku_count} SKUs affected
        </p>
      </div>

      {/* Tile 3 — Forecast Accuracy */}
      <div className="animate-fade-slide-up stagger-3">
        <div
          className="cursor-pointer"
          onClick={() => console.log('Sprint 5: expand model performance accordion')}
        >
          <KPICard
            label="Forecast Accuracy"
            value={formatPercent(kpis.forecast_accuracy_30d_pct)}
            change={accuracyChange}
            changeLabel="vs 4 weeks ago"
            invertColors={false}
            sparklineData={accuracySparkline}
          />
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mt-1 px-1">
          30-day MAPE basis
        </p>
      </div>

      {/* Tile 4 — Next Event */}
      <div className="animate-fade-slide-up stagger-4">
        <MerchEventKPITile
          kpis={kpis}
          onClick={() => console.log('Sprint 4: open event prep tab')}
        />
      </div>
    </div>
  );
}
