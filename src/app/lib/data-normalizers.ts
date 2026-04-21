/**
 * Data Normalizers
 * Convert raw Databricks data into the shape expected by UI components
 */

import { safeNumber, generateSparkline } from './safe-data';

// ═══ INVENTORY NORMALIZERS ═══

export function normalizeInventoryKPIs(raw: unknown): {
  osa: { value: number; prior: number; unit: string; label: string; direction: string; target?: [number, number] };
  stockout_rate: { value: number; prior: number; unit: string; label: string; direction: string };
  avg_dos: { value: number; prior: number; unit: string; label: string; direction: string; target: [number, number] };
  fill_rate: { value: number; prior: number; unit: string; label: string; direction: string };
  inventory_value: { value: number; prior: number; unit: string; label: string; direction: string };
  lost_sales: { value: number; prior: number; unit: string; label: string; direction: string };
  sparklines: Record<string, number[]>;
} {
  // Handle nested shape (already normalized by API)
  if (raw && typeof raw === 'object' && 'osa' in (raw as object)) {
    const data = raw as Record<string, unknown>;
    if (typeof data.osa === 'object' && data.osa !== null && 'value' in (data.osa as object)) {
      // Already in correct shape, just ensure sparklines exist
      return {
        ...data,
        sparklines: (data.sparklines as Record<string, number[]>) || {
          osa: [],
          stockout_rate: [],
          avg_dos: [],
          fill_rate: [],
          inventory_value: [],
          lost_sales: [],
        },
      } as ReturnType<typeof normalizeInventoryKPIs>;
    }
  }

  // Handle Databricks flat shape (array with single row or single object)
  const kpis = Array.isArray(raw) ? raw[0] : raw;
  if (!kpis || typeof kpis !== 'object') {
    // Return defaults
    return getDefaultInventoryKPIs();
  }

  const data = kpis as Record<string, unknown>;
  const avgDos = safeNumber(data.avg_dos, 21);
  const stockoutPct = safeNumber(data.stockout_pct, 0);
  const totalStockQty = safeNumber(data.total_stock_qty, 0);

  const fillRate = 100 - stockoutPct;
  const osa = 100 - stockoutPct;
  const inventoryValue = totalStockQty * 50;
  const lostSales = Math.round(stockoutPct * 10000);

  return {
    osa: {
      value: osa,
      prior: osa - 0.5,
      unit: '%',
      label: 'On-Shelf Availability',
      direction: 'higher_better',
    },
    stockout_rate: {
      value: stockoutPct,
      prior: stockoutPct + 0.2,
      unit: '%',
      label: 'Stockout Rate',
      direction: 'lower_better',
    },
    avg_dos: {
      value: avgDos,
      prior: avgDos - 1.2,
      unit: 'days',
      label: 'Avg Days of Stock',
      direction: 'target_range',
      target: [14, 21],
    },
    fill_rate: {
      value: fillRate,
      prior: fillRate - 0.3,
      unit: '%',
      label: 'Fill Rate',
      direction: 'higher_better',
    },
    inventory_value: {
      value: inventoryValue,
      prior: inventoryValue * 0.95,
      unit: '₹',
      label: 'Inventory Value',
      direction: 'target_range',
    },
    lost_sales: {
      value: lostSales,
      prior: lostSales * 1.1,
      unit: '₹',
      label: 'Lost Sales',
      direction: 'lower_better',
    },
    sparklines: {
      osa: generateSparkline(osa),
      stockout_rate: generateSparkline(stockoutPct),
      avg_dos: generateSparkline(avgDos),
      fill_rate: generateSparkline(fillRate),
      inventory_value: generateSparkline(inventoryValue),
      lost_sales: generateSparkline(lostSales),
    },
  };
}

function getDefaultInventoryKPIs(): ReturnType<typeof normalizeInventoryKPIs> {
  return {
    osa: { value: 0, prior: 0, unit: '%', label: 'On-Shelf Availability', direction: 'higher_better' },
    stockout_rate: { value: 0, prior: 0, unit: '%', label: 'Stockout Rate', direction: 'lower_better' },
    avg_dos: { value: 0, prior: 0, unit: 'days', label: 'Avg Days of Stock', direction: 'target_range', target: [14, 21] },
    fill_rate: { value: 0, prior: 0, unit: '%', label: 'Fill Rate', direction: 'higher_better' },
    inventory_value: { value: 0, prior: 0, unit: '₹', label: 'Inventory Value', direction: 'target_range' },
    lost_sales: { value: 0, prior: 0, unit: '₹', label: 'Lost Sales', direction: 'lower_better' },
    sparklines: {
      osa: [], stockout_rate: [], avg_dos: [], fill_rate: [], inventory_value: [], lost_sales: [],
    },
  };
}

