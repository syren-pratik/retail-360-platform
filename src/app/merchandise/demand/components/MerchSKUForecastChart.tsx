'use client';

import { useMemo } from 'react';
import { BarChart2 } from 'lucide-react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import {
  computeWhatIfForecast,
  hasNonDefaultParams,
} from '../lib/forecast-aggregation';
import type { SKUForecastPoint, WhatIfParams } from '../lib/forecast-aggregation';
import type { MerchDemandSKU } from '@/app/lib/merch-demand-types';
import { AIInsightButton } from '@/app/components/charts/ChartCard';

interface TooltipEntry {
  name: string;
  value: number | null;
  color: string;
  dataKey: string;
}

function SKUTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length || !label) return null;
  const d = new Date(label + 'T00:00:00');
  const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const relevant = payload.filter(p => p.value != null && p.value > 0);

  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg p-2.5 shadow-sm text-xs min-w-[140px]">
      <p className="font-semibold text-[var(--text-primary)] mb-1.5">{dateStr}</p>
      {relevant.map(p => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3 mb-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-px flex-shrink-0" style={{ backgroundColor: p.color, height: 2, display: 'inline-block' }} />
            <span className="text-[var(--text-secondary)]">{p.name}</span>
          </span>
          <span className="font-medium text-[var(--text-primary)] tabular-nums">
            {Math.round(p.value!).toLocaleString('en-IN')} units
          </span>
        </div>
      ))}
    </div>
  );
}

interface Props {
  baseSeries: SKUForecastPoint[];
  sku: MerchDemandSKU;
  whatIfParams: WhatIfParams;
  forecastStart: string;
}

export default function MerchSKUForecastChart({
  baseSeries,
  sku,
  whatIfParams,
  forecastStart,
}: Props) {
  const showAdjusted = hasNonDefaultParams(whatIfParams);

  const { chartData, whatIfResult } = useMemo(() => {
    const result = showAdjusted ? computeWhatIfForecast(baseSeries, sku, whatIfParams) : null;
    const data = (result ? result.adjustedSeries : baseSeries).map(p => ({
      date: p.date,
      is_actual: p.is_actual,
      actual_units: p.is_actual ? p.actual_units : null,
      forecast_units: !p.is_actual ? p.forecast_units : null,
      adjusted_forecast: !p.is_actual && result ? (result.adjustedSeries.find(r => r.date === p.date)?.adjusted_forecast ?? null) : null,
      lower_95: !p.is_actual ? p.lower_95 : null,
      ci_range: !p.is_actual && p.lower_95 != null && p.upper_95 != null
        ? p.upper_95 - p.lower_95
        : null,
    }));
    return { chartData: data, whatIfResult: result };
  }, [baseSeries, sku, whatIfParams, showAdjusted]);

  const interval = Math.max(1, Math.ceil(chartData.length / 8));

  if (baseSeries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[220px] gap-2 text-sm text-[var(--text-secondary)]">
        <BarChart2 size={24} className="text-[var(--text-tertiary)]" />
        <p>Forecast chart available for top-30 SKUs</p>
        <p className="text-xs text-[var(--text-tertiary)]">Drivers and what-if simulator below are based on model features</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-end">
        <AIInsightButton id="merch-sku-forecast" title="SKU Forecast" data={chartData as unknown as Record<string, unknown>[]} />
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle, #F3F4F6)" vertical={false} />

          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
            tickLine={false}
            axisLine={false}
            interval={interval}
            tickFormatter={(val: string) => {
              if (!val) return '';
              const dt = new Date(val + 'T00:00:00');
              return `${dt.getDate()} ${dt.toLocaleDateString('en-IN', { month: 'short' })}`;
            }}
          />

          <YAxis
            tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
            tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}K` : String(Math.round(v))}
            tickLine={false}
            axisLine={false}
            width={36}
          />

          {/* 95% CI band — stacked areas trick (forecast portion only) */}
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
            stackId="ci"
            stroke="none"
            fill="var(--chart-indigo)"
            fillOpacity={0.12}
            connectNulls={false}
            isAnimationActive={false}
            legendType="none"
            dot={false}
          />

          {/* Actual history — solid blue */}
          <Line
            dataKey="actual_units"
            name="Actual"
            stroke="var(--chart-blue)"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />

          {/* Base forecast — dashed indigo */}
          <Line
            dataKey="forecast_units"
            name="Forecast"
            stroke="var(--chart-indigo)"
            strokeWidth={showAdjusted ? 1.5 : 2}
            strokeDasharray={showAdjusted ? '4 3' : undefined}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />

          {/* Adjusted forecast — solid emerald (only when params differ from default) */}
          {showAdjusted && (
            <Line
              dataKey="adjusted_forecast"
              name="With what-if"
              stroke="var(--chart-emerald)"
              strokeWidth={2.5}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}

          {/* Today marker */}
          <ReferenceLine
            x={forecastStart}
            stroke="var(--text-tertiary)"
            strokeDasharray="2 2"
          />

          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            content={(props: any) => (
              <SKUTooltip active={props.active} payload={props.payload} label={props.label} />
            )}
            cursor={{ stroke: '#E2E8F0', strokeWidth: 1 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Manual legend row */}
      <div className="flex items-center gap-4 text-[10px] text-[var(--text-secondary)] mt-1 flex-wrap">
        <span className="flex items-center gap-1">
          <span className="inline-block w-4" style={{ height: 2, backgroundColor: 'var(--chart-blue)' }} />
          Actual
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4" style={{ height: 2, backgroundColor: 'var(--chart-indigo)', borderTop: '2px dashed var(--chart-indigo)' }} />
          Forecast
        </span>
        {showAdjusted && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-4" style={{ height: 2, backgroundColor: 'var(--chart-emerald)' }} />
            With what-if
          </span>
        )}
        <span className="flex items-center gap-1 ml-auto text-[var(--text-tertiary)]">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ backgroundColor: 'var(--chart-indigo)', opacity: 0.12 }} />
          95% CI
        </span>
      </div>

      {/* Impact summary when what-if is active */}
      {showAdjusted && whatIfResult && (
        <div className="mt-2 grid grid-cols-3 gap-1 text-center">
          {[
            { label: 'Demand', val: whatIfResult.impacts.demand_change_pct, suffix: '%' },
            { label: 'Revenue', val: null, formatted: whatIfResult.impacts.revenue_change_inr >= 0 ? `+₹${Math.round(Math.abs(whatIfResult.impacts.revenue_change_inr) / 1000)}K` : `-₹${Math.round(Math.abs(whatIfResult.impacts.revenue_change_inr) / 1000)}K`, positive: whatIfResult.impacts.revenue_change_inr >= 0 },
            { label: 'Margin', val: whatIfResult.impacts.margin_change_pp, suffix: 'pp' },
          ].map(({ label, val, suffix, formatted, positive }) => {
            const isPositive = formatted != null ? positive : (val ?? 0) > 0;
            const isNegative = formatted != null ? !positive : (val ?? 0) < 0;
            return (
              <div key={label} className="bg-[var(--bg-secondary)] rounded-md py-1">
                <div className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider">{label}</div>
                <div className={`text-xs font-semibold ${isPositive ? 'text-emerald-600' : isNegative ? 'text-rose-600' : 'text-[var(--text-primary)]'}`}>
                  {formatted ?? `${(val ?? 0) > 0 ? '+' : ''}${(val ?? 0).toFixed(1)}${suffix}`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
