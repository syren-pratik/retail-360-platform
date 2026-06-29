'use client';


import { formatCrOrUsdMAuto, getLocaleAuto } from '@/app/lib/format-money';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, Line, ComposedChart, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  ReferenceLine, Legend,
} from 'recharts';
import { ArrowLeft, Download } from 'lucide-react';
import { AIInsightButton } from '@/app/components/charts/ChartCard';
import type { SupplyKPIs, ForecastData, DeptAccuracy } from '../../components/InventoryDashboardContent';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  kpis: SupplyKPIs;
  forecast: ForecastData;
  isStandalonePage?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeader({ n, title, subtitle }: { n: number; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-7 h-7 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
        {n}
      </div>
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
        <p className="text-xs text-[var(--text-secondary)]">{subtitle}</p>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-[var(--border-subtle)]" />;
}

function Insight({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800 leading-relaxed">
      {children}
    </div>
  );
}

function fmtDayMonth(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(getLocaleAuto(), { day: 'numeric', month: 'short' });
}

// ─── Main Component ───────────────────────────────────────────────────────────

const DATE_OPTIONS = ['30d', '90d', '6m', '12m'];

export default function DemandForecastDeepDiveContent({ forecast, isStandalonePage = false }: Props) {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState('90d');

  useEffect(() => { setIsMounted(true); }, []);

  // ── Filtered slices ──────────────────────────────────────────────────────

  const filteredForecast = useMemo(() => {
    const days = selectedDateRange === '30d' ? 30 : selectedDateRange === '90d' ? 90 : selectedDateRange === '6m' ? 180 : 365;
    return forecast.forecast_vs_actual.slice(-Math.min(days, forecast.forecast_vs_actual.length));
  }, [selectedDateRange, forecast]);

  const filteredDecomp = useMemo(() => {
    const days = selectedDateRange === '30d' ? 30 : selectedDateRange === '90d' ? 90 : selectedDateRange === '6m' ? 180 : 365;
    return forecast.demand_decomposition.slice(-Math.min(days, forecast.demand_decomposition.length));
  }, [selectedDateRange, forecast]);

  const filteredTrend = useMemo(() => {
    const weeks = selectedDateRange === '30d' ? 4 : selectedDateRange === '90d' ? 12 : selectedDateRange === '6m' ? 24 : 52;
    return forecast.accuracy_trend_12w.slice(-Math.min(weeks, forecast.accuracy_trend_12w.length));
  }, [selectedDateRange, forecast]);

  // ── Today reference line ─────────────────────────────────────────────────
  const todayDate = useMemo(() => {
    const lastHistorical = [...filteredForecast].reverse().find(p => p.actual !== null);
    return lastHistorical?.date ?? null;
  }, [filteredForecast]);

  // ── Decomposition stats ──────────────────────────────────────────────────
  const decompStats = useMemo(() => {
    const totalSum = filteredDecomp.reduce((s, p) => s + p.total, 0);
    const seasonalSum = filteredDecomp.reduce((s, p) => s + p.seasonal, 0);
    const promoSum = filteredDecomp.reduce((s, p) => s + p.promo_lift, 0);
    const baselineSum = filteredDecomp.reduce((s, p) => s + p.baseline, 0);
    if (totalSum === 0) return { seasonal: 0, promo: 0, baseline: 0 };
    return {
      seasonal: (seasonalSum / totalSum * 100).toFixed(1),
      promo: (promoSum / totalSum * 100).toFixed(1),
      baseline: (baselineSum / totalSum * 100).toFixed(1),
    };
  }, [filteredDecomp]);

  // ── Sorted dept accuracy ─────────────────────────────────────────────────
  const sortedDeptAccuracy: DeptAccuracy[] = useMemo(
    () => [...forecast.accuracy_by_dept].sort((a, b) => b.accuracy_pct - a.accuracy_pct),
    [forecast.accuracy_by_dept]
  );

  // ── Model comparison sorted desc ─────────────────────────────────────────
  const sortedModels = useMemo(
    () => [...forecast.model_comparison].sort((a, b) => b.accuracy - a.accuracy),
    [forecast.model_comparison]
  );

  // ── Feature importance sorted desc ───────────────────────────────────────
  const sortedFeatures = useMemo(
    () => [...forecast.feature_importance].sort((a, b) => b.importance - a.importance),
    [forecast.feature_importance]
  );

  // ── Export ───────────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = forecast.accuracy_by_dept.map(d =>
      [d.department, d.mape, d.accuracy_pct, d.bias_pct, d.trend].join(',')
    );
    const csv = ['Department,MAPE%,Accuracy%,Bias%,Trend', ...rows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'demand_forecast.csv';
    a.click();
  };

  // ── KPI helpers ──────────────────────────────────────────────────────────
  const { kpis: fkpis } = forecast;

  const mapeColor =
    fkpis.mape_pct > 15 ? 'text-red-600' :
    fkpis.mape_pct >= 10 ? 'text-amber-600' :
    'text-green-600';

  const biasColor =
    fkpis.bias_direction === 'over' ? 'text-amber-600' : 'text-red-600';

  const modelHealthBadge: Record<string, string> = {
    stable: 'bg-green-100 text-green-700',
    degrading: 'bg-red-100 text-red-700',
    improving: 'bg-blue-100 text-blue-700',
  };

  const statusBadge: Record<string, string> = {
    production: 'bg-green-100 text-green-700',
    testing: 'bg-blue-100 text-blue-700',
    baseline: 'bg-gray-100 text-gray-600',
    deprecated: 'bg-red-100 text-red-700',
  };

  const lostSalesPctChange = (
    (fkpis.lost_sales_from_miss_cr - fkpis.lost_sales_prior_cr) / fkpis.lost_sales_prior_cr * 100
  ).toFixed(1);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">

      {/* ── Sticky top nav ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-[var(--border-default)] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/inventory"
            className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft size={15} />
            Back to Supply Intelligence
          </Link>
          <span className="text-[var(--border-default)]">|</span>
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {isStandalonePage ? 'Demand Intelligence' : 'Demand Forecast'}
          </span>
          {!isStandalonePage && (
            <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">Deep Dive</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {DATE_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => setSelectedDateRange(opt)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                selectedDateRange === opt
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              {opt}
            </button>
          ))}
          <div className="w-px h-4 bg-[var(--border-default)] mx-1" />
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-[var(--border-default)] rounded-md hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">

        {/* Page heading */}
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            {isStandalonePage ? 'Demand Intelligence' : 'Demand Forecast — Deep Dive'}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Model performance, accuracy trends, demand decomposition, and cost of forecast errors
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════ */}
        {/* SECTION 1: FORECAST ACCURACY OVERVIEW             */}
        {/* ═══════════════════════════════════════════════════ */}
        <section className="space-y-5">
          <SectionHeader
            n={1}
            title="Forecast Accuracy"
            subtitle="Model performance and prediction quality across departments"
          />

          {/* KPI Strip — grid-cols-5 */}
          <div className="grid grid-cols-5 gap-3">
            {/* Network MAPE */}
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Network MAPE</p>
              <p className={`text-lg font-semibold ${mapeColor}`}>{fkpis.mape_pct}%</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Mean Abs % Error</p>
            </div>

            {/* vs Prior */}
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">vs Prior Period</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">{fkpis.mape_prior}%</p>
              <p className="text-xs text-green-600 mt-0.5 font-medium">
                ↓ {(fkpis.mape_prior - fkpis.mape_pct).toFixed(1)}pp improved
              </p>
            </div>

            {/* Forecast Bias */}
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Forecast Bias</p>
              <p className={`text-lg font-semibold ${biasColor}`}>
                {fkpis.bias_pct}% {fkpis.bias_direction}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {fkpis.bias_direction === 'over' ? 'Systematic over-prediction' : 'Systematic under-prediction'}
              </p>
            </div>

            {/* Lost Sales from Miss */}
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Lost Sales from Miss</p>
              <p className="text-lg font-semibold text-red-600">{formatCrOrUsdMAuto(fkpis.lost_sales_from_miss_cr)}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Under-forecast revenue</p>
            </div>

            {/* Model Health */}
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Model Health</p>
              <div className="mt-1">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${modelHealthBadge[fkpis.model_health] ?? 'bg-gray-100 text-gray-600'}`}>
                  {fkpis.model_health}
                </span>
              </div>
            </div>
          </div>

          {/* Full-width Forecast vs Actual ComposedChart */}
          <div className="card">
            <div className="flex items-start justify-between">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Forecast vs Actual</h4>
              <AIInsightButton id="inventory-deep-forecast-vs-actual" title="Forecast vs Actual" data={filteredForecast as unknown as Record<string, unknown>[]} />
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-3">
              Daily demand · shaded band = 95% confidence interval · dashed = forecast
            </p>
            <div style={{ height: 300 }}>
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={filteredForecast} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                      tickLine={false}
                      tickFormatter={fmtDayMonth}
                      interval={13}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={v => v.toLocaleString()}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: '11px' }}
                      formatter={(val: unknown) => [
                        val !== null ? (val as number).toLocaleString() : 'N/A',
                      ]}
                      labelFormatter={(label: unknown) => fmtDayMonth(label as string)}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

                    {/* CI band */}
                    <Area
                      dataKey="upper_bound"
                      fill="#DBEAFE"
                      fillOpacity={0.3}
                      stroke="#93C5FD"
                      strokeWidth={0.5}
                      name="CI Upper"
                      dot={false}
                    />
                    <Line
                      dataKey="lower_bound"
                      stroke="#93C5FD"
                      strokeWidth={0.5}
                      strokeDasharray="2 2"
                      dot={false}
                      name="CI Lower"
                    />

                    {/* Forecast line */}
                    <Line
                      dataKey="forecast"
                      stroke="#6366F1"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Forecast"
                    />

                    {/* Actual line — stops at today */}
                    <Line
                      dataKey="actual"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                      name="Actual"
                    />

                    {/* Today reference */}
                    {todayDate && (
                      <ReferenceLine
                        x={todayDate}
                        stroke="#6B7280"
                        strokeDasharray="4 3"
                        label={{ value: 'Today', position: 'insideTopRight', fontSize: 10, fill: '#6B7280' }}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart grid: Accuracy by Dept + Accuracy Trend */}
          <div className="grid grid-cols-2 gap-6">

            {/* LEFT — Accuracy by Department */}
            <div className="card">
              <div className="flex items-start justify-between">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Accuracy by Department</h4>
                <AIInsightButton id="inventory-deep-accuracy-by-department" title="Accuracy by Department" data={sortedDeptAccuracy as unknown as Record<string, unknown>[]} />
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-3">Sorted highest → lowest · 85% = minimum target</p>
              <div style={{ height: 260 }}>
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={sortedDeptAccuracy}
                      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                      <XAxis
                        type="number"
                        domain={[60, 100]}
                        tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                        tickLine={false}
                        tickFormatter={v => `${v}%`}
                      />
                      <YAxis
                        type="category"
                        dataKey="department"
                        width={140}
                        tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        formatter={(v: unknown) => [`${v as number}%`, 'Accuracy']}
                        contentStyle={{ fontSize: '11px' }}
                      />
                      <ReferenceLine
                        x={85}
                        stroke="#6B7280"
                        strokeDasharray="4 3"
                        label={{ value: 'Min target', position: 'insideTopRight', fontSize: 9, fill: '#6B7280' }}
                      />
                      <Bar dataKey="accuracy_pct" name="Accuracy %" radius={[0, 4, 4, 0]}>
                        {sortedDeptAccuracy.map((d) => (
                          <Cell
                            key={d.department}
                            fill={d.accuracy_pct > 88 ? '#10B981' : d.accuracy_pct >= 85 ? '#F59E0B' : '#DC2626'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* RIGHT — Accuracy Trend Last 12 Weeks */}
            <div className="card">
              <div className="flex items-start justify-between">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Accuracy Trend — Last 12 Weeks</h4>
                <AIInsightButton id="inventory-deep-accuracy-trend" title="Accuracy Trend — Last 12 Weeks" data={filteredTrend as unknown as Record<string, unknown>[]} />
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-3">Weekly accuracy % and MAPE · 85% target line</p>
              <div style={{ height: 260 }}>
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={filteredTrend} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                      <XAxis
                        dataKey="week"
                        tick={{ fontSize: 9, fill: 'var(--text-secondary)', angle: -20, textAnchor: 'end' }}
                        tickLine={false}
                        interval={0}
                      />
                      <YAxis
                        yAxisId="left"
                        domain={[75, 95]}
                        tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={v => `${v}%`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 10, fill: '#EF4444' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip contentStyle={{ fontSize: '11px' }} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

                      <Bar yAxisId="right" dataKey="mape" fill="#FCA5A5" name="MAPE %" />
                      <Line
                        yAxisId="left"
                        dataKey="accuracy_pct"
                        stroke="#10B981"
                        strokeWidth={2}
                        name="Accuracy %"
                        dot={{ r: 3 }}
                      />
                      <ReferenceLine
                        yAxisId="left"
                        y={85}
                        stroke="#6B7280"
                        strokeDasharray="4 3"
                        label={{ value: 'Target 85%', position: 'insideTopRight', fontSize: 9, fill: '#6B7280' }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <Insight>
            Electronics (28.4% MAPE) and Apparel (34.2% MAPE) are significantly above the 15% target. These two categories — improving their forecast accuracy is the highest-ROI model improvement available.
          </Insight>
        </section>

        <Divider />

        {/* ═══════════════════════════════════════════════════ */}
        {/* SECTION 2: DEMAND DECOMPOSITION                   */}
        {/* ═══════════════════════════════════════════════════ */}
        <section className="space-y-5">
          <SectionHeader
            n={2}
            title="What's Driving Demand"
            subtitle="Baseline, trend, seasonality, and promotional effects"
          />

          {/* Full-width stacked AreaChart */}
          <div className="card">
            <div className="flex items-start justify-between">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Demand Decomposition</h4>
              <AIInsightButton id="inventory-deep-demand-decomposition" title="Demand Decomposition" data={filteredDecomp as unknown as Record<string, unknown>[]} />
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-3">
              Stacked components of total daily demand — baseline, trend, seasonal, and promotional lift
            </p>
            <div style={{ height: 300 }}>
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={filteredDecomp} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                      tickLine={false}
                      tickFormatter={fmtDayMonth}
                      interval={13}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={v => v.toLocaleString()}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: '11px' }}
                      formatter={(v: unknown) => [(v as number).toLocaleString()]}
                      labelFormatter={(label: unknown) => fmtDayMonth(label as string)}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Area dataKey="baseline" stackId="1" fill="#DBEAFE" stroke="#3B82F6" name="Baseline" />
                    <Area dataKey="trend" stackId="1" fill="#D1FAE5" stroke="#10B981" name="Trend" />
                    <Area dataKey="seasonal" stackId="1" fill="#FEF3C7" stroke="#F59E0B" name="Seasonal" />
                    <Area dataKey="promo_lift" stackId="1" fill="#FCE7F3" stroke="#EC4899" name="Promo Lift" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card py-4 px-5">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Avg Seasonal Component</p>
              <p className="text-2xl font-semibold text-amber-600">{decompStats.seasonal}%</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">of total demand</p>
            </div>
            <div className="card py-4 px-5">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Avg Promo Lift</p>
              <p className="text-2xl font-semibold text-pink-600">{decompStats.promo}%</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">of total demand</p>
            </div>
            <div className="card py-4 px-5">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Baseline Share</p>
              <p className="text-2xl font-semibold text-blue-600">{decompStats.baseline}%</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">of total demand</p>
            </div>
          </div>

          <Insight>
            Seasonal component averages ~{decompStats.seasonal}% of total demand — festival calendar events are the largest single driver of forecast error when not explicitly modeled.
          </Insight>
        </section>

        <Divider />

        {/* ═══════════════════════════════════════════════════ */}
        {/* SECTION 3: MODEL INTELLIGENCE                     */}
        {/* ═══════════════════════════════════════════════════ */}
        <section className="space-y-5">
          <SectionHeader
            n={3}
            title="Model Performance"
            subtitle="Comparing forecasting models across accuracy metrics"
          />

          {/* Model comparison table */}
          <div className="card overflow-x-auto">
            <div className="flex items-start justify-between">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Model Comparison</h4>
              <AIInsightButton id="inventory-deep-model-comparison" title="Model Comparison" data={forecast.model_comparison as unknown as Record<string, unknown>[]} />
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-4">All models · sorted by accuracy · ⭐ = production</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  {['Model', 'Status', 'Accuracy %', 'MAPE %', 'RMSE', 'MAE', 'Last Trained'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-[var(--text-secondary)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedModels.map(m => {
                  const accColor = m.accuracy > 85 ? 'text-green-600 font-semibold' : m.accuracy >= 80 ? 'text-amber-600' : 'text-[var(--text-secondary)]';
                  return (
                    <tr
                      key={m.model}
                      className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      <td className="py-2.5 px-3 font-medium">
                        {m.status === 'production' && <span className="mr-1">⭐</span>}
                        {m.model}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[m.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {m.status}
                        </span>
                      </td>
                      <td className={`py-2.5 px-3 ${accColor}`}>{m.accuracy}%</td>
                      <td className="py-2.5 px-3 text-[var(--text-secondary)]">{m.mape}%</td>
                      <td className="py-2.5 px-3 text-[var(--text-secondary)]">{m.rmse.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-[var(--text-secondary)]">{m.mae.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-[var(--text-secondary)]">{m.last_trained}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Chart grid */}
          <div className="grid grid-cols-2 gap-6">

            {/* LEFT — Model Accuracy vs MAPE grouped bar */}
            <div className="card">
              <div className="flex items-start justify-between">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Model Accuracy vs MAPE</h4>
                <AIInsightButton id="inventory-deep-model-accuracy-vs-mape" title="Model Accuracy vs MAPE" data={forecast.model_comparison as unknown as Record<string, unknown>[]} />
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-3">Side-by-side comparison across all models</p>
              <div style={{ height: 240 }}>
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={forecast.model_comparison} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                      <XAxis
                        dataKey="model"
                        tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip contentStyle={{ fontSize: '11px' }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="accuracy" name="Accuracy %" fill="#6EE7B7" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="mape" name="MAPE %" fill="#FCA5A5" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* RIGHT — Feature Importance */}
            <div className="card">
              <div className="flex items-start justify-between">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Feature Importance</h4>
                <AIInsightButton id="inventory-deep-feature-importance" title="Feature Importance" data={sortedFeatures as unknown as Record<string, unknown>[]} />
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-3">Top predictors · green = positive, red = negative signal</p>
              <div style={{ height: 240 }}>
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={sortedFeatures}
                      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                        tickLine={false}
                        tickFormatter={v => `${(v * 100).toFixed(0)}%`}
                      />
                      <YAxis
                        type="category"
                        dataKey="feature"
                        width={200}
                        tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        formatter={(v: unknown) => [`${((v as number) * 100).toFixed(1)}%`, 'Importance']}
                        contentStyle={{ fontSize: '11px' }}
                      />
                      <ReferenceLine x={0.15} stroke="#6B7280" strokeDasharray="4 4" />
                      <Bar dataKey="importance" name="Importance" radius={[0, 4, 4, 0]}>
                        {sortedFeatures.map(f => (
                          <Cell
                            key={f.feature}
                            fill={f.direction === 'positive' ? '#6EE7B7' : f.direction === 'negative' ? '#FCA5A5' : '#FCD34D'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <Insight>
            XGBoost is outperforming LightGBM by 1.6pp accuracy. Festival/Holiday signal has the 3rd highest feature importance at 17.1% — a dedicated festival adjustment layer could improve network MAPE by an estimated 2-3pp.
          </Insight>
        </section>

        <Divider />

        {/* ═══════════════════════════════════════════════════ */}
        {/* SECTION 4: LOST SALES & FORECAST MISSES           */}
        {/* ═══════════════════════════════════════════════════ */}
        <section className="space-y-5">
          <SectionHeader
            n={4}
            title="Cost of Forecast Errors"
            subtitle="Revenue lost due to under-forecasting and overstock cost of over-forecasting"
          />

          {/* KPI strip — grid-cols-3 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Lost Sales from Under-Forecast</p>
              <p className="text-2xl font-semibold text-red-600">{formatCrOrUsdMAuto(fkpis.lost_sales_from_miss_cr)}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Current period</p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Prior Period</p>
              <p className="text-2xl font-semibold text-[var(--text-secondary)]">{formatCrOrUsdMAuto(fkpis.lost_sales_prior_cr)}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Previous period baseline</p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Change</p>
              <p className="text-2xl font-semibold text-red-600">
                +{lostSalesPctChange}%
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Worse than prior period</p>
            </div>
          </div>

          {/* Over vs Under Forecast by Department */}
          <div className="card">
            <div className="flex items-start justify-between">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Over vs Under Forecast by Department</h4>
              <AIInsightButton id="inventory-deep-over-under-forecast" title="Over vs Under Forecast by Department" data={forecast.accuracy_by_dept as unknown as Record<string, unknown>[]} />
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-3">
              Positive bias = over-forecast (overstock risk) · Negative = under-forecast (lost sales risk)
            </p>
            <div style={{ height: 220 }}>
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={forecast.accuracy_by_dept}
                    margin={{ top: 5, right: 10, left: 0, bottom: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis
                      dataKey="department"
                      tick={{ fontSize: 10, fill: 'var(--text-secondary)', angle: -20, textAnchor: 'end' }}
                      tickLine={false}
                      interval={0}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={v => `${v}%`}
                    />
                    <Tooltip
                      formatter={(v: unknown) => [`${v as number}%`, 'Bias']}
                      contentStyle={{ fontSize: '11px' }}
                    />
                    <ReferenceLine y={0} stroke="#6B7280" />
                    <Bar dataKey="bias_pct" name="Bias %" radius={[3, 3, 0, 0]}>
                      {forecast.accuracy_by_dept.map(d => (
                        <Cell
                          key={d.department}
                          fill={d.bias_pct > 0 ? '#F59E0B' : '#DC2626'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Forecast Coverage */}
          <div className="card">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Forecast Coverage</h4>
            <p className="text-xs text-[var(--text-secondary)] mb-3">
              % of SKUs with active machine-learning forecast vs. running on default averages
            </p>
            <div className="flex items-center gap-4 mb-2">
              <span className="text-sm font-semibold text-[var(--text-primary)]">{fkpis.forecast_coverage_pct}%</span>
              <div className="flex-1">
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent-primary)] rounded-full transition-all"
                    style={{ width: `${fkpis.forecast_coverage_pct}%` }}
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              {fkpis.forecast_coverage_pct}% of SKUs have active forecasts — {(100 - fkpis.forecast_coverage_pct).toFixed(1)}% running on default averages (2-3x higher stockout rates)
            </p>
          </div>

          <Insight>
            Personal Care shows +6.8% over-forecast bias — the model is systematically over-predicting this category, driving overstock. Recommend recalibrating the promotional uplift assumption for Personal Care.
          </Insight>
        </section>

        {/* Bottom padding */}
        <div className="h-10" />
      </div>
    </div>
  );
}
