'use client';

import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { AnalogWaterfallEntry } from '@/app/lib/coldstart-types';
import { useColdstartFilters } from '../ColdstartFilterContext';
import ChartCard from '@/app/components/charts/ChartCard';

interface Props {
  data: AnalogWaterfallEntry[];
}

const CITY_COLORS: Record<string, string> = {
  Jaipur: '#f59e0b',
  Ahmedabad: '#6366f1',
  Kolkata: '#10b981',
};

const CATEGORY_COLORS: Record<string, string> = {
  analog_baseline: '#3b82f6',
  analog_adjustment: '#8b5cf6',
  festival: '#f59e0b',
  weather: '#06b6d4',
  blend_local: '#10b981',
  total: '#1e40af',
};

const ORIG_WEIGHTS = { Jaipur: 38.8, Ahmedabad: 30.8, Kolkata: 30.4 };
const AHM_KOL_TOTAL = ORIG_WEIGHTS.Ahmedabad + ORIG_WEIGHTS.Kolkata; // 61.2

const CONFIDENCE_BADGE: Record<string, string> = {
  high:   'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  medium: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  low:    'bg-red-500/15 text-red-400 border border-red-500/30',
};

function formatDelta(v: number): string {
  const abs = Math.abs(v);
  const sign = v >= 0 ? '+' : '−';
  return `${sign}${abs.toFixed(1)}u`;
}

interface WaterfallRow {
  step_label: string;
  category: string;
  city_attribution: string;
  base: number;
  value: number;
  delta: number;
  explanation: string;
  isTotal: boolean;
}

function buildWaterfallRows(entry: AnalogWaterfallEntry): WaterfallRow[] {
  let running = 0;
  const rows: WaterfallRow[] = entry.contributions.map((c) => {
    const start = running;
    const end = running + c.value_units;
    running = end;
    return {
      step_label: c.step_label,
      category: c.category,
      city_attribution: c.city_attribution,
      base: c.value_units >= 0 ? start : end,
      value: Math.abs(c.value_units),
      delta: c.value_units,
      explanation: c.explanation,
      isTotal: false,
    };
  });
  // Final total bar
  rows.push({
    step_label: 'Final Forecast',
    category: 'total',
    city_attribution: 'none',
    base: 0,
    value: entry.final_forecast_units,
    delta: entry.final_forecast_units,
    explanation: 'Sum of all contributions',
    isTotal: true,
  });
  return rows;
}

function getBarColor(row: WaterfallRow): string {
  if (row.isTotal) return CATEGORY_COLORS.total;
  if (row.category === 'analog_baseline' || row.category === 'analog_adjustment') {
    return CITY_COLORS[row.city_attribution] ?? CATEGORY_COLORS[row.category];
  }
  return CATEGORY_COLORS[row.category] ?? '#6b7280';
}

