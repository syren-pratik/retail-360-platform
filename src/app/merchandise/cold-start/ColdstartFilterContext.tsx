'use client';

import React, { createContext, useContext, useReducer, useMemo } from 'react';

export type ModelFilter =
  | 'all'
  | 'naive_baseline'
  | 'original_analog'
  | 'fix1_store_type'
  | 'fix2_blending'
  | 'fix3_festival'
  | 'all_3_combined';

export type CategoryFilter = 'all' | string;
export type HorizonFilter = 'week1' | 'month1' | 'month2' | 'month3' | 'full';
export type StoreTypeFilter = 'all' | string;

interface ColdstartFilters {
  model: ModelFilter;
  category: CategoryFilter;
  horizon: HorizonFilter;
  storeType: StoreTypeFilter;
  selected_sku_id: string;
  selected_day_num: number;
}

type Action =
  | { type: 'setModel'; payload: ModelFilter }
  | { type: 'setCategory'; payload: CategoryFilter }
  | { type: 'setHorizon'; payload: HorizonFilter }
  | { type: 'setStoreType'; payload: StoreTypeFilter }
  | { type: 'SET_SELECTED_SKU'; payload: string }
  | { type: 'SET_SELECTED_DAY'; payload: number }
  | { type: 'resetAll' };

interface ActiveChip {
  key: string;
  label: string;
  onRemove: () => void;
}

interface ColdstartFilterContextValue {
  filters: ColdstartFilters;
  dispatch: React.Dispatch<Action>;
  activeChips: ActiveChip[];
}

const defaultFilters: ColdstartFilters = {
  model: 'all',
  category: 'all',
  horizon: 'full',
  storeType: 'all',
  selected_sku_id: 'LKO-SKU-0001',
  selected_day_num: 45,
};

function reducer(state: ColdstartFilters, action: Action): ColdstartFilters {
  switch (action.type) {
    case 'setModel':
      return { ...state, model: action.payload };
    case 'setCategory':
      return { ...state, category: action.payload };
    case 'setHorizon':
      return { ...state, horizon: action.payload };
    case 'setStoreType':
      return { ...state, storeType: action.payload };
    case 'SET_SELECTED_SKU':
      return { ...state, selected_sku_id: action.payload };
    case 'SET_SELECTED_DAY':
      return { ...state, selected_day_num: action.payload };
    case 'resetAll':
      return { ...defaultFilters };
    default:
      return state;
  }
}

const MODEL_LABELS: Record<string, string> = {
  naive_baseline: 'Naive Baseline',
  original_analog: 'Original Analog',
  fix1_store_type: 'Fix 1: Store Type',
  fix2_blending: 'Fix 2: Blending',
  fix3_festival: 'Fix 3: Festival',
  all_3_combined: 'All 3 Combined',
};

const ColdstartFilterContext = createContext<ColdstartFilterContextValue | null>(null);

export function ColdstartFilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, dispatch] = useReducer(reducer, defaultFilters);

  const activeChips = useMemo<ActiveChip[]>(() => {
    const chips: ActiveChip[] = [];
    if (filters.model !== 'all') {
      chips.push({
        key: 'model',
        label: `Model: ${MODEL_LABELS[filters.model] ?? filters.model}`,
        onRemove: () => dispatch({ type: 'setModel', payload: 'all' }),
      });
    }
    if (filters.category !== 'all') {
      chips.push({
        key: 'category',
        label: `Category: ${filters.category}`,
        onRemove: () => dispatch({ type: 'setCategory', payload: 'all' }),
      });
    }
    if (filters.storeType !== 'all') {
      chips.push({
        key: 'storeType',
        label: `Store: ${filters.storeType}`,
        onRemove: () => dispatch({ type: 'setStoreType', payload: 'all' }),
      });
    }
    if (filters.horizon !== 'full') {
      const labels: Record<string, string> = {
        week1: 'Week 1',
        month1: 'Month 1',
        month2: 'Month 2',
        month3: 'Month 3',
      };
      chips.push({
        key: 'horizon',
        label: `Horizon: ${labels[filters.horizon] ?? filters.horizon}`,
        onRemove: () => dispatch({ type: 'setHorizon', payload: 'full' }),
      });
    }
    return chips;
  }, [filters]);

  return (
    <ColdstartFilterContext.Provider value={{ filters, dispatch, activeChips }}>
      {children}
    </ColdstartFilterContext.Provider>
  );
}

export function useColdstartFilters(): ColdstartFilterContextValue {
  const ctx = useContext(ColdstartFilterContext);
  if (!ctx) throw new Error('useColdstartFilters must be used inside ColdstartFilterProvider');
  return ctx;
}
