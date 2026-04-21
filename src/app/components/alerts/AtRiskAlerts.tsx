'use client';

import { useState } from 'react';
import { AlertTriangle, ChevronRight, Users, TrendingDown, Clock, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AtRiskAlertsData, AtRiskAlert } from '@/app/lib/types';
import { useDashboard } from '@/app/context/DashboardContext';

interface AtRiskAlertsProps {
  data: AtRiskAlertsData;
}

const alertTypeIcons: Record<string, React.ReactNode> = {
  'high_value_declining': <TrendingDown size={14} className="text-[#EF4444]" />,
  'engagement_drop': <TrendingDown size={14} className="text-[#F59E0B]" />,
  'frequency_decline': <Clock size={14} className="text-[#F59E0B]" />,
  'competitor_risk': <AlertTriangle size={14} className="text-[#EF4444]" />,
  'satisfaction_drop': <AlertTriangle size={14} className="text-[#F59E0B]" />,
  'early_churn_signal': <TrendingDown size={14} className="text-[#EF4444]" />,
};

const formatAlertType = (type: string): string => {
  return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function AtRiskAlerts({ data }: AtRiskAlertsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<AtRiskAlert | null>(null);
  const router = useRouter();
  const { triggerChatMessage } = useDashboard();

  // Show top 4 alerts in collapsed view
  const displayAlerts = isExpanded ? data.alerts : data.alerts.slice(0, 4);

  const handleAlertClick = (alert: AtRiskAlert) => {
    setSelectedAlert(alert);
  };

  const handleViewCustomer = (customerId: string) => {
    router.push(`/cx360/customer/${customerId}`);
    setSelectedAlert(null);
  };

  const handleAskAI = (alert: AtRiskAlert) => {
    const message = `Tell me more about customer ${alert.customer_name} (${alert.customer_id}). They are showing ${formatAlertType(alert.alert_type).toLowerCase()} signals with ${(alert.churn_probability * 100).toFixed(0)}% churn risk. What actions should we take?`;
    triggerChatMessage(message);
    setSelectedAlert(null);
  };

  return (
    <div className="card border-l-4 border-l-[#EF4444]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#FEE2E2]">
            <AlertTriangle size={20} className="text-[#EF4444]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              At-Risk Customers
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {data.summary.high_priority} high priority alerts
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-lg font-semibold text-[#EF4444]">
              ₹{(data.summary.total_revenue_at_risk / 10000000).toFixed(1)} Cr
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">Revenue at Risk</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-[var(--text-primary)]">
              {data.summary.total_at_risk.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">Total At-Risk</p>
          </div>
        </div>
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {displayAlerts.map((alert) => (
          <div
            key={alert.customer_id}
            onClick={() => handleAlertClick(alert)}
            className="p-3 rounded-lg border border-[var(--border-default)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer transition-all"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {alertTypeIcons[alert.alert_type] || <AlertTriangle size={14} className="text-[#F59E0B]" />}
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  {formatAlertType(alert.alert_type)}
                </span>
              </div>
              <span
                className="text-xs font-medium px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: alert.churn_probability >= 0.7 ? '#FEE2E2' : '#FEF3C7',
                  color: alert.churn_probability >= 0.7 ? '#DC2626' : '#D97706',
                }}
              >
                {(alert.churn_probability * 100).toFixed(0)}%
              </span>
            </div>

            <p className="font-medium text-sm text-[var(--text-primary)] truncate">
              {alert.customer_name}
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mb-2">
              {alert.segment} • ₹{alert.clv.toLocaleString('en-IN')} CLV
            </p>

            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-secondary)]">
                {alert.days_since_last_order}d since order
              </span>
              <ChevronRight size={14} className="text-[var(--text-tertiary)]" />
            </div>
          </div>
        ))}
      </div>

      {/* Expand/Collapse Button */}
      {data.alerts.length > 4 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-4 w-full py-2 text-sm text-[var(--accent-primary)] hover:bg-[var(--bg-secondary)] rounded-md transition-colors flex items-center justify-center gap-1"
        >
          {isExpanded ? 'Show Less' : `Show All ${data.alerts.length} Alerts`}
          <ChevronRight
            size={16}
            className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
        </button>
      )}

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedAlert(null)}
          />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 animate-scale-in">
            <div className="p-4 border-b border-[var(--border-default)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-[#EF4444]" />
                  <span className="font-semibold">At-Risk Alert</span>
                </div>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="p-1 rounded hover:bg-[var(--bg-secondary)]"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Customer Info */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Users size={16} className="text-[var(--text-secondary)]" />
                  <span className="font-medium">{selectedAlert.customer_name}</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  ID: {selectedAlert.customer_id} • {selectedAlert.segment}
                </p>
              </div>

              {/* Risk Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[var(--bg-secondary)]">
                  <p className="text-xs text-[var(--text-tertiary)]">Churn Probability</p>
                  <p className="text-lg font-semibold text-[#EF4444]">
                    {(selectedAlert.churn_probability * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg-secondary)]">
                  <p className="text-xs text-[var(--text-tertiary)]">Revenue at Risk</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">
                    ₹{selectedAlert.potential_revenue_at_risk.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg-secondary)]">
                  <p className="text-xs text-[var(--text-tertiary)]">Customer CLV</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">
                    ₹{selectedAlert.clv.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg-secondary)]">
                  <p className="text-xs text-[var(--text-tertiary)]">Days Since Order</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">
                    {selectedAlert.days_since_last_order}
                  </p>
                </div>
              </div>

              {/* Alert Type & Recommendation */}
              <div className="p-3 rounded-lg border border-[var(--border-default)]">
                <div className="flex items-center gap-2 mb-2">
                  {alertTypeIcons[selectedAlert.alert_type]}
                  <span className="text-sm font-medium">
                    {formatAlertType(selectedAlert.alert_type)}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  <span className="font-medium">Recommended Action:</span>{' '}
                  {selectedAlert.recommended_action}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleViewCustomer(selectedAlert.customer_id)}
                  className="flex-1 py-2 px-4 bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[#4338CA] transition-colors text-sm font-medium"
                >
                  View Customer
                </button>
                <button
                  onClick={() => handleAskAI(selectedAlert)}
                  className="flex-1 py-2 px-4 border border-[var(--border-default)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors text-sm font-medium"
                >
                  Ask AI
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
