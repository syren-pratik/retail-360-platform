'use client';

import type { PriceIntelReturnsMarginOverlay as Overlay } from '@/app/lib/price-intel-types';

interface Props {
  overlay: Overlay;
}

export default function PriceIntelReturnsMarginOverlay({ overlay }: Props) {
  const maxGM = Math.max(...overlay.by_department.map((d) => d.gross_margin_pct), 1);
  return (
    <div className="card p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Returns-Adjusted Gross Margin
        </h3>
        <p className="text-xs text-[var(--text-secondary)]">
          Gross margin minus returns cost = RAGM
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
          <div className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wide">
            Gross Margin
          </div>
          <div className="mt-1 text-xl font-semibold text-emerald-600">
            {overlay.gross_margin_pct}%
          </div>
        </div>
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
          <div className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wide">
            Returns Cost
          </div>
          <div className="mt-1 text-xl font-semibold text-rose-600">
            −{overlay.returns_cost_pct}%
          </div>
          <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
            {overlay.returns_rate_pct}% return rate
          </div>
        </div>
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
          <div className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wide">
            RAGM
          </div>
          <div className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
            {overlay.ragm_pct}%
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {overlay.by_department.map((d) => {
          const widthScale = 100 / maxGM;
          const ragmW = Math.max(0, d.ragm_pct) * widthScale;
          const returnsW = Math.max(0, d.gross_margin_pct - d.ragm_pct) * widthScale;
          return (
            <div key={d.department} className="flex items-center gap-3">
              <div className="w-24 text-xs text-[var(--text-secondary)]">{d.department}</div>
              <div className="flex-1 h-5 rounded bg-[var(--bg-secondary)] overflow-hidden flex">
                <div
                  className="h-full bg-emerald-700"
                  style={{ width: `${ragmW}%` }}
                  title={`RAGM ${d.ragm_pct}%`}
                />
                <div
                  className="h-full bg-rose-400"
                  style={{ width: `${returnsW}%` }}
                  title={`Returns drag ${(d.gross_margin_pct - d.ragm_pct).toFixed(1)}pp`}
                />
              </div>
              <div className="w-32 text-[11px] text-[var(--text-tertiary)] text-right">
                GM {d.gross_margin_pct}% · RAGM {d.ragm_pct}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
