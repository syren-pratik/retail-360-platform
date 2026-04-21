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
  LabelList,
} from 'recharts';
import { Users } from 'lucide-react';
import { CompetitorPrice } from '@/app/lib/generate-product-pricing-detail';

interface CompetitorComparisonProps {
  data: CompetitorPrice[];
  currentPrice: number;
}

export default function CompetitorComparison({
  data,
  currentPrice,
}: CompetitorComparisonProps) {
  const chartData = useMemo(() => {
    // Add our product to the comparison
    const allData = [
      { competitor: 'You', price: currentPrice, diff_pct: 0, isOurs: true },
      ...data.map((d) => ({ ...d, isOurs: false })),
    ];

    // Sort by price
    return allData.sort((a, b) => a.price - b.price);
  }, [data, currentPrice]);

  const avgCompetitorPrice = useMemo(() => {
    const competitorPrices = data.map((d) => d.price);
    return (competitorPrices ?? []).reduce((sum, p) => sum + p, 0) / (competitorPrices ?? []).length;
  }, [data]);

  const competitivePosition = useMemo(() => {
    const diff = ((currentPrice - avgCompetitorPrice) / avgCompetitorPrice) * 100;
    if (diff < -5) return { label: 'Price Leader', color: 'text-green-600', bg: 'bg-green-100' };
    if (diff < 2) return { label: 'Competitive', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (diff < 8) return { label: 'Premium', color: 'text-amber-600', bg: 'bg-amber-100' };
    return { label: 'High Premium', color: 'text-red-600', bg: 'bg-red-100' };
  }, [currentPrice, avgCompetitorPrice]);

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: (typeof chartData)[0] }>;
  }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-[var(--border-default)]">
        <div className="text-sm font-medium text-[var(--text-primary)] mb-2">
          {d.competitor}
          {d.isOurs && <span className="ml-2 text-xs text-blue-600">(Your Price)</span>}
        </div>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-[var(--text-tertiary)]">Price:</span>
            <span className="font-medium">₹{d.price}</span>
          </div>
          {!d.isOurs && (
            <div className="flex justify-between gap-4">
              <span className="text-[var(--text-tertiary)]">vs Your Price:</span>
              <span
                className={`font-medium ${
                  d.diff_pct < 0 ? 'text-red-600' : d.diff_pct > 0 ? 'text-green-600' : ''
                }`}
              >
                {d.diff_pct > 0 ? '+' : ''}
                {(d.diff_pct ?? 0).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100">
            <Users size={18} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Competitor Prices
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">Market price comparison</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${competitivePosition.bg} ${competitivePosition.color}`}>
          {competitivePosition.label}
        </span>
      </div>

      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 60, left: 80, bottom: 10 }}
          >
            <XAxis
              type="number"
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border-subtle)' }}
              tickLine={false}
              tickFormatter={(value) => `₹${value}`}
            />
            <YAxis
              type="category"
              dataKey="competitor"
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Reference line for our price */}
            <ReferenceLine
              x={currentPrice}
              stroke="#3B82F6"
              strokeDasharray="5 5"
              strokeWidth={2}
            />

            <Bar dataKey="price" radius={[0, 4, 4, 0]} maxBarSize={30}>
              {(chartData ?? []).map((entry, index) => (
                <Cell
                  key={index}
                  fill={
                    entry.isOurs
                      ? '#3B82F6'
                      : entry.price < currentPrice
                        ? '#EF4444'
                        : entry.price > currentPrice
                          ? '#10B981'
                          : '#94A3B8'
                  }
                />
              ))}
              <LabelList
                dataKey="price"
                position="right"
                formatter={(value) => `₹${value}`}
                style={{ fill: 'var(--text-secondary)', fontSize: 11 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Price comparison summary */}
      <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-xs text-[var(--text-tertiary)]">Your Price</div>
            <div className="text-lg font-semibold text-blue-600">₹{currentPrice}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-[var(--text-tertiary)]">Competitor Avg</div>
            <div className="text-lg font-semibold text-[var(--text-primary)]">
              ₹{(avgCompetitorPrice ?? 0).toFixed(0)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-[var(--text-tertiary)]">Price Index</div>
            <div
              className={`text-lg font-semibold ${
                currentPrice <= avgCompetitorPrice ? 'text-green-600' : 'text-amber-600'
              }`}
            >
              {((currentPrice / avgCompetitorPrice) * 100).toFixed(0)}
            </div>
          </div>
        </div>
      </div>

      {/* Competitor breakdown */}
      <div className="mt-4 space-y-2">
        {(data ?? []).map((comp) => (
          <div
            key={comp.competitor}
            className="flex items-center justify-between p-2 rounded hover:bg-[var(--bg-secondary)]"
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  comp.price < currentPrice
                    ? 'bg-red-500'
                    : comp.price > currentPrice
                      ? 'bg-green-500'
                      : 'bg-gray-400'
                }`}
              />
              <span className="text-sm text-[var(--text-primary)]">{comp.competitor}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-[var(--text-primary)]">₹{comp.price}</span>
              <span
                className={`text-xs font-medium ${
                  comp.diff_pct < 0
                    ? 'text-red-600'
                    : comp.diff_pct > 0
                      ? 'text-green-600'
                      : 'text-gray-500'
                }`}
              >
                {comp.diff_pct > 0 ? '+' : ''}
                {(comp.diff_pct ?? 0).toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
