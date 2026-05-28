'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { FlatChartPoint } from '../lib/forecast-aggregation';
import type { MerchDemandEvent } from '@/app/lib/merch-demand-types';

const PALETTE = [
  '#3B82F6', // blue
  '#F59E0B', // amber
  '#10B981', // emerald
  '#6366F1', // indigo
  '#F43F5E', // rose
  '#64748B', // slate
];

interface TooltipEntry {
  name: string;
  value: number;
  color: string;
  payload: FlatChartPoint;
}

function ChartTooltip({
  active,
  payload,
  label,
  series,
  seriesNames,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  series: string[];
  seriesNames?: Record<string, string>;
}) {
  if (!active || !payload?.length || !label) return null;

  const isActual = payload[0]?.payload?.is_actual ?? false;
  const seriesPayload = payload.filter(p => series.includes(p.name) && (p.value ?? 0) > 0);
  const total = seriesPayload.reduce((s, p) => s + (p.value ?? 0), 0);

  const d = new Date(label + 'T00:00:00');
  const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-sm text-xs min-w-[160px]">
      <p className="font-semibold text-[var(--text-primary)] mb-2">
        {dateStr}&nbsp;·&nbsp;
        <span className={isActual ? 'text-[var(--text-tertiary)]' : 'text-[#6366F1]'}>
          {isActual ? 'Actual' : 'Forecast'}
        </span>
      </p>
      {[...seriesPayload]
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
        .map(p => (
          <div key={p.name} className="flex items-center justify-between gap-3 mb-1">
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color }} />
              <span className="text-[var(--text-secondary)] truncate">
                {seriesNames?.[p.name] ?? p.name}
              </span>
            </span>
            <span className="font-medium text-[var(--text-primary)] tabular-nums flex-shrink-0">
              {Math.round(p.value ?? 0).toLocaleString('en-IN')}
            </span>
          </div>
        ))}
      <div className="flex justify-between mt-2 pt-1.5 border-t border-[var(--border-default)]">
        <span className="text-[var(--text-tertiary)]">Total</span>
        <span className="font-semibold text-[var(--text-primary)] tabular-nums">
          {Math.round(total).toLocaleString('en-IN')} units
        </span>
      </div>
    </div>
  );
}

interface Props {
  chartData: FlatChartPoint[];
  series: string[];
  seriesNames?: Record<string, string>;
  events: MerchDemandEvent[];
  salaryWeekDays: number[];
  forecastStart: string;
  horizon: number;
  selectedSubcategory?: string | null;
  onSubcategoryClick?: (sub: string) => void;
}

