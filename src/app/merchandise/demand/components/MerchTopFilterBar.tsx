'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronDown, RefreshCw, Search, X, RotateCcw } from 'lucide-react';
import { useMerchFilters, type MerchFilterState } from '../MerchFilterContext';
import { INDIA_V1 } from '@/app/lib/market-config';
import { useTenant } from '@/app/context/TenantContext';

const APPAREL_DEPARTMENTS = [
  { name: 'Mens',        categories: [
    { name: 'Tees',            subcategories: ['Crew', 'V-Neck', 'Henley', 'Graphic'] },
    { name: 'Denim',           subcategories: ['Straight', 'Slim', 'Bootcut'] },
    { name: 'Outerwear',       subcategories: ['Light Jacket', 'Puffer', 'Vest'] },
    { name: 'Activewear',      subcategories: ['Performance Tee', 'Compression'] },
  ] },
  { name: 'Womens',      categories: [
    { name: 'Tops',      subcategories: ['Tank', 'Tee', 'Blouse'] },
    { name: 'Dresses',   subcategories: ['Casual', 'Sundress', 'Maxi'] },
    { name: 'Bottoms',   subcategories: ['Skinny Denim', 'Legging', 'Skirt'] },
    { name: 'Outerwear', subcategories: ['Trench', 'Puffer', 'Wool Coat'] },
  ] },
  { name: 'Kids',        categories: [
    { name: 'Boys Tops',    subcategories: ['Crew', 'Polo'] },
    { name: 'Girls Dresses',subcategories: ['Everyday', 'Occasion'] },
    { name: 'Baby',         subcategories: ['Bodysuit', 'Sleeper'] },
    { name: 'School Uniform',subcategories: ['Polo', 'Pant', 'Skort'] },
  ] },
  { name: 'Footwear',    categories: [
    { name: 'Mens Sneaker',   subcategories: ['Running', 'Lifestyle'] },
    { name: 'Womens Sneaker', subcategories: ['Running', 'Lifestyle'] },
    { name: 'Sandal',         subcategories: ['Mens', 'Womens'] },
  ] },
  { name: 'Accessories', categories: [
    { name: 'Handbag',   subcategories: ['Tote', 'Crossbody', 'Clutch'] },
    { name: 'Belt',      subcategories: ['Casual', 'Dress'] },
    { name: 'Sock',      subcategories: ['Athletic', 'Dress'] },
  ] },
];
import type { MerchDemandStore } from '@/app/lib/merch-demand-types';

interface MerchTopFilterBarProps {
  stores: MerchDemandStore[];
  generatedAt: string;
}

const HORIZON_OPTIONS = [7, 14, 28, 60] as const;

function formatGeneratedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MerchTopFilterBar({ stores, generatedAt }: MerchTopFilterBarProps) {
  const { state, dispatch, activeChips } = useMerchFilters();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [skuInput, setSkuInput] = useState(state.skuSearch);
  const [showSubPanel, setShowSubPanel] = useState(false);
  const subPanelRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isApparel } = useTenant();
  const departments = isApparel ? APPAREL_DEPARTMENTS : INDIA_V1.departments;
  const selectedDept = departments.find(d => d.name === state.department);
  const categories = selectedDept?.categories ?? [];
  const selectedCat = categories.find(c => c.name === state.category);
  const subcategories = selectedCat?.subcategories ?? [];

  const geoOptions = useMemo(() => {
    const regionSet = new Set<string>();
    const citiesByRegion: Record<string, Set<string>> = {};
    for (const s of stores) {
      regionSet.add(s.region);
      if (!citiesByRegion[s.region]) citiesByRegion[s.region] = new Set();
      citiesByRegion[s.region].add(s.city);
    }
    const regions = Array.from(regionSet).sort();
    const cities: Record<string, string[]> = {};
    for (const r of regions) cities[r] = Array.from(citiesByRegion[r] ?? []).sort();
    return { regions, cities };
  }, [stores]);

  // Debounce SKU search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      dispatch({ type: 'setSKUSearch', value: skuInput });
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [skuInput, dispatch]);

  // Close subcategory panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (subPanelRef.current && !subPanelRef.current.contains(e.target as Node)) {
        setShowSubPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  }, []);

  const geoValue =
    state.geography.scope === 'all_india'
      ? 'all_india'
      : `${state.geography.scope}::${state.geography.value}`;

  const handleGeoChange = (val: string) => {
    if (val === 'all_india') {
      dispatch({ type: 'setGeography', value: { scope: 'all_india', value: null } });
    } else {
      const idx = val.indexOf('::');
      const scope = val.slice(0, idx) as 'region' | 'city';
      const value = val.slice(idx + 2);
      dispatch({ type: 'setGeography', value: { scope, value } });
    }
  };

  const toggleSub = (sub: string) => {
    const next = state.subcategories.includes(sub)
      ? state.subcategories.filter(s => s !== sub)
      : [...state.subcategories, sub];
    dispatch({ type: 'setSubcategories', value: next });
  };

  const subLabel =
    state.subcategories.length === 0
      ? 'All Subcategories'
      : state.subcategories.length === 1
        ? state.subcategories[0]
        : `${state.subcategories.length} selected`;

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-[var(--border-default)] px-6 py-3">
      <div className="flex items-center justify-between gap-4">

        {/* LEFT: filter controls */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">

          {/* Department */}
          <div className="relative flex-shrink-0">
            <select
              value={state.department ?? ''}
              onChange={e => dispatch({ type: 'setDepartment', value: e.target.value || null })}
              className="h-9 px-3 pr-8 text-sm border border-[var(--border-default)] rounded-md bg-white appearance-none cursor-pointer hover:border-[var(--border-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-20"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.name} value={d.name}>{d.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
          </div>

          <div className="w-px h-6 bg-[var(--border-default)]" />

          {/* Category */}
          <div className="relative flex-shrink-0">
            <select
              value={state.category ?? ''}
              onChange={e => dispatch({ type: 'setCategory', value: e.target.value || null })}
              disabled={!state.department}
              className="h-9 px-3 pr-8 text-sm border border-[var(--border-default)] rounded-md bg-white appearance-none cursor-pointer hover:border-[var(--border-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
          </div>

          <div className="w-px h-6 bg-[var(--border-default)]" />

          {/* Subcategory multi-select */}
          <div className="relative flex-shrink-0" ref={subPanelRef}>
            <button
              type="button"
              onClick={() => state.category && setShowSubPanel(v => !v)}
              disabled={!state.category}
              className="h-9 pl-3 pr-8 text-sm border border-[var(--border-default)] rounded-md bg-white cursor-pointer hover:border-[var(--border-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center relative"
            >
              <span className={state.subcategories.length > 0 ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}>
                {subLabel}
              </span>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
            </button>

            {showSubPanel && subcategories.length > 0 && (
              <div className="absolute left-0 top-full mt-1 bg-white border border-[var(--border-default)] rounded-lg shadow-lg z-50 py-1 min-w-[200px] max-h-60 overflow-y-auto animate-fade-in">
                {subcategories.map(sub => (
                  <label key={sub} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-[var(--bg-secondary)]">
                    <input
                      type="checkbox"
                      checked={state.subcategories.includes(sub)}
                      onChange={() => toggleSub(sub)}
                      className="accent-[var(--accent-primary)]"
                    />
                    <span className="text-[var(--text-primary)]">{sub}</span>
                  </label>
                ))}
                {state.subcategories.length > 0 && (
                  <button
                    onClick={() => dispatch({ type: 'setSubcategories', value: [] })}
                    className="w-full text-left px-3 py-2 text-xs text-[var(--accent-primary)] hover:bg-[var(--bg-secondary)] border-t border-[var(--border-default)] mt-1"
                  >
                    Clear all
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-[var(--border-default)]" />

          {/* Geography */}
          <div className="relative flex-shrink-0">
            <select
              value={geoValue}
              onChange={e => handleGeoChange(e.target.value)}
              className="h-9 px-3 pr-8 text-sm border border-[var(--border-default)] rounded-md bg-white appearance-none cursor-pointer hover:border-[var(--border-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-20"
            >
              <option value="all_india">All India</option>
              {geoOptions.regions.flatMap(region => [
                <option key={`region::${region}`} value={`region::${region}`}>── {region} (all)</option>,
                ...geoOptions.cities[region].map(city => (
                  <option key={`city::${city}`} value={`city::${city}`}>──── {city}</option>
                )),
              ])}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
          </div>

          {/* Channel */}
          <div className="relative flex-shrink-0">
            <select
              value={state.channel}
              onChange={e => dispatch({ type: 'setChannel', value: e.target.value as MerchFilterState['channel'] })}
              className="h-9 px-3 pr-8 text-sm border border-[var(--border-default)] rounded-md bg-white appearance-none cursor-pointer hover:border-[var(--border-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-20"
            >
              <option value="All">All Channels</option>
              <option value="In-Store">In-Store</option>
              <option value="Online">Online</option>
              <option value="Dark Store">Dark Store</option>
              <option value="Quick-Commerce">Quick-Commerce</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
          </div>

          <div className="w-px h-6 bg-[var(--border-default)]" />

          {/* Horizon segmented control */}
          <div className="flex items-center border border-[var(--border-default)] rounded-md overflow-hidden flex-shrink-0">
            {HORIZON_OPTIONS.map((h, i) => (
              <button
                key={h}
                type="button"
                onClick={() => dispatch({ type: 'setHorizon', value: h })}
                className={`h-9 px-3 text-sm font-medium transition-colors ${
                  state.horizon === h
                    ? 'bg-[var(--accent-primary-light)] text-[var(--accent-primary)]'
                    : 'bg-white text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                }${i > 0 ? ' border-l border-[var(--border-default)]' : ''}`}
              >
                {h}d
              </button>
            ))}
          </div>

          {/* SKU Search */}
          <div className="relative flex-shrink-0">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
            <input
              type="text"
              value={skuInput}
              onChange={e => setSkuInput(e.target.value)}
              placeholder="Search SKU…"
              className="h-9 pl-8 pr-7 text-sm border border-[var(--border-default)] rounded-md bg-white hover:border-[var(--border-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-20 w-40"
            />
            {skuInput && (
              <button
                onClick={() => { setSkuInput(''); dispatch({ type: 'setSKUSearch', value: '' }); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* RIGHT: badges + actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Mock Data
          </span>

          <span className="text-xs text-[var(--text-tertiary)]">
            Updated: {formatGeneratedAt(generatedAt)}
          </span>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Refreshing…' : 'Refresh Data'}</span>
          </button>

          {activeChips.length > 0 && (
            <button
              onClick={() => dispatch({ type: 'resetAll' })}
              className="btn-secondary flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <RotateCcw size={14} />
              <span>Reset All</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
