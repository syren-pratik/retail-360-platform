'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

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
  cities: string[];
  abcClass: string;
  supplier: string[];
  urgency: string;
  stockStatus: string;
  forecastDepartment: string;
  forecastHorizon: '7d' | '14d' | '30d';
  selectedRole: string;
  timePeriod: string;
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
  setRole: (role: string) => void;

  activeDrilldowns: InventoryDrilldown[];
  addDrilldown: (d: InventoryDrilldown) => void;
  removeDrilldown: (field: string) => void;
  clearAllDrilldowns: () => void;

  selectedDepartment: string | null;
  setSelectedDepartment: (dept: string | null) => void;
}

const defaultFilters: InventoryFilters = {
  dateRange: getDefaultDateRange(),
  departments: [],
  categories: [],
  stores: [],
  cities: [],
  abcClass: 'all',
  supplier: [],
  urgency: 'all',
  stockStatus: 'all',
  forecastDepartment: 'all',
  forecastHorizon: '14d',
  selectedRole: 'all',
  timePeriod: '90d',
};

const InventoryContext = createContext<InventoryState | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<InventoryFilters>(defaultFilters);
  const [activeDrilldowns, setActiveDrilldowns] = useState<InventoryDrilldown[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  const setFilters = useCallback((updates: Partial<InventoryFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters);
  }, []);

  const setRole = useCallback((role: string) => {
    setFiltersState((prev) => ({ ...prev, selectedRole: role }));
  }, []);

  const addDrilldown = useCallback((d: InventoryDrilldown) => {
    setActiveDrilldowns((prev) => {
      const existing = prev.find((e) => e.field === d.field && e.value === d.value);
      if (existing) return prev.filter((e) => e.field !== d.field);
      const filtered = prev.filter((e) => e.field !== d.field);
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
    setRole,
    activeDrilldowns,
    addDrilldown,
    removeDrilldown,
    clearAllDrilldowns,
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
  if (!context) throw new Error('useInventory must be used within an InventoryProvider');
  return context;
}
