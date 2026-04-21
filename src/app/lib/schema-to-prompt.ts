import { readFileSync } from 'fs';
import path from 'path';
import type { SchemaCache } from '@/app/api/schema/route';

const MODULE_TABLES: Record<string, string[]> = {
  cx360: [
    'retail_ml.clv_scores',
    'retail_ml.churn_scores',
    'retail_ml.churn_feature_importance',
    'retail_gold.gold_customer_360',
    'retail_gold.gold_cohort_retention',
  ],
  demand: [
    'retail_ml.forecast_output',
    'retail_gold.gold_demand_daily_sku_store',
    'retail_gold.gold_forecast_accuracy',
    'retail_gold.gold_unconstrained_demand',
    'retail_gold.gold_model_comparison',
  ],
  price: [
    'retail_ml.price_recommendations',
    'retail_ml.price_elasticity_metrics',
    'retail_gold.gold_optimal_price',
    'retail_gold.gold_promo_effectiveness',
    'retail_gold.gold_competitive_index',
    'retail_gold.gold_cost_passthrough',
    'retail_gold.gold_price_elasticity_matrix',
    'retail_silver.fact_price',
    'retail_silver.fact_promotions',
    'retail_silver.fact_price_test',
    'retail_silver.fact_markdown',
  ],
  inventory: [
    'retail_gold.gold_inventory_health',
    'retail_gold.gold_safety_stock',
    'retail_gold.gold_replenishment_signal',
    'retail_gold.gold_osa_tracker',
    'retail_gold.gold_inbound_forecast',
    'retail_gold.gold_delivery_perf',
    'retail_silver.fact_inventory',
    'retail_silver.fact_stockout_events',
    'retail_silver.fact_purchase_orders',
    'retail_silver.fact_shrinkage',
    'retail_silver.fact_delivery',
    'retail_silver.dim_supplier',
    'retail_silver.dim_product',
    'retail_silver.dim_store',
  ],
};

/**
 * Generate a schema prompt section from the cached Databricks schema.
 * This is injected into the AI system prompt so Claude knows exact column names.
 */
export function getSchemaPromptForModule(module: string): string {
  let cache: SchemaCache;

  try {
    const raw = readFileSync(path.join(process.cwd(), 'cache', '_schema.json'), 'utf-8');
    cache = JSON.parse(raw);
  } catch {
    // Fallback to hardcoded schema if cache doesn't exist
    return getFallbackSchema(module);
  }

  const tables = MODULE_TABLES[module] || [];
  let prompt = `## Available Tables (auto-discovered from Databricks)\n`;
  prompt += `Schema refreshed: ${cache.lastRefresh || 'unknown'}\n\n`;

  let foundTables = 0;
  for (const tableName of tables) {
    const table = cache.tables[tableName];
    if (!table) continue;
    foundTables++;

    prompt += `### ${table.fullName}\n`;
    prompt += `Rows: ${(table.rowCount ?? 0).toLocaleString()}\n`;
    prompt += `Columns:\n`;

    for (const col of table.columns) {
      const comment = col.comment ? ` — ${col.comment}` : '';
      const samples = table.sampleValues[col.name];
      const sampleStr = samples
        ? ` (e.g., ${(samples ?? []).slice(0, 3).map((s) => `"${s}"`).join(', ')})`
        : '';
      prompt += `- ${col.name} (${col.type})${comment}${sampleStr}\n`;
    }
    prompt += '\n';
  }

  if (foundTables === 0) {
    // No tables found in cache - use fallback
    return getFallbackSchema(module);
  }

  prompt += `## IMPORTANT SQL Rules\n`;
  prompt += `- Always use fully qualified names: hive_metastore.schema.table\n`;
  prompt += `- String comparisons are CASE SENSITIVE in Databricks\n`;
  prompt += `- Use the EXACT column names shown above — do not guess\n`;
  prompt += `- Use the EXACT sample values shown above for WHERE clauses\n`;
  prompt += `- Date columns: use format matching the data type shown\n`;
  prompt += `- LIMIT results to 500 rows max\n`;

  return prompt;
}

/**
 * Fallback hardcoded schema - MUST match actual Databricks columns exactly.
 * Updated from DESCRIBE queries on actual Databricks tables.
 */
