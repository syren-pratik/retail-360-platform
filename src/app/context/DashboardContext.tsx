'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Get default date range (last 90 days)
function getDefaultDateRange(): [string, string] {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 90);
  return [start.toISOString().split('T')[0], end.toISOString().split('T')[0]];
}

export interface GlobalFilters {
  dateRange: [string, string];  // ISO date strings
  stores: string[];             // store IDs, empty = all
  segments: string[];           // customer segments, empty = all
  loyaltyTiers: string[];       // loyalty tiers, empty = all
  channel: string;              // 'all' | 'online' | 'in-store'
  cities: string[];             // city names, empty = all
  states: string[];             // state names, empty = all
}

export interface ChartDrilldown {
  source: string;   // which chart set this (e.g., 'clv_distribution')
  field: string;    // data field being filtered (e.g., 'clv_tier')
  value: string;    // filter value (e.g., 'Gold')
  label: string;    // display text for the chip (e.g., 'CLV Tier: Gold')
}

export interface DashboardState {
  globalFilters: GlobalFilters;
  setGlobalFilters: (updates: Partial<GlobalFilters>) => void;
  resetFilters: () => void;

  activeDrilldowns: ChartDrilldown[];
  addDrilldown: (d: ChartDrilldown) => void;
  removeDrilldown: (field: string) => void;
  clearAllDrilldowns: () => void;

  selectedCustomerId: string | null;
  setSelectedCustomerId: (id: string | null) => void;

  expandedChart: string | null;
  setExpandedChart: (chartName: string | null) => void;

  pendingChatMessage: string | null;
  triggerChatMessage: (message: string) => void;
  clearPendingChatMessage: () => void;
}

const defaultFilters: GlobalFilters = {
  dateRange: getDefaultDateRange(),
  stores: [],
  segments: [],
  loyaltyTiers: [],
  channel: 'all',
  cities: [],
  states: [],
};

const DashboardContext = createContext<DashboardState | null>(null);

interface DashboardProviderProps {
  children: ReactNode;
}

export function DashboardProvider({ children }: DashboardProviderProps) {
  const [globalFilters, setGlobalFiltersState] = useState<GlobalFilters>(defaultFilters);
  const [activeDrilldowns, setActiveDrilldowns] = useState<ChartDrilldown[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [pendingChatMessage, setPendingChatMessage] = useState<string | null>(null);

  const setGlobalFilters = useCallback((updates: Partial<GlobalFilters>) => {
    setGlobalFiltersState((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetFilters = useCallback(() => {
    setGlobalFiltersState(defaultFilters);
  }, []);

  const addDrilldown = useCallback((d: ChartDrilldown) => {
    setActiveDrilldowns((prev) => {
      // Check if this exact drilldown already exists (toggle behavior)
      const existing = prev.find(
        (existing) => existing.field === d.field && existing.value === d.value
      );
      if (existing) {
        // Remove it (toggle off)
        return prev.filter((existing) => existing.field !== d.field);
      }
      // Replace existing drilldown for the same field, or add new one
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

  const triggerChatMessage = useCallback((message: string) => {
    setPendingChatMessage(message);
  }, []);

  const clearPendingChatMessage = useCallback(() => {
    setPendingChatMessage(null);
  }, []);

  const value: DashboardState = {
    globalFilters,
    setGlobalFilters,
    resetFilters,
    activeDrilldowns,
    addDrilldown,
    removeDrilldown,
    clearAllDrilldowns,
    selectedCustomerId,
    setSelectedCustomerId,
    expandedChart,
    setExpandedChart,
    pendingChatMessage,
    triggerChatMessage,
    clearPendingChatMessage,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardState {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
