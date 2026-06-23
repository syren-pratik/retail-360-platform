'use client';

import { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Maximize2 } from 'lucide-react';
import { useDashboard } from '@/app/context/DashboardContext';
import { AIInsightButton } from './ChartCard';

interface ChartWrapperProps {
  children: ReactNode;
  height?: number;
  chartId?: string;
  title?: string;
  subtitle?: string;
  showExpand?: boolean;
  data?: Record<string, unknown>[];
}

// Inner component that renders the chart
function ChartContent({
  children,
  height = 280,
  chartId,
  title,
  subtitle,
  showExpand = true,
  data,
}: ChartWrapperProps) {
  const { setExpandedChart } = useDashboard();

  const handleExpand = () => {
    if (chartId) {
      setExpandedChart(chartId);
    }
  };

  // If there's a title, render with header
  if (title) {
    return (
      <div className="relative">
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
            {data && data.length > 0 && (
              <AIInsightButton id={chartId ?? title} title={title} data={data} />
            )}
            {showExpand && chartId && (
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
        <div style={{ height: `${height}px` }}>{children}</div>
      </div>
    );
  }

  // Simple wrapper without header - just render children
  return <div style={{ height: `${height}px` }}>{children}</div>;
}

// Loading fallback
function ChartLoading({ height = 280 }: { height?: number }) {
  return (
    <div
      className="flex items-center justify-center text-[var(--text-tertiary)] animate-pulse"
      style={{ height: `${height}px` }}
    >
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-2 border-[var(--border-default)] border-t-[var(--accent-primary)] rounded-full animate-spin" />
        <span className="text-sm">Loading chart...</span>
      </div>
    </div>
  );
}

// Use dynamic import with no SSR for the chart content
const DynamicChartContent = dynamic(
  () => Promise.resolve(ChartContent),
  {
    ssr: false,
    loading: () => <ChartLoading />,
  }
);

export default function ChartWrapper(props: ChartWrapperProps) {
  return <DynamicChartContent {...props} />;
}
