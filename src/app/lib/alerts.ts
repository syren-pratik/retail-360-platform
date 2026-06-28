'use client';

import { formatMoneyPlainAuto, getLocaleAuto } from './format-money';

// ============================================================================
// ALERTS STORAGE
// Stores user-defined monitoring rules that trigger on metric thresholds
// ============================================================================

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'above' | 'below' | 'change_by';
  threshold: number;
  segmentFilter?: string;
  frequency: 'daily' | 'weekly' | 'on_refresh';
  active: boolean;
  createdAt: string;
  createdBy: 'ai_agent' | 'user';
  module: 'cx360' | 'demand';
  lastChecked?: string;
  lastTriggered?: string;
  lastValue?: number;
}

export interface AlertTrigger {
  alertId: string;
  alertName: string;
  triggeredAt: string;
  metric: string;
  condition: string;
  threshold: number;
  currentValue: number;
  message: string;
}

const ALERTS_KEY = 'cx360_alerts';
const ALERT_TRIGGERS_KEY = 'cx360_alert_triggers';

// ============================================================================
// ALERT CRUD OPERATIONS
// ============================================================================

// Get all alerts
export function getAlerts(module?: string): AlertRule[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = localStorage.getItem(ALERTS_KEY);
    if (!stored) {
      return [];
    }

    const alerts: AlertRule[] = JSON.parse(stored);

    if (module) {
      return alerts.filter((a) => a.module === module);
    }

    return alerts;
  } catch (error) {
    console.error('Failed to read alerts:', error);
    return [];
  }
}

// Get active alerts only
export function getActiveAlerts(module?: string): AlertRule[] {
  return getAlerts(module).filter((a) => a.active);
}

// Save a new alert
export function saveAlert(alert: Omit<AlertRule, 'id' | 'createdAt'>): AlertRule {
  if (typeof window === 'undefined') {
    throw new Error('Alerts are only available in the browser');
  }

  const newAlert: AlertRule = {
    ...alert,
    id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };

  try {
    const alerts = getAlerts();
    alerts.push(newAlert);
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));

    window.dispatchEvent(new CustomEvent('alertsChanged', { detail: { action: 'create', alert: newAlert } }));

    return newAlert;
  } catch (error) {
    console.error('Failed to save alert:', error);
    throw error;
  }
}

// Update an alert
export function updateAlert(alertId: string, updates: Partial<AlertRule>): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const alerts = getAlerts();
    const index = alerts.findIndex((a) => a.id === alertId);

    if (index >= 0) {
      alerts[index] = { ...alerts[index], ...updates };
      localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));

      window.dispatchEvent(new CustomEvent('alertsChanged', { detail: { action: 'update', alertId } }));
    }
  } catch (error) {
    console.error('Failed to update alert:', error);
  }
}

// Delete an alert
export function deleteAlert(alertId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const alerts = getAlerts();
    const filtered = alerts.filter((a) => a.id !== alertId);
    localStorage.setItem(ALERTS_KEY, JSON.stringify(filtered));

    window.dispatchEvent(new CustomEvent('alertsChanged', { detail: { action: 'delete', alertId } }));
  } catch (error) {
    console.error('Failed to delete alert:', error);
  }
}

// Toggle alert active status
export function toggleAlert(alertId: string): void {
  const alerts = getAlerts();
  const alert = alerts.find((a) => a.id === alertId);
  if (alert) {
    updateAlert(alertId, { active: !alert.active });
  }
}

// ============================================================================
// ALERT CHECKING
// ============================================================================

// Map metric names to data accessors
function getMetricValue(
  metric: string,
  segmentFilter: string | undefined,
  dashboardData: Record<string, unknown>
): number | null {
  // This is a simplified implementation
  // In production, this would query actual dashboard data
  const metricMap: Record<string, () => number | null> = {
    churn_rate: () => {
      const churnRisk = dashboardData.churnRisk as { tier: string; count: number; avgProbability: number }[] | undefined;
      if (!churnRisk) return null;
      const total = churnRisk.reduce((sum, r) => sum + r.count, 0);
      const highRisk = churnRisk.filter((r) => r.tier === 'High' || r.tier === 'Critical');
      const highRiskCount = highRisk.reduce((sum, r) => sum + r.count, 0);
      return total > 0 ? highRiskCount / total : 0;
    },
    clv_avg: () => {
      const clvDist = dashboardData.clvDistribution as { tier: string; count: number; avgCLV: number }[] | undefined;
      if (!clvDist) return null;
      const total = clvDist.reduce((sum, r) => sum + r.count, 0);
      const weightedSum = clvDist.reduce((sum, r) => sum + r.count * r.avgCLV, 0);
      return total > 0 ? weightedSum / total : 0;
    },
    customer_count: () => {
      const clvDist = dashboardData.clvDistribution as { tier: string; count: number }[] | undefined;
      if (!clvDist) return null;
      return clvDist.reduce((sum, r) => sum + r.count, 0);
    },
    high_risk_count: () => {
      const churnRisk = dashboardData.churnRisk as { tier: string; count: number }[] | undefined;
      if (!churnRisk) return null;
      const highRisk = churnRisk.filter((r) => r.tier === 'High' || r.tier === 'Critical');
      return highRisk.reduce((sum, r) => sum + r.count, 0);
    },
  };

  const getter = metricMap[metric];
  return getter ? getter() : null;
}

