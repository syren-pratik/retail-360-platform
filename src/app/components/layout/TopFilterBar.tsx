'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Calendar, ChevronDown, Download, RotateCcw, FileSpreadsheet, FileText, BarChart3, RefreshCw, Database, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useDashboard } from '@/app/context/DashboardContext';
import { hasActiveFilters } from '@/app/lib/filter-utils';
import { CustomerRecord } from '@/app/lib/types';
import { exportCSV, exportKPIs } from '@/app/lib/export-utils';
import CustomerSearch from './CustomerSearch';

interface RefreshResult {
  file: string;
  status: 'success' | 'error' | 'pending';
  time?: number;
  rows?: number;
  error?: string;
}

interface HealthStatus {
  databricks: {
    configured: boolean;
    connected: boolean;
    error: string | null;
  };
  cache: {
    lastRefresh: string | null;
  };
}

interface TopFilterBarProps {
  segments: string[];
  loyaltyTiers: string[];
  cities?: string[];
  acquisitionChannels?: string[];
  customers?: CustomerRecord[];
  kpis?: Record<string, unknown>;
  onExportAllData?: () => void;
}

const dateRangeOptions = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'YTD', label: 'Year to date' },
];

function getDateRangeFromPreset(preset: string): [string, string] {
  const end = new Date();
  const start = new Date();

  switch (preset) {
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
    case 'YTD':
      start.setMonth(0, 1); // January 1st of current year
      break;
    default:
      start.setDate(start.getDate() - 90);
  }

  return [start.toISOString().split('T')[0], end.toISOString().split('T')[0]];
}

function getPresetFromDateRange(dateRange: [string, string]): string {
  const [startStr] = dateRange;
  const start = new Date(startStr);
  const end = new Date();
  const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 7) return '7d';
  if (diffDays <= 30) return '30d';
  if (diffDays <= 90) return '90d';

  // Check if it's YTD
  const yearStart = new Date(end.getFullYear(), 0, 1);
  if (start.getTime() === yearStart.getTime()) return 'YTD';

  return '90d'; // Default
}

