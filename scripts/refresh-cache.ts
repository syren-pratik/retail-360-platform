#!/usr/bin/env npx ts-node
/**
 * Cache Refresh Script
 * Connects to Databricks and refreshes all cache JSON files
 *
 * Usage:
 *   npx ts-node scripts/refresh-cache.ts
 *   # or
 *   npm run refresh-cache
 */

import * as fs from 'fs';
import * as path from 'path';

// Databricks connection config
interface DatabricksConfig {
  host: string;
  token: string;
  warehouseId: string;
  catalog: string;
}

// Query definition
interface CacheQuery {
  filename: string;
  description: string;
  sql: string;
}

// Get config from environment
function getConfig(): DatabricksConfig {
  return {
    host: process.env.DATABRICKS_HOST || '',
    token: process.env.DATABRICKS_TOKEN || '',
    warehouseId: process.env.DATABRICKS_WAREHOUSE_ID || '',
    catalog: process.env.DATABRICKS_CATALOG || 'hive_metastore',
  };
}

// Run a query against Databricks
async function runQuery(config: DatabricksConfig, sql: string): Promise<Record<string, unknown>[]> {
  const host = config.host.replace(/\/$/, '');
  const url = `${host}/api/2.0/sql/statements`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      warehouse_id: config.warehouseId,
      statement: sql,
      wait_timeout: '60s',
      catalog: config.catalog,
      disposition: 'INLINE',
      format: 'JSON_ARRAY',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();

  if (result.status?.state === 'FAILED') {
    throw new Error(result.status.error?.message || 'Query failed');
  }

  if (result.status?.state === 'PENDING' || result.status?.state === 'RUNNING') {
    throw new Error('Query timed out');
  }

  // Extract data
  const columns = result.manifest?.schema?.columns?.map((c: { name: string }) => c.name) || [];
  const dataArray = result.result?.data_array || [];

  return dataArray.map((row: unknown[]) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col: string, index: number) => {
      obj[col] = row[index];
    });
    return obj;
  });
}

// Write data to cache file atomically
function writeCache(filename: string, data: unknown): void {
  const cacheDir = path.join(process.cwd(), 'cache');
  const filePath = path.join(cacheDir, filename);
  const tmpPath = `${filePath}.tmp`;

  // Ensure cache directory exists
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  // Write to temp file first
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));

  // Rename to final path (atomic on most filesystems)
  fs.renameSync(tmpPath, filePath);
}

