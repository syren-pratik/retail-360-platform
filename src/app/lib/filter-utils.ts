import { GlobalFilters, ChartDrilldown } from '@/app/context/DashboardContext';

/**
 * Get the number of days for a date range filter
 */
export function getDateRangeDays(dateRange: [string, string]): number {
  const [startStr, endStr] = dateRange;
  const start = new Date(startStr);
  const end = new Date(endStr);
  const diffMs = end.getTime() - start.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Apply global filters and drilldowns to a data array
 *
 * @param data - Array of data records to filter
 * @param filters - Current global filter state
 * @param drilldowns - Active chart drilldowns
 * @param fieldMapping - Maps filter field names to data property names
 * @returns Filtered array
 */
export function applyFilters<T extends object>(
  data: T[],
  filters: GlobalFilters,
  drilldowns: ChartDrilldown[],
  fieldMapping: Partial<Record<string, keyof T>>
): T[] {
  if (data.length === 0) return [];

  let result = [...data];

  // Apply date range filter (filter customers active within the period)
  if (fieldMapping.recency) {
    const days = getDateRangeDays(filters.dateRange);
    const field = fieldMapping.recency;
    result = result.filter((item) => {
      const value = (item as Record<string, unknown>)[field as string];
      const recencyDays = typeof value === 'number' ? value : Number(value);
      return !isNaN(recencyDays) && recencyDays <= days;
    });
  }

  // Apply segment filter
  if (filters.segments.length > 0 && fieldMapping.segment) {
    const field = fieldMapping.segment;
    result = result.filter((item) => {
      const value = (item as Record<string, unknown>)[field as string];
      return typeof value === 'string' && filters.segments.includes(value);
    });
  }

  // Apply loyalty tier filter
  if (filters.loyaltyTiers.length > 0 && fieldMapping.loyaltyTier) {
    const field = fieldMapping.loyaltyTier;
    result = result.filter((item) => {
      const value = (item as Record<string, unknown>)[field as string];
      return typeof value === 'string' && filters.loyaltyTiers.includes(value);
    });
  }

  // Apply channel filter (acquisition channel)
  if (filters.channel !== 'all' && fieldMapping.channel) {
    const field = fieldMapping.channel;
    result = result.filter((item) => {
      const value = (item as Record<string, unknown>)[field as string];
      return typeof value === 'string' && value === filters.channel;
    });
  }

  // Apply store filter (if data has store field)
  if (filters.stores.length > 0 && fieldMapping.store) {
    const field = fieldMapping.store;
    result = result.filter((item) => {
      const value = (item as Record<string, unknown>)[field as string];
      return typeof value === 'string' && filters.stores.includes(value);
    });
  }

  // Apply city filter
  if (filters.cities && filters.cities.length > 0 && fieldMapping.city) {
    const field = fieldMapping.city;
    result = result.filter((item) => {
      const value = (item as Record<string, unknown>)[field as string];
      return typeof value === 'string' && filters.cities.includes(value);
    });
  }

  // Apply drilldowns as additional equality filters
  for (const drilldown of drilldowns) {
    const field = drilldown.field;
    // Check if the first item has this field
    if (result.length > 0 && field in result[0]) {
      result = result.filter((item) => {
        const value = (item as Record<string, unknown>)[field];
        return value === drilldown.value;
      });
    }
  }

  return result;
}

/**
 * Check if any filters are currently active
 */
export function hasActiveFilters(filters: GlobalFilters): boolean {
  return (
    filters.segments.length > 0 ||
    filters.loyaltyTiers.length > 0 ||
    filters.stores.length > 0 ||
    filters.channel !== 'all' ||
    (filters.cities && filters.cities.length > 0)
  );
}

/**
 * Get a human-readable summary of active filters
 */
export function getFilterSummary(filters: GlobalFilters): string[] {
  const summary: string[] = [];

  if (filters.segments.length > 0) {
    summary.push(`Segments: ${filters.segments.join(', ')}`);
  }
  if (filters.loyaltyTiers.length > 0) {
    summary.push(`Tiers: ${filters.loyaltyTiers.join(', ')}`);
  }
  if (filters.stores.length > 0) {
    summary.push(`Stores: ${filters.stores.length} selected`);
  }
  if (filters.channel !== 'all') {
    summary.push(`Channel: ${filters.channel}`);
  }
  if (filters.cities && filters.cities.length > 0) {
    summary.push(`Cities: ${filters.cities.join(', ')}`);
  }

  return summary;
}

/**
 * Standard field mappings for common data types
 */
export const customerTableFieldMapping = {
  segment: 'customer_segment' as const,
  loyaltyTier: 'loyalty_tier' as const,
  channel: 'acquisition_channel' as const,
  city: 'city' as const,
  recency: 'days_since_last_purchase' as const,
};

export const categoryBySegmentFieldMapping = {
  segment: 'customer_segment' as const,
};
