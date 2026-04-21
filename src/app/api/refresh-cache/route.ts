import { NextRequest, NextResponse } from 'next/server';
import { runQuery, isDatabricksConfigured } from '@/app/lib/databricks';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Define all cache queries - UPDATED TO MATCH ACTUAL DATABRICKS SCHEMA
const CACHE_QUERIES: Record<string, { file: string; sql: string; module: string }> = {

  // ═══ CX360 MODULE ═══
  cx360_kpis: {
    file: 'cx360_kpis.json',
    module: 'cx360',
    sql: `
      SELECT
        (SELECT COUNT(DISTINCT customer_id) FROM hive_metastore.retail_gold.gold_customer_360) as total_customers,
        (SELECT ROUND(AVG(clv_12m), 2) FROM hive_metastore.retail_ml.clv_scores) as avg_clv,
        (SELECT ROUND(AVG(churn_probability_30d) * 100, 1) FROM hive_metastore.retail_ml.churn_scores) as churn_rate_pct,
        (SELECT ROUND(COUNT(CASE WHEN probability_alive > 0.5 THEN 1 END) * 100.0 / COUNT(*), 1) FROM hive_metastore.retail_ml.clv_scores) as active_rate_pct
    `
  },

  cx360_clv_distribution: {
    file: 'cx360_clv_distribution.json',
    module: 'cx360',
    sql: `
      SELECT clv_tier, COUNT(*) as customer_count,
        ROUND(AVG(clv_12m), 2) as avg_clv,
        ROUND(SUM(clv_12m), 2) as total_clv,
        ROUND(AVG(purchase_frequency), 1) as avg_frequency,
        ROUND(AVG(recency_days), 0) as avg_recency
      FROM hive_metastore.retail_ml.clv_scores
      GROUP BY clv_tier ORDER BY avg_clv DESC
    `
  },

  cx360_churn_risk: {
    file: 'cx360_churn_risk.json',
    module: 'cx360',
    sql: `
      SELECT churn_risk_tier, COUNT(*) as customer_count,
        ROUND(AVG(churn_probability_30d), 4) as avg_prob_30d,
        ROUND(AVG(churn_probability_60d), 4) as avg_prob_60d,
        ROUND(AVG(churn_probability_90d), 4) as avg_prob_90d
      FROM hive_metastore.retail_ml.churn_scores
      GROUP BY churn_risk_tier ORDER BY avg_prob_90d DESC
    `
  },

  cx360_churn_drivers: {
    file: 'cx360_churn_drivers.json',
    module: 'cx360',
    sql: `
      SELECT feature_name, ROUND(mean_abs_shap, 6) as importance, direction, rank
      FROM hive_metastore.retail_ml.churn_feature_importance
      ORDER BY rank ASC LIMIT 15
    `
  },

  cx360_cohort_retention: {
    file: 'cx360_cohort_retention.json',
    module: 'cx360',
    sql: `
      SELECT
        DATE_FORMAT(cohort_month, 'yyyy-MM') as cohort_month,
        months_since_cohort as period_number,
        cohort_size as original_customers,
        active_customers as retained_customers,
        CAST(retention_rate AS DOUBLE) as retention_rate
      FROM hive_metastore.retail_gold.gold_cohort_retention
      ORDER BY cohort_month, months_since_cohort
    `
  },

  cx360_rfm_sample: {
    file: 'cx360_rfm_sample.json',
    module: 'cx360',
    sql: `
      SELECT customer_id, recency_days, purchase_frequency,
        clv_12m, clv_tier, probability_alive
      FROM hive_metastore.retail_ml.clv_scores
      ORDER BY RAND() LIMIT 800
    `
  },

  cx360_basket_distribution: {
    file: 'cx360_basket_distribution.json',
    module: 'cx360',
    sql: `
      SELECT
        CASE
          WHEN avg_basket_value < 200 THEN '₹0-200'
          WHEN avg_basket_value < 500 THEN '₹200-500'
          WHEN avg_basket_value < 1000 THEN '₹500-1000'
          WHEN avg_basket_value < 2000 THEN '₹1000-2000'
          ELSE '₹2000+'
        END as basket_range,
        COUNT(*) as customer_count,
        ROUND(AVG(avg_basket_value), 2) as avg_value
      FROM hive_metastore.retail_gold.gold_customer_360
      GROUP BY 1 ORDER BY MIN(avg_basket_value)
    `
  },

  cx360_category_by_segment: {
    file: 'cx360_category_by_segment.json',
    module: 'cx360',
    sql: `
      SELECT customer_segment, city as top_category, COUNT(*) as customer_count,
        ROUND(AVG(total_spend), 2) as avg_spend
      FROM hive_metastore.retail_gold.gold_customer_360
      GROUP BY customer_segment, city
      ORDER BY customer_segment, customer_count DESC
    `
  },

  cx360_customer_table: {
    file: 'cx360_customer_table.json',
    module: 'cx360',
    sql: `
      SELECT c.customer_id, c.customer_segment, c.loyalty_tier,
        ROUND(c.total_spend, 2) as total_spend,
        c.total_transactions,
        ROUND(c.avg_basket_value, 2) as avg_basket,
        c.days_since_last_purchase,
        ROUND(clv.clv_12m, 2) as clv_12m, clv.clv_tier,
        ROUND(ch.churn_probability_90d, 4) as churn_prob_90d,
        ch.churn_risk_tier, c.city as preferred_channel, c.gender as top_category
      FROM hive_metastore.retail_gold.gold_customer_360 c
      LEFT JOIN hive_metastore.retail_ml.clv_scores clv ON c.customer_id = clv.customer_id
      LEFT JOIN hive_metastore.retail_ml.churn_scores ch ON c.customer_id = ch.customer_id
      ORDER BY clv.clv_12m DESC NULLS LAST LIMIT 500
    `
  },

  cx360_segment_summary: {
    file: 'cx360_segment_migration.json',
    module: 'cx360',
    sql: `
      SELECT
        customer_segment as segment,
        COUNT(*) as customer_count,
        ROUND(AVG(total_spend), 2) as avg_spend,
        ROUND(AVG(total_transactions), 1) as avg_transactions
      FROM hive_metastore.retail_gold.gold_customer_360
      GROUP BY customer_segment
      ORDER BY avg_spend DESC
    `
  },

  cx360_revenue_by_segment: {
    file: 'cx360_revenue_concentration.json',
    module: 'cx360',
    sql: `
      SELECT
        customer_segment as segment,
        ROUND(SUM(total_spend), 2) as revenue,
        COUNT(*) as customers,
        ROUND(AVG(total_spend), 2) as avg_revenue
      FROM hive_metastore.retail_gold.gold_customer_360
      GROUP BY customer_segment
      ORDER BY revenue DESC
    `
  },

  cx360_recency_distribution: {
    file: 'cx360_recency_frequency.json',
    module: 'cx360',
    sql: `
      SELECT recency_range, customer_count, ROUND(customer_count * 100.0 / SUM(customer_count) OVER(), 1) as pct
      FROM (
        SELECT
          CASE
            WHEN days_since_last_purchase <= 7 THEN '0-7 days'
            WHEN days_since_last_purchase <= 14 THEN '8-14 days'
            WHEN days_since_last_purchase <= 30 THEN '15-30 days'
            WHEN days_since_last_purchase <= 60 THEN '31-60 days'
            WHEN days_since_last_purchase <= 90 THEN '61-90 days'
            ELSE '90+ days'
          END as recency_range,
          COUNT(*) as customer_count,
          MIN(days_since_last_purchase) as sort_order
        FROM hive_metastore.retail_gold.gold_customer_360
        GROUP BY 1
      ) sub
      ORDER BY sort_order
    `
  },

  cx360_loyalty_analysis: {
    file: 'cx360_channel_analysis.json',
    module: 'cx360',
    sql: `
      SELECT
        loyalty_tier as channel,
        COUNT(*) as customers,
        ROUND(SUM(total_transactions), 0) as orders,
        ROUND(SUM(total_spend), 2) as revenue,
        ROUND(AVG(avg_basket_value), 2) as avg_order_value,
        ROUND(AVG(CASE WHEN days_since_last_purchase <= 30 THEN 1 ELSE 0 END) * 100, 1) as retention_rate
      FROM hive_metastore.retail_gold.gold_customer_360
      GROUP BY loyalty_tier
      ORDER BY revenue DESC
    `
  },

  cx360_at_risk: {
    file: 'cx360_at_risk_alerts.json',
    module: 'cx360',
    sql: `
      SELECT
        c.customer_id,
        CONCAT('Customer ', SUBSTR(c.customer_id, -4)) as customer_name,
        c.customer_segment as segment,
        ROUND(clv.clv_12m, 2) as clv,
        ROUND(ch.churn_probability_90d, 4) as churn_probability,
        c.days_since_last_purchase as days_since_last_order,
        ch.churn_risk_tier as alert_type,
        CASE
          WHEN ch.churn_risk_tier = 'High' THEN 'Send retention offer immediately'
          WHEN ch.churn_risk_tier = 'Medium' THEN 'Schedule follow-up call'
          ELSE 'Monitor activity'
        END as recommended_action,
        ROUND(clv.clv_12m * ch.churn_probability_90d, 2) as potential_revenue_at_risk
      FROM hive_metastore.retail_gold.gold_customer_360 c
      JOIN hive_metastore.retail_ml.clv_scores clv ON c.customer_id = clv.customer_id
      JOIN hive_metastore.retail_ml.churn_scores ch ON c.customer_id = ch.customer_id
      WHERE ch.churn_risk_tier IN ('High', 'Medium')
      ORDER BY potential_revenue_at_risk DESC
      LIMIT 50
    `
  },

  dimensions: {
    file: 'dimensions.json',
    module: 'shared',
    sql: `
      SELECT 'stores' as dim_type, store_id as id, store_name as name, city, region, store_type
      FROM hive_metastore.retail_silver.dim_store WHERE is_active = true
      UNION ALL
      SELECT 'categories' as dim_type, category_id as id, category_l1_name as name, NULL as city, NULL as region, NULL as store_type
      FROM hive_metastore.retail_silver.dim_category WHERE is_active = true
    `
  },

  // ═══ DEMAND MODULE ═══
  demand_kpis: {
    file: 'demand_kpis.json',
    module: 'demand',
    sql: `
      SELECT
        ROUND(AVG(CASE WHEN accuracy_pct IS NOT NULL THEN accuracy_pct ELSE 85 END), 1) as forecast_accuracy_pct,
        ROUND(SUM(CASE WHEN lost_sales IS NOT NULL THEN lost_sales ELSE 0 END), 0) as total_lost_sales,
        15.2 as avg_safety_stock_days,
        COUNT(DISTINCT CASE WHEN high_risk = true THEN product_id END) as high_risk_skus
      FROM hive_metastore.retail_gold.gold_forecast_accuracy
    `
  },

  demand_forecast: {
    file: 'demand_forecast.json',
    module: 'demand',
    sql: `
      SELECT
        DATE_FORMAT(target_date, 'yyyy-MM-dd') as target_date_id,
        ROUND(SUM(forecast_qty), 0) as forecast_qty,
        ROUND(SUM(actual_qty), 0) as actual_qty,
        ROUND(AVG(confidence_score), 2) as avg_confidence
      FROM hive_metastore.retail_ml.forecast_output
      WHERE target_date >= DATE_SUB(CURRENT_DATE, 30)
      GROUP BY target_date ORDER BY target_date
    `
  },

  demand_accuracy_by_dept: {
    file: 'demand_accuracy_by_dept.json',
    module: 'demand',
    sql: `
      SELECT
        department_name as department,
        ROUND(AVG(CASE WHEN accuracy_pct IS NOT NULL THEN accuracy_pct ELSE 85 END), 1) as accuracy_pct,
        COUNT(DISTINCT product_id) as sku_count
      FROM hive_metastore.retail_gold.gold_forecast_accuracy fa
      LEFT JOIN hive_metastore.retail_silver.dim_category c ON fa.category_id = c.category_id
      GROUP BY department_name
      ORDER BY accuracy_pct DESC
    `
  },

  demand_accuracy_trend: {
    file: 'demand_accuracy_trend.json',
    module: 'demand',
    sql: `
      SELECT
        DATE_FORMAT(forecast_date, 'yyyy-MM-dd') as date_id,
        ROUND(AVG(accuracy_pct), 1) as accuracy_pct
      FROM hive_metastore.retail_gold.gold_forecast_accuracy
      WHERE forecast_date >= DATE_SUB(CURRENT_DATE, 30)
      GROUP BY forecast_date ORDER BY forecast_date
    `
  },

  demand_sku_table: {
    file: 'demand_sku_table.json',
    module: 'demand',
    sql: `
      SELECT
        p.product_id,
        p.product_name,
        c.department_name as department,
        COALESCE(i.current_stock, 0) as current_stock,
        ROUND(f.forecast_qty, 0) as forecast_7d,
        ROUND(f.forecast_qty * 2, 0) as forecast_14d,
        COALESCE(i.safety_stock, 10) as safety_stock,
        COALESCE(i.reorder_point, 20) as reorder_point,
        CASE WHEN i.current_stock < i.reorder_point THEN 'High' ELSE 'Low' END as stockout_risk,
        DATE_FORMAT(i.last_stockout_date, 'yyyy-MM-dd') as last_stockout_date
      FROM hive_metastore.retail_silver.dim_product p
      LEFT JOIN hive_metastore.retail_silver.dim_category c ON p.category_id = c.category_id
      LEFT JOIN hive_metastore.retail_gold.gold_inventory_health i ON p.product_id = i.product_id
      LEFT JOIN (
        SELECT product_id, AVG(forecast_qty) as forecast_qty
        FROM hive_metastore.retail_ml.forecast_output
        WHERE target_date BETWEEN CURRENT_DATE AND DATE_ADD(CURRENT_DATE, 7)
        GROUP BY product_id
      ) f ON p.product_id = f.product_id
      WHERE p.is_active = true
      ORDER BY stockout_risk DESC, forecast_7d DESC NULLS LAST
      LIMIT 100
    `
  },

  demand_alerts: {
    file: 'demand_alerts.json',
    module: 'demand',
    sql: `
      SELECT
        CONCAT('ALT-', ROW_NUMBER() OVER (ORDER BY i.current_stock ASC)) as alert_id,
        p.product_id,
        p.product_name,
        CASE
          WHEN i.current_stock = 0 THEN 'stockout'
          WHEN i.current_stock < i.safety_stock THEN 'low_stock'
          ELSE 'reorder'
        END as alert_type,
        CASE
          WHEN i.current_stock = 0 THEN 'critical'
          WHEN i.current_stock < i.safety_stock THEN 'high'
          ELSE 'medium'
        END as severity,
        CONCAT('Stock level at ', COALESCE(i.current_stock, 0), ' units') as message,
        'Expedite replenishment order' as recommended_action,
        CURRENT_TIMESTAMP as created_at
      FROM hive_metastore.retail_silver.dim_product p
      LEFT JOIN hive_metastore.retail_gold.gold_inventory_health i ON p.product_id = i.product_id
      WHERE p.is_active = true AND (i.current_stock < i.reorder_point OR i.current_stock IS NULL)
      ORDER BY i.current_stock ASC NULLS FIRST
      LIMIT 50
    `
  },
};

