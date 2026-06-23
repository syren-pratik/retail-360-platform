'use client';

import type { StoreOpeningKPI } from '@/app/lib/store-opening-types';

interface Props { kpis: StoreOpeningKPI[]; }

const DOT_COLOR: Record<string, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  slate: 'bg-slate-400',
};

const TONE_TEXT: Record<string, string> = {
  positive: 'text-emerald-600',
  warning: 'text-amber-600',
  neutral: 'text-[var(--text-primary)]',
};

export default function StoreOpeningKPIStrip({ kpis }: Props) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {kpis.map((kpi) => (
        <div key={kpi.id} className="card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            {kpi.label}
          </div>
          <div className={`mt-1 text-2xl font-semibold ${TONE_TEXT[kpi.tone ?? 'neutral']}`}>
            {kpi.value}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            {kpi.dot && (
              <span className={`inline-block w-2 h-2 rounded-full ${DOT_COLOR[kpi.dot]}`} />
            )}
            <span>{kpi.sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
