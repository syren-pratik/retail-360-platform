'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { CostPassthrough as CostPassthroughType } from '@/app/lib/price-types';

interface CostPassthroughProps {
  data: CostPassthroughType[];
}

export default function CostPassthrough({ data }: CostPassthroughProps) {
  const chartData = useMemo(() => {
    return (data ?? []).map(item => {
      const category = item.category ?? '';
      return {
        ...item,
        shortCategory: category.length > 10
          ? category.substring(0, 10) + '...'
          : category,
      };
    }).sort((a, b) => (a.passthrough_rate ?? 0) - (b.passthrough_rate ?? 0));
  }, [data]);

  // Find categories with margin erosion
  const marginErosionCount = (data ?? []).filter(d => (d.passthrough_rate ?? 0) < 50).length;

  const CustomTooltip = ({ active, payload }: {
    active?: boolean;
    payload?: Array<{ payload: CostPassthroughType & { shortCategory: string } }>;
  }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-[var(--border-default)]">
        <div className="text-sm font-medium text-[var(--text-primary)] mb-2">
          {d.category}
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-[var(--text-tertiary)]">Cost Change:</span>
            <span className="font-medium text-red-600">+{(d.cost_change_pct ?? 0).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[var(--text-tertiary)]">Price Change:</span>
            <span className="font-medium text-blue-600">+{(d.price_change_pct ?? 0).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between gap-4 pt-1 border-t border-[var(--border-subtle)]">
            <span className="text-[var(--text-tertiary)]">Passthrough Rate:</span>
            <span className={`font-medium ${d.passthrough_rate >= 80 ? 'text-green-600' : d.passthrough_rate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
              {(d.passthrough_rate ?? 0).toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[var(--text-tertiary)]">Margin Impact:</span>
            <span className={`font-medium ${d.margin_impact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {d.margin_impact >= 0 ? '+' : ''}{(d.margin_impact ?? 0).toFixed(1)}%
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
            Cost Passthrough Analysis
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            How much of cost increases are passed to consumers
          </p>
        </div>
        {marginErosionCount > 0 && (
          <div className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
            {marginErosionCount} categories eroding margins
          </div>
        )}
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          >
            <XAxis
              dataKey="shortCategory"
              tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
              axisLine={{ stroke: 'var(--border-subtle)' }}
              tickLine={false}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={50}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${value}%`}
              domain={[0, 'auto']}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${value}%`}
              domain={[0, 150]}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              yAxisId="right"
              y={100}
              stroke="#10B981"
              strokeDasharray="3 3"
              strokeWidth={2}
              label={{
                value: '100% passthrough',
                position: 'right',
                fill: 'var(--text-tertiary)',
                fontSize: 10,
              }}
            />
            <Bar
              yAxisId="left"
              dataKey="cost_change_pct"
              fill="#F87171"
              radius={[4, 4, 0, 0]}
              name="Cost Change %"
              barSize={16}
            />
            <Bar
              yAxisId="left"
              dataKey="price_change_pct"
              fill="#60A5FA"
              radius={[4, 4, 0, 0]}
              name="Price Change %"
              barSize={16}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="passthrough_rate"
              stroke="#8B5CF6"
              strokeWidth={3}
              dot={({ cx, cy, payload }) => {
                const rate = payload?.passthrough_rate ?? 0;
                const color = rate >= 80
                  ? '#10B981'
                  : rate >= 50
                    ? '#F59E0B'
                    : '#EF4444';
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={6}
                    fill={color}
                    stroke="white"
                    strokeWidth={2}
                  />
                );
              }}
              name="Passthrough Rate"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-[var(--text-tertiary)]">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-400" />
          Cost increase
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-blue-400" />
          Price increase
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-purple-500" />
          Passthrough rate
        </span>
      </div>
    </div>
  );
}
