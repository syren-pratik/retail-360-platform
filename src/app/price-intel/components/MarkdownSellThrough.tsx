'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import PriceIntelChartCard from './PriceIntelChartCard';
import type { PriceIntelKPIs, PriceIntelTrend12WPoint } from '@/app/lib/price-intel-types';

interface Props {
  kpis: PriceIntelKPIs;
  trend12w: PriceIntelTrend12WPoint[];
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const st = payload.find((p) => p.dataKey === 'sell_through');
  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-lg text-xs">
      <p className="font-medium text-[var(--text-primary)] mb-1">Week {label}</p>
      {st && <p className="text-[var(--text-secondary)]">Sell-Through: <span className="font-medium text-[var(--text-primary)]">{st.value.toFixed(1)}%</span></p>}
    </div>
  );
};

export default function MarkdownSellThrough({ kpis, trend12w }: Props) {
  const data = trend12w.map((p) => ({
    week: p.week,
    sell_through: p.sell_through,
  }));

  const currentST = kpis.sell_through_pct;
  const targetST = kpis.sell_through_pct - kpis.sell_through_vs_target;
  const gap = kpis.sell_through_vs_target;

  return (
    <PriceIntelChartCard
      data={data as unknown as Record<string, unknown>[]}
      id="price-intel-sell-through"
      title="Sell-Through Trend"
      subtitle={`Current: ${currentST.toFixed(1)}% · vs target: ${gap > 0 ? '+' : ''}${gap.toFixed(1)}pp`}
      height={240}
      exportFilename="price_intel_sell_through"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id="stGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="week"
            tickFormatter={(v: number) => `W${v}`}
            tick={{ fontSize: 10, fill: '#111827' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
            tick={{ fontSize: 10, fill: '#111827' }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={targetST}
            stroke="#10B981"
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{ value: 'Target', position: 'insideTopRight', fontSize: 10, fill: '#10B981' }}
          />
          <Area
            dataKey="sell_through"
            stroke="#6366F1"
            strokeWidth={2}
            fill="url(#stGrad)"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </PriceIntelChartCard>
  );
}
