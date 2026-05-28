'use client';

import React, { useState, useEffect } from 'react';
import type { ColdstartPayload } from '@/app/lib/coldstart-types';
import { fetchColdstartPayload } from '@/app/lib/coldstart-data-loader';
import { ColdstartFilterProvider } from './ColdstartFilterContext';
import ColdstartFilterBar from './components/ColdstartFilterBar';
import ColdstartKPIStrip from './components/ColdstartKPIStrip';
import ColdstartInsightsStrip from './components/ColdstartInsightsStrip';
import ColdstartModelComparison from './components/ColdstartModelComparison';
import ColdstartMAPEOverTime from './components/ColdstartMAPEOverTime';
import ColdstartAnalogCityMap from './components/ColdstartAnalogCityMap';
import ColdstartAnalogWaterfall from './components/ColdstartAnalogWaterfall';
import ColdstartHeatmap from './components/ColdstartHeatmap';
import ColdstartHeroSKUSelector from './components/ColdstartHeroSKUSelector';
import ColdstartPredictionDecomposition from './components/ColdstartPredictionDecomposition';
import ColdstartSKUDrill from './components/ColdstartSKUDrill';
import ColdstartAdaptationCurve from './components/ColdstartAdaptationCurve';
import ColdstartFestivalRamp from './components/ColdstartFestivalRamp';
import ColdstartSKUHoldoutTable from './components/ColdstartSKUHoldoutTable';
import ColdstartMethodology from './components/ColdstartMethodology';
import ColdstartCostOfMAPE from './components/ColdstartCostOfMAPE';
import ColdstartExternalSignals from './components/ColdstartExternalSignals';
import ColdstartWeatherSensitivity from './components/ColdstartWeatherSensitivity';
import LastUpdated from '@/app/components/ui/LastUpdated';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; payload: ColdstartPayload };

export default function ColdstartShell() {
  const [state, setState] = useState<State>({ status: 'loading' });

  async function load() {
    setState({ status: 'loading' });
    try {
      const payload = await fetchColdstartPayload();
      setState({ status: 'ready', payload });
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  useEffect(() => { load(); }, []);

  if (state.status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[var(--text-secondary)]">Loading cold-start data…</span>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="card max-w-md w-full text-center p-8">
          <p className="text-[var(--text-primary)] font-medium mb-2">Failed to load cold-start data</p>
          <p className="text-xs text-[var(--text-secondary)] mb-4">{state.message}</p>
          <p className="text-xs text-[var(--text-tertiary)] mb-6 font-mono">
            npm run gen:coldstart-data
          </p>
          <button onClick={load} className="btn-primary text-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { payload } = state;

  return (
    <ColdstartFilterProvider>
      <ColdstartFilterBar onRefresh={load} />

      <div className="px-6 py-6 space-y-6">
        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">
              Cold-Start Demand Forecasting
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Lucknow new-store launch · {payload.target_city.tier} · 90-day holdout window · Jan 2024
            </p>
          </div>
          <LastUpdated timestamp={new Date(payload.generated_at)} />
        </div>

        {/* KPI strip */}
        <ColdstartKPIStrip kpis={payload.kpis} />

        {/* Insights strip */}
        <ColdstartInsightsStrip />

        {/* Section: Cost of MAPE */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 uppercase tracking-wide">
            Business Case
          </h2>
          <ColdstartCostOfMAPE data={payload.cost_of_mape} />
        </div>

        {/* Section: Model Comparison */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 uppercase tracking-wide">
            Model Iterations
          </h2>
          <ColdstartModelComparison variants={payload.model_variants} />
        </div>

        {/* Section: MAPE Over Time */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 uppercase tracking-wide">
            Accuracy Over Time
          </h2>
          <ColdstartMAPEOverTime
            data={payload.mape_over_time}
            convergenceDay={payload.kpis.convergence_day}
          />
        </div>

        {/* Section: SKU Depth Analysis (Sprint 5) */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 uppercase tracking-wide">
            SKU Depth Analysis
          </h2>
          <div className="space-y-4">
            {/* Hero SKU selector — controls all charts in this section */}
            <ColdstartHeroSKUSelector heroSKUs={payload.hero_skus} />

            {/* Prediction decomposition */}
            <ColdstartPredictionDecomposition data={payload.prediction_decomposition} />

            {/* SKU drill-down */}
            <ColdstartSKUDrill series={payload.sku_drill_series} />
          </div>
        </div>

        {/* Section: Adaptation Curve */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 uppercase tracking-wide">
            Adaptation Curve
          </h2>
          <ColdstartAdaptationCurve data={payload.adaptation_curve} />
        </div>

        {/* Section: Festival Intelligence */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 uppercase tracking-wide">
            Festival Intelligence
          </h2>
          <ColdstartFestivalRamp patterns={payload.festival_category_patterns} />
        </div>

        {/* Section: Analog City Selection */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 uppercase tracking-wide">
            Analog City Selection
          </h2>
          <ColdstartAnalogCityMap
            analogs={payload.analog_cities}
            target={payload.target_city}
          />
        </div>

        {/* Section: Analog Contribution Waterfall (Sprint 7b) */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 uppercase tracking-wide">
            Analog Contribution Breakdown
          </h2>
          <ColdstartAnalogWaterfall data={payload.analog_waterfall} />
        </div>

        {/* Section: Weather Sensitivity & Climate Risk (Sprint 7a) */}
        <ColdstartWeatherSensitivity
          temperatureElasticity={payload.weather_temperature_elasticity}
          monsoonImpact={payload.weather_monsoon_impact}
          monsoonCalendar={payload.weather_monsoon_calendar}
          monsoonRecommendation={payload.weather_monsoon_recommendation}
          storeRisk={payload.weather_store_risk}
          signalInputs={payload.weather_signal_inputs}
        />

        {/* Section: Heatmap */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 uppercase tracking-wide">
            Category × Store Type Heatmap
          </h2>
          <ColdstartHeatmap cells={payload.heatmap_cells} />
        </div>

        {/* Section: SKU Holdout Results */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 uppercase tracking-wide">
            SKU Holdout Results
          </h2>
          <ColdstartSKUHoldoutTable holdouts={payload.sku_holdouts} />
        </div>

        {/* Section: External Signals */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 uppercase tracking-wide">
            External Signal Inventory
          </h2>
          <ColdstartExternalSignals
            signals={payload.external_signals}
            integration={payload.signal_integration}
          />
        </div>

        {/* Section: Methodology */}
        <ColdstartMethodology methodology={payload.methodology} />
      </div>
    </ColdstartFilterProvider>
  );
}
