'use client';

import type { StoreOpeningHeader as HeaderT } from '@/app/lib/store-opening-types';

interface Props { header: HeaderT; }

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{label}</span>
      <span className="text-sm font-medium text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

export default function StoreOpeningHeader({ header }: Props) {
  return (
    <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
      {/* Left: badge + title */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-md bg-[var(--accent-primary)] text-white flex items-center justify-center text-sm font-semibold">
          5
        </div>
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Store Opening Forecast</h1>
          <p className="text-sm text-[var(--text-secondary)]">New-store cold start · Merchandise & Inventory Planning</p>
        </div>
      </div>

      {/* Right: 3 info cells + model run chip */}
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-6 px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)]">
          <InfoCell label="STORE" value={header.store_name} />
          <div className="w-px h-8 bg-[var(--border-default)]" />
          <InfoCell label="FORMAT" value={header.format} />
          <div className="w-px h-8 bg-[var(--border-default)]" />
          <InfoCell label="GRAND OPENING" value={header.grand_opening_label} />
        </div>
        <span className="text-[11px] px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">
          {header.model_run_label}
        </span>
      </div>
    </div>
  );
}
