'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Get default date range (last 90 days)
function getDefaultDateRange(): [string, string] {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 90);
  return [start.toISOString().split('T')[0], end.toISOString().split('T')[0]];
}

export interface InventoryFilters {
  dateRange: [string, string];
  departments: string[];
  categories: string[];
  stores: string[];
  abcClass: string;          // 'all' | 'A' | 'B' | 'C'
  supplier: string[];
  urgency: string;           // 'all' | 'Critical' | 'High' | 'Medium' | 'Low'
  stockStatus: string;       // 'all' | 'stockout' | 'critical' | 'low' | 'healthy' | 'overstock' | 'deadstock'
}

export interface InventoryDrilldown {
  source: string;
  field: string;
  value: string;
  label: string;
}

export interface InventoryState {
  filters: InventoryFilters;
  setFilters: (updates: Partial<InventoryFilters>) => void;
  resetFilters: () => void;

  activeDrilldowns: InventoryDrilldown[];
  addDrilldown: (d: InventoryDrilldown) => void;
  removeDrilldown: (field: string) => void;
  clearAllDrilldowns: () => void;

  expandedChart: string | null;
  setExpandedChart: (chartName: string | null) => void;

  selectedDepartment: string | null;
  setSelectedDepartment: (dept: string | null) => void;
}

const defaultFilters: InventoryFilters = {
  dateRange: getDefaultDateRange(),
  departments: [],
  categories: [],
  stores: [],
  abcClass: 'all',
  supplier: [],
  urgency: 'all',
  stockStatus: 'all',
};

const InventoryContext = createContext<InventoryState | null>(null);

interface InventoryProviderProps {
  children: ReactNode;
}

export function InventoryProvider({ children }: InventoryProviderProps) {
  const [filters, setFiltersState] = useState<InventoryFilters>(defaultFilters);
  const [activeDrilldowns, setActiveDrilldowns] = useState<InventoryDrilldown[]>([]);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  const setFilters = useCallback((updates: Partial<InventoryFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters);
  }, []);

  const addDrilldown = useCallback((d: InventoryDrilldown) => {
    setActiveDrilldowns((prev) => {
      // Toggle behavior - if same drilldown exists, remove it
      const existing = prev.find(
        (existing) => existing.field === d.field && existing.value === d.value
      );
      if (existing) {
        return prev.filter((existing) => existing.field !== d.field);
      }
      // Replace existing drilldown for same field
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

  const value: InventoryState = {
    filters,
    setFilters,
    resetFilters,
    activeDrilldowns,
    addDrilldown,
    removeDrilldown,
    clearAllDrilldowns,
    expandedChart,
    setExpandedChart,
    selectedDepartment,
    setSelectedDepartment,
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory(): InventoryState {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
}
