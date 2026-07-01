'use client';

import { useCallback, useMemo, useState } from 'react';
import type { MerchDemandFullPayload, MerchDemandSKU } from '@/app/lib/merch-demand-types';
import { fetchMerchDemandSKU } from '@/app/lib/merch-data-loader';
import type { MerchSKUDetailData } from '@/app/lib/merch-data-loader';
import type { SKUForecastPoint, WhatIfParams } from '@/app/merchandise/demand/lib/forecast-aggregation';
import {
  getSKUDrivers,
  getSKUMeta,
  DEFAULT_WHATIF_PARAMS,
} from '@/app/merchandise/demand/lib/forecast-aggregation';
import MerchSKUForecastChart from '@/app/merchandise/demand/components/MerchSKUForecastChart';
import MerchSKUDriversPanel from '@/app/merchandise/demand/components/MerchSKUDriversPanel';
import MerchWhatIfSimulator from '@/app/merchandise/demand/components/MerchWhatIfSimulator';
import MerchSKUMetaChips from '@/app/merchandise/demand/components/MerchSKUMetaChips';
import DeepDiveInsights from '../../shared/DeepDiveInsights';
import { formatMoneyPlainAuto } from '@/app/lib/format-money';

const ANCHOR = '2026-05-17';
const PAGE_SIZE = 20;

const INSIGHTS = [
  { headline: 'Top 30 SKUs have full drill-down', detail: 'Click any SKU from the list to see forecast vs actual, driver breakdown, and what-if simulator.', severity: 'neutral' as const },
  { headline: 'Price elasticity varies by velocity', detail: 'Class A SKUs: -0.6 elasticity. Class C SKUs: -1.8. Price changes affect slow movers most.', severity: 'neutral' as const },
  { headline: 'Weather-sensitive SKUs flagged', detail: '23 SKUs tagged as weather-sensitive. Demand shifts significantly with temperature and rainfall.', severity: 'warning' as const },
  { headline: 'Festival-sensitive SKUs leading', detail: 'Festival-sensitive SKUs showing 18% demand acceleration as Eid approaches.', severity: 'positive' as const },
];

const VELOCITY_BADGE: Record<'A' | 'B' | 'C', string> = {
  A: 'badge-positive',
  B: 'badge-neutral',
  C: 'badge-warning',
};

function toSKUForecastPoints(detail: MerchSKUDetailData): SKUForecastPoint[] {
  return detail.daily_series.map((p) => ({
    date: p.date,
    is_actual: p.is_actual,
    actual_units: p.is_actual ? p.actual_units : null,
    forecast_units: !p.is_actual ? p.forecast_units : null,
    lower_95: p.lower_95,
    upper_95: p.upper_95,
    revenue_inr: p.revenue_inr,
  }));
}

interface Props {
  core: MerchDemandFullPayload;
  selectedSKUId: string | null;
  onSKUSelect: (id: string | null) => void;
}

