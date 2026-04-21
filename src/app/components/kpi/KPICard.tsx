'use client';

import { useState, useEffect, memo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface KPICardProps {
  label: string;
  value: string;
  change: number;
  changeLabel?: string;
  invertColors?: boolean; // For metrics where decrease is good (like churn)
  sparklineData?: number[]; // 6 data points for the mini trend line
  filteredCount?: number; // Current filtered count
  totalCount?: number; // Total unfiltered count
}

function KPICardComponent({
  label,
  value,
  change,
  changeLabel = 'vs prior period',
  invertColors = false,
  sparklineData,
  filteredCount,
  totalCount,
}: KPICardProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isPositive = change > 0;
  const isNeutral = change === 0;

  // Determine if change is "good" or "bad"
  const isGood = invertColors ? !isPositive : isPositive;

  const getTrendIcon = () => {
    if (isNeutral) return <Minus size={12} />;
    return isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />;
  };

  const getBadgeClass = () => {
    if (isNeutral) return 'badge-neutral';
    return isGood ? 'badge-positive' : 'badge-negative';
  };

  const getSparklineColor = () => {
    if (isNeutral) return 'var(--chart-blue)';
    return isGood ? 'var(--positive)' : 'var(--negative)';
  };

  const formatChange = () => {
    const sign = isPositive ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  // Transform sparkline data for Recharts
  const chartData = sparklineData?.map((val, index) => ({ value: val, index })) || [];

  // Show filtered indicator only when there's a difference
  const showFiltered = filteredCount !== undefined && totalCount !== undefined && filteredCount < totalCount;

  return (
    <div className="card relative overflow-hidden">
      {/* Sparkline - positioned in top right */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="absolute top-3 right-3 w-20 h-8 opacity-80">
          {isMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={getSparklineColor()}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full bg-[var(--bg-secondary)] rounded animate-pulse" />
          )}
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-[var(--text-secondary)] mb-1">{label}</p>
          <p className="text-3xl font-semibold text-[var(--text-primary)]">{value}</p>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center gap-2">
          <span className={`badge ${getBadgeClass()} flex items-center gap-1`}>
            {getTrendIcon()}
            {formatChange()}
          </span>
          <span className="text-xs text-[var(--text-tertiary)]">{changeLabel}</span>
        </div>

        {/* Filtered indicator */}
        {showFiltered && (
          <p className="text-xs text-[var(--text-tertiary)] mt-2">
            Filtered: {filteredCount?.toLocaleString()} of {totalCount?.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders when filters change but KPI values haven't
const KPICard = memo(KPICardComponent, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these values actually change
  return (
    prevProps.label === nextProps.label &&
    prevProps.value === nextProps.value &&
    prevProps.change === nextProps.change &&
    prevProps.invertColors === nextProps.invertColors &&
    prevProps.filteredCount === nextProps.filteredCount &&
    prevProps.totalCount === nextProps.totalCount &&
    JSON.stringify(prevProps.sparklineData) === JSON.stringify(nextProps.sparklineData)
  );
});

export default KPICard;
