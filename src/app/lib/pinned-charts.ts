'use client';

// ============================================================================
// PINNED CHARTS STORAGE
// Stores AI-generated charts that users want to persist on their dashboard
// ============================================================================

export interface PinnedChart {
  id: string;
  chart_type: 'bar_chart' | 'horizontal_bar' | 'line_chart' | 'area_chart' | 'donut_chart' | 'scatter_chart' | 'stacked_bar' | 'grouped_bar' | 'heatmap' | 'data_table' | 'kpi_card' | 'treemap' | 'comparison';
  title: string;
  data: unknown[];
  config: {
    x_key?: string;
    y_key?: string;
    name_key?: string;
    value_key?: string;
    color?: string;
    columns?: string[];
    label?: string;
    value?: string;
    change?: string;
    direction?: string;
  };
  section: 'top' | 'after_kpis' | 'after_churn' | 'after_cohort' | 'bottom';
  size: 'half' | 'full';
  pinnedAt: string;
  pinnedBy: 'ai_agent' | 'user';
  query?: string; // SQL that generated this, for refresh
  module: 'cx360' | 'demand';
}

const PINNED_CHARTS_KEY = 'cx360_pinned_charts';

// Get all pinned charts
export function getPinnedCharts(module?: string): PinnedChart[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = localStorage.getItem(PINNED_CHARTS_KEY);
    if (!stored) {
      return [];
    }

    const charts: PinnedChart[] = JSON.parse(stored);

    if (module) {
      return charts.filter((c) => c.module === module);
    }

    return charts;
  } catch (error) {
    console.error('Failed to read pinned charts:', error);
    return [];
  }
}

// Get pinned charts grouped by section
export function getPinnedChartsBySection(module: string): Record<string, PinnedChart[]> {
  const charts = getPinnedCharts(module);

  return {
    top: charts.filter((c) => c.section === 'top'),
    after_kpis: charts.filter((c) => c.section === 'after_kpis'),
    after_churn: charts.filter((c) => c.section === 'after_churn'),
    after_cohort: charts.filter((c) => c.section === 'after_cohort'),
    bottom: charts.filter((c) => c.section === 'bottom'),
  };
}

// Pin a new chart
export function pinChart(chart: Omit<PinnedChart, 'pinnedAt'>): PinnedChart {
  if (typeof window === 'undefined') {
    throw new Error('Pinning is only available in the browser');
  }

  const newChart: PinnedChart = {
    ...chart,
    pinnedAt: new Date().toISOString(),
  };

  try {
    const charts = getPinnedCharts();

    // Check for duplicate
    const existingIndex = charts.findIndex((c) => c.id === chart.id);
    if (existingIndex >= 0) {
      // Update existing
      charts[existingIndex] = newChart;
    } else {
      // Add new
      charts.push(newChart);
    }

    localStorage.setItem(PINNED_CHARTS_KEY, JSON.stringify(charts));

    // Dispatch event for other components to react
    window.dispatchEvent(new CustomEvent('pinnedChartsChanged', { detail: { action: 'pin', chart: newChart } }));

    return newChart;
  } catch (error) {
    console.error('Failed to pin chart:', error);
    throw error;
  }
}

// Unpin a chart
export function unpinChart(chartId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const charts = getPinnedCharts();
    const filtered = charts.filter((c) => c.id !== chartId);
    localStorage.setItem(PINNED_CHARTS_KEY, JSON.stringify(filtered));

    // Dispatch event
    window.dispatchEvent(new CustomEvent('pinnedChartsChanged', { detail: { action: 'unpin', chartId } }));
  } catch (error) {
    console.error('Failed to unpin chart:', error);
  }
}

// Update a pinned chart (e.g., after data refresh)
export function updatePinnedChart(chartId: string, updates: Partial<PinnedChart>): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const charts = getPinnedCharts();
    const index = charts.findIndex((c) => c.id === chartId);

    if (index >= 0) {
      charts[index] = { ...charts[index], ...updates };
      localStorage.setItem(PINNED_CHARTS_KEY, JSON.stringify(charts));

      window.dispatchEvent(new CustomEvent('pinnedChartsChanged', { detail: { action: 'update', chartId } }));
    }
  } catch (error) {
    console.error('Failed to update pinned chart:', error);
  }
}

// Move a chart to a different section
export function movePinnedChart(chartId: string, newSection: PinnedChart['section']): void {
  updatePinnedChart(chartId, { section: newSection });
}

// Clear all pinned charts
export function clearAllPinnedCharts(module?: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (module) {
      const charts = getPinnedCharts();
      const filtered = charts.filter((c) => c.module !== module);
      localStorage.setItem(PINNED_CHARTS_KEY, JSON.stringify(filtered));
    } else {
      localStorage.removeItem(PINNED_CHARTS_KEY);
    }

    window.dispatchEvent(new CustomEvent('pinnedChartsChanged', { detail: { action: 'clear' } }));
  } catch (error) {
    console.error('Failed to clear pinned charts:', error);
  }
}

// Get count of pinned charts
export function getPinnedChartsCount(module?: string): number {
  return getPinnedCharts(module).length;
}

// Check if a chart is pinned
export function isChartPinned(chartId: string): boolean {
  const charts = getPinnedCharts();
  return charts.some((c) => c.id === chartId);
}
