'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { PriceHistoryPoint } from '@/app/lib/generate-product-pricing-detail';

interface PriceHistoryChartProps {
  data: PriceHistoryPoint[];
  currentPrice: number;
  recommendedPrice: number;
}

export default function PriceHistoryChart({
  data,
  currentPrice,
  recommendedPrice,
}: PriceHistoryChartProps) {
  const { minPrice, maxPrice } = useMemo(() => {
    const allPrices = data.flatMap((d) => [d.our_price, d.competitor_price, d.cost_price]);
    const min = Math.min(...allPrices, recommendedPrice);
    const max = Math.max(...allPrices, recommendedPrice);
    const padding = (max - min) * 0.1;
    return { minPrice: Math.floor(min - padding), maxPrice: Math.ceil(max + padding) };
  }, [data, recommendedPrice]);

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number; dataKey: string; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-[var(--border-default)]">
        <div className="text-sm font-medium text-[var(--text-primary)] mb-2">{label}</div>
        <div className="space-y-1.5">
          {(payload ?? []).map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.dataKey === 'our_price'
                  ? 'Our Price'
                  : entry.dataKey === 'competitor_price'
                    ? 'Competitor'
                    : entry.dataKey === 'cost_price'
                      ? 'Cost'
                      : entry.dataKey}
              </span>
              <span className="font-medium">₹{(entry.value ?? 0).toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100">
            <TrendingUp size={18} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Price History
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">12-month price trends</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-500 rounded" />
            Our Price
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber-500 rounded" />
            Competitor
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-gray-400 rounded" style={{ borderStyle: 'dashed' }} />
            Cost
          </span>
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
            <XAxis
              dataKey="month"
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border-subtle)' }}
              tickLine={false}
            />
            <YAxis
              domain={[minPrice, maxPrice]}
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `₹${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {/* Recommended price reference line */}
            <ReferenceLine
              y={recommendedPrice}
              stroke="#10B981"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: `Rec: ₹${recommendedPrice}`,
                position: 'right',
                fill: '#10B981',
                fontSize: 11,
              }}
            />

            <Line
              type="monotone"
              dataKey="cost_price"
              name="Cost"
              stroke="#9CA3AF"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="competitor_price"
              name="Competitor"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="our_price"
              name="Our Price"
              stroke="#3B82F6"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#3B82F6' }}
              activeDot={{ r: 5, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary stats */}
      <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[var(--border-subtle)]">
        <div>
          <div className="text-xs text-[var(--text-tertiary)]">Current Price</div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            ₹{(currentPrice ?? 0).toFixed(0)}
          </div>
        </div>
        <div className="h-8 w-px bg-[var(--border-subtle)]" />
        <div>
          <div className="text-xs text-[var(--text-tertiary)]">12M Avg Margin</div>
          <div className="text-sm font-semibold text-green-600">
            {(
              (data ?? []).reduce((sum, d) => sum + d.margin, 0) / (data ?? []).length
            ).toFixed(1)}
            %
          </div>
        </div>
        <div className="h-8 w-px bg-[var(--border-subtle)]" />
        <div>
          <div className="text-xs text-[var(--text-tertiary)]">vs Competitor (Avg)</div>
          <div
            className={`text-sm font-semibold ${
              data[(data ?? []).length - 1].our_price <= data[(data ?? []).length - 1].competitor_price
                ? 'text-green-600'
                : 'text-amber-600'
            }`}
          >
            {(
              ((data[(data ?? []).length - 1].our_price - data[(data ?? []).length - 1].competitor_price) /
                data[(data ?? []).length - 1].competitor_price) *
              100
            ).toFixed(1)}
            %
          </div>
        </div>
      </div>
    </div>
  );
}