export default function MerchCategoryTimeline({
  chartData,
  series,
  seriesNames,
  events,
  forecastStart,
  horizon,
  selectedSubcategory,
  onSubcategoryClick,
}: Props) {
  // Build salary-week ranges by clamping month salary days to the visible window.
  // Uses window-boundary clamping instead of dateSet membership so partial months
  // (e.g. only June 1 visible) still produce a valid x1 ≠ x2 range.
  const salaryRanges = useMemo(() => {
    if (!chartData.length) return [];
    const windowStart = chartData[0].date as string;
    const windowEnd = chartData[chartData.length - 1].date as string;
    const months = Array.from(new Set(chartData.map(p => (p.date as string).substring(0, 7))));

    return months.flatMap(month => {
      const day1 = `${month}-01`;
      const day7 = `${month}-07`;
      // Skip if salary week is entirely outside the visible window
      if (day7 < windowStart || day1 > windowEnd) return [];
      // Clamp both ends to the window so x1 and x2 always exist in the data
      const x1 = day1 >= windowStart ? day1 : windowStart;
      const x2 = day7 <= windowEnd ? day7 : windowEnd;
      return [{ x1, x2 }];
    });
  }, [chartData]);

  // fillOpacity per series based on current selection
  const getOpacity = (s: string) => {
    if (!selectedSubcategory) return 0.65;
    return s === selectedSubcategory ? 0.8 : 0.15;
  };

  if (!chartData.length || !series.length) {
    return (
      <div className="flex items-center justify-center h-[300px] text-sm text-[var(--text-tertiary)]">
        No chart data for current scope
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3">
        <p className="text-xs font-medium text-[var(--text-primary)]">Category Demand Timeline</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
          Last 30d actuals + {horizon}d forecast · daily units aggregated
          {selectedSubcategory ? ` · ${selectedSubcategory} highlighted` : ''}
        </p>
      </div>

      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 16, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />

            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#64748B' }}
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
              interval={6}
              tickFormatter={(val: string) => {
                if (!val) return '';
                const dt = new Date(val + 'T00:00:00');
                return `${dt.getDate()} ${dt.toLocaleDateString('en-IN', { month: 'short' })}`;
              }}
            />

            <YAxis
              tick={{ fontSize: 10, fill: '#64748B' }}
              tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}K` : String(Math.round(v))}
              tickLine={false}
              axisLine={false}
              width={38}
            />

            {/* Salary-week shading — rendered first so it sits behind all other layers */}
            {salaryRanges.map((r, i) => (
              <ReferenceArea
                key={`sw-${i}`}
                x1={r.x1}
                x2={r.x2}
                fill="#F3F4F6"
                fillOpacity={0.8}
                stroke="none"
                ifOverflow="hidden"
              />
            ))}

            {/* 95% CI band — transparent base, then visible range stacked on top */}
            <Area
              dataKey="lower_95"
              stackId="ci"
              stroke="none"
              fill="none"
              fillOpacity={0}
              connectNulls={false}
              isAnimationActive={false}
              legendType="none"
              dot={false}
            />
            <Area
              dataKey="ci_range"
              name="95% CI"
              stackId="ci"
              stroke="none"
              fill="#6366F1"
              fillOpacity={0.12}
              connectNulls={false}
              isAnimationActive={false}
              legendType="none"
              dot={false}
            />

            {/* Subcategory / top-SKU stacked areas — click to select */}
            {series.map((s, i) => (
              <Area
                key={s}
                dataKey={s}
                name={seriesNames?.[s] ?? s}
                stackId="demand"
                fill={PALETTE[i % PALETTE.length]}
                stroke={PALETTE[i % PALETTE.length]}
                fillOpacity={getOpacity(s)}
                strokeWidth={0}
                connectNulls={false}
                isAnimationActive={false}
                dot={false}
                cursor={onSubcategoryClick ? 'pointer' : 'default'}
                onClick={() => onSubcategoryClick?.(s)}
              />
            ))}

            {/* Today marker */}
            <ReferenceLine
              x={forecastStart}
              stroke="#94A3B8"
              strokeDasharray="4 3"
              label={{ value: 'Today', position: 'insideTopRight', fontSize: 9, fill: '#94A3B8', offset: 6 }}
            />

            {/* Event annotations (max 3, top by cultural significance) */}
            {events.map(event => (
              <ReferenceLine
                key={event.event_id}
                x={event.date}
                stroke="#F59E0B"
                strokeDasharray="3 2"
                strokeOpacity={0.85}
                label={{
                  value: event.event_name.length > 14 ? event.event_name.substring(0, 13) + '…' : event.event_name,
                  position: 'top',
                  fontSize: 8,
                  fill: '#F59E0B',
                  offset: 4,
                }}
              />
            ))}

            <Tooltip
              content={(props) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const tp = props as any;
                return (
                  <ChartTooltip
                    active={tp.active}
                    payload={tp.payload}
                    label={tp.label}
                    series={series}
                    seriesNames={seriesNames}
                  />
                );
              }}
              cursor={{ stroke: '#E2E8F0', strokeWidth: 1 }}
            />

            <Legend
              iconType="square"
              iconSize={8}
              formatter={(value: string) => (
                <span
                  style={{
                    fontSize: 10,
                    color: selectedSubcategory && selectedSubcategory !== value ? '#CBD5E1' : '#64748B',
                    fontWeight: selectedSubcategory === value ? 600 : 400,
                  }}
                >
                  {seriesNames?.[value] ?? value}
                </span>
              )}
              wrapperStyle={{ paddingTop: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