// Check all alerts against current data
export function checkAlerts(
  dashboardData: Record<string, unknown>,
  module: string = 'cx360'
): AlertTrigger[] {
  const alerts = getActiveAlerts(module).filter(
    (a) => a.frequency === 'on_refresh' || a.frequency === 'daily'
  );

  const triggers: AlertTrigger[] = [];

  for (const alert of alerts) {
    const currentValue = getMetricValue(alert.metric, alert.segmentFilter, dashboardData);

    if (currentValue === null) continue;

    let triggered = false;
    if (alert.condition === 'above') {
      triggered = currentValue > alert.threshold;
    } else if (alert.condition === 'below') {
      triggered = currentValue < alert.threshold;
    } else if (alert.condition === 'change_by' && alert.lastValue !== undefined) {
      const change = Math.abs(currentValue - alert.lastValue) / alert.lastValue;
      triggered = change >= alert.threshold;
    }

    // Update alert with last checked time and value
    updateAlert(alert.id, {
      lastChecked: new Date().toISOString(),
      lastValue: currentValue,
      lastTriggered: triggered ? new Date().toISOString() : alert.lastTriggered,
    });

    if (triggered) {
      triggers.push({
        alertId: alert.id,
        alertName: alert.name,
        triggeredAt: new Date().toISOString(),
        metric: alert.metric,
        condition: alert.condition,
        threshold: alert.threshold,
        currentValue,
        message: formatAlertMessage(alert, currentValue),
      });
    }
  }

  // Store triggered alerts
  if (triggers.length > 0) {
    storeAlertTriggers(triggers);
  }

  return triggers;
}

// Format alert trigger message
function formatAlertMessage(alert: AlertRule, currentValue: number): string {
  const formattedValue = alert.metric.includes('rate') || alert.metric.includes('probability')
    ? `${(currentValue * 100).toFixed(1)}%`
    : alert.metric.includes('clv') || alert.metric.includes('spend')
      ? formatMoneyPlainAuto(currentValue)
      : currentValue.toLocaleString(getLocaleAuto());

  const conditionText = alert.condition === 'above' ? 'exceeded' :
    alert.condition === 'below' ? 'dropped below' : 'changed by';

  const thresholdText = alert.metric.includes('rate') || alert.metric.includes('probability')
    ? `${(alert.threshold * 100).toFixed(1)}%`
    : alert.metric.includes('clv') || alert.metric.includes('spend')
      ? formatMoneyPlainAuto(alert.threshold)
      : alert.threshold.toLocaleString(getLocaleAuto());

  return `${alert.metric} ${conditionText} ${thresholdText}. Current value: ${formattedValue}`;
}

// ============================================================================
// ALERT TRIGGERS HISTORY
// ============================================================================

// Store triggered alerts
function storeAlertTriggers(triggers: AlertTrigger[]): void {
  if (typeof window === 'undefined') return;

  try {
    const stored = localStorage.getItem(ALERT_TRIGGERS_KEY);
    const existing: AlertTrigger[] = stored ? JSON.parse(stored) : [];

    // Add new triggers at the beginning
    const updated = [...triggers, ...existing].slice(0, 100); // Keep last 100

    localStorage.setItem(ALERT_TRIGGERS_KEY, JSON.stringify(updated));

    window.dispatchEvent(new CustomEvent('alertTriggered', { detail: triggers }));
  } catch (error) {
    console.error('Failed to store alert triggers:', error);
  }
}

// Get recent alert triggers
export function getRecentTriggers(limit: number = 20): AlertTrigger[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(ALERT_TRIGGERS_KEY);
    if (!stored) return [];

    const triggers: AlertTrigger[] = JSON.parse(stored);
    return triggers.slice(0, limit);
  } catch (error) {
    console.error('Failed to read alert triggers:', error);
    return [];
  }
}

// Clear alert triggers
export function clearAlertTriggers(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ALERT_TRIGGERS_KEY);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Get alert count
export function getAlertCount(module?: string): { total: number; active: number } {
  const all = getAlerts(module);
  return {
    total: all.length,
    active: all.filter((a) => a.active).length,
  };
}

// Clear all alerts
export function clearAllAlerts(module?: string): void {
  if (typeof window === 'undefined') return;

  try {
    if (module) {
      const alerts = getAlerts();
      const filtered = alerts.filter((a) => a.module !== module);
      localStorage.setItem(ALERTS_KEY, JSON.stringify(filtered));
    } else {
      localStorage.removeItem(ALERTS_KEY);
    }

    window.dispatchEvent(new CustomEvent('alertsChanged', { detail: { action: 'clear' } }));
  } catch (error) {
    console.error('Failed to clear alerts:', error);
  }
}

// Format metric name for display
export function formatMetricName(metric: string): string {
  const nameMap: Record<string, string> = {
    churn_rate: 'Churn Rate',
    clv_avg: 'Average CLV',
    customer_count: 'Customer Count',
    high_risk_count: 'High-Risk Customers',
    segment_size: 'Segment Size',
    revenue: 'Revenue',
    basket_avg: 'Average Basket Value',
  };

  return nameMap[metric] || metric.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}
