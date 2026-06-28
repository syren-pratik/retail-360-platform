/**
 * Typed Databricks query tools for the chat agent.
 *
 * The agent picks a tool by domain; this file generates the actual SQL
 * with the right table, the right filters, and a LIMIT — so the agent
 * can't fumble table names or unleash an unbounded scan against a 100M+
 * row fact table.
 *
 * Each tool returns the same shape as the raw `query_data` tool:
 *   { success, data, rowCount, source, executionTime, sql, explanation }
 *
 * Raw query_data stays in place as an escape hatch for novel asks.
 */

import { runQuery } from './databricks';
import { LATEST_DATE_ID_SQL, lastNDays } from './dbx-catalog';

// ── 60s in-memory query cache ──────────────────────────────────────────────
// Hits the same SQL twice in 60s → second call returns instantly.
// Skips caching for queries with non-deterministic functions.

interface CacheEntry {
  result: ToolOutput;
  expiresAt: number;
}

const queryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000;

function isCacheable(sql: string): boolean {
  const s = sql.toLowerCase();
  return !s.includes('now()') && !s.includes('current_timestamp');
}

function cacheGet(sql: string): ToolOutput | null {
  const hit = queryCache.get(sql);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    queryCache.delete(sql);
    return null;
  }
  return { ...hit.result, cached: true };
}

