'use client';


import { formatCrOrUsdMAuto } from '@/app/lib/format-money';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { AIInsightButton } from '@/app/components/charts/ChartCard';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ReferenceLine, Cell,
} from 'recharts';

import type {
  SupplyKPIs,
  RevenueAtRiskData,
  CategoryHealthData,
  OverstockData,
  CategoryHealthItem,
  MarkdownRecommendation,
} from '../../components/InventoryDashboardContent';

// ─── Local types for substitution ────────────────────────────────────────────

interface SubstituteOption {
  substitute_sku_id: string;
  substitute_name: string;
  brand: string;
  price_variance_pct: number;
  in_stock_stores: number;
  in_stock_dos: number;
  historical_acceptance_rate_pct: number;
  revenue_preservation_pct: number;
  recommendation: string;
  confidence: string;
}

interface SubstitutionItem {
  stockout_sku_id: string;
  stockout_sku_name: string;
  category: string;
  stockout_stores: number;
  daily_revenue_lost_cr: number;
  substitutes: SubstituteOption[];
}

interface SubstitutionData {
  summary: {
    stockout_skus_with_substitutes: number;
    revenue_preservation_opportunity_cr: number;
    avg_substitution_acceptance_rate_pct: number;
    top_substitute_pairs: number;
  };
  substitutions: SubstitutionItem[];
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  kpis: SupplyKPIs;
  revenueAtRisk: RevenueAtRiskData;
  categoryHealth: CategoryHealthData;
  overstock: OverstockData;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DATE_OPTIONS = ['30d', '90d', '6m', '12m'];

// ─── Sub-components ───────────────────────────────────────────────────────────

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

// ─── Custom Tooltips ─────────────────────────────────────────────────────────

interface StoreTooltipPayload {
  payload?: {
    store_name?: string;
    rev_at_risk_cr?: number;
    pct_daily_rev?: number;
    stockout_skus?: number;
    avg_duration_days?: number;
  };
}

function StoreRiskTooltip({ active, payload }: { active?: boolean; payload?: StoreTooltipPayload[] }) {
  if (!active || !payload || !payload[0]) return null;
  const d = payload[0].payload;
  if (!d) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs space-y-0.5">
      <p className="font-semibold text-gray-800 mb-1">{d.store_name}</p>
      <p className="text-gray-600">Revenue at Risk: <span className="font-medium text-red-600">{formatCrOrUsdMAuto(d.rev_at_risk_cr)}</span></p>
      <p className="text-gray-600">% Daily Rev: <span className="font-medium">{d.pct_daily_rev}%</span></p>
      <p className="text-gray-600">Stockout SKUs: <span className="font-medium">{d.stockout_skus}</span></p>
      <p className="text-gray-600">Avg Duration: <span className="font-medium">{d.avg_duration_days}d</span></p>
    </div>
  );
}

interface OverstockTooltipPayload {
  payload?: {
    category?: string;
    slow_moving_cr?: number;
    dead_stock_cr?: number;
    total_cr?: number;
    markdown_risk_skus?: number;
  };
}

