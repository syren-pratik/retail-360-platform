'use client';

import React, { useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useColdstartFilters, ModelFilter, HorizonFilter, StoreTypeFilter } from '../ColdstartFilterContext';

const MODEL_OPTIONS: { value: ModelFilter; label: string }[] = [
  { value: 'all',            label: 'All Models' },
  { value: 'naive_baseline', label: 'Naive Baseline' },
  { value: 'original_analog',label: 'Original Analog' },
  { value: 'fix1_store_type',label: 'Fix 1: Store Type' },
  { value: 'fix2_blending',  label: 'Fix 2: Blending (Champion)' },
  { value: 'fix3_festival',  label: 'Fix 3: Festival' },
  { value: 'all_3_combined', label: 'All 3 Combined' },
];

const HORIZON_OPTIONS: { value: HorizonFilter; label: string }[] = [
  { value: 'full',   label: 'Full 90 Days' },
  { value: 'week1',  label: 'Week 1' },
  { value: 'month1', label: 'Month 1' },
  { value: 'month2', label: 'Month 2' },
  { value: 'month3', label: 'Month 3' },
];

const CATEGORY_OPTIONS = [
  'all',
  'Coffee', 'Dal & Pulses', 'Chips & Namkeen', 'Paneer', 'Edible Oil',
  'Curd & Yogurt', 'Butter & Ghee', 'Energy Drinks', 'Tea', 'Rice',
];

const STORE_TYPE_OPTIONS: { value: StoreTypeFilter; label: string }[] = [
  { value: 'all',          label: 'All Store Types' },
  { value: 'Express',      label: 'Express' },
  { value: 'Dark Store',   label: 'Dark Store' },
  { value: 'Hypermarket',  label: 'Hypermarket' },
  { value: 'Supermarket',  label: 'Supermarket' },
];

export default function ColdstartFilterBar({ onRefresh }: { onRefresh: () => void }) {
  const { filters, dispatch, activeChips } = useColdstartFilters();
  const [isRefreshing, setIsRefreshing] = useState(false);

  function handleRefresh() {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 800);
  }

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-[var(--border-default)] px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Left: filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Model */}
          <select
            value={filters.model}
            onChange={(e) => dispatch({ type: 'setModel', payload: e.target.value as ModelFilter })}
            className="text-sm border border-[var(--border-default)] rounded-md px-2 py-1.5 bg-white text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
          >
            {MODEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <div className="w-px h-6 bg-[var(--border-default)]" />

          {/* Category */}
          <select
            value={filters.category}
            onChange={(e) => dispatch({ type: 'setCategory', payload: e.target.value })}
            className="text-sm border border-[var(--border-default)] rounded-md px-2 py-1.5 bg-white text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
            ))}
          </select>

          <div className="w-px h-6 bg-[var(--border-default)]" />

          {/* Store Type */}
          <select
            value={filters.storeType}
            onChange={(e) => dispatch({ type: 'setStoreType', payload: e.target.value as StoreTypeFilter })}
            className="text-sm border border-[var(--border-default)] rounded-md px-2 py-1.5 bg-white text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
          >
            {STORE_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <div className="w-px h-6 bg-[var(--border-default)]" />

          {/* Horizon */}
          <select
            value={filters.horizon}
            onChange={(e) => dispatch({ type: 'setHorizon', payload: e.target.value as HorizonFilter })}
            className="text-sm border border-[var(--border-default)] rounded-md px-2 py-1.5 bg-white text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
          >
            {HORIZON_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Active chips */}
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 text-xs bg-[var(--accent-primary-light)] text-[var(--accent-primary)] px-2 py-1 rounded-full"
            >
              {chip.label}
              <button onClick={chip.onRemove} className="hover:opacity-70">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>

        {/* Right: badge + refresh */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="inline-flex items-center gap-1.5 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Mock Data
          </span>
          <span className="text-xs text-[var(--text-secondary)]">target city · 90-day holdout · Jan 2024</span>
          <button
            onClick={handleRefresh}
            className="btn-secondary flex items-center gap-1.5 text-sm"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
