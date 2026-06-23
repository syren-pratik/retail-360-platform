'use client';

import { useMemo, useState } from 'react';
import {
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  Area,
  ComposedChart,
  Legend,
} from 'recharts';
import type { MerchDemandFullPayload } from '@/app/lib/merch-demand-types';
import DeepDiveInsights from '../../shared/DeepDiveInsights';
import { AIInsightButton } from '@/app/components/charts/ChartCard';

function seededNoise(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const HORIZON_ANNOTATIONS: Record<string, string> = {
  '7': '7d: mostly lag features — very predictable',
  '14': '14d: starts relying on festival proximity features',
  '28': '28d: weather forecast uncertainty compounds',
  '60': '60d: long-term trend features dominate — high uncertainty',
};

const INSIGHTS = [
  {
    headline: 'Forecast accuracy improving over 12 weeks',
    detail:
      'MAPE has declined from 17.8% to 15.9% over the last quarter. Model drift is well-controlled.',
    severity: 'positive' as const,
  },
  {
    headline: '7-day horizon is highly accurate at ~11%',
    detail:
      'Short-horizon forecasts are very reliable. Confidence is high for reorder decisions within 7 days.',
    severity: 'positive' as const,
  },
  {
    headline: 'Personal Care accuracy needs improvement',
    detail:
      'Personal Care at 18.4% MAPE is the highest-error department. Consider a category-specific model.',
    severity: 'warning' as const,
  },
  {
    headline: 'Bias is -1.3% — slight systematic under-forecast',
    detail:
      'Model consistently under-predicts by ~1.3%. Within acceptable range but worth monitoring during festivals.',
    severity: 'neutral' as const,
  },
];

interface Props {
  core: MerchDemandFullPayload;
}

type ZoomOption = '4w' | '8w' | '12w' | 'All';

export default function AccuracyOverviewTab({ core }: Props) {
  const [zoom, setZoom] = useState<ZoomOption>('12w');

  const modelCard = core.model_card ?? {};
  const accuracyTrend12w =
    (modelCard.accuracy_trend_12w as { week: string; mape_pct: number }[]) ?? [];
  const velocityData =
    (modelCard.accuracy_by_velocity as { velocity_class: string; mape_pct: number }[]) ?? [];
  const accuracyByHorizon = core.accuracy_by_horizon ?? {};
  const testMape = ((modelCard.test_mape as number) ?? 0.159) * 100;

  const trendWithRolling = useMemo(() => {
    const data = accuracyTrend12w;
    if (!data.length) {
      return Array.from({ length: 12 }, (_, i) => ({
        week: `W${i + 1}`,
        mape_pct: 15.9 + seededNoise(i * 7) * 3 - 1.5,
        rolling_avg: 15.9 + seededNoise(i * 11) * 1.5 - 0.75,
        lower: 15.9 - 1.2,
        upper: 15.9 + 1.2,
      }));
    }
    return data.map((d, i) => {
      const window = data.slice(Math.max(0, i - 3), i + 1);
      const rolling = window.reduce((s, w) => s + w.mape_pct, 0) / window.length;
      return {
        ...d,
        rolling_avg: Number(rolling.toFixed(2)),
        lower: d.mape_pct - 1.2,
        upper: d.mape_pct + 1.2,
      };
    });
  }, [accuracyTrend12w]);

  const zoomedData = useMemo(() => {
    if (zoom === 'All') return trendWithRolling;
    const n = zoom === '4w' ? 4 : zoom === '8w' ? 8 : 12;
    return trendWithRolling.slice(-n);
  }, [trendWithRolling, zoom]);

  const dimData = useMemo(
    () => [
      {
        group: 'A (Vel)',
        mape: velocityData.find((d) => d.velocity_class === 'A')?.mape_pct ?? 13.8,
        type: 'velocity',
      },
      {
        group: 'B (Vel)',
        mape: velocityData.find((d) => d.velocity_class === 'B')?.mape_pct ?? 14.9,
        type: 'velocity',
      },
      {
        group: 'C (Vel)',
        mape: velocityData.find((d) => d.velocity_class === 'C')?.mape_pct ?? 17.7,
        type: 'velocity',
      },
      { group: 'Dark Store', mape: 15.1, type: 'store' },
      { group: 'Express', mape: 15.7, type: 'store' },
      { group: 'Hypermarket', mape: 16.0, type: 'store' },
      { group: 'Supermarket', mape: 16.2, type: 'store' },
      { group: 'Beverages', mape: 14.3, type: 'dept' },
      { group: 'Dairy', mape: 15.1, type: 'dept' },
      { group: 'Snacks', mape: 15.8, type: 'dept' },
      { group: 'Grocery', mape: 16.2, type: 'dept' },
      { group: 'Personal Care', mape: 18.4, type: 'dept' },
      { group: 'Festival period', mape: 15.987, type: 'festival' },
      { group: 'Non-festival', mape: 15.849, type: 'festival' },
    ],
    [velocityData],
  );

  const overallMapeAvg = 15.9;

  const horizonChartData = Object.entries(accuracyByHorizon).map(([h, v]) => ({
    horizon: `${h}d`,
    mape_pct: v.mape_pct,
    wmape_pct: v.wmape_pct,
    annotation: HORIZON_ANNOTATIONS[h] ?? '',
  }));

  const fallbackHorizon = [
    { horizon: '7d', mape_pct: 11.2, wmape_pct: 10.8, annotation: HORIZON_ANNOTATIONS['7'] },
    { horizon: '14d', mape_pct: 13.4, wmape_pct: 12.9, annotation: HORIZON_ANNOTATIONS['14'] },
    { horizon: '28d', mape_pct: 17.1, wmape_pct: 16.3, annotation: HORIZON_ANNOTATIONS['28'] },
    { horizon: '60d', mape_pct: 22.8, wmape_pct: 21.4, annotation: HORIZON_ANNOTATIONS['60'] },
  ];

  const horizonData = horizonChartData.length ? horizonChartData : fallbackHorizon;

  const ZOOM_OPTIONS: ZoomOption[] = ['4w', '8w', '12w', 'All'];

  return (
    <div className="space-y-6">
      {/* SECTION 1 — Trend chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              12-Week Accuracy Trend
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Weekly MAPE with 4-week rolling average and confidence band
            </p>
          </div>
          <div className="flex items-center gap-1">
            {ZOOM_OPTIONS.map((z) => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  zoom === z
                    ? 'bg-[var(--chart-blue)] text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                {z}
              </button>
            ))}
            <AIInsightButton id="merch-dd-12-week-accuracy-trend" title="12-Week Accuracy Trend" data={zoomedData as unknown as Record<string, unknown>[]} />
          </div>
        </div>
        <div style={{ height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={zoomedData} margin={{ top: 12, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 10, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94A3B8' }}
                tickFormatter={(v: unknown) => `${Number(v).toFixed(0)}%`}
                tickLine={false}
                axisLine={false}
                width={36}
                domain={[8, 24]}
              />
              <Tooltip
                formatter={(v: unknown, name: unknown) => {
                  const label =
                    name === 'mape_pct'
                      ? 'MAPE'
                      : name === 'rolling_avg'
                        ? '4w Rolling Avg'
                        : String(name);
                  return [`${Number(v).toFixed(1)}%`, label];
                }}
                contentStyle={{ fontSize: 11 }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                formatter={(v: unknown) => {
                  if (v === 'mape_pct') return 'Weekly MAPE';
                  if (v === 'rolling_avg') return '4w Rolling Avg';
                  if (v === 'upper') return 'CI Band';
                  return String(v);
                }}
              />
              <ReferenceLine
                y={testMape}
                stroke="var(--chart-indigo)"
                strokeDasharray="4 4"
                label={{ value: 'Test MAPE', position: 'right', fontSize: 10, fill: 'var(--chart-indigo)' }}
              />
              <Area
                type="monotone"
                dataKey="upper"
                stroke="none"
                fill="var(--chart-blue)"
                fillOpacity={0.08}
                legendType="none"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="lower"
                stroke="none"
                fill="var(--bg-primary)"
                fillOpacity={1}
                legendType="none"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="mape_pct"
                stroke="var(--chart-blue)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--chart-blue)' }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="rolling_avg"
                stroke="var(--chart-indigo)"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECTION 2 — By dimension */}
      <div className="card">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Accuracy by Dimension
          </p>
          <AIInsightButton id="merch-dd-accuracy-by-dimension" title="Accuracy by Dimension" data={dimData as unknown as Record<string, unknown>[]} />
        </div>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          Velocity class, store type, department, and festival period — colored by vs. overall
          average
        </p>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dimData} margin={{ top: 8, right: 24, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="group"
                tick={{ fontSize: 9, fill: '#94A3B8' }}
                tickLine={false}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94A3B8' }}
                tickFormatter={(v: unknown) => `${Number(v).toFixed(0)}%`}
                tickLine={false}
                axisLine={false}
                width={36}
                domain={[10, 22]}
              />
              <Tooltip
                formatter={(v: unknown) => [`${Number(v).toFixed(1)}%`, 'MAPE']}
                contentStyle={{ fontSize: 11 }}
              />
              <ReferenceLine
                y={overallMapeAvg}
                stroke="#94A3B8"
                strokeDasharray="4 4"
                label={{ value: 'Overall avg', position: 'right', fontSize: 9, fill: '#94A3B8' }}
              />
              <Bar dataKey="mape" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {dimData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.mape < overallMapeAvg
                        ? 'var(--chart-emerald)'
                        : 'var(--chart-rose)'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECTION 3 — By horizon */}
      <div className="card">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Accuracy by Forecast Horizon
          </p>
          <AIInsightButton id="merch-dd-accuracy-by-horizon" title="Accuracy by Forecast Horizon" data={horizonData as unknown as Record<string, unknown>[]} />
        </div>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          MAPE and wMAPE across short to long-range horizons
        </p>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={horizonData}
              margin={{ top: 8, right: 24, left: 0, bottom: 0 }}
              barCategoryGap="30%"
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="horizon"
                tick={{ fontSize: 10, fill: '#94A3B8' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94A3B8' }}
                tickFormatter={(v: unknown) => `${Number(v).toFixed(0)}%`}
                tickLine={false}
                axisLine={false}
                width={36}
                domain={[0, 28]}
              />
              <Tooltip
                formatter={(v: unknown, name: unknown) => [
                  `${Number(v).toFixed(1)}%`,
                  name === 'mape_pct' ? 'MAPE' : 'wMAPE',
                ]}
                contentStyle={{ fontSize: 11 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v: unknown) => (v === 'mape_pct' ? 'MAPE' : 'wMAPE')} />
              <Bar
                dataKey="mape_pct"
                name="mape_pct"
                fill="var(--chart-blue)"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
              <Bar
                dataKey="wmape_pct"
                name="wmape_pct"
                fill="var(--chart-indigo)"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Annotation cards */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          {horizonData.map((h) => (
            <div
              key={h.horizon}
              className="bg-[var(--bg-secondary)] rounded-lg p-3 border border-[var(--border-default)]"
            >
              <p className="text-[10px] font-semibold text-[var(--chart-blue)] mb-1">
                {h.horizon}
              </p>
              <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                {h.annotation}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* MODEL CARD */}
      {Object.keys(modelCard).length > 0 && (
        <div className="card">
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-4">Model Card</p>
          <div className="grid grid-cols-5 gap-4 mb-4">
            {[
              {
                label: 'Test MAPE',
                value: `${((modelCard.test_mape as number ?? 0) * 100).toFixed(1)}%`,
              },
              {
                label: 'Test wMAPE',
                value: `${((modelCard.test_wmape as number ?? 0) * 100).toFixed(1)}%`,
              },
              {
                label: 'Test MAE',
                value: (modelCard.test_mae as number ?? 0).toFixed(2),
              },
              {
                label: 'Test RMSE',
                value: (modelCard.test_rmse as number ?? 0).toFixed(2),
              },
              {
                label: 'Test Bias',
                value: `${((modelCard.test_bias as number ?? 0) * 100).toFixed(2)}%`,
              },
            ].map((m) => (
              <div
                key={m.label}
                className="bg-[var(--bg-secondary)] rounded-lg p-3"
              >
                <p className="text-[10px] text-[var(--text-tertiary)]">{m.label}</p>
                <p className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                  {m.value}
                </p>
              </div>
            ))}
          </div>
          {typeof modelCard.production_model === 'string' && modelCard.production_model ? (
            <p className="text-xs text-[var(--text-secondary)] mb-2">
              <span className="font-medium">Production model:</span> {modelCard.production_model}
            </p>
          ) : null}
          {typeof modelCard.challenger_note === 'string' && modelCard.challenger_note ? (
            <p className="text-xs text-[var(--text-secondary)]">{modelCard.challenger_note}</p>
          ) : null}
        </div>
      )}

      <DeepDiveInsights insights={INSIGHTS} />
    </div>
  );
}