export default function SKUDetailTab({ core, selectedSKUId, onSKUSelect }: Props) {
  const [skuDetailData, setSkuDetailData] = useState<MerchSKUDetailData | null>(null);
  const [skuDetailLoading, setSkuDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [velocityFilter, setVelocityFilter] = useState<'all' | 'A' | 'B' | 'C'>('all');
  const [page, setPage] = useState(0);
  const [whatIfParams, setWhatIfParams] = useState<WhatIfParams>(DEFAULT_WHATIF_PARAMS);

  const departments = useMemo(
    () => Array.from(new Set(core.skus.map((s) => s.department))).sort(),
    [core.skus],
  );

  const filteredSKUs = useMemo(() => {
    let result = core.skus;
    if (departmentFilter !== 'all') result = result.filter((s) => s.department === departmentFilter);
    if (velocityFilter !== 'all') result = result.filter((s) => s.velocity_class === velocityFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) =>
        s.product_name.toLowerCase().includes(q) || s.sku_id.toLowerCase().includes(q),
      );
    }
    return [...result].sort((a, b) => (b.price_inr * (b.velocity_class === 'A' ? 3 : b.velocity_class === 'B' ? 2 : 1)) - (a.price_inr * (a.velocity_class === 'A' ? 3 : a.velocity_class === 'B' ? 2 : 1)));
  }, [core.skus, departmentFilter, velocityFilter, searchQuery]);

  const pageCount = Math.ceil(filteredSKUs.length / PAGE_SIZE);
  const pageSKUs = filteredSKUs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const selectedSKU = selectedSKUId ? core.skus.find((s) => s.sku_id === selectedSKUId) ?? null : null;
  const drivers = selectedSKU ? (getSKUDrivers(selectedSKU, core.sku_drivers) ?? []) : [];
  const meta = selectedSKU ? getSKUMeta(selectedSKU, core) : null;
  const baseSeries = skuDetailData ? toSKUForecastPoints(skuDetailData) : [];

  const handleSKUSelect = useCallback(async (sku: MerchDemandSKU) => {
    onSKUSelect(sku.sku_id);
    setSkuDetailData(null);
    setWhatIfParams(DEFAULT_WHATIF_PARAMS);
    setSkuDetailLoading(true);
    try {
      const data = await fetchMerchDemandSKU(sku.sku_id);
      setSkuDetailData(data);
    } catch {
      // fall through — detail view shows drivers + whatif from core
    } finally {
      setSkuDetailLoading(false);
    }
  }, [onSKUSelect]);

  const topThree = useMemo(
    () => core.skus.slice(0, 3),
    [core.skus],
  );

  const selectStyle = "text-xs border border-[var(--border-default)] rounded-md px-2 py-1 bg-white text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-6">
        {/* LEFT: SKU selector */}
        <div className="col-span-2 card p-0 overflow-hidden flex flex-col" style={{ maxHeight: 720 }}>
          {/* Filters */}
          <div className="p-4 border-b border-[var(--border-default)] space-y-2 flex-shrink-0">
            <input
              type="text"
              placeholder="Search SKUs…"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              className={`${selectStyle} w-full`}
            />
            <div className="flex gap-2">
              <select
                value={departmentFilter}
                onChange={(e) => { setDepartmentFilter(e.target.value); setPage(0); }}
                className={`${selectStyle} flex-1`}
              >
                <option value="all">All Departments</option>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select
                value={velocityFilter}
                onChange={(e) => { setVelocityFilter(e.target.value as typeof velocityFilter); setPage(0); }}
                className={`${selectStyle} w-20`}
              >
                <option value="all">All</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </div>
          </div>

          {/* SKU list */}
          <div className="overflow-y-auto flex-1">
            {pageSKUs.map((sku) => (
              <button
                key={sku.sku_id}
                type="button"
                onClick={() => handleSKUSelect(sku)}
                className={`w-full text-left px-4 py-3 border-b border-[var(--border-subtle)] transition-colors ${
                  selectedSKUId === sku.sku_id
                    ? 'bg-[var(--accent-primary-light)] border-l-2 border-l-[var(--accent-primary)]'
                    : 'hover:bg-[var(--bg-secondary)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[var(--text-primary)] truncate">{sku.product_name}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)] font-mono mt-0.5">{sku.sku_id} · {sku.category}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`badge ${VELOCITY_BADGE[sku.velocity_class]} text-[9px]`}>{sku.velocity_class}</span>
                    {sku.is_festival_sensitive && <span className="text-[10px]">🎉</span>}
                    {sku.is_weather_sensitive && <span className="text-[10px]">🌦</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Pagination */}
          <div className="px-4 py-2 border-t border-[var(--border-default)] flex items-center justify-between flex-shrink-0">
            <span className="text-[10px] text-[var(--text-tertiary)]">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredSKUs.length)} of {filteredSKUs.length}
            </span>
            <div className="flex gap-1">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="px-2 py-0.5 text-[10px] border border-[var(--border-default)] rounded disabled:opacity-40 hover:bg-[var(--bg-secondary)]"
              >
                ‹
              </button>
              <button
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => p + 1)}
                className="px-2 py-0.5 text-[10px] border border-[var(--border-default)] rounded disabled:opacity-40 hover:bg-[var(--bg-secondary)]"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: SKU Detail */}
        <div className="col-span-3">
          {!selectedSKUId ? (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-[var(--text-secondary)] mb-2">
                Select a SKU from the list to see its full forecast, demand drivers, and what-if simulator
              </p>
              <p className="text-xs text-[var(--text-tertiary)] mb-8">Quick access:</p>
              <div className="flex gap-3">
                {topThree.map((sku) => (
                  <button
                    key={sku.sku_id}
                    onClick={() => handleSKUSelect(sku)}
                    className="px-4 py-3 border border-[var(--border-default)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors text-left max-w-[160px]"
                  >
                    <p className="text-xs font-medium text-[var(--text-primary)] truncate">{sku.product_name}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)] font-mono mt-0.5">{sku.sku_id}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : skuDetailLoading ? (
            <div className="card flex flex-col items-center justify-center py-16 gap-3">
              <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full" />
              <p className="text-sm text-[var(--text-secondary)]">Loading SKU forecast data…</p>
            </div>
          ) : selectedSKU ? (
            <div className="space-y-4">
              {/* SKU header */}
              <div className="card">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-semibold text-[var(--text-primary)] leading-tight">{selectedSKU.product_name}</h2>
                    <p className="text-xs text-[var(--text-tertiary)] font-mono mt-1">
                      {selectedSKU.sku_id} · {selectedSKU.department} › {selectedSKU.category} › {selectedSKU.subcategory}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`badge ${VELOCITY_BADGE[selectedSKU.velocity_class]}`}>
                        Velocity {selectedSKU.velocity_class}
                      </span>
                      <span className="badge badge-neutral">{selectedSKU.perishability.replace('_', ' ')}</span>
                      {selectedSKU.is_festival_sensitive && <span className="badge badge-warning">Festival sensitive</span>}
                      {selectedSKU.is_weather_sensitive && <span className="badge badge-neutral">Weather sensitive</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-4 flex-shrink-0">
                    <span className="text-xs text-[var(--text-tertiary)]">{formatMoneyPlainAuto(selectedSKU.price_inr)} / unit</span>
                    <span className="text-xs text-[var(--text-tertiary)]">Margin {selectedSKU.margin_pct.toFixed(1)}%</span>
                  </div>
                </div>

                {meta && <MerchSKUMetaChips meta={meta} />}
              </div>

              {/* Forecast chart */}
              <div className="card">
                <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">Demand Forecast</p>
                {baseSeries.length > 0 ? (
                  <div style={{ height: 420 }}>
                    <MerchSKUForecastChart
                      baseSeries={baseSeries}
                      sku={selectedSKU}
                      whatIfParams={whatIfParams}
                      forecastStart={ANCHOR}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8 text-sm text-[var(--text-tertiary)]">
                    Forecast chart data not available for this SKU
                  </div>
                )}
              </div>

              {/* Drivers + Simulator */}
              <div className="grid grid-cols-2 gap-4">
                <div className="card">
                  <MerchSKUDriversPanel drivers={drivers} />
                </div>
                <div className="card">
                  <MerchWhatIfSimulator sku={selectedSKU} params={whatIfParams} onChange={setWhatIfParams} />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <DeepDiveInsights insights={INSIGHTS} />
    </div>
  );
}
