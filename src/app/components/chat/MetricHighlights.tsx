'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { safeLookup } from '@/app/lib/safe-data';

export interface MetricHighlight {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'positive' | 'negative' | 'warning' | 'neutral';
}

interface MetricHighlightsProps {
  metrics: MetricHighlight[];
}

const colorStyles: Record<string, string> = {
  positive: 'text-green-600',
  negative: 'text-red-600',
  warning: 'text-amber-600',
  neutral: 'text-[var(--text-primary)]',
};

const trendIcons: Record<string, typeof TrendingUp | null> = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
};

const trendColors: Record<string, string> = {
  up: 'text-green-500',
  down: 'text-red-500',
  neutral: 'text-gray-400',
};

export default function MetricHighlights({ metrics }: MetricHighlightsProps) {
  if (!metrics || metrics.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 my-2">
      {(metrics ?? []).map((metric, index) => {
        const TrendIcon = metric.trend ? safeLookup(trendIcons, metric.trend, null, { normalize: 'lowercase' }) : null;
        const valueColor = safeLookup(colorStyles, metric.color || 'neutral', colorStyles.neutral, { normalize: 'lowercase' });
        const trendColor = metric.trend ? safeLookup(trendColors, metric.trend, '', { normalize: 'lowercase' }) : '';

        return (
          <div
            key={index}
            className="flex-1 min-w-[85px] max-w-[110px] bg-[var(--bg-secondary)] rounded-lg p-2.5 text-center"
          >
            <div className={`text-lg font-semibold ${valueColor}`}>
              {metric.value}
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5 leading-tight">
              {metric.label}
            </div>
            {TrendIcon && (
              <div className={`flex items-center justify-center gap-0.5 mt-1 text-xs ${trendColor}`}>
                <TrendIcon size={10} />
                <span className="text-[10px]">
                  {metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '—'}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
