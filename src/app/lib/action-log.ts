'use client';

import { Action } from '@/app/hooks/useNextBestAction';

export interface ActionLogEntry {
  id: string;
  customerId: string;
  customerName?: string;
  action: Action;
  status: 'executed' | 'skipped' | 'customized';
  timestamp: number;
  executedBy?: string;
  notes?: string;
  customization?: {
    originalOffer: string;
    modifiedOffer: string;
    originalChannel: string;
    modifiedChannel: string;
  };
}

const ACTION_LOG_KEY = 'cx360_action_log';
const MAX_LOG_ENTRIES = 500;

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get all action logs from localStorage
export function getActionLog(customerId?: string): ActionLogEntry[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = localStorage.getItem(ACTION_LOG_KEY);
    if (!stored) {
      return [];
    }

    const logs: ActionLogEntry[] = JSON.parse(stored);

    if (customerId) {
      return logs.filter((entry) => entry.customerId === customerId);
    }

    return logs;
  } catch (error) {
    console.error('Failed to read action log:', error);
    return [];
  }
}

// Log a new action
export function logAction(entry: Omit<ActionLogEntry, 'id' | 'timestamp'>): ActionLogEntry {
  if (typeof window === 'undefined') {
    throw new Error('Action logging is only available in the browser');
  }

  const newEntry: ActionLogEntry = {
    ...entry,
    id: generateId(),
    timestamp: Date.now(),
  };

  try {
    const logs = getActionLog();

    // Add new entry at the beginning
    logs.unshift(newEntry);

    // Keep only the most recent entries
    const trimmedLogs = logs.slice(0, MAX_LOG_ENTRIES);

    localStorage.setItem(ACTION_LOG_KEY, JSON.stringify(trimmedLogs));

    return newEntry;
  } catch (error) {
    console.error('Failed to log action:', error);
    throw error;
  }
}

// Get recent actions for a customer
export function getRecentActions(customerId: string, limit: number = 10): ActionLogEntry[] {
  const logs = getActionLog(customerId);
  return logs.slice(0, limit);
}

// Get action statistics for a customer
export function getActionStats(customerId: string): {
  total: number;
  executed: number;
  skipped: number;
  customized: number;
  lastAction: ActionLogEntry | null;
} {
  const logs = getActionLog(customerId);

  return {
    total: logs.length,
    executed: logs.filter((l) => l.status === 'executed').length,
    skipped: logs.filter((l) => l.status === 'skipped').length,
    customized: logs.filter((l) => l.status === 'customized').length,
    lastAction: logs[0] || null,
  };
}

// Get global action statistics
export function getGlobalActionStats(): {
  total: number;
  executed: number;
  skipped: number;
  customized: number;
  byActionType: Record<string, number>;
  last7Days: number;
  last30Days: number;
} {
  const logs = getActionLog();
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const byActionType: Record<string, number> = {};
  logs.forEach((log) => {
    const type = log.action.action_type;
    byActionType[type] = (byActionType[type] || 0) + 1;
  });

  return {
    total: logs.length,
    executed: logs.filter((l) => l.status === 'executed').length,
    skipped: logs.filter((l) => l.status === 'skipped').length,
    customized: logs.filter((l) => l.status === 'customized').length,
    byActionType,
    last7Days: logs.filter((l) => l.timestamp > sevenDaysAgo).length,
    last30Days: logs.filter((l) => l.timestamp > thirtyDaysAgo).length,
  };
}

// Clear action log (for testing/admin)
export function clearActionLog(customerId?: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (customerId) {
    const logs = getActionLog();
    const filteredLogs = logs.filter((entry) => entry.customerId !== customerId);
    localStorage.setItem(ACTION_LOG_KEY, JSON.stringify(filteredLogs));
  } else {
    localStorage.removeItem(ACTION_LOG_KEY);
  }
}

// Format timestamp for display
export function formatActionTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// Get action type display label
export function getActionTypeLabel(actionType: Action['action_type']): string {
  const labels: Record<Action['action_type'], string> = {
    retain: 'Retention',
    upsell: 'Upsell',
    cross_sell: 'Cross-sell',
    win_back: 'Win-back',
    reward: 'Reward',
    no_action: 'Monitor',
  };
  return labels[actionType] || actionType;
}

// Get status display label and color
export function getStatusDisplay(status: ActionLogEntry['status']): {
  label: string;
  color: string;
  bgColor: string;
} {
  const displays: Record<ActionLogEntry['status'], { label: string; color: string; bgColor: string }> = {
    executed: { label: 'Executed', color: 'text-green-700', bgColor: 'bg-green-100' },
    skipped: { label: 'Skipped', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    customized: { label: 'Customized', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  };
  return displays[status];
}
