'use client';

import { useState, useEffect } from 'react';
import {
  History,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  XCircle,
  Edit2,
  AlertTriangle,
  TrendingUp,
  Gift,
  Users,
  Trophy,
  Eye,
} from 'lucide-react';
import {
  ActionLogEntry,
  getRecentActions,
  getActionStats,
  formatActionTimestamp,
  getActionTypeLabel,
  getStatusDisplay,
} from '@/app/lib/action-log';
import { Action } from '@/app/hooks/useNextBestAction';

interface ActionHistoryProps {
  customerId: string;
  limit?: number;
}

const actionTypeIcons: Record<Action['action_type'], React.ReactNode> = {
  retain: <AlertTriangle size={14} />,
  upsell: <TrendingUp size={14} />,
  cross_sell: <Gift size={14} />,
  win_back: <Users size={14} />,
  reward: <Trophy size={14} />,
  no_action: <Eye size={14} />,
};

const statusIcons: Record<ActionLogEntry['status'], React.ReactNode> = {
  executed: <CheckCircle size={14} className="text-green-600" />,
  skipped: <XCircle size={14} className="text-gray-500" />,
  customized: <Edit2 size={14} className="text-blue-600" />,
};

export default function ActionHistory({ customerId, limit = 10 }: ActionHistoryProps) {
  const [actions, setActions] = useState<ActionLogEntry[]>([]);
  const [stats, setStats] = useState<ReturnType<typeof getActionStats> | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ActionLogEntry | null>(null);

  // Load action history from localStorage
  useEffect(() => {
    const loadActions = () => {
      const recentActions = getRecentActions(customerId, limit);
      const actionStats = getActionStats(customerId);
      setActions(recentActions);
      setStats(actionStats);
    };

    loadActions();

    // Listen for storage changes (when actions are logged)
    const handleStorageChange = () => {
      loadActions();
    };

    window.addEventListener('storage', handleStorageChange);

    // Also poll for changes (for same-tab updates)
    const interval = setInterval(loadActions, 5000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [customerId, limit]);

  if (actions.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <History size={18} className="text-[var(--text-secondary)]" />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Action History
          </h3>
        </div>
        <div className="text-center py-6 text-[var(--text-tertiary)]">
          <Clock size={24} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No actions recorded yet</p>
          <p className="text-xs mt-1">Execute or skip recommendations to build history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History size={18} className="text-[var(--text-secondary)]" />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Action History
          </h3>
          <span className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full">
            {stats?.total || 0} total
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-[var(--accent-primary)] hover:underline flex items-center gap-1"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="flex items-center gap-4 mb-4 p-3 bg-[var(--bg-secondary)] rounded-lg text-xs">
          <div className="flex items-center gap-1">
            <CheckCircle size={12} className="text-green-600" />
            <span className="text-[var(--text-tertiary)]">Executed:</span>
            <span className="font-medium text-green-600">{stats.executed}</span>
          </div>
          <div className="flex items-center gap-1">
            <Edit2 size={12} className="text-blue-600" />
            <span className="text-[var(--text-tertiary)]">Customized:</span>
            <span className="font-medium text-blue-600">{stats.customized}</span>
          </div>
          <div className="flex items-center gap-1">
            <XCircle size={12} className="text-gray-500" />
            <span className="text-[var(--text-tertiary)]">Skipped:</span>
            <span className="font-medium text-gray-500">{stats.skipped}</span>
          </div>
        </div>
      )}

      {/* Action List */}
      <div className="space-y-2">
        {actions.slice(0, isExpanded ? undefined : 3).map((entry) => {
          const statusDisplay = getStatusDisplay(entry.status);

          return (
            <div
              key={entry.id}
              className="flex items-start gap-3 p-3 border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors"
              onClick={() => setSelectedAction(selectedAction?.id === entry.id ? null : entry)}
            >
              {/* Status Icon */}
              <div className="mt-0.5">
                {statusIcons[entry.status]}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${statusDisplay.color} ${statusDisplay.bgColor} px-2 py-0.5 rounded`}>
                    {statusDisplay.label}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                    {actionTypeIcons[entry.action.action_type]}
                    {getActionTypeLabel(entry.action.action_type)}
                  </span>
                </div>

                <p className="text-sm font-medium text-[var(--text-primary)] mt-1 truncate">
                  {entry.action.title}
                </p>

                {/* Expanded Details */}
                {selectedAction?.id === entry.id && (
                  <div className="mt-3 space-y-2 text-xs">
                    <p className="text-[var(--text-secondary)]">
                      {entry.action.description}
                    </p>
                    <div className="flex items-center gap-4 text-[var(--text-tertiary)]">
                      <span>
                        Offer: <span className="text-[var(--text-secondary)]">{entry.action.offer.detail}</span>
                      </span>
                      <span>
                        Channel: <span className="text-[var(--text-secondary)] capitalize">{entry.action.channel.replace('_', ' ')}</span>
                      </span>
                    </div>
                    {entry.customization && (
                      <div className="p-2 bg-blue-50 rounded text-blue-700">
                        <p className="font-medium mb-1">Customizations:</p>
                        <p>Offer: {entry.customization.originalOffer} → {entry.customization.modifiedOffer}</p>
                        <p>Channel: {entry.customization.originalChannel} → {entry.customization.modifiedChannel}</p>
                      </div>
                    )}
                    {entry.notes && (
                      <p className="text-[var(--text-tertiary)]">
                        Notes: {entry.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <span className="text-xs text-[var(--text-tertiary)] whitespace-nowrap">
                {formatActionTimestamp(entry.timestamp)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Show More */}
      {!isExpanded && actions.length > 3 && (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full mt-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-dashed border-[var(--border-default)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
        >
          Show {actions.length - 3} more actions
        </button>
      )}
    </div>
  );
}
