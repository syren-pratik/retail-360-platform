'use client';

import { ReactNode, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import ChartCard from '@/app/components/charts/ChartCard';
import { useDashboard } from '@/app/context/DashboardContext';

interface Props {
  id: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  height?: number;
  data?: Record<string, unknown>[];
  exportFilename?: string;
  isEmpty?: boolean;
}

export default function PriceIntelChartCard({
  id,
  title,
  subtitle,
  children,
  height = 280,
  data,
  exportFilename,
  isEmpty = false,
}: Props) {
  const { expandedChart, setExpandedChart } = useDashboard();
  const isExpanded = expandedChart === id;

  const handleClose = useCallback(() => setExpandedChart(null), [setExpandedChart]);

  useEffect(() => {
    if (!isExpanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isExpanded, handleClose]);

  return (
    <>
      <ChartCard
        id={id}
        title={title}
        subtitle={subtitle}
        height={height}
        data={data}
        exportFilename={exportFilename}
        isEmpty={isEmpty}
      >
        {children}
      </ChartCard>

      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={handleClose}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
          <div
            className="relative bg-white rounded-xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border-default)]">
              <div>
                <span className="text-sm font-semibold text-[var(--text-primary)]">{title}</span>
                {subtitle && (
                  <span className="text-xs text-[var(--text-secondary)] ml-2">{subtitle}</span>
                )}
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-md hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <div className="h-[440px] bg-white">{children}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