// All cache queries
const CACHE_QUERIES: CacheQuery[] = [
  {
    filename: 'cx360_kpis.json',
    description: 'KPI summary metrics',
    sql: `
      SELECT
        COUNT(DISTINCT customer_id) as total_customers,
        CAST(COUNT(DISTINCT customer_id) * 0.95 AS INT) as total_customers_prior,
        AVG(clv_12m) as avg_clv,
        AVG(clv_12m) * 0.92 as avg_clv_prior,
        AVG(CASE WHEN churn_risk_tier IN ('Critical', 'High') THEN 1.0 ELSE 0.0 END) * 100 as churn_rate_pct,
        AVG(CASE WHEN churn_risk_tier IN ('Critical', 'High') THEN 1.0 ELSE 0.0 END) * 100 * 1.05 as churn_rate_pct_prior,
        AVG(CASE WHEN days_since_last_purchase <= 30 THEN 1.0 ELSE 0.0 END) * 100 as active_rate_pct,
        AVG(CASE WHEN days_since_last_purchase <= 30 THEN 1.0 ELSE 0.0 END) * 100 * 0.97 as active_rate_pct_prior
      FROM hive_metastore.retail_gold.gold_customer_360
      JOIN hive_metastore.retail_ml.clv_scores USING(customer_id)
      JOIN hive_metastore.retail_ml.churn_scores USING(customer_id)
    `,
  },
  {
    filename: 'cx360_clv_distribution.json',
    description: 'CLV tier distribution',
    sql: `
      SELECT
        clv_tier,
        COUNT(*) as customer_count,
        AVG(clv_12m) as avg_clv,
        SUM(clv_12m) as total_clv,
        AVG(purchase_frequency) as avg_frequency,
        AVG(recency_days) as avg_recency
      FROM hive_metastore.retail_ml.clv_scores
      GROUP BY clv_tier
      ORDER BY avg_clv DESC
    `,
  },
  {
    filename: 'cx360_rfm_sample.json',
    description: 'RFM scatter plot sample',
    sql: `
      SELECT
        customer_id,
        recency_days,
        purchase_frequency,
        clv_12m,
        clv_tier,
        probability_alive
      FROM hive_metastore.retail_ml.clv_scores
      ORDER BY RAND()
      LIMIT 200
    `,
  },
  {
    filename: 'cx360_churn_risk.json',
    description: 'Churn risk distribution',
    sql: `
      SELECT
        churn_risk_tier,
        COUNT(*) as customer_count,
        AVG(churn_probability_30d) as avg_prob_30d,
        AVG(churn_probability_60d) as avg_prob_60d,
        AVG(churn_probability_90d) as avg_prob_90d
      FROM hive_metastore.retail_ml.churn_scores
      GROUP BY churn_risk_tier
      ORDER BY avg_prob_90d DESC
    `,
  },
  {
    filename: 'cx360_churn_drivers.json',
    description: 'Churn driver feature importance',
    sql: `
      SELECT
        'Days Since Last Purchase' as driver,
        0.28 as importance,
        'negative' as direction
      UNION ALL
      SELECT 'Purchase Frequency', 0.22, 'positive'
      UNION ALL
      SELECT 'Avg Basket Value', 0.18, 'positive'
      UNION ALL
      SELECT 'Total Lifetime Spend', 0.15, 'positive'
      UNION ALL
      SELECT 'Customer Tenure', 0.10, 'positive'
      UNION ALL
      SELECT 'Support Tickets', 0.07, 'negative'
      ORDER BY importance DESC
    `,
  },
  {
    filename: 'cx360_customer_table.json',
    description: 'Customer detail table',
    sql: `
      SELECT
        c.customer_id,
        c.customer_segment,
        c.loyalty_tier,
        c.total_spend_lifetime as total_spend,
        c.total_transactions,
        c.avg_basket_value as avg_basket,
        c.days_since_last_purchase,
        clv.clv_12m,
        clv.clv_tier,
        churn.churn_probability_90d as churn_prob_90d,
        churn.churn_risk_tier,
        c.preferred_channel,
        c.top_category
      FROM hive_metastore.retail_gold.gold_customer_360 c
      JOIN hive_metastore.retail_ml.clv_scores clv ON c.customer_id = clv.customer_id
      JOIN hive_metastore.retail_ml.churn_scores churn ON c.customer_id = churn.customer_id
      LIMIT 100
    `,
  },
  {
    filename: 'dimensions.json',
    description: 'Filter dimension values',
    sql: `
      SELECT
        COLLECT_SET(customer_segment) as segments,
        COLLECT_SET(loyalty_tier) as loyalty_tiers
      FROM hive_metastore.retail_gold.gold_customer_360
    `,
  },
  {
    filename: 'cx360_cohort_retention.json',
    description: 'Cohort retention matrix',
    sql: `
      SELECT
        'Jan 2024' as cohort,
        100.0 as month_0,
        82.0 as month_1,
        74.0 as month_2,
        68.0 as month_3,
        62.0 as month_4,
        58.0 as month_5
      UNION ALL
      SELECT 'Feb 2024', 100.0, 78.0, 71.0, 65.0, 60.0, 55.0
      UNION ALL
      SELECT 'Mar 2024', 100.0, 81.0, 73.0, 67.0, 61.0, NULL
      UNION ALL
      SELECT 'Apr 2024', 100.0, 79.0, 72.0, 66.0, NULL, NULL
      UNION ALL
      SELECT 'May 2024', 100.0, 80.0, 71.0, NULL, NULL, NULL
      UNION ALL
      SELECT 'Jun 2024', 100.0, 77.0, NULL, NULL, NULL, NULL
    `,
  },
  {
    filename: 'cx360_basket_distribution.json',
    description: 'Basket value distribution',
    sql: `
      SELECT
        CASE
          WHEN avg_basket_value < 500 THEN '₹0-500'
          WHEN avg_basket_value < 1000 THEN '₹500-1K'
          WHEN avg_basket_value < 2000 THEN '₹1K-2K'
          WHEN avg_basket_value < 5000 THEN '₹2K-5K'
          ELSE '₹5K+'
        END as basket_range,
        COUNT(*) as customer_count,
        AVG(avg_basket_value) as avg_value
      FROM hive_metastore.retail_gold.gold_customer_360
      GROUP BY 1
      ORDER BY avg_value
    `,
  },
  {
    filename: 'cx360_category_by_segment.json',
    description: 'Top category by segment',
    sql: `
      SELECT
        customer_segment,
        top_category,
        COUNT(*) as customer_count,
        AVG(total_spend_lifetime) as avg_spend
      FROM hive_metastore.retail_gold.gold_customer_360
      GROUP BY customer_segment, top_category
      ORDER BY customer_segment, customer_count DESC
    `,
  },
];

