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
import type { MerchDemandPrecomputedHorizon } from '@/app/lib/merch-demand-types';
import { AIInsightButton } from '@/app/components/charts/ChartCard';

const PALETTE = [
  'var(--chart-blue)',
  'var(--chart-amber)',
  'var(--chart-emerald)',
  'var(--chart-indigo)',
  'var(--chart-rose)',
  'var(--chart-slate)',
  '#a78bfa',
  '#f97316',
];

interface TooltipEntry {
  name: string;
  value: number;
  color: string;
  payload: Record<string, unknown>;
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
  const seriesPayload = payload.filter((p) => series.includes(p.name) && (p.value ?? 0) > 0);
  const total = seriesPayload.reduce((s, p) => s + (p.value ?? 0), 0);
  const d = new Date(label + 'T00:00:00');
  const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-sm text-xs min-w-[160px]">
      <p className="font-semibold text-[var(--text-primary)] mb-2">
        {dateStr}&nbsp;·&nbsp;
        <span className={isActual ? 'text-[var(--text-tertiary)]' : 'text-[var(--chart-indigo)]'}>
          {isActual ? 'Actual' : 'Forecast'}
        </span>
      </p>
      {[...seriesPayload]
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
        .map((p) => (
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
  precomp: MerchDemandPrecomputedHorizon | null;
  breakdownMode: 'subcategory' | 'topSKUs';
  selectedSubcategory: string | null;
  onSubcategoryClick: (sub: string | null) => void;
  horizon: number;
  anchorDate: string;
  expanded?: boolean;
}

export default function MerchCategoryTimeline({
  precomp,
  breakdownMode,
  selectedSubcategory,
  onSubcategoryClick,
  horizon,
  anchorDate,
  expanded = false,
}: Props) {
  const height = expanded ? 520 : 320;

  const { chartData, series, seriesNames } = useMemo(() => {
    if (!precomp) return { chartData: [], series: [], seriesNames: {} };

    if (breakdownMode === 'subcategory') {
      return {
        chartData: precomp.subcategory_chart.chart_points as Record<string, unknown>[],
        series: precomp.subcategory_chart.subcategories,
        seriesNames: undefined,
      };
    } else {
      const names: Record<string, string> = { ...(precomp.top_sku_chart.sku_names ?? {}) };
      return {
        chartData: precomp.top_sku_chart.chart_points as Record<string, unknown>[],
        series: precomp.top_sku_chart.sku_ids.filter((id) => id !== 'Others'),
        seriesNames: names,
      };
    }
  }, [precomp, breakdownMode]);

  const salaryRanges = useMemo(() => {
    if (!chartData.length) return [];
    const windowStart = chartData[0].date as string;
    const windowEnd = chartData[chartData.length - 1].date as string;
    const months = Array.from(new Set(chartData.map((p) => (p.date as string).substring(0, 7))));
    return months.flatMap((month) => {
      const day1 = `${month}-01`;
      const day7 = `${month}-07`;
      if (day7 < windowStart || day1 > windowEnd) return [];
      const x1 = day1 >= windowStart ? day1 : windowStart;
      const x2 = day7 <= windowEnd ? day7 : windowEnd;
      return [{ x1, x2 }];
    });
  }, [chartData]);

  const getOpacity = (s: string) => {
    if (!selectedSubcategory) return 0.65;
    return s === selectedSubcategory ? 0.8 : 0.15;
  };

  if (!precomp) {
    return (
      <div
        className="flex items-center justify-center text-sm text-[var(--text-tertiary)]"
        style={{ height }}
      >
        Select a department to load forecast data
      </div>
    );
  }

  if (!chartData.length || !series.length) {
    return (
      <div
        className="flex items-center justify-center text-sm text-[var(--text-tertiary)]"
        style={{ height }}
      >
        No chart data for current scope
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[var(--text-primary)]">Category Demand Timeline</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            Historical actuals + {horizon}d forecast · daily units aggregated
            {selectedSubcategory ? ` · ${selectedSubcategory} highlighted` : ''}
          </p>
        </div>
        <AIInsightButton id="merch-category-timeline" title="Category Demand Timeline" data={chartData as unknown as Record<string, unknown>[]} />
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData as Record<string, number | string | boolean | null>[]}
            margin={{ top: 20, right: 16, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />

            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#64748B' }}
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
              interval={Math.max(1, Math.ceil(chartData.length / 10))}
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

            {/* Salary-week shading */}
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

            {/* 95% CI band */}
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
              fill="var(--chart-indigo)"
              fillOpacity={0.12}
              connectNulls={false}
              isAnimationActive={false}
              legendType="none"
              dot={false}
            />

            {/* Series stacked areas */}
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
                cursor="pointer"
                onClick={() => onSubcategoryClick(selectedSubcategory === s ? null : s)}
              />
            ))}

            {/* Today marker */}
            <ReferenceLine
              x={anchorDate}
              stroke="#94A3B8"
              strokeDasharray="4 3"
              label={{ value: 'Today', position: 'insideTopRight', fontSize: 9, fill: '#94A3B8', offset: 6 }}
            />

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
                    cursor: 'pointer',
                  }}
                  onClick={() => onSubcategoryClick(selectedSubcategory === value ? null : value)}
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
