'use client';

import { ReactNode, memo } from 'react';
import { Maximize2, Download } from 'lucide-react';
import { useDashboard } from '@/app/context/DashboardContext';
import { exportCSV } from '@/app/lib/export-utils';
import { ChartErrorBoundary } from '@/app/components/ui/ErrorBoundary';
import { ChartEmptyState } from '@/app/components/ui/EmptyState';

interface ChartCardProps {
  id: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  height?: number;
  data?: Record<string, unknown>[];
  exportFilename?: string;
  showExpand?: boolean;
  showExport?: boolean;
  isEmpty?: boolean;
  onResetFilters?: () => void;
  className?: string;
}

/**
 * Reusable chart card with header, export, expand, error boundary, and empty state
 */
function ChartCardInner({
  id,
  title,
  subtitle,
  children,
  height = 280,
  data,
  exportFilename,
  showExpand = true,
  showExport = true,
  isEmpty = false,
  onResetFilters,
  className = '',
}: ChartCardProps) {
  const { setExpandedChart } = useDashboard();

  const handleExpand = () => {
    setExpandedChart(id);
  };

  const handleExport = () => {
    if (data && data.length > 0) {
      exportCSV(data, exportFilename || id);
    }
  };

  return (
    <section
      id={`section-${id}`}
      className={`card h-full animate-fade-in ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-[var(--text-secondary)]">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {showExport && data && data.length > 0 && (
            <button
              onClick={handleExport}
              className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
              title="Export as CSV"
            >
              <Download size={16} />
            </button>
          )}
          {showExpand && (
            <button
              onClick={handleExpand}
              className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
              title="Expand chart"
            >
              <Maximize2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Chart content */}
      <div id={`chart-${id}`} style={{ height: `${height}px` }}>
        <ChartErrorBoundary chartName={title}>
          {isEmpty ? (
            <ChartEmptyState
              title="No data available"
              message="Adjust filters to see chart data"
              onReset={onResetFilters}
            />
          ) : (
            children
          )}
        </ChartErrorBoundary>
      </div>
    </section>
  );
}

// Memoize to prevent unnecessary re-renders
const ChartCard = memo(ChartCardInner);
export default ChartCard;