function getFallbackSchema(module: string): string {
  const schemas: Record<string, string> = {
    cx360: `## Available Tables (from Databricks - use EXACT column names)

### hive_metastore.retail_ml.clv_scores
Columns: customer_id (string), purchase_frequency (bigint), recency_days (int), customer_age_days (int), avg_transaction_value (double), predicted_purchases_12m (double), probability_alive (double), expected_avg_transaction (double), clv_12m (double), clv_12m_discounted (double), clv_tier (string), prediction_horizon_months (int), model_run_id (string), scored_at (timestamp)

### hive_metastore.retail_ml.churn_scores
Columns: customer_id (string), churn_probability_30d (double), churn_probability_60d (double), churn_probability_90d (double), churn_risk_tier (string)

### hive_metastore.retail_gold.gold_customer_360
Columns: customer_id (string), loyalty_tier (string), age_band (string), gender (string), city (string), original_segment (string), registration_date (date), total_transactions (bigint), total_spend (double), avg_basket_value (double), active_days (bigint), first_purchase_date_id (bigint), last_purchase_date_id (bigint), unique_products_bought (bigint), days_since_last_purchase (int), total_points_earned (bigint), total_points_redeemed (bigint), customer_segment (string)

### hive_metastore.retail_silver.dim_store
Columns: store_id (string), store_code (string), store_name (string), store_type (string), store_format (string), city (string), state (string), region (string), is_active (boolean)

### hive_metastore.retail_silver.dim_category
Columns: category_id (string), category_code (string), department_name (string), department_id (string), category_l1_name (string), category_l2_name (string), is_food (boolean), is_fmcg (boolean)

## SQL Rules
- Use fully qualified table names: hive_metastore.schema.table
- String comparisons are CASE SENSITIVE
- Use EXACT column names shown above - do NOT guess
- LIMIT results to 500 rows max`,

    demand: `## Available Tables (from Databricks - use EXACT column names)

### hive_metastore.retail_ml.forecast_output
Columns: product_id (string), store_id (string), horizon_days (int), target_date_id (int) — NOTE: this is INT not DATE format YYYYMMDD, forecast_qty (double), lower_80 (double), upper_80 (double), lower_95 (double), upper_95 (double), confidence_score (double), top3_features_json (string), department (string), store_type (string), abc_class (string), city (string), forecast_date (string), model_version (string), generated_at (timestamp), year (int), month_num (int)

### hive_metastore.retail_gold.gold_forecast_accuracy
Columns: accuracy_date (date), product_id (string), store_id (string), horizon_days (int), forecast_qty (double), quantity_sold (bigint), absolute_error (double), pct_error (double), bias (double), bias_pct (double), is_within_80 (int), confidence_score (double), department (string), store_type (string), abc_class (string), is_festival_period (boolean), is_weekend (boolean), is_monsoon_active (boolean), model_version (string), computed_at (timestamp)

### hive_metastore.retail_gold.gold_inventory_health
Columns: product_id (string), store_id (string), date_id (bigint), department (string), category_l1 (string), abc_class (string), is_perishable (boolean), city (string), store_type (string), opening_stock_qty (int), closing_stock_qty (int), days_of_stock (double), is_stockout (boolean), inventory_health_status (string), year (bigint), month_num (bigint)

### hive_metastore.retail_silver.dim_product
Columns: product_id (string), product_name (string), department (string), category_l1 (string), category_l2 (string), category_l3 (string), current_mrp (double), shelf_life_days (bigint), is_perishable (boolean), abc_class (string), is_active (boolean)

### hive_metastore.retail_silver.dim_store
Columns: store_id (string), store_name (string), store_type (string), city (string), state (string), region (string), is_active (boolean)

## SQL Rules
- Use fully qualified table names: hive_metastore.schema.table
- String comparisons are CASE SENSITIVE
- target_date_id is INT (YYYYMMDD format), not DATE - use CAST for comparisons
- Use EXACT column names shown above - do NOT guess
- LIMIT results to 500 rows max`,

    price: `## Available Tables (from Databricks - use EXACT column names)

### hive_metastore.retail_ml.price_recommendations
Columns: product_id (string), product_name (string), department (string), category (string), unit_cost (double), current_price (double), recommended_price (double), price_change_pct (double), current_margin_pct (double), projected_margin_pct (double), elasticity_estimate (double), total_transactions (bigint), current_revenue (double), projected_revenue (double), revenue_impact (double), recommendation_priority (string), model_run_id (string), created_at (timestamp)

### hive_metastore.retail_silver.dim_product
Columns: product_id (string), product_name (string), department (string), category_l1 (string), category_l2 (string), current_mrp (double), shelf_life_days (bigint), is_perishable (boolean), abc_class (string), is_active (boolean)

### hive_metastore.retail_silver.dim_store
Columns: store_id (string), store_name (string), store_type (string), city (string), state (string), region (string), is_active (boolean)

### hive_metastore.retail_silver.dim_category
Columns: category_id (string), department_name (string), category_l1_name (string), category_l2_name (string), is_food (boolean), is_fmcg (boolean)

## SQL Rules
- Use fully qualified table names: hive_metastore.schema.table
- String comparisons are CASE SENSITIVE
- Use EXACT column names shown above - do NOT guess
- LIMIT results to 500 rows max`,

    inventory: `## Available Tables (from Databricks - use EXACT column names)

### hive_metastore.retail_gold.gold_inventory_health
Columns: product_id (string), store_id (string), date_id (bigint), department (string), category_l1 (string), abc_class (string), is_perishable (boolean), city (string), store_type (string), opening_stock_qty (int), closing_stock_qty (int), days_of_stock (double), is_stockout (boolean), inventory_health_status (string), year (bigint), month_num (bigint)
NOTE: No product_name or store_name - JOIN with dim_product and dim_store for names

### hive_metastore.retail_ml.price_recommendations
Columns: product_id (string), product_name (string), department (string), category (string), unit_cost (double), current_price (double), recommended_price (double), price_change_pct (double), elasticity_estimate (double), recommendation_priority (string)

### hive_metastore.retail_ml.forecast_output
Columns: product_id (string), store_id (string), target_date_id (int), forecast_qty (double), confidence_score (double), department (string), city (string)

### hive_metastore.retail_gold.gold_forecast_accuracy
Columns: accuracy_date (date), product_id (string), store_id (string), forecast_qty (double), quantity_sold (bigint), bias_pct (double), department (string), is_festival_period (boolean)

### hive_metastore.retail_silver.dim_product
Columns: product_id (string), product_name (string), brand_id (string), department (string), category_l1 (string), category_l2 (string), current_mrp (double), shelf_life_days (bigint), is_perishable (boolean), abc_class (string), is_active (boolean)

### hive_metastore.retail_silver.dim_store
Columns: store_id (string), store_code (string), store_name (string), store_type (string), city (string), state (string), region (string), is_active (boolean)

### hive_metastore.retail_silver.dim_category
Columns: category_id (string), department_name (string), category_l1_name (string), category_l2_name (string), is_food (boolean), is_fmcg (boolean)

## SQL Rules - CRITICAL
- Use fully qualified table names: hive_metastore.schema.table
- String comparisons are CASE SENSITIVE
- gold_inventory_health does NOT have product_name/store_name - use JOINs:
  JOIN hive_metastore.retail_silver.dim_product p ON i.product_id = p.product_id
  JOIN hive_metastore.retail_silver.dim_store s ON i.store_id = s.store_id
- Use closing_stock_qty for current stock (NOT current_stock)
- Use days_of_stock for days of supply (NOT days_of_supply)
- Use inventory_health_status for status (NOT status)
- Use is_perishable to find perishable items
- LIMIT results to 500 rows max`,
  };

  return schemas[module] || schemas.cx360;
}

/**
 * Lookup a specific table's schema from the cache.
 * Used by the discover_schema tool.
 */
export function lookupTableSchema(
  searchTerm: string
): { table: string; columns: string[]; rowCount: number; sampleValues: Record<string, string[]> }[] {
  try {
    const raw = readFileSync(path.join(process.cwd(), 'cache', '_schema.json'), 'utf-8');
    const cache: SchemaCache = JSON.parse(raw);

    const search = (searchTerm ?? '').toLowerCase();
    return Object.entries(cache.tables)
      .filter(([key]) => key.toLowerCase().includes(search))
      .map(([, table]) => ({
        table: table.fullName,
        columns: table.columns.map(
          (c) => `${c.name} (${c.type})${c.comment ? ' — ' + c.comment : ''}`
        ),
        rowCount: table.rowCount,
        sampleValues: table.sampleValues,
      }));
  } catch {
    return [];
  }
}

/**
 * Get all available table names from the schema cache.
 */
export function getAvailableTables(): string[] {
  try {
    const raw = readFileSync(path.join(process.cwd(), 'cache', '_schema.json'), 'utf-8');
    const cache: SchemaCache = JSON.parse(raw);
    return Object.keys(cache.tables);
  } catch {
    return [];
  }
}
