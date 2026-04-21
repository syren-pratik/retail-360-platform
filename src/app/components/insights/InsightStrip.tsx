'use client';

import { useState } from 'react';
import { Sparkles, ChevronRight, RefreshCw, Cpu } from 'lucide-react';
import { Insight } from '@/app/lib/insight-engine';
import InsightCard from './InsightCard';
import AllInsightsModal from './AllInsightsModal';

interface InsightStripProps {
  insights: Insight[];
  onScrollToChart: (chartId: string) => void;
  loading?: boolean;
  source?: 'claude' | 'rules' | 'cache' | 'error';
  onRefresh?: () => void;
  isFiltered?: boolean;
  filterLabel?: string;
}

function InsightSkeleton() {
  return (
    <div className="flex-shrink-0 w-[200px] p-3 bg-white border border-[var(--border-default)] rounded-lg animate-pulse">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-3 h-3 bg-gray-200 rounded" />
        <div className="w-16 h-3 bg-gray-200 rounded" />
      </div>
      <div className="w-full h-4 bg-gray-200 rounded mb-1" />
      <div className="w-3/4 h-4 bg-gray-200 rounded mb-2" />
      <div className="w-12 h-6 bg-gray-200 rounded" />
    </div>
  );
}

export default function InsightStrip({
  insights,
  onScrollToChart,
  loading = false,
  source = 'rules',
  onRefresh,
  isFiltered = false,
  filterLabel,
}: InsightStripProps) {
  const [showAllModal, setShowAllModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      onRefresh();
      // Reset after a short delay (actual refresh is async)
      setTimeout(() => setIsRefreshing(false), 2000);
    }
  };

  const handleViewClick = (insight: Insight) => {
    if (insight.relatedChart) {
      onScrollToChart(insight.relatedChart);
    }
  };

  // Show loading skeleton
  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--accent-primary)]" />
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              AI Insights
            </h3>
            <span className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full animate-pulse">
              Loading...
            </span>
          </div>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
          <InsightSkeleton />
          <InsightSkeleton />
          <InsightSkeleton />
          <InsightSkeleton />
        </div>
      </div>
    );
  }

  if (insights.length === 0) {
    return null;
  }

  // Determine badge style based on source
  const getBadge = () => {
    if (source === 'claude' || source === 'cache') {
      return (
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 flex items-center gap-1">
          <Sparkles size={10} />
          AI-generated
        </span>
      );
    }
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 flex items-center gap-1">
        <Cpu size={10} />
        Rule-based
      </span>
    );
  };

  return (
    <>
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--accent-primary)]" />
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              AI Insights
            </h3>
            <span className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full">
              {insights.length}
            </span>
            {getBadge()}
          </div>
          <div className="flex items-center gap-2">
            {/* Refresh button */}
            {onRefresh && !isFiltered && (
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-1.5 rounded-md hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
                title="Regenerate insights"
              >
                <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            )}
            <button
              onClick={() => setShowAllModal(true)}
              className="text-sm text-[var(--accent-primary)] hover:underline flex items-center gap-1"
            >
              See all
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Filter indicator */}
        {isFiltered && filterLabel && (
          <p className="text-xs text-[var(--text-tertiary)] mb-3">
            Showing insights for <span className="font-medium">{filterLabel}</span>
          </p>
        )}

        {/* Horizontally scrollable insight cards */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
          {insights.slice(0, 5).map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              compact
              onViewClick={() => handleViewClick(insight)}
            />
          ))}
        </div>
      </div>

      {/* All Insights Modal */}
      <AllInsightsModal
        isOpen={showAllModal}
        onClose={() => setShowAllModal(false)}
        insights={insights}
        onScrollToChart={onScrollToChart}
      />
    </>
  );
}
