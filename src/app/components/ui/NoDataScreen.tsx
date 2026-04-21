'use client';

import { useState } from 'react';
import { Database, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface NoDataScreenProps {
  title?: string;
  description?: string;
  showRefreshButton?: boolean;
  onRefresh?: () => void;
  isLoading?: boolean;
  error?: string | null;
}

interface ConnectionStatus {
  databricksConfigured: boolean;
  databricksConnected: boolean;
  cachePopulated: boolean;
}

export function NoDataScreen({
  title = 'No Data Available',
  description = 'Data has not been loaded yet. Please refresh the cache from Databricks.',
  showRefreshButton = true,
  onRefresh,
  isLoading = false,
  error = null,
}: NoDataScreenProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);

  const checkConnection = async () => {
    try {
      const response = await fetch('/api/settings/status');
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus({
          databricksConfigured: data.databricksConfigured,
          databricksConnected: data.databricksConnected,
          cachePopulated: data.cachePopulated || false,
        });
      }
    } catch {
      // Silently fail connection check
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshError(null);
    setRefreshSuccess(false);

    try {
      // Check connection status first
      await checkConnection();

      // Call the refresh cache API
      const response = await fetch('/api/refresh-cache', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to refresh cache');
      }

      setRefreshSuccess(true);

      // Call parent callback if provided
      if (onRefresh) {
        onRefresh();
      }

      // Reload the page after a short delay to show the new data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : 'Failed to refresh cache');
    } finally {
      setRefreshing(false);
    }
  };

  const StatusIcon = ({ status }: { status: boolean | undefined }) => {
    if (status === undefined) return <span className="text-gray-400">-</span>;
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      {/* Icon */}
      <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
        <Database className="h-12 w-12 text-gray-400" />
      </div>

      {/* Title */}
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h2>

      {/* Description */}
      <p className="text-gray-600 dark:text-gray-400 max-w-md mb-6">
        {description}
      </p>

      {/* Error display */}
      {(error || refreshError) && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg max-w-md">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                Error
              </p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                {error || refreshError}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success message */}
      {refreshSuccess && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg max-w-md">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <p className="text-sm text-green-700 dark:text-green-400">
              Cache refreshed successfully! Reloading...
            </p>
          </div>
        </div>
      )}

      {/* Connection status */}
      {connectionStatus && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Connection Status
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-600 dark:text-gray-400">Databricks Configured</span>
              <StatusIcon status={connectionStatus.databricksConfigured} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-600 dark:text-gray-400">Databricks Connected</span>
              <StatusIcon status={connectionStatus.databricksConnected} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-600 dark:text-gray-400">Cache Populated</span>
              <StatusIcon status={connectionStatus.cachePopulated} />
            </div>
          </div>
        </div>
      )}

      {/* Refresh button */}
      {showRefreshButton && (
        <button
          onClick={handleRefresh}
          disabled={refreshing || isLoading}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
            ${refreshing || isLoading
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow'
            }
          `}
        >
          <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing Cache...' : 'Refresh from Databricks'}
        </button>
      )}

      {/* Help text */}
      <p className="mt-6 text-xs text-gray-500 dark:text-gray-500 max-w-md">
        This application requires a connection to Databricks. Ensure your .env.local file
        contains DATABRICKS_HOST, DATABRICKS_TOKEN, and DATABRICKS_WAREHOUSE_ID.
      </p>
    </div>
  );
}

export default NoDataScreen;
