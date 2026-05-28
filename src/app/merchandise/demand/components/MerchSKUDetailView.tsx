'use client';

import { useMemo, useState } from 'react';
import type { MerchDemandSKU } from '@/app/lib/merch-demand-types';
import type { MerchDemandFullPayload } from '@/app/lib/merch-demand-types';
import type { MerchFilterState } from '../MerchFilterContext';
import {
  getSKUForecastSeries,
  getSKUDrivers,
  getSKUMeta,
  DEFAULT_WHATIF_PARAMS,
} from '../lib/forecast-aggregation';
import type { WhatIfParams } from '../lib/forecast-aggregation';
import MerchSKUForecastChart from './MerchSKUForecastChart';
import MerchSKUDriversPanel from './MerchSKUDriversPanel';
import MerchWhatIfSimulator from './MerchWhatIfSimulator';
import MerchSKUMetaChips from './MerchSKUMetaChips';

const VELOCITY_LABEL: Record<'A' | 'B' | 'C', string> = {
  A: 'Velocity A',
  B: 'Velocity B',
  C: 'Velocity C',
};

const PERISHABILITY_LABEL: Record<MerchDemandSKU['perishability'], string> = {
  non_perishable: 'Non-perishable',
  short_shelf: 'Short shelf',
  perishable: 'Perishable',
};

interface Props {
  sku: MerchDemandSKU;
  payload: MerchDemandFullPayload;
  filters: MerchFilterState;
  onBack: () => void;
}

export default function MerchSKUDetailView({ sku, payload, filters, onBack }: Props) {
  const [whatIfParams, setWhatIfParams] = useState<WhatIfParams>(DEFAULT_WHATIF_PARAMS);

  const baseSeries = useMemo(
    () => getSKUForecastSeries(sku, payload.daily_forecast_points, filters, payload),
    [sku, payload, filters],
  );

  const drivers = useMemo(
    () => getSKUDrivers(sku, payload.sku_drivers),
    [sku, payload.sku_drivers],
  );

  const meta = useMemo(
    () => getSKUMeta(sku, payload),
    [sku, payload],
  );

  const velocityBadgeCls =
    sku.velocity_class === 'A' ? 'badge-positive' :
    sku.velocity_class === 'B' ? 'badge-neutral' :
    'badge-warning';

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ── */}
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-shrink-0 mt-0.5 p-1 rounded hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"
          aria-label="Back to SKU list"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11L5 7l4-4" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight truncate">
            {sku.product_name}
          </p>
          <p className="text-[10px] text-[var(--text-tertiary)] font-mono mt-0.5">{sku.sku_id}</p>
          <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
            {sku.department} · {sku.category} · {sku.subcategory}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={`badge ${velocityBadgeCls} text-[9px]`}>{VELOCITY_LABEL[sku.velocity_class]}</span>
          <span className="badge badge-neutral text-[9px]">{PERISHABILITY_LABEL[sku.perishability]}</span>
          {sku.is_weather_sensitive && (
            <span className="badge badge-neutral text-[9px]">Weather sensitive</span>
          )}
          {sku.is_festival_sensitive && (
            <span className="badge badge-neutral text-[9px]">Festival sensitive</span>
          )}
        </div>
      </div>

      {/* ── Pricing summary ── */}
      <div className="flex items-center gap-4 text-[10px]">
        <span className="text-[var(--text-tertiary)]">
          Price <span className="font-semibold text-[var(--text-primary)]">₹{sku.price_inr.toFixed(0)}</span>
        </span>
        <span className="text-[var(--text-tertiary)]">
          MRP <span className="font-semibold text-[var(--text-primary)]">₹{sku.mrp_inr.toFixed(0)}</span>
        </span>
        <span className="text-[var(--text-tertiary)]">
          Margin <span className="font-semibold text-[var(--text-primary)]">{sku.margin_pct.toFixed(1)}%</span>
        </span>
      </div>

      {/* ── Meta chips ── */}
      <MerchSKUMetaChips meta={meta} />

      {/* ── Forecast chart ── */}
      <MerchSKUForecastChart
        baseSeries={baseSeries}
        sku={sku}
        whatIfParams={whatIfParams}
        forecastStart={payload.data_window.forecast_start}
      />

      {/* ── Drivers + Simulator ── */}
      <div className="grid grid-cols-2 gap-4 border-t border-[var(--border-default)] pt-3">
        <MerchSKUDriversPanel drivers={drivers ?? []} />
        <MerchWhatIfSimulator sku={sku} params={whatIfParams} onChange={setWhatIfParams} />
      </div>
    </div>
  );
}
