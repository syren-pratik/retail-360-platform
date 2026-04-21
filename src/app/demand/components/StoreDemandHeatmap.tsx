'use client';

import { useMemo } from 'react';
import { Maximize2 } from 'lucide-react';
import { StoreDemandData } from '@/app/lib/demand-types';
import { useDemand } from '@/app/context/DemandContext';
import { NoDataFallback } from '@/app/components/ui/NoDataFallback';

interface StoreDemandHeatmapProps {
  data: StoreDemandData[];
  departments: string[];
}

// Color scale for heatmap
const getHeatmapColor = (value: number, min: number, max: number): string => {
  const normalized = (value - min) / (max - min);
  if (normalized >= 0.8) return 'bg-blue-700 text-white';
  if (normalized >= 0.6) return 'bg-blue-500 text-white';
  if (normalized >= 0.4) return 'bg-blue-400 text-white';
  if (normalized >= 0.2) return 'bg-blue-200 text-blue-800';
  return 'bg-blue-50 text-blue-600';
};

export default function StoreDemandHeatmap({ data, departments }: StoreDemandHeatmapProps) {
  const { addDrilldown, setFilters } = useDemand();
  const safeData = data ?? [];
  const safeDepartments = departments ?? [];

  // Group data by store
  const storeData = useMemo(() => {
    const storeMap = new Map<string, { store: string; city: string; demands: Map<string, number> }>();

    (safeData ?? []).forEach(item => {
      if (!storeMap.has(item.store_id)) {
        storeMap.set(item.store_id, {
          store: item.store_name,
          city: item.city,
          demands: new Map()
        });
      }
      storeMap.get(item.store_id)!.demands.set(item.department, item.avg_daily_demand);
    });

    return Array.from(storeMap.entries()).map(([id, storeInfo]) => ({
      store_id: id,
      ...storeInfo
    }));
  }, [safeData]);

  // Get min/max for color scaling
  const { minDemand, maxDemand } = useMemo(() => {
    if (safeData.length === 0) return { minDemand: 0, maxDemand: 1 };
    const demands = safeData.map(d => d.avg_daily_demand ?? 0);
    return {
      minDemand: Math.min(...demands),
      maxDemand: Math.max(...demands)
    };
  }, [safeData]);

  // Sort stores by total demand
  const sortedStores = useMemo(() => {
    return [...(storeData ?? [])].sort((a, b) => {
      const totalA = Array.from(a.demands.values()).reduce((sum, v) => sum + v, 0);
      const totalB = Array.from(b.demands.values()).reduce((sum, v) => sum + v, 0);
      return totalB - totalA;
    });
  }, [storeData]);

  // Guard against null/undefined data - after all hooks
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <NoDataFallback title="No store demand data" message="Store demand heatmap data is not available." />;
  }

  const handleCellClick = (storeId: string, storeName: string, department: string) => {
    setFilters({ stores: [storeId], departments: [department] });
    addDrilldown({
      source: 'store_demand_heatmap',
      field: 'store_department',
      value: `${storeId}_${department}`,
      label: `${storeName} - ${department}`
    });
  };

  const formatDemand = (value: number): string => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  return (
    <div className="card h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Store Demand Heatmap
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Average daily demand by store and department
          </p>
        </div>
        <button
          className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
          title="Expand"
        >
          <Maximize2 size={16} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left py-2 px-2 font-medium text-[var(--text-secondary)] sticky left-0 bg-white">
                Store
              </th>
              {(safeDepartments ?? []).map(dept => (
                <th key={dept} className="text-center py-2 px-1 font-medium text-[var(--text-secondary)] whitespace-nowrap">
                  {(dept ?? []).length > 8 ? (dept ?? '').substring(0, 8) + '...' : dept}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(sortedStores ?? []).slice(0, 12).map((store, i) => (
              <tr key={store.store_id} className={i % 2 === 0 ? 'bg-[var(--bg-secondary)]' : ''}>
                <td className="py-1.5 px-2 font-medium text-[var(--text-primary)] sticky left-0 bg-inherit">
                  <div className="truncate max-w-[120px]" title={store.store}>
                    {store.store}
                  </div>
                  <div className="text-[var(--text-tertiary)] text-[10px]">{store.city}</div>
                </td>
                {(safeDepartments ?? []).map(dept => {
                  const demand = store.demands.get(dept) || 0;
                  return (
                    <td
                      key={dept}
                      className={`text-center py-1.5 px-1 cursor-pointer transition-opacity hover:opacity-80 ${getHeatmapColor(demand, minDemand, maxDemand)}`}
                      onClick={() => handleCellClick(store.store_id, store.store, dept)}
                      title={`${store.store} - ${dept}: ${(demand ?? 0).toLocaleString('en-IN')} units/day`}
                    >
                      {formatDemand(demand)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
          <span>Lower demand</span>
          <div className="flex gap-1">
            <div className="w-6 h-3 rounded-sm bg-blue-50" />
            <div className="w-6 h-3 rounded-sm bg-blue-200" />
            <div className="w-6 h-3 rounded-sm bg-blue-400" />
            <div className="w-6 h-3 rounded-sm bg-blue-500" />
            <div className="w-6 h-3 rounded-sm bg-blue-700" />
          </div>
          <span>Higher demand</span>
        </div>
      </div>
    </div>
  );
}