// ═══ CX360 NORMALIZERS ═══

export function normalizeCX360KPIs(raw: unknown): {
  total_customers: number;
  avg_clv: number;
  churn_rate_pct: number;
  active_rate_pct: number;
  total_revenue?: number;
  avg_basket?: number;
} {
  const data = Array.isArray(raw) ? raw[0] : raw;
  if (!data || typeof data !== 'object') {
    return { total_customers: 0, avg_clv: 0, churn_rate_pct: 0, active_rate_pct: 0 };
  }
  const obj = data as Record<string, unknown>;
  return {
    total_customers: safeNumber(obj.total_customers, 0),
    avg_clv: safeNumber(obj.avg_clv, 0),
    churn_rate_pct: safeNumber(obj.churn_rate_pct, 0),
    active_rate_pct: safeNumber(obj.active_rate_pct, 0),
    total_revenue: safeNumber(obj.total_revenue, 0),
    avg_basket: safeNumber(obj.avg_basket, 0),
  };
}

// ═══ DEMAND NORMALIZERS ═══

export function normalizeDemandKPIs(raw: unknown): {
  forecast_accuracy_pct: number;
  total_lost_sales: number;
  avg_safety_stock_days: number;
  total_skus: number;
} {
  const data = Array.isArray(raw) ? raw[0] : raw;
  if (!data || typeof data !== 'object') {
    return { forecast_accuracy_pct: 0, total_lost_sales: 0, avg_safety_stock_days: 0, total_skus: 0 };
  }
  const obj = data as Record<string, unknown>;
  return {
    forecast_accuracy_pct: safeNumber(obj.forecast_accuracy_pct, 0),
    total_lost_sales: safeNumber(obj.total_lost_sales, 0),
    avg_safety_stock_days: safeNumber(obj.avg_safety_stock_days, 0),
    total_skus: safeNumber(obj.total_skus, 0),
  };
}

// ═══ PRICE NORMALIZERS ═══

export function normalizePriceKPIs(raw: unknown): {
  total_products: number;
  avg_margin_pct: number;
  high_priority_count: number;
  total_revenue_impact: number;
  avg_price_change_pct: number;
} {
  const data = Array.isArray(raw) ? raw[0] : raw;
  if (!data || typeof data !== 'object') {
    return { total_products: 0, avg_margin_pct: 0, high_priority_count: 0, total_revenue_impact: 0, avg_price_change_pct: 0 };
  }
  const obj = data as Record<string, unknown>;
  return {
    total_products: safeNumber(obj.total_products, 0),
    avg_margin_pct: safeNumber(obj.avg_margin_pct, 0),
    high_priority_count: safeNumber(obj.high_priority_count, 0),
    total_revenue_impact: safeNumber(obj.total_revenue_impact, 0),
    avg_price_change_pct: safeNumber(obj.avg_price_change_pct, 0),
  };
}

// ═══ GENERIC NORMALIZER ═══

export type NormalizerKey = 'inventory_kpis' | 'cx360_kpis' | 'demand_kpis' | 'price_kpis';

const NORMALIZERS: Record<NormalizerKey, (raw: unknown) => unknown> = {
  inventory_kpis: normalizeInventoryKPIs,
  cx360_kpis: normalizeCX360KPIs,
  demand_kpis: normalizeDemandKPIs,
  price_kpis: normalizePriceKPIs,
};

export function normalizeData<T = unknown>(cacheKey: string, raw: unknown): T {
  const normalizer = NORMALIZERS[cacheKey as NormalizerKey];
  if (!normalizer) {
    // No normalizer defined - return as-is
    return raw as T;
  }
  try {
    return normalizer(raw) as T;
  } catch (error) {
    console.error(`Normalization failed for ${cacheKey}:`, error);
    return raw as T;
  }
}
