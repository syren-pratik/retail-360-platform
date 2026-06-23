'use client';

import { useEffect, useState, Suspense } from 'react';
import { fetchMerchDemandPayload } from '@/app/lib/merch-data-loader';
import type { MerchDemandFullPayload } from '@/app/lib/merch-demand-types';
import ForecastDeepDive from '../forecast/ForecastDeepDive';
import EventsDeepDive from '../events/EventsDeepDive';
import ExceptionsDeepDive from '../exceptions/ExceptionsDeepDive';
import PlanDeepDive from '../plan/PlanDeepDive';
import AccuracyDeepDive from '../accuracy/AccuracyDeepDive';

interface Props {
  section: string;
}

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; payload: MerchDemandFullPayload };

export default function DeepDiveShell({ section }: Props) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    fetchMerchDemandPayload()
      .then((payload) => setState({ status: 'ready', payload }))
      .catch((err) => setState({ status: 'error', message: String(err?.message ?? err) }));
  }, []);

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[var(--border-default)] border-t-[var(--accent-primary)] rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-secondary)]">Loading deep dive data…</p>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <div className="card max-w-md w-full text-center p-8">
          <p className="text-sm text-rose-600 mb-3">{state.message}</p>
          <button onClick={() => window.location.reload()} className="btn-primary text-sm">Retry</button>
        </div>
      </div>
    );
  }

  const { payload } = state;
  const precomputed = payload.precomputed ?? null;

  switch (section) {
    case 'forecast':
      return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-[var(--border-default)] border-t-[var(--accent-primary)] rounded-full animate-spin" /></div>}>
          <ForecastDeepDive core={payload} precomputed={precomputed} />
        </Suspense>
      );
    case 'exceptions':
      return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-[var(--border-default)] border-t-[var(--accent-primary)] rounded-full animate-spin" /></div>}>
          <ExceptionsDeepDive core={payload} />
        </Suspense>
      );
    case 'events':
      return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-[var(--border-default)] border-t-[var(--accent-primary)] rounded-full animate-spin" /></div>}>
          <EventsDeepDive core={payload} />
        </Suspense>
      );
    case 'plan':
      return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-[var(--border-default)] border-t-[var(--accent-primary)] rounded-full animate-spin" /></div>}>
          <PlanDeepDive core={payload} />
        </Suspense>
      );
    case 'accuracy':
      return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-[var(--border-default)] border-t-[var(--accent-primary)] rounded-full animate-spin" /></div>}>
          <AccuracyDeepDive core={payload} />
        </Suspense>
      );
    default:
      return (
        <div className="p-8 text-center text-rose-500">
          Unknown section: {section}
        </div>
      );
  }
}
