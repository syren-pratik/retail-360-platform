'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useInventory } from '@/app/context/InventoryContext';
import InventoryFilterBar from './InventoryFilterBar';
import SupplyKPIStrip from './SupplyKPIStrip';
import CategoryHealthGrid from './CategoryHealthGrid';
import OverstockAnalysis from './OverstockAnalysis';
import ReplenishmentHealth from './ReplenishmentHealth';
import InboundPipeline from './InboundPipeline';
import SupplierOTIF from './SupplierOTIF';

// ── Types matching cache schemas ─────────────────────────────────────────────

export interface SupplyKPIMetric {
  value: number;
  prior: number;
  unit: string;
  label: string;
  sparkline: number[];
  // revenue_at_risk extras
  stores_affected?: number;
  skus_affected?: number;
  // inventory_value extras
  overstock_value?: number;
  aging_45plus?: number;
  // osa extras
  target?: number;
  daily_impact_cr?: number;
  // avg_dos extras
  target_min?: number;
  target_max?: number;
  below_7_days_pct?: number;
  // stockout_count extras
  rev_impact_today?: number;
  // supplier_otif extras
  suppliers_below_threshold?: number;
  delayed_pos?: number;
}

export interface SupplyKPIs {
  revenue_at_risk: SupplyKPIMetric;
  inventory_value: SupplyKPIMetric;
  osa: SupplyKPIMetric;
  avg_dos: SupplyKPIMetric;
  stockout_count: SupplyKPIMetric;
  supplier_otif: SupplyKPIMetric;
}

export interface StoreRisk {
  store_id: string;
  store_name: string;
  city: string;
  rev_at_risk_cr: number;
  daily_revenue_cr: number;
  pct_daily_rev: number;
  stockout_skus: number;
  avg_duration_days: number;
  status: 'critical' | 'at_risk' | 'healthy';
}

export interface CategoryRisk {
  category: string;
  rev_at_risk_cr: number;
  days_running: number;
  stores_affected: number;
  stockout_skus: number;
}

export interface TrendPoint {
  date: string;
  rev_at_risk_cr: number;
}

export interface WeeklyLostRecovered {
  week: string;
  lost_cr: number;
  recovered_cr: number;
  recovery_rate_pct: number;
}

export interface RevenueAtRiskData {
  by_store: StoreRisk[];
  by_category: CategoryRisk[];
  trend_60d: TrendPoint[];
  weekly_lost_vs_recovered: WeeklyLostRecovered[];
}

export interface CategoryHealthItem {
  name: string;
  status: 'critical' | 'at_risk' | 'healthy' | 'overstock';
  rev_at_risk_cr: number;
  osa_pct: number;
  avg_dos: number;
  stockout_skus: number;
  overstock_value_cr: number;
  turn_rate: number;
}

export interface StoreCategoryCell {
  store_id: string;
  store_name: string;
  city: string;
  category: string;
  status: string;
  osa_pct: number;
  dos: number;
  stockout_skus: number;
}

export interface HealthTrendPoint {
  month: string;
  critical_pct: number;
  at_risk_pct: number;
  healthy_pct: number;
  overstock_pct: number;
}

export interface CategoryHealthData {
  summary: {
    critical: number;
    at_risk: number;
    healthy: number;
    overstock: number;
    total_rev_at_risk_cr: number;
  };
  categories: CategoryHealthItem[];
  store_category_matrix: StoreCategoryCell[];
  health_trend_12m: HealthTrendPoint[];
}

