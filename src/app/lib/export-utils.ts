import html2canvas from 'html2canvas';

/**
 * Format date for filename
 */
function getDateStamp(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Export data array to CSV file
 */
export function exportCSV(
  data: Record<string, unknown>[],
  filename: string,
  prefix: string = 'cx360'
): void {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);

  // Convert data to CSV rows
  const csvRows = [
    headers.join(','), // Header row
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Handle values with commas or quotes
          if (value === null || value === undefined) {
            return '';
          }
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(',')
    ),
  ];

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${prefix}_${filename}_${getDateStamp()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export DOM element as PNG image
 */
export async function exportPNG(
  elementId: string,
  filename: string,
  prefix: string = 'cx360'
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2, // Higher quality
      logging: false,
      useCORS: true,
    });

    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (!blob) {
        console.error('Failed to create image blob');
        return;
      }

      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${prefix}_${filename}_${getDateStamp()}.png`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png');
  } catch (error) {
    console.error('Failed to export PNG:', error);
  }
}

/**
 * Export KPIs as CSV
 */
export function exportKPIs(
  kpis: Record<string, unknown>,
  filters: Record<string, unknown>
): void {
  // Safely extract date range
  const dateRange = filters.dateRange as [string, string] | undefined;
  const dateRangeStr = dateRange ? `${dateRange[0]} to ${dateRange[1]}` : 'N/A';

  const data = [
    {
      metric: 'Total Customers',
      value: kpis.total_customers,
      prior_value: kpis.total_customers_prior,
    },
    {
      metric: 'Average CLV',
      value: kpis.avg_clv,
      prior_value: kpis.avg_clv_prior,
    },
    {
      metric: 'Churn Rate (%)',
      value: kpis.churn_rate_pct,
      prior_value: kpis.churn_rate_pct_prior,
    },
    {
      metric: 'Active Rate (%)',
      value: kpis.active_rate_pct,
      prior_value: kpis.active_rate_pct_prior,
    },
    {
      metric: '---Filters---',
      value: '',
      prior_value: '',
    },
    {
      metric: 'Date Range',
      value: dateRangeStr,
      prior_value: '',
    },
    {
      metric: 'Segments',
      value: (filters.segments as string[])?.join(', ') || 'All',
      prior_value: '',
    },
    {
      metric: 'Loyalty Tiers',
      value: (filters.loyaltyTiers as string[])?.join(', ') || 'All',
      prior_value: '',
    },
    {
      metric: 'Channel',
      value: filters.channel || 'All',
      prior_value: '',
    },
  ];

  exportCSV(data, 'kpis', 'cx360');
}

/**
 * Format number for display in exports
 */
export function formatForExport(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'number') {
    return value.toLocaleString('en-IN');
  }
  return String(value);
}
