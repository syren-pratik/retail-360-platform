'use client';

import { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, X, ChevronRight } from 'lucide-react';
import { PriceAlert } from '@/app/lib/price-types';
import { safeLookup } from '@/app/lib/safe-data';

interface PriceAlertsProps {
  alerts: PriceAlert[];
}

interface AlertStyle {
  bg: string;
  border: string;
  icon: typeof AlertTriangle;
  iconColor: string;
  textColor: string;
  badge: string;
}

const DEFAULT_ALERT_STYLE: AlertStyle = {
  bg: 'bg-gray-50',
  border: 'border-gray-200',
  icon: Info,
  iconColor: 'text-gray-500',
  textColor: 'text-gray-800',
  badge: 'bg-gray-100 text-gray-700',
};

const alertStyles: Record<string, AlertStyle> = {
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: AlertTriangle,
    iconColor: 'text-red-500',
    textColor: 'text-red-800',
    badge: 'bg-red-100 text-red-700',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: AlertCircle,
    iconColor: 'text-amber-500',
    textColor: 'text-amber-800',
    badge: 'bg-amber-100 text-amber-700',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: Info,
    iconColor: 'text-blue-500',
    textColor: 'text-blue-800',
    badge: 'bg-blue-100 text-blue-700',
  },
};

function formatImpact(impact: number): string {
  const safeImpact = impact ?? 0;
  const prefix = safeImpact >= 0 ? '+' : '';
  const absValue = Math.abs(safeImpact);
  if (absValue >= 100000) {
    return `${prefix}₹${(safeImpact / 100000).toFixed(1)}L`;
  }
  if (absValue >= 1000) {
    return `${prefix}₹${(safeImpact / 1000).toFixed(0)}K`;
  }
  return `${prefix}₹${(safeImpact ?? 0).toLocaleString('en-IN')}`;
}

export default function PriceAlerts({ alerts }: PriceAlertsProps) {
  const [dismissedIndices, setDismissedIndices] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState(false);

  // Guard against null/undefined data
  if (!alerts || !Array.isArray(alerts)) {
    return null;
  }

  const visibleAlerts = (alerts ?? []).filter((_, i) => !dismissedIndices.has(i));
  const displayAlerts = expanded ? visibleAlerts : (visibleAlerts ?? []).slice(0, 3);

  const criticalCount = visibleAlerts.filter(a => a.type === 'critical').length;
  const warningCount = visibleAlerts.filter(a => a.type === 'warning').length;
  const infoCount = visibleAlerts.filter(a => a.type === 'info').length;

  const handleDismiss = (index: number) => {
    const originalIndex = alerts.findIndex((a, i) =>
      !dismissedIndices.has(i) && visibleAlerts.indexOf(a) === index
    );
    if (originalIndex !== -1) {
      setDismissedIndices(prev => new Set(Array.from(prev).concat(originalIndex)));
    }
  };

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100">
            <AlertTriangle className="text-amber-600\" size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Pricing Alerts
            </h3>
            <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
              {criticalCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  {criticalCount} critical
                </span>
              )}
              {warningCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  {warningCount} warning
                </span>
              )}
              {infoCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  {infoCount} info
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {(displayAlerts ?? []).map((alert, index) => {
          const style = safeLookup(alertStyles, alert.type, DEFAULT_ALERT_STYLE, { normalize: 'lowercase' });
          const Icon = style.icon;

          return (
            <div
              key={index}
              className={`relative flex items-start gap-3 p-3 rounded-lg border ${style.bg} ${style.border}`}
            >
              <Icon size={18} className={style.iconColor} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${style.textColor}`}>
                  {alert.message}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {alert.category && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${style.badge}`}>
                      {alert.category}
                    </span>
                  )}
                  {alert.impact !== 0 && (
                    <span className={`text-xs font-medium ${alert.impact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatImpact(alert.impact)} impact
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDismiss(index)}
                className="p-1 rounded hover:bg-white/50 text-[var(--text-tertiary)] transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {(visibleAlerts ?? []).length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mt-3 text-sm text-[var(--accent-primary)] hover:text-[var(--accent-primary-dark)] transition-colors"
        >
          {expanded ? 'Show less' : `View all ${(visibleAlerts ?? []).length} alerts`}
          <ChevronRight size={14} className={expanded ? 'rotate-90' : ''} />
        </button>
      )}
    </div>
  );
}
