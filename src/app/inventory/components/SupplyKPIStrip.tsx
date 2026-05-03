'use client';

import Link from 'next/link';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import type { SupplyKPIs, SupplyKPIMetric } from './InventoryDashboardContent';

// ── Deep dive routes ───────────────────────────────────────────────────────

const DEEP_DIVE_URLS = {
  revenue_at_risk: '/inventory/deep/stock-health',
  inventory_value: '/inventory/deep/stock-health',
  osa:             '/inventory/deep/stock-health',
  avg_dos:         '/inventory/deep/demand-forecast',
  stockout_count:  '/inventory/deep/stock-health',
  supplier_otif:   '/inventory/deep/supply-chain',
} as const;

type KpiKey = keyof typeof DEEP_DIVE_URLS;

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtValue(key: KpiKey, v: number, unit: string): string {
  if (unit === 'cr') return `₹${v.toFixed(1)}Cr`;
  if (unit === '%') return `${v.toFixed(1)}%`;
  if (unit === 'days') return `${v.toFixed(1)}d`;
  if (key === 'stockout_count') return v.toLocaleString();
  if (v >= 1000) return `₹${v.toLocaleString()}Cr`;
  return `${v}`;
}

function pctChange(current: number, prior: number): number {
  if (prior === 0) return 0;
  return ((current - prior) / prior) * 100;
}

function isUpBad(key: KpiKey): boolean {
  return key === 'revenue_at_risk' || key === 'stockout_count';
}

function isUpGood(key: KpiKey): boolean {
  return key === 'osa' || key === 'supplier_otif';
}

function getTrendColor(key: KpiKey, change: number): string {
  if (Math.abs(change) < 0.5) return 'text-[var(--text-secondary)]';
  const up = change > 0;
  if (isUpBad(key)) return up ? 'text-red-600' : 'text-green-600';
  if (isUpGood(key)) return up ? 'text-green-600' : 'text-red-600';
  return 'text-[var(--text-secondary)]';
}

function getDosStatus(value: number): { color: string; bg: string } {
  if (value < 14) return { color: 'text-red-600', bg: 'bg-red-50' };
  if (value > 28) return { color: 'text-amber-600', bg: 'bg-amber-50' };
  return { color: 'text-green-600', bg: 'bg-green-50' };
}

function getKpiBorderColor(key: KpiKey, kpi: SupplyKPIMetric): string {
  const change = pctChange(kpi.value, kpi.prior);
  if (key === 'avg_dos') {
    const { bg } = getDosStatus(kpi.value);
    if (bg === 'bg-red-50') return 'border-red-300';
    if (bg === 'bg-amber-50') return 'border-amber-300';
    return 'border-green-300';
  }
  if (Math.abs(change) < 0.5) return 'border-[var(--border-default)]';
  const up = change > 0;
  const bad = (isUpBad(key) && up) || (isUpGood(key) && !up);
  return bad ? 'border-red-200' : 'border-[var(--border-default)]';
}

function contextLine(key: KpiKey, kpi: SupplyKPIMetric): string {
  switch (key) {
    case 'revenue_at_risk':
      return `${kpi.stores_affected} stores · ${kpi.skus_affected} SKUs`;
    case 'inventory_value':
      return `₹${kpi.overstock_value}Cr overstock`;
    case 'osa':
      return `Target ${kpi.target}% · -₹${kpi.daily_impact_cr}Cr/day`;
    case 'avg_dos':
      return `${kpi.below_7_days_pct}% SKUs below 7d`;
    case 'stockout_count':
      return `₹${kpi.rev_impact_today}Cr lost today`;
    case 'supplier_otif':
      return `${kpi.suppliers_below_threshold} suppliers below 80%`;
  }
}

// ── Mini sparkline ────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const pts = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={28}>
      <LineChart data={pts} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────

interface KPICardProps {
  kpiKey: KpiKey;
  kpi: SupplyKPIMetric;
}

function KPICard({ kpiKey, kpi }: KPICardProps) {
  const change = pctChange(kpi.value, kpi.prior);
  const trendColor = getTrendColor(kpiKey, change);
  const borderClass = getKpiBorderColor(kpiKey, kpi);

  const sparkColor =
    kpiKey === 'revenue_at_risk' || kpiKey === 'stockout_count' ? '#ef4444' :
    kpiKey === 'osa' || kpiKey === 'supplier_otif' ? '#22c55e' :
    '#6366f1';

  const TrendIcon = Math.abs(change) < 0.5 ? Minus : change > 0 ? TrendingUp : TrendingDown;

  return (
    <Link
      href={DEEP_DIVE_URLS[kpiKey]}
      className={`group card text-left p-3 border-2 transition-all hover:shadow-md hover:border-[var(--accent-primary)] w-full block ${borderClass}`}
    >
      <p className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wide font-medium mb-1 truncate">
        {kpi.label}
      </p>
      <p className="text-xl font-bold text-[var(--text-primary)] leading-tight">
        {fmtValue(kpiKey, kpi.value, kpi.unit)}
      </p>
      <div className={`flex items-center gap-1 mt-0.5 text-xs font-medium ${trendColor}`}>
        <TrendIcon size={11} />
        <span>{Math.abs(change).toFixed(1)}% vs prior</span>
      </div>
      <div className="mt-1.5 -mx-0.5">
        <Sparkline data={kpi.sparkline} color={sparkColor} />
      </div>
      <div className="flex items-center justify-between mt-1">
        <p className="text-[10px] text-[var(--text-tertiary)] truncate">
          {contextLine(kpiKey, kpi)}
        </p>
        <span className="flex items-center gap-0.5 text-[10px] text-[var(--accent-primary)] font-medium opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
          Full analysis <ArrowRight size={9} />
        </span>
      </div>
    </Link>
  );
}

// ── Main component ────────────────────────────────────────────────────────

interface SupplyKPIStripProps {
  kpis: SupplyKPIs | null;
}

const KPI_KEYS: KpiKey[] = [
  'revenue_at_risk',
  'inventory_value',
  'osa',
  'avg_dos',
  'stockout_count',
  'supplier_otif',
];

export default function SupplyKPIStrip({ kpis }: SupplyKPIStripProps) {
  if (!kpis) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {KPI_KEYS.map(key => (
        <KPICard key={key} kpiKey={key} kpi={kpis[key]} />
      ))}
    </div>
  );
}
