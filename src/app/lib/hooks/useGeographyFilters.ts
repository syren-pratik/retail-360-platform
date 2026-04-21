'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { DimensionsData, StoreData, RegionData, StateData } from '../types';

export interface GeographyFilterState {
  selectedRegions: string[];
  selectedStates: string[];
  selectedCities: string[];
  selectedStores: string[];
}

export interface UseGeographyFiltersReturn {
  // Current selections
  selectedRegions: string[];
  selectedStates: string[];
  selectedCities: string[];
  selectedStores: string[];

  // Available options (filtered based on parent selections)
  availableRegions: string[];
  availableStates: string[];
  availableCities: string[];
  availableStores: StoreData[];

  // Setters with cascade behavior
  setSelectedRegions: (regions: string[]) => void;
  setSelectedStates: (states: string[]) => void;
  setSelectedCities: (cities: string[]) => void;
  setSelectedStores: (stores: string[]) => void;

  // Reset all geography filters
  resetGeographyFilters: () => void;

  // Check if any geography filter is active
  hasGeographyFilters: boolean;

  // Loading state
  isLoading: boolean;

  // Raw dimensions data
  dimensions: DimensionsData | null;
}

export function useGeographyFilters(
  initialState?: Partial<GeographyFilterState>
): UseGeographyFiltersReturn {
  const [dimensions, setDimensions] = useState<DimensionsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [selectedRegions, setSelectedRegionsState] = useState<string[]>(
    initialState?.selectedRegions || []
  );
  const [selectedStates, setSelectedStatesState] = useState<string[]>(
    initialState?.selectedStates || []
  );
  const [selectedCities, setSelectedCitiesState] = useState<string[]>(
    initialState?.selectedCities || []
  );
  const [selectedStores, setSelectedStoresState] = useState<string[]>(
    initialState?.selectedStores || []
  );

  // Load dimensions data from API
  useEffect(() => {
    const loadDimensions = async () => {
      try {
        const response = await fetch('/api/cache/dimensions');
        if (response.ok) {
          const result = await response.json();
          setDimensions(result.data as DimensionsData);
        } else {
          console.error('Failed to load dimensions:', response.statusText);
        }
      } catch (error) {
        console.error('Failed to load dimensions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDimensions();
  }, []);

  // Get all regions
  const availableRegions = useMemo(() => {
    if (!dimensions?.geography?.regions) return [];
    return dimensions.geography.regions.map((r: RegionData) => r.region);
  }, [dimensions]);

  // Get states filtered by selected regions
  const availableStates = useMemo(() => {
    if (!dimensions?.geography?.regions) return [];

    const regions = dimensions.geography.regions;

    // If no regions selected, show all states
    if (selectedRegions.length === 0) {
      return (regions ?? []).flatMap((r: RegionData) =>
        r.states.map((s: StateData) => s.state)
      );
    }

    // Filter by selected regions
    return regions
      .filter((r: RegionData) => (selectedRegions ?? '').includes(r.region))
      .flatMap((r: RegionData) => r.states.map((s: StateData) => s.state));
  }, [dimensions, selectedRegions]);

  // Get cities filtered by selected states (or regions if no states)
  const availableCities = useMemo(() => {
    if (!dimensions?.geography?.regions) return [];

    const regions = dimensions.geography.regions;

    // If no states selected, filter by regions (or show all)
    if (selectedStates.length === 0) {
      const filteredRegions = selectedRegions.length === 0
        ? regions
        : (regions ?? []).filter((r: RegionData) => (selectedRegions ?? '').includes(r.region));

      return (filteredRegions ?? []).flatMap((r: RegionData) =>
        r.states.flatMap((s: StateData) => s.cities)
      );
    }

    // Filter by selected states
    return (regions ?? []).flatMap((r: RegionData) =>
      r.states
        .filter((s: StateData) => (selectedStates ?? '').includes(s.state))
        .flatMap((s: StateData) => s.cities)
    );
  }, [dimensions, selectedRegions, selectedStates]);

  // Get stores filtered by selected cities (or states/regions)
  const availableStores = useMemo(() => {
    if (!dimensions?.stores) return [];

    let stores = dimensions.stores;

    // Filter by regions
    if ((selectedRegions ?? []).length > 0) {
      stores = stores.filter((s: StoreData) => (selectedRegions ?? '').includes(s.region));
    }

    // Filter by states
    if ((selectedStates ?? []).length > 0) {
      stores = stores.filter((s: StoreData) => (selectedStates ?? '').includes(s.state));
    }

    // Filter by cities
    if ((selectedCities ?? []).length > 0) {
      stores = stores.filter((s: StoreData) => (selectedCities ?? '').includes(s.city));
    }

    return stores;
  }, [dimensions, selectedRegions, selectedStates, selectedCities]);

  // Cascade setters - when parent changes, clear children
  const setSelectedRegions = useCallback((regions: string[]) => {
    setSelectedRegionsState(regions);
    // Clear child selections when regions change
    setSelectedStatesState([]);
    setSelectedCitiesState([]);
    setSelectedStoresState([]);
  }, []);

  const setSelectedStates = useCallback((states: string[]) => {
    setSelectedStatesState(states);
    // Clear child selections when states change
    setSelectedCitiesState([]);
    setSelectedStoresState([]);
  }, []);

  const setSelectedCities = useCallback((cities: string[]) => {
    setSelectedCitiesState(cities);
    // Clear stores when cities change
    setSelectedStoresState([]);
  }, []);

  const setSelectedStores = useCallback((stores: string[]) => {
    setSelectedStoresState(stores);
  }, []);

  const resetGeographyFilters = useCallback(() => {
    setSelectedRegionsState([]);
    setSelectedStatesState([]);
    setSelectedCitiesState([]);
    setSelectedStoresState([]);
  }, []);

  const hasGeographyFilters = useMemo(() => {
    return (
      (selectedRegions ?? []).length > 0 ||
      (selectedStates ?? []).length > 0 ||
      (selectedCities ?? []).length > 0 ||
      (selectedStores ?? []).length > 0
    );
  }, [selectedRegions, selectedStates, selectedCities, selectedStores]);

  return {
    // Current selections
    selectedRegions,
    selectedStates,
    selectedCities,
    selectedStores,

    // Available options
    availableRegions,
    availableStates,
    availableCities,
    availableStores,

    // Setters
    setSelectedRegions,
    setSelectedStates,
    setSelectedCities,
    setSelectedStores,

    // Utilities
    resetGeographyFilters,
    hasGeographyFilters,
    isLoading,
    dimensions,
  };
}

// Helper function to get geography filter labels for display
export function getGeographyFilterLabel(
  selectedRegions: string[],
  selectedStates: string[],
  selectedCities: string[],
  selectedStores: string[]
): string {
  if ((selectedStores ?? []).length > 0) {
    return selectedStores.length === 1
      ? selectedStores[0]
      : `${(selectedStores ?? []).length} stores`;
  }
  if ((selectedCities ?? []).length > 0) {
    return selectedCities.length === 1
      ? selectedCities[0]
      : `${(selectedCities ?? []).length} cities`;
  }
  if ((selectedStates ?? []).length > 0) {
    return selectedStates.length === 1
      ? selectedStates[0]
      : `${(selectedStates ?? []).length} states`;
  }
  if ((selectedRegions ?? []).length > 0) {
    return selectedRegions.length === 1
      ? selectedRegions[0]
      : `${(selectedRegions ?? []).length} regions`;
  }
  return 'All locations';
}
