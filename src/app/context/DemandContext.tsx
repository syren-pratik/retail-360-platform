'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Get default date range (last 90 days + 30 days future)
function getDefaultDateRange(): [string, string] {
  const end = new Date();
  end.setDate(end.getDate() + 30); // Include 30 days future
  const start = new Date();
  start.setDate(start.getDate() - 90);
  return [start.toISOString().split('T')[0], end.toISOString().split('T')[0]];
}

export interface DemandFilters {
  dateRange: [string, string];
  departments: string[];
  stores: string[];
  abcClass: string;        // 'all' | 'A' | 'B' | 'C'
  modelVersion: string;    // 'all' | specific version
  storeType: string;       // 'all' | specific type
  forecastHorizon: number; // 7 | 14 | 30
}

export interface DemandDrilldown {
  source: string;
  field: string;
  value: string;
  label: string;
}

export interface DemandState {
  filters: DemandFilters;
  setFilters: (updates: Partial<DemandFilters>) => void;
  resetFilters: () => void;

  activeDrilldowns: DemandDrilldown[];
  addDrilldown: (d: DemandDrilldown) => void;
  removeDrilldown: (field: string) => void;
  clearAllDrilldowns: () => void;

  expandedChart: string | null;
  setExpandedChart: (chartName: string | null) => void;

  selectedDepartment: string | null;
  setSelectedDepartment: (dept: string | null) => void;
}

const defaultFilters: DemandFilters = {
  dateRange: getDefaultDateRange(),
  departments: [],
  stores: [],
  abcClass: 'all',
  modelVersion: 'all',
  storeType: 'all',
  forecastHorizon: 14,
};

const DemandContext = createContext<DemandState | null>(null);

interface DemandProviderProps {
  children: ReactNode;
}

export function DemandProvider({ children }: DemandProviderProps) {
  const [filters, setFiltersState] = useState<DemandFilters>(defaultFilters);
  const [activeDrilldowns, setActiveDrilldowns] = useState<DemandDrilldown[]>([]);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  const setFilters = useCallback((updates: Partial<DemandFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters);
  }, []);

  const addDrilldown = useCallback((d: DemandDrilldown) => {
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

  const value: DemandState = {
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
    <DemandContext.Provider value={value}>
      {children}
    </DemandContext.Provider>
  );
}

export function useDemand(): DemandState {
  const context = useContext(DemandContext);
  if (!context) {
    throw new Error('useDemand must be used within a DemandProvider');
  }
  return context;
}
