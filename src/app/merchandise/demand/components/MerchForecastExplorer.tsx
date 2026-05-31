'use client';

import { useCallback, useState } from 'react';
import { useMerchFilters } from '../MerchFilterContext';
import type { MerchDemandFullPayload, MerchDemandPrecomputedHorizon } from '@/app/lib/merch-demand-types';
import { fetchMerchDemandSKU } from '@/app/lib/merch-data-loader';
import type { MerchSKUDetailData } from '@/app/lib/merch-data-loader';
import MerchCategoryTimeline from './MerchCategoryTimeline';
import MerchSKUDrillPanel from './MerchSKUDrillPanel';
import MerchExpandModal from './MerchExpandModal';

interface Props {
  core: MerchDemandFullPayload;
  precomputed: MerchDemandFullPayload['precomputed'] | null;
}

export default function MerchForecastExplorer({ core, precomputed }: Props) {
  const { state } = useMerchFilters();
  const [breakdownMode, setBreakdownMode] = useState<'subcategory' | 'topSKUs'>('subcategory');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedSKUId, setSelectedSKUId] = useState<string | null>(null);
  const [skuDetailData, setSkuDetailData] = useState<MerchSKUDetailData | null>(null);
  const [skuDetailLoading, setSkuDetailLoading] = useState(false);
  const [forecastExpanded, setForecastExpanded] = useState(false);

  const deptKey = state.department || 'all';
  const horizonKey = String(state.horizon);
  const precomp: MerchDemandPrecomputedHorizon | null =
    precomputed?.departments?.[deptKey]?.[horizonKey] ?? null;

  const anchorDate = core.data_window.forecast_start;

  const handleSubcategoryClick = useCallback((sub: string | null) => {
    setSelectedSubcategory(sub);
  }, []);

  const handleSKUSelect = useCallback(async (id: string | null) => {
    if (!id) {
      setSelectedSKUId(null);
      setSkuDetailData(null);
      return;
    }
    setSelectedSKUId(id);
    setSkuDetailLoading(true);
    try {
      const data = await fetchMerchDemandSKU(id);
      setSkuDetailData(data);
    } catch {
      // SKU detail fetch failed — still show the view using core data
    } finally {
      setSkuDetailLoading(false);
    }
  }, []);

  const handleBreakdownChange = useCallback((mode: 'subcategory' | 'topSKUs') => {
    setBreakdownMode(mode);
    setSelectedSubcategory(null);
  }, []);

  return (
    <>
      <section className="card p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-default)]">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Forecast Explorer</h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              {core.skus.length} SKUs · {core.stores.length} stores
              {selectedSubcategory ? ` · ${selectedSubcategory}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center border border-[var(--border-default)] rounded-md overflow-hidden">
              {(['subcategory', 'topSKUs'] as const).map((mode, i) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleBreakdownChange(mode)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors${i > 0 ? ' border-l border-[var(--border-default)]' : ''} ${
                    breakdownMode === mode
                      ? 'bg-[var(--accent-primary-light)] text-[var(--accent-primary)]'
                      : 'bg-white text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  {mode === 'subcategory' ? 'By subcategory' : 'By top SKUs'}
                </button>
              ))}
            </div>
            <button
              onClick={() => setForecastExpanded(true)}
              className="p-1.5 rounded-md hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors"
              title="Expand chart"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8V3h5M13 8v5H8M10 3h3v3M6 13H3v-3" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-5 divide-x divide-[var(--border-default)]">
          {/* Left pane — 60% */}
          <div className="col-span-3 p-5">
            <MerchCategoryTimeline
              precomp={precomp}
              breakdownMode={breakdownMode}
              selectedSubcategory={selectedSubcategory}
              onSubcategoryClick={handleSubcategoryClick}
              horizon={state.horizon}
              anchorDate={anchorDate}
            />
          </div>

          {/* Right pane — 40% */}
          <div className="col-span-2 p-5">
            <MerchSKUDrillPanel
              precomp={precomp}
              core={core}
              selectedSubcategory={selectedSubcategory}
              selectedSKUId={selectedSKUId}
              skuDetailData={skuDetailData}
              skuDetailLoading={skuDetailLoading}
              onSKUSelect={handleSKUSelect}
              horizon={state.horizon}
            />
          </div>
        </div>
      </section>

      <MerchExpandModal
        isOpen={forecastExpanded}
        onClose={() => setForecastExpanded(false)}
        title="Forecast Explorer — Category Timeline"
        subtitle={`${state.horizon}d horizon · ${deptKey === 'all' ? 'All departments' : deptKey}`}
      >
        <MerchCategoryTimeline
          precomp={precomp}
          breakdownMode={breakdownMode}
          selectedSubcategory={selectedSubcategory}
          onSubcategoryClick={handleSubcategoryClick}
          horizon={state.horizon}
          anchorDate={anchorDate}
          expanded
        />
      </MerchExpandModal>
    </>
  );
}
