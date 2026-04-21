'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, X } from 'lucide-react';

interface ConnectionStatus {
  databricksConfigured: boolean;
  databricksConnected: boolean;
  aiConfigured: boolean;
  lastCacheRefresh: string | null;
}

export function ConnectionHealthBanner() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkStatus();
    // Check status every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/settings/status');
      if (response.ok) {
        const data = await response.json();
        setStatus({
          databricksConfigured: data.databricksConfigured,
          databricksConnected: data.databricksConnected,
          aiConfigured: !!data.aiConfigured || !!data.anthropicConfigured,
          lastCacheRefresh: data.lastCacheRefresh || null,
        });
      }
    } catch {
      setStatus({
        databricksConfigured: false,
        databricksConnected: false,
        aiConfigured: false,
        lastCacheRefresh: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/refresh-cache', { method: 'POST' });
      if (response.ok) {
        await checkStatus();
        window.location.reload();
      }
    } catch {
      // Handle error silently
    } finally {
      setRefreshing(false);
    }
  };

  // Don't show anything while loading or if dismissed
  if (loading || dismissed) return null;

  // Don't show if everything is connected
  if (status?.databricksConfigured && status?.databricksConnected) return null;

  // Determine severity
  const isError = !status?.databricksConfigured;
  const isWarning = status?.databricksConfigured && !status?.databricksConnected;

  return (
    <div
      className={`
        sticky top-0 z-50 px-4 py-3 flex items-center justify-between gap-4
        ${isError
          ? 'bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800'
          : 'bg-yellow-50 dark:bg-yellow-900/30 border-b border-yellow-200 dark:border-yellow-800'
        }
      `}
    >
      <div className="flex items-center gap-3">
        {isError ? (
          <XCircle className="h-5 w-5 text-red-500" />
        ) : isWarning ? (
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
        ) : (
          <CheckCircle className="h-5 w-5 text-green-500" />
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
          <span className={`text-sm font-medium ${isError ? 'text-red-800 dark:text-red-300' : 'text-yellow-800 dark:text-yellow-300'}`}>
            {isError
              ? 'Databricks Not Configured'
              : 'Databricks Connection Lost'
            }
          </span>
          <span className={`text-sm ${isError ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
            {isError
              ? 'Set DATABRICKS_HOST, DATABRICKS_TOKEN, and DATABRICKS_WAREHOUSE_ID in .env.local'
              : 'Unable to connect to Databricks. Data may be stale.'
            }
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {status?.databricksConfigured && !status?.databricksConnected && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md
              ${refreshing
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-yellow-600 text-white hover:bg-yellow-700'
              }
            `}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Retry
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        >
          <X className={`h-4 w-4 ${isError ? 'text-red-600' : 'text-yellow-600'}`} />
        </button>
      </div>
    </div>
  );
}

export default ConnectionHealthBanner;
