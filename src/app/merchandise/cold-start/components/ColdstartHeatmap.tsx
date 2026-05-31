'use client';

import React, { useMemo } from 'react';
import ChartCard from '@/app/components/charts/ChartCard';
import type { ColdstartHeatmapCell } from '@/app/lib/coldstart-types';
import { useColdstartFilters } from '../ColdstartFilterContext';

interface Props {
  cells: ColdstartHeatmapCell[];
}

const ALL_CATEGORIES = [
  'Coffee', 'Dal & Pulses', 'Chips & Namkeen', 'Paneer', 'Edible Oil',
  'Curd & Yogurt', 'Butter & Ghee', 'Energy Drinks', 'Tea', 'Rice',
];

const ALL_STORE_TYPES = ['Express', 'Dark Store', 'Hypermarket', 'Supermarket'];

const MODEL_LABELS: Record<string, string> = {
  naive_baseline:  'Naive Baseline',
  original_analog: 'Original Analog',
  fix1_store_type: 'Fix 1: Store Type',
  fix2_blending:   'Fix 2: Blending (Champion)',
  fix3_festival:   'Fix 3: Festival',
  all_3_combined:  'All 3 Combined',
};

function mapeToColor(mape: number): string {
  if (mape < 0.25) return '#bbf7d0';
  if (mape < 0.40) return '#fef9c3';
  if (mape < 0.60) return '#fed7aa';
  return '#fecaca';
}

function mapeToTextColor(mape: number): string {
  if (mape < 0.25) return '#166534';
  if (mape < 0.40) return '#854d0e';
  return '#991b1b';
}

export default function ColdstartHeatmap({ cells }: Props) {
  const { filters } = useColdstartFilters();

  // Default to fix2_blending when model=all or an unrecognised id
  const activeModel = (filters.model === 'all' || !MODEL_LABELS[filters.model])
    ? 'fix2_blending'
    : filters.model;

  const visibleCategories = useMemo(
    () => filters.category === 'all'
      ? ALL_CATEGORIES
      : ALL_CATEGORIES.filter((c) => c === filters.category),
    [filters.category]
  );

  const visibleStoreTypes = useMemo(
    () => filters.storeType === 'all'
      ? ALL_STORE_TYPES
      : ALL_STORE_TYPES.filter((s) => s === filters.storeType),
    [filters.storeType]
  );

  // Build lookup: "category__storeType" → cell
  const cellMap = useMemo(() => {
    const map = new Map<string, ColdstartHeatmapCell>();
    for (const c of cells) {
      if (c.model === activeModel) {
        map.set(`${c.sku_category}__${c.store_type}`, c);
      }
    }
    return map;
  }, [cells, activeModel]);

  // Worst forecasts in current view (top 5 by MAPE)
  const worstCells = useMemo(() => {
    const visible: ColdstartHeatmapCell[] = [];
    for (const cat of visibleCategories) {
      for (const st of visibleStoreTypes) {
        const cell = cellMap.get(`${cat}__${st}`);
        if (cell) visible.push(cell);
      }
    }
    return visible.sort((a, b) => b.mape - a.mape).slice(0, 5);
  }, [cellMap, visibleCategories, visibleStoreTypes]);

  const modelLabel = (filters.model === 'all' || !MODEL_LABELS[filters.model])
    ? `${MODEL_LABELS.fix2_blending} — default`
    : MODEL_LABELS[filters.model];

  const colCount = visibleStoreTypes.length;

  return (
    <ChartCard
      id="coldstart-heatmap"
      title="MAPE Heatmap — Category × Store Type"
      subtitle={`Showing: ${modelLabel} · green = accurate, red = critical`}
      height={380}
      exportFilename="coldstart_heatmap"
    >
      <div className="overflow-auto h-full flex flex-col gap-4">
        {/* Model indicator */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-secondary)]">Model:</span>
          <span className="text-xs font-semibold text-[var(--text-primary)]">{modelLabel}</span>
          {filters.model === 'all' && (
            <span className="text-xs text-[var(--text-tertiary)]">(select a model above to compare)</span>
          )}
        </div>

        {/* Grid */}
        <div
          className="grid gap-1 text-xs min-w-[400px]"
          style={{ gridTemplateColumns: `140px repeat(${colCount}, 1fr)` }}
        >
          {/* Header */}
          <div className="py-1.5 px-2 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            Category
          </div>
          {visibleStoreTypes.map((st) => (
            <div key={st} className="py-1.5 px-1 text-center text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              {st}
            </div>
          ))}

          {/* Data rows */}
          {visibleCategories.map((cat) => (
            <React.Fragment key={cat}>
              <div className="py-2 px-2 text-[11px] font-medium text-[var(--text-primary)] flex items-center">
                {cat}
              </div>
              {visibleStoreTypes.map((st) => {
                const cell = cellMap.get(`${cat}__${st}`);
                const mape = cell?.mape ?? 0;
                const nSkus = cell?.n_skus ?? 0;
                return (
                  <div
                    key={st}
                    className="py-2 px-1 text-center rounded text-[11px] font-mono font-semibold cursor-default"
                    style={{ backgroundColor: mapeToColor(mape), color: mapeToTextColor(mape) }}
                    title={`${cat} · ${st} | MAPE: ${(mape * 100).toFixed(1)}% | SKUs: ${nSkus} | ${cell?.severity ?? ''}`}
                  >
                    {(mape * 100).toFixed(1)}%
                    <div className="text-[9px] opacity-70 font-normal">{nSkus} SKUs</div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-[var(--text-secondary)]">MAPE scale:</span>
          {[
            { label: '<25% good',      color: '#bbf7d0', text: '#166534' },
            { label: '25-40% ok',      color: '#fef9c3', text: '#854d0e' },
            { label: '40-60% concern', color: '#fed7aa', text: '#991b1b' },
            { label: '>60% critical',  color: '#fecaca', text: '#991b1b' },
          ].map((l) => (
            <span key={l.label} className="flex items-center gap-1 text-[10px]">
              <span className="w-3 h-3 rounded inline-block" style={{ backgroundColor: l.color }} />
              <span style={{ color: l.text }}>{l.label}</span>
            </span>
          ))}
        </div>

        {/* Worst forecasts */}
        {worstCells.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[var(--text-primary)] mb-1.5">Worst forecasts in current view</p>
            <div className="flex flex-wrap gap-2">
              {worstCells.map((c, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full"
                  style={{ backgroundColor: mapeToColor(c.mape), color: mapeToTextColor(c.mape) }}
                >
                  <span className="font-semibold">{c.sku_category}</span>
                  <span className="opacity-70">·</span>
                  <span>{c.store_type}</span>
                  <span className="font-mono font-bold">{(c.mape * 100).toFixed(1)}%</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
