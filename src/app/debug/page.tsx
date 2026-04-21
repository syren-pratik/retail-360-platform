'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, FileQuestion, ChevronDown, ChevronRight } from 'lucide-react';

interface CacheFileResult {
  status: 'ok' | 'error' | 'missing' | 'warning';
  errors: string[];
  warnings: string[];
  rowCount?: number;
  sampleKeys?: string[];
  fileSize?: number;
  lastModified?: string;
}

interface HealthCheckResponse {
  summary: {
    total: number;
    healthy: number;
    warnings: number;
    errors: number;
    missing: number;
  };
  byModule: Record<string, Record<string, CacheFileResult>>;
  results: Record<string, CacheFileResult>;
  timestamp: string;
}

const STATUS_ICONS = {
  ok: <CheckCircle size={16} className="text-green-500" />,
  warning: <AlertTriangle size={16} className="text-amber-500" />,
  error: <XCircle size={16} className="text-red-500" />,
  missing: <FileQuestion size={16} className="text-gray-400" />,
};

const STATUS_COLORS = {
  ok: 'bg-green-50 border-green-200',
  warning: 'bg-amber-50 border-amber-200',
  error: 'bg-red-50 border-red-200',
  missing: 'bg-gray-50 border-gray-200',
};

function formatFileSize(bytes?: number): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CacheFileRow({ name, result }: { name: string; result: CacheFileResult }) {
  const [expanded, setExpanded] = useState(result.status === 'error');

  return (
    <div className={`border rounded-lg ${STATUS_COLORS[result.status]} mb-2`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-white/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {STATUS_ICONS[result.status]}
          <span className="font-mono text-sm">{name}.json</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
          {result.rowCount !== undefined && (
            <span>{result.rowCount} rows</span>
          )}
          <span>{formatFileSize(result.fileSize)}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-white/50">
          {result.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-red-600 mb-1">Errors:</p>
              <ul className="text-xs text-red-700 pl-4 list-disc">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          {result.warnings.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-amber-600 mb-1">Warnings:</p>
              <ul className="text-xs text-amber-700 pl-4 list-disc">
                {result.warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}
          {result.sampleKeys && result.sampleKeys.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Keys found:</p>
              <p className="text-xs text-[var(--text-tertiary)] font-mono">
                {result.sampleKeys.join(', ')}
              </p>
            </div>
          )}
          {result.lastModified && (
            <p className="text-xs text-[var(--text-tertiary)] mt-2">
              Last modified: {new Date(result.lastModified).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ModuleSection({
  name,
  results,
}: {
  name: string;
  results: Record<string, CacheFileResult>;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const entries = Object.entries(results);
  if (entries.length === 0) return null;

  const summary = {
    ok: entries.filter(([, r]) => r.status === 'ok').length,
    warning: entries.filter(([, r]) => r.status === 'warning').length,
    error: entries.filter(([, r]) => r.status === 'error').length,
    missing: entries.filter(([, r]) => r.status === 'missing').length,
  };

  return (
    <div className="mb-6">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between mb-3 hover:bg-gray-50 p-2 rounded -ml-2"
      >
        <div className="flex items-center gap-2">
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            {name}
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {summary.ok > 0 && (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle size={12} /> {summary.ok}
            </span>
          )}
          {summary.warning > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertTriangle size={12} /> {summary.warning}
            </span>
          )}
          {summary.error > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <XCircle size={12} /> {summary.error}
            </span>
          )}
          {summary.missing > 0 && (
            <span className="flex items-center gap-1 text-gray-400">
              <FileQuestion size={12} /> {summary.missing}
            </span>
          )}
        </div>
      </button>

      {!collapsed && (
        <div className="pl-4">
          {entries.map(([name, result]) => (
            <CacheFileRow key={name} name={name} result={result} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DebugPage() {
  const [data, setData] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health-check');
      if (!res.ok) throw new Error('Failed to fetch health check');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHealth();
  };

  const handleRefreshCache = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/refresh-cache', { method: 'POST' });
      await fetchHealth();
    } catch {
      setError('Failed to refresh cache');
    }
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <RefreshCw className="animate-spin text-[var(--accent-primary)]" size={32} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Data Health Check
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Validate cache data against expected contracts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefreshCache}
            disabled={refreshing}
            className="px-4 py-2 text-sm font-medium bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
          >
            Refresh Cache
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <CheckCircle size={18} />
                <span className="text-2xl font-semibold">{data.summary.healthy}</span>
              </div>
              <p className="text-xs text-green-700">Healthy</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-amber-600 mb-1">
                <AlertTriangle size={18} />
                <span className="text-2xl font-semibold">{data.summary.warnings}</span>
              </div>
              <p className="text-xs text-amber-700">Warnings</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-600 mb-1">
                <XCircle size={18} />
                <span className="text-2xl font-semibold">{data.summary.errors}</span>
              </div>
              <p className="text-xs text-red-700">Errors</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <FileQuestion size={18} />
                <span className="text-2xl font-semibold">{data.summary.missing}</span>
              </div>
              <p className="text-xs text-gray-600">Missing</p>
            </div>
          </div>

          {/* Timestamp */}
          <p className="text-xs text-[var(--text-tertiary)] mb-6">
            Last checked: {new Date(data.timestamp).toLocaleString()}
          </p>

          {/* Module Sections */}
          <ModuleSection name="CX360" results={data.byModule.cx360} />
          <ModuleSection name="Demand" results={data.byModule.demand} />
          <ModuleSection name="Inventory" results={data.byModule.inventory} />
          <ModuleSection name="Price" results={data.byModule.price} />
          <ModuleSection name="Shared" results={data.byModule.shared} />
          {Object.keys(data.byModule.unknown).length > 0 && (
            <ModuleSection name="Other" results={data.byModule.unknown} />
          )}
        </>
      )}
    </div>
  );
}
