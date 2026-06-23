'use client';

import { useMemo } from 'react';
import {
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ComposedChart,
  Line,
  Legend,
} from 'recharts';
import type { MerchDemandFullPayload } from '@/app/lib/merch-demand-types';
import DeepDiveInsights from '../../shared/DeepDiveInsights';
import { AIInsightButton } from '@/app/components/charts/ChartCard';

function seededNoise(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const VEL_COLORS: Record<string, string> = {
  A: 'var(--chart-emerald)',
  B: 'var(--chart-blue)',
  C: 'var(--chart-amber)',
};

const CATEGORY_BIAS = [
  { category: 'Dal & Pulses', bias: -2.1 },
  { category: 'Edible Oil', bias: -0.8 },
  { category: 'Tea', bias: 1.2 },
  { category: 'Ice Cream', bias: -3.4 },
  { category: 'Chips & Namkeen', bias: 0.6 },
  { category: 'Rice', bias: -1.5 },
  { category: 'Biscuits', bias: 0.3 },
  { category: 'Soft Drinks', bias: -0.9 },
  { category: 'Personal Care', bias: 1.8 },
  { category: 'Dairy', bias: -2.2 },
].sort((a, b) => a.bias - b.bias);

function biasColor(bias: number): string {
  if (bias < -2) return 'var(--chart-rose)';
  if (bias < -1) return 'var(--chart-amber)';
  if (bias > 1) return 'var(--chart-blue)';
  return 'var(--chart-slate, #94A3B8)';
}

const INSIGHTS = [
  {
    headline: 'Slight systematic under-forecast at -1.3%',
    detail:
      'The model consistently under-predicts. This is within acceptable range but tends toward understock risk.',
    severity: 'warning' as const,
  },
  {
    headline: 'Ice Cream has highest negative bias at -3.4%',
    detail:
      'Ice Cream demand is persistently underestimated. Consider adding temperature-driven demand features.',
    severity: 'warning' as const,
  },
  {
    headline: 'Class C SKUs show largest bias magnitude',
    detail:
      'Low-velocity SKUs have more volatile bias. Wider confidence intervals are appropriate for these items.',
    severity: 'neutral' as const,
  },
  {
    headline: 'No retraining needed at current bias level',
    detail:
      'At -1.3% overall bias, model is within acceptable drift range. Next review scheduled in 4 weeks.',
    severity: 'positive' as const,
  },
];

// Perfect forecast line data (y = x)
const perfectLine = [
  { x: 50, y: 50 },
  { x: 400, y: 400 },
];

interface Props {
  core: MerchDemandFullPayload;
}

export default function BiasAnalysisTab({ core }: Props) {
  const scatterData = useMemo(() => {
    return core.skus.slice(0, 30).map((sku, i) => {
      const baseForecast = 100 + seededNoise(i * 7) * 300;
      const biasAdj = -0.013;
      const actual = baseForecast * (1 - biasAdj + seededNoise(i * 11) * 0.15 - 0.075);
      return {
        forecast: Number(baseForecast.toFixed(0)),
        actual: Number(actual.toFixed(0)),
        name: sku.product_name,
        velocity: sku.velocity_class,
        revenue: sku.price_inr * baseForecast,
      };
    });
  }, [core.skus]);

  return (
    <div className="space-y-6">
      {/* SECTION 1 — Forecast vs Actual scatter */}
      <div className="card">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Forecast vs Actual — Bias Scatter
          </p>
          <AIInsightButton id="merch-dd-bias-scatter" title="Forecast vs Actual — Bias Scatter" data={scatterData as unknown as Record<string, unknown>[]} />
        </div>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          Points below the diagonal indicate under-forecast. Colored by velocity class.
        </p>
        <div style={{ height: 440 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart margin={{ top: 20, right: 20, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis
                type="number"
                dataKey="x"
                name="Forecast"
                domain={[0, 'auto']}
                tick={{ fontSize: 9, fill: '#94A3B8' }}
                tickLine={false}
                label={{
                  value: 'Forecast (units)',
                  position: 'insideBottom',
                  offset: -10,
                  fontSize: 10,
                  fill: '#94A3B8',
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Actual"
                domain={[0, 'auto']}
                tick={{ fontSize: 9, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={false}
                width={40}
                label={{
                  value: 'Actual (units)',
                  angle: -90,
                  position: 'insideLeft',
                  fontSize: 10,
                  fill: '#94A3B8',
                }}
              />
              <Tooltip
                content={({ payload }) => {
                  if (!payload?.length) return null;
                  const p = payload[0]?.payload as {
                    x: number;
                    y: number;
                    name?: string;
                  };
                  const bias = p.x > 0 ? (((p.y - p.x) / p.x) * 100).toFixed(1) : '0';
                  return (
                    <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-sm">
                      {p.name && (
                        <p className="text-xs font-semibold text-[var(--text-primary)] mb-1 max-w-[180px] truncate">
                          {p.name}
                        </p>
                      )}
                      <p className="text-xs text-[var(--text-secondary)]">
                        Forecast: {p.x} units
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Actual: {p.y} units
                      </p>
                      <p
                        className={`text-xs font-medium ${Number(bias) >= 0 ? 'text-rose-600' : 'text-amber-600'}`}
                      >
                        Bias: {Number(bias) >= 0 ? '+' : ''}
                        {bias}%
                      </p>
                    </div>
                  );
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 16 }}
                formatter={(v: unknown) =>
                  v === 'perfectLine'
                    ? 'Perfect forecast (y=x)'
                    : v === 'A'
                      ? 'Class A'
                      : v === 'B'
                        ? 'Class B'
                        : v === 'C'
                          ? 'Class C'
                          : String(v)
                }
              />
              {/* Perfect forecast reference line as a Line series */}
              <Line
                data={perfectLine}
                type="linear"
                dataKey="y"
                dot={false}
                stroke="#94A3B8"
                strokeDasharray="6 3"
                strokeWidth={1}
                name="perfectLine"
                legendType="line"
                isAnimationActive={false}
              />
              {(['A', 'B', 'C'] as const).map((vel) => (
                <Scatter
                  key={vel}
                  name={vel}
                  data={scatterData
                    .filter((d) => d.velocity === vel)
                    .map((d) => ({ x: d.forecast, y: d.actual, name: d.name }))}
                  fill={VEL_COLORS[vel]}
                  opacity={0.75}
                  isAnimationActive={false}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-3 italic">
          Most points are slightly below the diagonal — consistent with bias of -1.3% (slight
          under-forecast)
        </p>
        {/* Velocity class legend dots */}
        <div className="flex items-center gap-6 mt-2">
          {(['A', 'B', 'C'] as const).map((vel) => (
            <div key={vel} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: VEL_COLORS[vel] }}
              />
              <span className="text-xs text-[var(--text-secondary)]">Class {vel}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2 — Bias by category */}
      <div className="card">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Bias by Category
          </p>
          <AIInsightButton id="merch-dd-bias-by-category" title="Bias by Category" data={CATEGORY_BIAS as unknown as Record<string, unknown>[]} />
        </div>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          Positive = over-forecast · Negative = under-forecast
        </p>
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={CATEGORY_BIAS}
              layout="vertical"
              margin={{ top: 4, right: 40, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis
                type="number"
                domain={[-5, 3]}
                tick={{ fontSize: 10, fill: '#94A3B8' }}
                tickFormatter={(v: unknown) => `${Number(v).toFixed(0)}%`}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="category"
                tick={{ fontSize: 10, fill: '#64748B' }}
                tickLine={false}
                axisLine={false}
                width={110}
              />
              <Tooltip
                formatter={(v: unknown) => [
                  `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(1)}%`,
                  'Bias',
                ]}
                contentStyle={{ fontSize: 11 }}
              />
              <ReferenceLine
                x={0}
                stroke="#64748B"
                strokeWidth={1.5}
                label={{ value: 'Unbiased', position: 'top', fontSize: 9, fill: '#64748B' }}
              />
              <Bar dataKey="bias" radius={[0, 3, 3, 0]} isAnimationActive={false}>
                {CATEGORY_BIAS.map((entry, i) => (
                  <Cell key={i} fill={biasColor(entry.bias)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Color legend */}
        <div className="flex items-center gap-6 mt-3 flex-wrap">
          {[
            { color: 'var(--chart-rose)', label: 'Strong under-forecast (< -2%)' },
            { color: 'var(--chart-amber)', label: 'Mild under-forecast (-1 to -2%)' },
            { color: 'var(--chart-slate, #94A3B8)', label: 'Near-neutral' },
            { color: 'var(--chart-blue)', label: 'Over-forecast (> +1%)' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[10px] text-[var(--text-secondary)]">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3 — Interpretation */}
      <div className="card border-l-4 border-l-amber-400 bg-amber-50">
        <p className="text-sm font-semibold text-amber-800 mb-3">Bias Interpretation</p>
        <div className="space-y-2 text-xs text-amber-900">
          <p>
            <strong>Overall bias: -1.3% (slight under-forecast)</strong>
          </p>
          <p>
            Effect: we consistently under-predict demand by ~1.3%. For a ₹100 forecast, actual is
            typically ₹101.3.
          </p>
          <p>
            Risk: leads to systematic understock. Recommend monitoring bias during festival periods
            when under-forecast risk is highest.
          </p>
          <p>
            Action: no model retraining needed at this bias level — within acceptable range. Review
            if bias exceeds ±5%.
          </p>
        </div>
      </div>

      <DeepDiveInsights insights={INSIGHTS} />
    </div>
  );
}