export interface SupplierRecord {
  supplier_id: string;
  name: string;
  category: string;
  otif_pct: number;
  avg_delay_days: number;
  fill_rate_pct: number;
  order_value_cr: number;
  stockouts_caused: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface DelayReason {
  supplier_id: string;
  name: string;
  manufacturing_pct: number;
  logistics_pct: number;
  quality_pct: number;
  documentation_pct: number;
  no_reason_pct: number;
}

export interface OTIFMonthPoint {
  month: string;
  otif_pct: number;
  stockout_count: number;
}

export interface SupplierOTIFData {
  suppliers: SupplierRecord[];
  delay_reasons: DelayReason[];
  monthly_otif_vs_stockouts: OTIFMonthPoint[];
}

export interface ForecastKPIs {
  mape_pct: number;
  mape_prior: number;
  bias_pct: number;
  bias_direction: string;
  lost_sales_from_miss_cr: number;
  lost_sales_prior_cr: number;
  forecast_coverage_pct: number;
  model_health: string;
}

export interface ForecastVsActualPoint {
  date: string;
  forecast: number;
  actual: number | null;
  upper_bound: number;
  lower_bound: number;
}

export interface DeptAccuracy {
  department: string;
  mape: number;
  accuracy_pct: number;
  bias_pct: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface AccuracyWeekPoint {
  week: string;
  accuracy_pct: number;
  mape: number;
  bias_pct: number;
}

export interface ModelRecord {
  model: string;
  accuracy: number;
  mape: number;
  rmse: number;
  mae: number;
  status: string;
  last_trained: string;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  direction: string;
}

export interface DecompPoint {
  date: string;
  baseline: number;
  trend: number;
  seasonal: number;
  promo_lift: number;
  total: number;
}

export interface ForecastData {
  kpis: ForecastKPIs;
  forecast_vs_actual: ForecastVsActualPoint[];
  accuracy_by_dept: DeptAccuracy[];
  accuracy_trend_12w: AccuracyWeekPoint[];
  model_comparison: ModelRecord[];
  feature_importance: FeatureImportance[];
  demand_decomposition: DecompPoint[];
}

export interface StoreHealthScore {
  store_id: string;
  store_name: string;
  city: string;
  health_score: number;
  skus_below_safety: number;
  urgent_pending_cr: number;
  status: 'critical' | 'at_risk' | 'healthy';
}

export interface LeadTimeRecord {
  supplier: string;
  category: string;
  avg_lead_days: number;
  committed_days: number;
  status: 'on_time' | 'over' | 'critical';
}

export interface SafetyStockABC {
  abc_class: string;
  coverage_pct: number;
  target_pct: number;
  gap_skus: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
  on_schedule_pct: number;
}

export interface ReplenishmentData {
  summary: {
    on_time_pct: number;
    stores_below_safety_stock: number;
    urgent_pending_cr: number;
    avg_lead_time_days: number;
    lead_time_target_days: number;
  };
  store_health_scores: StoreHealthScore[];
  lead_time_by_supplier_category: LeadTimeRecord[];
  safety_stock_by_abc: SafetyStockABC[];
  replenishment_funnel: FunnelStage[];
}

export interface InboundShipment {
  shipment_id: string;
  supplier: string;
  category: string;
  store_name: string;
  city: string;
  expected_date: string;
  value_cr: number;
  status: 'on_track' | 'at_risk' | 'delayed' | 'scheduled';
  skus_count: number;
  resolves_stockout: boolean;
}

export interface DelayedImpact {
  shipment_id: string;
  supplier: string;
  category: string;
  original_eta: string;
  new_eta: string;
  delay_days: number;
  skus_affected: number;
  stores_affected: number;
  rev_at_risk_cr: number;
  action_required: string;
}

export interface CapacityPoint {
  date: string;
  inbound_pallets: number;
  capacity_pallets: number;
  utilization_pct: number;
  over_capacity: boolean;
}

export interface CityReliability {
  city: string;
  on_time_pct: number;
  avg_delay_days: number;
  shipment_count: number;
}

export interface InboundData {
  summary: {
    in_transit: { count: number; value_cr: number };
    delayed: { count: number; value_cr: number; avg_delay_days: number };
    due_this_week: { count: number; value_cr: number };
    on_time_probability_pct: number;
  };
  gantt_14d: InboundShipment[];
  delayed_impact: DelayedImpact[];
  receiving_capacity: CapacityPoint[];
  reliability_by_city: CityReliability[];
}

export interface OverstockCategory {
  category: string;
  slow_moving_cr: number;
  dead_stock_cr: number;
  total_cr: number;
  markdown_risk_skus: number;
}

export interface WaterfallStage {
  stage: string;
  value_cr: number;
  type: 'total' | 'positive' | 'negative' | 'result';
}

export interface OverstockTrendPoint {
  month: string;
  overstock_cr: number;
  purchase_volume_cr: number;
}

export interface MarkdownRecommendation {
  category: string;
  overstock_cr: number;
  days_in_overstock_avg: number;
  recommended_markdown_pct: number;
  recommended_timing: string;
  timing_reason: string;
  expected_sell_through_pct: number;
  revenue_recovery_cr: number;
  margin_impact_cr: number;
  net_benefit_vs_writeoff_cr: number;
  urgency: 'critical' | 'high' | 'medium' | 'low' | 'none';
}

export interface OverstockData {
  summary: {
    overstock_value_cr: number;
    dead_stock_value_cr: number;
    markdown_risk_skus: number;
    trend: string;
  };
  by_category: OverstockCategory[];
  markdown_waterfall: WaterfallStage[];
  trend_vs_purchasing: OverstockTrendPoint[];
  markdown_recommendations?: MarkdownRecommendation[];
}

// ── Component ────────────────────────────────────────────────────────────────

export default function InventoryDashboardContent() {
  const { filters, resetFilters } = useInventory();

  const [kpis, setKpis] = useState<SupplyKPIs | null>(null);
  const [revenueAtRisk, setRevenueAtRisk] = useState<RevenueAtRiskData | null>(null);
  const [categoryHealth, setCategoryHealth] = useState<CategoryHealthData | null>(null);
  const [supplierOTIF, setSupplierOTIF] = useState<SupplierOTIFData | null>(null);
  const [replenishment, setReplenishment] = useState<ReplenishmentData | null>(null);
  const [inbound, setInbound] = useState<InboundData | null>(null);
  const [overstock, setOverstock] = useState<OverstockData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const [r1, r2, r3, r4, r5, r6, r7] = await Promise.all([
          fetch('/api/supply/kpis'),
          fetch('/api/supply/revenue-at-risk'),
          fetch('/api/supply/category-health'),
          fetch('/api/supply/supplier-otif'),
          fetch('/api/supply/replenishment'),
          fetch('/api/supply/inbound'),
          fetch('/api/supply/overstock'),
        ]);
        const [d1, d2, d3, d4, d5, d6, d7] = await Promise.all([
          r1.json(), r2.json(), r3.json(), r4.json(),
          r5.json(), r6.json(), r7.json(),
        ]);
        setKpis(d1);
        setRevenueAtRisk(d2);
        setCategoryHealth(d3);
        setSupplierOTIF(d4);
        setReplenishment(d5);
        setInbound(d6);
        setOverstock(d7);
      } catch (err) {
        console.error('Supply data fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const trendMonths = useMemo(() => (
    { '30d': 1, '90d': 3, '6m': 6, '12m': 12 }[filters.timePeriod ?? '90d'] ?? 3
  ), [filters.timePeriod]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const filteredRevenueAtRisk = useMemo(() => {
    if (!revenueAtRisk) return null;
    let result = { ...revenueAtRisk };
    if (filters.cities?.length > 0) {
      result = { ...result, by_store: revenueAtRisk.by_store.filter(s => filters.cities.includes(s.city)) };
    }
    if (filters.departments?.length > 0) {
      result = { ...result, by_category: revenueAtRisk.by_category.filter(c => filters.departments.includes(c.category)) };
    }
    return result;
  }, [revenueAtRisk, filters.cities, filters.departments]);

  const filteredCategoryHealth = useMemo(() => {
    if (!categoryHealth) return null;
    let result = { ...categoryHealth };
    if (filters.departments?.length > 0) {
      result = {
        ...result,
        categories: categoryHealth.categories.filter(c =>
          filters.departments.includes(c.name)
        ),
        store_category_matrix: categoryHealth.store_category_matrix.filter(c =>
          filters.departments.includes(c.category)
        ),
      };
    }
    result = {
      ...result,
      health_trend_12m: result.health_trend_12m.slice(-trendMonths),
    };
    return result;
  }, [categoryHealth, filters.departments, trendMonths]);

  const filteredOverstock = useMemo(() => {
    if (!overstock) return null;
    let result = { ...overstock };
    if (filters.departments?.length > 0) {
      result = { ...result, by_category: overstock.by_category.filter(c => filters.departments.includes(c.category)) };
    }
    result = { ...result, trend_vs_purchasing: result.trend_vs_purchasing.slice(-trendMonths) };
    return result;
  }, [overstock, filters.departments, trendMonths]);

  const filteredReplenishment = useMemo(() => {
    if (!replenishment) return null;
    let result = { ...replenishment };
    if (filters.cities?.length > 0) {
      result = {
        ...result,
        store_health_scores: replenishment.store_health_scores.filter(s =>
          filters.cities.includes(s.city)
        ),
      };
    }
    if (filters.abcClass !== 'all') {
      result = {
        ...result,
        safety_stock_by_abc: replenishment.safety_stock_by_abc.filter(s =>
          s.abc_class === filters.abcClass
        ),
      };
    }
    return result;
  }, [replenishment, filters.cities, filters.abcClass]);

  const filteredInbound = useMemo(() => {
    if (!inbound) return null;
    if (!filters.cities?.length) return inbound;
    return {
      ...inbound,
      gantt_14d: inbound.gantt_14d.filter(s =>
        filters.cities.some(c =>
          s.store_name?.toLowerCase().includes(c.toLowerCase())
        )
      ),
      delayed_impact: inbound.delayed_impact,
    };
  }, [inbound, filters.cities]);

  const filteredSupplierOTIF = useMemo(() => {
    if (!supplierOTIF) return null;
    if (!filters.departments?.length) return supplierOTIF;
    return {
      ...supplierOTIF,
      suppliers: supplierOTIF.suppliers.filter(s =>
        filters.departments.includes(s.category)
      ),
    };
  }, [supplierOTIF, filters.departments]);

  const activeFilterCount = [
    filters.departments?.length,
    filters.cities?.length,
    filters.abcClass !== 'all' ? 1 : 0,
  ].filter(Boolean).reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-52" />
        <div className="grid grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded" />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-64 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-64 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
        <div className="h-80 bg-gray-200 rounded" />
        <div className="h-72 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Page header */}
      <div className="px-6 pt-5 pb-1">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Inventory Intelligence</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          Inventory health, demand forecasting, and supply chain performance across all stores
        </p>
      </div>

      {/* Filter bar — no px-6 wrapper; component manages its own full-bleed pills row */}
      <InventoryFilterBar />

      {/* Role context banner */}
      {filters.selectedRole !== 'all' && filters.selectedRole !== 'custom' && (
        <div className="px-6 py-2 flex items-center justify-between bg-indigo-50 border-b border-indigo-100">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
            <span className="text-xs font-medium text-[var(--accent-primary)]">
              {['all','north','west','south','grocery','personal_care','electronics','supply_chain'].includes(filters.selectedRole)
                ? { all:'All India', north:'North — Delhi NCR', west:'West — Mumbai/Pune', south:'South — Blr/Chennai', grocery:'Grocery & Dairy', personal_care:'Personal Care', electronics:'Electronics', supply_chain:'Supply Chain' }[filters.selectedRole]
                : filters.selectedRole} view active
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              — showing {filters.cities?.length ? filters.cities.join(', ') : filters.departments?.join(', ')} only
            </span>
          </div>
          <button
            onClick={resetFilters}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Reset to All India ×
          </button>
        </div>
      )}

      {/* Active filter summary */}
      {activeFilterCount > 0 && (
        <div className="px-6 py-2 text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)] border-b border-[var(--border-default)]">
          Showing filtered view — {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active.
          <button
            onClick={resetFilters}
            className="ml-2 text-[var(--accent-primary)] hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Section 1: KPI Strip */}
      <div className="px-6">
        <SupplyKPIStrip kpis={kpis} />
      </div>

      {/* Section 2: Inventory Health */}
      <div className="px-6 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CategoryHealthGrid data={filteredCategoryHealth} />
          <OverstockAnalysis data={filteredOverstock} />
        </div>
        <div className="flex justify-end">
          <Link
            href="/inventory/deep/stock-health"
            className="group flex items-center gap-1.5 text-xs font-medium text-[var(--accent-primary)] hover:opacity-80 transition-opacity"
          >
            Full analysis
            <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* Section 3: Operations */}
      <div className="px-6 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ReplenishmentHealth data={filteredReplenishment} />
          <InboundPipeline data={filteredInbound} />
        </div>
        <div className="flex justify-end">
          <Link
            href="/inventory/deep/supply-chain"
            className="group flex items-center gap-1.5 text-xs font-medium text-[var(--accent-primary)] hover:opacity-80 transition-opacity"
          >
            Full analysis
            <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* Allocation Intelligence card */}
      <div className="px-6">
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Stock Allocation Intelligence</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              ₹18.4Cr revenue gap from misallocation · 8 stores under-allocated · 4 transfers recommended today
            </p>
          </div>
          <Link
            href="/inventory/deep/allocation"
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--accent-primary)] hover:underline whitespace-nowrap"
          >
            View Allocation Plan
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* Section 4: Supplier Performance */}
      <div className="px-6">
        <SupplierOTIF data={filteredSupplierOTIF} />
      </div>

      {/* Scenario Simulator card */}
      <div className="px-6 pb-6">
        <div className="card p-4 border-l-4 border-l-[var(--accent-primary)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-[var(--text-primary)]">What-If Scenario Simulator</p>
                <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full font-medium">AI-Powered</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Model the impact of supplier delays, demand spikes, store closures, and DC disruptions before they happen
              </p>
            </div>
            <Link
              href="/inventory/deep/scenarios"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[var(--accent-primary)] text-white rounded-md hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              Run a Scenario
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
