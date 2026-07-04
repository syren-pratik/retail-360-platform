/**
 * Tenant-aware SKU list for the 5 Price-Intel agent forms.
 * Grocery: real Databricks TOP_SKUS fixture (₹, lakhs).
 * Apparel: derived from core.skus (US $, thousands).
 */
'use client';

import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import { TOP_SKUS, OVERSTOCK_SKUS, RFM_SEGMENTS } from '@/app/lib/dbx-fixtures';

export interface AgentSKURow {
  product_id: string;
  department: string;
  category_l1: string;
  units_7d: number;
  revenue_inr_7d: number;
}

export interface AgentSKUContext {
  skus: AgentSKURow[];
  overstockSKUs: AgentSKURow[];
  segments: string[];
  currency: string;
  unitLabel: string;
  unitDivisor: number;
}

const APPAREL_SEGMENTS = [
  'Fashion Forward', 'Athletic Enthusiast', 'Value Shopper', 'Brand Loyalist',
  'Returner', 'Lapsed', 'Casual', 'New',
];

export function buildAgentSKUContext(core: PriceIntelCore, isApparel: boolean): AgentSKUContext {
  if (!isApparel) {
    return {
      skus: TOP_SKUS,
      overstockSKUs: OVERSTOCK_SKUS.map((o) => ({
        product_id: o.product_id,
        department: o.department,
        category_l1: o.department,
        units_7d: 0,
        revenue_inr_7d: o.closing_stock_qty * 100,
      })),
      segments: RFM_SEGMENTS,
      currency: '₹',
      unitLabel: 'L',
      unitDivisor: 100_000,
    };
  }

  const apparelSkus: AgentSKURow[] = core.skus.slice(0, 12).map((s) => ({
    product_id: s.sku_id,
    department: s.department,
    category_l1: s.category,
    units_7d: 0,
    revenue_inr_7d: (s.current_price_inr ?? 0) * 100,
  }));

  return {
    skus: apparelSkus,
    overstockSKUs: apparelSkus,
    segments: APPAREL_SEGMENTS,
    currency: '$',
    unitLabel: 'K',
    unitDivisor: 1_000,
  };
}
