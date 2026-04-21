'use client';

import { useMemo, useCallback } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useRouter } from 'next/navigation';
import ChartCard from '@/app/components/charts/ChartCard';
import { NoDataFallback } from '@/app/components/ui/NoDataFallback';

interface HealthMatrixPoint {
  product_id: string;
  product_name: string;
  store_id: string;
  store_name: string;
  department: string;
  category: string;
  abc_class: string;
  current_stock: number;
  avg_daily_demand: number;
  days_of_supply: number;
  inventory_value: number;
  status: 'stockout' | 'critical' | 'low' | 'healthy' | 'overstock' | 'deadstock';
  stockout_flag: boolean;
  overstock_flag: boolean;
}

interface InventoryHealthMatrixProps {
  data: HealthMatrixPoint[];
  onQuadrantClick?: (status: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  stockout: '#DC2626',    // Red
  critical: '#EA580C',    // Dark Orange
  low: '#F59E0B',         // Amber
  healthy: '#22C55E',     // Green
  overstock: '#3B82F6',   // Blue
  deadstock: '#6B7280',   // Gray
};

const STATUS_LABELS: Record<string, string> = {
  stockout: 'Stockout',
  critical: 'Critical',
  low: 'Low Stock',
  healthy: 'Healthy',
  overstock: 'Overstock',
  deadstock: 'Deadstock',
};

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: HealthMatrixPoint }> }) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg shadow-lg p-3 max-w-xs">
      <p className="font-semibold text-sm text-[var(--text-primary)] mb-1">
        {data.product_name}
      </p>
      <p className="text-xs text-[var(--text-secondary)] mb-2">{data.store_name}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-[var(--text-tertiary)]">Stock:</span>
        <span className="text-[var(--text-primary)] font-medium">{(data.current_stock ?? 0).toLocaleString()}</span>

        <span className="text-[var(--text-tertiary)]">DOS:</span>
        <span className="text-[var(--text-primary)] font-medium">{(data.days_of_supply ?? 0)} days</span>

        <span className="text-[var(--text-tertiary)]">Demand:</span>
        <span className="text-[var(--text-primary)] font-medium">{(data.avg_daily_demand ?? 0)}/day</span>

        <span className="text-[var(--text-tertiary)]">Value:</span>
        <span className="text-[var(--text-primary)] font-medium">₹{((data.inventory_value ?? 0) / 1000).toFixed(1)}K</span>

        <span className="text-[var(--text-tertiary)]">Status:</span>
        <span
          className="font-medium"
          style={{ color: STATUS_COLORS[data.status] }}
        >
          {STATUS_LABELS[data.status]}
        </span>
      </div>
    </div>
  );
}

export default function InventoryHealthMatrix({ data, onQuadrantClick }: InventoryHealthMatrixProps) {
  const router = useRouter();

  // Calculate stats for the legend
  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of (data ?? [])) {
      counts[d.status] = (counts[d.status] || 0) + 1;
    }
    return counts;
  }, [data]);

  // Prepare chart data with capped DOS for visualization
  const chartData = useMemo(() => {
    return (data ?? []).map(d => ({
      ...d,
      // Cap DOS at 90 for visualization
      x: Math.min(d.days_of_supply ?? 0, 90),
      y: d.avg_daily_demand ?? 0,
      // Scale bubble size (sqrt to prevent huge bubbles)
      z: Math.sqrt(d.inventory_value ?? 0) / 10,
    }));
  }, [data]);

  const handleDotClick = useCallback((data: HealthMatrixPoint) => {
    router.push(`/inventory/product/${data.product_id}`);
  }, [router]);

  // Guard against null/undefined data - after all hooks
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <NoDataFallback title="No data" message="Data is not available." />;
  }

  return (
    <ChartCard
      id="health-matrix"
      title="Inventory Health Matrix"
      subtitle="SKU-Store combinations by Days of Supply vs Demand"
      height={450}
      data={data as unknown as Record<string, unknown>[]}
    >
      <div className="relative h-full">
        {/* Quadrant labels */}
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Stockout/Critical zone label - left side */}
          <button
            onClick={() => onQuadrantClick?.('critical')}
            className="absolute left-16 top-4 bg-red-100 text-red-700 text-xs font-medium px-2 py-1 rounded pointer-events-auto hover:bg-red-200 transition-colors"
          >
            🔴 Critical ({stats.stockout || 0} + {stats.critical || 0})
          </button>

          {/* Low stock zone label */}
          <button
            onClick={() => onQuadrantClick?.('low')}
            className="absolute left-[25%] top-4 bg-amber-100 text-amber-700 text-xs font-medium px-2 py-1 rounded pointer-events-auto hover:bg-amber-200 transition-colors"
          >
            ⚠️ Low ({stats.low || 0})
          </button>

          {/* Healthy zone label - middle */}
          <button
            onClick={() => onQuadrantClick?.('healthy')}
            className="absolute left-[45%] top-4 bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded pointer-events-auto hover:bg-green-200 transition-colors"
          >
            ✅ Healthy ({stats.healthy || 0})
          </button>

          {/* Overstock zone label - right side */}
          <button
            onClick={() => onQuadrantClick?.('overstock')}
            className="absolute right-16 top-4 bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded pointer-events-auto hover:bg-blue-200 transition-colors"
          >
            📦 Overstock ({(stats.overstock || 0) + (stats.deadstock || 0)})
          </button>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 40, right: 20, bottom: 40, left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />

            <XAxis
              type="number"
              dataKey="x"
              name="Days of Supply"
              domain={[0, 90]}
              tickFormatter={(val) => val === 90 ? '90+' : val.toString()}
              label={{
                value: 'Days of Supply',
                position: 'bottom',
                offset: 0,
                style: { fill: 'var(--text-secondary)', fontSize: 12 }
              }}
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
            />

            <YAxis
              type="number"
              dataKey="y"
              name="Avg Daily Demand"
              label={{
                value: 'Avg Daily Demand',
                angle: -90,
                position: 'insideLeft',
                style: { fill: 'var(--text-secondary)', fontSize: 12 }
              }}
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
            />

            <ZAxis
              type="number"
              dataKey="z"
              range={[20, 200]}
              name="Inventory Value"
            />

            {/* Reference lines for stock level thresholds */}
            <ReferenceLine
              x={7}
              stroke="#DC2626"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{ value: '7d', position: 'top', fill: '#DC2626', fontSize: 10 }}
            />
            <ReferenceLine
              x={30}
              stroke="#3B82F6"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{ value: '30d', position: 'top', fill: '#3B82F6', fontSize: 10 }}
            />

            <Tooltip content={<CustomTooltip />} />

            <Scatter
              data={chartData}
              isAnimationActive={false}
              onClick={(data) => handleDotClick(data as unknown as HealthMatrixPoint)}
              style={{ cursor: 'pointer' }}
            >
              {(chartData ?? []).map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={STATUS_COLORS[entry.status] ?? '#6B7280'}
                  fillOpacity={entry.status === 'stockout' ? 1 : 0.7}
                  stroke={entry.status === 'stockout' ? '#991B1B' : undefined}
                  strokeWidth={entry.status === 'stockout' ? 2 : 0}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-white/90 px-3 py-1.5 rounded-full border border-[var(--border-subtle)]">
          {Object.entries(STATUS_LABELS).map(([status, label]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[status] }}
              />
              <span className="text-xs text-[var(--text-secondary)]">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}
