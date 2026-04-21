'use client';

interface ChartEmptyStateProps {
  message?: string;
  suggestion?: string;
  icon?: 'chart' | 'table' | 'error' | 'loading';
  height?: string;
}

const ICONS = {
  chart: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 14l4-4 4 4 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  table: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </svg>
  ),
  error: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
    </svg>
  ),
  loading: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="animate-spin">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
    </svg>
  ),
};

export function ChartEmptyState({
  message = 'No data available',
  suggestion,
  icon = 'chart',
  height = 'h-64',
}: ChartEmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${height} text-center p-8 bg-gray-50 rounded-lg border border-gray-100`}>
      <div className="text-[var(--text-tertiary)] mb-3">
        {ICONS[icon]}
      </div>
      <p className="text-sm text-[var(--text-secondary)] font-medium">{message}</p>
      {suggestion && (
        <p className="text-xs text-[var(--text-tertiary)] mt-2 max-w-xs">{suggestion}</p>
      )}
    </div>
  );
}

// Variants for different contexts
export function TableEmptyState({ message, suggestion }: { message?: string; suggestion?: string }) {
  return (
    <ChartEmptyState
      message={message || 'No records found'}
      suggestion={suggestion}
      icon="table"
      height="h-48"
    />
  );
}

export function ErrorState({ message, suggestion }: { message?: string; suggestion?: string }) {
  return (
    <ChartEmptyState
      message={message || 'Failed to load data'}
      suggestion={suggestion || 'Try refreshing the page or check your connection'}
      icon="error"
      height="h-48"
    />
  );
}

export function LoadingState({ message }: { message?: string }) {
  return (
    <ChartEmptyState
      message={message || 'Loading...'}
      icon="loading"
      height="h-48"
    />
  );
}

export default ChartEmptyState;
