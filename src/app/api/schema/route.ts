import { NextRequest, NextResponse } from 'next/server';
import { runQuery, isDatabricksConfigured } from '@/app/lib/databricks';
import { writeFile, readFile, mkdir } from 'fs/promises';
import path from 'path';

const SCHEMA_CACHE_PATH = path.join(process.cwd(), 'cache', '_schema.json');

// Tables the AI needs to know about, organized by module
const MODULE_TABLES: Record<string, string[]> = {
  cx360: [
    'retail_ml.clv_scores',
    'retail_ml.churn_scores',
    'retail_ml.churn_feature_importance',
    'retail_gold.gold_customer_360',
    'retail_gold.gold_cohort_retention',
    'retail_gold.gold_basket_analysis',
    'retail_gold.gold_product_affinity',
    'retail_gold.gold_cohort_forecast',
    'retail_silver.dim_customer',
    'retail_silver.dim_store',
    'retail_silver.dim_product',
    'retail_silver.dim_date',
    'retail_silver.dim_category',
  ],
  demand: [
    'retail_ml.forecast_output',
    'retail_ml.demand_features',
    'retail_gold.gold_demand_daily_sku_store',
    'retail_gold.gold_forecast_accuracy',
    'retail_gold.gold_demand_hourly',
    'retail_gold.gold_demand_monthly_cat_geo',
    'retail_gold.gold_demand_weekly_cluster',
    'retail_gold.gold_unconstrained_demand',
    'retail_gold.gold_model_comparison',
    'retail_silver.dim_product',
    'retail_silver.dim_store',
    'retail_silver.dim_date',
  ],
  price: [
    'retail_ml.price_recommendations',
    'retail_ml.price_elasticity_metrics',
    'retail_gold.gold_optimal_price',
    'retail_gold.gold_price_elasticity_matrix',
    'retail_gold.gold_promo_effectiveness',
    'retail_gold.gold_promo_calendar',
    'retail_gold.gold_reference_price',
    'retail_gold.gold_cost_passthrough',
    'retail_gold.gold_competitive_index',
    'retail_silver.fact_price',
    'retail_silver.fact_promotions',
    'retail_silver.fact_price_test',
    'retail_silver.fact_promo_lift_curve',
    'retail_silver.fact_markdown',
    'retail_silver.dim_product',
    'retail_silver.dim_store',
  ],
};

export interface ColumnInfo {
  name: string;
  type: string;
  comment: string;
}

export interface TableSchema {
  fullName: string;
  columns: ColumnInfo[];
  rowCount: number;
  sampleValues: Record<string, string[]>;
}

export interface SchemaCache {
  lastRefresh: string;
  tables: Record<string, TableSchema>;
}

// GET: return cached schema
export async function GET() {
  try {
    const cached = await readFile(SCHEMA_CACHE_PATH, 'utf-8');
    return NextResponse.json(JSON.parse(cached));
  } catch {
    return NextResponse.json({
      lastRefresh: null,
      tables: {},
      message: 'No schema cache found. Click Refresh Schema to discover tables.',
    });
  }
}

// POST: refresh schema from Databricks
export async function POST(request: NextRequest) {
  if (!isDatabricksConfigured()) {
    return NextResponse.json(
      { error: 'Databricks not configured. Using mock data mode.' },
      { status: 400 }
    );
  }

  const { module } = await request.json();

  // Get tables to discover
  let tablesToDiscover: string[] = [];
  if (module === 'all') {
    const allTables = Object.values(MODULE_TABLES).flat();
    tablesToDiscover = Array.from(new Set(allTables));
  } else {
    tablesToDiscover = MODULE_TABLES[module] || [];
  }

  const results: Record<string, TableSchema> = {};
  const errors: string[] = [];

  for (const table of tablesToDiscover) {
    const fullName = `hive_metastore.${table}`;
    try {
      // Get column definitions
      const describeResultRaw = await runQuery(`DESCRIBE TABLE ${fullName}`);
      const describeResult = describeResultRaw as unknown as Record<string, unknown>[];
      const columns: ColumnInfo[] = (Array.isArray(describeResult) ? describeResult : [])
        .filter((row: Record<string, unknown>) => {
          const colName = row.col_name as string | undefined;
          return colName && !(colName ?? '').startsWith('#');
        })
        .map((row: Record<string, unknown>) => ({
          name: (row.col_name as string).trim(),
          type: (row.data_type as string).trim(),
          comment: ((row.comment as string) || '').trim(),
        }));

      // Get row count
      const countResultRaw = await runQuery(`SELECT COUNT(*) as cnt FROM ${fullName}`);
      const countResult = countResultRaw as unknown as Record<string, unknown>[];
      const rowCount = Array.isArray(countResult) && countResult[0]
        ? parseInt(String(countResult[0].cnt || '0'))
        : 0;

      // Get sample distinct values for key columns (first 5 string columns)
      const sampleValues: Record<string, string[]> = {};
      const stringCols = columns.filter((c) => c.type === 'string').slice(0, 5);

      for (const col of stringCols) {
        try {
          const sampleResultRaw = await runQuery(
            `SELECT DISTINCT ${col.name} FROM ${fullName} WHERE ${col.name} IS NOT NULL LIMIT 5`
          );
          const sampleResult = sampleResultRaw as unknown as Record<string, unknown>[];
          if (Array.isArray(sampleResult)) {
            sampleValues[col.name] = sampleResult.map(
              (r: Record<string, unknown>) => String(r[col.name])
            );
          }
        } catch {
          // Skip if column sampling fails
        }
      }

      results[table] = {
        fullName,
        columns,
        rowCount,
        sampleValues,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`${table}: ${errorMessage}`);
    }
  }

  // Ensure cache directory exists
  const cacheDir = path.dirname(SCHEMA_CACHE_PATH);
  try {
    await mkdir(cacheDir, { recursive: true });
  } catch {
    // Directory may already exist
  }

  // Merge with existing cache (don't lose other modules)
  let existingCache: SchemaCache = { lastRefresh: '', tables: {} };
  try {
    const existing = await readFile(SCHEMA_CACHE_PATH, 'utf-8');
    existingCache = JSON.parse(existing);
  } catch {
    // No existing cache
  }

  const mergedCache: SchemaCache = {
    lastRefresh: new Date().toISOString(),
    tables: { ...existingCache.tables, ...results },
  };

  await writeFile(SCHEMA_CACHE_PATH, JSON.stringify(mergedCache, null, 2));

  return NextResponse.json({
    lastRefresh: mergedCache.lastRefresh,
    discovered: Object.keys(results).length,
    errors,
    tables: results,
  });
}

// Note: MODULE_TABLES is internal to this module
// For use in other files, import from schema-to-prompt.ts instead
