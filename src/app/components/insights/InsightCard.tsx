'use client';

import { TrendingDown, AlertTriangle, Lightbulb, ChevronRight } from 'lucide-react';
import { Insight } from '@/app/lib/insight-engine';

interface InsightCardProps {
  insight: Insight;
  onViewClick?: () => void;
  compact?: boolean;
}

const severityColors: Record<string, { border: string; bg: string; text: string }> = {
  critical: { border: 'border-l-[#EF4444]', bg: 'bg-[#FEF2F2]', text: 'text-[#DC2626]' },
  warning: { border: 'border-l-[#F59E0B]', bg: 'bg-[#FFFBEB]', text: 'text-[#D97706]' },
  info: { border: 'border-l-[#3B82F6]', bg: 'bg-[#EFF6FF]', text: 'text-[#2563EB]' },
  positive: { border: 'border-l-[#10B981]', bg: 'bg-[#ECFDF5]', text: 'text-[#059669]' },
};

const typeIcons: Record<string, React.ReactNode> = {
  trend: <TrendingDown size={14} />,
  anomaly: <AlertTriangle size={14} />,
  opportunity: <Lightbulb size={14} />,
  risk: <AlertTriangle size={14} />,
};

export default function InsightCard({ insight, onViewClick, compact = false }: InsightCardProps) {
  const colors = severityColors[insight.severity];

  if (compact) {
    return (
      <div
        className={`flex-shrink-0 w-[200px] p-3 bg-white border border-[var(--border-default)] ${colors.border} border-l-4 rounded-lg cursor-pointer hover:shadow-md transition-shadow`}
        onClick={onViewClick}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <span className={colors.text}>{typeIcons[insight.type]}</span>
          <span className={`text-xs font-medium uppercase ${colors.text}`}>
            {insight.severity}
          </span>
        </div>
        <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-2 mb-1">
          {insight.title}
        </p>
        {insight.metric && (
          <p className={`text-lg font-semibold ${colors.text}`}>
            {insight.metric}
          </p>
        )}
        <div className="mt-2 flex items-center gap-1 text-xs text-[var(--accent-primary)]">
          <span>View</span>
          <ChevronRight size={12} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-4 bg-white border border-[var(--border-default)] ${colors.border} border-l-4 rounded-lg`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 mb-2">
          <span className={colors.text}>{typeIcons[insight.type]}</span>
          <span className={`text-xs font-medium uppercase ${colors.text}`}>
            {insight.severity}
          </span>
          <span className="text-xs text-[var(--text-tertiary)]">|</span>
          <span className="text-xs text-[var(--text-tertiary)] capitalize">
            {insight.type}
          </span>
        </div>
        {insight.metric && (
          <span className={`text-lg font-semibold ${colors.text}`}>
            {insight.metric}
          </span>
        )}
      </div>

      <h4 className="text-base font-medium text-[var(--text-primary)] mb-1">
        {insight.title}
      </h4>
      <p className="text-sm text-[var(--text-secondary)] mb-3">
        {insight.description}
      </p>

      {insight.action && (
        <div className={`text-sm ${colors.bg} px-3 py-2 rounded-md mb-3`}>
          <span className="font-medium">Recommended: </span>
          {insight.action}
        </div>
      )}

      {onViewClick && (
        <button
          onClick={onViewClick}
          className="text-sm text-[var(--accent-primary)] hover:underline flex items-center gap-1"
        >
          View related chart
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}
