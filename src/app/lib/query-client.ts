/**
 * Client-side query helper for on-demand Databricks queries
 * Uses the /api/query endpoint with Tier 2 caching
 */

export interface QueryResult<T = Record<string, unknown>> {
  data: T[];
  source: 'databricks' | 'mock' | 'cache';
  cachedAt?: string;
  sql?: string;
  executionTime: number;
  rowCount: number;
  error?: string;
}

export interface QueryParams {
  customerId?: string;
  productId?: string;
  segment?: string;
  loyaltyTier?: string;
  channel?: string;
  query?: string;
  limit?: number;
}

type QueryName =
  | 'customer_detail'
  | 'customer_transactions'
  | 'product_forecast'
  | 'filtered_clv'
  | 'customer_search'
  | 'customer_table_full'
  | 'product_search'
  | 'product_detail'
  | 'filtered_churn';

/**
 * Fetch data from the on-demand query API
 * @param queryName - The name of the query template to execute
 * @param params - Parameters for the query
 * @returns Query result with data, source, and metadata
 */
export async function fetchQuery<T = Record<string, unknown>>(
  queryName: QueryName,
  params: QueryParams = {}
): Promise<QueryResult<T>> {
  const response = await fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queryName, params }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Query failed');
  }

  return response.json();
}

/**
 * Fetch customer detail data
 */
export async function fetchCustomerDetail(customerId: string) {
  return fetchQuery('customer_detail', { customerId });
}

/**
 * Fetch customer transactions
 */
export async function fetchCustomerTransactions(customerId: string) {
  return fetchQuery('customer_transactions', { customerId });
}

/**
 * Search for customers
 */
export async function searchCustomers(query: string) {
  return fetchQuery('customer_search', { query });
}

/**
 * Fetch product forecast
 */
export async function fetchProductForecast(productId: string) {
  return fetchQuery('product_forecast', { productId });
}

/**
 * Fetch product detail
 */
export async function fetchProductDetail(productId: string) {
  return fetchQuery('product_detail', { productId });
}

/**
 * Search for products
 */
export async function searchProducts(query: string) {
  return fetchQuery('product_search', { query });
}

/**
 * Fetch full customer table for export
 */
export async function fetchFullCustomerTable() {
  return fetchQuery('customer_table_full', {});
}

/**
 * Fetch filtered CLV distribution
 */
export async function fetchFilteredCLV(filters: {
  segment?: string;
  loyaltyTier?: string;
  channel?: string;
}) {
  return fetchQuery('filtered_clv', filters);
}

/**
 * Fetch filtered churn data
 */
export async function fetchFilteredChurn(filters: {
  segment?: string;
  loyaltyTier?: string;
}) {
  return fetchQuery('filtered_churn', filters);
}

/**
 * Clear the query cache (for debugging)
 */
export async function clearQueryCache(): Promise<void> {
  await fetch('/api/query', { method: 'DELETE' });
}
