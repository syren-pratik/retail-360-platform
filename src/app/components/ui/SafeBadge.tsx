'use client';

import { ReactNode } from 'react';
import { BadgeStyle, DEFAULT_BADGE_STYLE, safeLookup } from '@/app/lib/safe-data';

interface SafeBadgeProps {
  value: string | null | undefined;
  styleMap: Record<string, BadgeStyle>;
  fallback?: BadgeStyle;
  icon?: ReactNode;
  className?: string;
  showUnknown?: boolean;
  size?: 'xs' | 'sm' | 'md';
}

const SIZE_CLASSES = {
  xs: 'px-1.5 py-0.5 text-[10px]',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

/**
 * Safe badge component that handles undefined/null values and unknown lookup keys.
 * Use this instead of manual lookup patterns like `const styles = styleMap[item.status]`.
 */
export function SafeBadge({
  value,
  styleMap,
  fallback = DEFAULT_BADGE_STYLE,
  icon,
  className = '',
  showUnknown = true,
  size = 'xs',
}: SafeBadgeProps) {
  // Handle null/undefined values
  if (!value) {
    if (!showUnknown) return null;
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full font-medium border ${SIZE_CLASSES[size]} ${DEFAULT_BADGE_STYLE.bg} ${DEFAULT_BADGE_STYLE.text} ${DEFAULT_BADGE_STYLE.border} ${className}`}
      >
        Unknown
      </span>
    );
  }

  // Safe lookup with case normalization
  const styles = safeLookup(styleMap, value, fallback);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium border ${SIZE_CLASSES[size]} ${styles.bg} ${styles.text} ${styles.border} ${className}`}
    >
      {icon || styles.icon}
      {value}
    </span>
  );
}

/**
 * Urgency badge with pre-configured styles
 */
export function UrgencyBadge({
  value,
  icon,
  className,
  size = 'xs',
}: {
  value: string | null | undefined;
  icon?: ReactNode;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
}) {
  const urgencyStyles: Record<string, BadgeStyle> = {
    Critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    High: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    Medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    Low: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    URGENT: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    HIGH: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    MEDIUM: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    LOW: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  };

  return <SafeBadge value={value} styleMap={urgencyStyles} icon={icon} className={className} size={size} />;
}

/**
 * Status badge with pre-configured styles
 */
export function StatusBadge({
  value,
  icon,
  className,
  size = 'xs',
}: {
  value: string | null | undefined;
  icon?: ReactNode;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
}) {
  const statusStyles: Record<string, BadgeStyle> = {
    active: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    inactive: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
    pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    approved: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    rejected: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    ordered: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    in_transit: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    at_risk: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    delayed: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    received: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    scheduled: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
    stockout: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    critical_low: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    low: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    low_stock: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    healthy: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    overstock: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  };

  return <SafeBadge value={value} styleMap={statusStyles} icon={icon} className={className} size={size} />;
}

/**
 * Risk badge with pre-configured styles
 */
export function RiskBadge({
  value,
  icon,
  className,
  size = 'xs',
}: {
  value: string | null | undefined;
  icon?: ReactNode;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
}) {
  const riskStyles: Record<string, BadgeStyle> = {
    High: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    Medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    Low: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  };

  return <SafeBadge value={value} styleMap={riskStyles} icon={icon} className={className} size={size} />;
}

/**
 * Severity badge with pre-configured styles
 */
export function SeverityBadge({
  value,
  icon,
  className,
  size = 'xs',
}: {
  value: string | null | undefined;
  icon?: ReactNode;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
}) {
  const severityStyles: Record<string, BadgeStyle> = {
    critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    high: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    low: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    info: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    warning: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  };

  return <SafeBadge value={value} styleMap={severityStyles} icon={icon} className={className} size={size} />;
}

export default SafeBadge;
