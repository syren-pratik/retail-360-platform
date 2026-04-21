'use client';

import { BarChart3, Users, TrendingUp, Package, Filter, Search, Database } from 'lucide-react';

type IconType = 'chart' | 'users' | 'trend' | 'product' | 'filter' | 'search' | 'data';

interface EmptyStateProps {
  icon?: IconType;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const iconMap = {
  chart: BarChart3,
  users: Users,
  trend: TrendingUp,
  product: Package,
  filter: Filter,
  search: Search,
  data: Database,
};

/**
 * Empty state component for when filters return no data
 */
export default function EmptyState({
  icon = 'chart',
  title = 'No data matches your filters',
  message = 'Try adjusting your filters or date range to see results',
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  const IconComponent = iconMap[icon];

  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
        <IconComponent size={24} className="text-[var(--text-tertiary)]" />
      </div>
      <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">
        {title}
      </h3>
      <p className="text-sm text-[var(--text-tertiary)] max-w-xs">
        {message}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 text-sm text-[var(--accent-primary)] hover:underline font-medium"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/**
 * Empty state for charts - fits inside a chart card
 */
export function ChartEmptyState({
  title = 'No data available',
  message = 'Adjust filters to see chart data',
  onReset,
}: {
  title?: string;
  message?: string;
  onReset?: () => void;
}) {
  return (
    <div className="h-full min-h-[200px] flex flex-col items-center justify-center">
      <BarChart3 size={32} className="text-[var(--text-tertiary)] mb-3" />
      <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
      <p className="text-xs text-[var(--text-tertiary)] mt-1">{message}</p>
      {onReset && (
        <button
          onClick={onReset}
          className="mt-3 text-xs text-[var(--accent-primary)] hover:underline"
        >
          Reset filters
        </button>
      )}
    </div>
  );
}

/**
 * Empty state for tables
 */
export function TableEmptyState({
  title = 'No records found',
  message = 'No data matches your current filters',
  onReset,
}: {
  title?: string;
  message?: string;
  onReset?: () => void;
}) {
  return (
    <div className="py-16 flex flex-col items-center justify-center">
      <Database size={40} className="text-[var(--text-tertiary)] mb-4" />
      <p className="text-base font-medium text-[var(--text-secondary)]">{title}</p>
      <p className="text-sm text-[var(--text-tertiary)] mt-1">{message}</p>
      {onReset && (
        <button
          onClick={onReset}
          className="mt-4 px-4 py-2 text-sm bg-[var(--accent-primary)] text-white rounded-md hover:bg-[var(--accent-primary-hover)] transition-colors"
        >
          Reset all filters
        </button>
      )}
    </div>
  );
}

/**
 * Empty state for search results
 */
export function SearchEmptyState({
  query,
  onClear,
}: {
  query: string;
  onClear?: () => void;
}) {
  return (
    <div className="py-8 flex flex-col items-center justify-center">
      <Search size={32} className="text-[var(--text-tertiary)] mb-3" />
      <p className="text-sm font-medium text-[var(--text-secondary)]">
        No results for &quot;{query}&quot;
      </p>
      <p className="text-xs text-[var(--text-tertiary)] mt-1">
        Try a different search term
      </p>
      {onClear && (
        <button
          onClick={onClear}
          className="mt-3 text-xs text-[var(--accent-primary)] hover:underline"
        >
          Clear search
        </button>
      )}
    </div>
  );
}
