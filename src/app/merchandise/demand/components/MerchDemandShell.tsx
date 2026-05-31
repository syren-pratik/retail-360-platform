'use client';

import { useEffect, useState } from 'react';
import { MerchFilterProvider } from '../MerchFilterContext';
import { fetchMerchDemandPayload } from '@/app/lib/merch-data-loader';
import type { MerchDemandFullPayload } from '@/app/lib/merch-demand-types';
import { formatDate } from '@/app/lib/merch-format';
import MerchTopFilterBar from './MerchTopFilterBar';
import MerchActiveFilterChips from './MerchActiveFilterChips';
import MerchKPIStrip from './MerchKPIStrip';
import MerchInsightsStrip from './MerchInsightsStrip';
import MerchExceptionCenter from './MerchExceptionCenter';
import MerchForecastExplorer from './MerchForecastExplorer';
import MerchEventIntelligence from './MerchEventIntelligence';
import MerchPlanVsActual from './MerchPlanVsActual';
import MerchAccuracyDashboard from './MerchAccuracyDashboard';

export default function MerchDemandShell() {
  const [payload, setPayload] = useState<MerchDemandFullPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMerchDemandPayload()
      .then((data) => {
        setPayload(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">Loading demand intelligence...</p>
        </div>
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)]">
        <div className="card max-w-md w-full text-center p-8">
          <p className="text-sm text-rose-600 mb-3">{error ?? 'Failed to load demand data'}</p>
          <p className="text-xs text-[var(--text-tertiary)] mb-4">
            Run <code className="font-mono bg-[var(--bg-secondary)] px-1 rounded">npm run gen:merch-demand</code> to generate cache data
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[var(--accent-primary)] text-white rounded-md text-sm hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const precomputed = payload.precomputed ?? null;

  return (
    <MerchFilterProvider>
      <div className="min-h-screen bg-[var(--bg-primary)]">
        {/* Sticky top section */}
        <MerchTopFilterBar stores={payload.stores} generatedAt={payload.generated_at} />
        <MerchActiveFilterChips />

        {/* Page content */}
        <div className="px-8 py-6 space-y-6">
          {/* Page header */}
          <header className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
                Merchandise Demand
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Category-level demand intelligence · India · {payload.skus.length} SKUs · {payload.stores.length} stores
              </p>
            </div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              Updated {formatDate(payload.generated_at)}
            </div>
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
        </div>
      </div>
    </MerchFilterProvider>
  );
}
