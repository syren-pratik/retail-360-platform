'use client';

import { useState, useEffect } from 'react';
import { fetchMerchDemandPayload } from '@/app/lib/merch-data-loader';
import type { MerchDemandFullPayload } from '@/app/lib/merch-demand-types';
import { MerchFilterProvider } from './MerchFilterContext';
import MerchTopFilterBar from './components/MerchTopFilterBar';
import MerchActiveFilterChips from './components/MerchActiveFilterChips';
import MerchKPIStrip from './components/MerchKPIStrip';
import MerchInsightsStrip from './components/MerchInsightsStrip';
import MerchForecastExplorer from './components/MerchForecastExplorer';
import LastUpdated from '@/app/components/ui/LastUpdated';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; payload: MerchDemandFullPayload };

export default function MerchDemandShell() {
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = () => {
    setState({ status: 'loading' });
    fetchMerchDemandPayload()
      .then(payload => setState({ status: 'ready', payload }))
      .catch(err => setState({ status: 'error', message: String(err?.message ?? err) }));
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

  return (
    <MerchFilterProvider>
      <div className="min-h-screen">
        <MerchTopFilterBar
          stores={payload.stores}
          generatedAt={payload.generated_at}
        />
        <MerchActiveFilterChips />

        <div className="px-8 py-6 space-y-6">
          {/* Page header */}
          <header className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
                Merchandise Demand
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Category-level demand intelligence for India
              </p>
            </div>
            <LastUpdated timestamp={new Date(payload.generated_at)} />
          </header>

          <MerchKPIStrip kpis={payload.kpis} />

          <MerchInsightsStrip />

          <MerchForecastExplorer payload={payload} />

          {/* Placeholder for Sprints 3–6 */}
          <section className="card p-8 text-center">
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              Sprints 3–6: SKU Detail + What-if, Action Center, Plan vs Actual, All SKUs, Model Performance.
            </p>
          </section>
        </div>
      </div>
    </MerchFilterProvider>
  );
}