function OverstockTooltip({ active, payload }: { active?: boolean; payload?: OverstockTooltipPayload[] }) {
  if (!active || !payload || !payload[0]) return null;
  const d = payload[0].payload;
  if (!d) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs space-y-0.5">
      <p className="font-semibold text-gray-800 mb-1">{d.category}</p>
      <p className="text-gray-600">Slow Moving (45-90d): <span className="font-medium text-amber-600">{formatCrOrUsdMAuto(d.slow_moving_cr)}</span></p>
      <p className="text-gray-600">Dead Stock (90d+): <span className="font-medium text-red-600">{formatCrOrUsdMAuto(d.dead_stock_cr)}</span></p>
      <p className="text-gray-600">Total: <span className="font-medium">{formatCrOrUsdMAuto(d.total_cr)}</span></p>
      <p className="text-gray-600">Markdown Risk SKUs: <span className="font-medium">{d.markdown_risk_skus}</span></p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StockHealthDeepDiveContent({
  revenueAtRisk,
  categoryHealth,
  overstock,
}: Props) {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState('90d');
  const [sortKey, setSortKey] = useState<keyof CategoryHealthItem>('osa_pct');
  const [sortAsc, setSortAsc] = useState(true);
  const [substitution, setSubstitution] = useState<SubstitutionData | null>(null);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    fetch('/api/supply/substitution')
      .then(r => r.json())
      .then(setSubstitution)
      .catch(err => console.error('Substitution fetch error:', err));
  }, []);

  // ── Time-filtered trend data ──────────────────────────────────────────────

  const filteredTrend = useMemo(() => {
    const days = selectedDateRange === '30d' ? 30 : selectedDateRange === '90d' ? 90 : selectedDateRange === '6m' ? 180 : 365;
    return revenueAtRisk.trend_60d.slice(-Math.min(days, revenueAtRisk.trend_60d.length));
  }, [selectedDateRange, revenueAtRisk]);

  const filteredOverstockTrend = useMemo(() => {
    const count = selectedDateRange === '30d' ? 1 : selectedDateRange === '90d' ? 3 : selectedDateRange === '6m' ? 6 : 12;
    return overstock.trend_vs_purchasing.slice(-count);
  }, [selectedDateRange, overstock]);

  // ── Rolling 7-day average ─────────────────────────────────────────────────

  const trendWithRolling = useMemo(() => filteredTrend.map((d, i, arr) => ({
    ...d,
    rolling7: i < 6 ? null : arr.slice(i - 6, i + 1).reduce((s, x) => s + x.rev_at_risk_cr, 0) / 7,
  })), [filteredTrend]);

  // ── Sortable table ────────────────────────────────────────────────────────

  const toggleSort = (key: keyof CategoryHealthItem) => {
    if (sortKey === key) setSortAsc(p => !p);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sortedCategories = useMemo(() => [...categoryHealth.categories].sort((a, b) => {
    const av = a[sortKey] as number;
    const bv = b[sortKey] as number;
    return sortAsc ? av - bv : bv - av;
  }), [categoryHealth.categories, sortKey, sortAsc]);

  // ── Waterfall transform ───────────────────────────────────────────────────

  let running = 0;
  const waterfallData = overstock.markdown_waterfall.map(w => {
    const isTotal = w.type === 'total' || w.type === 'result';
    const barValue = Math.abs(w.value_cr);
    const base = isTotal ? 0 : Math.max(0, running + Math.min(0, w.value_cr));
    if (!isTotal) running += w.value_cr;
    return { ...w, base, barValue };
  });

  // ── Export handler ────────────────────────────────────────────────────────

  const handleExport = () => {
    const rows = categoryHealth.categories.map(c =>
      [c.name, c.status, c.osa_pct, c.avg_dos, c.stockout_skus, c.overstock_value_cr, c.turn_rate].join(',')
    );
    const csv = ['Category,Status,OSA%,AvgDoS,StockoutSKUs,Overstock_Cr,TurnRate', ...rows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'stock_health.csv';
    a.click();
  };

  // ── Derived KPI values ────────────────────────────────────────────────────

  const totalAtRisk = revenueAtRisk.by_store.reduce((s, r) => s + r.rev_at_risk_cr, 0);
  const storesCritical = revenueAtRisk.by_store.filter(s => s.status === 'critical').length;
  const totalStockoutSkus = revenueAtRisk.by_store.reduce((s, r) => s + r.stockout_skus, 0);
  const avgDuration = revenueAtRisk.by_store.reduce((s, r) => s + r.avg_duration_days, 0) / revenueAtRisk.by_store.length;
  const worstStore = [...revenueAtRisk.by_store].sort((a, b) => b.rev_at_risk_cr - a.rev_at_risk_cr)[0];
  const worstStoreName = worstStore.store_name.split(' ').slice(0, 3).join(' ');
  const lastWeekRecovery = revenueAtRisk.weekly_lost_vs_recovered[revenueAtRisk.weekly_lost_vs_recovered.length - 1];

  // ── Category risk computations ────────────────────────────────────────────

  const sortedCategoryRisk = [...revenueAtRisk.by_category].sort((a, b) => b.rev_at_risk_cr - a.rev_at_risk_cr);
  const totalCatRisk = revenueAtRisk.by_category.reduce((s, c) => s + c.rev_at_risk_cr, 0);

  // ── Insight computed values ───────────────────────────────────────────────

  const top2CatRisk = (sortedCategoryRisk[0].rev_at_risk_cr + sortedCategoryRisk[1].rev_at_risk_cr);
  const top2Pct = ((top2CatRisk / totalCatRisk) * 100).toFixed(0);
  const dairyAvgDays = revenueAtRisk.by_category.find(c => c.category === 'Dairy & Frozen')?.days_running?.toFixed(1) ?? '1.8';
  const firstWeekRecovery = revenueAtRisk.weekly_lost_vs_recovered[0];
  const firstTrend = categoryHealth.health_trend_12m[0];
  const lastTrend = categoryHealth.health_trend_12m[categoryHealth.health_trend_12m.length - 1];
  const firstCritRisk = firstTrend.critical_pct + firstTrend.at_risk_pct;
  const lastCritRisk = lastTrend.critical_pct + lastTrend.at_risk_pct;
  const apparel = overstock.by_category.find(c => c.category === 'Apparel');
  const electronics = overstock.by_category.find(c => c.category === 'Electronics');
  const appElecPct = apparel && electronics
    ? (((apparel.dead_stock_cr + electronics.dead_stock_cr) / overstock.summary.dead_stock_value_cr) * 100).toFixed(0)
    : '0';

  // ── Store bar chart sorted data ───────────────────────────────────────────

  const sortedStores = [...revenueAtRisk.by_store].sort((a, b) => b.rev_at_risk_cr - a.rev_at_risk_cr);
  const storeBarHeight = revenueAtRisk.by_store.length * 36 + 60;

  // ── Overstock by category sorted ─────────────────────────────────────────

  const sortedOverstockCats = [...overstock.by_category].sort((a, b) => b.total_cr - a.total_cr);

  // ── Today's date for reference line ──────────────────────────────────────

  const todayISO = new Date().toISOString().slice(0, 10);

  // ─────────────────────────────────────────────────────────────────────────

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
          <span className="text-sm font-semibold text-[var(--text-primary)]">Stock Health</span>
          <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">Deep Dive</span>
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
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Stock Health — Deep Dive</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Revenue at risk, stockout patterns, category health, and overstock analysis across all stores
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SECTION 1: REVENUE AT RISK OVERVIEW                       */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section className="space-y-5">
          <SectionHeader
            n={1}
            title="Revenue at Risk Overview"
            subtitle="Stockout-driven revenue exposure across stores and categories"
          />

          {/* KPI Strip */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Total at Risk</p>
              <p className="text-lg font-semibold text-red-600">{formatCrOrUsdMAuto(totalAtRisk.toFixed(2))}</p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Stores Critical</p>
              <p className="text-lg font-semibold text-red-600">{storesCritical}</p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">SKUs in Stockout</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">{totalStockoutSkus}</p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Avg Duration</p>
              <p className="text-lg font-semibold text-amber-600">{avgDuration.toFixed(1)}d</p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Worst Store</p>
              <p className="text-base font-semibold text-[var(--text-primary)] truncate" title={worstStore.store_name}>{worstStoreName}</p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Recovery Rate</p>
              <p className="text-lg font-semibold text-amber-600">{lastWeekRecovery.recovery_rate_pct}%</p>
            </div>
          </div>

          {/* Chart Grid */}
          <div className="grid grid-cols-2 gap-6">

            {/* LEFT: Revenue at Risk by Store */}
            <div className="card">
              <div className="flex items-start justify-between">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Revenue at Risk by Store</h4>
                <AIInsightButton id="inventory-deep-revenue-risk-by-store" title="Revenue at Risk by Store" data={sortedStores as unknown as Record<string, unknown>[]} />
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-3">Sorted by exposure — critical stores in red</p>
              <div style={{ height: storeBarHeight }}>
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={sortedStores}
                      margin={{ top: 5, right: 30, left: 185, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                        tickLine={false}
                        tickFormatter={v => `${formatCrOrUsdMAuto(v)}`}
                      />
                      <YAxis
                        type="category"
                        dataKey="store_name"
                        width={180}
                        tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<StoreRiskTooltip />} />
                      <Bar dataKey="rev_at_risk_cr" radius={[0, 4, 4, 0]}>
                        {sortedStores.map((row) => (
                          <Cell
                            key={row.store_id}
                            fill={
                              row.status === 'critical' ? '#DC2626'
                              : row.status === 'at_risk' ? '#F59E0B'
                              : '#10B981'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* RIGHT: Revenue at Risk by Category (treemap-style flex) */}
            <div className="card">
              <div className="flex items-start justify-between">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Revenue at Risk by Category</h4>
                <AIInsightButton id="inventory-deep-revenue-risk-by-category" title="Revenue at Risk by Category" data={sortedCategoryRisk as unknown as Record<string, unknown>[]} />
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-3">Area proportional to revenue exposure · days running shown</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {sortedCategoryRisk.map(cat => {
                  const isHot = cat.days_running > 4;
                  const isWarm = cat.days_running > 2;
                  const cls = isHot
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : isWarm
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-green-50 border-green-200 text-green-800';
                  return (
                    <div
                      key={cat.category}
                      className={`min-h-[80px] p-3 rounded-lg border flex flex-col justify-between ${cls}`}
                      style={{ flex: Math.max(1, (cat.rev_at_risk_cr / totalCatRisk) * 10) }}
                    >
                      <p className="text-xs font-semibold leading-tight">{cat.category}</p>
                      <div>
                        <p className="text-sm font-bold">{formatCrOrUsdMAuto(cat.rev_at_risk_cr)}</p>
                        <p className="text-[10px]">{cat.days_running}d · {cat.stores_affected} stores</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Insight>
                {sortedCategoryRisk[0].category} and {sortedCategoryRisk[1].category} account for {top2Pct}% of total revenue at risk.
                Dairy stockouts averaging {dairyAvgDays}d — perishable replenishment cadence needs review.
              </Insight>
            </div>
          </div>
        </section>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SECTION 2: STOCKOUT TRENDS                                */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section className="space-y-5">
          <SectionHeader
            n={2}
            title="Stockout Trends"
            subtitle="Weekly lost vs recovered revenue and 60-day risk trajectory"
          />

          <div className="grid grid-cols-2 gap-6">

            {/* LEFT: Revenue Lost vs Recovered */}
            <div className="card">
              <div className="flex items-start justify-between">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Revenue Lost vs Recovered</h4>
                <AIInsightButton id="inventory-deep-revenue-lost-vs-recovered" title="Revenue Lost vs Recovered" data={revenueAtRisk.weekly_lost_vs_recovered as unknown as Record<string, unknown>[]} />
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-3">Weekly bars · recovery rate % (right axis)</p>
              <div style={{ height: 260 }}>
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={revenueAtRisk.weekly_lost_vs_recovered}
                      margin={{ top: 5, right: 40, left: -10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                      <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={v => `${formatCrOrUsdMAuto(v)}`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        domain={[50, 80]}
                        tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={v => `${v}%`}
                      />
                      <Tooltip contentStyle={{ fontSize: '11px' }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar yAxisId="left" dataKey="lost_cr" name="Lost (($))" fill="#FCA5A5" />
                      <Bar yAxisId="left" dataKey="recovered_cr" name="Recovered (($))" fill="#6EE7B7" />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="recovery_rate_pct"
                        name="Recovery Rate %"
                        stroke="#6366F1"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* RIGHT: Revenue at Risk 60-Day Trend */}
            <div className="card">
              <div className="flex items-start justify-between">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Revenue at Risk — 60-Day Trend</h4>
                <AIInsightButton id="inventory-deep-revenue-risk-trend" title="Revenue at Risk — 60-Day Trend" data={trendWithRolling as unknown as Record<string, unknown>[]} />
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-3">Daily exposure · amber = 7-day rolling average</p>
              <div style={{ height: 260 }}>
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trendWithRolling}
                      margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                        tickLine={false}
                        interval={9}
                        tickFormatter={v => {
                          const d = new Date(v);
                          return `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}`;
                        }}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={v => `${formatCrOrUsdMAuto(v)}`}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: '11px' }}
                        formatter={(v: unknown) => [`${formatCrOrUsdMAuto((v as number).toFixed(2))}`]}
                      />
                      <ReferenceLine x={todayISO} stroke="#94A3B8" strokeDasharray="3 3" label={{ value: 'Today', fontSize: 10, fill: '#64748B' }} />
                      <Line
                        type="monotone"
                        dataKey="rev_at_risk_cr"
                        name="Daily Risk"
                        stroke="#DC2626"
                        strokeWidth={1.5}
                        dot={false}
                        opacity={0.5}
                      />
                      <Line
                        type="monotone"
                        dataKey="rolling7"
                        name="7-Day Avg"
                        stroke="#F59E0B"
                        strokeDasharray="4 4"
                        strokeWidth={2.5}
                        dot={false}
                        connectNulls={false}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
              <Insight>
                Weekend spikes are ~35% higher than weekday baseline. Recovery rate declined from {firstWeekRecovery.recovery_rate_pct}% to {lastWeekRecovery.recovery_rate_pct}% over the period — inventory replenishment is not keeping pace with growing stockout incidence.
              </Insight>
            </div>
          </div>
        </section>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SECTION 3: CATEGORY HEALTH MATRIX                        */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section className="space-y-5">
          <SectionHeader
            n={3}
            title="Category Health Matrix"
            subtitle="OSA, days of supply, stockouts, and overstock by category — sortable"
          />

          {/* Sortable Table */}
          <div className="card overflow-x-auto">
            <div className="flex items-start justify-between">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Category Health Scorecard</h4>
              <AIInsightButton id="inventory-deep-category-health-scorecard" title="Category Health Scorecard" data={sortedCategories as unknown as Record<string, unknown>[]} />
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-4">Click column headers to sort</p>
            <table className="w-full text-sm" style={{ minWidth: 700 }}>
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-[var(--text-secondary)]">Category</th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-[var(--text-secondary)]">Status</th>
                  {(
                    [
                      { key: 'osa_pct' as keyof CategoryHealthItem, label: 'OSA %' },
                      { key: 'avg_dos' as keyof CategoryHealthItem, label: 'DoS (days)' },
                      { key: 'stockout_skus' as keyof CategoryHealthItem, label: 'Stockout SKUs' },
                      { key: 'overstock_value_cr' as keyof CategoryHealthItem, label: 'Overstock ($)' },
                      { key: 'turn_rate' as keyof CategoryHealthItem, label: 'Turn Rate' },
                    ] as { key: keyof CategoryHealthItem; label: string }[]
                  ).map(col => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      className="text-left py-2.5 px-3 text-xs font-semibold text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] select-none"
                    >
                      {col.label}
                      {sortKey === col.key && (
                        <span className="ml-1">{sortAsc ? '↑' : '↓'}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedCategories.map((cat, idx) => {
                  const osaCls = cat.osa_pct < 93
                    ? 'text-red-600 font-semibold'
                    : cat.osa_pct < 97
                    ? 'text-amber-600 font-semibold'
                    : 'text-green-600 font-semibold';
                  const dosCls = cat.avg_dos < 7
                    ? 'text-red-600 font-semibold'
                    : cat.avg_dos < 14
                    ? 'text-amber-600 font-semibold'
                    : cat.avg_dos <= 45
                    ? 'text-green-600'
                    : 'text-blue-600';
                  const statusBadge =
                    cat.status === 'critical' ? 'bg-red-100 text-red-700'
                    : cat.status === 'at_risk' ? 'bg-amber-100 text-amber-700'
                    : cat.status === 'overstock' ? 'bg-blue-100 text-blue-700'
                    : 'bg-green-100 text-green-700';
                  return (
                    <tr
                      key={cat.name}
                      className={`border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors ${idx % 2 === 1 ? 'bg-[var(--bg-secondary)]/30' : ''}`}
                    >
                      <td className="py-2.5 px-3 font-medium text-[var(--text-primary)]">{cat.name}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${statusBadge}`}>
                          {cat.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className={`py-2.5 px-3 ${osaCls}`}>{cat.osa_pct}%</td>
                      <td className={`py-2.5 px-3 ${dosCls}`}>{cat.avg_dos}d</td>
                      <td className="py-2.5 px-3 text-[var(--text-secondary)]">{cat.stockout_skus}</td>
                      <td className="py-2.5 px-3 text-[var(--text-secondary)]">{formatCrOrUsdMAuto(cat.overstock_value_cr)}</td>
                      <td className="py-2.5 px-3 text-[var(--text-secondary)]">{cat.turn_rate}x</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Category Health Trend 12m Area Chart */}
          <div className="card">
            <div className="flex items-start justify-between">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Category Health Trend — Last 12 Months</h4>
              <AIInsightButton id="inventory-deep-category-health-trend" title="Category Health Trend — Last 12 Months" data={categoryHealth.health_trend_12m as unknown as Record<string, unknown>[]} />
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-3">Stacked % share of categories by status · deterioration visible</p>
            <div style={{ height: 220 }}>
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={categoryHealth.health_trend_12m}
                    margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'var(--text-secondary)' }} tickLine={false} interval={2} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                    <Tooltip contentStyle={{ fontSize: '11px' }} formatter={(v: unknown) => [`${v}%`]} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Area type="monotone" dataKey="critical_pct" name="Critical" stackId="1" fill="#FEE2E2" stroke="#DC2626" />
                    <Area type="monotone" dataKey="at_risk_pct" name="At Risk" stackId="1" fill="#FEF3C7" stroke="#F59E0B" />
                    <Area type="monotone" dataKey="healthy_pct" name="Healthy" stackId="1" fill="#D1FAE5" stroke="#10B981" />
                    <Area type="monotone" dataKey="overstock_pct" name="Overstock" stackId="1" fill="#DBEAFE" stroke="#3B82F6" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <Insight>
              Critical + At Risk categories grew from {firstCritRisk}% to {lastCritRisk}% over the last 12 months — this is structural deterioration, not seasonal variation. Healthy category share dropped {firstTrend.healthy_pct - lastTrend.healthy_pct} percentage points over the same period.
            </Insight>
          </div>
        </section>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SECTION 4: OVERSTOCK & CAPITAL AT RISK                   */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section className="space-y-5">
          <SectionHeader
            n={4}
            title="Overstock & Capital at Risk"
            subtitle="Dead stock, slow-moving inventory, markdown exposure, and purchasing trends"
          />

          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Total Overstock</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">{formatCrOrUsdMAuto(overstock.summary.overstock_value_cr)}</p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Dead Stock</p>
              <p className="text-lg font-semibold text-red-600">{formatCrOrUsdMAuto(overstock.summary.dead_stock_value_cr)}</p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Markdown Risk SKUs</p>
              <p className="text-lg font-semibold text-amber-600">{overstock.summary.markdown_risk_skus}</p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Trend</p>
              <p className={`text-lg font-semibold capitalize ${overstock.summary.trend === 'increasing' ? 'text-red-600' : 'text-green-600'}`}>
                {overstock.summary.trend.charAt(0).toUpperCase() + overstock.summary.trend.slice(1)}
              </p>
            </div>
          </div>

          {/* Chart Grid */}
          <div className="grid grid-cols-2 gap-6">

            {/* LEFT: Overstock by Category stacked */}
            <div className="card">
              <div className="flex items-start justify-between">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Overstock by Category</h4>
                <AIInsightButton id="inventory-deep-overstock-by-category" title="Overstock by Category" data={sortedOverstockCats as unknown as Record<string, unknown>[]} />
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-3">Slow-moving (45-90d) + Dead Stock (90d+)</p>
              <div style={{ height: 280 }}>
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={sortedOverstockCats}
                      margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                        tickLine={false}
                        tickFormatter={v => `${formatCrOrUsdMAuto(v)}`}
                      />
                      <YAxis
                        type="category"
                        dataKey="category"
                        tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                        tickLine={false}
                        axisLine={false}
                        width={110}
                      />
                      <Tooltip content={<OverstockTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="slow_moving_cr" name="Slow Moving (45-90d)" stackId="a" fill="#FCD34D" />
                      <Bar dataKey="dead_stock_cr" name="Dead Stock (90d+)" stackId="a" fill="#DC2626" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* RIGHT: Markdown Risk Waterfall */}
            <div className="card">
              <div className="flex items-start justify-between">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Markdown Risk Waterfall</h4>
                <AIInsightButton id="inventory-deep-markdown-risk-waterfall" title="Markdown Risk Waterfall" data={waterfallData as unknown as Record<string, unknown>[]} />
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-3">P&L impact breakdown from overstock markdown actions</p>
              <div style={{ height: 280 }}>
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={waterfallData}
                      margin={{ top: 5, right: 15, left: -10, bottom: 50 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                      <XAxis
                        dataKey="stage"
                        tick={{ fontSize: 9, fill: 'var(--text-secondary)', textAnchor: 'end' }}
                        tickLine={false}
                        angle={-35}
                        interval={0}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={v => `${formatCrOrUsdMAuto(v)}`}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: '11px' }}
                        formatter={(v: unknown, name: unknown) => name === 'base' ? null : [`${formatCrOrUsdMAuto(v as number)}`, 'Value']}
                      />
                      <Bar dataKey="base" stackId="wf" fill="transparent" legendType="none" />
                      <Bar dataKey="barValue" stackId="wf" radius={[4, 4, 0, 0]}>
                        {waterfallData.map((w) => (
                          <Cell
                            key={w.stage}
                            fill={
                              w.type === 'total' ? '#3B82F6'
                              : w.type === 'positive' ? '#10B981'
                              : w.type === 'result' ? '#6366F1'
                              : '#EF4444'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Full-width: Overstock Trend vs Purchasing */}
          <div className="card">
            <div className="flex items-start justify-between">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Overstock Trend vs Purchasing Volume</h4>
              <AIInsightButton id="inventory-deep-overstock-vs-purchasing" title="Overstock Trend vs Purchasing Volume" data={filteredOverstockTrend as unknown as Record<string, unknown>[]} />
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-3">
              Monthly overstock (line) vs purchase volume (bars) · time filter applies
            </p>
            <div style={{ height: 220 }}>
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={filteredOverstockTrend}
                    margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={v => `${formatCrOrUsdMAuto(v)}`}
                    />
                    <Tooltip contentStyle={{ fontSize: '11px' }} formatter={(v: unknown) => [`${formatCrOrUsdMAuto(v as number)}`]} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="purchase_volume_cr" name="Purchase Volume" fill="#DBEAFE" />
                    <Line
                      type="monotone"
                      dataKey="overstock_cr"
                      name="Overstock"
                      stroke="#DC2626"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
            <Insight>
              {formatCrOrUsdMAuto(overstock.summary.dead_stock_value_cr)} in dead stock — Apparel and Electronics account for {appElecPct}% of that exposure. Purchasing volumes have grown {Math.round(((overstock.trend_vs_purchasing[overstock.trend_vs_purchasing.length - 1].purchase_volume_cr / overstock.trend_vs_purchasing[0].purchase_volume_cr) - 1) * 100)}% while overstock grew {Math.round(((overstock.trend_vs_purchasing[overstock.trend_vs_purchasing.length - 1].overstock_cr / overstock.trend_vs_purchasing[0].overstock_cr) - 1) * 100)}% — recommend a markdown clearance event and purchasing plan review for Apparel and Electronics.
            </Insight>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* MARKDOWN ACTION PLAN                                             */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {overstock.markdown_recommendations && overstock.markdown_recommendations.length > 0 && (
          <>
            <Divider />
            <section className="space-y-5">
              <SectionHeader n={4} title="Markdown Action Plan" subtitle="Category-by-category markdown timing, depth, and expected recovery" />
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[var(--bg-secondary)]">
                        <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">Category</th>
                        <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)]">Overstock ($)</th>
                        <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)]">Days in Stock</th>
                        <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)]">Markdown %</th>
                        <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">Timing</th>
                        <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)]">Sell-Through %</th>
                        <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)]">Recovery ($)</th>
                        <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)]">Margin Impact ($)</th>
                        <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)]">Net vs Write-Off ($)</th>
                        <th className="text-center px-4 py-2.5 font-medium text-[var(--text-secondary)]">Urgency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {(overstock.markdown_recommendations as MarkdownRecommendation[]).map(rec => (
                        <tr key={rec.category} className="hover:bg-[var(--bg-secondary)]">
                          <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">{rec.category}</td>
                          <td className="px-4 py-2.5 text-right text-[var(--text-primary)]">{formatCrOrUsdMAuto(rec.overstock_cr)}</td>
                          <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{rec.days_in_overstock_avg}d</td>
                          <td className={`px-4 py-2.5 text-right font-medium ${rec.recommended_markdown_pct === 0 ? 'text-green-600' : rec.recommended_markdown_pct >= 25 ? 'text-red-600' : 'text-amber-600'}`}>
                            {rec.recommended_markdown_pct > 0 ? `${rec.recommended_markdown_pct}%` : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-[var(--text-secondary)] max-w-[160px]">
                            <p className="truncate">{rec.recommended_timing}</p>
                          </td>
                          <td className="px-4 py-2.5 text-right text-[var(--text-primary)]">{rec.expected_sell_through_pct}%</td>
                          <td className="px-4 py-2.5 text-right text-green-600 font-medium">{formatCrOrUsdMAuto(rec.revenue_recovery_cr)}</td>
                          <td className={`px-4 py-2.5 text-right font-medium ${rec.margin_impact_cr < 0 ? 'text-red-600' : 'text-[var(--text-primary)]'}`}>
                            {rec.margin_impact_cr !== 0 ? formatCrOrUsdMAuto(rec.margin_impact_cr) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right text-green-600 font-medium">{formatCrOrUsdMAuto(rec.net_benefit_vs_writeoff_cr)}</td>
                          <td className="px-4 py-2.5 text-center">
                            {rec.urgency !== 'none' ? (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                rec.urgency === 'critical' ? 'bg-red-50 text-red-700' :
                                rec.urgency === 'high' ? 'bg-orange-50 text-orange-700' :
                                rec.urgency === 'medium' ? 'bg-amber-50 text-amber-700' :
                                'bg-green-50 text-green-700'
                              }`}>{rec.urgency}</span>
                            ) : (
                              <span className="text-[var(--text-tertiary)] text-[10px]">none</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <Insight>
                Dairy &amp; Frozen needs markdown TODAY — perishables expire within 3–5 days. Apparel at 30% markdown can recover {formatCrOrUsdMAuto(28.4)} with 78% sell-through. Grocery &amp; Staples requires no markdown — high-velocity stock clears in 2–3 weeks at full price.
              </Insight>
            </section>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECTION 5 — SUBSTITUTION INTELLIGENCE                           */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {substitution && (
          <>
            <Divider />
            <section className="space-y-5">
              <SectionHeader
                n={5}
                title="Substitution Intelligence"
                subtitle="When a SKU is out of stock — which alternatives preserve revenue"
              />

              {/* KPI strip */}
              <div className="grid grid-cols-4 gap-3">
                <div className="card py-3 px-4">
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">Stockout SKUs with Substitutes</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">{substitution.summary.stockout_skus_with_substitutes}</p>
                  <p className="text-xs text-[var(--text-secondary)]">mapped alternatives</p>
                </div>
                <div className="card py-3 px-4">
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">Preservation Opportunity</p>
                  <p className="text-lg font-semibold text-green-600">{formatCrOrUsdMAuto(substitution.summary.revenue_preservation_opportunity_cr)}</p>
                  <p className="text-xs text-[var(--text-secondary)]">revenue recoverable</p>
                </div>
                <div className="card py-3 px-4">
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">Avg Acceptance Rate</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">{substitution.summary.avg_substitution_acceptance_rate_pct}%</p>
                  <p className="text-xs text-[var(--text-secondary)]">customers take substitute</p>
                </div>
                <div className="card py-3 px-4">
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">Substitute Pairs Mapped</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">{substitution.summary.top_substitute_pairs}</p>
                  <p className="text-xs text-[var(--text-secondary)]">validated pairings</p>
                </div>
              </div>

              {/* Substitution table */}
              <div className="space-y-3">
                {substitution.substitutions.map(item => (
                  <div key={item.stockout_sku_id} className="card overflow-hidden">
                    {/* Stockout SKU header */}
                    <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full uppercase tracking-wide">Stockout</span>
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{item.stockout_sku_name}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{item.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-red-600">{item.stockout_stores} stores affected</p>
                        <p className="text-xs text-red-500">{formatCrOrUsdMAuto(item.daily_revenue_lost_cr)}/day lost</p>
                      </div>
                    </div>

                    {/* Substitute rows */}
                    <div className="divide-y divide-[var(--border-subtle)]">
                      {item.substitutes.map(sub => (
                        <div key={sub.substitute_sku_id} className="px-4 py-3 pl-8">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              {/* Confidence badge */}
                              <span className={`mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${
                                sub.confidence === 'high' ? 'bg-green-50 text-green-700' :
                                sub.confidence === 'medium' ? 'bg-amber-50 text-amber-700' :
                                'bg-gray-50 text-gray-600'
                              }`}>{sub.confidence}</span>
                              <div>
                                <p className="text-sm font-medium text-[var(--text-primary)]">{sub.substitute_name}</p>
                                <p className="text-xs text-[var(--text-secondary)]">{sub.brand}</p>
                              </div>
                            </div>

                            {/* Price variance */}
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs text-[var(--text-tertiary)]">Price</p>
                              <p className={`text-xs font-medium ${
                                sub.price_variance_pct < 0 ? 'text-green-600' :
                                Math.abs(sub.price_variance_pct) <= 5 ? 'text-[var(--text-secondary)]' :
                                'text-amber-600'
                              }`}>
                                {sub.price_variance_pct > 0 ? '+' : ''}{sub.price_variance_pct}%
                              </p>
                            </div>

                            {/* Stock */}
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs text-[var(--text-tertiary)]">In Stock</p>
                              <p className="text-xs font-medium text-[var(--text-primary)]">{sub.in_stock_stores} stores</p>
                              <p className="text-xs text-[var(--text-secondary)]">{sub.in_stock_dos}d DoS</p>
                            </div>

                            {/* Acceptance rate */}
                            <div className="flex-shrink-0 w-28">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-xs text-[var(--text-tertiary)]">Acceptance</p>
                                <p className={`text-xs font-medium ${
                                  sub.historical_acceptance_rate_pct >= 75 ? 'text-green-600' :
                                  sub.historical_acceptance_rate_pct >= 50 ? 'text-amber-600' :
                                  'text-red-600'
                                }`}>{sub.historical_acceptance_rate_pct}%</p>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    sub.historical_acceptance_rate_pct >= 75 ? 'bg-green-500' :
                                    sub.historical_acceptance_rate_pct >= 50 ? 'bg-amber-400' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${sub.historical_acceptance_rate_pct}%` }}
                                />
                              </div>
                            </div>

                            {/* Revenue preservation */}
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs text-[var(--text-tertiary)]">Revenue</p>
                              <p className="text-xs font-medium text-green-600">{sub.revenue_preservation_pct}% preserved</p>
                            </div>

                            {/* Recommendation badge */}
                            <span className={`flex-shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              sub.recommendation.includes('Primary') ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'
                            }`}>
                              {sub.recommendation.includes('Primary') ? 'Primary' : 'Secondary'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary callout */}
              {isMounted && (() => {
                const totalPrimaryPreservation = substitution.substitutions.reduce((sum, item) => {
                  const primary = item.substitutes.find(s => s.recommendation.includes('Primary'));
                  if (!primary) return sum;
                  return sum + (item.daily_revenue_lost_cr * primary.revenue_preservation_pct / 100);
                }, 0);
                const totalMonthlyAtRisk = substitution.substitutions.reduce((s, item) => s + item.daily_revenue_lost_cr * 30, 0);
                return (
                  <Insight>
                    If all primary substitutes are actively recommended to customers via store staff training and shelf signage, an estimated {formatCrOrUsdMAuto((totalPrimaryPreservation * 30).toFixed(1))} of the {formatCrOrUsdMAuto(totalMonthlyAtRisk.toFixed(1))} monthly revenue at risk can be preserved. The top category substitutes show the highest acceptance rate (88%) — train staff to recommend the closest in-stock alternative.
                  </Insight>
                );
              })()}
            </section>
          </>
        )}

        {/* Bottom padding */}
        <div className="h-10" />
      </div>
    </div>
  );
}
