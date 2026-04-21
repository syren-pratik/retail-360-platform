'use client';

import { Database } from 'lucide-react';

interface NoDataFallbackProps {
  title?: string;
  message?: string;
  showRefreshHint?: boolean;
  height?: string;
}

export function NoDataFallback({
  title = 'Data not available',
  message = 'This data has not been loaded yet.',
  showRefreshHint = true,
  height = 'h-[200px]',
}: NoDataFallbackProps) {
  return (
    <div className={`bg-white border border-[var(--border-default)] rounded-lg p-6 flex flex-col items-center justify-center text-center ${height}`}>
      <Database className="h-8 w-8 text-gray-300 mb-3" />
      <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
      <p className="text-xs text-[var(--text-secondary)] mt-1">{message}</p>
      {showRefreshHint && (
        <p className="text-xs text-[var(--text-tertiary)] mt-3">
          Click &quot;Refresh Data&quot; to load from Databricks.
        </p>
      )}
    </div>
  );
}

export default NoDataFallback;
