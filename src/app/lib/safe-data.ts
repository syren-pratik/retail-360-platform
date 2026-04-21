/**
 * Safe Data Accessors
 * Utilities for safely accessing nested properties and handling missing/malformed data
 */

// Safely access nested properties with fallback
export function safeGet<T>(obj: unknown, path: string, fallback: T): T {
  if (!obj) return fallback;
  const keys = (path ?? '').split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return fallback;
    current = (current as Record<string, unknown>)[key];
  }
  return current === undefined || current === null ? fallback : (current as T);
}

// Validate that an object has required keys
export function hasRequiredKeys(obj: unknown, keys: string[]): boolean {
  if (!obj || typeof obj !== 'object') return false;
  return keys.every(key => key in (obj as Record<string, unknown>));
}

// Safe array access
export function safeArray<T>(value: unknown, fallback: T[] = []): T[] {
  return Array.isArray(value) ? value : fallback;
}

// Safe number conversion
export function safeNumber(value: unknown, fallback: number = 0): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

// Safe string conversion
export function safeString(value: unknown, fallback: string = ''): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
}

// Check if value is a non-empty array
export function isNonEmptyArray(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0;
}

// Check if value is a non-null object
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Normalize KPI data — handles both nested and flat shapes
export interface NormalizedKPI {
  value: number;
  prior: number;
  unit: string;
  label: string;
  sparkline: number[];
  direction?: 'higher_better' | 'lower_better' | 'target_range';
  target?: [number, number];
}

export function normalizeKPI(raw: unknown, key: string): NormalizedKPI {
  const defaultKPI: NormalizedKPI = {
    value: 0,
    prior: 0,
    unit: '',
    label: key.replace(/_/g, ' ').replace(/\b\w/g, c => (c ?? '').toUpperCase()),
    sparkline: [],
  };

  if (!raw || typeof raw !== 'object') return defaultKPI;

  const data = raw as Record<string, unknown>;

  // Handle nested shape: { osa: { value, prior } }
  if (data[key] && typeof data[key] === 'object') {
    const nested = data[key] as Record<string, unknown>;
    if ('value' in nested) {
      return {
        value: safeNumber(nested.value, 0),
        prior: safeNumber(nested.prior, 0),
        unit: safeString(nested.unit, ''),
        label: safeString(nested.label, defaultKPI.label),
        sparkline: safeArray(safeGet(data, `sparklines.${key}`, []), []),
        direction: nested.direction as NormalizedKPI['direction'],
        target: nested.target as [number, number] | undefined,
      };
    }
  }

  // Handle flat shape: { osa: 92.4, osa_prior: 93.1 }
  if (typeof data[key] === 'number' || typeof data[key] === 'string') {
    return {
      value: safeNumber(data[key], 0),
      prior: safeNumber(data[`${key}_prior`] || data[`prior_${key}`], 0),
      unit: '',
      label: defaultKPI.label,
      sparkline: safeArray(safeGet(data, `sparklines.${key}`, []), []),
    };
  }

  // Handle column-name shape: { osa_pct: 92.4 }
  const flatKey = `${key}_pct` in data ? `${key}_pct` : key;
  if (flatKey in data) {
    return {
      value: safeNumber(data[flatKey], 0),
      prior: 0,
      unit: '%',
      label: defaultKPI.label,
      sparkline: [],
    };
  }

  return defaultKPI;
}

// Generate sparkline data if missing
export function generateSparkline(baseValue: number, count: number = 7, variance: number = 0.1): number[] {
  if (baseValue === 0) return Array(count).fill(0);
  return Array.from({ length: count }, () =>
    baseValue * (1 - variance + Math.random() * variance * 2)
  );
}

// Safely merge with defaults
export function mergeWithDefaults<T extends Record<string, unknown>>(
  data: unknown,
  defaults: T
): T {
  if (!isObject(data)) return defaults;
  return { ...defaults, ...data } as T;
}

// ═══ SAFE LOOKUP UTILITIES ═══

/**
 * Safely look up a value from a map with a fallback.
 * Handles case variations (Critical vs critical vs CRITICAL) and null/undefined keys.
 */
export function safeLookup<T>(
  map: Record<string, T>,
  key: string | null | undefined,
  fallback: T,
  options: { normalize?: 'capitalize' | 'lowercase' | 'uppercase' | 'none' } = {}
): T {
  if (key === null || key === undefined || key === '') return fallback;

  const { normalize = 'capitalize' } = options;

  let normalized = String(key);
  if (normalize === 'capitalize') {
    normalized = (normalized ?? '').charAt(0).toUpperCase() + (normalized ?? []).slice(1).toLowerCase();
  } else if (normalize === 'lowercase') {
    normalized = (normalized ?? '').toLowerCase();
  } else if (normalize === 'uppercase') {
    normalized = (normalized ?? '').toUpperCase();
  }

  return map[normalized] ?? map[key] ?? fallback;
}

/**
 * Standard badge style interface
 */
export interface BadgeStyle {
  bg: string;
  text: string;
  border: string;
  icon?: React.ReactNode;
}

/**
 * Default badge style fallback — use in any component with colored badges
 */
export const DEFAULT_BADGE_STYLE: BadgeStyle = {
  bg: 'bg-gray-50',
  text: 'text-gray-700',
  border: 'border-gray-200',
  icon: null,
};

/**
 * Common urgency styles used across the app
 */
export const URGENCY_STYLES: Record<string, BadgeStyle> = {
  Critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  High: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  Medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  Low: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  URGENT: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  HIGH: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  MEDIUM: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  LOW: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
};

/**
 * Common status styles used across the app
 */
export const STATUS_STYLES: Record<string, BadgeStyle> = {
  active: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  inactive: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  approved: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  in_transit: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  delayed: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  received: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  scheduled: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  stockout: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  low: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  healthy: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  overstock: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
};

/**
 * Common severity styles
 */
export const SEVERITY_STYLES: Record<string, BadgeStyle> = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  high: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  low: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  info: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
};
