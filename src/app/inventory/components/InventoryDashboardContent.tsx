'use client';

import { useState, useEffect, useCallback } from 'react';
import { useInventory } from '@/app/context/InventoryContext';
import InventoryKPICards from './InventoryKPICards';
import InventoryAlerts from './InventoryAlerts';
import InventoryHealthMatrix from './InventoryHealthMatrix';
import DOSDistribution from './DOSDistribution';
import DOSByDepartment from './DOSByDepartment';
import InventoryFilterBar from './InventoryFilterBar';
import StockoutTrend from './StockoutTrend';
import StockoutTopSKUs from './StockoutTopSKUs';
import SafetyStockCoverage from './SafetyStockCoverage';
import UnderStockedTable from './UnderStockedTable';
import ReplenishmentQueue from './ReplenishmentQueue';
import InboundSummary from './InboundSummary';
import InboundTimeline from './InboundTimeline';
import InboundTable from './InboundTable';

interface HealthMatrixPoint {
  product_id: string;
  product_name: string;
  store_id: string;
  store_name: string;
  department: string;
  category: string;
  abc_class: string;
  current_stock: number;
  avg_daily_demand: number;
  days_of_supply: number;
  inventory_value: number;
  status: 'stockout' | 'critical' | 'low' | 'healthy' | 'overstock' | 'deadstock';
  stockout_flag: boolean;
  overstock_flag: boolean;
}

interface Alert {
  type: 'critical' | 'warning' | 'info';
  message: string;
  related_chart: string;
}

interface DOSBucket {
  bucket: string;
  count: number;
  pct: number;
  value_at_risk: number;
  color: string;
}

interface DOSDeptData {
  department: string;
  avg_dos: number;
  target: number;
  below_target_pct: number;
}

interface StockoutTrendData {
  date: string;
  stockout_count: number;
  lost_sales: number;
}

interface StockoutSKU {
  product_id: string;
  product_name: string;
  department: string;
  total_stockout_hours: number;
  events: number;
  lost_sales: number;
  affected_stores: number;
}

interface DeptCoverage {
  department: string;
  coverage_pct: number;
  target: number;
  gap_skus: number;
}

interface ABCCoverage {
  abc_class: string;
  coverage_pct: number;
  target: number;
  gap_skus: number;
}

interface UnderStockedItem {
  product_id: string;
  product_name: string;
  store: string;
  current: number;
  safety: number;
  gap: number;
  urgency: 'Critical' | 'High' | 'Medium' | 'Low';
}

interface ReplenishmentItem {
  product_id: string;
  product_name: string;
  store_id: string;
  store_name: string;
  department: string;
  current_stock: number;
  reorder_point: number;
  days_to_stockout: number;
  suggested_qty: number;
  suggested_date: string;
  supplier: string;
  lead_time_days: number;
  estimated_cost: number;
  urgency: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'pending' | 'approved' | 'ordered' | 'in_transit';
}

interface InboundData {
  summary: {
    in_transit: { count: number; value: number };
    delayed: { count: number; value: number; avg_delay_days: number };
    received_this_week: { count: number; value: number };
  };
  pipeline: Array<{
    date: string;
    expected_deliveries: number;
    status_breakdown: { on_time: number; at_risk: number; delayed: number };
  }>;
  orders: Array<{
    po_id: string;
    product_name: string;
    supplier: string;
    qty: number;
    expected_date: string;
    status: 'in_transit' | 'at_risk' | 'delayed' | 'received';
    delay_days: number;
  }>;
}

