import { readFileSync } from 'fs';
import path from 'path';
import type { SchemaCache } from '@/app/api/schema/route';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Validate a SQL query against the cached schema.
 * Checks for valid table and column references.
 */
export function validateSQL(sql: string): ValidationResult {
  let cache: SchemaCache;

  try {
    cache = JSON.parse(
      readFileSync(path.join(process.cwd(), 'cache', '_schema.json'), 'utf-8')
    );
  } catch {
    return {
      valid: true,
      errors: [],
      warnings: ['Schema cache not available — skipping validation'],
      suggestions: [],
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Extract table references from SQL
  const tablePattern = /hive_metastore\.(\w+)\.(\w+)/gi;
  const referencedTables: string[] = [];
  let match;

  while ((match = tablePattern.exec(sql)) !== null) {
    referencedTables.push(`${match[1]}.${match[2]}`);
  }

  // Check each referenced table
  for (const tableName of referencedTables) {
    const tableSchema = cache.tables[tableName];

    if (!tableSchema) {
      errors.push(
        `Table not found: hive_metastore.${tableName}. ` +
          `Available tables: ${Object.keys(cache.tables).slice(0, 5).join(', ')}...`
      );
      continue;
    }

    // Check for common hallucinated column patterns
    const knownColumns = new Set(tableSchema.columns.map((c) => (c.name ?? '').toLowerCase()));

    // Extract potential column references (simplified - not a full SQL parser)
    const columnPatterns = [
      // SELECT column
      /SELECT\s+(?:DISTINCT\s+)?([a-z_][a-z0-9_]*(?:\s*,\s*[a-z_][a-z0-9_]*)*)/gi,
      // WHERE column
      /WHERE\s+([a-z_][a-z0-9_]*)\s*[=<>!]/gi,
      // GROUP BY column
      /GROUP\s+BY\s+([a-z_][a-z0-9_]*(?:\s*,\s*[a-z_][a-z0-9_]*)*)/gi,
      // ORDER BY column
      /ORDER\s+BY\s+([a-z_][a-z0-9_]*)/gi,
    ];

    for (const pattern of columnPatterns) {
      let colMatch;
      while ((colMatch = pattern.exec(sql)) !== null) {
        const columns = colMatch[1].split(',').map((c) => (c ?? '').trim().toLowerCase());
        for (const col of columns) {
          // Skip SQL keywords and functions
          if (['count', 'sum', 'avg', 'max', 'min', 'as', '*'].includes(col)) continue;
          // Skip if it looks like a table alias
          if ((col ?? '').includes('.')) continue;

          if (!knownColumns.has(col) && (col ?? []).length > 1) {
            // Find similar column names
            const similar = tableSchema.columns
              .filter((c) => {
                const colLower = (c.name ?? '').toLowerCase();
                return (
                  (colLower ?? '').includes(col) ||
                  (col ?? '').includes(colLower) ||
                  levenshteinDistance(colLower, col) <= 2
                );
              })
              .map((c) => c.name);

            if ((similar ?? []).length > 0) {
              warnings.push(
                `Column "${col}" may not exist in ${tableName}. Did you mean: ${similar.join(', ')}?`
              );
            }
          }
        }
      }
    }
  }

  // Check for common SQL mistakes
  const sqlUpper = (sql ?? '').toUpperCase();

  if (!(sqlUpper ?? '').includes('LIMIT')) {
    suggestions.push('Consider adding LIMIT clause to prevent large result sets');
  }

  if ((sqlUpper ?? '').includes('SELECT *')) {
    warnings.push('SELECT * may return more columns than needed. Specify columns explicitly.');
  }

  // Check for missing table qualifiers
  if (!(sql ?? '').includes('hive_metastore.')) {
    errors.push('Table names must be fully qualified (e.g., hive_metastore.retail_ml.table_name)');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

/**
 * Simple Levenshtein distance for typo detection.
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if ((b ?? '').charAt(i - 1) === (a ?? '').charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Extract table names from a SQL query.
 */
export function extractTablesFromSQL(sql: string): string[] {
  const tablePattern = /hive_metastore\.(\w+\.\w+)/gi;
  const tables: string[] = [];
  let match;

  while ((match = tablePattern.exec(sql)) !== null) {
    tables.push(match[1]);
  }

  return Array.from(new Set(tables));
}

/**
 * Check if a SQL query references tables from multiple modules.
 */
export function isCrossModuleQuery(sql: string): { isCrossModule: boolean; modules: string[] } {
  const tables = extractTablesFromSQL(sql);

  const moduleMap: Record<string, string> = {
    clv_scores: 'cx360',
    churn_scores: 'cx360',
    gold_customer_360: 'cx360',
    forecast_output: 'demand',
    gold_demand_daily_sku_store: 'demand',
    gold_forecast_accuracy: 'demand',
    price_recommendations: 'price',
    price_elasticity_metrics: 'price',
    gold_optimal_price: 'price',
  };

  const modules = new Set<string>();
  for (const table of tables) {
    const tableName = (table ?? '').split('.').pop() || '';
    const mod = moduleMap[tableName];
    if (mod) modules.add(mod);
  }

  return {
    isCrossModule: modules.size > 1,
    modules: Array.from(modules),
  };
}
