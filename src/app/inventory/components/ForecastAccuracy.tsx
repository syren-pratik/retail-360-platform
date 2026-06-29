'use client';


import { formatCrOrUsdMAuto, getLocaleAuto } from '@/app/lib/format-money';
import { useState } from 'react';
import {
  ComposedChart, Line, Bar, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import type { ForecastData, DeptAccuracy } from './InventoryDashboardContent';

interface Props {
  data: ForecastData | null;
}

const TREND_ICONS: Record<string, string> = {
  improving: '↑',
  stable: '→',
  declining: '↓',
};

const TREND_COLORS: Record<string, string> = {
  improving: 'text-emerald-600',
  stable: 'text-gray-500',
  declining: 'text-red-600',
};

export default function ForecastAccuracy({ data }: Props) {
  const [tab, setTab] = useState<'forecast' | 'accuracy' | 'models' | 'decomp'>('forecast');

  const kpis = data?.kpis;
  const forecastVsActual = data?.forecast_vs_actual ?? [];
  const accuracyByDept = data?.accuracy_by_dept ?? [];
  const accuracyTrend = data?.accuracy_trend_12w ?? [];
  const modelComparison = data?.model_comparison ?? [];
  const featureImportance = data?.feature_importance ?? [];
  const decomp = data?.demand_decomposition ?? [];

  const forecastDisplay = forecastVsActual.slice(-60);

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg p-4">
      {/* Header + KPI strip */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Forecast Accuracy</h3>
          {kpis && (
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              MAPE {kpis.mape_pct.toFixed(1)}% (was {kpis.mape_prior.toFixed(1)}%)
              {' · '}
              Bias {kpis.bias_pct > 0 ? '+' : ''}{kpis.bias_pct.toFixed(1)}% ({kpis.bias_direction})
              {' · '}
              <span className="text-red-600 font-medium">{formatCrOrUsdMAuto(kpis.lost_sales_from_miss_cr.toFixed(1))} lost sales</span>
            </p>
          )}
        </div>
        {kpis && (
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
              kpis.model_health === 'healthy'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : kpis.model_health === 'degraded'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {kpis.model_health}
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {([
          { key: 'forecast', label: 'Forecast vs Actual' },
          { key: 'accuracy', label: 'By Department' },
          { key: 'models', label: 'Model Performance' },
          { key: 'decomp', label: 'Decomposition' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              tab === t.key
                ? 'bg-[var(--accent-primary)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Forecast vs Actual */}
      {tab === 'forecast' && (
        <div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecastDisplay} margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9 }}
                  tickFormatter={v => {
                    const d = new Date(v);
                    return `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}`;
                  }}
                  interval={9}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v: unknown, name: unknown) => [
                    v === null || v === undefined ? 'N/A' : Number(v).toFixed(0),
                    name === 'forecast' ? 'Forecast' : name === 'actual' ? 'Actual' : String(name),
                  ]}
                  labelFormatter={(l: unknown) => new Date(String(l)).toLocaleDateString(getLocaleAuto(), { month: 'short', day: 'numeric' })}
                />
                <Area
                  dataKey="upper_bound"
                  name="upper_bound"
                  fill="#EEF2FF"
                  stroke="transparent"
                  legendType="none"
                />
                <Area
                  dataKey="lower_bound"
                  name="lower_bound"
                  fill="#FFFFFF"
                  stroke="transparent"
                  legendType="none"
                />
                <Line dataKey="actual" name="actual" stroke="#10B981" strokeWidth={2} dot={false} connectNulls={false} />
                <Line dataKey="forecast" name="forecast" stroke="#6366F1" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 justify-center mt-2">
            <div className="flex items-center gap-1.5"><div className="w-5 h-0.5 bg-emerald-500" /><span className="text-[10px] text-[var(--text-secondary)]">Actual</span></div>
            <div className="flex items-center gap-1.5"><div className="w-5 h-0.5 bg-indigo-500" style={{ borderTop: '2px dashed #6366F1', height: 0 }} /><span className="text-[10px] text-[var(--text-secondary)]">Forecast</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-indigo-50 border border-indigo-200" /><span className="text-[10px] text-[var(--text-secondary)]">Confidence band</span></div>
          </div>
        </div>
      )}

      {/* By Department */}
      {tab === 'accuracy' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Dept table */}
          <div className="overflow-y-auto max-h-64 space-y-1">
            <div className="grid grid-cols-[1fr_60px_56px_48px] gap-2 px-2 py-1">
              <span className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide">Department</span>
              <span className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide text-right">MAPE</span>
              <span className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide text-right">Accuracy</span>
              <span className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide text-center">Trend</span>
            </div>
            {accuracyByDept.map((d: DeptAccuracy) => (
              <div
                key={d.department}
                className="grid grid-cols-[1fr_60px_56px_48px] gap-2 items-center px-2 py-1.5 rounded hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <span className="text-xs font-medium text-[var(--text-primary)] truncate">{d.department}</span>
                <span className={`text-xs font-medium text-right ${d.mape <= 10 ? 'text-emerald-600' : d.mape <= 20 ? 'text-amber-600' : 'text-red-600'}`}>
                  {d.mape.toFixed(1)}%
                </span>
                <span className="text-xs text-right text-[var(--text-secondary)]">{d.accuracy_pct.toFixed(1)}%</span>
                <div className="flex justify-center">
                  <span className={`text-sm font-bold ${TREND_COLORS[d.trend]}`}>
                    {TREND_ICONS[d.trend]}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Accuracy trend */}
          <div className="h-64">
            <p className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide mb-2">12-Week Accuracy Trend</p>
            <ResponsiveContainer width="100%" height="90%">
              <ComposedChart data={accuracyTrend} margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="week" tick={{ fontSize: 9 }} tickFormatter={v => v.slice(-5)} interval={2} />
                <YAxis tick={{ fontSize: 9 }} domain={[70, 100]} />
                <Tooltip formatter={(v: unknown, name: unknown) => [
                  `${(v as number).toFixed(1)}%`,
                  name === 'accuracy_pct' ? 'Accuracy' : name === 'mape' ? 'MAPE' : 'Bias',
                ]} />
                <ReferenceLine y={90} stroke="#10B981" strokeDasharray="3 3" />
                <Line dataKey="accuracy_pct" name="accuracy_pct" stroke="#6366F1" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Model Performance */}
      {tab === 'models' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Model comparison table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[var(--bg-secondary)]">
                  <th className="text-left px-2 py-1.5 font-medium text-[var(--text-secondary)]">Model</th>
                  <th className="text-right px-2 py-1.5 font-medium text-[var(--text-secondary)]">Accuracy</th>
                  <th className="text-right px-2 py-1.5 font-medium text-[var(--text-secondary)]">MAPE</th>
                  <th className="text-center px-2 py-1.5 font-medium text-[var(--text-secondary)]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {modelComparison.map(m => (
                  <tr key={m.model} className="hover:bg-[var(--bg-secondary)]">
                    <td className="px-2 py-1.5 font-medium text-[var(--text-primary)]">{m.model}</td>
                    <td className={`px-2 py-1.5 text-right font-medium ${m.accuracy >= 90 ? 'text-emerald-600' : m.accuracy >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                      {m.accuracy.toFixed(1)}%
                    </td>
                    <td className="px-2 py-1.5 text-right text-[var(--text-secondary)]">{m.mape.toFixed(1)}%</td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                        m.status === 'production' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        m.status === 'shadow' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-gray-50 text-gray-600 border-gray-200'
                      }`}>
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Feature importance */}
          <div className="space-y-2">
            <p className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide">Feature Importance</p>
            {featureImportance.map(f => (
              <div key={f.feature} className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-secondary)] w-28 truncate">{f.feature}</span>
                <div className="flex-1 h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${f.importance * 100}%`,
                      background: f.direction === 'positive' ? '#10B981' : '#F59E0B',
                    }}
                  />
                </div>
                <span className="text-xs font-medium text-[var(--text-primary)] w-10 text-right">
                  {(f.importance * 100).toFixed(1)}%
                </span>
                <span className={`text-[10px] w-4 ${f.direction === 'positive' ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {f.direction === 'positive' ? '↑' : '↓'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Demand Decomposition */}
      {tab === 'decomp' && (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={decomp.slice(-60)} margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9 }}
                tickFormatter={v => {
                  const d = new Date(v);
                  return `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}`;
                }}
                interval={9}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(v: unknown, name: unknown) => [(v as number).toFixed(0), String(name)]}
                labelFormatter={(l: unknown) => new Date(String(l)).toLocaleDateString(getLocaleAuto(), { month: 'short', day: 'numeric' })}
              />
              <Bar dataKey="baseline" name="baseline" stackId="a" fill="#E0E7FF" />
              <Bar dataKey="trend" name="trend" stackId="a" fill="#818CF8" />
              <Bar dataKey="seasonal" name="seasonal" stackId="a" fill="#6366F1" />
              <Bar dataKey="promo_lift" name="promo_lift" stackId="a" fill="#F59E0B" />
              <Line dataKey="total" name="total" stroke="#EF4444" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap items-center gap-3 justify-center mt-2">
            {[
              { label: 'Baseline', color: '#E0E7FF', border: '#C7D2FE' },
              { label: 'Trend', color: '#818CF8', border: '#818CF8' },
              { label: 'Seasonal', color: '#6366F1', border: '#6366F1' },
              { label: 'Promo', color: '#F59E0B', border: '#F59E0B' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm border" style={{ background: item.color, borderColor: item.border }} />
                <span className="text-[10px] text-[var(--text-secondary)]">{item.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-0.5 bg-red-400" />
              <span className="text-[10px] text-[var(--text-secondary)]">Total</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