export default function InventoryDashboardContent() {
  const { filters, setFilters } = useInventory();

  // Data states - Section 1-4 (original)
  const [kpis, setKpis] = useState<Record<string, unknown> | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [healthMatrix, setHealthMatrix] = useState<HealthMatrixPoint[]>([]);
  const [dosDistribution, setDosDistribution] = useState<DOSBucket[]>([]);
  const [dosByDept, setDosByDept] = useState<DOSDeptData[]>([]);

  // Data states - Section 5 (Stockout)
  const [stockoutTrend, setStockoutTrend] = useState<StockoutTrendData[]>([]);
  const [stockoutTopSKUs, setStockoutTopSKUs] = useState<StockoutSKU[]>([]);

  // Data states - Section 6 (Safety Stock)
  const [safetyStockByDept, setSafetyStockByDept] = useState<DeptCoverage[]>([]);
  const [safetyStockByABC, setSafetyStockByABC] = useState<ABCCoverage[]>([]);
  const [underStocked, setUnderStocked] = useState<UnderStockedItem[]>([]);

  // Data states - Section 7 (Replenishment)
  const [replenishment, setReplenishment] = useState<ReplenishmentItem[]>([]);

  // Data states - Section 8 (Inbound)
  const [inbound, setInbound] = useState<InboundData | null>(null);

  const [loading, setLoading] = useState(true);

  // Fetch all data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [
          kpisRes,
          alertsRes,
          matrixRes,
          dosDistRes,
          dosDeptRes,
          stockoutTrendRes,
          stockoutTopRes,
          safetyStockRes,
          replenishmentRes,
          inboundRes,
        ] = await Promise.all([
          fetch('/api/inventory/kpis'),
          fetch('/api/inventory/alerts'),
          fetch('/api/inventory/health-matrix'),
          fetch('/api/inventory/dos-distribution'),
          fetch('/api/inventory/dos-by-dept'),
          fetch('/api/inventory/stockout-trend'),
          fetch('/api/inventory/stockout-top-skus'),
          fetch('/api/inventory/safety-stock'),
          fetch('/api/inventory/replenishment'),
          fetch('/api/inventory/inbound'),
        ]);

        const [
          kpisData,
          alertsData,
          matrixData,
          dosDistData,
          dosDeptData,
          stockoutTrendData,
          stockoutTopData,
          safetyStockData,
          replenishmentData,
          inboundData,
        ] = await Promise.all([
          kpisRes.json(),
          alertsRes.json(),
          matrixRes.json(),
          dosDistRes.json(),
          dosDeptRes.json(),
          stockoutTrendRes.json(),
          stockoutTopRes.json(),
          safetyStockRes.json(),
          replenishmentRes.json(),
          inboundRes.json(),
        ]);

        setKpis(kpisData);
        setAlerts(alertsData);
        setHealthMatrix(matrixData);
        setDosDistribution(dosDistData);
        setDosByDept(dosDeptData);
        setStockoutTrend(stockoutTrendData);
        setStockoutTopSKUs(stockoutTopData);
        setSafetyStockByDept(safetyStockData.by_department);
        setSafetyStockByABC(safetyStockData.by_abc);
        setUnderStocked(safetyStockData.under_stocked);
        setReplenishment(replenishmentData);
        setInbound(inboundData);
      } catch (error) {
        console.error('Error fetching inventory data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Filter the health matrix data based on current filters
  const filteredHealthMatrix = (healthMatrix ?? []).filter(item => {
    if ((filters.departments ?? []).length > 0 && !(filters.departments ?? []).includes(item.department)) {
      return false;
    }
    if (filters.abcClass !== 'all' && item.abc_class !== filters.abcClass) {
      return false;
    }
    if (filters.stockStatus !== 'all' && item.status !== filters.stockStatus) {
      return false;
    }
    return true;
  });

  // Handle quadrant click to filter by status
  const handleQuadrantClick = useCallback((status: string) => {
    if (status === 'critical') {
      // Include both stockout and critical
      setFilters({ stockStatus: 'critical' });
    } else {
      setFilters({ stockStatus: status });
    }
  }, [setFilters]);

  // Handle alert click to scroll to related chart
  const handleAlertClick = useCallback((chartId: string) => {
    const element = document.getElementById(`section-${chartId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 rounded" />
          ))}
        </div>
        <div className="h-[450px] bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Inventory Optimization
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Monitor stock levels, identify risks, and optimize inventory across stores
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <InventoryFilterBar />

      {/* Section 1: KPI Cards */}
      <InventoryKPICards data={kpis as Parameters<typeof InventoryKPICards>[0]['data']} />

      {/* Section 2: Alerts Panel */}
      <InventoryAlerts alerts={alerts} onAlertClick={handleAlertClick} />

      {/* Section 3: Hero Chart - Health Matrix */}
      <div id="section-health-matrix">
        <InventoryHealthMatrix
          data={filteredHealthMatrix}
          onQuadrantClick={handleQuadrantClick}
        />
      </div>

      {/* Section 4: DOS Analysis Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div id="section-dos-distribution">
          <DOSDistribution data={dosDistribution} />
        </div>
        <div id="section-dos-by-dept">
          <DOSByDepartment data={dosByDept} />
        </div>
      </div>

      {/* Section 5: Stockout Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div id="section-stockout-trend">
          <StockoutTrend data={stockoutTrend} />
        </div>
        <div id="section-stockout-top-skus">
          <StockoutTopSKUs data={stockoutTopSKUs} />
        </div>
      </div>

      {/* Section 6: Safety Stock Coverage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div id="section-safety-stock">
          <SafetyStockCoverage byDepartment={safetyStockByDept} byABC={safetyStockByABC} />
        </div>
        <div id="section-under-stocked">
          <UnderStockedTable data={underStocked} />
        </div>
      </div>

      {/* Section 7: Replenishment Queue (Operational Hero) */}
      <div id="section-replenishment">
        <ReplenishmentQueue data={replenishment} />
      </div>

      {/* Section 8: Inbound Pipeline */}
      {inbound && (
        <div id="section-inbound" className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Inbound Pipeline
          </h2>
          <InboundSummary data={inbound.summary} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <InboundTimeline data={inbound.pipeline} />
            <InboundTable data={inbound.orders} />
          </div>
        </div>
      )}
    </div>
  );
}
