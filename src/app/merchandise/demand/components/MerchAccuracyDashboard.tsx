'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import type { MerchDemandFullPayload } from '@/app/lib/merch-demand-types';
import { AIInsightButton } from '@/app/components/charts/ChartCard';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapeColor(v: number) {
  if (v <= 12) return 'var(--chart-emerald)';
  if (v <= 20) return 'var(--chart-amber)';
  return 'var(--chart-rose)';
}

// ─── Accuracy Trend (12w line chart) ─────────────────────────────────────────

function AccuracyTrendChart({ data }: { data: { week: string; mape_pct: number }[] }) {
  return (
    <div style={{ height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} interval={2} />
          <YAxis
            tick={{ fontSize: 9, fill: '#94A3B8' }}
            tickFormatter={(v: number) => `${v}%`}
            tickLine={false}
            axisLine={false}
            width={30}
            domain={[0, 'auto']}
          />
          <ReferenceLine y={15.9} stroke="#94A3B8" strokeDasharray="4 3" label={{ value: 'Test MAPE', position: 'right', fontSize: 8, fill: '#94A3B8' }} />
          <Tooltip formatter={(v: unknown) => [`${Number(v).toFixed(1)}%`, 'MAPE']} contentStyle={{ fontSize: 11 }} cursor={{ stroke: '#E2E8F0' }} />
          <Line dataKey="mape_pct" stroke="var(--chart-blue)" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Accuracy by Dimension (bar chart) ───────────────────────────────────────

function AccuracyDimensionChart({
  deptData,
  velocityData,
}: {
  deptData: { department: string; mape_pct: number; sku_count: number }[];
  velocityData: { velocity_class: string; mape_pct: number }[];
}) {
  const [dim, setDim] = useState<'dept' | 'velocity'>('dept');

  const data = dim === 'dept'
    ? deptData.map((d) => ({ name: d.department.replace(' & ', ' & ').split(' ')[0], mape_pct: d.mape_pct, full: d.department }))
    : velocityData.map((d) => ({ name: `Class ${d.velocity_class}`, mape_pct: d.mape_pct, full: `Velocity ${d.velocity_class}` }));

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {(['dept', 'velocity'] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDim(d)}
            className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
              dim === d
                ? 'bg-[var(--accent-primary-light)] text-[var(--accent-primary)] border-[var(--accent-primary)]'
                : 'border-[var(--border-default)] text-[var(--text-secondary)]'
            }`}
          >
            {d === 'dept' ? 'By department' : 'By velocity'}
          </button>
        ))}
      </div>
      <div style={{ height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 20 }} barSize={dim === 'velocity' ? 32 : undefined}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 8, fill: '#94A3B8' }}
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
              interval={0}
              angle={dim === 'dept' ? -30 : 0}
              textAnchor={dim === 'dept' ? 'end' : 'middle'}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#94A3B8' }}
              tickFormatter={(v: number) => `${v}%`}
              tickLine={false}
              axisLine={false}
              width={30}
              domain={[0, 'auto']}
            />
            <Tooltip
              formatter={(v: unknown) => [`${Number(v).toFixed(1)}%`, 'MAPE']}
              contentStyle={{ fontSize: 11 }}
              cursor={{ fill: '#F1F5F9' }}
            />
            <Bar dataKey="mape_pct" radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {data.map((d, i) => (
                <Cell key={i} fill={mapeColor(d.mape_pct)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Accuracy by Horizon (bar chart) ─────────────────────────────────────────

function AccuracyByHorizonChart({
  data,
}: {
  data: Record<string, { mape_pct: number; wmape_pct: number; bias_pct: number; sku_count: number }>;
}) {
  const chartData = Object.entries(data).map(([horizon, v]) => ({
    horizon: `${horizon}`,
    mape_pct: v.mape_pct,
    wmape_pct: v.wmape_pct,
  }));

  return (
    <div style={{ height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="horizon" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
          <YAxis
            tick={{ fontSize: 9, fill: '#94A3B8' }}
            tickFormatter={(v: number) => `${v}%`}
            tickLine={false}
            axisLine={false}
            width={30}
            domain={[0, 'auto']}
          />
          <Tooltip
            formatter={(v: unknown, name: unknown) => [`${Number(v).toFixed(1)}%`, name === 'mape_pct' ? 'MAPE' : 'wMAPE']}
            contentStyle={{ fontSize: 11 }}
            cursor={{ fill: '#F1F5F9' }}
          />
          <Bar dataKey="mape_pct" name="MAPE" fill="var(--chart-blue)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="wmape_pct" name="wMAPE" fill="var(--chart-indigo)" radius={[3, 3, 0, 0]} isAnimationActive={false} opacity={0.7} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Worst Forecasted SKUs ────────────────────────────────────────────────────

type WorstSKU = { sku_id: string; product_name: string; department: string; mape_pct: number; direction: string; avg_error_units: number };

function WorstSKUList({ skus }: { skus: WorstSKU[] }) {
  const maxMape = Math.max(...skus.map((s) => s.mape_pct), 1);
  return (
    <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 180 }}>
      {skus.map((sku) => (
        <div key={sku.sku_id} className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[var(--text-primary)] truncate">{sku.product_name}</p>
            <p className="text-[10px] text-[var(--text-tertiary)] truncate">{sku.department}</p>
          </div>
          <div className="w-20 flex-shrink-0">
            <div className="w-full bg-[var(--bg-secondary)] rounded-full h-1.5 mb-0.5">
              <div
                className="h-1.5 rounded-full"
                style={{ width: `${(sku.mape_pct / maxMape) * 100}%`, backgroundColor: mapeColor(sku.mape_pct) }}
              />
            </div>
          </div>
          <span className="text-xs font-semibold tabular-nums text-[var(--text-primary)] w-12 text-right flex-shrink-0">
            {sku.mape_pct.toFixed(0)}%
          </span>
          <span className={`text-[9px] flex-shrink-0 ${sku.direction === 'over' ? 'text-rose-500' : 'text-amber-500'}`}>
            {sku.direction}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Feature Importance ───────────────────────────────────────────────────────

function FeatureImportanceChart({ features }: { features: { feature: string; display_name: string; importance: number }[] }) {
  const maxImp = Math.max(...features.map((f) => f.importance), 0.001);
  return (
    <div className="space-y-2">
      {features.map((f, i) => (
        <div key={f.feature} className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--text-secondary)] w-4 flex-shrink-0 tabular-nums text-right">{i + 1}</span>
          <span className="text-xs text-[var(--text-secondary)] w-44 flex-shrink-0 truncate">{f.display_name}</span>
          <div className="flex-1 bg-[var(--bg-secondary)] rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${(f.importance / maxImp) * 100}%`, backgroundColor: 'var(--chart-blue)' }}
            />
          </div>
          <span className="text-xs font-medium tabular-nums text-[var(--text-primary)] w-10 text-right flex-shrink-0">
            {(f.importance * 100).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Model Card Accordion ─────────────────────────────────────────────────────

function ModelCardAccordion({ card }: { card: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const prod = card.production_model as Record<string, unknown> | undefined;

  const metrics = [
    { label: 'Test MAPE', value: `${((card.test_mape as number ?? 0) * 100).toFixed(1)}%` },
    { label: 'Test wMAPE', value: `${((card.test_wmape as number ?? 0) * 100).toFixed(1)}%` },
    { label: 'Test MAE', value: (card.test_mae as number ?? 0).toFixed(2) },
    { label: 'Test RMSE', value: (card.test_rmse as number ?? 0).toFixed(2) },
    { label: 'Test Bias', value: `${((card.test_bias as number ?? 0) * 100).toFixed(2)}%` },
  ];

  return (
    <div className="border border-[var(--border-default)] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-secondary)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {(prod?.name as string) ?? 'Production Model'}
          </span>
          <span className="badge badge-positive text-[10px]">
            {(card.drift_status as string) === 'stable' ? 'Stable' : card.drift_status as string}
          </span>
          {prod && (
            <span className="text-xs text-[var(--text-tertiary)]">
              {prod.type as string} · {prod.registry as string} · trained {prod.last_trained as string}
            </span>
          )}
        </div>
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-[var(--border-subtle)]">
          <div className="grid grid-cols-5 gap-4 pt-3">
            {metrics.map((m) => (
              <div key={m.label}>
                <p className="text-[10px] text-[var(--text-tertiary)]">{m.label}</p>
                <p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">{m.value}</p>
              </div>
            ))}
          </div>
          {typeof card.challenger_note === 'string' && card.challenger_note ? (
            <p className="mt-3 text-xs text-[var(--text-secondary)] border-t border-[var(--border-subtle)] pt-3">
              {card.challenger_note}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  core: MerchDemandFullPayload;
}

export default function MerchAccuracyDashboard({ core }: Props) {
  const router = useRouter();

  const modelCard = core.model_card ?? {};
  const accuracyTrend12w = useMemo(
    () => (modelCard.accuracy_trend_12w as { week: string; mape_pct: number }[]) ?? [],
    [modelCard],
  );
  const deptData = useMemo(
    () => (modelCard.accuracy_by_department as { department: string; mape_pct: number; sku_count: number }[]) ?? [],
    [modelCard],
  );
  const velocityData = useMemo(
    () => (modelCard.accuracy_by_velocity as { velocity_class: string; mape_pct: number }[]) ?? [],
    [modelCard],
  );
  const featureImportance = useMemo(
    () => (modelCard.feature_importance_global as { feature: string; display_name: string; importance: number }[]) ?? [],
    [modelCard],
  );
  const worstSKUs = useMemo(
    () => (core.worst_forecasted_skus as WorstSKU[]) ?? [],
    [core.worst_forecasted_skus],
  );
  const accuracyByHorizon = core.accuracy_by_horizon ?? {};

  const dashboard = (
    <div className="space-y-6 py-2">
      {/* 2×2 grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-[var(--text-primary)]">Accuracy Trend (12 weeks)</p>
            <AIInsightButton id="merch-accuracy-trend" title="Accuracy Trend (12 weeks)" data={accuracyTrend12w as unknown as Record<string, unknown>[]} />
          </div>
          <p className="text-[10px] text-[var(--text-tertiary)] mb-3">MAPE % over last 12 weeks</p>
          <AccuracyTrendChart data={accuracyTrend12w} />
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-[var(--text-primary)]">Accuracy by Dimension</p>
            <AIInsightButton id="merch-accuracy-by-dimension" title="Accuracy by Dimension" data={deptData as unknown as Record<string, unknown>[]} />
          </div>
          <p className="text-[10px] text-[var(--text-tertiary)] mb-2">MAPE % breakdown</p>
          <AccuracyDimensionChart deptData={deptData} velocityData={velocityData} />
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-[var(--text-primary)]">Accuracy by Horizon</p>
            <AIInsightButton id="merch-accuracy-by-horizon" title="Accuracy by Horizon" data={Object.entries(accuracyByHorizon).map(([horizon, v]) => ({ horizon, ...v })) as unknown as Record<string, unknown>[]} />
          </div>
          <p className="text-[10px] text-[var(--text-tertiary)] mb-3">MAPE & wMAPE by forecast window</p>
          <AccuracyByHorizonChart data={accuracyByHorizon} />
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-[var(--text-primary)]">Worst Forecasted SKUs</p>
            <AIInsightButton id="merch-worst-forecasted-skus" title="Worst Forecasted SKUs" data={worstSKUs.slice(0, 8) as unknown as Record<string, unknown>[]} />
          </div>
          <p className="text-[10px] text-[var(--text-tertiary)] mb-3">Highest MAPE — need attention</p>
          <WorstSKUList skus={worstSKUs.slice(0, 8)} />
        </div>
      </div>

      {/* Feature importance — full width */}
      {featureImportance.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-[var(--text-primary)]">Feature Importance</p>
            <AIInsightButton id="merch-feature-importance" title="Feature Importance" data={featureImportance as unknown as Record<string, unknown>[]} />
          </div>
          <p className="text-[10px] text-[var(--text-tertiary)] mb-4">Global SHAP-based feature importance from production model</p>
          <FeatureImportanceChart features={featureImportance} />
        </div>
      )}

      {/* Model card accordion */}
      {Object.keys(modelCard).length > 0 && (
        <div>
          <p className="text-xs font-medium text-[var(--text-primary)] mb-2">Model Card</p>
          <ModelCardAccordion card={modelCard} />
        </div>
      )}
    </div>
  );

  return (
    <section id="merch-accuracy-dashboard">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Forecast Accuracy & Model Intelligence</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Model performance · feature drivers · horizon degradation
          </p>
        </div>
        <button
          onClick={() => router.push('/merchandise/demand/deep-dive/accuracy')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] border border-[var(--border-default)] rounded-md hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 6V2h4M10 6v4H6M7.5 2H10v2.5M4.5 10H2V7.5" />
          </svg>
          Deep Dive
        </button>
      </div>
      {dashboard}
    </section>
  );
}