function applyWeightOverride(
  entry: AnalogWaterfallEntry,
  jaipurOverride: number
): AnalogWaterfallEntry {
  const newAhm = (100 - jaipurOverride) * (ORIG_WEIGHTS.Ahmedabad / AHM_KOL_TOTAL);
  const newKol = (100 - jaipurOverride) * (ORIG_WEIGHTS.Kolkata / AHM_KOL_TOTAL);

  const scaledContributions = entry.contributions.map((c) => {
    const isAnalog =
      c.category === 'analog_baseline' || c.category === 'analog_adjustment';
    if (!isAnalog) return c;
    if (c.city_attribution === 'Jaipur')
      return { ...c, value_units: +(c.value_units * (jaipurOverride / ORIG_WEIGHTS.Jaipur)).toFixed(2) };
    if (c.city_attribution === 'Ahmedabad')
      return { ...c, value_units: +(c.value_units * (newAhm / ORIG_WEIGHTS.Ahmedabad)).toFixed(2) };
    if (c.city_attribution === 'Kolkata')
      return { ...c, value_units: +(c.value_units * (newKol / ORIG_WEIGHTS.Kolkata)).toFixed(2) };
    return c;
  });

  const newTotal = +(
    scaledContributions.reduce((s, c) => s + c.value_units, 0)
  ).toFixed(2);

  const adjustedCards = entry.analog_cards.map((card) => {
    if (card.city === 'Jaipur') return { ...card, weight_pct: +jaipurOverride.toFixed(1) };
    if (card.city === 'Ahmedabad') return { ...card, weight_pct: +newAhm.toFixed(1) };
    if (card.city === 'Kolkata') return { ...card, weight_pct: +newKol.toFixed(1) };
    return card;
  });

  return {
    ...entry,
    contributions: scaledContributions,
    final_forecast_units: newTotal,
    analog_cards: adjustedCards,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function WaterfallTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as WaterfallRow;
  if (!d) return null;
  return (
    <div
      className="rounded-lg border shadow-lg p-3 text-xs max-w-xs"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
    >
      <p className="font-semibold text-[var(--text-primary)] mb-1">{d.step_label}</p>
      <p className="text-[var(--text-secondary)] mb-1">{d.explanation}</p>
      <p className="font-mono" style={{ color: d.delta >= 0 ? '#10b981' : '#f43f5e' }}>
        {d.isTotal ? `Total: ${d.value.toFixed(1)} units` : formatDelta(d.delta)}
      </p>
    </div>
  );
}

export default function ColdstartAnalogWaterfall({ data }: Props) {
  const { filters } = useColdstartFilters();
  const [jaipurOverride, setJaipurOverride] = useState<number | null>(null);

  const rawEntry = useMemo(() => {
    if (!data.length) return null;
    return (
      data.find((e) => e.sku_id === filters.selected_sku_id) ?? data[0]
    );
  }, [data, filters.selected_sku_id]);

  const entry = useMemo(() => {
    if (!rawEntry) return null;
    if (jaipurOverride === null) return rawEntry;
    return applyWeightOverride(rawEntry, jaipurOverride);
  }, [rawEntry, jaipurOverride]);

  const rows = useMemo(() => (entry ? buildWaterfallRows(entry) : []), [entry]);

  const effectiveJaipur = jaipurOverride ?? ORIG_WEIGHTS.Jaipur;
  const effectiveAhm =
    (100 - effectiveJaipur) * (ORIG_WEIGHTS.Ahmedabad / AHM_KOL_TOTAL);
  const effectiveKol =
    (100 - effectiveJaipur) * (ORIG_WEIGHTS.Kolkata / AHM_KOL_TOTAL);

  const origForecast = rawEntry?.final_forecast_units ?? 0;
  const adjForecast = entry?.final_forecast_units ?? 0;
  const forecastDelta = adjForecast - origForecast;
  const forecastErrorPct =
    entry && entry.actual_units > 0
      ? Math.abs((adjForecast - entry.actual_units) / entry.actual_units) * 100
      : null;
  const riskLabel =
    forecastErrorPct === null
      ? '—'
      : forecastErrorPct < 20
      ? 'Good'
      : forecastErrorPct < 35
      ? 'Acceptable'
      : 'Concerning';
  const riskColor =
    riskLabel === 'Good'
      ? '#10b981'
      : riskLabel === 'Acceptable'
      ? '#f59e0b'
      : '#f43f5e';

  if (!entry) {
    return (
      <div className="card p-6 text-center text-sm text-[var(--text-secondary)]">
        No waterfall data available.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top row: waterfall (left 3) + cards (right 2) */}
      <div className="grid grid-cols-5 gap-4">
        {/* Waterfall chart */}
        <div className="col-span-3">
          <ChartCard
            id="coldstart-analog-waterfall"
            title="Analog Contribution Waterfall"
            subtitle={`${entry.product_name} · Day ${entry.day_num} snapshot`}
            height={340}
            data={rows as unknown as Record<string, unknown>[]}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
                layout="vertical"
                margin={{ top: 4, right: 72, bottom: 4, left: 8 }}
                barSize={20}
              >
                <CartesianGrid
                  horizontal={false}
                  strokeDasharray="3 2"
                  stroke="var(--border-default)"
                  strokeOpacity={0.5}
                />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                  tickFormatter={(v) => `${v.toFixed(0)}u`}
                />
                <YAxis
                  type="category"
                  dataKey="step_label"
                  width={148}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                />
                <Tooltip content={<WaterfallTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <ReferenceLine x={0} stroke="var(--text-tertiary)" strokeDasharray="3 2" />
                {/* Invisible base bar for waterfall positioning */}
                <Bar dataKey="base" stackId="wf" fill="transparent" legendType="none" />
                {/* Visible value bar */}
                <Bar dataKey="value" stackId="wf" radius={[0, 3, 3, 0]}>
                  {rows.map((row, i) => (
                    <Cell
                      key={i}
                      fill={getBarColor(row)}
                      fillOpacity={row.isTotal ? 1 : row.delta < 0 ? 0.65 : 0.85}
                    />
                  ))}
                  <LabelList
                    dataKey="delta"
                    position="right"
                    style={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    content={(props: any) => {
                      const { x, y, width, height, value, index } = props;
                      const row = rows[index];
                      if (!row) return null;
                      const label = row.isTotal
                        ? `${Number(value).toFixed(1)}u`
                        : formatDelta(Number(value));
                      return (
                        <text
                          x={Number(x) + Number(width) + 4}
                          y={Number(y) + Number(height) / 2}
                          dominantBaseline="middle"
                          fontSize={10}
                          fill="var(--text-secondary)"
                        >
                          {label}
                        </text>
                      );
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Analog city cards */}
        <div className="col-span-2 space-y-3">
          {entry.analog_cards.map((card) => {
            const cityColor = CITY_COLORS[card.city] ?? '#6b7280';
            return (
              <div
                key={card.city}
                className="card p-4 space-y-3"
                style={{ borderLeft: `3px solid ${cityColor}` }}
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: cityColor }}
                      >
                        {card.city}
                      </span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${CONFIDENCE_BADGE[card.confidence]}`}
                      >
                        {card.confidence} conf
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                      {card.tier_label}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold" style={{ color: cityColor }}>
                      {card.weight_pct.toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-[var(--text-tertiary)]">weight</div>
                  </div>
                </div>

                {/* Similarity axes */}
                <div className="space-y-1.5">
                  {card.similarity_axes.map((ax) => (
                    <div key={ax.axis_name}>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-[var(--text-secondary)]">{ax.axis_name}</span>
                        <span className="text-[var(--text-tertiary)] font-mono">
                          {ax.target_value} / {ax.analog_value}
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${ax.similarity_pct}%`, background: cityColor }}
                        />
                      </div>
                      <div className="text-[10px] text-right" style={{ color: cityColor }}>
                        {ax.similarity_pct}%
                      </div>
                    </div>
                  ))}
                </div>

                {/* Adjustments */}
                <div className="flex flex-wrap gap-1">
                  {card.adjustments_applied.map((adj) => (
                    <span
                      key={adj}
                      className="text-[9px] px-1.5 py-0.5 rounded-full border"
                      style={{
                        borderColor: `${cityColor}40`,
                        color: cityColor,
                        background: `${cityColor}10`,
                      }}
                    >
                      {adj}
                    </span>
                  ))}
                </div>

                {/* Confidence reason */}
                <p className="text-[10px] text-[var(--text-tertiary)] leading-relaxed border-t pt-2"
                  style={{ borderColor: 'var(--border-default)' }}>
                  {card.confidence_reason}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sensitivity slider — full width */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Analog Weight Sensitivity
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Adjust Jaipur weight — Ahmedabad & Kolkata rescale proportionally
            </p>
          </div>
          {jaipurOverride !== null && (
            <button
              className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              onClick={() => setJaipurOverride(null)}
            >
              Reset
            </button>
          )}
        </div>

        {/* Weight display */}
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              { city: 'Jaipur', w: effectiveJaipur, color: CITY_COLORS.Jaipur },
              { city: 'Ahmedabad', w: effectiveAhm, color: CITY_COLORS.Ahmedabad },
              { city: 'Kolkata', w: effectiveKol, color: CITY_COLORS.Kolkata },
            ] as const
          ).map(({ city, w, color }) => (
            <div key={city} className="text-center">
              <div className="text-base font-bold" style={{ color }}>
                {w.toFixed(1)}%
              </div>
              <div className="text-[10px] text-[var(--text-tertiary)]">{city}</div>
              <div className="h-1 rounded-full mt-1 bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${w}%`, background: color }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Slider */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[var(--text-tertiary)] w-10 text-right">10%</span>
          <input
            type="range"
            min={10}
            max={80}
            step={0.5}
            value={jaipurOverride ?? ORIG_WEIGHTS.Jaipur}
            onChange={(e) => setJaipurOverride(+e.target.value)}
            className="flex-1 accent-amber-400 h-1.5"
          />
          <span className="text-[10px] text-[var(--text-tertiary)] w-10">80%</span>
        </div>
        <div className="text-center text-xs font-mono" style={{ color: CITY_COLORS.Jaipur }}>
          Jaipur weight: {effectiveJaipur.toFixed(1)}%
        </div>

        {/* Live impact readout */}
        {jaipurOverride !== null && (
          <div
            className="grid grid-cols-3 gap-3 rounded-lg p-3 text-center"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
          >
            <div>
              <div className="text-xs text-[var(--text-tertiary)]">Adjusted Forecast</div>
              <div className="text-sm font-bold text-[var(--text-primary)] mt-0.5">
                {adjForecast.toFixed(1)} units
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-tertiary)]">vs Original</div>
              <div
                className="text-sm font-bold mt-0.5"
                style={{ color: forecastDelta >= 0 ? '#10b981' : '#f43f5e' }}
              >
                {forecastDelta >= 0 ? '+' : ''}
                {forecastDelta.toFixed(1)} units
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-tertiary)]">Accuracy Risk</div>
              <div className="text-sm font-bold mt-0.5" style={{ color: riskColor }}>
                {riskLabel}
                {forecastErrorPct !== null && (
                  <span className="text-[10px] font-normal ml-1">
                    ({forecastErrorPct.toFixed(0)}% MAPE)
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
