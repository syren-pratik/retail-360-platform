'use client';

import { useState } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, Activity, MapPin, Calendar, ChevronRight, X } from 'lucide-react';
import { DemandAnomaly, AnomalySummary } from '@/app/lib/demand-types';
import { NoDataFallback } from '@/app/components/ui/NoDataFallback';

interface DemandAnomaliesProps {
  anomalies: DemandAnomaly[];
  summary: AnomalySummary;
}

// Get icon and color based on anomaly type
const getAnomalyStyle = (type: 'spike' | 'drop' | 'trend_change') => {
  switch (type) {
    case 'spike':
      return {
        icon: TrendingUp,
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
        badgeColor: 'bg-red-100 text-red-700',
        label: 'SPIKE'
      };
    case 'drop':
      return {
        icon: TrendingDown,
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200',
        badgeColor: 'bg-amber-100 text-amber-700',
        label: 'DROP'
      };
    case 'trend_change':
      return {
        icon: Activity,
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200',
        badgeColor: 'bg-blue-100 text-blue-700',
        label: 'TREND'
      };
  }
};

export default function DemandAnomalies({ anomalies, summary }: DemandAnomaliesProps) {
  const [showAll, setShowAll] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Guard against null/undefined data
  if (!anomalies || !Array.isArray(anomalies) || anomalies.length === 0) {
    return <NoDataFallback title="No anomalies" message="No demand anomalies detected." />;
  }

  const visibleAnomalies = (anomalies ?? []).filter(a => !dismissedIds.has(a.id));
  const displayAnomalies = showAll ? visibleAnomalies : (visibleAnomalies ?? []).slice(0, 4);

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set(Array.from(prev).concat(id)));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100">
            <AlertTriangle className="text-amber-600" size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Demand Anomalies
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Unusual demand patterns detected in the last 14 days
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[var(--text-tertiary)]">Spikes: {summary.spikes}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[var(--text-tertiary)]">Drops: {summary.drops}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[var(--text-tertiary)]">Trends: {summary.trend_changes}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
          <div className="text-2xl font-semibold text-[var(--text-primary)]">{summary.total_anomalies}</div>
          <div className="text-xs text-[var(--text-tertiary)]">Total Anomalies</div>
        </div>
        <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
          <div className="text-2xl font-semibold text-[var(--text-primary)]">{summary.avg_magnitude}%</div>
          <div className="text-xs text-[var(--text-tertiary)]">Avg Magnitude</div>
        </div>
        <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
          <div className="text-2xl font-semibold text-green-600">{summary.forecasted}</div>
          <div className="text-xs text-[var(--text-tertiary)]">Forecasted</div>
        </div>
        <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
          <div className="text-2xl font-semibold text-red-600">{summary.unforecasted}</div>
          <div className="text-xs text-[var(--text-tertiary)]">Unforecasted</div>
        </div>
      </div>

      {/* Anomaly Cards */}
      <div className="grid grid-cols-2 gap-3">
        {(displayAnomalies ?? []).map((anomaly) => {
          const style = getAnomalyStyle(anomaly.type);
          const Icon = style.icon;

          return (
            <div
              key={anomaly.id}
              className={`relative p-3 rounded-lg border ${style.bgColor} ${style.borderColor} transition-all hover:shadow-sm`}
            >
              <button
                onClick={() => handleDismiss(anomaly.id)}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/50 text-[var(--text-tertiary)] transition-colors"
              >
                <X size={14} />
              </button>

              <div className="flex items-start gap-3">
                <div className={`p-1.5 rounded ${style.badgeColor}`}>
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${style.badgeColor}`}>
                      {style.label}
                    </span>
                    <span className={`text-sm font-semibold ${style.textColor}`}>
                      {anomaly.magnitude_pct > 0 ? '+' : ''}{anomaly.magnitude_pct}%
                    </span>
                    {anomaly.was_forecasted && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                        Forecasted
                      </span>
                    )}
                  </div>

                  <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {anomaly.category}
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1">
                      <MapPin size={10} />
                      {anomaly.store_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />
                      {formatDate(anomaly.date)}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--text-tertiary)] mt-2 line-clamp-2">
                    {anomaly.likely_cause}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* View All Button */}
      {(visibleAnomalies ?? []).length > 4 && (
        <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1 text-sm text-[var(--accent-primary)] hover:text-[var(--accent-primary-dark)] transition-colors"
          >
            {showAll ? 'Show Less' : `View All ${(visibleAnomalies ?? []).length} Anomalies`}
            <ChevronRight size={14} className={showAll ? 'rotate-90' : ''} />
          </button>
        </div>
      )}

      {visibleAnomalies.length === 0 && (
        <div className="text-center py-8 text-[var(--text-tertiary)]">
          <AlertTriangle size={24} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">All anomalies have been reviewed</p>
        </div>
      )}
    </div>
  );
}
