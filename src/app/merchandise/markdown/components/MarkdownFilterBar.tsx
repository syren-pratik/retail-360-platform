'use client';

import { SlidersHorizontal } from 'lucide-react';
import type { Region, StoreType } from '../markdown-types';

interface Props {
  regions: Region[];
  storeTypes: StoreType[];
  selectedRegion: Region | 'All';
  selectedStoreType: StoreType | 'All';
  onRegionChange: (r: Region | 'All') => void;
  onStoreTypeChange: (s: StoreType | 'All') => void;
  generatedAt: string;
}

export default function MarkdownFilterBar({
  regions,
  storeTypes,
  selectedRegion,
  selectedStoreType,
  onRegionChange,
  onStoreTypeChange,
  generatedAt,
}: Props) {
  const ts = new Date(generatedAt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-[var(--border-default)]">
      <div className="px-8 h-14 flex items-center justify-between gap-4">
        {/* Left: filter controls */}
        <div className="flex items-center gap-3">
          <SlidersHorizontal size={16} className="text-[var(--text-tertiary)]" />
          <span className="text-sm font-medium text-[var(--text-secondary)]">Filter</span>

          {/* Region */}
          <div className="flex items-center gap-1">
            {(['All', ...regions] as (Region | 'All')[]).map((r) => (
              <button
                key={r}
                onClick={() => onRegionChange(r)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedRegion === r
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-[var(--border-default)]" />

          {/* Store type */}
          <div className="flex items-center gap-1">
            {(['All', ...storeTypes] as (StoreType | 'All')[]).map((s) => (
              <button
                key={s}
                onClick={() => onStoreTypeChange(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedStoreType === s
                    ? 'bg-orange-500 text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Right: last updated */}
        <span className="text-xs text-[var(--text-tertiary)]">
          Databricks sync · {ts} IST
        </span>
      </div>
    </div>
  );
}
