'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { PriceRecommendation } from '@/app/lib/price-types';

interface PriceWaterfallProps {
  recommendations: PriceRecommendation[];
  onProductClick?: (productId: string) => void;
}

function truncateName(name: string, maxLength: number = 15): string {
  if (name.length <= maxLength) return name;
  return (name ?? '').substring(0, maxLength) + '...';
}

function formatCurrency(value: number): string {
  return `₹${(value ?? 0).toLocaleString('en-IN')}`;
}

export default function PriceWaterfall({ recommendations, onProductClick }: PriceWaterfallProps) {
  // Get top 10 products by absolute revenue impact, sorted by impact
  const chartData = useMemo(() => {
    const sorted = [...(recommendations ?? [])]
      .map(r => ({
        ...r,
        // Convert string values to numbers (handles scientific notation)
        current_price: Number(r.current_price) || 0,
        recommended_price: Number(r.recommended_price) || 0,
        price_change_pct: Number(r.price_change_pct) || 0,
        revenue_impact: Number(r.revenue_impact) || 0,
      }))
      .filter(r => Math.abs(r.revenue_impact) > 0)
      .sort((a, b) => Math.abs(b.revenue_impact) - Math.abs(a.revenue_impact))
      .slice(0, 10);

    return sorted.map(r => ({
      product_id: r.product_id,
      name: truncateName(r.product_name ?? ''),
      fullName: r.product_name ?? '',
      current_price: r.current_price,
      recommended_price: r.recommended_price,
      change: r.recommended_price - r.current_price,
      change_pct: r.price_change_pct,
      revenue_impact: r.revenue_impact,
      // For waterfall: base is min(current, recommended), height is absolute change
      base: Math.min(r.current_price, r.recommended_price),
      height: Math.abs(r.recommended_price - r.current_price),
      isIncrease: r.price_change_pct > 0,
    }));
  }, [recommendations]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof chartData[0] }> }) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-[var(--border-default)]">
        <div className="text-sm font-medium text-[var(--text-primary)] mb-2">
          {data.fullName}
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-[var(--text-tertiary)]">Current:</span>
            <span className="font-medium">{formatCurrency(data.current_price)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[var(--text-tertiary)]">Recommended:</span>
            <span className="font-medium">{formatCurrency(data.recommended_price)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[var(--text-tertiary)]">Change:</span>
            <span className={`font-medium ${data.isIncrease ? 'text-green-600' : 'text-red-600'}`}>
              {data.isIncrease ? '+' : ''}{(data.change_pct ?? 0).toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between gap-4 pt-1 border-t border-[var(--border-subtle)]">
            <span className="text-[var(--text-tertiary)]">Revenue Impact:</span>
            <span className={`font-medium ${data.revenue_impact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.revenue_impact >= 0 ? '+' : ''}₹{(data.revenue_impact / 1000).toFixed(0)}K
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Top Price Recommendations
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Top 10 products by revenue impact
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-green-500" />
            Increase
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-500" />
            Decrease
          </span>
        </div>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
          >
            <XAxis
              type="number"
              domain={[0, 'auto']}
              tickFormatter={(value) => `₹${value}`}
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border-subtle)' }}
              tickLine={false}
            />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={90}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Base bar (transparent spacer up to current/recommended price) */}
            <Bar
              dataKey="base"
              stackId="stack"
              fill="transparent"
              radius={0}
            />

            {/* Change bar (colored portion showing the change) */}
            <Bar
              dataKey="height"
              stackId="stack"
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              onClick={(_, index) => onProductClick?.(chartData[index].product_id)}
            >
              {(chartData ?? []).map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.isIncrease ? '#10B981' : '#EF4444'}
                />
              ))}
            </Bar>

            {/* Reference lines for current prices */}
            {(chartData ?? []).map((entry, index) => (
              <ReferenceLine
                key={index}
                x={entry.current_price}
                stroke="#94A3B8"
                strokeWidth={2}
                strokeDasharray="3 3"
                segment={[
                  { y: index - 0.4 },
                  { y: index + 0.4 }
                ]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 text-xs text-[var(--text-tertiary)] text-center">
        Dashed lines indicate current prices. Click on a bar to view product details.
      </div>
    </div>
  );
}