export default function TopFilterBar({
  segments,
  loyaltyTiers,
  cities = [],
  acquisitionChannels = [],
  customers = [],
  kpis,
  onExportAllData,
}: TopFilterBarProps) {
  const {
    globalFilters,
    setGlobalFilters,
    resetFilters,
    activeDrilldowns,
    clearAllDrilldowns,
  } = useDashboard();

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showRefreshPanel, setShowRefreshPanel] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshResults, setRefreshResults] = useState<RefreshResult[]>([]);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const refreshPanelRef = useRef<HTMLDivElement>(null);

  // Fetch health status on mount
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/health');
        if (response.ok) {
          const data = await response.json();
          setHealthStatus(data);
          setLastRefresh(data.cache?.lastRefresh);
        }
      } catch {
        // Health check failed, use defaults
      }
    };

    // Also fetch last refresh timestamp
    const fetchLastRefresh = async () => {
      try {
        const response = await fetch('/api/refresh-cache');
        if (response.ok) {
          const data = await response.json();
          if (data.lastRefresh) {
            setLastRefresh(data.lastRefresh);
          }
        }
      } catch {
        // Ignore
      }
    };

    fetchHealth();
    fetchLastRefresh();
  }, []);

  // Close panels when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (refreshPanelRef.current && !refreshPanelRef.current.contains(e.target as Node)) {
        if (!isRefreshing) {
          setShowRefreshPanel(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isRefreshing]);

  const handleRefreshData = useCallback(async () => {
    if (!healthStatus?.databricks?.configured) {
      toast.error('Databricks not configured. Set environment variables in .env.local');
      return;
    }

    setIsRefreshing(true);
    setShowRefreshPanel(true);
    setRefreshResults([]);

    try {
      const response = await fetch('/api/refresh-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: 'cx360' }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Refresh failed');
        return;
      }

      setRefreshResults(data.results || []);
      setLastRefresh(data.lastRefresh);

      const { summary } = data;
      if (summary.failed > 0) {
        toast.warning(`Refreshed ${summary.success}/${summary.total} files. ${summary.failed} failed.`);
      } else {
        toast.success(`Data refreshed successfully (${summary.total} files, ${(summary.totalTime / 1000).toFixed(1)}s)`);
      }

      // Reload page data after successful refresh
      if (summary.success > 0) {
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (error) {
      toast.error('Failed to refresh data');
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [healthStatus]);

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

    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getDataSourceBadge = () => {
    if (!healthStatus) return null;

    if (healthStatus.databricks.connected) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          Live: Databricks
        </span>
      );
    }

    if (healthStatus.databricks.configured && !healthStatus.databricks.connected) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          Offline
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Mock Data
      </span>
    );
  };

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportDashboard = () => {
    setShowExportMenu(false);
    toast.info('Dashboard PDF export coming soon!');
  };

  const handleExportAllData = () => {
    setShowExportMenu(false);
    if (onExportAllData) {
      onExportAllData();
    } else if (customers.length > 0) {
      exportCSV(customers as unknown as Record<string, unknown>[], 'customers');
      toast.success('Customer data exported successfully');
    }
  };

  const handleExportKPIs = () => {
    setShowExportMenu(false);
    if (kpis) {
      exportKPIs(kpis, globalFilters as unknown as Record<string, unknown>);
      toast.success('KPIs exported successfully');
    } else {
      toast.error('No KPI data available');
    }
  };

  const dateRangePreset = getPresetFromDateRange(globalFilters.dateRange);
  const showResetButton = hasActiveFilters(globalFilters) || activeDrilldowns.length > 0;

  const handleDateRangeChange = (preset: string) => {
    setGlobalFilters({ dateRange: getDateRangeFromPreset(preset) });
  };

  const handleSegmentChange = (value: string) => {
    if (value === 'all') {
      setGlobalFilters({ segments: [] });
    } else {
      setGlobalFilters({ segments: [value] });
    }
  };

  const handleLoyaltyTierChange = (value: string) => {
    if (value === 'all') {
      setGlobalFilters({ loyaltyTiers: [] });
    } else {
      setGlobalFilters({ loyaltyTiers: [value] });
    }
  };

  const handleChannelChange = (value: string) => {
    setGlobalFilters({ channel: value });
  };

  const handleCityChange = (value: string) => {
    if (value === 'all') {
      setGlobalFilters({ cities: [] });
    } else {
      setGlobalFilters({ cities: [value] });
    }
  };

  const handleResetAll = () => {
    resetFilters();
    clearAllDrilldowns();
  };

  // Get current selected values for display
  const currentSegment = globalFilters.segments.length === 1 ? globalFilters.segments[0] : 'all';
  const currentLoyaltyTier = globalFilters.loyaltyTiers.length === 1 ? globalFilters.loyaltyTiers[0] : 'all';
  const currentCity = globalFilters.cities && globalFilters.cities.length === 1 ? globalFilters.cities[0] : 'all';

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-[var(--border-default)] px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Filters */}
        <div className="flex items-center gap-2">
          {/* Date Range */}
          <div className="relative">
            <select
              value={dateRangePreset}
              onChange={(e) => handleDateRangeChange(e.target.value)}
              className="h-9 px-3 pr-8 text-sm border border-[var(--border-default)] rounded-md bg-white appearance-none cursor-pointer hover:border-[var(--border-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-20"
            >
              {dateRangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Calendar
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none"
            />
          </div>

          {/* Segment Filter */}
          <div className="relative">
            <select
              value={currentSegment}
              onChange={(e) => handleSegmentChange(e.target.value)}
              className="h-9 px-3 pr-8 text-sm border border-[var(--border-default)] rounded-md bg-white appearance-none cursor-pointer hover:border-[var(--border-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-20"
            >
              <option value="all">All Segments</option>
              {segments.map((seg) => (
                <option key={seg} value={seg}>
                  {seg}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none"
            />
          </div>

          {/* Loyalty Tier Filter */}
          <div className="relative">
            <select
              value={currentLoyaltyTier}
              onChange={(e) => handleLoyaltyTierChange(e.target.value)}
              className="h-9 px-3 pr-8 text-sm border border-[var(--border-default)] rounded-md bg-white appearance-none cursor-pointer hover:border-[var(--border-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-20"
            >
              <option value="all">All Tiers</option>
              {loyaltyTiers.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none"
            />
          </div>

          {/* Acquisition Channel Filter */}
          {acquisitionChannels.length > 0 && (
            <div className="relative">
              <select
                value={globalFilters.channel}
                onChange={(e) => handleChannelChange(e.target.value)}
                className="h-9 px-3 pr-8 text-sm border border-[var(--border-default)] rounded-md bg-white appearance-none cursor-pointer hover:border-[var(--border-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-20"
              >
                <option value="all">All Channels</option>
                {acquisitionChannels.map((ch) => (
                  <option key={ch} value={ch}>{ch}</option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none"
              />
            </div>
          )}

          {/* Geography Filter */}
          {cities.length > 0 && (
            <div className="relative">
              <select
                value={currentCity}
                onChange={(e) => handleCityChange(e.target.value)}
                className="h-9 px-3 pr-8 text-sm border border-[var(--border-default)] rounded-md bg-white appearance-none cursor-pointer hover:border-[var(--border-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-20"
              >
                <option value="all">All Cities</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none"
              />
            </div>
          )}

          {/* Divider */}
          <div className="w-px h-6 bg-[var(--border-default)] mx-1" />

          {/* Customer Search */}
          <CustomerSearch customers={customers} />
        </div>

        {/* Right: Status & Actions */}
        <div className="flex items-center gap-3">
          {/* Data Source Badge */}
          {getDataSourceBadge()}

          {/* Last Refresh Timestamp */}
          {lastRefresh && (
            <span className="text-xs text-[var(--text-tertiary)]">
              Updated: {formatLastRefresh(lastRefresh)}
            </span>
          )}

          {/* Refresh Data Button */}
        <div className="relative" ref={refreshPanelRef}>
          <button
            onClick={handleRefreshData}
            disabled={isRefreshing || !healthStatus?.databricks?.configured}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title={!healthStatus?.databricks?.configured ? 'Databricks not configured' : 'Refresh data from Databricks'}
          >
            {isRefreshing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>

          {/* Refresh Progress Panel */}
          {showRefreshPanel && refreshResults.length > 0 && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-[var(--border-default)] p-4 z-50 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Database size={16} className="text-[var(--accent-primary)]" />
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {isRefreshing ? 'Refreshing data...' : 'Refresh Complete'}
                  </span>
                </div>
                {!isRefreshing && (
                  <button
                    onClick={() => setShowRefreshPanel(false)}
                    className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                  >
                    <XCircle size={16} />
                  </button>
                )}
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {refreshResults.map((result) => (
                  <div key={result.file} className="flex items-center gap-2 text-xs">
                    {result.status === 'success' ? (
                      <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" />
                    ) : result.status === 'error' ? (
                      <XCircle size={12} className="text-red-500 flex-shrink-0" />
                    ) : (
                      <Loader2 size={12} className="text-[var(--text-tertiary)] animate-spin flex-shrink-0" />
                    )}
                    <span className="text-[var(--text-secondary)] truncate flex-1">
                      {result.file.replace('.json', '')}
                    </span>
                    {result.status === 'success' && result.time && (
                      <span className="text-[var(--text-tertiary)]">
                        {(result.time / 1000).toFixed(1)}s
                      </span>
                    )}
                    {result.status === 'error' && (
                      <span className="text-red-500 truncate max-w-[100px]" title={result.error}>
                        Failed
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Reset All Button */}
        {showResetButton && (
          <button
            onClick={handleResetAll}
            className="btn-secondary flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <RotateCcw size={14} />
            <span>Reset All</span>
          </button>
        )}

        {/* Export Button with Dropdown */}
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="btn-secondary flex items-center gap-2"
          >
            <Download size={14} />
            <span>Export</span>
            <ChevronDown size={12} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
          </button>

          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-[var(--border-default)] py-1 z-50 animate-fade-in">
              <button
                onClick={handleExportDashboard}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <FileText size={16} />
                <div className="text-left">
                  <p className="font-medium">Export Dashboard (PDF)</p>
                  <p className="text-xs text-[var(--text-tertiary)]">Coming soon</p>
                </div>
              </button>
              <button
                onClick={handleExportAllData}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <FileSpreadsheet size={16} />
                <div className="text-left">
                  <p className="font-medium">Export All Data (CSV)</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{customers.length.toLocaleString()} customers</p>
                </div>
              </button>
              <button
                onClick={handleExportKPIs}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <BarChart3 size={16} />
                <div className="text-left">
                  <p className="font-medium">Export KPIs (CSV)</p>
                  <p className="text-xs text-[var(--text-tertiary)]">Current metrics + filters</p>
                </div>
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