function cacheSet(sql: string, result: ToolOutput): void {
  if (!isCacheable(sql)) return;
  // Prevent unbounded growth in long-running processes.
  if (queryCache.size > 500) queryCache.clear();
  queryCache.set(sql, { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function bustQueryCache(): void {
  queryCache.clear();
}

// ── Shared execution wrapper ───────────────────────────────────────────────

export interface ToolOutput {
  success: boolean;
  data?: Record<string, unknown>[];
  rowCount?: number;
  source?: 'databricks' | 'mock' | 'cache';
  executionTime?: number;
  sql: string;
  explanation: string;
  error?: string;
  cached?: boolean;
}

async function runTool(sql: string, explanation: string): Promise<ToolOutput> {
  const cached = cacheGet(sql);
  if (cached) return cached;

  try {
    const result = await runQuery(sql);
    const out: ToolOutput = {
      success: true,
      data: result.data,
      rowCount: result.rowCount,
      source: 'databricks',
      executionTime: result.executionTime,
      sql,
      explanation,
    };
    cacheSet(sql, out);
    return out;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Query failed',
      sql,
      explanation,
    };
  }
}

// ── Tool 1: cx_lookup ──────────────────────────────────────────────────────

export interface CXLookupInput {
  scope: 'segment_summary' | 'churn_risk' | 'top_value' | 'cohort' | 'customer';
  filter?: {
    rfm_segment?: string;
    churn_risk_tier?: string;
    clv_tier?: string;
    city?: string;
    customer_id?: string;
  };
  limit?: number;
}

export async function cxLookup(input: CXLookupInput): Promise<ToolOutput> {
  const limit = Math.min(input.limit ?? 50, 500);
  const f = input.filter ?? {};
  const where: string[] = [];
  if (f.rfm_segment) where.push(`rfm_segment = '${f.rfm_segment.replace(/'/g, "''")}'`);
  if (f.churn_risk_tier) where.push(`churn_risk_tier = '${f.churn_risk_tier.replace(/'/g, "''")}'`);
  if (f.clv_tier) where.push(`clv_tier = '${f.clv_tier.replace(/'/g, "''")}'`);
  if (f.city) where.push(`city = '${f.city.replace(/'/g, "''")}'`);
  if (f.customer_id) where.push(`customer_id = '${f.customer_id.replace(/'/g, "''")}'`);
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';

  let sql = '';
  let explanation = '';

  switch (input.scope) {
    case 'segment_summary':
      sql = `SELECT rfm_segment, COUNT(*) AS customers, ROUND(AVG(total_spend),0) AS avg_lifetime_spend, ROUND(AVG(clv_predicted_12m),0) AS avg_clv_12m, ROUND(AVG(churn_probability),3) AS avg_churn_prob, ROUND(SUM(revenue_at_risk),0) AS total_revenue_at_risk FROM hive_metastore.cx_genome.genome_customer_360 ${w} GROUP BY rfm_segment ORDER BY customers DESC`;
      explanation = 'Aggregate metrics by RFM segment';
      break;
    case 'churn_risk':
      sql = `SELECT customer_id, city, rfm_segment, churn_risk_tier, ROUND(churn_probability,3) AS churn_prob, ROUND(revenue_at_risk,0) AS revenue_at_risk, churn_reason_1, next_best_action, save_priority_rank FROM hive_metastore.cx_genome.genome_customer_360 ${w ? w + ' AND' : 'WHERE'} churn_risk_tier IN ('Very High','High') ORDER BY save_priority_rank LIMIT ${limit}`;
      explanation = 'Top at-risk customers by save priority';
      break;
    case 'top_value':
      sql = `SELECT customer_id, city, rfm_segment, clv_tier, ROUND(clv_predicted_12m,0) AS clv_12m, ROUND(total_spend,0) AS lifetime_spend, total_orders, ROUND(avg_order_value,0) AS aov FROM hive_metastore.cx_genome.genome_customer_360 ${w} ORDER BY clv_predicted_12m DESC LIMIT ${limit}`;
      explanation = 'Highest-CLV customers';
      break;
    case 'cohort':
      sql = `SELECT cohort_month, months_since_cohort, ROUND(retention_rate,2) AS retention_pct, cohort_size, active_customers FROM hive_metastore.retail_gold.gold_cohort_retention ORDER BY cohort_month, months_since_cohort LIMIT ${limit}`;
      explanation = 'Cohort retention curves';
      break;
    case 'customer':
      if (!f.customer_id) {
        return { success: false, error: 'customer_id required for scope=customer', sql: '', explanation: '' };
      }
      sql = `SELECT * FROM hive_metastore.cx_genome.genome_customer_360 WHERE customer_id = '${f.customer_id.replace(/'/g, "''")}'`;
      explanation = `Full 360 record for customer ${f.customer_id}`;
      break;
  }

  return runTool(sql, explanation);
}

// ── Tool 2: inventory_status ───────────────────────────────────────────────

export interface InventoryStatusInput {
  scope:
    | 'health_summary'
    | 'stockouts_now'
    | 'replenishment_needed'
    | 'overstock'
    | 'sku_lookup';
  filter?: {
    city?: string;
    store_type?: string;
    department?: string;
    abc_class?: string;
    product_id?: string;
  };
  limit?: number;
}

export async function inventoryStatus(input: InventoryStatusInput): Promise<ToolOutput> {
  const limit = Math.min(input.limit ?? 50, 500);
  const f = input.filter ?? {};
  const dim: string[] = [];
  if (f.city) dim.push(`city = '${f.city.replace(/'/g, "''")}'`);
  if (f.store_type) dim.push(`store_type = '${f.store_type.replace(/'/g, "''")}'`);
  if (f.department) dim.push(`department = '${f.department.replace(/'/g, "''")}'`);
  if (f.abc_class) dim.push(`abc_class = '${f.abc_class.replace(/'/g, "''")}'`);
  if (f.product_id) dim.push(`product_id = '${f.product_id.replace(/'/g, "''")}'`);
  const dimSql = dim.length ? ' AND ' + dim.join(' AND ') : '';

  let sql = '';
  let explanation = '';

  switch (input.scope) {
    case 'health_summary':
      sql = `SELECT department, COUNT(*) AS skus, ROUND(AVG(days_of_stock),1) AS avg_dos, SUM(CASE WHEN is_stockout THEN 1 ELSE 0 END) AS stockout_skus, SUM(CASE WHEN inventory_health_status = 'Overstock' THEN 1 ELSE 0 END) AS overstock_skus, SUM(CASE WHEN inventory_health_status = 'Low' THEN 1 ELSE 0 END) AS low_skus FROM hive_metastore.retail_gold.gold_inventory_health WHERE date_id = ${LATEST_DATE_ID_SQL}${dimSql} GROUP BY department ORDER BY stockout_skus DESC`;
      explanation = 'Today\'s inventory health rolled up by department';
      break;
    case 'stockouts_now':
      sql = `SELECT product_id, store_id, department, category_l1, city, store_type, abc_class FROM hive_metastore.retail_gold.gold_inventory_health WHERE date_id = ${LATEST_DATE_ID_SQL} AND is_stockout = true${dimSql} LIMIT ${limit}`;
      explanation = 'SKUs currently in stockout';
      break;
    case 'replenishment_needed':
      sql = `SELECT product_id, store_id, department, city, current_stock, ROUND(days_of_stock,1) AS dos, replenishment_status, ROUND(suggested_order_qty,0) AS suggested_qty FROM hive_metastore.retail_gold.gold_replenishment_signal WHERE date_id = ${LATEST_DATE_ID_SQL} AND replenishment_status IN ('Reorder','Watch')${dimSql} ORDER BY days_of_stock LIMIT ${limit}`;
      explanation = 'SKUs needing replenishment action';
      break;
    case 'overstock':
      sql = `SELECT product_id, store_id, department, city, closing_stock_qty, ROUND(days_of_stock,1) AS dos FROM hive_metastore.retail_gold.gold_inventory_health WHERE date_id = ${LATEST_DATE_ID_SQL} AND inventory_health_status = 'Overstock'${dimSql} ORDER BY days_of_stock DESC LIMIT ${limit}`;
      explanation = 'Overstocked SKU/store combinations';
      break;
    case 'sku_lookup':
      if (!f.product_id) {
        return { success: false, error: 'product_id required for scope=sku_lookup', sql: '', explanation: '' };
      }
      sql = `SELECT h.product_id, h.store_id, h.city, h.store_type, h.closing_stock_qty, ROUND(h.days_of_stock,1) AS dos, h.is_stockout, h.inventory_health_status, ROUND(s.avg_daily_demand,1) AS avg_daily_demand, ROUND(s.safety_stock_qty,0) AS safety_stock, ROUND(s.reorder_point,0) AS reorder_point FROM hive_metastore.retail_gold.gold_inventory_health h LEFT JOIN hive_metastore.retail_gold.gold_safety_stock s ON h.product_id = s.product_id AND h.store_id = s.store_id WHERE h.date_id = ${LATEST_DATE_ID_SQL} AND h.product_id = '${f.product_id.replace(/'/g, "''")}' LIMIT ${limit}`;
      explanation = `Per-store inventory + safety stock for ${f.product_id}`;
      break;
  }

  return runTool(sql, explanation);
}

// ── Tool 3: demand_lookup ──────────────────────────────────────────────────

export interface DemandLookupInput {
  scope: 'sales_summary' | 'top_movers' | 'forecast' | 'festival_uplift' | 'sku_trend';
  filter?: {
    department?: string;
    category_l1?: string;
    city?: string;
    state?: string;
    abc_class?: string;
    product_id?: string;
    festival_name?: string;
    window_days?: number;
  };
  limit?: number;
}

export async function demandLookup(input: DemandLookupInput): Promise<ToolOutput> {
  const limit = Math.min(input.limit ?? 50, 500);
  const f = input.filter ?? {};
  const win = f.window_days ?? 7;
  const dim: string[] = [];
  if (f.department) dim.push(`department = '${f.department.replace(/'/g, "''")}'`);
  if (f.category_l1) dim.push(`category_l1 = '${f.category_l1.replace(/'/g, "''")}'`);
  if (f.city) dim.push(`city = '${f.city.replace(/'/g, "''")}'`);
  if (f.state) dim.push(`state = '${f.state.replace(/'/g, "''")}'`);
  if (f.abc_class) dim.push(`abc_class = '${f.abc_class.replace(/'/g, "''")}'`);
  if (f.product_id) dim.push(`product_id = '${f.product_id.replace(/'/g, "''")}'`);
  const dimSql = dim.length ? ' AND ' + dim.join(' AND ') : '';

  let sql = '';
  let explanation = '';

  switch (input.scope) {
    case 'sales_summary':
      sql = `SELECT department, COUNT(DISTINCT product_id) AS skus, COUNT(DISTINCT store_id) AS stores, SUM(quantity_sold) AS units, ROUND(SUM(revenue),0) AS revenue_inr, ROUND(SUM(total_margin),0) AS margin_inr, ROUND(AVG(avg_selling_price),0) AS avg_price FROM hive_metastore.retail_gold.gold_demand_daily_sku_store WHERE ${lastNDays(win)}${dimSql} GROUP BY department ORDER BY revenue_inr DESC`;
      explanation = `Sales rolled up by department over last ${win} days`;
      break;
    case 'top_movers':
      sql = `SELECT product_id, department, category_l1, SUM(quantity_sold) AS units, ROUND(SUM(revenue),0) AS revenue_inr, ROUND(SUM(total_margin),0) AS margin_inr, AVG(CASE WHEN is_on_promo=1 THEN 1.0 ELSE 0 END)*100 AS pct_on_promo FROM hive_metastore.retail_gold.gold_demand_daily_sku_store WHERE ${lastNDays(win)}${dimSql} GROUP BY product_id, department, category_l1 ORDER BY revenue_inr DESC LIMIT ${limit}`;
      explanation = `Top-selling SKUs over last ${win} days`;
      break;
    case 'forecast':
      sql = `SELECT product_id, store_id, department, city, target_date_id, ROUND(forecast_qty,0) AS forecast_qty, ROUND(lower_80,0) AS lower_80, ROUND(upper_80,0) AS upper_80, ROUND(confidence_score,2) AS confidence FROM hive_metastore.retail_ml.forecast_output WHERE 1=1${dimSql} ORDER BY target_date_id LIMIT ${limit}`;
      explanation = 'ML demand forecast with 80% CI';
      break;
    case 'festival_uplift': {
      const festFilter = f.festival_name
        ? ` AND festival_name = '${f.festival_name.replace(/'/g, "''")}'`
        : '';
      sql = `SELECT department, category_l1, city, festival_name, year, ROUND(estimated_multiplier,2) AS uplift_x, total_qty, ROUND(total_revenue,0) AS revenue_inr FROM hive_metastore.retail_gold.gold_festival_demand WHERE 1=1${dimSql}${festFilter} ORDER BY estimated_multiplier DESC LIMIT ${limit}`;
      explanation = 'Historical festival uplift by category/city';
      break;
    }
    case 'sku_trend':
      if (!f.product_id) {
        return { success: false, error: 'product_id required for scope=sku_trend', sql: '', explanation: '' };
      }
      sql = `SELECT date_id, SUM(quantity_sold) AS units, ROUND(SUM(revenue),0) AS revenue_inr, ROUND(AVG(avg_selling_price),0) AS avg_price, MAX(CASE WHEN is_on_promo=1 THEN 1 ELSE 0 END) AS any_promo, MAX(festival_name) AS festival FROM hive_metastore.retail_gold.gold_demand_daily_sku_store WHERE ${lastNDays(win)} AND product_id = '${f.product_id.replace(/'/g, "''")}' GROUP BY date_id ORDER BY date_id LIMIT ${limit}`;
      explanation = `Daily trend for ${f.product_id} over last ${win} days`;
      break;
  }

  return runTool(sql, explanation);
}

// ── Tool 4: supplier_health ────────────────────────────────────────────────

export interface SupplierHealthInput {
  scope: 'scorecard' | 'underperformers' | 'cost_changes' | 'supplier_lookup';
  filter?: {
    supplier_id?: string;
    supplier_name?: string;
    min_on_time_pct?: number;
    max_on_time_pct?: number;
  };
  limit?: number;
}

export async function supplierHealth(input: SupplierHealthInput): Promise<ToolOutput> {
  const limit = Math.min(input.limit ?? 30, 100);
  const f = input.filter ?? {};

  let sql = '';
  let explanation = '';

  switch (input.scope) {
    case 'scorecard':
      sql = `SELECT supplier_id, supplier_name, supplier_city, lead_time_days, ROUND(avg_actual_lead_time,1) AS actual_lead_time, total_pos, ROUND(total_po_value,0) AS po_value_inr, ROUND(CAST(on_time_pct AS DOUBLE),2) AS on_time_pct, ROUND(CAST(in_full_pct AS DOUBLE),2) AS in_full_pct FROM hive_metastore.retail_gold.gold_supplier_scorecard ORDER BY on_time_pct DESC LIMIT ${limit}`;
      explanation = 'Full supplier scorecard';
      break;
    case 'underperformers': {
      const threshold = f.max_on_time_pct ?? 75;
      sql = `SELECT supplier_id, supplier_name, supplier_city, lead_time_days, ROUND(avg_actual_lead_time,1) AS actual_lead_time, ROUND(CAST(on_time_pct AS DOUBLE),2) AS on_time_pct, ROUND(CAST(in_full_pct AS DOUBLE),2) AS in_full_pct, ROUND(total_po_value,0) AS po_value_inr FROM hive_metastore.retail_gold.gold_supplier_scorecard WHERE on_time_pct < ${threshold} ORDER BY on_time_pct LIMIT ${limit}`;
      explanation = `Suppliers with OTIF below ${threshold}%`;
      break;
    }
    case 'cost_changes':
      sql = `SELECT supplier_id, supplier_name, effective_date, change_type, ROUND(old_cost,2) AS old_cost, ROUND(new_cost,2) AS new_cost, ROUND(cost_change_pct,2) AS change_pct, affected_products_count AS skus_affected, ROUND(total_impact_monthly_inr,0) AS monthly_impact_inr, ROUND(recommended_passthrough_pct,2) AS rec_passthrough_pct FROM hive_metastore.retail_gold.gold_cost_passthrough ORDER BY effective_date DESC, ABS(total_impact_monthly_inr) DESC LIMIT ${limit}`;
      explanation = 'Recent supplier cost changes + passthrough recommendation';
      break;
    case 'supplier_lookup': {
      const id = f.supplier_id ?? f.supplier_name;
      if (!id) {
        return { success: false, error: 'supplier_id or supplier_name required', sql: '', explanation: '' };
      }
      const col = f.supplier_id ? 'supplier_id' : 'supplier_name';
      sql = `SELECT * FROM hive_metastore.retail_gold.gold_supplier_scorecard WHERE ${col} = '${id.replace(/'/g, "''")}' LIMIT ${limit}`;
      explanation = `Scorecard for supplier ${id}`;
      break;
    }
  }

  return runTool(sql, explanation);
}

// ── Tool 5: price_intel_lookup ─────────────────────────────────────────────

export interface PriceIntelLookupInput {
  scope:
    | 'recommendations'
    | 'elasticity'
    | 'competitive_gaps'
    | 'promo_effectiveness'
    | 'sku_pricing';
  filter?: {
    category_l1?: string;
    abc_class?: string;
    product_id?: string;
    promo_id?: string;
    min_revenue_impact?: number;
  };
  limit?: number;
}

export async function priceIntelLookup(input: PriceIntelLookupInput): Promise<ToolOutput> {
  const limit = Math.min(input.limit ?? 50, 500);
  const f = input.filter ?? {};
  const dim: string[] = [];
  if (f.category_l1) dim.push(`category_l1 = '${f.category_l1.replace(/'/g, "''")}'`);
  if (f.abc_class) dim.push(`abc_class = '${f.abc_class.replace(/'/g, "''")}'`);
  if (f.product_id) dim.push(`product_id = '${f.product_id.replace(/'/g, "''")}'`);
  const dimSql = dim.length ? ' AND ' + dim.join(' AND ') : '';

  let sql = '';
  let explanation = '';

  switch (input.scope) {
    case 'recommendations': {
      const minImpact = f.min_revenue_impact ?? 0;
      sql = `SELECT product_id, product_name, department, category, ROUND(current_price,2) AS current_price, ROUND(recommended_price,2) AS recommended_price, ROUND(price_change_pct,2) AS change_pct, ROUND(current_margin_pct,2) AS current_margin_pct, ROUND(projected_margin_pct,2) AS projected_margin_pct, ROUND(revenue_impact,0) AS revenue_impact_inr, recommendation_priority FROM hive_metastore.retail_ml.price_recommendations WHERE ABS(revenue_impact) >= ${minImpact} ORDER BY ABS(revenue_impact) DESC LIMIT ${limit}`;
      explanation = 'Top pricing recommendations ranked by absolute revenue impact';
      break;
    }
    case 'elasticity':
      sql = `SELECT product_id, product_name, category_l1, ROUND(elasticity_coefficient,3) AS elasticity, ROUND(cross_elasticity,3) AS cross_elasticity, ROUND(confidence_score,2) AS confidence, ROUND(current_price,2) AS current_price, ROUND(current_mrp,2) AS current_mrp FROM hive_metastore.retail_gold.gold_price_elasticity_matrix WHERE 1=1${dimSql} ORDER BY ABS(elasticity_coefficient) DESC LIMIT ${limit}`;
      explanation = 'Elasticity ranking — high |elasticity| = price-sensitive';
      break;
    case 'competitive_gaps':
      sql = `SELECT product_id, product_name, category_l1, ROUND(our_price,2) AS our_price, ROUND(competitor_price,2) AS competitor_price, competitor_name, platform, ROUND(competitive_index,3) AS competitive_index, is_kvi FROM hive_metastore.retail_gold.gold_competitive_index WHERE competitive_index > 1.05 OR competitive_index < 0.95 ORDER BY ABS(competitive_index - 1) DESC LIMIT ${limit}`;
      explanation = 'SKUs priced >5% off competitor (gaps in either direction)';
      break;
    case 'promo_effectiveness': {
      const promoFilter = f.promo_id
        ? ` AND promo_id = '${f.promo_id.replace(/'/g, "''")}'`
        : '';
      sql = `SELECT promo_id, promo_type, ROUND(discount_pct,1) AS depth_pct, SUM(promo_qty) AS units, ROUND(SUM(promo_revenue),0) AS revenue_inr, ROUND(AVG(volume_lift_pct),1) AS avg_lift_pct, COUNT(DISTINCT product_id) AS skus, COUNT(DISTINCT store_id) AS stores FROM hive_metastore.retail_gold.gold_promo_effectiveness WHERE 1=1${promoFilter} GROUP BY promo_id, promo_type, discount_pct ORDER BY revenue_inr DESC LIMIT ${limit}`;
      explanation = 'Promo performance rolled up by promo';
      break;
    }
    case 'sku_pricing':
      if (!f.product_id) {
        return { success: false, error: 'product_id required for scope=sku_pricing', sql: '', explanation: '' };
      }
      sql = `SELECT product_id, product_name, category_l1, abc_class, ROUND(current_price,2) AS current_price, ROUND(mrp,2) AS mrp, ROUND(cost_price,2) AS cost, ROUND(recommended_price,2) AS recommended_price, ROUND(min_price,2) AS floor_price, ROUND(max_price,2) AS ceiling_price, ROUND(elasticity_coefficient,3) AS elasticity, ROUND(competitor_price,2) AS competitor_price, ROUND(competitive_index,3) AS competitive_index FROM hive_metastore.retail_gold.gold_optimal_price WHERE product_id = '${f.product_id.replace(/'/g, "''")}' LIMIT ${limit}`;
      explanation = `Full pricing picture for ${f.product_id}`;
      break;
  }

  return runTool(sql, explanation);
}

// ── Dispatch ───────────────────────────────────────────────────────────────

export type TypedToolName =
  | 'cx_lookup'
  | 'inventory_status'
  | 'demand_lookup'
  | 'supplier_health'
  | 'price_intel_lookup';

export async function dispatchTypedTool(
  name: TypedToolName,
  input: Record<string, unknown>,
): Promise<ToolOutput> {
  switch (name) {
    case 'cx_lookup':
      return cxLookup(input as unknown as CXLookupInput);
    case 'inventory_status':
      return inventoryStatus(input as unknown as InventoryStatusInput);
    case 'demand_lookup':
      return demandLookup(input as unknown as DemandLookupInput);
    case 'supplier_health':
      return supplierHealth(input as unknown as SupplierHealthInput);
    case 'price_intel_lookup':
      return priceIntelLookup(input as unknown as PriceIntelLookupInput);
  }
}
