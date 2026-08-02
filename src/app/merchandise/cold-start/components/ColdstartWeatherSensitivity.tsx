'use client';

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  ErrorBar,
  LabelList,
  AreaChart,
  Area,
  ReferenceArea,
} from 'recharts';
import ChartCard from '@/app/components/charts/ChartCard';
import { useTenant } from '@/app/context/TenantContext';
import type {
  WeatherTemperatureElasticity,
  WeatherMonsoonImpact,
  WeatherMonsoonMonth,
  WeatherMonsoonRecommendation,
  WeatherStoreRisk,
  WeatherSignalInput,
} from '@/app/lib/coldstart-types';

interface Props {
  temperatureElasticity: WeatherTemperatureElasticity[];
  monsoonImpact: WeatherMonsoonImpact[];
  monsoonCalendar: WeatherMonsoonMonth[];
  monsoonRecommendation: WeatherMonsoonRecommendation;
  storeRisk: WeatherStoreRisk[];
  signalInputs: WeatherSignalInput[];
}

function formatLakhs(n: number): string {
  return `₹${(n / 1e5).toFixed(0)}L`;
}

function riskCellClass(risk: string): string {
  switch (risk) {
    case 'low':      return 'bg-emerald-100 text-emerald-700';
    case 'medium':   return 'bg-amber-100 text-amber-700';
    case 'high':     return 'bg-rose-100 text-rose-700';
    case 'critical': return 'bg-rose-200 text-rose-800 ring-1 ring-rose-400';
    default:         return 'bg-slate-100 text-slate-600';
  }
}

function riskCellLabel(risk: string): string {
  switch (risk) {
    case 'low':      return 'L';
    case 'medium':   return 'M';
    case 'high':     return 'H';
    case 'critical': return 'C';
    default:         return '?';
  }
}

function barColor(direction: string): string {
  if (direction === 'positive') return '#10b981';
  if (direction === 'negative') return '#f43f5e';
  return '#94a3b8';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TempTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
  if (!active || !payload?.length) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = payload[0]?.payload as any;
  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-lg text-xs min-w-[220px]">
      <p className="font-semibold text-[var(--text-primary)] mb-1">{d.category}</p>
      <p className="text-[var(--text-secondary)]">
        Elasticity: <span className="font-mono font-bold">{d.elasticity_pct_per_c > 0 ? '+' : ''}{d.elasticity_pct_per_c}%/°C</span>
      </p>
      <p className="text-[var(--text-secondary)]">Threshold: above {d.threshold_c}°C</p>
      <p className="text-[var(--text-tertiary)]">
        95% CI: [{d.confidence_low_pct > 0 ? '+' : ''}{d.confidence_low_pct}, +{d.confidence_high_pct > 0 ? '+' : ''}{d.confidence_high_pct}]%/°C
      </p>
      <p className="text-[var(--text-tertiary)]">{d.n_observations.toLocaleString()} observations</p>
    </div>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MonsoonWindowTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
  if (!active || !payload?.length) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = payload[0]?.payload as WeatherMonsoonMonth;
  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-lg text-xs min-w-[200px]">
      <p className="font-semibold text-[var(--text-primary)] mb-1">{d.month_name}</p>
      <p className="text-[var(--text-secondary)]">Risk index: <span className="font-mono font-bold">{d.risk_index}</span></p>
      <p className="text-[var(--text-secondary)]">Tier: <span className="font-semibold capitalize">{d.risk_tier}</span></p>
      <p className="text-[var(--text-secondary)]">Typical rainfall: {d.typical_rainfall_mm}mm</p>
      {d.is_pull_forward_window && (
        <p className="text-blue-600 font-medium mt-1">✓ Pre-monsoon pull-forward window</p>
      )}
    </div>
  );
};

