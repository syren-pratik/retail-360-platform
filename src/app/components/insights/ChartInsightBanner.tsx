'use client';

import { useState } from 'react';
import { X, Lightbulb, AlertTriangle, TrendingDown } from 'lucide-react';
import { Insight } from '@/app/lib/insight-engine';

interface ChartInsightBannerProps {
  insight: Insight;
}

const severityColors: Record<string, string> = {
  critical: 'text-[#DC2626] bg-[#FEF2F2]',
  warning: 'text-[#D97706] bg-[#FFFBEB]',
  info: 'text-[#2563EB] bg-[#EFF6FF]',
  positive: 'text-[#059669] bg-[#ECFDF5]',
};

const typeIcons: Record<string, React.ReactNode> = {
  trend: <TrendingDown size={12} />,
  anomaly: <AlertTriangle size={12} />,
  opportunity: <Lightbulb size={12} />,
  risk: <AlertTriangle size={12} />,
};

export default function ChartInsightBanner({ insight }: ChartInsightBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const colors = severityColors[insight.severity];

  return (
    <div className={`mt-3 pt-3 border-t border-[var(--border-subtle)]`}>
      <div className={`flex items-center justify-between px-3 py-2 rounded-md ${colors}`}>
        <div className="flex items-center gap-2 text-xs">
          <span>{typeIcons[insight.type]}</span>
          <span className="font-medium">{insight.title}</span>
          {insight.metric && (
            <span className="opacity-75">({insight.metric})</span>
          )}
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="p-0.5 rounded hover:bg-white/50 transition-colors"
          title="Dismiss"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
