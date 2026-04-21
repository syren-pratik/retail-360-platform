'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Cpu,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileJson,
  Sparkles,
  Loader2,
  Activity,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface HealthStatus {
  databricks: {
    configured: boolean;
    connected: boolean;
    error: string | null;
    host?: string;
  };
  anthropic: {
    configured: boolean;
  };
  cache: {
    lastRefresh: string | null;
    fileCount: number;
    totalSize: number;
  };
}

interface RefreshResult {
  file: string;
  status: 'success' | 'error';
  time?: number;
  rows?: number;
  error?: string;
}

interface CacheMetadata {
  lastRefresh: string | null;
  results: RefreshResult[];
}

interface QueryStats {
  total: number;
  byType: {
    cache_refresh: number;
    on_demand: number;
    ai_chat: number;
  };
  avgDuration: number;
}

export default function SettingsPage() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [cacheMetadata, setCacheMetadata] = useState<CacheMetadata | null>(null);
  const [queryStats, setQueryStats] = useState<QueryStats | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshModule, setRefreshModule] = useState<'cx360' | 'demand' | 'all'>('cx360');
  const [refreshResults, setRefreshResults] = useState<RefreshResult[]>([]);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const fetchHealthStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        const data = await response.json();
        setHealthStatus(data);
      }
    } catch {
      console.error('Failed to fetch health status');
    }
  }, []);

  const fetchCacheMetadata = useCallback(async () => {
    try {
      const response = await fetch('/api/refresh-cache');
      if (response.ok) {
        const data = await response.json();
        setCacheMetadata(data);
      }
    } catch {
      console.error('Failed to fetch cache metadata');
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoadingStatus(true);
      await Promise.all([fetchHealthStatus(), fetchCacheMetadata()]);
      setIsLoadingStatus(false);
    };
    loadData();

    // Mock query stats (in a real app, this would come from an API)
    setQueryStats({
      total: 47,
      byType: {
        cache_refresh: 15,
        on_demand: 12,
        ai_chat: 20,
      },
      avgDuration: 1400,
    });
  }, [fetchHealthStatus, fetchCacheMetadata]);

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        const data = await response.json();
        setHealthStatus(data);
        if (data.databricks.connected) {
          toast.success('Databricks connection successful');
        } else if (data.databricks.configured) {
          toast.error(`Connection failed: ${data.databricks.error || 'Unknown error'}`);
        } else {
          toast.warning('Databricks not configured');
        }
      }
    } catch {
      toast.error('Failed to test connection');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleRefreshCache = async () => {
    if (!healthStatus?.databricks?.configured) {
      toast.error('Databricks not configured');
      return;
    }

    setIsRefreshing(true);
    setRefreshResults([]);

    try {
      const response = await fetch('/api/refresh-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: refreshModule }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Refresh failed');
        return;
      }

      setRefreshResults(data.results || []);
      setCacheMetadata({ lastRefresh: data.lastRefresh, results: data.results });

      const { summary } = data;
      if (summary.failed > 0) {
        toast.warning(`Refreshed ${summary.success}/${summary.total} files. ${summary.failed} failed.`);
      } else {
        toast.success(`Cache refreshed successfully (${summary.total} files, ${(summary.totalTime / 1000).toFixed(1)}s)`);
      }
    } catch (error) {
      toast.error('Failed to refresh cache');
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatLastRefresh = (timestamp: string | null): string => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/cx360"
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              ← Back to Dashboard
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Settings</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Configure data sources, manage cache, and monitor query usage
          </p>
        </div>

        <div className="space-y-6">
          {/* Data Connection Section */}
          <section className="card">
            <div className="flex items-center gap-2 mb-4">
              <Database size={20} className="text-[var(--accent-primary)]" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Data Connection</h2>
            </div>

            {isLoadingStatus ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/3" />
                <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/2" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Databricks Status */}
                <div className="flex items-center gap-3 p-4 bg-[var(--bg-secondary)] rounded-lg">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      healthStatus?.databricks?.connected
                        ? 'bg-green-100'
                        : healthStatus?.databricks?.configured
                        ? 'bg-red-100'
                        : 'bg-gray-100'
                    }`}
                  >
                    {healthStatus?.databricks?.connected ? (
                      <CheckCircle2 size={24} className="text-green-600" />
                    ) : healthStatus?.databricks?.configured ? (
                      <XCircle size={24} className="text-red-600" />
                    ) : (
                      <AlertCircle size={24} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[var(--text-primary)]">Databricks</p>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          healthStatus?.databricks?.connected
                            ? 'bg-green-100 text-green-700'
                            : healthStatus?.databricks?.configured
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {healthStatus?.databricks?.connected
                          ? 'Connected'
                          : healthStatus?.databricks?.configured
                          ? 'Disconnected'
                          : 'Not Configured'}
                      </span>
                    </div>
                    {healthStatus?.databricks?.host && (
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Host: {healthStatus.databricks.host}
                      </p>
                    )}
                    {healthStatus?.databricks?.error && (
                      <p className="text-xs text-red-600 mt-0.5">
                        Error: {healthStatus.databricks.error}
                      </p>
                    )}
                    {!healthStatus?.databricks?.configured && (
                      <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                        Set DATABRICKS_HOST, DATABRICKS_TOKEN, DATABRICKS_WAREHOUSE_ID in .env.local
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleTestConnection}
                    disabled={isTestingConnection || !healthStatus?.databricks?.configured}
                    className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50"
                  >
                    {isTestingConnection ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Zap size={14} />
                    )}
                    Test Connection
                  </button>
                </div>

                {/* Catalog Info */}
                {healthStatus?.databricks?.connected && (
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="p-3 border border-[var(--border-default)] rounded-lg">
                      <p className="text-xs text-[var(--text-tertiary)]">Catalog</p>
                      <p className="font-medium text-[var(--text-primary)]">hive_metastore</p>
                    </div>
                    <div className="p-3 border border-[var(--border-default)] rounded-lg">
                      <p className="text-xs text-[var(--text-tertiary)]">Schema</p>
                      <p className="font-medium text-[var(--text-primary)]">retail_gold</p>
                    </div>
                    <div className="p-3 border border-[var(--border-default)] rounded-lg">
                      <p className="text-xs text-[var(--text-tertiary)]">ML Schema</p>
                      <p className="font-medium text-[var(--text-primary)]">retail_ml</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Cache Management Section */}
          <section className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileJson size={20} className="text-[var(--accent-primary)]" />
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Cache Management</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-tertiary)]">
                  Last refresh: {formatLastRefresh(cacheMetadata?.lastRefresh || null)}
                </span>
              </div>
            </div>

            {/* Refresh Controls */}
            <div className="flex items-center gap-3 mb-4 p-3 bg-[var(--bg-secondary)] rounded-lg">
              <select
                value={refreshModule}
                onChange={(e) => setRefreshModule(e.target.value as 'cx360' | 'demand' | 'all')}
                className="input-base text-sm"
                disabled={isRefreshing}
              >
                <option value="cx360">CX360 Module</option>
                <option value="demand">Demand Module</option>
                <option value="all">All Modules</option>
              </select>
              <button
                onClick={handleRefreshCache}
                disabled={isRefreshing || !healthStatus?.databricks?.configured}
                className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
              >
                {isRefreshing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                {isRefreshing ? 'Refreshing...' : 'Refresh Cache'}
              </button>
              {!healthStatus?.databricks?.configured && (
                <span className="text-xs text-[var(--text-tertiary)]">
                  Configure Databricks to enable refresh
                </span>
              )}
            </div>

            {/* Refresh Results */}
            {refreshResults.length > 0 && (
              <div className="border border-[var(--border-default)] rounded-lg overflow-hidden mb-4">
                <div className="bg-[var(--bg-tertiary)] px-4 py-2 border-b border-[var(--border-default)]">
                  <p className="text-xs font-medium text-[var(--text-secondary)]">
                    Refresh Results ({refreshResults.filter(r => r.status === 'success').length}/{refreshResults.length} successful)
                  </p>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {refreshResults.map((result) => (
                    <div
                      key={result.file}
                      className="flex items-center gap-3 px-4 py-2 border-b border-[var(--border-subtle)] last:border-b-0"
                    >
                      {result.status === 'success' ? (
                        <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle size={14} className="text-red-500 flex-shrink-0" />
                      )}
                      <span className="text-xs font-mono text-[var(--text-primary)] flex-1 truncate">
                        {result.file}
                      </span>
                      {result.status === 'success' && (
                        <>
                          <span className="text-xs text-[var(--text-tertiary)]">
                            {result.rows} rows
                          </span>
                          <span className="text-xs text-[var(--text-tertiary)]">
                            {((result.time || 0) / 1000).toFixed(1)}s
                          </span>
                        </>
                      )}
                      {result.status === 'error' && (
                        <span className="text-xs text-red-500 truncate max-w-[150px]" title={result.error}>
                          {result.error}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cache Stats */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="p-3 border border-[var(--border-default)] rounded-lg">
                <p className="text-xs text-[var(--text-tertiary)]">Cache Files</p>
                <p className="font-medium text-[var(--text-primary)]">{healthStatus?.cache?.fileCount || 0}</p>
              </div>
              <div className="p-3 border border-[var(--border-default)] rounded-lg">
                <p className="text-xs text-[var(--text-tertiary)]">Total Size</p>
                <p className="font-medium text-[var(--text-primary)]">
                  {formatFileSize(healthStatus?.cache?.totalSize || 0)}
                </p>
              </div>
              <div className="p-3 border border-[var(--border-default)] rounded-lg">
                <p className="text-xs text-[var(--text-tertiary)]">Data Mode</p>
                <p className="font-medium text-[var(--text-primary)]">
                  {healthStatus?.databricks?.connected ? 'Live + Cache' : 'Cache Only'}
                </p>
              </div>
            </div>
          </section>

          {/* AI Assistant Section */}
          <section className="card">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={20} className="text-[var(--accent-primary)]" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">AI Assistant</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    healthStatus?.anthropic?.configured ? 'bg-green-100' : 'bg-amber-100'
                  }`}
                >
                  {healthStatus?.anthropic?.configured ? (
                    <CheckCircle2 size={20} className="text-green-600" />
                  ) : (
                    <AlertCircle size={20} className="text-amber-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">Claude API</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {healthStatus?.anthropic?.configured
                      ? 'Configured and ready'
                      : 'Not configured — AI chat will use mock responses'}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    healthStatus?.anthropic?.configured
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {healthStatus?.anthropic?.configured ? 'Active' : 'Mock Mode'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 border border-[var(--border-default)] rounded-lg">
                  <p className="text-xs text-[var(--text-tertiary)]">Model</p>
                  <p className="font-medium text-[var(--text-primary)]">Claude Sonnet 4</p>
                </div>
                <div className="p-3 border border-[var(--border-default)] rounded-lg">
                  <p className="text-xs text-[var(--text-tertiary)]">Query Source</p>
                  <p className="font-medium text-[var(--text-primary)]">
                    {healthStatus?.databricks?.connected ? 'Databricks (live)' : 'Mock Data'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Query Budget Section */}
          <section className="card">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={20} className="text-[var(--accent-primary)]" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Query Budget</h2>
            </div>

            {queryStats ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">Today&apos;s Queries</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Avg response time: {(queryStats.avgDuration / 1000).toFixed(1)}s
                    </p>
                  </div>
                  <span className="text-2xl font-semibold text-[var(--accent-primary)]">
                    {queryStats.total}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="p-3 border border-[var(--border-default)] rounded-lg">
                    <p className="text-xs text-[var(--text-tertiary)]">Cache Refresh</p>
                    <p className="font-medium text-[var(--text-primary)]">{queryStats.byType.cache_refresh}</p>
                  </div>
                  <div className="p-3 border border-[var(--border-default)] rounded-lg">
                    <p className="text-xs text-[var(--text-tertiary)]">On-Demand</p>
                    <p className="font-medium text-[var(--text-primary)]">{queryStats.byType.on_demand}</p>
                  </div>
                  <div className="p-3 border border-[var(--border-default)] rounded-lg">
                    <p className="text-xs text-[var(--text-tertiary)]">AI Chat</p>
                    <p className="font-medium text-[var(--text-primary)]">{queryStats.byType.ai_chat}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-tertiary)]">Loading query statistics...</p>
            )}
          </section>

          {/* About Section */}
          <section className="card">
            <div className="flex items-center gap-2 mb-4">
              <Cpu size={20} className="text-[var(--accent-primary)]" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">About</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-[var(--text-tertiary)]">Application</p>
                <p className="font-medium text-[var(--text-primary)]">CX360 Customer Analytics</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)]">Version</p>
                <p className="font-medium text-[var(--text-primary)]">0.2.0</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)]">Framework</p>
                <p className="font-medium text-[var(--text-primary)]">Next.js 14.2</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)]">Build Date</p>
                <p className="font-medium text-[var(--text-primary)]">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
