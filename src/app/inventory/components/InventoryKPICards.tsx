'use client';


import { formatCrOrUsdMAuto, formatLOrUsdKAuto, formatMoneyPlainAuto } from '@/app/lib/format-money';
import KPICard from '@/app/components/kpi/KPICard';
import { safeNumber, safeArray } from '@/app/lib/safe-data';
import { ChartEmptyState } from '@/app/components/ui/ChartEmptyState';

interface KPIData {
  value: number;
  prior: number;
  unit: string;
  label: string;
  direction?: 'higher_better' | 'lower_better' | 'target_range';
  target?: [number, number];
}

interface InventoryKPIs {
  osa: KPIData;
  stockout_rate: KPIData;
  avg_dos: KPIData;
  fill_rate: KPIData;
  inventory_value: KPIData;
  lost_sales: KPIData;
  sparklines?: {
    osa?: number[];
    stockout_rate?: number[];
    avg_dos?: number[];
    fill_rate?: number[];
    inventory_value?: number[];
    lost_sales?: number[];
  };
}

interface InventoryKPICardsProps {
  data: InventoryKPIs | null | undefined;
}

function formatValue(value: number, unit: string): string {
  if (unit === '₹') {
    if (value >= 10000000) {
      return `${formatCrOrUsdMAuto((value / 10000000).toFixed(1))}`;
    }
    if (value >= 100000) {
      return `${formatLOrUsdKAuto((value / 100000).toFixed(1))}`;
    }
    return formatMoneyPlainAuto(value ?? 0);
  }
  if (unit === '%') {
    return `${(value ?? 0).toFixed(1)}%`;
  }
  if (unit === 'days') {
    return `${(value ?? 0).toFixed(1)} days`;
  }
  return (value ?? 0).toLocaleString();
}

function calculateChange(current: number, prior: number): number {
  if (prior === 0) return 0;
  return ((current - prior) / prior) * 100;
}

// Safely extract KPI data with fallbacks
function getKPIData(data: InventoryKPIs | null | undefined, key: keyof Omit<InventoryKPIs, 'sparklines'>): KPIData {
  const defaultKPI: KPIData = {
    value: 0,
    prior: 0,
    unit: '',
    label: key.replace(/_/g, ' ').replace(/\b\w/g, c => (c ?? '').toUpperCase()),
  };

  if (!data) return defaultKPI;

  const kpi = data[key];
  if (!kpi || typeof kpi !== 'object') return defaultKPI;

  return {
    value: safeNumber(kpi.value, 0),
    prior: safeNumber(kpi.prior, 0),
    unit: kpi.unit || '',
    label: kpi.label || defaultKPI.label,
    direction: kpi.direction,
    target: kpi.target,
  };
}

export default function InventoryKPICards({ data }: InventoryKPICardsProps) {
  // Loading state
  if (data === undefined) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card h-28 animate-pulse bg-gray-100" />
        ))}
      </div>
    );
  }

  // No data state
  if (!data) {
    return (
      <ChartEmptyState
        message="Inventory KPIs unavailable"
        suggestion="Try refreshing the cache from Settings"
        height="h-28"
      />
    );
  }

  // Check if we have at least one valid KPI
  const hasValidData = data.osa || data.stockout_rate || data.avg_dos || data.fill_rate;
  if (!hasValidData) {
    return (
      <ChartEmptyState
        message="Invalid KPI data format"
        suggestion="The data structure doesn't match expected format"
        height="h-28"
      />
    );
  }

  // Safely get sparklines with fallback to empty arrays
  const sparklines = data.sparklines || {};

  const kpis = [
    {
      key: 'osa',
      data: getKPIData(data, 'osa'),
      sparkline: safeArray<number>(sparklines.osa, []),
      invertColors: false,
    },
    {
      key: 'stockout_rate',
      data: getKPIData(data, 'stockout_rate'),
      sparkline: safeArray<number>(sparklines.stockout_rate, []),
      invertColors: true, // Lower is better
    },
    {
      key: 'avg_dos',
      data: getKPIData(data, 'avg_dos'),
      sparkline: safeArray<number>(sparklines.avg_dos, []),
      invertColors: false,
    },
    {
      key: 'fill_rate',
      data: getKPIData(data, 'fill_rate'),
      sparkline: safeArray<number>(sparklines.fill_rate, []),
      invertColors: false,
    },
    {
      key: 'inventory_value',
      data: getKPIData(data, 'inventory_value'),
      sparkline: safeArray<number>(sparklines.inventory_value, []),
      invertColors: false,
    },
    {
      key: 'lost_sales',
      data: getKPIData(data, 'lost_sales'),
      sparkline: safeArray<number>(sparklines.lost_sales, []),
      invertColors: true, // Lower is better
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {(kpis ?? []).map((kpi) => (
        <KPICard
          key={kpi.key}
          label={kpi.data.label}
          value={formatValue(kpi.data.value, kpi.data.unit)}
          change={calculateChange(kpi.data.value, kpi.data.prior)}
          changeLabel="vs prior period"
          invertColors={kpi.invertColors}
          sparklineData={kpi.sparkline}
        />
      ))}
    </div>
  );
}