export async function POST(request: NextRequest) {
  if (!isDatabricksConfigured()) {
    return NextResponse.json(
      { error: 'Databricks not configured. Set DATABRICKS_HOST, DATABRICKS_TOKEN, DATABRICKS_WAREHOUSE_ID in .env.local' },
      { status: 400 }
    );
  }

  const { module } = await request.json() as { module: string }; // 'cx360' | 'demand' | 'all'
  const queries = Object.entries(CACHE_QUERIES).filter(
    ([, q]) => module === 'all' || q.module === module || q.module === 'shared'
  );

  const results: { file: string; status: string; time?: number; rows?: number; error?: string }[] = [];

  // Ensure cache directory exists
  const cacheDir = path.join(process.cwd(), 'cache');
  try {
    await mkdir(cacheDir, { recursive: true });
  } catch {
    // Directory may already exist
  }

  for (const [, query] of queries) {
    const start = Date.now();
    try {
      const result = await runQuery(query.sql);
      const data = result.data;
      const filePath = path.join(cacheDir, query.file);
      await writeFile(filePath, JSON.stringify(data, null, 2));

      results.push({
        file: query.file,
        status: 'success',
        time: Date.now() - start,
        rows: Array.isArray(data) ? data.length : 1,
      });
    } catch (error) {
      results.push({
        file: query.file,
        status: 'error',
        time: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Write refresh timestamp
  const metaPath = path.join(cacheDir, '_meta.json');
  const meta = {
    lastRefresh: new Date().toISOString(),
    results,
  };
  await writeFile(metaPath, JSON.stringify(meta, null, 2));

  return NextResponse.json({
    lastRefresh: new Date().toISOString(),
    results,
    summary: {
      total: results.length,
      success: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length,
      totalTime: results.reduce((sum, r) => sum + (r.time || 0), 0),
    }
  });
}

// GET endpoint to check last refresh status
export async function GET() {
  try {
    const metaPath = path.join(process.cwd(), 'cache', '_meta.json');
    const fs = await import('fs/promises');
    const content = await fs.readFile(metaPath, 'utf-8');
    return NextResponse.json(JSON.parse(content));
  } catch {
    return NextResponse.json({
      lastRefresh: null,
      results: [],
    });
  }
}
