'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface PriceIntelFilters {
  department: string;
}

interface PriceIntelFilterContextValue {
  filters: PriceIntelFilters;
  setDepartment: (dept: string) => void;
}

const PriceIntelFilterContext = createContext<PriceIntelFilterContextValue | null>(null);

export function PriceIntelFilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<PriceIntelFilters>({ department: 'all' });

  const setDepartment = useCallback((dept: string) => {
    setFilters((f) => ({ ...f, department: dept }));
  }, []);

  return (
    <PriceIntelFilterContext.Provider value={{ filters, setDepartment }}>
      {children}
    </PriceIntelFilterContext.Provider>
  );
}

export function usePriceIntelFilters(): PriceIntelFilterContextValue {
  const ctx = useContext(PriceIntelFilterContext);
  if (!ctx) throw new Error('usePriceIntelFilters must be used within PriceIntelFilterProvider');
  return ctx;
}
