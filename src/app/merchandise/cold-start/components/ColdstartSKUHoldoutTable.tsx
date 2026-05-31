'use client';

import React, { useMemo, useState } from 'react';
import ChartCard from '@/app/components/charts/ChartCard';
import type { ColdstartSKUHoldout, ColdstartHeroSKU } from '@/app/lib/coldstart-types';
import { useColdstartFilters } from '../ColdstartFilterContext';
import { exportCSV } from '@/app/lib/export-utils';
import { Download } from 'lucide-react';

interface Props {
  holdouts: ColdstartSKUHoldout[];
  heroSkus: ColdstartHeroSKU[];
}

type SortKey = 'sku_id' | 'category' | 'actual' | 'predicted' | 'error_pct';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 10;

export default function ColdstartSKUHoldoutTable({ holdouts, heroSkus }: Props) {
  const { filters, dispatch } = useColdstartFilters();

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('error_pct');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);
  const [nonHeroMsg, setNonHeroMsg] = useState(false);

  const heroSKUIds = useMemo(() => new Set(heroSkus.map((s) => s.sku_id)), [heroSkus]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return holdouts.filter(
      (h) =>
        h.sku_id.toLowerCase().includes(q) ||
        h.category.toLowerCase().includes(q)
    );
  }, [holdouts, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(0);
  }

  function handleRowClick(sku_id: string) {
    if (heroSKUIds.has(sku_id)) {
      dispatch({ type: 'SET_SELECTED_SKU', payload: sku_id });
      const el = document.getElementById('section-coldstart-sku-drill');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      setNonHeroMsg(true);
      setTimeout(() => setNonHeroMsg(false), 3000);
    }
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      <span className="ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>
    ) : (
      <span className="ml-0.5 opacity-30">↕</span>
    );

  return (
    <ChartCard
      id="coldstart-sku-holdout-table"
      title="SKU Holdout Results"
      subtitle={`${filtered.length} SKUs · 90-day holdout · fix2_blending champion model · click row to drill`}
      height={420}
      exportFilename="coldstart_sku_holdouts"
      showExport={false}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3">
        <input
          type="text"
          placeholder="Search SKU or category…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="flex-1 text-xs px-2.5 py-1.5 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
        />
        <button
          onClick={() => exportCSV(holdouts as unknown as Record<string, unknown>[], 'coldstart_sku_holdouts')}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
        >
          <Download size={12} />
          CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              {([
                ['sku_id',    'SKU',       'text-left'],
                ['category',  'Category',  'text-left'],
                ['actual',    'Actual',    'text-right'],
                ['predicted', 'Predicted', 'text-right'],
                ['error_pct', 'Error%',    'text-right'],
              ] as Array<[SortKey, string, string]>).map(([k, label, align]) => (
                <th
                  key={k}
                  onClick={() => handleSort(k)}
                  className={`py-1.5 px-2 font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] select-none ${align}`}
                >
                  {label}
                  <SortIcon k={k} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((h) => {
              const isSelected = filters.selected_sku_id === h.sku_id;
              const isHero = heroSKUIds.has(h.sku_id);
              return (
                <tr
                  key={h.sku_id}
                  onClick={() => handleRowClick(h.sku_id)}
                  className={`border-b border-[var(--border-default)] last:border-0 cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                >
                  <td className="py-1.5 px-2 font-mono text-[var(--text-primary)]">
                    {h.sku_id}
                    {isHero && (
                      <>
                        <span className="ml-1 text-[9px] bg-amber-100 text-amber-700 px-1 rounded font-normal">hero</span>
                        <span className="ml-1 text-[9px] bg-blue-100 text-blue-700 px-1 rounded font-normal">Drill</span>
                      </>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-[var(--text-secondary)]">{h.category}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-[var(--text-primary)]">{h.actual.toFixed(1)}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-[var(--text-primary)]">{h.predicted.toFixed(1)}</td>
                  <td className={`py-1.5 px-2 text-right font-mono font-semibold ${
                    h.error_pct < 0.25 ? 'text-emerald-600' :
                    h.error_pct < 0.40 ? 'text-amber-600' : 'text-red-500'
                  }`}>
                    {(h.error_pct * 100).toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Non-hero toast */}
      {nonHeroMsg && (
        <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          Detailed drill-down available for hero SKUs only. Showing summary data.
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-[var(--text-tertiary)]">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="text-xs px-2 py-1 rounded border border-[var(--border-default)] disabled:opacity-30 hover:bg-[var(--bg-secondary)] transition-colors"
            >
              ←
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`text-xs w-7 py-1 rounded border ${
                  i === page
                    ? 'bg-[var(--accent-primary)] text-white border-transparent'
                    : 'border-[var(--border-default)] hover:bg-[var(--bg-secondary)]'
                } transition-colors`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="text-xs px-2 py-1 rounded border border-[var(--border-default)] disabled:opacity-30 hover:bg-[var(--bg-secondary)] transition-colors"
            >
              →
            </button>
          </div>
        </div>
      )}
    </ChartCard>
  );
}
