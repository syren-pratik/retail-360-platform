'use client';

import { useEffect, useRef } from 'react';
import { Sparkles, X, ArrowUpRight, MessageSquare, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { WidgetAnalysis, WidgetMetric } from '@/app/hooks/useWidgetAI';

interface ChartAIPopoverProps {
  analysis: WidgetAnalysis | null;
  loading: boolean;
  onClose: () => void;
  onFollowUp: (prompt: string) => void;
}

function MetricCard({ metric }: { metric: WidgetMetric }) {
  const colorClasses = {
    positive: 'bg-green-50 border-green-200 text-green-700',
    negative: 'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    neutral: 'bg-gray-50 border-gray-200 text-gray-700',
  };

  const iconMap = {
    positive: <TrendingUp size={12} className="text-green-600" />,
    negative: <TrendingDown size={12} className="text-red-600" />,
    warning: <Minus size={12} className="text-amber-600" />,
    neutral: <Minus size={12} className="text-gray-500" />,
  };

  return (
    <div
      className={`flex-1 min-w-0 px-3 py-2 rounded-lg border ${colorClasses[metric.color]}`}
    >
      <div className="flex items-center gap-1 mb-0.5">
        {iconMap[metric.color]}
        <span className="text-[10px] font-medium truncate">{metric.label}</span>
      </div>
      <div className="text-sm font-semibold">{metric.value}</div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="flex gap-2">
        <div className="flex-1 h-14 bg-gray-200 rounded" />
        <div className="flex-1 h-14 bg-gray-200 rounded" />
        <div className="flex-1 h-14 bg-gray-200 rounded" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 bg-gray-200 rounded w-24" />
        <div className="h-8 bg-gray-200 rounded w-28" />
      </div>
    </div>
  );
}

function formatInsight(text: string): React.ReactNode {
  // Convert **text** to bold spans
  const parts = (text ?? '').split(/(\*\*[^*]+\*\*)/g);
  return (parts ?? []).map((part, index) => {
    if ((part ?? '').startsWith('**') && (part ?? '').endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-[var(--text-primary)]">
          {(part ?? []).slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export default function ChartAIPopover({
  analysis,
  loading,
  onClose,
  onFollowUp,
}: ChartAIPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        // Check if click is on the trigger button (has data-ai-trigger)
        const target = e.target as HTMLElement;
        if (target.closest('[data-ai-trigger]')) {
          return; // Let the toggle handle it
        }
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleFollowUpClick = (prompt: string) => {
    onFollowUp(prompt);
    onClose();
  };

  return (
    <div
      ref={popoverRef}
      className="absolute left-0 right-0 top-full mt-1 z-[100] bg-white border border-[var(--border-default)] rounded-lg shadow-xl overflow-hidden"
      style={{ minWidth: '300px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-[var(--accent-primary-light)] to-white border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[var(--accent-primary)]" />
          <span className="text-xs font-medium text-[var(--text-primary)]">AI Analysis</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/50 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="p-3 max-h-[220px] overflow-y-auto">
        {loading ? (
          <LoadingSkeleton />
        ) : analysis ? (
          <div className="space-y-3">
            {/* Insight */}
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {formatInsight(analysis?.insight ?? '')}
            </p>

            {/* Metrics */}
            {analysis?.metrics && Array.isArray(analysis.metrics) && (analysis.metrics ?? []).length > 0 && (
              <div className="flex gap-2">
                {(analysis?.metrics ?? []).slice(0, 3).map((metric, idx) => (
                  <MetricCard key={idx} metric={metric} />
                ))}
              </div>
            )}

            {/* Follow-ups */}
            {analysis?.follow_ups && Array.isArray(analysis.follow_ups) && (analysis.follow_ups ?? []).length > 0 && (
              <div className="pt-2 border-t border-[var(--border-subtle)]">
                <div className="flex flex-wrap gap-1.5">
                  {/* Main action buttons */}
                  <button
                    onClick={() => handleFollowUpClick(analysis.follow_ups[0]?.prompt || '')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-[var(--accent-primary)] text-white hover:bg-[#4338CA] transition-colors"
                  >
                    <ArrowUpRight size={12} />
                    Drill deeper
                  </button>
                  <button
                    onClick={() => {
                      // Open chat with context from this chart
                      onFollowUp(`Analyze the ${(analysis.insight ?? '').split('**')[1] || 'data'} in more detail`);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <MessageSquare size={12} />
                    Ask in chat
                  </button>
                </div>

                {/* Follow-up chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(analysis?.follow_ups ?? []).map((followUp, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleFollowUpClick(followUp.prompt)}
                      className="text-[11px] px-2 py-1 rounded-md bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--accent-primary-light)] hover:text-[var(--accent-primary)] transition-colors"
                    >
                      {followUp.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-tertiary)]">No analysis available</p>
        )}
      </div>
    </div>
  );
}
