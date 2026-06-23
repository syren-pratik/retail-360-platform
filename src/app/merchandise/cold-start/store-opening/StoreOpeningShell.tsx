'use client';

import { useEffect, useState } from 'react';
import type { StoreOpeningPayload } from '@/app/lib/store-opening-types';
import StoreOpeningHeader from './components/StoreOpeningHeader';
import StoreOpeningKPIStrip from './components/StoreOpeningKPIStrip';
import StoreOpeningSalesRamp from './components/StoreOpeningSalesRamp';
import StoreOpeningComparableStores from './components/StoreOpeningComparableStores';
import StoreOpeningMarketDrivers from './components/StoreOpeningMarketDrivers';
import StoreOpeningDepartmentForecast from './components/StoreOpeningDepartmentForecast';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; payload: StoreOpeningPayload };

export default function StoreOpeningShell() {
  const [state, setState] = useState<State>({ status: 'loading' });

  async function load() {
    setState({ status: 'loading' });
    try {
      const res = await fetch('/api/store-opening');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as StoreOpeningPayload;
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
          <span className="text-sm text-[var(--text-secondary)]">Loading store-opening forecast…</span>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="card max-w-md w-full text-center p-8">
          <p className="text-[var(--text-primary)] font-medium mb-2">Failed to load forecast</p>
          <p className="text-xs text-[var(--text-secondary)] mb-4">{state.message}</p>
          <p className="text-xs text-[var(--text-tertiary)] mb-6 font-mono">npm run gen:store-opening</p>
          <button onClick={load} className="btn-primary text-sm">Retry</button>
        </div>
      </div>
    );
  }

  const { payload } = state;

  return (
    <div className="p-6 space-y-5">
      <StoreOpeningHeader header={payload.header} />
      <StoreOpeningKPIStrip kpis={payload.kpis} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2">
          <StoreOpeningSalesRamp ramp={payload.ramp} header={payload.header} />
        </div>
        <div className="xl:col-span-1">
          <StoreOpeningComparableStores comparables={payload.comparables} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <StoreOpeningMarketDrivers drivers={payload.drivers} />
        <StoreOpeningDepartmentForecast departments={payload.departments} />
      </div>

      <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] pt-2 border-t border-[var(--border-default)]">
        <span>{payload.footer_left}</span>
        <span>{payload.footer_right}</span>
      </div>
    </div>
  );
}
