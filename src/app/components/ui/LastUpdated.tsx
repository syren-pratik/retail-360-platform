'use client';

import { useState, useEffect } from 'react';
import { Clock, RefreshCw } from 'lucide-react';

interface LastUpdatedProps {
  timestamp?: Date;
  onRefresh?: () => void;
  showLiveIndicator?: boolean;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Shows last updated timestamp with optional refresh button and live indicator
 */
export default function LastUpdated({
  timestamp = new Date(),
  onRefresh,
  showLiveIndicator = false,
}: LastUpdatedProps) {
  const [displayTime, setDisplayTime] = useState(formatRelativeTime(timestamp));
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update the relative time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayTime(formatRelativeTime(timestamp));
    }, 60000);

    return () => clearInterval(interval);
  }, [timestamp]);

  const handleRefresh = async () => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  return (
    <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
      {showLiveIndicator && (
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-dot" />
          <span className="text-green-600 font-medium">Live</span>
        </span>
      )}
      <Clock size={12} />
      <span>Updated {displayTime}</span>
      {onRefresh && (
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-1 rounded hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50"
          title="Refresh data"
        >
          <RefreshCw
            size={12}
            className={isRefreshing ? 'animate-spin' : ''}
          />
        </button>
      )}
    </div>
  );
}
