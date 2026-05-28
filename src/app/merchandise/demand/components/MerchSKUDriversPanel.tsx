'use client';

import type { MerchDemandDriverContribution } from '@/app/lib/merch-demand-types';

interface Props {
  drivers: MerchDemandDriverContribution[];
}

export default function MerchSKUDriversPanel({ drivers }: Props) {
  if (!drivers.length) {
    return (
      <div className="text-xs text-[var(--text-tertiary)] py-4 text-center">
        No driver data available
      </div>
    );
  }

  const maxAbs = Math.max(...drivers.map(d => Math.abs(d.contribution_pct)), 1);

  return (
    <div>
      <p className="text-xs font-medium text-[var(--text-primary)] mb-2">Top Demand Drivers</p>
      <div className="space-y-2">
        {drivers.slice(0, 5).map(d => {
          const barPct = (Math.abs(d.contribution_pct) / maxAbs) * 100;
          const isPositive = d.direction === 'positive';
          return (
            <div key={d.feature}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-[var(--text-secondary)] truncate mr-2 leading-tight">
                  {d.display_name}
                </span>
                <span
                  className={`text-[10px] font-semibold tabular-nums flex-shrink-0 ${
                    isPositive ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {isPositive ? '+' : ''}{d.contribution_pct.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isPositive ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
