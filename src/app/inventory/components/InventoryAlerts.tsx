'use client';

import { AlertTriangle, AlertCircle, Info, ChevronRight } from 'lucide-react';
import { NoDataFallback } from '@/app/components/ui/NoDataFallback';

interface Alert {
  type: 'critical' | 'warning' | 'info';
  message: string;
  related_chart: string;
}

interface InventoryAlertsProps {
  alerts: Alert[];
  onAlertClick?: (chartId: string) => void;
}

export default function InventoryAlerts({ alerts, onAlertClick }: InventoryAlertsProps) {
  if (!alerts || !Array.isArray(alerts) || alerts.length === 0) {
    return <NoDataFallback title="No alerts" message="Data is not available." />;
  }

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle size={16} className="text-red-600 flex-shrink-0" />;
      case 'warning':
        return <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />;
      case 'info':
        return <Info size={16} className="text-blue-600 flex-shrink-0" />;
    }
  };

  const getAlertBgClass = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return 'bg-red-50 border-red-200 hover:bg-red-100';
      case 'warning':
        return 'bg-amber-50 border-amber-200 hover:bg-amber-100';
      case 'info':
        return 'bg-blue-50 border-blue-200 hover:bg-blue-100';
    }
  };

  const getTextClass = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return 'text-red-800';
      case 'warning':
        return 'text-amber-800';
      case 'info':
        return 'text-blue-800';
    }
  };

  // Sort alerts: critical first, then warning, then info
  const sortedAlerts = (alerts ?? []).slice().sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.type] - order[b.type];
  });

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          Inventory Alerts
        </h3>
        <span className="text-xs text-[var(--text-tertiary)]">
          {(alerts ?? []).filter(a => a.type === 'critical').length} critical, {(alerts ?? []).filter(a => a.type === 'warning').length} warnings
        </span>
      </div>

      <div className="space-y-2">
        {(sortedAlerts ?? []).map((alert, index) => (
          <button
            key={index}
            onClick={() => onAlertClick?.(alert.related_chart)}
            className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-colors text-left ${getAlertBgClass(alert.type)}`}
          >
            {getAlertIcon(alert.type)}
            <span className={`text-sm flex-1 ${getTextClass(alert.type)}`}>
              {alert.message}
            </span>
            <ChevronRight size={16} className={`flex-shrink-0 opacity-50 ${getTextClass(alert.type)}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
