'use client';

import { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { PriceRecommendation } from '@/app/lib/price-types';

interface RevenueImpactScatterProps {
  recommendations: PriceRecommendation[];
  onProductClick?: (productId: string) => void;
}

const priorityColors = {
  High: '#EF4444',
  Medium: '#F59E0B',
  Low: '#10B981',
};

function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (absValue >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return `₹${(value ?? 0).toLocaleString('en-IN')}`;
}

export default function RevenueImpactScatter({ recommendations, onProductClick }: RevenueImpactScatterProps) {
  const chartData = useMemo(() => {
    return (recommendations ?? [])
      .map(r => ({
        product_id: r.product_id,
        product_name: r.product_name ?? '',
        department: r.department ?? '',
        price_change_pct: Number(r.price_change_pct) || 0,
        revenue_impact: Number(r.revenue_impact) || 0,
        transactions: Number(r.total_transactions) || 0,
        priority: r.recommendation_priority || 'Low',
        current_price: Number(r.current_price) || 0,
        recommended_price: Number(r.recommended_price) || 0,
      }))
      .filter(r => Math.abs(r.price_change_pct) > 0.5 || Math.abs(r.revenue_impact) > 1000);
  }, [recommendations]);

  // Calculate domain for better visualization
  const xDomain = useMemo(() => {
    const values = chartData.map(d => d.price_change_pct);
    const min = Math.min(...values, -15);
    const max = Math.max(...values, 15);
    return [min - 2, max + 2];
  }, [chartData]);

  const yDomain = useMemo(() => {
    const values = chartData.map(d => d.revenue_impact);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1;
    return [min - padding, max + padding];
  }, [chartData]);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof chartData[0] }> }) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-[var(--border-default)] max-w-xs">
        <div className="text-sm font-medium text-[var(--text-primary)] mb-2">
          {data.product_name}
        </div>
        <div className="text-xs text-[var(--text-tertiary)] mb-2">
          {data.department}
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-[var(--text-tertiary)]">Price Change:</span>
            <span className={`font-medium ${data.price_change_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.price_change_pct >= 0 ? '+' : ''}{(data.price_change_pct ?? 0).toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[var(--text-tertiary)]">Revenue Impact:</span>
            <span className={`font-medium ${data.revenue_impact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(data.revenue_impact)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[var(--text-tertiary)]">Transactions:</span>
            <span className="font-medium">{(data.transactions ?? 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[var(--text-tertiary)]">Priority:</span>
            <span
              className="font-medium px-1.5 py-0.5 rounded text-white"
              style={{ backgroundColor: priorityColors[data.priority] }}
            >
              {data.priority}
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
            Price Change vs Revenue Impact
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Bubble size indicates transaction volume
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            High
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            Medium
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            Low
          </span>
        </div>
      </div>

      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{ top: 20, right: 20, bottom: 30, left: 50 }}
          >
            <XAxis
              type="number"
              dataKey="price_change_pct"
              domain={xDomain}
              name="Price Change"
              unit="%"
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border-subtle)' }}
              tickLine={false}
              label={{
                value: 'Price Change %',
                position: 'bottom',
                offset: 10,
                style: { fill: 'var(--text-secondary)', fontSize: 11 }
              }}
            />
            <YAxis
              type="number"
              dataKey="revenue_impact"
              domain={yDomain}
              name="Revenue Impact"
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border-subtle)' }}
              tickLine={false}
              tickFormatter={(value) => formatCurrency(value)}
              label={{
                value: 'Revenue Impact',
                angle: -90,
                position: 'insideLeft',
                offset: -35,
                style: { fill: 'var(--text-secondary)', fontSize: 11 }
              }}
            />
            <ZAxis
              type="number"
              dataKey="transactions"
              range={[50, 400]}
              name="Transactions"
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Reference lines for quadrants */}
            <ReferenceLine x={0} stroke="var(--border-default)" strokeDasharray="3 3" />
            <ReferenceLine y={0} stroke="var(--border-default)" strokeDasharray="3 3" />

            <Scatter
              data={chartData}
              cursor="pointer"
              onClick={(data) => {
                const payload = data as unknown as { payload?: { product_id?: string } };
                if (payload.payload?.product_id) {
                  onProductClick?.(payload.payload.product_id);
                }
              }}
            >
              {(chartData ?? []).map((entry, index) => (
                <Cell
                  key={index}
                  fill={priorityColors[entry.priority]}
                  fillOpacity={0.7}
                  stroke={priorityColors[entry.priority]}
                  strokeWidth={1}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Quadrant labels */}
      <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-center text-[var(--text-tertiary)]">
        <div className="p-1 bg-red-50 rounded">
          ← Decrease price, lose revenue
        </div>
        <div className="p-1 bg-green-50 rounded">
          Increase price, gain revenue →
        </div>
      </div>
    </div>
  );
}
