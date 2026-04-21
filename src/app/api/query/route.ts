import { NextRequest, NextResponse } from 'next/server';
import { runQuery, isDatabricksConfigured } from '@/app/lib/databricks';
import crypto from 'crypto';

// In-memory cache (Tier 2)
const queryCache = new Map<string, { data: unknown[]; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// Query parameter types
interface QueryParams {
  customerId?: string;
  productId?: string;
  segment?: string;
  loyaltyTier?: string;
  channel?: string;
  query?: string;
  limit?: number;
}

// Named query templates - use parameterized patterns to prevent SQL injection
const QUERY_TEMPLATES: Record<string, (params: QueryParams) => string> = {

  // Customer detail — triggered when user clicks into a customer
  customer_detail: (p) => `
    SELECT c.*, clv.clv_12m, clv.clv_tier, clv.probability_alive,
      clv.predicted_purchases_12m, clv.purchase_frequency, clv.recency_days,
      ch.churn_probability_30d, ch.churn_probability_90d, ch.churn_risk_tier
    FROM hive_metastore.retail_gold.gold_customer_360 c
    LEFT JOIN hive_metastore.retail_ml.clv_scores clv ON c.customer_id = clv.customer_id
    LEFT JOIN hive_metastore.retail_ml.churn_scores ch ON c.customer_id = ch.customer_id
    WHERE c.customer_id = '${sanitizeParam(p.customerId)}'
  `,

  // Customer recent transactions
  customer_transactions: (p) => `
    SELECT date_id, store_id, total_amount, total_items, channel
    FROM hive_metastore.retail_silver.fact_pos_sales
    WHERE customer_id = '${sanitizeParam(p.customerId)}'
    ORDER BY date_id DESC LIMIT 20
  `,

  // Product detail — triggered when user clicks into a product
  product_forecast: (p) => `
    SELECT target_date_id, forecast_qty, lower_80, upper_80, lower_95, upper_95,
      confidence_score, store_id, city
    FROM hive_metastore.retail_ml.forecast_output
    WHERE product_id = '${sanitizeParam(p.productId)}'
    ORDER BY target_date_id DESC LIMIT 100
  `,

  // Filtered aggregation — triggered when filter combo isn't in cache
  filtered_clv: (p) => `
    SELECT clv_tier, COUNT(*) as customer_count, ROUND(AVG(clv_12m), 2) as avg_clv
    FROM hive_metastore.retail_ml.clv_scores clv
    JOIN hive_metastore.retail_gold.gold_customer_360 c ON clv.customer_id = c.customer_id
    WHERE 1=1
    ${p.segment ? `AND c.customer_segment = '${sanitizeParam(p.segment)}'` : ''}
    ${p.loyaltyTier ? `AND c.loyalty_tier = '${sanitizeParam(p.loyaltyTier)}'` : ''}
    ${p.channel ? `AND c.preferred_channel = '${sanitizeParam(p.channel)}'` : ''}
    GROUP BY clv_tier ORDER BY avg_clv DESC
  `,

  // Customer search
  customer_search: (p) => `
    SELECT c.customer_id, c.customer_segment, c.loyalty_tier,
      ROUND(clv.clv_12m, 2) as clv_12m, ch.churn_risk_tier
    FROM hive_metastore.retail_gold.gold_customer_360 c
    LEFT JOIN hive_metastore.retail_ml.clv_scores clv ON c.customer_id = clv.customer_id
    LEFT JOIN hive_metastore.retail_ml.churn_scores ch ON c.customer_id = ch.customer_id
    WHERE c.customer_id LIKE '%${sanitizeParam(p.query)}%'
      OR LOWER(c.customer_segment) LIKE LOWER('%${sanitizeParam(p.query)}%')
    LIMIT 10
  `,

  // Full customer table export
  customer_table_full: () => `
    SELECT c.customer_id, c.customer_segment, c.loyalty_tier,
      ROUND(c.total_spend_lifetime, 2) as total_spend,
      c.total_transactions,
      ROUND(c.avg_basket_value, 2) as avg_basket,
      c.days_since_last_purchase,
      ROUND(clv.clv_12m, 2) as clv_12m, clv.clv_tier,
      ROUND(ch.churn_probability_90d, 4) as churn_prob_90d,
      ch.churn_risk_tier, c.preferred_channel, c.top_category
    FROM hive_metastore.retail_gold.gold_customer_360 c
    LEFT JOIN hive_metastore.retail_ml.clv_scores clv ON c.customer_id = clv.customer_id
    LEFT JOIN hive_metastore.retail_ml.churn_scores ch ON c.customer_id = ch.customer_id
    ORDER BY clv.clv_12m DESC
    LIMIT 5000
  `,

  // Product search for demand module
  product_search: (p) => `
    SELECT product_id, product_name, department, current_stock, stockout_risk
    FROM hive_metastore.retail_ml.sku_inventory_status
    WHERE product_id LIKE '%${sanitizeParam(p.query)}%'
      OR LOWER(product_name) LIKE LOWER('%${sanitizeParam(p.query)}%')
    LIMIT 10
  `,

  // Product detail with forecast
  product_detail: (p) => `
    SELECT s.*, f.forecast_7d, f.forecast_14d, f.forecast_30d,
      f.confidence_score, f.trend_direction
    FROM hive_metastore.retail_ml.sku_inventory_status s
    LEFT JOIN hive_metastore.retail_ml.sku_forecast_summary f ON s.product_id = f.product_id
    WHERE s.product_id = '${sanitizeParam(p.productId)}'
  `,

  // Filtered churn risk
  filtered_churn: (p) => `
    SELECT ch.churn_risk_tier, COUNT(*) as customer_count,
      ROUND(AVG(ch.churn_probability_90d), 4) as avg_prob_90d
    FROM hive_metastore.retail_ml.churn_scores ch
    JOIN hive_metastore.retail_gold.gold_customer_360 c ON ch.customer_id = c.customer_id
    WHERE 1=1
    ${p.segment ? `AND c.customer_segment = '${sanitizeParam(p.segment)}'` : ''}
    ${p.loyaltyTier ? `AND c.loyalty_tier = '${sanitizeParam(p.loyaltyTier)}'` : ''}
    GROUP BY ch.churn_risk_tier ORDER BY avg_prob_90d DESC
  `,
};

// Sanitize parameters to prevent SQL injection
function sanitizeParam(value: string | undefined): string {
  if (!value) return '';
  // Remove any SQL injection characters
  return value.replace(/['";\\]/g, '').substring(0, 100);
}

// Execute mock query when Databricks is not available
function executeMockQuery(queryName: string, params: QueryParams): unknown[] {
  // Return mock data based on query type
  switch (queryName) {
    case 'customer_detail':
      return [{
        customer_id: params.customerId,
        customer_segment: 'Premium',
        loyalty_tier: 'Gold',
        total_spend_lifetime: 125000,
        total_transactions: 45,
        avg_basket_value: 2778,
        days_since_last_purchase: 12,
        preferred_channel: 'In-Store',
        top_category: 'Electronics',
        clv_12m: 45000,
        clv_tier: 'High',
        probability_alive: 0.85,
        predicted_purchases_12m: 18,
        purchase_frequency: 3.2,
        recency_days: 12,
        churn_probability_30d: 0.08,
        churn_probability_90d: 0.15,
        churn_risk_tier: 'Low',
      }];
    case 'customer_transactions':
      return Array.from({ length: 10 }, (_, i) => ({
        date_id: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        store_id: `STORE-${Math.floor(Math.random() * 10) + 1}`,
        total_amount: Math.floor(Math.random() * 5000) + 500,
        total_items: Math.floor(Math.random() * 10) + 1,
        channel: Math.random() > 0.5 ? 'In-Store' : 'Online',
      }));
    case 'customer_search':
      return [
        { customer_id: 'CUST00001', customer_segment: 'Premium', loyalty_tier: 'Gold', clv_12m: 45000, churn_risk_tier: 'Low' },
        { customer_id: 'CUST00012', customer_segment: 'Regular', loyalty_tier: 'Silver', clv_12m: 18000, churn_risk_tier: 'Medium' },
      ];
    case 'product_forecast':
      return Array.from({ length: 30 }, (_, i) => ({
        target_date_id: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        forecast_qty: Math.floor(Math.random() * 100) + 50,
        lower_80: Math.floor(Math.random() * 80) + 30,
        upper_80: Math.floor(Math.random() * 120) + 70,
        lower_95: Math.floor(Math.random() * 60) + 20,
        upper_95: Math.floor(Math.random() * 140) + 80,
        confidence_score: 0.85 + Math.random() * 0.1,
        store_id: 'ALL',
        city: 'Aggregate',
      }));
    default:
      return [];
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const { queryName, params = {} } = await request.json() as { queryName: string; params: QueryParams };

  // Validate query name
  if (!QUERY_TEMPLATES[queryName]) {
    return NextResponse.json({ error: `Unknown query: ${queryName}` }, { status: 400 });
  }

  // Generate cache key
  const cacheKey = crypto
    .createHash('md5')
    .update(queryName + JSON.stringify(params))
    .digest('hex');

  // Check Tier 2 cache
  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({
      data: cached.data,
      source: 'cache',
      cachedAt: new Date(cached.timestamp).toISOString(),
      executionTime: Date.now() - startTime,
    });
  }

  // Generate SQL
  const sql = QUERY_TEMPLATES[queryName](params);

  // Execute query
  try {
    let data: unknown[];
    let source: string;

    if (isDatabricksConfigured()) {
      const result = await runQuery(sql);
      data = result.data;
      source = 'databricks';
    } else {
      data = executeMockQuery(queryName, params);
      source = 'mock';
    }

    // Store in Tier 2 cache
    queryCache.set(cacheKey, { data, timestamp: Date.now() });

    return NextResponse.json({
      data,
      source,
      sql: source === 'databricks' ? sql : undefined,
      executionTime: Date.now() - startTime,
      rowCount: data.length,
    });
  } catch (error) {
    console.error('Query error:', error);

    // Fall back to mock data on error
    const mockData = executeMockQuery(queryName, params);
    return NextResponse.json({
      data: mockData,
      source: 'mock',
      error: error instanceof Error ? error.message : 'Query failed',
      executionTime: Date.now() - startTime,
      rowCount: mockData.length,
    });
  }
}

// Clear cache endpoint (for testing/debugging)
export async function DELETE() {
  queryCache.clear();
  return NextResponse.json({ message: 'Query cache cleared' });
}
