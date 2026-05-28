'use client';

import React, { createContext, useContext, useReducer, useMemo } from 'react';
import type { MerchDemandHorizon, MerchDemandChannel } from '@/app/lib/merch-demand-types';

export interface MerchGeoScope {
  scope: 'all_india' | 'region' | 'tier' | 'city' | 'store_cluster' | 'store';
  value: string | null;
}

export interface MerchFilterState {
  department: string | null;
  category: string | null;
  subcategories: string[];
  geography: MerchGeoScope;
  channel: 'All' | MerchDemandChannel;
  horizon: MerchDemandHorizon;
  skuSearch: string;
}

export type MerchFilterAction =
  | { type: 'setDepartment'; value: string | null }
  | { type: 'setCategory'; value: string | null }
  | { type: 'setSubcategories'; value: string[] }
  | { type: 'setGeography'; value: MerchGeoScope }
  | { type: 'setChannel'; value: MerchFilterState['channel'] }
  | { type: 'setHorizon'; value: MerchDemandHorizon }
  | { type: 'setSKUSearch'; value: string }
  | { type: 'resetAll' }
  | { type: 'removeFilter'; key: keyof MerchFilterState };

export interface MerchFilterChip {
  key: string;
  label: string;
  value: string;
  onRemove: () => void;
}

export const DEFAULT_FILTER_STATE: MerchFilterState = {
  department: null,
  category: null,
  subcategories: [],
  geography: { scope: 'all_india', value: null },
  channel: 'All',
  horizon: 14,
  skuSearch: '',
};

function reducer(state: MerchFilterState, action: MerchFilterAction): MerchFilterState {
  switch (action.type) {
    case 'setDepartment':
      return { ...state, department: action.value, category: null, subcategories: [] };
    case 'setCategory':
      return { ...state, category: action.value, subcategories: [] };
    case 'setSubcategories':
      return { ...state, subcategories: action.value };
    case 'setGeography':
      return { ...state, geography: action.value };
    case 'setChannel':
      return { ...state, channel: action.value };
    case 'setHorizon':
      return { ...state, horizon: action.value };
    case 'setSKUSearch':
      return { ...state, skuSearch: action.value };
    case 'resetAll':
      return { ...DEFAULT_FILTER_STATE };
    case 'removeFilter': {
      switch (action.key) {
        case 'department':
          return { ...state, department: null, category: null, subcategories: [] };
        case 'category':
          return { ...state, category: null, subcategories: [] };
        case 'subcategories':
          return { ...state, subcategories: [] };
        case 'geography':
          return { ...state, geography: DEFAULT_FILTER_STATE.geography };
        case 'channel':
          return { ...state, channel: DEFAULT_FILTER_STATE.channel };
        case 'horizon':
          return { ...state, horizon: DEFAULT_FILTER_STATE.horizon };
        case 'skuSearch':
          return { ...state, skuSearch: '' };
        default:
          return state;
      }
    }
    default:
      return state;
  }
}

interface MerchFilterContextValue {
  state: MerchFilterState;
  dispatch: React.Dispatch<MerchFilterAction>;
  activeChips: MerchFilterChip[];
}

const MerchFilterContext = createContext<MerchFilterContextValue | null>(null);

export function MerchFilterProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, DEFAULT_FILTER_STATE);

  const activeChips = useMemo<MerchFilterChip[]>(() => {
    const chips: MerchFilterChip[] = [];

    if (state.department) {
      chips.push({
        key: 'department',
        label: 'Department',
        value: state.department,
        onRemove: () => dispatch({ type: 'removeFilter', key: 'department' }),
      });
    }
    if (state.category) {
      chips.push({
        key: 'category',
        label: 'Category',
        value: state.category,
        onRemove: () => dispatch({ type: 'removeFilter', key: 'category' }),
      });
    }
    if (state.subcategories.length > 0) {
      chips.push({
        key: 'subcategories',
        label: 'Subcategory',
        value:
          state.subcategories.length === 1
            ? state.subcategories[0]
            : `${state.subcategories.length} selected`,
        onRemove: () => dispatch({ type: 'removeFilter', key: 'subcategories' }),
      });
    }
    if (state.geography.scope !== 'all_india') {
      chips.push({
        key: 'geography',
        label: 'Geography',
        value: state.geography.value ?? state.geography.scope,
        onRemove: () => dispatch({ type: 'removeFilter', key: 'geography' }),
      });
    }
    if (state.channel !== 'All') {
      chips.push({
        key: 'channel',
        label: 'Channel',
        value: state.channel,
        onRemove: () => dispatch({ type: 'removeFilter', key: 'channel' }),
      });
    }
    if (state.horizon !== 14) {
      chips.push({
        key: 'horizon',
        label: 'Horizon',
        value: `${state.horizon}d`,
        onRemove: () => dispatch({ type: 'removeFilter', key: 'horizon' }),
      });
    }
    if (state.skuSearch.trim()) {
      chips.push({
        key: 'skuSearch',
        label: 'SKU',
        value: state.skuSearch,
        onRemove: () => dispatch({ type: 'removeFilter', key: 'skuSearch' }),
      });
    }

    return chips;
  }, [state]);

  return (
    <MerchFilterContext.Provider value={{ state, dispatch, activeChips }}>
      {children}
    </MerchFilterContext.Provider>
  );
}

export function useMerchFilters(): MerchFilterContextValue {
  const ctx = useContext(MerchFilterContext);
  if (!ctx) throw new Error('useMerchFilters must be used inside MerchFilterProvider');
  return ctx;
}