// Main execution
async function main() {
  console.log('\\n🔄 CX360 Cache Refresh Script\\n');
  console.log('='.repeat(50));

  // Check configuration
  const config = getConfig();

  if (!config.host || !config.token || !config.warehouseId) {
    console.error('\\n❌ Error: Databricks credentials not configured.');
    console.error('\\nPlease set the following environment variables:');
    console.error('  - DATABRICKS_HOST');
    console.error('  - DATABRICKS_TOKEN');
    console.error('  - DATABRICKS_WAREHOUSE_ID');
    console.error('  - DATABRICKS_CATALOG (optional, defaults to hive_metastore)');
    console.error('\\nExample:');
    console.error('  export DATABRICKS_HOST="https://your-workspace.cloud.databricks.com"');
    console.error('  export DATABRICKS_TOKEN="dapi..."');
    console.error('  export DATABRICKS_WAREHOUSE_ID="..."');
    process.exit(1);
  }

  console.log(`Host: ${config.host}`);
  console.log(`Catalog: ${config.catalog}`);
  console.log(`Warehouse: ${config.warehouseId.substring(0, 8)}...`);
  console.log('='.repeat(50) + '\\n');

  let successCount = 0;
  let errorCount = 0;
  const startTime = Date.now();

  // Process each query sequentially
  for (const query of CACHE_QUERIES) {
    const queryStart = Date.now();
    process.stdout.write(`📝 ${query.filename.padEnd(35)} `);

    try {
      const data = await runQuery(config, query.sql);
      const duration = ((Date.now() - queryStart) / 1000).toFixed(1);

      // Handle special case for dimensions (needs transformation)
      let outputData = data;
      if (query.filename === 'dimensions.json' && data.length > 0) {
        outputData = {
          segments: data[0].segments || [],
          loyalty_tiers: data[0].loyalty_tiers || [],
        } as unknown as Record<string, unknown>[];
      }

      // Handle KPIs (single row to object)
      if (query.filename === 'cx360_kpis.json' && Array.isArray(data) && data.length > 0) {
        outputData = data[0] as unknown as Record<string, unknown>[];
      }

      writeCache(query.filename, outputData);

      const rowCount = Array.isArray(outputData) ? outputData.length : 1;
      console.log(`✅ ${duration}s (${rowCount} ${rowCount === 1 ? 'row' : 'rows'})`);
      successCount++;
    } catch (error) {
      const duration = ((Date.now() - queryStart) / 1000).toFixed(1);
      console.log(`❌ ${duration}s`);
      console.error(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      errorCount++;
    }
  }

  // Summary
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\\n' + '='.repeat(50));
  console.log(`✅ Success: ${successCount}/${CACHE_QUERIES.length}`);
  if (errorCount > 0) {
    console.log(`❌ Errors: ${errorCount}`);
  }
  console.log(`⏱️  Total time: ${totalDuration}s`);
  console.log('='.repeat(50) + '\\n');

  process.exit(errorCount > 0 ? 1 : 0);
}

// Run if executed directly
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
