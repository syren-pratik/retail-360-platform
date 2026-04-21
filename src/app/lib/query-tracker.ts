/**
 * Query budget tracking for monitoring Databricks usage
 * Tracks queries per session and provides statistics
 */

interface QueryLogEntry {
  timestamp: number;
  type: 'cache_refresh' | 'on_demand' | 'ai_chat';
  duration: number;
  source: 'databricks' | 'mock' | 'cache';
  queryName?: string;
}

// In-memory query log (resets on page refresh)
let queryLog: QueryLogEntry[] = [];

/**
 * Log a query execution
 */
export function logQuery(
  type: 'cache_refresh' | 'on_demand' | 'ai_chat',
  duration: number,
  source: 'databricks' | 'mock' | 'cache',
  queryName?: string
): void {
  queryLog.push({
    timestamp: Date.now(),
    type,
    duration,
    source,
    queryName,
  });

  // Keep only last 1000 entries to prevent memory issues
  if (queryLog.length > 1000) {
    queryLog = queryLog.slice(-1000);
  }
}

/**
 * Get query statistics for today
 */
export function getQueryStats(): {
  total: number;
  byType: {
    cache_refresh: number;
    on_demand: number;
    ai_chat: number;
  };
  bySource: {
    databricks: number;
    mock: number;
    cache: number;
  };
  avgDuration: number;
  totalDuration: number;
} {
  const oneDayAgo = Date.now() - 86400000;
  const today = queryLog.filter(q => q.timestamp > oneDayAgo);

  const byType = {
    cache_refresh: today.filter(q => q.type === 'cache_refresh').length,
    on_demand: today.filter(q => q.type === 'on_demand').length,
    ai_chat: today.filter(q => q.type === 'ai_chat').length,
  };

  const bySource = {
    databricks: today.filter(q => q.source === 'databricks').length,
    mock: today.filter(q => q.source === 'mock').length,
    cache: today.filter(q => q.source === 'cache').length,
  };

  const totalDuration = today.reduce((sum, q) => sum + q.duration, 0);

  return {
    total: today.length,
    byType,
    bySource,
    avgDuration: today.length ? Math.round(totalDuration / today.length) : 0,
    totalDuration,
  };
}

/**
 * Get recent query log entries
 */
export function getRecentQueries(limit: number = 20): QueryLogEntry[] {
  return queryLog.slice(-limit).reverse();
}

/**
 * Clear query log (for testing)
 */
export function clearQueryLog(): void {
  queryLog = [];
}

/**
 * Get raw query count
 */
export function getQueryCount(): number {
  return queryLog.length;
}
