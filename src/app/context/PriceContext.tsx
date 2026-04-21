'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Get default date range (last 90 days)
function getDefaultDateRange(): [string, string] {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 90);
  return [start.toISOString().split('T')[0], end.toISOString().split('T')[0]];
}

export interface PriceFilters {
  dateRange: [string, string];
  departments: string[];
  categories: string[];
  stores: string[];
  recommendationPriority: string;  // 'all' | 'High' | 'Medium' | 'Low'
  priceAction: string;             // 'all' | 'increase' | 'decrease' | 'no_change'
  elasticityRange: string;         // 'all' | 'elastic' | 'unit' | 'inelastic'
}

export interface PriceDrilldown {
  source: string;
  field: string;
  value: string;
  label: string;
}

export interface RecommendationAction {
  productId: string;
  action: 'accepted' | 'rejected' | 'overridden';
  overridePrice?: number;
  rejectionReason?: string;
  timestamp: string;
}

export interface PriceState {
  filters: PriceFilters;
  setFilters: (updates: Partial<PriceFilters>) => void;
  resetFilters: () => void;

  activeDrilldowns: PriceDrilldown[];
  addDrilldown: (d: PriceDrilldown) => void;
  removeDrilldown: (field: string) => void;
  clearAllDrilldowns: () => void;

  expandedChart: string | null;
  setExpandedChart: (chartName: string | null) => void;

  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;

  // Recommendation actions stored in state (persisted to localStorage)
  recommendationActions: Record<string, RecommendationAction>;
  acceptRecommendation: (productId: string) => void;
  rejectRecommendation: (productId: string, reason: string) => void;
  overrideRecommendation: (productId: string, newPrice: number) => void;
  getRecommendationAction: (productId: string) => RecommendationAction | undefined;
}

const defaultFilters: PriceFilters = {
  dateRange: getDefaultDateRange(),
  departments: [],
  categories: [],
  stores: [],
  recommendationPriority: 'all',
  priceAction: 'all',
  elasticityRange: 'all',
};

const PriceContext = createContext<PriceState | null>(null);

interface PriceProviderProps {
  children: ReactNode;
}

// Load recommendation actions from localStorage
function loadRecommendationActions(): Record<string, RecommendationAction> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem('price_recommendation_actions');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Save recommendation actions to localStorage
function saveRecommendationActions(actions: Record<string, RecommendationAction>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('price_recommendation_actions', JSON.stringify(actions));
  } catch {
    // Ignore storage errors
  }
}

export function PriceProvider({ children }: PriceProviderProps) {
  const [filters, setFiltersState] = useState<PriceFilters>(defaultFilters);
  const [activeDrilldowns, setActiveDrilldowns] = useState<PriceDrilldown[]>([]);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [recommendationActions, setRecommendationActions] = useState<Record<string, RecommendationAction>>(
    loadRecommendationActions
  );

  const setFilters = useCallback((updates: Partial<PriceFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters);
  }, []);

  const addDrilldown = useCallback((d: PriceDrilldown) => {
    setActiveDrilldowns((prev) => {
      const existing = prev.find(
        (existing) => existing.field === d.field && existing.value === d.value
      );
      if (existing) {
        return prev.filter((existing) => existing.field !== d.field);
      }
      const filtered = prev.filter((existing) => existing.field !== d.field);
      return [...filtered, d];
    });
  }, []);

  const removeDrilldown = useCallback((field: string) => {
    setActiveDrilldowns((prev) => prev.filter((d) => d.field !== field));
  }, []);

  const clearAllDrilldowns = useCallback(() => {
    setActiveDrilldowns([]);
  }, []);

  const acceptRecommendation = useCallback((productId: string) => {
    setRecommendationActions((prev) => {
      const updated = {
        ...prev,
        [productId]: {
          productId,
          action: 'accepted' as const,
          timestamp: new Date().toISOString(),
        },
      };
      saveRecommendationActions(updated);
      return updated;
    });
  }, []);

  const rejectRecommendation = useCallback((productId: string, reason: string) => {
    setRecommendationActions((prev) => {
      const updated = {
        ...prev,
        [productId]: {
          productId,
          action: 'rejected' as const,
          rejectionReason: reason,
          timestamp: new Date().toISOString(),
        },
      };
      saveRecommendationActions(updated);
      return updated;
    });
  }, []);

  const overrideRecommendation = useCallback((productId: string, newPrice: number) => {
    setRecommendationActions((prev) => {
      const updated = {
        ...prev,
        [productId]: {
          productId,
          action: 'overridden' as const,
          overridePrice: newPrice,
          timestamp: new Date().toISOString(),
        },
      };
      saveRecommendationActions(updated);
      return updated;
    });
  }, []);

  const getRecommendationAction = useCallback((productId: string) => {
    return recommendationActions[productId];
  }, [recommendationActions]);

  const value: PriceState = {
    filters,
    setFilters,
    resetFilters,
    activeDrilldowns,
    addDrilldown,
    removeDrilldown,
    clearAllDrilldowns,
    expandedChart,
    setExpandedChart,
    selectedCategory,
    setSelectedCategory,
    recommendationActions,
    acceptRecommendation,
    rejectRecommendation,
    overrideRecommendation,
    getRecommendationAction,
  };

  return (
    <PriceContext.Provider value={value}>
      {children}
    </PriceContext.Provider>
  );
}

export function usePrice(): PriceState {
  const context = useContext(PriceContext);
  if (!context) {
    throw new Error('usePrice must be used within a PriceProvider');
  }
  return context;
}
