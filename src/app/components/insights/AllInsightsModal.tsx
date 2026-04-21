'use client';

import { useEffect, useCallback } from 'react';
import { X, Lightbulb } from 'lucide-react';
import { Insight } from '@/app/lib/insight-engine';
import InsightCard from './InsightCard';

interface AllInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  insights: Insight[];
  onScrollToChart: (chartId: string) => void;
}

export default function AllInsightsModal({
  isOpen,
  onClose,
  insights,
  onScrollToChart,
}: AllInsightsModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const handleViewChart = (insight: Insight) => {
    if (insight.relatedChart) {
      onClose();
      setTimeout(() => {
        onScrollToChart(insight.relatedChart!);
      }, 100);
    }
  };

  // Group insights by severity
  const groupedInsights = {
    critical: insights.filter((i) => i.severity === 'critical'),
    warning: insights.filter((i) => i.severity === 'warning'),
    info: insights.filter((i) => i.severity === 'info'),
    positive: insights.filter((i) => i.severity === 'positive'),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 pb-8">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-full bg-white rounded-xl shadow-xl animate-scale-in overflow-hidden mx-4">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[var(--border-default)] px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--accent-primary-light)]">
              <Lightbulb size={20} className="text-[var(--accent-primary)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                All Insights
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {insights.length} insights generated from your data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(100vh-200px)] space-y-6">
          {/* Critical Insights */}
          {groupedInsights.critical.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[#DC2626] uppercase tracking-wide mb-3">
                Critical ({groupedInsights.critical.length})
              </h3>
              <div className="space-y-3">
                {groupedInsights.critical.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    onViewClick={() => handleViewChart(insight)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Warning Insights */}
          {groupedInsights.warning.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[#D97706] uppercase tracking-wide mb-3">
                Warning ({groupedInsights.warning.length})
              </h3>
              <div className="space-y-3">
                {groupedInsights.warning.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    onViewClick={() => handleViewChart(insight)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Info Insights */}
          {groupedInsights.info.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[#2563EB] uppercase tracking-wide mb-3">
                Info ({groupedInsights.info.length})
              </h3>
              <div className="space-y-3">
                {groupedInsights.info.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    onViewClick={() => handleViewChart(insight)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Positive Insights */}
          {groupedInsights.positive.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[#059669] uppercase tracking-wide mb-3">
                Positive ({groupedInsights.positive.length})
              </h3>
              <div className="space-y-3">
                {groupedInsights.positive.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    onViewClick={() => handleViewChart(insight)}
                  />
                ))}
              </div>
            </div>
          )}

          {insights.length === 0 && (
            <div className="text-center py-12 text-[var(--text-secondary)]">
              <Lightbulb size={48} className="mx-auto mb-4 opacity-30" />
              <p>No insights generated for the current data.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
