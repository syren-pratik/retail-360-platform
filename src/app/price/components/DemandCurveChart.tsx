'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  CartesianGrid,
} from 'recharts';
import { Activity } from 'lucide-react';
import { DemandCurvePoint } from '@/app/lib/generate-product-pricing-detail';

interface DemandCurveChartProps {
  data: DemandCurvePoint[];
  currentPrice: number;
  elasticity: number;
}

export default function DemandCurveChart({
  data,
  currentPrice,
  elasticity,
}: DemandCurveChartProps) {
  const { optimalPoint, currentPoint, maxRevenue } = useMemo(() => {
    const optimal = data.find((d) => d.isOptimal);
    const current = data.find((d) => d.isCurrent);
    const maxRev = Math.max(...data.map((d) => d.revenue));
    return { optimalPoint: optimal, currentPoint: current, maxRevenue: maxRev };
  }, [data]);

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: DemandCurvePoint }>;
  }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-[var(--border-default)]">
        <div className="text-sm font-medium text-[var(--text-primary)] mb-2">
          Price: ₹{d.price}
          {d.isOptimal && (
            <span className="ml-2 text-xs text-green-600 font-normal">(Optimal)</span>
          )}
          {d.isCurrent && (
            <span className="ml-2 text-xs text-blue-600 font-normal">(Current)</span>
          )}
        </div>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-[var(--text-tertiary)]">Est. Daily Demand:</span>
            <span className="font-medium">{(d.demand ?? 0).toLocaleString()} units</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[var(--text-tertiary)]">Est. Daily Revenue:</span>
            <span className="font-medium">₹{(d.revenue ?? 0).toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  };

  const elasticityLabel =
    Math.abs(elasticity) < 0.5
      ? 'Highly Inelastic'
      : Math.abs(elasticity) < 1
        ? 'Inelastic'
        : Math.abs(elasticity) < 1.5
          ? 'Elastic'
          : 'Highly Elastic';

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100">
            <Activity size={18} className="text-purple-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Demand Curve
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Price-volume-revenue relationship
            </p>
          </div>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            Math.abs(elasticity) < 1
              ? 'bg-green-100 text-green-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          ε = {(elasticity ?? 0).toFixed(2)} ({elasticityLabel})
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />

            <XAxis
              dataKey="price"
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border-subtle)' }}
              tickLine={false}
              tickFormatter={(value) => `₹${value}`}
              label={{
                value: 'Price Point',
                position: 'bottom',
                offset: -5,
                style: { fill: 'var(--text-tertiary)', fontSize: 10 },
              }}
            />
            <YAxis
              yAxisId="demand"
              orientation="left"
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              label={{
                value: 'Demand (units)',
                angle: -90,
                position: 'insideLeft',
                style: { fill: 'var(--text-tertiary)', fontSize: 10 },
              }}
            />
            <YAxis
              yAxisId="revenue"
              orientation="right"
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              domain={[0, maxRevenue * 1.1]}
              tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
              label={{
                value: 'Revenue',
                angle: 90,
                position: 'insideRight',
                style: { fill: 'var(--text-tertiary)', fontSize: 10 },
              }}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Revenue Area */}
            <Area
              yAxisId="revenue"
              type="monotone"
              dataKey="revenue"
              stroke="#8B5CF6"
              strokeWidth={2}
              fill="url(#revenueGradient)"
              name="Revenue"
            />

            {/* Demand Line */}
            <Line
              yAxisId="demand"
              type="monotone"
              dataKey="demand"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              name="Demand"
            />

            {/* Optimal Point */}
            {optimalPoint && (
              <ReferenceDot
                yAxisId="revenue"
                x={optimalPoint.price}
                y={optimalPoint.revenue}
                r={8}
                fill="#10B981"
                stroke="#fff"
                strokeWidth={2}
              />
            )}

            {/* Current Point */}
            {currentPoint && (
              <ReferenceDot
                yAxisId="revenue"
                x={currentPoint.price}
                y={currentPoint.revenue}
                r={6}
                fill="#3B82F6"
                stroke="#fff"
                strokeWidth={2}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend and stats */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-subtle)]">
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            Current (₹{currentPrice})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            Revenue-Optimal
          </span>
        </div>

        {optimalPoint && currentPoint && (
          <div className="text-xs text-[var(--text-secondary)]">
            {optimalPoint.price > currentPrice ? (
              <span className="text-green-600">
                +₹{(optimalPoint.price - currentPrice).toFixed(0)} to optimal revenue
              </span>
            ) : optimalPoint.price < currentPrice ? (
              <span className="text-amber-600">
                -₹{(currentPrice - optimalPoint.price).toFixed(0)} to optimal revenue
              </span>
            ) : (
              <span className="text-green-600">Currently at optimal price</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
