'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  BarChart,
  LineChart,
} from 'recharts';
import DeepDiveHeader from '@/app/merchandise/demand/deep-dive/shared/DeepDiveHeader';
import DeepDiveTabs from '@/app/merchandise/demand/deep-dive/shared/DeepDiveTabs';
import DeepDiveKPIStrip from '@/app/merchandise/demand/deep-dive/shared/DeepDiveKPIStrip';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import { formatLakhsCrores } from '@/app/lib/merch-format';

interface Props {
  core: PriceIntelCore;
}

const TABS = [
  { id: 'forecast', label: 'Forecast' },
  { id: 'confidence', label: 'Confidence' },
  { id: 'scenarios', label: 'Scenarios' },
  { id: 'seasonality', label: 'Seasonality' },
  { id: 'drivers', label: 'Drivers' },
];

type ZoomWindow = '4W' | '8W' | '14W';

// ─── Forecast Tab ─────────────────────────────────────────────────────────────

function ForecastTab({ core }: { core: PriceIntelCore }) {
  const [zoom, setZoom] = useState<ZoomWindow>('14W');

  const zoomCount: Record<ZoomWindow, number> = { '4W': 4, '8W': 8, '14W': 14 };
  const sliced = core.forecast_14w.slice(0, zoomCount[zoom]);

  const chartData = sliced.map((w) => ({
    week_label: w.week_label,
    revenue: w.forecast_revenue_inr,
    margin: w.forecast_margin_inr,
    lower_ci: w.lower_ci_inr,
    ci_range: w.upper_ci_inr - w.lower_ci_inr,
    event: w.event_label,
  }));

  const eventWeeks = sliced
    .filter((w) => w.event_label)
    .map((w) => w.week_label);

  function handleDownload() {
    window.alert('CSV download would be generated here.');
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 bg-[var(--bg-secondary)] rounded-lg p-1">
          {(['4W', '8W', '14W'] as ZoomWindow[]).map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => setZoom(z)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                zoom === z
                  ? 'bg-white shadow text-indigo-600'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {z}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleDownload}
          className="px-3 py-1.5 text-sm border border-[var(--border-default)] rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
        >
          ↓ Download CSV
        </button>
      </div>

      <ResponsiveContainer width="100%" height={560}>
        <ComposedChart data={chartData} margin={{ top: 16, right: 60, left: 20, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="week_label" tick={{ fontSize: 11, fill: '#111827' }} />
          <YAxis
            yAxisId="rev"
            orientation="left"
            tickFormatter={(v: unknown) => formatLakhsCrores(v as number)}
            tick={{ fontSize: 11, fill: '#111827' }}
            label={{
              value: 'Revenue / Margin',
              angle: -90,
              position: 'insideLeft',
              offset: 8,
              style: { fontSize: 11 },
            }}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const w = core.forecast_14w.find((p) => p.week_label === label);
              return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                  <p className="font-semibold text-gray-900 mb-2">{label}</p>
                  {w?.event_label && (
                    <p className="text-violet-600 text-xs mb-1">📅 {w.event_label}</p>
                  )}
                  <p className="text-gray-600">
                    Revenue:{' '}
                    <span className="font-medium">{formatLakhsCrores(w?.forecast_revenue_inr ?? 0)}</span>
                  </p>
                  <p className="text-gray-600">
                    Margin:{' '}
                    <span className="font-medium">{formatLakhsCrores(w?.forecast_margin_inr ?? 0)}</span>
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    CI: {formatLakhsCrores(w?.lower_ci_inr ?? 0)} –{' '}
                    {formatLakhsCrores(w?.upper_ci_inr ?? 0)}
                  </p>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />

          {/* CI band: transparent base + filled range on top */}
          <Area
            yAxisId="rev"
            type="monotone"
            dataKey="lower_ci"
            fill="transparent"
            stroke="none"
            legendType="none"
            name=""
          />
          <Area
            yAxisId="rev"
            type="monotone"
            dataKey="ci_range"
            fill="#c7d2fe"
            fillOpacity={0.35}
            stroke="none"
            stackId="ci"
            name="CI Band"
          />

          {/* Event week reference lines */}
          {eventWeeks.map((wl) => (
            <ReferenceLine
              key={wl}
              yAxisId="rev"
              x={wl}
              stroke="#7c3aed"
              strokeDasharray="4 2"
              label={{ value: '⚑', position: 'top', fontSize: 12, fill: '#7c3aed' }}
            />
          ))}

          <Line
            yAxisId="rev"
            type="monotone"
            dataKey="revenue"
            name="Forecast Revenue"
            stroke="#6366f1"
            strokeWidth={2.5}
            dot={{ r: 3 }}
          />
          <Line
            yAxisId="rev"
            type="monotone"
            dataKey="margin"
            name="Forecast Margin"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Confidence Tab ───────────────────────────────────────────────────────────

function ConfidenceTab({ core }: { core: PriceIntelCore }) {
  const ciData = core.forecast_14w.map((w) => ({
    week_label: w.week_label,
    ci_width_pct:
      ((w.upper_ci_inr - w.lower_ci_inr) / w.forecast_revenue_inr) * 100,
  }));

  const accuracyData = [
    { class: 'A-class', error_pct: 13.8 },
    { class: 'B-class', error_pct: 14.9 },
    { class: 'C-class', error_pct: 17.7 },
  ];

  return (
    <div className="space-y-6">
      {/* CI width chart */}
      <div>
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">
          Confidence Interval Width (% of Forecast)
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={ciData} margin={{ top: 12, right: 24, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="week_label" tick={{ fontSize: 11, fill: '#111827' }} />
            <YAxis
              tickFormatter={(v: unknown) => `${(v as number).toFixed(0)}%`}
              tick={{ fontSize: 11, fill: '#111827' }}
              label={{
                value: 'CI Width %',
                angle: -90,
                position: 'insideLeft',
                offset: 8,
                style: { fontSize: 11 },
              }}
            />
            <Tooltip
              formatter={(v: unknown) => [`${(v as number).toFixed(1)}%`, 'CI Width']}
            />
            <ReferenceLine
              x="W8"
              stroke="#f59e0b"
              strokeDasharray="4 2"
              label={{
                value: 'Confidence drops',
                position: 'top',
                fontSize: 10,
                fill: '#f59e0b',
              }}
            />
            <Line
              type="monotone"
              dataKey="ci_width_pct"
              name="CI Width %"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
          Forecast confidence drops significantly beyond W8 — widen operational buffer for
          weeks 9–14.
        </p>
      </div>

      {/* Accuracy by velocity class */}
      <div>
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">
          Forecast Error by Velocity Class (MAPE %)
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={accuracyData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="class" tick={{ fontSize: 12, fill: '#111827' }} />
            <YAxis
              domain={[0, 25]}
              tickFormatter={(v: unknown) => `${v}%`}
              tick={{ fontSize: 11, fill: '#111827' }}
            />
            <Tooltip formatter={(v: unknown) => [`${(v as number).toFixed(1)}%`, 'MAPE']} />
            <Bar dataKey="error_pct" name="MAPE %" radius={[4, 4, 0, 0]}>
              {accuracyData.map((entry, i) => (
                <Bar
                  key={i}
                  dataKey="error_pct"
                  fill={entry.error_pct > 16 ? '#f43f5e' : entry.error_pct > 14 ? '#f59e0b' : '#10b981'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mt-2">
          C-class SKUs have 28% higher forecast error vs A-class. Prioritize inventory
          buffers and markdown triggers for C-class to absorb demand variance.
        </p>
      </div>
    </div>
  );
}

// ─── Scenarios Tab ────────────────────────────────────────────────────────────

interface Scenario {
  id: string;
  label: string;
  multiplier: number;
  description: string;
  color: string;
}

const SCENARIOS: Scenario[] = [
  { id: 'base', label: 'Base Case', multiplier: 1.0, description: 'Current forecast, no changes.', color: '#6366f1' },
  { id: 'upside', label: 'Upside', multiplier: 1.12, description: '+12% revenue if pricing actions are executed.', color: '#10b981' },
  { id: 'downside', label: 'Downside', multiplier: 0.88, description: '−12% if festival demand misses and promos underdeliver.', color: '#f43f5e' },
  { id: 'stress', label: 'Stress Test', multiplier: 0.72, description: '−28% worst-case supply disruption + festival miss.', color: '#7c3aed' },
];

function ScenarioMiniChart({
  core,
  scenario,
  isSelected,
}: {
  core: PriceIntelCore;
  scenario: Scenario;
  isSelected: boolean;
}) {
  const data = core.forecast_14w.map((w) => ({
    week_label: w.week_label,
    revenue: Math.round(w.forecast_revenue_inr * scenario.multiplier),
  }));

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        isSelected
          ? 'border-indigo-400 bg-indigo-50 shadow-md'
          : 'border-[var(--border-default)] bg-[var(--bg-secondary)]'
      }`}
    >
      <p className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">
        {scenario.label}
      </p>
      <p className="text-xs text-[var(--text-secondary)] mb-3">{scenario.description}</p>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <XAxis dataKey="week_label" tick={false} axisLine={false} />
          <YAxis tick={false} axisLine={false} />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke={scenario.color}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase">14W Revenue</p>
          <p className="text-sm font-semibold tabular-nums" style={{ color: scenario.color }}>
            {formatLakhsCrores(
              core.forecast_14w.reduce(
                (s, w) => s + w.forecast_revenue_inr * scenario.multiplier,
                0
              )
            )}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase">vs Base</p>
          <p
            className={`text-sm font-semibold tabular-nums ${
              scenario.multiplier >= 1 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {scenario.multiplier >= 1 ? '+' : ''}
            {((scenario.multiplier - 1) * 100).toFixed(0)}%
          </p>
        </div>
      </div>
    </div>
  );
}

function ScenariosTab({ core }: { core: PriceIntelCore }) {
  const [selectedScenario, setSelectedScenario] = useState<string>('base');

  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSelectedScenario(s.id)}
            className="text-left"
          >
            <ScenarioMiniChart
              core={core}
              scenario={s}
              isSelected={selectedScenario === s.id}
            />
          </button>
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={() => console.log('Apply scenario:', selectedScenario)}
          className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Apply Upside Scenario
        </button>
      </div>
    </div>
  );
}

// ─── Seasonality Tab ──────────────────────────────────────────────────────────

function SeasonalityTab({ core }: { core: PriceIntelCore }) {
  const chartData = core.forecast_14w.map((w) => ({
    week_label: w.week_label,
    seasonality_index: w.seasonality_index,
    revenue: w.forecast_revenue_inr,
    event: w.event_label,
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartData} margin={{ top: 16, right: 60, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="week_label" tick={{ fontSize: 11, fill: '#111827' }} />
          <YAxis
            yAxisId="idx"
            orientation="left"
            domain={[0, 2]}
            tickFormatter={(v: unknown) => `${(v as number).toFixed(2)}×`}
            tick={{ fontSize: 11, fill: '#111827' }}
            label={{
              value: 'Seasonality Index',
              angle: -90,
              position: 'insideLeft',
              offset: 8,
              style: { fontSize: 11 },
            }}
          />
          <YAxis
            yAxisId="rev"
            orientation="right"
            tickFormatter={(v: unknown) => formatLakhsCrores(v as number)}
            tick={{ fontSize: 11, fill: '#111827' }}
            label={{
              value: 'Revenue',
              angle: 90,
              position: 'insideRight',
              offset: 8,
              style: { fontSize: 11 },
            }}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const w = core.forecast_14w.find((p) => p.week_label === label);
              return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                  <p className="font-semibold text-gray-900 mb-1">{label}</p>
                  {w?.event_label && (
                    <p className="text-violet-600 text-xs mb-1">{w.event_label}</p>
                  )}
                  <p className="text-gray-600">
                    Index:{' '}
                    <span className="font-medium">{w?.seasonality_index.toFixed(3)}×</span>
                  </p>
                  <p className="text-gray-600">
                    Revenue:{' '}
                    <span className="font-medium">
                      {formatLakhsCrores(w?.forecast_revenue_inr ?? 0)}
                    </span>
                  </p>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine
            yAxisId="idx"
            y={1.0}
            stroke="#9ca3af"
            strokeDasharray="4 2"
            label={{ value: 'Baseline', position: 'right', fontSize: 11, fill: '#9ca3af' }}
          />
          <Bar yAxisId="idx" dataKey="seasonality_index" name="Seasonality Index" radius={[3, 3, 0, 0]}>
            {chartData.map((entry, i) => (
              <Bar
                key={i}
                dataKey="seasonality_index"
                fill={entry.seasonality_index >= 1.0 ? '#10b981' : '#f43f5e'}
              />
            ))}
          </Bar>
          <Line
            yAxisId="rev"
            type="monotone"
            dataKey="revenue"
            name="Forecast Revenue"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Seasonality table */}
      <div className="mt-5 overflow-x-auto rounded-lg border border-[var(--border-default)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-secondary)]">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                Week
              </th>
              <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                Index
              </th>
              <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                Driver
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)]">
            {core.forecast_14w.map((w) => (
              <tr key={w.week} className="hover:bg-[var(--bg-secondary)] transition-colors">
                <td className="px-3 py-2 font-medium text-[var(--text-primary)]">
                  {w.week_label}
                </td>
                <td
                  className="px-3 py-2 tabular-nums font-semibold"
                  style={{ color: w.seasonality_index >= 1.0 ? '#10b981' : '#f43f5e' }}
                >
                  {w.seasonality_index.toFixed(3)}×
                </td>
                <td className="px-3 py-2 text-[var(--text-secondary)] text-xs">
                  {w.event_label ?? 'Base seasonality'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Drivers Tab ──────────────────────────────────────────────────────────────

function DriversTab({ core }: { core: PriceIntelCore }) {
  const chartData = core.forecast_14w.map((w) => {
    const rev = w.forecast_revenue_inr;
    const base_trend = rev * 0.6;
    const festival = w.event_label ? rev * 0.25 : rev * 0.02;
    const promo = rev * 0.12;
    const seasonality = Math.max(0, (w.seasonality_index - 1) * 0.1 * rev);
    const used = base_trend + festival + promo + seasonality;
    const residual = Math.max(0, rev - used);
    return {
      week_label: w.week_label,
      base_trend: Math.round(base_trend),
      festival: Math.round(festival),
      promo: Math.round(promo),
      seasonality: Math.round(seasonality),
      residual: Math.round(residual),
    };
  });

  const legendItems = [
    { key: 'base_trend', label: 'Base Trend', color: '#94a3b8' },
    { key: 'festival', label: 'Festival', color: '#f59e0b' },
    { key: 'promo', label: 'Promo', color: '#3b82f6' },
    { key: 'seasonality', label: 'Seasonality', color: '#10b981' },
    { key: 'residual', label: 'Residual', color: '#64748b' },
  ];

  return (
    <div>
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={chartData} margin={{ top: 16, right: 24, left: 20, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="week_label" tick={{ fontSize: 11, fill: '#111827' }} />
          <YAxis
            tickFormatter={(v: unknown) => formatLakhsCrores(v as number)}
            tick={{ fontSize: 11, fill: '#111827' }}
          />
          <Tooltip
            formatter={(v: unknown, name: unknown) =>
              [formatLakhsCrores(v as number), name as string] as [string, string]
            }
          />
          <Bar dataKey="base_trend" name="Base Trend" stackId="d" fill="#94a3b8" />
          <Bar dataKey="festival" name="Festival" stackId="d" fill="#f59e0b" />
          <Bar dataKey="promo" name="Promo" stackId="d" fill="#3b82f6" />
          <Bar dataKey="seasonality" name="Seasonality" stackId="d" fill="#10b981" />
          <Bar dataKey="residual" name="Residual" stackId="d" fill="#64748b" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-3">
        {legendItems.map((item) => (
          <span key={item.key} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <span className="w-3 h-3 rounded-sm" style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>

      <div className="mt-4 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
        <span className="font-semibold">Insight:</span> Base trend accounts for ~60% of forecast
        revenue in all weeks. Festival uplift spikes to 25% in event weeks — these weeks
        drive outsized variance. Promo contribution is stable at 12%, suggesting limited upside
        from additional promo spend without improving targeting.
      </div>
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────

export default function ForecastExpansion({ core }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawView = searchParams.get('view') ?? 'forecast';

  const handleView = useCallback(
    (v: string) => {
      router.push('?view=' + v, { scroll: false });
    },
    [router]
  );

  const totalRevenue = core.forecast_14w.reduce((s, w) => s + w.forecast_revenue_inr, 0);
  const totalMargin = core.forecast_14w.reduce((s, w) => s + w.forecast_margin_inr, 0);
  const avgCIWidth =
    core.forecast_14w.reduce(
      (s, w) => s + (w.upper_ci_inr - w.lower_ci_inr) / w.forecast_revenue_inr,
      0
    ) /
    core.forecast_14w.length *
    100;
  const eventCount = core.forecast_14w.filter((w) => w.event_label).length;

  const kpiTiles = [
    {
      label: '14W Projected Revenue',
      value: formatLakhsCrores(totalRevenue),
    },
    {
      label: '14W Projected Margin',
      value: formatLakhsCrores(totalMargin),
    },
    {
      label: 'Avg CI Width',
      value: `±${avgCIWidth.toFixed(1)}%`,
    },
    {
      label: 'Events in Window',
      value: String(eventCount),
      subtext: 'weeks with events',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <DeepDiveHeader
        title="Revenue Forecast Analysis"
        subtitle="14-week forward projection with confidence intervals and scenario planning"
        backLabel="← Back to Price Intel"
        backHref="/price-intel?tab=forecasting"
      />
      <DeepDiveKPIStrip tiles={kpiTiles} />
      <DeepDiveTabs tabs={TABS} activeTab={rawView} onTabChange={handleView} />

      <div className="px-8 py-6">
        {rawView === 'forecast' && <ForecastTab core={core} />}
        {rawView === 'confidence' && <ConfidenceTab core={core} />}
        {rawView === 'scenarios' && <ScenariosTab core={core} />}
        {rawView === 'seasonality' && <SeasonalityTab core={core} />}
        {rawView === 'drivers' && <DriversTab core={core} />}
      </div>
    </div>
  );
}
