'use client';

import { useState, useEffect } from 'react';
import { fetchMerchDemandPayload } from '@/app/lib/merch-data-loader';
import type { MerchDemandFullPayload } from '@/app/lib/merch-demand-types';
import { MerchFilterProvider } from './MerchFilterContext';
import MerchTopFilterBar from './components/MerchTopFilterBar';
import MerchActiveFilterChips from './components/MerchActiveFilterChips';
import MerchKPIStrip from './components/MerchKPIStrip';
import MerchInsightsStrip from './components/MerchInsightsStrip';
import MerchExceptionCenter from './components/MerchExceptionCenter';
import MerchForecastExplorer from './components/MerchForecastExplorer';
import MerchEventIntelligence from './components/MerchEventIntelligence';
import MerchPlanVsActual from './components/MerchPlanVsActual';
import MerchAccuracyDashboard from './components/MerchAccuracyDashboard';
import MerchSizeCurveForecast from './components/MerchSizeCurveForecast';
import MerchWeatherDrivenDemand from './components/MerchWeatherDrivenDemand';
import MerchBrandVsPLForecastMix from './components/MerchBrandVsPLForecastMix';
import MerchReturnsAdjustedSellThrough from './components/MerchReturnsAdjustedSellThrough';
import LastUpdated from '@/app/components/ui/LastUpdated';
import { useTenant } from '@/app/context/TenantContext';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; payload: MerchDemandFullPayload };

interface ApparelPrecomputed {
  size_curve_grid?: {
    style_id: string;
    style_name: string;
    sizes: string[];
    forecast_units_per_size: number[];
    actual_units_per_size: number[];
    broken_size_flags: boolean[];
  }[];
  weather_overlay_strip?: {
    date: string;
    temp_anom_f: number;
    precip_anom_in: number;
    demand_adj_pct: number;
  }[];
  brand_vs_pl_forecast_mix?: {
    department: string;
    weeks: number[];
    brand_share_pct: number[];
    pl_share_pct: number[];
  }[];
  returns_adjusted_sell_through?: {
    department: string;
    gross_st_pct: number[];
    net_st_pct: number[];
    delta_pp: number[];
  }[];
}

export default function MerchDemandShell() {
  const { isApparel } = useTenant();
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = () => {
    setState({ status: 'loading' });
    fetchMerchDemandPayload()
      .then((payload) => setState({ status: 'ready', payload }))
      .catch((err) => setState({ status: 'error', message: String(err?.message ?? err) }));
  };

  useEffect(() => { load(); }, []);

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[var(--border-default)] border-t-[var(--accent-primary)] rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-secondary)]">Loading merchandise data…</p>
          <p className="text-xs text-[var(--text-tertiary)]">Assembling forecast shards — this may take a few seconds</p>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <div className="card max-w-md w-full">
          <h2 className="text-base font-semibold text-red-600 mb-2">Failed to load</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4 break-words">{state.message}</p>
          <p className="text-xs text-[var(--text-tertiary)] mb-4">
            Make sure the cache exists:{' '}
            <code className="bg-[var(--bg-tertiary)] px-1 rounded font-mono">npm run gen:merch-demand</code>
          </p>
          <button onClick={load} className="btn-primary text-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { payload } = state;
  const precomputed = payload.precomputed ?? null;

  return (
    <MerchFilterProvider>
      <div className="min-h-screen">
        <MerchTopFilterBar stores={payload.stores} generatedAt={payload.generated_at} />
        <MerchActiveFilterChips />

        <div className="px-8 py-6 space-y-6">
          {/* Page header */}
          <header className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
                Merchandise Demand
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Category-level demand intelligence · {isApparel ? 'US Apparel' : 'India'} · {payload.skus.length} SKUs · {payload.stores.length} stores
              </p>
            </div>
            <LastUpdated timestamp={new Date(payload.generated_at)} />
          </header>

          {/* Layer 1: Executive Summary */}
          <MerchKPIStrip kpis={payload.kpis} />
          <MerchInsightsStrip />

          {/* Layer 2: Operational Dashboard */}
          <MerchExceptionCenter core={payload} />
          <MerchForecastExplorer core={payload} precomputed={precomputed} />
          <MerchEventIntelligence core={payload} />
          <MerchPlanVsActual core={payload} />

          {/* Layer 3: Model Intelligence */}
          <MerchAccuracyDashboard core={payload} />

          {isApparel && precomputed && (() => {
            const ap = precomputed as unknown as ApparelPrecomputed;
            if (!ap.size_curve_grid?.length && !ap.brand_vs_pl_forecast_mix?.length) return null;
            return (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">Apparel Demand Signals</h2>
                    <p className="text-xs text-[var(--text-secondary)]">Size-curve · weather overlay · brand vs PL · returns-adjusted</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {ap.size_curve_grid?.[0] && <MerchSizeCurveForecast grid={ap.size_curve_grid[0]} />}
                  {ap.weather_overlay_strip && <MerchWeatherDrivenDemand strip={ap.weather_overlay_strip} />}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {ap.brand_vs_pl_forecast_mix && <MerchBrandVsPLForecastMix rows={ap.brand_vs_pl_forecast_mix} />}
                  {ap.returns_adjusted_sell_through && <MerchReturnsAdjustedSellThrough rows={ap.returns_adjusted_sell_through} />}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </MerchFilterProvider>
  );
}
