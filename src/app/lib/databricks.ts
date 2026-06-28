/**
 * Databricks SQL Connection Layer
 * Handles connection to Databricks SQL Warehouse for live data queries
 */

export interface DatabricksConfig {
  host: string;
  token: string;
  warehouseId: string;
  catalog: string;
}

export interface QueryResult {
  data: Record<string, unknown>[];
  rowCount: number;
  executionTime: number;
}

interface DatabricksResponse {
  status?: {
    state: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'CLOSED';
    error?: {
      message: string;
    };
  };
  manifest?: {
    schema?: {
      columns?: Array<{ name: string; type_text: string }>;
    };
  };
  result?: {
    data_array?: unknown[][];
  };
  statement_id?: string;
}

/**
 * Get Databricks configuration from environment variables
 */
function getConfig(): DatabricksConfig {
  return {
    host: process.env.DATABRICKS_HOST || '',
    token: process.env.DATABRICKS_TOKEN || '',
    warehouseId: process.env.DATABRICKS_WAREHOUSE_ID || '',
    catalog: process.env.DATABRICKS_CATALOG || 'hive_metastore',
  };
}

/**
 * Check if Databricks is properly configured
 */
export function isDatabricksConfigured(): boolean {
  const config = getConfig();
  return !!(config.host && config.token && config.warehouseId);
}

/**
 * Get connection status for display
 */
export async function getConnectionStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  error?: string;
}> {
  if (!isDatabricksConfigured()) {
    return {
      configured: false,
      connected: false,
      error: 'Databricks credentials not configured',
    };
  }

  try {
    // Try a simple query to test connection
    await runQuery('SELECT 1 as test');
    return { configured: true, connected: true };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Run a SQL query against Databricks SQL Warehouse
 */
export async function runQuery(sql: string): Promise<QueryResult> {
  const config = getConfig();

  if (!config.host || !config.token || !config.warehouseId) {
    throw new Error('Databricks not configured — missing required credentials');
  }

  const startTime = Date.now();
  // Highly visible log so we can see live SQL hitting Databricks
  const preview = sql.replace(/\s+/g, ' ').slice(0, 140);
  console.log(`🟣 [Databricks SQL] ${preview}${sql.length > 140 ? '…' : ''}`);

  // Normalize host: accept "adb-….net", "https://adb-….net", or trailing slash variants
  let host = config.host.trim().replace(/\/$/, '');
  if (!/^https?:\/\//i.test(host)) host = `https://${host}`;
  const url = `${host}/api/2.0/sql/statements`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        warehouse_id: config.warehouseId,
        statement: sql,
        wait_timeout: '30s',
        catalog: config.catalog,
        disposition: 'INLINE',
        format: 'JSON_ARRAY',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Databricks API error (${response.status}): ${errorText}`);
    }

    const result: DatabricksResponse = await response.json();

    // Check for failure
    if (result.status?.state === 'FAILED') {
      throw new Error(result.status.error?.message || 'Query execution failed');
    }

    // Check for pending/running (would need polling in production)
    if (result.status?.state === 'PENDING' || result.status?.state === 'RUNNING') {
      throw new Error('Query timed out — try a simpler query or increase timeout');
    }

    // Extract column names and data
    const columns = result.manifest?.schema?.columns?.map((c) => c.name) || [];
    const dataArray = result.result?.data_array || [];

    // Transform array data to objects
    const data = dataArray.map((row) => {
      const obj: Record<string, unknown> = {};
      columns.forEach((col, index) => {
        obj[col] = row[index];
      });
      return obj;
    });

    return {
      data,
      rowCount: data.length,
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    // Re-throw with timing info
    const executionTime = Date.now() - startTime;
    if (error instanceof Error) {
      error.message = `${error.message} (after ${executionTime}ms)`;
    }
    throw error;
  }
}

/**
 * Test query to verify connection works
 */
export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await runQuery('SELECT 1 as connection_test');
    return { success: result.data.length === 1 };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection test failed',
    };
  }
}
