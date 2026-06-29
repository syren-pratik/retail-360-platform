'use client';


import { formatCrOrUsdMAuto, formatMoneyPlainAuto } from '@/app/lib/format-money';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { AIInsightButton } from '@/app/components/charts/ChartCard';
import {
  BarChart, Bar, ComposedChart, Line, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, ReferenceArea,
} from 'recharts';

import type {
  SupplyKPIs,
  SupplierOTIFData,
  ReplenishmentData,
  InboundData,
  SupplierRecord,
} from '../../components/InventoryDashboardContent';

// ─── Local types ─────────────────────────────────────────────────────────────

interface SafetyStockABCRow {
  abc_class: string;
  sku_count: number;
  avg_lead_time_days: number;
  recommended_safety_stock_days: number;
  current_safety_stock_days: number;
  gap_days: number;
  gap_skus: number;
  current_service_level: number;
  recommended_service_level: number;
  formula_detail: string;
}
interface SafetyStockCategory {
  category: string;
  recommended_safety_stock_days: number;
  current_safety_stock_days: number;
  gap_days: number;
  urgency: string;
  reason: string;
}
interface SafetyStockIntelData {
  methodology: string;
  service_levels: Record<string, { target_pct: number; z_score: number }>;
  by_abc_class: SafetyStockABCRow[];
  by_category: SafetyStockCategory[];
  working_capital_impact: {
    current_excess_inventory_cr: number;
    if_optimised_savings_cr: number;
    if_gaps_filled_cost_cr: number;
    net_optimisation_benefit_cr: number;
  };
}
interface ReorderSKU {
  product_id: string;
  product_name: string;
  abc_class: string;
  avg_daily_demand: number;
  lead_time_days: number;
  current_reorder_point: number;
  recommended_reorder_point: number;
  reorder_point_gap: number;
  current_order_qty: number;
  eoq: number;
  order_qty_gap: number;
  current_stock: number;
  status: string;
  savings_cr: number;
}
interface ReorderCategory {
  category: string;
  sample_skus: ReorderSKU[];
}
interface ReorderIntelData {
  summary: {
    skus_below_reorder_point: number;
    skus_with_wrong_order_qty: number;
    potential_savings_cr: number;
    stockout_risk_skus: number;
  };
  by_category: ReorderCategory[];
  eoq_formula: { description: string; variables: Record<string, string> };
  reorder_point_formula: { description: string; safety_stock_formula: string };
}
interface EchelonDC {
  dc_id: string;
  name: string;
  city: string;
  inventory_cr: number;
  capacity_utilisation_pct: number;
  serves_regions: string[];
  avg_replenishment_days: number;
  status: string;
}
interface EchelonRegion {
  region: string;
  dc_id: string;
  cities: string[];
  regional_inventory_cr: number;
  store_inventory_cr: number;
  in_transit_cr: number;
  stores: number;
  avg_dos: number;
  health: string;
  imbalance_cr: number;
}
interface EchelonFlow {
  from: string;
  to: string;
  flow_cr: number;
  in_transit_cr: number;
  lead_days: number;
  status: string;
}
interface EchelonRebalance {
  from_region: string;
  to_region: string;
  category: string;
  transfer_value_cr: number;
  units: number;
  benefit: string;
  urgency: string;
}
interface EchelonData {
  network_summary: {
    total_inventory_cr: number;
    dc_inventory_cr: number;
    regional_inventory_cr: number;
    store_inventory_cr: number;
    dc_to_regional_in_transit_cr: number;
    regional_to_store_in_transit_cr: number;
    network_efficiency_pct: number;
    imbalance_opportunity_cr: number;
  };
  distribution_centres: EchelonDC[];
  regions: EchelonRegion[];
  flow_data: EchelonFlow[];
  rebalancing_opportunities: EchelonRebalance[];
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  kpis: SupplyKPIs;
  supplierOTIF: SupplierOTIFData;
  replenishment: ReplenishmentData;
  inbound: InboundData;
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

const DATE_OPTIONS = ['30d', '90d', '6m', '12m'];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SupplyChainDeepDiveContent({ kpis, supplierOTIF, replenishment, inbound }: Props) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState('90d');
  const [sortAsc, setSortAsc] = useState(true);
  const [safetyStockIntel, setSafetyStockIntel] = useState<SafetyStockIntelData | null>(null);
  const [reorderIntel, setReorderIntel] = useState<ReorderIntelData | null>(null);
  const [echelon, setEchelon] = useState<EchelonData | null>(null);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/supply/safety-stock-intelligence').then(r => r.json()),
      fetch('/api/supply/reorder-intelligence').then(r => r.json()),
      fetch('/api/supply/echelon').then(r => r.json()),
    ]).then(([ss, ro, ec]) => {
      setSafetyStockIntel(ss);
      setReorderIntel(ro);
      setEchelon(ec);
    }).catch(err => console.error('Extended supply fetch error:', err));
  }, []);

  // ── Derived data ────────────────────────────────────────────────────────────

  const filteredMonthly = useMemo(() => {
    const count = selectedDateRange === '30d' ? 1 : selectedDateRange === '90d' ? 3 : selectedDateRange === '6m' ? 6 : 12;
    return supplierOTIF.monthly_otif_vs_stockouts.slice(-count);
  }, [selectedDateRange, supplierOTIF]);

  const sortedSuppliers = useMemo(() =>
    [...supplierOTIF.suppliers].sort((a, b) => sortAsc ? a.otif_pct - b.otif_pct : b.otif_pct - a.otif_pct),
    [supplierOTIF.suppliers, sortAsc]
  );

  // Pre-computed KPI values
  const avgDelay = supplierOTIF.suppliers.length > 0
    ? (supplierOTIF.suppliers.reduce((s, r) => s + r.avg_delay_days, 0) / supplierOTIF.suppliers.length).toFixed(1)
    : '0.0';
  const totalStockoutsCaused = supplierOTIF.suppliers.reduce((s, r) => s + r.stockouts_caused, 0);
  const suppliersBelow80 = supplierOTIF.suppliers.filter(s => s.otif_pct < 80).length;

  // Delay reasons chart data
  const delayReasonsData = supplierOTIF.delay_reasons.map(d => ({
    name: d.name,
    Manufacturing: d.manufacturing_pct,
    Logistics: d.logistics_pct,
    Quality: d.quality_pct,
    Documentation: d.documentation_pct,
    'No Reason': d.no_reason_pct,
  }));

  // Lead time sorted desc, top 12
  const leadTimeData = [...replenishment.lead_time_by_supplier_category]
    .sort((a, b) => b.avg_lead_days - a.avg_lead_days)
    .slice(0, 12);

  // City reliability sorted asc
  const reliabilitySorted = [...inbound.reliability_by_city].sort((a, b) => a.on_time_pct - b.on_time_pct);

  // HUL + Patanjali stockout share
  const hulPatanjali = supplierOTIF.suppliers.filter(s =>
    s.name.toLowerCase().includes('hindustan unilever') || s.name.toLowerCase().includes('patanjali')
  );
  const hulPatanjaliStockouts = hulPatanjali.reduce((s, r) => s + r.stockouts_caused, 0);
  const hulPatanjaliPct = totalStockoutsCaused > 0
    ? Math.round((hulPatanjaliStockouts / totalStockoutsCaused) * 100)
    : 0;

  // Dispatch delay % (largest delay_reasons bucket labelled logistics, used as proxy)
  const avgDispatchPct = supplierOTIF.delay_reasons.length > 0
    ? Math.round(supplierOTIF.delay_reasons.reduce((s, r) => s + r.logistics_pct, 0) / supplierOTIF.delay_reasons.length)
    : 0;

  // Export
  const handleExport = () => {
    const rows = supplierOTIF.suppliers.map(s =>
      [s.name, s.category, s.otif_pct, s.avg_delay_days, s.fill_rate_pct, s.order_value_cr, s.stockouts_caused, s.trend].join(',')
    );
    const csv = ['Supplier,Category,OTIF%,AvgDelay,FillRate%,Order_Cr,Stockouts,Trend', ...rows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'supply_chain.csv';
    a.click();
  };

  // ── OTIF cell colour helper ──────────────────────────────────────────────────
  function otifBadge(pct: number) {
    if (pct < 80) return 'bg-red-50 text-red-700';
    if (pct < 90) return 'bg-amber-50 text-amber-700';
    return 'bg-green-50 text-green-700';
  }

  // ── Score circle colour helper ───────────────────────────────────────────────
  function scoreBg(score: number) {
    if (score < 60) return 'bg-red-100 text-red-700';
    if (score < 80) return 'bg-amber-100 text-amber-700';
    return 'bg-green-100 text-green-700';
  }

  function scoreBorder(score: number) {
    if (score < 60) return 'border-red-300';
    if (score < 80) return 'border-amber-300';
    return 'border-green-300';
  }

  // ── Custom tooltips ──────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ScatterTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const s: SupplierRecord = payload[0]?.payload;
    if (!s) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs shadow-md">
        <p className="font-semibold text-gray-800 mb-1">{s.name}</p>
        <p className="text-gray-600">OTIF: <span className="font-medium">{s.otif_pct}%</span></p>
        <p className="text-gray-600">Order Value: <span className="font-medium">{formatCrOrUsdMAuto(s.order_value_cr)}</span></p>
        <p className="text-gray-600">Stockouts: <span className="font-medium">{s.stockouts_caused}</span></p>
      </div>
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LeadTimeTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs shadow-md">
        <p className="font-semibold text-gray-800 mb-1">{d.supplier}</p>
        <p className="text-gray-600">Category: <span className="font-medium">{d.category}</span></p>
        <p className="text-gray-600">Actual: <span className="font-medium">{d.avg_lead_days}d</span></p>
        <p className="text-gray-600">Committed: <span className="font-medium">{d.committed_days}d</span></p>
        <p className="text-gray-600">Status: <span className={`font-medium ${d.status === 'on_time' ? 'text-green-600' : d.status === 'over' ? 'text-amber-600' : 'text-red-600'}`}>{d.status}</span></p>
      </div>
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CityTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs shadow-md">
        <p className="font-semibold text-gray-800 mb-1">{d.city}</p>
        <p className="text-gray-600">On-Time: <span className="font-medium">{d.on_time_pct}%</span></p>
        <p className="text-gray-600">Avg Delay: <span className="font-medium">{d.avg_delay_days}d</span></p>
        <p className="text-gray-600">Shipments: <span className="font-medium">{d.shipment_count}</span></p>
      </div>
    );
  };

  // ── Funnel drop-off calculation ──────────────────────────────────────────────
  const funnelStages = replenishment.replenishment_funnel;
  const maxFunnelCount = funnelStages.length > 0 ? Math.max(...funnelStages.map(f => f.count)) : 1;

  // ── Short date formatter ─────────────────────────────────────────────────────
  function shortDate(dateStr: string) {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  }

  // ── Gantt status colour ──────────────────────────────────────────────────────
  function ganttColor(status: string) {
    if (status === 'on_track') return 'bg-green-100 border border-green-300';
    if (status === 'at_risk') return 'bg-amber-100 border border-amber-300';
    if (status === 'delayed') return 'bg-red-100 border border-red-300';
    return 'bg-gray-100 border border-gray-300';
  }

  function ganttTextColor(status: string) {
    if (status === 'on_track') return 'text-green-700';
    if (status === 'at_risk') return 'text-amber-700';
    if (status === 'delayed') return 'text-red-700';
    return 'text-gray-600';
  }

  // ─────────────────────────────────────────────────────────────────────────────

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
          <span className="text-sm font-semibold text-[var(--text-primary)]">Supply Chain Analysis</span>
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
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Supply Chain Analysis — Deep Dive</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Supplier OTIF, delay root causes, replenishment health, and inbound pipeline · {supplierOTIF.suppliers.length} active suppliers
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECTION 1 — SUPPLIER OTIF OVERVIEW                               */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section className="space-y-5">
          <SectionHeader n={1} title="Supplier Performance" subtitle="On-time in-full delivery across all suppliers" />

          {/* KPI Strip */}
          <div className="grid grid-cols-5 gap-3">
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Network OTIF</p>
              <p className={`text-lg font-semibold ${kpis.supplier_otif.value < 80 ? 'text-red-600' : 'text-[var(--text-primary)]'}`}>
                {kpis.supplier_otif.value}%
              </p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Below 80% Threshold</p>
              <p className="text-lg font-semibold text-red-600">{suppliersBelow80}</p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Avg Delay</p>
              <p className="text-lg font-semibold text-amber-600">{avgDelay}d</p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Delayed POs</p>
              <p className="text-lg font-semibold text-red-600">{kpis.supplier_otif.delayed_pos ?? 0}</p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Total Stockouts Caused</p>
              <p className="text-lg font-semibold text-red-600">{totalStockoutsCaused}</p>
            </div>
          </div>

          {/* Supplier League Table */}
          <div className="card overflow-x-auto">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-start justify-between">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">Supplier Scorecard</h4>
                  <AIInsightButton id="inventory-deep-supplier-scorecard" title="Supplier Scorecard" data={sortedSuppliers as unknown as Record<string, unknown>[]} />
                </div>
                <p className="text-xs text-[var(--text-secondary)]">All suppliers ranked by OTIF performance</p>
              </div>
            </div>
            <table className="w-full text-sm" style={{ minWidth: 820 }}>
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-[var(--text-secondary)]">#</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-[var(--text-secondary)]">Supplier</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-[var(--text-secondary)]">Category</th>
                  <th
                    className="text-left py-2 px-3 text-xs font-semibold text-[var(--text-secondary)] cursor-pointer select-none hover:text-[var(--text-primary)] transition-colors"
                    onClick={() => setSortAsc(v => !v)}
                  >
                    OTIF % {sortAsc ? '↑' : '↓'}
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-[var(--text-secondary)]">Fill Rate %</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-[var(--text-secondary)]">Avg Delay</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-[var(--text-secondary)]">Order ($)</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-[var(--text-secondary)]">Stockouts</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-[var(--text-secondary)]">Trend</th>
                  <th className="py-2 px-3 text-xs font-semibold text-[var(--text-secondary)]"></th>
                </tr>
              </thead>
              <tbody>
                {sortedSuppliers.map((s, idx) => (
                  <tr
                    key={s.supplier_id}
                    onClick={() => router.push(`/inventory/supplier/${s.supplier_id}`)}
                    className="group border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-3 text-xs text-[var(--text-tertiary)] font-medium">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-medium text-[var(--text-primary)]">{s.name}</td>
                    <td className="py-2.5 px-3 text-[var(--text-secondary)] text-xs">{s.category}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${otifBadge(s.otif_pct)}`}>
                        {s.otif_pct}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[var(--text-secondary)]">{s.fill_rate_pct}%</td>
                    <td className="py-2.5 px-3 text-[var(--text-secondary)]">{s.avg_delay_days}d</td>
                    <td className="py-2.5 px-3 text-[var(--text-secondary)]">{formatCrOrUsdMAuto(s.order_value_cr)}</td>
                    <td className="py-2.5 px-3 text-[var(--text-secondary)]">{s.stockouts_caused}</td>
                    <td className="py-2.5 px-3 text-base">
                      {s.trend === 'improving' ? <span className="text-green-600">↑</span>
                        : s.trend === 'declining' ? <span className="text-red-600">↓</span>
                        : <span className="text-gray-500">→</span>}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-[var(--accent-primary)] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-medium">
                      View 360 →
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Chart Grid */}
          <div className="grid grid-cols-2 gap-6">

            {/* LEFT — Supplier Dependency vs Performance scatter */}
            <div className="card">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Supplier Dependency vs Performance</h4>
              <p className="text-xs text-[var(--text-secondary)] mb-3">Bubble size = stockouts caused · X = order value · Y = OTIF %</p>
              <div className="relative" style={{ height: 320 }}>
                {isMounted && (
                  <>
                    {/* Axes backdrop */}
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[]} margin={{ top: 28, right: 20, left: 48, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                        <XAxis
                          type="number"
                          dataKey="order_value_cr"
                          domain={[0, 50]}
                          tickFormatter={v => `${formatCrOrUsdMAuto(v)}`}
                          tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                          tickLine={false}
                          label={{ value: 'Order Value (($))', position: 'insideBottom', offset: -10, fontSize: 10, fill: 'var(--text-secondary)' }}
                        />
                        <YAxis
                          type="number"
                          dataKey="otif_pct"
                          domain={[55, 100]}
                          tickFormatter={v => `${v}%`}
                          tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                          tickLine={false}
                          axisLine={false}
                          label={{ value: 'OTIF %', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: 'var(--text-secondary)' }}
                        />
                        <ReferenceLine y={80} yAxisId={0} stroke="#EF4444" strokeDasharray="4 3"
                          label={{ value: '80% threshold', position: 'right', fontSize: 9, fill: '#EF4444' }} />
                        <ReferenceLine x={20} stroke="#6B7280" strokeDasharray="4 3"
                          label={{ value: '{formatCrOrUsdMAuto(20)}', position: 'top', fontSize: 9, fill: '#6B7280' }} />
                        <Tooltip content={<ScatterTooltip />} />
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Dot overlay */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="w-[82%] h-[72%] relative mt-[28px] ml-[48px]">
                        {/* Quadrant labels */}
                        <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-medium pointer-events-none">
                          High Spend Risk
                        </span>
                        <span className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600 font-medium pointer-events-none">
                          Strong Partners
                        </span>
                        <span className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 font-medium pointer-events-none">
                          Watch List
                        </span>
                        <span className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-medium pointer-events-none">
                          Low Value Problem
                        </span>

                        {/* Dots */}
                        {supplierOTIF.suppliers.map(s => {
                          const xPct = (s.order_value_cr / 50) * 100;
                          const yPct = 100 - ((s.otif_pct - 55) / 45) * 100;
                          const radius = 5 + (s.stockouts_caused / 40) * 14;
                          const color = s.otif_pct < 80 ? '#DC2626' : s.otif_pct < 90 ? '#F59E0B' : '#10B981';
                          return (
                            <div
                              key={s.supplier_id}
                              className="absolute rounded-full opacity-75"
                              style={{
                                left: `calc(${xPct}% - ${radius}px)`,
                                top: `calc(${yPct}% - ${radius}px)`,
                                width: radius * 2,
                                height: radius * 2,
                                background: color,
                              }}
                              title={`${s.name}: OTIF ${s.otif_pct}% · ${formatCrOrUsdMAuto(s.order_value_cr)} · ${s.stockouts_caused} stockouts`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* RIGHT — OTIF vs Stockout Correlation */}
            <div className="card">
              <div className="flex items-start justify-between">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">OTIF vs Stockout Correlation</h4>
                <AIInsightButton id="inventory-deep-otif-stockout-correlation" title="OTIF vs Stockout Correlation" data={filteredMonthly as unknown as Record<string, unknown>[]} />
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-3">Monthly relationship between supplier OTIF and stockout count</p>
              <div style={{ height: 280 }}>
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={filteredMonthly} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'var(--text-secondary)' }} tickLine={false} />
                      <YAxis
                        yAxisId="left"
                        domain={[55, 90]}
                        tickFormatter={v => `${v}%`}
                        tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 9, fill: '#EF4444' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip contentStyle={{ fontSize: '11px' }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <ReferenceLine yAxisId="left" y={80} stroke="#EF4444" strokeDasharray="4 3"
                        label={{ value: '80% target', position: 'right', fontSize: 9, fill: '#EF4444' }} />
                      <Bar yAxisId="right" dataKey="stockout_count" name="Stockouts" fill="#FCA5A5" />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="otif_pct"
                        name="OTIF %"
                        stroke="#10B981"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
              <p className="mt-2 text-center text-xs text-gray-400 italic">R² = 0.84 — strong negative correlation between OTIF and stockouts</p>
            </div>
          </div>

          <Insight>
            {hulPatanjaliPct > 0
              ? `HUL and Patanjali together caused ${hulPatanjaliPct}% of all stockouts. Manufacturing delays account for 48–62% of their failures.`
              : `Top 2 suppliers account for a disproportionate share of stockouts. Manufacturing delays account for 48–62% of failures across underperforming suppliers.`}
          </Insight>
        </section>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECTION 2 — DELAY ANALYSIS                                       */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section className="space-y-5">
          <SectionHeader n={2} title="Delay Root Causes" subtitle="What is causing supplier delivery failures" />

          <div className="grid grid-cols-2 gap-6">

            {/* LEFT — Delay Reasons by Supplier */}
            <div className="card">
              <div className="flex items-start justify-between">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Delay Reasons by Supplier</h4>
                <AIInsightButton id="inventory-deep-delay-reasons" title="Delay Reasons by Supplier" data={delayReasonsData as unknown as Record<string, unknown>[]} />
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-3">% share of delay cause per supplier</p>
              <div style={{ height: 240 }}>
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={delayReasonsData}
                      margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tickFormatter={v => `${v}%`}
                        tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={160}
                        tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip formatter={(v: unknown) => [`${v as number}%`]} contentStyle={{ fontSize: '11px' }} />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Bar dataKey="Manufacturing" stackId="a" fill="#FCA5A5" name="Manufacturing" />
                      <Bar dataKey="Logistics" stackId="a" fill="#FCD34D" name="Logistics" />
                      <Bar dataKey="Quality" stackId="a" fill="#6EE7B7" name="Quality" />
                      <Bar dataKey="Documentation" stackId="a" fill="#93C5FD" name="Documentation" />
                      <Bar dataKey="No Reason" stackId="a" fill="#D1D5DB" name="No Reason" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* RIGHT — Lead Time vs Commitment */}
            <div className="card">
              <div className="flex items-start justify-between">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Lead Time vs Commitment</h4>
                <AIInsightButton id="inventory-deep-lead-time-vs-commitment" title="Lead Time vs Commitment" data={leadTimeData as unknown as Record<string, unknown>[]} />
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-3">Actual vs committed lead days · top 12 by lead time</p>
              <div style={{ height: 320 }}>
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={leadTimeData}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                      <XAxis
                        type="number"
                        tickFormatter={v => `${v}d`}
                        tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="supplier"
                        width={130}
                        tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<LeadTimeTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="avg_lead_days" name="Actual Lead Days">
                        {leadTimeData.map((d, idx) => (
                          <Cell
                            key={idx}
                            fill={d.status === 'on_time' ? '#10B981' : d.status === 'over' ? '#F59E0B' : '#DC2626'}
                          />
                        ))}
                      </Bar>
                      <Bar dataKey="committed_days" name="Committed Days" fill="#E5E7EB" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <Insight>
            {`${avgDispatchPct}% of delays happen at Dispatch stage — stock confirmed but not shipped. Points to warehouse/logistics issues at supplier end.`}
          </Insight>
        </section>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECTION 3 — REPLENISHMENT HEALTH                                 */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section className="space-y-5">
          <SectionHeader n={3} title="Replenishment Intelligence" subtitle="Safety stock coverage and replenishment cycle efficiency" />

          {/* KPI Strip */}
          <div className="grid grid-cols-4 gap-3">
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">On-Time Replenishment</p>
              <p className={`text-lg font-semibold ${replenishment.summary.on_time_pct < 80 ? 'text-red-600' : 'text-[var(--text-primary)]'}`}>
                {replenishment.summary.on_time_pct}%
              </p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Stores Below Safety</p>
              <p className="text-lg font-semibold text-red-600">{replenishment.summary.stores_below_safety_stock}</p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Urgent Pending</p>
              <p className="text-lg font-semibold text-amber-600">{formatCrOrUsdMAuto(replenishment.summary.urgent_pending_cr)}</p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Avg Lead Time</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">{replenishment.summary.avg_lead_time_days}d</p>
              <p className="text-xs text-[var(--text-tertiary)]">(target: {replenishment.summary.lead_time_target_days}d)</p>
            </div>
          </div>

          {/* Chart Grid */}
          <div className="grid grid-cols-2 gap-6">

            {/* LEFT — Safety Stock Coverage by ABC Class */}
            <div className="card">
              <div className="flex items-start justify-between">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Safety Stock Coverage by ABC Class</h4>
                <AIInsightButton id="inventory-deep-safety-stock-abc" title="Safety Stock Coverage by ABC Class" data={replenishment.safety_stock_by_abc as unknown as Record<string, unknown>[]} />
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-3">Actual coverage vs target · gap SKUs shown above bars</p>
              <div style={{ height: 240 }}>
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={replenishment.safety_stock_by_abc}
                      margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                      <XAxis
                        dataKey="abc_class"
                        tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={v => `${v}%`}
                        tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 110]}
                      />
                      <Tooltip formatter={(v: unknown) => [`${v as number}%`]} contentStyle={{ fontSize: '11px' }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="coverage_pct" name="Coverage %" label={{
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        content: (props: any) => {
                          const { x, y, width, index } = props;
                          const d = replenishment.safety_stock_by_abc[index];
                          if (!d || d.gap_skus <= 0) return null;
                          return (
                            <text x={x + width / 2} y={y - 5} textAnchor="middle" fontSize={9} fill="#6B7280">
                              {d.gap_skus} SKUs gap
                            </text>
                          );
                        }
                      }}>
                        {replenishment.safety_stock_by_abc.map((d, idx) => (
                          <Cell
                            key={idx}
                            fill={d.abc_class === 'A' ? '#DC2626' : d.abc_class === 'B' ? '#F59E0B' : '#10B981'}
                          />
                        ))}
                      </Bar>
                      <Bar dataKey="target_pct" name="Target" fill="#E5E7EB" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* RIGHT — Replenishment Cycle Funnel */}
            <div className="card">
              <div className="flex items-start justify-between">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Replenishment Cycle Funnel</h4>
                <AIInsightButton id="inventory-deep-replenishment-funnel" title="Replenishment Cycle Funnel" data={funnelStages as unknown as Record<string, unknown>[]} />
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-3">Orders progressing through replenishment stages</p>
              <div className="space-y-3 max-h-[280px] overflow-y-auto">
                {funnelStages.map((stage, idx) => {
                  const widthPct = Math.round((stage.count / maxFunnelCount) * 100);
                  const barColor = stage.on_schedule_pct > 90
                    ? 'bg-green-500'
                    : stage.on_schedule_pct > 70
                    ? 'bg-amber-500'
                    : 'bg-red-500';
                  const prevCount = idx > 0 ? funnelStages[idx - 1].count : null;
                  const dropOff = prevCount !== null && prevCount > 0
                    ? Math.round(((prevCount - stage.count) / prevCount) * 100)
                    : null;
                  return (
                    <div key={stage.stage}>
                      {dropOff !== null && dropOff > 0 && (
                        <p className="text-[10px] text-gray-400 text-center mb-1">↓ {dropOff}% drop-off</p>
                      )}
                      <div style={{ width: `${widthPct}%`, minWidth: '60%', margin: '0 auto' }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-[var(--text-primary)]">{stage.stage}</span>
                          <span className="text-lg font-bold text-[var(--text-primary)]">{stage.count}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded">
                          <div
                            className={`h-full rounded ${barColor}`}
                            style={{ width: `${stage.on_schedule_pct}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">{stage.on_schedule_pct}% on schedule</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Store Replenishment Health Grid */}
          <div>
            <div className="flex items-start justify-between">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Store Replenishment Health</h4>
              <AIInsightButton id="inventory-deep-store-replenishment-health" title="Store Replenishment Health" data={replenishment.store_health_scores as unknown as Record<string, unknown>[]} />
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-3">Top 16 stores by health score</p>
            <div className="grid grid-cols-4 gap-3">
              {replenishment.store_health_scores.slice(0, 16).map(store => (
                <div
                  key={store.store_id}
                  className={`card px-3 py-3 border ${scoreBorder(store.health_score)}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${scoreBg(store.health_score)}`}>
                      {store.health_score}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{store.store_name}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)]">{store.city}</p>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-[var(--text-secondary)]">
                      <span className="text-red-600 font-medium">{store.skus_below_safety}</span> SKUs below safety
                    </p>
                    <p className="text-[10px] text-[var(--text-secondary)]">
                      <span className="text-amber-600 font-medium">{formatCrOrUsdMAuto(store.urgent_pending_cr)}</span> urgent pending
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Insight>
            A-class SKUs have only 71.2% safety stock coverage against 95% target — 84 SKUs at immediate stockout risk.
          </Insight>
        </section>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECTION 3.5 — SAFETY STOCK OPTIMISATION                          */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {safetyStockIntel && (
          <section className="space-y-5">
            <SectionHeader n={3.5} title="Safety Stock Optimisation" subtitle="Z-score model: right buffer by ABC class and category" />

            {/* KPI strip */}
            <div className="grid grid-cols-4 gap-3">
              <div className="card py-3 px-4">
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Excess Inventory</p>
                <p className="text-lg font-semibold text-amber-600">{formatCrOrUsdMAuto(safetyStockIntel.working_capital_impact.current_excess_inventory_cr)}</p>
                <p className="text-xs text-[var(--text-secondary)]">above optimal buffer</p>
              </div>
              <div className="card py-3 px-4">
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Optimisation Savings</p>
                <p className="text-lg font-semibold text-green-600">{formatCrOrUsdMAuto(safetyStockIntel.working_capital_impact.if_optimised_savings_cr)}</p>
                <p className="text-xs text-[var(--text-secondary)]">working capital release</p>
              </div>
              <div className="card py-3 px-4">
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Gap-Fill Cost</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">{formatCrOrUsdMAuto(safetyStockIntel.working_capital_impact.if_gaps_filled_cost_cr)}</p>
                <p className="text-xs text-[var(--text-secondary)]">to cover under-stocked SKUs</p>
              </div>
              <div className="card py-3 px-4">
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Net Benefit</p>
                <p className="text-lg font-semibold text-green-600">{formatCrOrUsdMAuto(safetyStockIntel.working_capital_impact.net_optimisation_benefit_cr)}</p>
                <p className="text-xs text-[var(--text-secondary)]">net optimisation gain</p>
              </div>
            </div>

            {/* ABC class table */}
            <div className="card overflow-hidden">
              <div className="px-4 pt-4 pb-2 border-b border-[var(--border-subtle)]">
                <p className="text-sm font-medium text-[var(--text-primary)]">Safety Stock by ABC Class</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Formula: Z × σ_demand × √lead_time</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[var(--bg-secondary)]">
                      <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">Class</th>
                      <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)]">SKUs</th>
                      <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)]">Current (days)</th>
                      <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)]">Target (days)</th>
                      <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)]">Gap (days)</th>
                      <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)]">Current SL%</th>
                      <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)]">Target SL%</th>
                      <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">Formula</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {safetyStockIntel.by_abc_class.map(row => (
                      <tr key={row.abc_class} className="hover:bg-[var(--bg-secondary)]">
                        <td className="px-4 py-2.5">
                          <span className={`inline-block w-6 h-6 rounded-full text-center text-xs font-bold leading-6 ${
                            row.abc_class === 'A' ? 'bg-red-100 text-red-700' :
                            row.abc_class === 'B' ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                          }`}>{row.abc_class}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{row.sku_count}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-[var(--text-primary)]">{row.current_safety_stock_days}d</td>
                        <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{row.recommended_safety_stock_days}d</td>
                        <td className={`px-4 py-2.5 text-right font-medium ${row.gap_days > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {row.gap_days > 0 ? '+' : ''}{row.gap_days}d
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`font-medium ${row.current_service_level < row.recommended_service_level ? 'text-red-600' : 'text-green-600'}`}>
                            {row.current_service_level}%
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{row.recommended_service_level}%</td>
                        <td className="px-4 py-2.5 text-[var(--text-tertiary)] font-mono text-[10px]">{row.formula_detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Category gap chart */}
            <div className="card px-4 pt-4 pb-2">
              <p className="text-sm font-medium text-[var(--text-primary)] mb-4">Safety Stock Gap by Category (days)</p>
              {isMounted && (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={safetyStockIntel.by_category} layout="vertical" margin={{ left: 120, right: 40, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-subtle)" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis dataKey="category" type="category" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={115} />
                    <Tooltip
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: any, name: any) => [`${v}d`, name]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar dataKey="current_safety_stock_days" name="Current" fill="#94A3B8" radius={[0, 2, 2, 0]} />
                    <Bar dataKey="recommended_safety_stock_days" name="Recommended" fill="#6366F1" radius={[0, 2, 2, 0]} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <Insight>
              Personal Care has the largest gap (+3.1 days) driven by HUL&apos;s 4.8-day avg supplier delay. Apparel is significantly over-buffered at 18.4 days vs 8.8-day recommendation — 9.6 days of excess stock that can be released.
            </Insight>
          </section>
        )}

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECTION 4 — INBOUND PIPELINE                                     */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section className="space-y-5">
          <SectionHeader n={4} title="Inbound Pipeline" subtitle="Next 14 days: shipments, delays, and receiving capacity" />

          {/* KPI Strip */}
          <div className="grid grid-cols-4 gap-3">
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">In Transit</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">{inbound.summary.in_transit.count} shipments</p>
              <p className="text-xs text-[var(--text-secondary)]">{formatCrOrUsdMAuto(inbound.summary.in_transit.value_cr)}</p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Delayed</p>
              <p className="text-lg font-semibold text-red-600">{inbound.summary.delayed.count}</p>
              <p className="text-xs text-red-500">avg {inbound.summary.delayed.avg_delay_days}d late</p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Due This Week</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">{inbound.summary.due_this_week.count}</p>
              <p className="text-xs text-[var(--text-secondary)]">{formatCrOrUsdMAuto(inbound.summary.due_this_week.value_cr)}</p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">On-Time Probability</p>
              <p className={`text-lg font-semibold ${inbound.summary.on_time_probability_pct < 70 ? 'text-red-600' : 'text-[var(--text-primary)]'}`}>
                {inbound.summary.on_time_probability_pct}%
              </p>
            </div>
          </div>

          {/* Gantt-style shipment timeline */}
          <div className="card">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Shipment Timeline — Next 14 Days</h4>
            <p className="text-xs text-[var(--text-secondary)] mb-3">First 14 shipments · orange dot = resolves active stockout</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ minWidth: 860 }}>
                <thead>
                  <tr className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
                    {['Shipment ID', 'Supplier', 'Category', 'Store', 'Due Date', 'Value', 'Status', 'Resolves Stockout'].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-semibold text-[var(--text-secondary)] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inbound.gantt_14d.slice(0, 14).map(ship => (
                    <tr
                      key={ship.shipment_id}
                      className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      <td className="py-2 px-3 font-mono text-[var(--text-tertiary)]">{ship.shipment_id}</td>
                      <td className="py-2 px-3 font-medium text-[var(--text-primary)]">{ship.supplier}</td>
                      <td className="py-2 px-3 text-[var(--text-secondary)]">{ship.category}</td>
                      <td className="py-2 px-3 text-[var(--text-secondary)]">{ship.store_name}</td>
                      <td className="py-2 px-3 text-[var(--text-secondary)]">{ship.expected_date}</td>
                      <td className="py-2 px-3 text-[var(--text-secondary)]">{formatCrOrUsdMAuto(ship.value_cr)}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${ganttColor(ship.status)} ${ganttTextColor(ship.status)}`}>
                          {ship.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {ship.resolves_stockout ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                            <span className="text-orange-600 font-medium">Yes</span>
                          </div>
                        ) : (
                          <span className="text-[var(--text-tertiary)]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Chart Grid */}
          <div className="grid grid-cols-2 gap-6">

            {/* LEFT — Delayed Shipment Impact */}
            <div className="card overflow-x-auto">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Delayed Shipment Impact</h4>
              <p className="text-xs text-[var(--text-secondary)] mb-3">Active delays and their downstream effects</p>
              <table className="w-full text-xs" style={{ minWidth: 620 }}>
                <thead>
                  <tr className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
                    {['Supplier', 'Category', 'Was Due', 'New ETA', 'Delay', 'SKUs', 'Stores', 'Rev Risk', 'Action'].map(h => (
                      <th key={h} className="text-left py-2 px-2 font-semibold text-[var(--text-secondary)] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inbound.delayed_impact.map(row => (
                    <tr
                      key={row.shipment_id}
                      className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      <td className="py-2 px-2 font-medium text-[var(--text-primary)]">{row.supplier}</td>
                      <td className="py-2 px-2 text-[var(--text-secondary)]">{row.category}</td>
                      <td className="py-2 px-2 text-[var(--text-secondary)]">{row.original_eta}</td>
                      <td className="py-2 px-2 text-[var(--text-secondary)]">{row.new_eta}</td>
                      <td className="py-2 px-2 text-red-600 font-medium">{row.delay_days}d</td>
                      <td className="py-2 px-2 text-[var(--text-secondary)]">{row.skus_affected}</td>
                      <td className="py-2 px-2 text-[var(--text-secondary)]">{row.stores_affected}</td>
                      <td className="py-2 px-2 text-red-600 font-semibold">{formatCrOrUsdMAuto(row.rev_at_risk_cr)}</td>
                      <td className="py-2 px-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                          {row.action_required}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* RIGHT — Receiving Capacity */}
            <div className="card">
              <div className="flex items-start justify-between">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Receiving Capacity</h4>
                <AIInsightButton id="inventory-deep-receiving-capacity" title="Receiving Capacity" data={inbound.receiving_capacity as unknown as Record<string, unknown>[]} />
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-3">Inbound volume vs max capacity · red zone = over capacity</p>
              <div style={{ height: 200 }}>
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={inbound.receiving_capacity} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={shortDate}
                        tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip contentStyle={{ fontSize: '11px' }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      {inbound.receiving_capacity.filter(d => d.over_capacity).map(d => (
                        <ReferenceArea key={d.date} x1={d.date} x2={d.date} fill="#FEE2E2" fillOpacity={0.5} />
                      ))}
                      <Bar dataKey="inbound_pallets" name="Inbound Volume" fill="#BFDBFE" />
                      <Line
                        type="monotone"
                        dataKey="capacity_pallets"
                        name="Max Capacity"
                        stroke="#DC2626"
                        strokeWidth={2}
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Reliability by Origin City */}
          <div className="card">
            <div className="flex items-start justify-between">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Reliability by Origin City</h4>
              <AIInsightButton id="inventory-deep-reliability-by-origin" title="Reliability by Origin City" data={reliabilitySorted as unknown as Record<string, unknown>[]} />
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-3">On-time % sorted ascending · red = high risk origin</p>
            <div style={{ height: 220 }}>
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={reliabilitySorted}
                    margin={{ top: 5, right: 40, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={v => `${v}%`}
                      tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                      tickLine={false}
                      domain={[0, 100]}
                    />
                    <YAxis
                      type="category"
                      dataKey="city"
                      width={100}
                      tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CityTooltip />} />
                    <Bar dataKey="on_time_pct" name="On-Time %">
                      {reliabilitySorted.map((d, idx) => (
                        <Cell
                          key={idx}
                          fill={d.on_time_pct < 70 ? '#DC2626' : d.on_time_pct < 80 ? '#F59E0B' : '#10B981'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <Insight>
            Delhi NCR has lowest reliability at 63.8% on-time with avg 3.9d delays. 4 shipments currently delayed representing {formatCrOrUsdMAuto(1.98)} in revenue at risk.
          </Insight>
        </section>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECTION 5 — REORDER POINT & EOQ INTELLIGENCE                     */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {reorderIntel && (
          <section className="space-y-5">
            <SectionHeader n={5} title="Reorder Point & EOQ Intelligence" subtitle="Optimal order timing and quantities using demand and cost data" />

            {/* KPI strip */}
            <div className="grid grid-cols-4 gap-3">
              <div className="card py-3 px-4">
                <p className="text-xs text-[var(--text-tertiary)] mb-1">SKUs Below ROP</p>
                <p className="text-lg font-semibold text-red-600">{reorderIntel.summary.skus_below_reorder_point}</p>
                <p className="text-xs text-[var(--text-secondary)]">need immediate order</p>
              </div>
              <div className="card py-3 px-4">
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Wrong Order Qty</p>
                <p className="text-lg font-semibold text-amber-600">{reorderIntel.summary.skus_with_wrong_order_qty}</p>
                <p className="text-xs text-[var(--text-secondary)]">not using EOQ</p>
              </div>
              <div className="card py-3 px-4">
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Stockout Risk SKUs</p>
                <p className="text-lg font-semibold text-red-600">{reorderIntel.summary.stockout_risk_skus}</p>
                <p className="text-xs text-[var(--text-secondary)]">within lead time window</p>
              </div>
              <div className="card py-3 px-4">
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Potential Savings</p>
                <p className="text-lg font-semibold text-green-600">{formatCrOrUsdMAuto(reorderIntel.summary.potential_savings_cr)}</p>
                <p className="text-xs text-[var(--text-secondary)]">from EOQ adoption</p>
              </div>
            </div>

            {/* Formula boxes */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card px-4 py-3 bg-indigo-50 border-indigo-100">
                <p className="text-xs font-semibold text-indigo-700 mb-1">EOQ Formula</p>
                <p className="text-sm font-mono text-indigo-900">EOQ = √(2DS / H)</p>
                <div className="mt-2 space-y-0.5 text-xs text-indigo-600">
                  <p>D = Annual demand (units)</p>
                  <p>S = {formatMoneyPlainAuto(850)} per order (setup cost)</p>
                  <p>H = 18% holding cost rate</p>
                </div>
              </div>
              <div className="card px-4 py-3 bg-violet-50 border-violet-100">
                <p className="text-xs font-semibold text-violet-700 mb-1">Reorder Point Formula</p>
                <p className="text-sm font-mono text-violet-900">ROP = (D_avg × LT) + SS</p>
                <div className="mt-2 space-y-0.5 text-xs text-violet-600">
                  <p>D_avg = Average daily demand</p>
                  <p>LT = Supplier lead time (days)</p>
                  <p>SS = Z × σ_demand × √LT</p>
                </div>
              </div>
            </div>

            {/* SKU-level table */}
            <div className="card overflow-hidden">
              <div className="px-4 pt-4 pb-2 border-b border-[var(--border-subtle)]">
                <p className="text-sm font-medium text-[var(--text-primary)]">SKU-Level Reorder Intelligence</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Priority SKUs needing immediate ROP or EOQ correction</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[var(--bg-secondary)]">
                      <th className="text-left px-3 py-2.5 font-medium text-[var(--text-secondary)]">SKU</th>
                      <th className="text-left px-3 py-2.5 font-medium text-[var(--text-secondary)]">Category</th>
                      <th className="text-center px-3 py-2.5 font-medium text-[var(--text-secondary)]">ABC</th>
                      <th className="text-right px-3 py-2.5 font-medium text-[var(--text-secondary)]">Stock</th>
                      <th className="text-right px-3 py-2.5 font-medium text-[var(--text-secondary)]">Current ROP</th>
                      <th className="text-right px-3 py-2.5 font-medium text-[var(--text-secondary)]">Rec ROP</th>
                      <th className="text-right px-3 py-2.5 font-medium text-[var(--text-secondary)]">Current Qty</th>
                      <th className="text-right px-3 py-2.5 font-medium text-[var(--text-secondary)]">EOQ</th>
                      <th className="text-right px-3 py-2.5 font-medium text-[var(--text-secondary)]">Savings</th>
                      <th className="text-center px-3 py-2.5 font-medium text-[var(--text-secondary)]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {reorderIntel.by_category.flatMap(cat =>
                      cat.sample_skus.map(sku => (
                        <tr key={sku.product_id} className="hover:bg-[var(--bg-secondary)]">
                          <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{sku.product_name}</td>
                          <td className="px-3 py-2 text-[var(--text-secondary)]">{cat.category}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-block w-5 h-5 rounded-full text-center text-[10px] font-bold leading-5 ${
                              sku.abc_class === 'A' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                            }`}>{sku.abc_class}</span>
                          </td>
                          <td className={`px-3 py-2 text-right font-medium ${sku.current_stock === 0 ? 'text-red-600' : sku.current_stock < sku.recommended_reorder_point ? 'text-amber-600' : 'text-[var(--text-primary)]'}`}>
                            {sku.current_stock}
                          </td>
                          <td className="px-3 py-2 text-right text-[var(--text-secondary)]">{sku.current_reorder_point}</td>
                          <td className="px-3 py-2 text-right font-medium text-[var(--text-primary)]">{sku.recommended_reorder_point}</td>
                          <td className="px-3 py-2 text-right text-[var(--text-secondary)]">{sku.current_order_qty}</td>
                          <td className="px-3 py-2 text-right font-medium text-indigo-600">{sku.eoq}</td>
                          <td className="px-3 py-2 text-right text-green-600 font-medium">{formatCrOrUsdMAuto(sku.savings_cr)}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              sku.status === 'stockout' ? 'bg-red-50 text-red-700' :
                              sku.status === 'below_reorder' ? 'bg-amber-50 text-amber-700' :
                              sku.status === 'at_risk' ? 'bg-orange-50 text-orange-700' :
                              'bg-green-50 text-green-700'
                            }`}>{sku.status.replace('_', ' ')}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <Insight>
              147 SKUs are below their reorder point right now. Dove Body Wash is in stockout with ROP set at 100 vs recommended 282 — Personal Care&apos;s 4.8-day lead time demands a much larger buffer. Switching all mis-sized orders to EOQ would save {formatCrOrUsdMAuto(12.4)} annually.
            </Insight>
          </section>
        )}

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECTION 6 — MULTI-ECHELON INVENTORY FLOW                         */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {echelon && (
          <section className="space-y-5">
            <SectionHeader n={6} title="Multi-Echelon Inventory Flow" subtitle="DC → Region → Store: network efficiency and rebalancing opportunities" />

            {/* Network KPI strip */}
            <div className="grid grid-cols-5 gap-3">
              <div className="card py-3 px-4">
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Total Network</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">{formatCrOrUsdMAuto(echelon.network_summary.total_inventory_cr)}</p>
                <p className="text-xs text-[var(--text-secondary)]">across all echelons</p>
              </div>
              <div className="card py-3 px-4">
                <p className="text-xs text-[var(--text-tertiary)] mb-1">At DCs</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">{formatCrOrUsdMAuto(echelon.network_summary.dc_inventory_cr)}</p>
                <p className="text-xs text-[var(--text-secondary)]">{Math.round(echelon.network_summary.dc_inventory_cr / echelon.network_summary.total_inventory_cr * 100)}% of total</p>
              </div>
              <div className="card py-3 px-4">
                <p className="text-xs text-[var(--text-tertiary)] mb-1">At Regions</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">{formatCrOrUsdMAuto(echelon.network_summary.regional_inventory_cr)}</p>
                <p className="text-xs text-[var(--text-secondary)]">{Math.round(echelon.network_summary.regional_inventory_cr / echelon.network_summary.total_inventory_cr * 100)}% of total</p>
              </div>
              <div className="card py-3 px-4">
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Network Efficiency</p>
                <p className="text-lg font-semibold text-amber-600">{echelon.network_summary.network_efficiency_pct}%</p>
                <p className="text-xs text-[var(--text-secondary)]">target: 85%</p>
              </div>
              <div className="card py-3 px-4">
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Imbalance Value</p>
                <p className="text-lg font-semibold text-red-600">{formatCrOrUsdMAuto(echelon.network_summary.imbalance_opportunity_cr)}</p>
                <p className="text-xs text-[var(--text-secondary)]">rebalancing opportunity</p>
              </div>
            </div>

            {/* DC status cards */}
            <div className="grid grid-cols-2 gap-4">
              {echelon.distribution_centres.map(dc => (
                <div key={dc.dc_id} className="card px-4 py-3">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{dc.name}</p>
                      <p className="text-xs text-[var(--text-secondary)]">Serves: {dc.serves_regions.join(', ')}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      dc.status === 'near_capacity' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                    }`}>{dc.status.replace('_', ' ')}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--text-secondary)]">Capacity utilisation</span>
                      <span className={`font-medium ${dc.capacity_utilisation_pct >= 90 ? 'text-red-600' : dc.capacity_utilisation_pct >= 80 ? 'text-amber-600' : 'text-green-600'}`}>
                        {dc.capacity_utilisation_pct}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${dc.capacity_utilisation_pct >= 90 ? 'bg-red-500' : dc.capacity_utilisation_pct >= 80 ? 'bg-amber-400' : 'bg-green-500'}`}
                        style={{ width: `${dc.capacity_utilisation_pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-[var(--text-secondary)]">Inventory value</span>
                      <span className="font-medium text-[var(--text-primary)]">{formatCrOrUsdMAuto(dc.inventory_cr)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--text-secondary)]">Avg replenishment</span>
                      <span className="font-medium text-[var(--text-primary)]">{dc.avg_replenishment_days}d</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Region table */}
            <div className="card overflow-hidden">
              <div className="px-4 pt-4 pb-2 border-b border-[var(--border-subtle)]">
                <p className="text-sm font-medium text-[var(--text-primary)]">Regional Inventory Distribution</p>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[var(--bg-secondary)]">
                    <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">Region</th>
                    <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)]">Stores</th>
                    <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)]">Regional ($)</th>
                    <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)]">Store ($)</th>
                    <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)]">In Transit ($)</th>
                    <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)]">Avg DOS</th>
                    <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)]">Imbalance ($)</th>
                    <th className="text-center px-4 py-2.5 font-medium text-[var(--text-secondary)]">Health</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {echelon.regions.map(r => (
                    <tr key={r.region} className="hover:bg-[var(--bg-secondary)]">
                      <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">{r.region}</td>
                      <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{r.stores}</td>
                      <td className="px-4 py-2.5 text-right text-[var(--text-primary)]">{formatCrOrUsdMAuto(r.regional_inventory_cr)}</td>
                      <td className="px-4 py-2.5 text-right text-[var(--text-primary)]">{formatCrOrUsdMAuto(r.store_inventory_cr)}</td>
                      <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{formatCrOrUsdMAuto(r.in_transit_cr)}</td>
                      <td className="px-4 py-2.5 text-right text-[var(--text-primary)]">{r.avg_dos}d</td>
                      <td className={`px-4 py-2.5 text-right font-medium ${r.imbalance_cr > 30 ? 'text-red-600' : r.imbalance_cr > 15 ? 'text-amber-600' : 'text-green-600'}`}>
                        {formatCrOrUsdMAuto(r.imbalance_cr)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          r.health === 'at_risk' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                        }`}>{r.health.replace('_', ' ')}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Rebalancing opportunities */}
            {echelon.rebalancing_opportunities.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-4 pt-4 pb-2 border-b border-[var(--border-subtle)]">
                  <p className="text-sm font-medium text-[var(--text-primary)]">Rebalancing Opportunities</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">Lateral transfers to reduce regional imbalance</p>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[var(--bg-secondary)]">
                      <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">From</th>
                      <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">To</th>
                      <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">Category</th>
                      <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)]">Value ($)</th>
                      <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)]">Units</th>
                      <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">Benefit</th>
                      <th className="text-center px-4 py-2.5 font-medium text-[var(--text-secondary)]">Urgency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {echelon.rebalancing_opportunities.map((op, i) => (
                      <tr key={i} className="hover:bg-[var(--bg-secondary)]">
                        <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">{op.from_region}</td>
                        <td className="px-4 py-2.5 text-[var(--text-secondary)]">{op.to_region}</td>
                        <td className="px-4 py-2.5 text-[var(--text-secondary)]">{op.category}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-[var(--text-primary)]">{formatCrOrUsdMAuto(op.transfer_value_cr)}</td>
                        <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{op.units.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-[var(--text-secondary)]">{op.benefit}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            op.urgency === 'high' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                          }`}>{op.urgency}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Insight>
              Delhi DC is at 94% capacity — near-full. North Region carries {formatCrOrUsdMAuto(42)} in imbalance vs West ({formatCrOrUsdMAuto(18)}). Transferring 2,800 units of Personal Care from West to North ({formatCrOrUsdMAuto(8.4)}) would reduce North&apos;s stockout risk by 3 days while Delhi DC replenishment arrives.
            </Insight>
          </section>
        )}

        <div className="h-10" />
      </div>
    </div>
  );
}
