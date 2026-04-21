/**
 * Data Source Abstraction Layer
 * Provides unified interface for querying data from either Databricks or mock data
 */

import { runQuery as runDatabricksQuery, isDatabricksConfigured } from './databricks';
import { executeMockQuery } from './mock-executor';

export type DataSource = 'databricks' | 'mock';

export interface QueryResult {
  data: Record<string, unknown>[];
  rowCount: number;
  executionTime: number;
  source: DataSource;
}

/**
 * Execute a SQL query against the appropriate data source
 * Automatically falls back to mock data if Databricks is not configured or fails
 */
export async function executeQuery(sql: string): Promise<QueryResult> {
  // Check if Databricks is configured
  if (isDatabricksConfigured()) {
    try {
      const result = await runDatabricksQuery(sql);
      return {
        ...result,
        source: 'databricks',
      };
    } catch (error) {
      console.warn('Databricks query failed, falling back to mock:', error);
      // Fall through to mock execution
    }
  }

  // Execute against mock data
  const startTime = Date.now();
  try {
    const data = await executeMockQuery(sql);
    return {
      data,
      rowCount: data.length,
      executionTime: Date.now() - startTime,
      source: 'mock',
    };
  } catch (error) {
    console.error('Mock query execution failed:', error);
    return {
      data: [],
      rowCount: 0,
      executionTime: Date.now() - startTime,
      source: 'mock',
    };
  }
}

/**
 * Get the currently active data source
 */
export function getActiveDataSource(): DataSource {
  return isDatabricksConfigured() ? 'databricks' : 'mock';
}

/**
 * Get data source status for display
 */
export async function getDataSourceStatus(): Promise<{
  active: DataSource;
  databricksConfigured: boolean;
  databricksConnected: boolean;
  mockAvailable: boolean;
}> {
  const databricksConfigured = isDatabricksConfigured();
  let databricksConnected = false;

  if (databricksConfigured) {
    try {
      // Quick test query
      await runDatabricksQuery('SELECT 1');
      databricksConnected = true;
    } catch {
      databricksConnected = false;
    }
  }

  return {
    active: databricksConfigured && databricksConnected ? 'databricks' : 'mock',
    databricksConfigured,
    databricksConnected,
    mockAvailable: true, // Mock is always available
  };
}
