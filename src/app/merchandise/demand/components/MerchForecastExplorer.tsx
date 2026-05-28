'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMerchFilters } from '../MerchFilterContext';
import { INDIA_V1 } from '@/app/lib/market-config';
import type { MerchDemandFullPayload } from '@/app/lib/merch-demand-types';
import {
  filterSKUsByScope,
  filterStoresByScope,
  aggregateByDateAndSubcategory,
  aggregateByDateAndTopSKUs,
  getTopSKUsInScope,
} from '../lib/forecast-aggregation';
import MerchCategoryTimeline from './MerchCategoryTimeline';
import MerchSKUDrillPanel from './MerchSKUDrillPanel';

interface Props {
  payload: MerchDemandFullPayload;
}

export default function MerchForecastExplorer({ payload }: Props) {
  const { state } = useMerchFilters();
  const [breakdown, setBreakdown] = useState<'subcategory' | 'skus'>('subcategory');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedSKUId, setSelectedSKUId] = useState<string | null>(null);

  const skuMap = useMemo(
    () => new Map(payload.skus.map(s => [s.sku_id, s])),
    [payload.skus],
  );

  const filteredSKUs = useMemo(
    () => filterSKUsByScope(payload.skus, state),
    [payload.skus, state],
  );

  const filteredStores = useMemo(
    () => filterStoresByScope(payload.stores, state.geography, state.channel),
    [payload.stores, state.geography, state.channel],
  );

  const skuIdSet = useMemo(
    () => new Set(filteredSKUs.map(s => s.sku_id)),
    [filteredSKUs],
  );

  const storeIdSet = useMemo(
    () => new Set(filteredStores.map(s => s.store_id)),
    [filteredStores],
  );

  // Use pre-aggregated data when available (payload.daily_forecast_points will be empty)
  const deptKey = state.department || 'all';
  const precomp = payload.precomputed?.[deptKey];
  const hasPrecomputed = !!precomp;

  // Auto-reset selected SKU when it leaves the filtered scope
  useEffect(() => {
    if (selectedSKUId && !skuIdSet.has(selectedSKUId)) {
      setSelectedSKUId(null);
    }
  }, [selectedSKUId, skuIdSet]);

  const subcatAgg = useMemo<ReturnType<typeof aggregateByDateAndSubcategory>>(() => {
    if (hasPrecomputed) return { chartData: precomp!.subcat_chart as ReturnType<typeof aggregateByDateAndSubcategory>['chartData'], subcategories: precomp!.subcategories };
    return aggregateByDateAndSubcategory(payload.daily_forecast_points, skuMap, skuIdSet, storeIdSet);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPrecomputed, precomp, payload.daily_forecast_points, skuMap, skuIdSet, storeIdSet]);

  const topSKUAgg = useMemo<ReturnType<typeof aggregateByDateAndTopSKUs>>(() => {
    if (hasPrecomputed) return { chartData: precomp!.topsku_chart as ReturnType<typeof aggregateByDateAndTopSKUs>['chartData'], skuIds: precomp!.topsku_ids, skuNames: precomp!.topsku_names };
    return aggregateByDateAndTopSKUs(payload.daily_forecast_points, skuMap, skuIdSet, storeIdSet, 5);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPrecomputed, precomp, payload.daily_forecast_points, skuMap, skuIdSet, storeIdSet]);

  const topSKURows = useMemo<ReturnType<typeof getTopSKUsInScope>>(() => {
    if (hasPrecomputed) return precomp!.sku_tables[state.horizon] as ReturnType<typeof getTopSKUsInScope> ?? [];
    return getTopSKUsInScope(payload.daily_forecast_points, skuMap, skuIdSet, storeIdSet, state.horizon, 10);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPrecomputed, precomp, state.horizon, payload.daily_forecast_points, skuMap, skuIdSet, storeIdSet]);

  const drillRows = useMemo(
    () => selectedSubcategory
      ? topSKURows.filter(r => r.sku.subcategory === selectedSubcategory)
      : topSKURows,
    [topSKURows, selectedSubcategory],
  );

  const chartData = breakdown === 'subcategory' ? subcatAgg.chartData : topSKUAgg.chartData;
  const series = breakdown === 'subcategory' ? subcatAgg.subcategories : topSKUAgg.skuIds;
  const seriesNames = breakdown === 'skus' ? topSKUAgg.skuNames : undefined;

  const visibleEvents = useMemo(() => {
    const cs = chartData[0]?.date as string | undefined;
    const ce = chartData[chartData.length - 1]?.date as string | undefined;
    if (!cs || !ce) return [];
    const sigOrder = { high: 0, medium: 1, low: 2 } as const;
    return payload.events
      .filter(e => e.window_start <= ce && e.window_end >= cs)
      .sort((a, b) => sigOrder[a.cultural_significance] - sigOrder[b.cultural_significance])
      .slice(0, 3);
  }, [payload.events, chartData]);

  const handleSubcatClick = useCallback((sub: string) => {
    setSelectedSubcategory(prev => (prev === sub ? null : sub));
  }, []);

  const handleBreakdown = useCallback((opt: 'subcategory' | 'skus') => {
    setBreakdown(opt);
    setSelectedSubcategory(null);
  }, []);

  const handleSKUSelect = useCallback((id: string | null) => {
    setSelectedSKUId(id);
  }, []);

  const isEmpty = skuIdSet.size === 0 || storeIdSet.size === 0;

  return (
    <section className="card p-0 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-default)]">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Forecast Explorer</h2>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            {filteredSKUs.length} SKUs · {filteredStores.length} stores
            {selectedSubcategory ? ` · ${selectedSubcategory}` : ''}
          </p>
        </div>

        <div className="flex items-center border border-[var(--border-default)] rounded-md overflow-hidden">
          {(['subcategory', 'skus'] as const).map((opt, i) => (
            <button
              key={opt}
              type="button"
              onClick={() => handleBreakdown(opt)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors${i > 0 ? ' border-l border-[var(--border-default)]' : ''} ${
                breakdown === opt
                  ? 'bg-[var(--accent-primary-light)] text-[var(--accent-primary)]'
                  : 'bg-white text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              {opt === 'subcategory' ? 'By subcategory' : 'By top SKUs'}
            </button>
          ))}
        </div>
      </div>

      {isEmpty ? (
        <div className="flex items-center justify-center py-16 text-sm text-[var(--text-tertiary)]">
          No data for current filter scope — try broadening the filters
        </div>
      ) : (
        <div className="grid grid-cols-5 divide-x divide-[var(--border-default)]">
          {/* Left pane — 60% */}
          <div className="col-span-3 p-5">
            <MerchCategoryTimeline
              chartData={chartData}
              series={series}
              seriesNames={seriesNames}
              events={visibleEvents}
              salaryWeekDays={INDIA_V1.cultural_patterns.salary_week_days}
              forecastStart={payload.data_window.forecast_start}
              horizon={state.horizon}
              selectedSubcategory={selectedSubcategory}
              onSubcategoryClick={breakdown === 'subcategory' ? handleSubcatClick : undefined}
            />
          </div>

          {/* Right pane — 40% */}
          <div className="col-span-2 p-5">
            <MerchSKUDrillPanel
              rows={drillRows}
              horizon={state.horizon}
              selectedSKUId={selectedSKUId}
              onSKUSelect={handleSKUSelect}
              payload={payload}
              filters={state}
            />
          </div>
        </div>
      )}
    </section>
  );
}
