'use client';

import React from 'react';
import type { ColdstartHeroSKU } from '@/app/lib/coldstart-types';
import { useColdstartFilters } from '../ColdstartFilterContext';

interface Props {
  heroSKUs: ColdstartHeroSKU[];
}

const QUICK_DAYS = [1, 15, 30, 60, 90];

export default function ColdstartHeroSKUSelector({ heroSKUs }: Props) {
  const { filters, dispatch } = useColdstartFilters();

  const selectedSKU = heroSKUs.find((s) => s.sku_id === filters.selected_sku_id) ?? heroSKUs[0];
  const alpha = (filters.selected_day_num / 90).toFixed(2);

  return (
    <div className="card flex flex-wrap items-center gap-4 py-3 px-4">
      {/* SKU selector */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs text-[var(--text-secondary)] shrink-0">SKU</span>
        <select
          value={filters.selected_sku_id}
          onChange={(e) => dispatch({ type: 'SET_SELECTED_SKU', payload: e.target.value })}
          className="text-xs font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-md px-2 py-1.5 min-w-[220px] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
        >
          {heroSKUs.map((s) => (
            <option key={s.sku_id} value={s.sku_id}>
              {s.sku_id} · {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Category + store type badges */}
      {selectedSKU && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
            {selectedSKU.category}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
            {selectedSKU.store_type}
          </span>
        </div>
      )}

      {/* Day slider */}
      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
        <span className="text-xs text-[var(--text-secondary)] shrink-0">Day</span>
        <input
          type="range"
          min={1}
          max={90}
          step={1}
          value={filters.selected_day_num}
          onChange={(e) => dispatch({ type: 'SET_SELECTED_DAY', payload: Number(e.target.value) })}
          className="flex-1 h-1.5 accent-[var(--accent-primary)]"
        />
        <span className="text-xs font-mono font-semibold text-[var(--text-primary)] w-8 text-right">
          D{filters.selected_day_num}
        </span>
      </div>

      {/* Quick day buttons */}
      <div className="flex items-center gap-1">
        {QUICK_DAYS.map((d) => (
          <button
            key={d}
            onClick={() => dispatch({ type: 'SET_SELECTED_DAY', payload: d })}
            className={`text-[10px] px-2 py-1 rounded font-medium transition-colors ${
              filters.selected_day_num === d
                ? 'bg-[var(--accent-primary)] text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            D{d}
          </button>
        ))}
      </div>

      {/* Alpha chip */}
      <div className="flex items-center gap-1.5 ml-auto">
        <span className="text-xs text-[var(--text-secondary)]">α =</span>
        <span className="text-xs font-mono font-bold text-[var(--accent-primary)] bg-blue-50 px-2 py-0.5 rounded">
          {alpha}
        </span>
        <span className="text-[10px] text-[var(--text-tertiary)]">
          ({alpha === '1.00' ? '100% local' : alpha === '0.01' ? '~100% analog' : `${Math.round(Number(alpha) * 100)}% local`})
        </span>
      </div>
    </div>
  );
}
