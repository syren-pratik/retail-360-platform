/**
 * Typed access to dbx-fixtures.json — real options pulled from Databricks
 * so dropdowns, presets, and example values across the app match what queries
 * will actually find.
 *
 * Refresh by running `bash scripts/scan-fixtures.sh` and copying
 * /tmp/dbx-fixtures.json over src/app/lib/dbx-fixtures.json.
 */

import raw from './dbx-fixtures.json';

// ── Shape ──────────────────────────────────────────────────────────────────

export interface SupplierRow {
  supplier_id: string;
  supplier_name: string;
  supplier_city: string;
  otif_pct: number;
  in_full_pct: number;
  po_value_cr: number;
  lead_time_days: number;
}

export interface StoreRow {
  store_id: string;
  store_name: string;
  store_type: string;
  city: string;
  state: string;
  region: string;
}

export interface DepartmentRow {
  department: string;
  sku_count: number;
}

export interface CategoryRow {
  department: string;
  category_l1: string;
  sku_count: number;
}

export interface RegionRow {
  region: string;
  cities: number;
  stores: number;
}

export interface SKURow {
  product_id: string;
  department: string;
  category_l1: string;
  units_7d: number;
  revenue_inr_7d: number;
}

export interface OverstockRow {
  product_id: string;
  store_id: string;
  department: string;
  city: string;
  closing_stock_qty: number;
  dos: number;
}

export interface PromoRow {
  promo_id: string;
  promo_name: string;
  promo_type: string;
  depth_pct: number;
  start_date: string;
  end_date: string;
}

// JSON columns come as raw arrays — wrap them as objects on import.

interface RawFixtures {
  _generated_at: string;
  suppliers: unknown[][];
  underperforming_suppliers: unknown[][];
  stores: unknown[][];
  departments: unknown[][];
  categories: unknown[][];
  regions: unknown[][];
  cities: unknown[][];
  top_skus: unknown[][];
  overstock_skus: unknown[][];
  promos: unknown[][];
  festivals: unknown[][];
  abc_classes: unknown[][];
  store_types: unknown[][];
  rfm_segments: unknown[][];
  churn_tiers: unknown[][];
}

const f = raw as unknown as RawFixtures;

export const FIXTURES_GENERATED_AT: string = f._generated_at;

export const SUPPLIERS: SupplierRow[] = f.suppliers.map((r) => ({
  supplier_id: r[0] as string,
  supplier_name: r[1] as string,
  supplier_city: r[2] as string,
  otif_pct: Number(r[3]),
  in_full_pct: Number(r[4]),
  po_value_cr: Number(r[5]),
  lead_time_days: Number(r[6]),
}));

export const STORES: StoreRow[] = f.stores.map((r) => ({
  store_id: r[0] as string,
  store_name: r[1] as string,
  store_type: r[2] as string,
  city: r[3] as string,
  state: r[4] as string,
  region: r[5] as string,
}));

export const DEPARTMENTS: DepartmentRow[] = f.departments.map((r) => ({
  department: r[0] as string,
  sku_count: Number(r[1]),
}));

export const CATEGORIES: CategoryRow[] = f.categories.map((r) => ({
  department: r[0] as string,
  category_l1: r[1] as string,
  sku_count: Number(r[2]),
}));

export const REGIONS: RegionRow[] = f.regions.map((r) => ({
  region: r[0] as string,
  cities: Number(r[1]),
  stores: Number(r[2]),
}));

export const TOP_SKUS: SKURow[] = f.top_skus.map((r) => ({
  product_id: r[0] as string,
  department: r[1] as string,
  category_l1: r[2] as string,
  units_7d: Number(r[3]),
  revenue_inr_7d: Number(r[4]),
}));

export const OVERSTOCK_SKUS: OverstockRow[] = f.overstock_skus.map((r) => ({
  product_id: r[0] as string,
  store_id: r[1] as string,
  department: r[2] as string,
  city: r[3] as string,
  closing_stock_qty: Number(r[4]),
  dos: Number(r[5]),
}));

export const PROMOS: PromoRow[] = f.promos.map((r) => ({
  promo_id: r[0] as string,
  promo_name: r[1] as string,
  promo_type: r[2] as string,
  depth_pct: Number(r[3]),
  start_date: r[4] as string,
  end_date: r[5] as string,
}));

export const FESTIVALS: string[] = f.festivals.map((r) => r[0] as string);
export const STORE_TYPES: string[] = f.store_types.map((r) => r[0] as string);
export const RFM_SEGMENTS: string[] = f.rfm_segments.map((r) => r[0] as string);

// ── Convenience helpers for UI dropdowns ───────────────────────────────────

/** Top N suppliers by PO value — what dropdowns should show first. */
export function topSuppliers(n = 8): string[] {
  return SUPPLIERS.slice(0, n).map((s) => s.supplier_name);
}

/** Real store names grouped by region for a city-aware UI. */
export function storesByRegion(): Record<string, StoreRow[]> {
  const out: Record<string, StoreRow[]> = {};
  for (const s of STORES) {
    if (!out[s.region]) out[s.region] = [];
    out[s.region].push(s);
  }
  return out;
}

/** Department names only — the 5-value dropdown. */
export function departmentNames(): string[] {
  return DEPARTMENTS.map((d) => d.department);
}

/** Region-derived DC names (Databricks has no DC dim — region is the proxy). */
export function dcChoices(): { id: string; label: string; covers: string }[] {
  return REGIONS.map((r) => ({
    id: `${r.region.toUpperCase()}_DC`,
    label: `${r.region} Region DC`,
    covers: `${r.stores} stores · ${r.cities} cities`,
  }));
}