export default function ColdstartWeatherSensitivity({
  temperatureElasticity,
  monsoonImpact,
  monsoonCalendar,
  monsoonRecommendation: rec,
  storeRisk,
  signalInputs,
}: Props) {
  const { isApparel } = useTenant();
  // Panel A — sorted by abs(elasticity) descending
  const tempChartData = useMemo(() =>
    [...temperatureElasticity]
      .sort((a, b) => Math.abs(b.elasticity_pct_per_c) - Math.abs(a.elasticity_pct_per_c))
      .map(e => ({
        ...e,
        ci_error_bar: (e.confidence_high_pct - e.confidence_low_pct) / 2,
      })),
    [temperatureElasticity]
  );

  // Panel B — sorted by abs(delta_pct) descending
  const monsoonSorted = useMemo(() =>
    [...monsoonImpact].sort((a, b) => Math.abs(b.delta_pct) - Math.abs(a.delta_pct)),
    [monsoonImpact]
  );

  return (
    <section className="space-y-4">
      {/* Section header */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          Weather Sensitivity &amp; Climate Risk
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          How forecasts adapt to weather signals · Monsoon-aware inventory pull-forward
        </p>
      </div>

      {/* Panel A + Panel B — side by side */}
      <div className="grid grid-cols-2 gap-4">

        {/* === PANEL A: Temperature Elasticity === */}
        <ChartCard
          id="coldstart-temp-elasticity"
          title="Temperature Elasticity by Category"
          subtitle="Demand change per +1°C above category threshold · 95% CI shown"
          height={320}
          exportFilename="coldstart_temp_elasticity"
          data={tempChartData as unknown as Record<string, unknown>[]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={tempChartData}
              layout="vertical"
              margin={{ top: 4, right: 60, bottom: 4, left: 4 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v}%`}
                domain={['auto', 'auto']}
              />
              <YAxis
                type="category"
                dataKey="category"
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                axisLine={false}
                tickLine={false}
                width={96}
              />
              <Tooltip content={<TempTooltip />} />
              <ReferenceLine x={0} stroke="var(--text-tertiary)" strokeDasharray="3 2" strokeWidth={1} />
              <Bar dataKey="elasticity_pct_per_c" maxBarSize={18} radius={[0, 2, 2, 0]}>
                {tempChartData.map((entry, i) => (
                  <Cell key={i} fill={barColor(entry.direction)} />
                ))}
                <ErrorBar
                  dataKey="ci_error_bar"
                  width={4}
                  strokeWidth={1.5}
                  stroke="#6b7280"
                  direction="x"
                />
                <LabelList
                  dataKey="elasticity_pct_per_c"
                  position="right"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) =>
                    typeof v === 'number'
                      ? `${v > 0 ? '+' : ''}${v.toFixed(1)}%`
                      : ''
                  }
                  style={{ fontSize: 9, fill: '#6b7280' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-[var(--text-tertiary)] mt-2 px-1 leading-relaxed">
            {isApparel ? (
              <>Highest sensitivity: <strong>Outerwear</strong> — every degree below 50°F drives +12% demand. Lowest: Accessories at 0%. Source: gold_weather_impact (3,200 obs/category).</>
            ) : (
              <>Highest sensitivity: <strong>Butter & Ghee</strong> — every degree above 28°C drives +6.5% demand (chilled dairy proxy). Lowest: Edible Oil at 0%. Source: gold_weather_impact (4,380 obs/category).</>
            )}
          </p>
        </ChartCard>

        {/* === PANEL B: Monsoon Impact === */}
        <ChartCard
          id="coldstart-monsoon-impact"
          title="Monsoon Day Demand Impact"
          subtitle="Category-level demand delta · monsoon days vs normal · derived from is_monsoon_active flag"
          height={320}
          exportFilename="coldstart_monsoon_impact"
          data={monsoonSorted as unknown as Record<string, unknown>[]}
        >
          <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: '280px' }}>
            {monsoonSorted.map((row) => (
              <div key={row.category} className="flex items-center gap-2">
                <span className="text-xs w-28 truncate text-[var(--text-primary)]">{row.category}</span>

                {/* Twin bars container */}
                <div className="flex-1 flex items-center gap-1">
                  {/* Normal bar — fixed baseline */}
                  <div
                    className="h-3 bg-slate-300 opacity-60 rounded-sm"
                    style={{ width: '40%' }}
                    title={`Normal: ${row.non_monsoon_avg_qty} units`}
                  />
                  {/* Monsoon bar — proportional */}
                  <div
                    className={`h-3 rounded-sm opacity-80 ${
                      row.direction === 'positive'
                        ? 'bg-emerald-500'
                        : row.direction === 'negative'
                        ? 'bg-rose-500'
                        : 'bg-slate-400'
                    }`}
                    style={{ width: `${(row.monsoon_avg_qty / row.non_monsoon_avg_qty) * 40}%` }}
                    title={`Monsoon: ${row.monsoon_avg_qty} units`}
                  />
                </div>

                {/* Delta % */}
                <span
                  className={`text-xs font-semibold w-14 text-right ${
                    row.direction === 'positive'
                      ? 'text-emerald-600'
                      : row.direction === 'negative'
                      ? 'text-rose-600'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {row.delta_pct > 0 ? '+' : ''}{row.delta_pct}%
                </span>

                {/* Significance dot */}
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${
                    row.statistical_significance === 'high'
                      ? 'bg-emerald-500'
                      : row.statistical_significance === 'medium'
                      ? 'bg-amber-500'
                      : 'bg-slate-400'
                  }`}
                  title={`Statistical significance: ${row.statistical_significance}`}
                />
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-[10px] text-[var(--text-tertiary)] mt-3 pt-2 border-t border-[var(--border-default)] flex-wrap">
            <span><span className="inline-block w-2 h-2 bg-slate-300 opacity-60 mr-1 rounded-sm" />Normal day</span>
            <span><span className="inline-block w-2 h-2 bg-emerald-500 opacity-80 mr-1 rounded-sm" />Monsoon — positive</span>
            <span><span className="inline-block w-2 h-2 bg-rose-500 opacity-80 mr-1 rounded-sm" />Monsoon — negative</span>
            <span>· Dot = significance (green=high, amber=med, gray=low)</span>
          </div>
        </ChartCard>
      </div>

      {/* === PANEL C: Monsoon Risk Window (HERO, full width) === */}
      <div className="space-y-3">
        <ChartCard
          id="coldstart-monsoon-window"
          title="Monsoon Risk Window & Pull-Forward Recommendation"
          subtitle="12-month risk index · pre-monsoon inventory pull-forward window highlighted · Indian monsoon season"
          height={320}
          exportFilename="coldstart_monsoon_window"
          data={monsoonCalendar as unknown as Record<string, unknown>[]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monsoonCalendar} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
              {/* Tier shading via ReferenceArea */}
              <ReferenceArea x1="Jun" x2="Sep" fill="#fecaca" fillOpacity={0.25} />
              <ReferenceArea x1="Jul" x2="Aug" fill="#f87171" fillOpacity={0.18} />

              {/* Pull-forward window */}
              <ReferenceArea
                x1="Apr"
                x2="May"
                fill="#3b82f6"
                fillOpacity={0.15}
                label={{ value: 'Pull-forward', fontSize: 9, fill: '#3b82f6', position: 'insideTop' }}
              />

              <XAxis
                dataKey="month_name"
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                axisLine={false}
                tickLine={false}
                width={28}
                tickFormatter={(v: number) => `${v}`}
              />
              <Tooltip content={<MonsoonWindowTooltip />} />

              {/* Peak month marker */}
              <ReferenceLine
                x="Aug"
                stroke="#f43f5e"
                strokeWidth={2}
                strokeDasharray="4 3"
                label={{ value: 'Peak: Aug', fontSize: 9, fill: '#f43f5e', position: 'insideTopRight' }}
              />

              <Area
                type="monotone"
                dataKey="risk_index"
                stroke="#f59e0b"
                strokeWidth={2.5}
                fill="#fef3c7"
                fillOpacity={0.55}
                dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Callout grid below the chart */}
        <div className="grid grid-cols-3 gap-3">
          {/* Affected categories */}
          <div className="card p-3 bg-[var(--bg-secondary)]">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
              Most affected categories
            </div>
            <div className="flex flex-wrap gap-1">
              {rec.affected_categories.map((c) => (
                <span key={c} className="badge badge-warning text-[10px]">{c}</span>
              ))}
            </div>
          </div>

          {/* Revenue at risk */}
          <div className="card p-3 bg-[var(--bg-secondary)]">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
              Estimated revenue at risk (unmitigated)
            </div>
            <div className="text-xl font-bold text-[var(--text-primary)]">
              {formatLakhs(rec.estimated_revenue_at_risk_inr)}{' '}
              <span className="text-[10px] font-normal text-[var(--text-tertiary)]">
                / ${(rec.estimated_revenue_at_risk_usd / 1000).toFixed(1)}K
              </span>
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)] mt-1">
              12–18 days of stockouts on monsoon-sensitive SKUs
            </div>
          </div>

          {/* Pull-forward recommendation */}
          <div className="card p-3 bg-blue-50 border-l-4 border-blue-500">
            <div className="text-[10px] uppercase tracking-wider text-blue-600 mb-2">
              Recommendation
            </div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              +{rec.recommended_safety_stock_pct}% safety stock
            </div>
            <div className="text-[10px] text-[var(--text-secondary)] mt-1">
              Window: {rec.pull_forward_window_start} – {rec.pull_forward_window_end}{' '}
              ({rec.weeks_before_peak} weeks pre-peak)
            </div>
          </div>
        </div>
      </div>

      {/* Panel D + Panel E — side by side */}
      <div className="grid grid-cols-2 gap-4">

        {/* === PANEL D: Store-Level Weather Risk Heatmap === */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Store-Level Weather Risk</h3>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                12 target city stores · 5 weather risk axes · resilience score derived
              </p>
            </div>
          </div>

          {/* Header row — 8 cols: 2 store + 5 risk + 1 score */}
          <div className="grid grid-cols-8 gap-1 mb-1 text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">
            <div className="col-span-2">Store</div>
            <div className="text-center">Heat</div>
            <div className="text-center">Rain</div>
            <div className="text-center">Cold</div>
            <div className="text-center">AQI</div>
            <div className="text-center">Flood</div>
            <div className="text-right pr-1">Score</div>
          </div>

          {storeRisk.map((store) => (
            <div
              key={store.store_id}
              className="grid grid-cols-8 gap-1 items-center py-1 hover:bg-[var(--bg-secondary)] rounded"
            >
              <div className="col-span-2 text-xs min-w-0">
                <div className="font-medium text-[var(--text-primary)] truncate text-[10px]">
                  {store.store_name}
                </div>
                <div className="text-[9px] text-[var(--text-tertiary)] font-mono">{store.store_id}</div>
              </div>
              {(
                [
                  store.heatwave_risk,
                  store.heavy_rain_risk,
                  store.cold_spell_risk,
                  store.air_quality_risk,
                  store.monsoon_flood_risk,
                ] as const
              ).map((risk, i) => (
                <div
                  key={i}
                  className={`h-6 rounded flex items-center justify-center text-[10px] font-bold ${riskCellClass(risk)}`}
                >
                  {riskCellLabel(risk)}
                </div>
              ))}
              <div className="text-right pr-1">
                <span
                  className={`text-sm font-bold ${
                    store.resilience_score >= 75
                      ? 'text-emerald-600'
                      : store.resilience_score >= 50
                      ? 'text-amber-600'
                      : 'text-rose-600'
                  }`}
                >
                  {store.resilience_score}
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)] ml-0.5">/100</span>
              </div>
            </div>
          ))}

          <div className="text-[10px] text-[var(--text-tertiary)] mt-2 pt-2 border-t border-[var(--border-default)]">
            L = Low · M = Medium · H = High · C = Critical · Resilience = 100 − Σ(risk severity)
          </div>
        </div>

        {/* === PANEL E: Weather Signal Inputs === */}
        <div className="card p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Weather Signals Feeding the Model
            </h3>
            <p className="text-[11px] text-[var(--text-tertiary)]">
              6 weather-related features · all refreshed daily · 87–100% coverage
            </p>
          </div>

          <div className="space-y-0">
            {signalInputs.map((sig) => (
              <div
                key={sig.column_name}
                className="flex items-center gap-3 py-2 border-b border-[var(--border-default)] last:border-b-0"
              >
                {/* Freshness dot */}
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    sig.freshness_status === 'fresh' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />

                {/* Column name + description */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-[var(--text-primary)]">{sig.column_name}</div>
                  <div className="text-[10px] text-[var(--text-tertiary)] truncate">{sig.description}</div>
                </div>

                {/* Source table badge */}
                <span className="badge badge-neutral text-[10px]">{sig.source_table}</span>

                {/* Coverage */}
                <span className="text-[10px] text-[var(--text-secondary)] w-10 text-right">
                  {sig.coverage_pct}%
                </span>

                {/* Obs count */}
                <span className="text-[10px] text-[var(--text-tertiary)] w-16 text-right font-mono">
                  {sig.n_observations_millions}M obs
                </span>
              </div>
            ))}
          </div>

          <div className="text-[10px] text-[var(--text-tertiary)] mt-3 pt-2 border-t border-[var(--border-default)]">
            All 6 signals contribute to the cold-start model. Weather features are merged from ext_weather (raw)
            and derived flags from demand_features (Silver layer).
          </div>
        </div>
      </div>
    </section>
  );
}
