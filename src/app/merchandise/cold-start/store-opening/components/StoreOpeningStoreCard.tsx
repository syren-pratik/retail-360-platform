'use client';

import type { StoreOpeningHeader as HeaderT } from '@/app/lib/store-opening-types';

interface Props { header: HeaderT; }

export default function StoreOpeningStoreCard({ header }: Props) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-slate-800 text-slate-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-slate-700 text-white flex items-center justify-center text-xs font-semibold">
            5
          </div>
          <div>
            <div className="text-sm font-semibold">Hazratganj — Lucknow, UP</div>
            <div className="text-[11px] text-slate-300">{header.trade_area_label}</div>
          </div>
        </div>
        <div className="text-[10px] font-mono text-slate-400">STORE {header.store_id}</div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {header.chips.map((chip) => (
          <span
            key={chip}
            className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200"
          >
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}
