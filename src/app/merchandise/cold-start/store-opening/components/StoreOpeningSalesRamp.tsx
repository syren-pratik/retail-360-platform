'use client';

import { TrendingUp } from 'lucide-react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend, ResponsiveContainer,
} from 'recharts';
import ChartCard from '@/app/components/charts/ChartCard';
import { formatLakhsCrores } from '@/app/lib/merch-format';
import type { StoreOpeningRamp, StoreOpeningHeader as HeaderT } from '@/app/lib/store-opening-types';
import StoreOpeningStoreCard from './StoreOpeningStoreCard';

interface Props {
  ramp: StoreOpeningRamp;
  header: HeaderT;
}

export default function StoreOpeningSalesRamp({ ramp, header }: Props) {
  // For stacked-area "band" trick: area expects two stacked positive values.
  // We pass low + (high - low) per series.
  const chartData = ramp.points.map((p) => ({
    week_label: p.week_label,
    week: p.week,
    point: p.point_forecast_inr,
    actual: p.actual_sales_inr,
    cold_lower: p.cold_lower_inr,
    cold_span: Math.max(0, p.cold_upper_inr - p.cold_lower_inr),
    comp_lower: p.comp_lower_inr,
    comp_span: Math.max(0, p.comp_upper_inr - p.comp_lower_inr),
  }));

  const ticks = [1, 9, 17, 25, 33, 41, 49];

  return (
    <ChartCard
      id="store-opening-sales-ramp"
      title="Store Sales Ramp — first 52 weeks"
      subtitle="Weekly net sales. No in-market history at opening, so the interval starts wide and tightens as local sell-through accrues."
      height={460}
      data={chartData as unknown as Record<string, unknown>[]}
      exportFilename="store-opening-ramp"
    >
      <div className="flex flex-col h-full gap-3">
        <StoreOpeningStoreCard header={header} />

        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 24, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="week"
                ticks={ticks}
                tickFormatter={(v) => `W${v}`}
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => formatLakhsCrores(Number(v))}
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
                width={70}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #E2E8F0' }}
                formatter={(value) => {
                  const n = typeof value === 'number' ? value : Number(value);
                  if (!isFinite(n)) return '—';
                  return formatLakhsCrores(n);
                }}
                labelFormatter={(v) => `Week ${v}`}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="line" />

              {/* Cold-start band — wider, light blue */}
              <Area
                type="monotone"
                dataKey="cold_lower"
                stackId="cold"
                stroke="none"
                fill="transparent"
                isAnimationActive={false}
                legendType="none"
                name="cold_lower"
              />
              <Area
                type="monotone"
                dataKey="cold_span"
                stackId="cold"
                stroke="#93C5FD"
                strokeDasharray="4 4"
                fill="#BFDBFE"
                fillOpacity={0.35}
                isAnimationActive={false}
                name="P10–P90 cold-start band"
              />

              {/* Comp-blend band — narrower, darker */}
              <Area
                type="monotone"
                dataKey="comp_lower"
                stackId="comp"
                stroke="none"
                fill="transparent"
                isAnimationActive={false}
                legendType="none"
                name="comp_lower"
              />
              <Area
                type="monotone"
                dataKey="comp_span"
                stackId="comp"
                stroke="#6366F1"
                strokeOpacity={0.4}
                fill="#6366F1"
                fillOpacity={0.18}
                isAnimationActive={false}
                name="P10–P90 comp-blend band"
              />

              {/* Point forecast */}
              <Line
                type="monotone"
                dataKey="point"
                stroke="#6366F1"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                isAnimationActive={false}
                name="Point forecast"
              />
              {/* Actual sales — black with dots */}
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#0F172A"
                strokeWidth={2}
                dot={{ r: 3, fill: '#0F172A' }}
                connectNulls={false}
                isAnimationActive={false}
                name="Actual sales (Wk 1–3)"
              />

              {/* Reference markers */}
              {ramp.markers.map((m) => (
                <ReferenceLine
                  key={m.label}
                  x={m.week}
                  stroke={m.color}
                  strokeDasharray="4 4"
                  label={{ value: m.label, position: 'top', fill: m.color, fontSize: 11, fontWeight: 600 }}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-100">
          <TrendingUp size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-900 leading-relaxed">{ramp.callout}</p>
        </div>
      </div>
    </ChartCard>
  );
}
