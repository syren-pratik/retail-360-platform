'use client';

// ============================================================================
// CUSTOMER SEGMENTS STORAGE
// Stores user-defined customer segments with filter rules
// ============================================================================

export interface SegmentRule {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'in' | 'not_in' | 'contains';
  value: unknown;
}

export interface CustomerSegment {
  id: string;
  name: string;
  description?: string;
  rules: SegmentRule[];
  createdAt: string;
  createdBy: 'ai_agent' | 'user';
  module: 'cx360' | 'demand';
  customerCount?: number;
  lastRefreshed?: string;
  color?: string;
}

const SEGMENTS_KEY = 'cx360_segments';

// Predefined colors for segments
const SEGMENT_COLORS = [
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#F97316', // Orange
  '#14B8A6', // Teal
  '#22C55E', // Green
  '#EAB308', // Yellow
  '#3B82F6', // Blue
];

// ============================================================================
// SEGMENT CRUD OPERATIONS
// ============================================================================

// Get all segments
export function getSegments(module?: string): CustomerSegment[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = localStorage.getItem(SEGMENTS_KEY);
    if (!stored) {
      return [];
    }

    const segments: CustomerSegment[] = JSON.parse(stored);

    if (module) {
      return segments.filter((s) => s.module === module);
    }

    return segments;
  } catch (error) {
    console.error('Failed to read segments:', error);
    return [];
  }
}

// Get a specific segment by ID
export function getSegment(segmentId: string): CustomerSegment | null {
  const segments = getSegments();
  return segments.find((s) => s.id === segmentId) || null;
}

// Get a segment by name
export function getSegmentByName(name: string, module?: string): CustomerSegment | null {
  const segments = getSegments(module);
  return segments.find((s) => s.name.toLowerCase() === name.toLowerCase()) || null;
}

// Save a new segment
export function saveSegment(segment: Omit<CustomerSegment, 'id' | 'createdAt' | 'color'>): CustomerSegment {
  if (typeof window === 'undefined') {
    throw new Error('Segments are only available in the browser');
  }

  const existingSegments = getSegments();
  const colorIndex = existingSegments.length % SEGMENT_COLORS.length;

  const newSegment: CustomerSegment = {
    ...segment,
    id: `seg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    color: SEGMENT_COLORS[colorIndex],
  };

  try {
    existingSegments.push(newSegment);
    localStorage.setItem(SEGMENTS_KEY, JSON.stringify(existingSegments));

    window.dispatchEvent(new CustomEvent('segmentsChanged', { detail: { action: 'create', segment: newSegment } }));

    return newSegment;
  } catch (error) {
    console.error('Failed to save segment:', error);
    throw error;
  }
}

// Update a segment
export function updateSegment(segmentId: string, updates: Partial<CustomerSegment>): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const segments = getSegments();
    const index = segments.findIndex((s) => s.id === segmentId);

    if (index >= 0) {
      segments[index] = { ...segments[index], ...updates };
      localStorage.setItem(SEGMENTS_KEY, JSON.stringify(segments));

      window.dispatchEvent(new CustomEvent('segmentsChanged', { detail: { action: 'update', segmentId } }));
    }
  } catch (error) {
    console.error('Failed to update segment:', error);
  }
}

// Delete a segment
export function deleteSegment(segmentId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const segments = getSegments();
    const filtered = segments.filter((s) => s.id !== segmentId);
    localStorage.setItem(SEGMENTS_KEY, JSON.stringify(filtered));

    window.dispatchEvent(new CustomEvent('segmentsChanged', { detail: { action: 'delete', segmentId } }));
  } catch (error) {
    console.error('Failed to delete segment:', error);
  }
}

// ============================================================================
// RULE BUILDERS
// ============================================================================

// Convert natural language to rules (helper for AI agent)
export function buildRulesFromDescription(description: string): SegmentRule[] {
  const rules: SegmentRule[] = [];
  const lower = description.toLowerCase();

  // CLV rules
  if (lower.includes('high-value') || lower.includes('high value')) {
    rules.push({ field: 'clv_12m', operator: 'gte', value: 50000 });
  }
  if (lower.includes('low-value') || lower.includes('low value')) {
    rules.push({ field: 'clv_12m', operator: 'lt', value: 10000 });
  }

  // Churn rules
  if (lower.includes('at risk') || lower.includes('at-risk') || lower.includes('churning')) {
    rules.push({ field: 'churn_risk_tier', operator: 'in', value: ['High', 'Critical'] });
  }
  if (lower.includes('low risk') || lower.includes('low-risk') || lower.includes('healthy')) {
    rules.push({ field: 'churn_risk_tier', operator: 'in', value: ['Low', 'None'] });
  }

  // Segment rules
  if (lower.includes('premium')) {
    rules.push({ field: 'customer_segment', operator: 'eq', value: 'Premium' });
  }
  if (lower.includes('loyal')) {
    rules.push({ field: 'customer_segment', operator: 'eq', value: 'Loyal' });
  }
  if (lower.includes('new customer')) {
    rules.push({ field: 'customer_segment', operator: 'eq', value: 'New' });
  }
  if (lower.includes('occasional')) {
    rules.push({ field: 'customer_segment', operator: 'eq', value: 'Occasional' });
  }

  // Recency rules
  if (lower.includes('inactive') || lower.includes('dormant')) {
    rules.push({ field: 'days_since_last_purchase', operator: 'gt', value: 60 });
  }
  if (lower.includes('active') || lower.includes('recent')) {
    rules.push({ field: 'days_since_last_purchase', operator: 'lte', value: 30 });
  }

  // Channel rules
  if (lower.includes('online')) {
    rules.push({ field: 'preferred_channel', operator: 'eq', value: 'Online' });
  }
  if (lower.includes('in-store') || lower.includes('in store') || lower.includes('offline')) {
    rules.push({ field: 'preferred_channel', operator: 'eq', value: 'In-Store' });
  }

  return rules;
}

// Format rule for display
export function formatRule(rule: SegmentRule): string {
  const fieldLabels: Record<string, string> = {
    clv_12m: 'CLV (12m)',
    churn_risk_tier: 'Churn Risk',
    customer_segment: 'Segment',
    days_since_last_purchase: 'Days Since Last Purchase',
    preferred_channel: 'Channel',
    total_spend: 'Total Spend',
    avg_basket: 'Avg Basket',
    loyalty_tier: 'Loyalty Tier',
    city: 'City',
  };

  const operatorLabels: Record<string, string> = {
    eq: '=',
    neq: '≠',
    gt: '>',
    gte: '≥',
    lt: '<',
    lte: '≤',
    between: 'between',
    in: 'in',
    not_in: 'not in',
    contains: 'contains',
  };

  const field = fieldLabels[rule.field] || rule.field;
  const operator = operatorLabels[rule.operator] || rule.operator;

  let value: string;
  if (Array.isArray(rule.value)) {
    value = rule.value.join(', ');
  } else if (typeof rule.value === 'number') {
    if (rule.field.includes('clv') || rule.field.includes('spend') || rule.field.includes('basket')) {
      value = `₹${rule.value.toLocaleString('en-IN')}`;
    } else {
      value = rule.value.toLocaleString('en-IN');
    }
  } else {
    value = String(rule.value);
  }

  return `${field} ${operator} ${value}`;
}

// ============================================================================
// SQL GENERATION
// ============================================================================

// Convert segment rules to SQL WHERE clause
export function segmentToSQL(segment: CustomerSegment): string {
  if (segment.rules.length === 0) {
    return '1=1';
  }

  const conditions = segment.rules.map((rule) => {
    const field = rule.field;
    const value = rule.value;

    switch (rule.operator) {
      case 'eq':
        return typeof value === 'string' ? `${field} = '${value}'` : `${field} = ${value}`;
      case 'neq':
        return typeof value === 'string' ? `${field} != '${value}'` : `${field} != ${value}`;
      case 'gt':
        return `${field} > ${value}`;
      case 'gte':
        return `${field} >= ${value}`;
      case 'lt':
        return `${field} < ${value}`;
      case 'lte':
        return `${field} <= ${value}`;
      case 'between':
        const [min, max] = value as [number, number];
        return `${field} BETWEEN ${min} AND ${max}`;
      case 'in':
        const values = (value as string[]).map((v) =>
          typeof v === 'string' ? `'${v}'` : v
        ).join(', ');
        return `${field} IN (${values})`;
      case 'not_in':
        const notValues = (value as string[]).map((v) =>
          typeof v === 'string' ? `'${v}'` : v
        ).join(', ');
        return `${field} NOT IN (${notValues})`;
      case 'contains':
        return `${field} LIKE '%${value}%'`;
      default:
        return '1=1';
    }
  });

  return conditions.join(' AND ');
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Get segment count
export function getSegmentCount(module?: string): number {
  return getSegments(module).length;
}

// Clear all segments
export function clearAllSegments(module?: string): void {
  if (typeof window === 'undefined') return;

  try {
    if (module) {
      const segments = getSegments();
      const filtered = segments.filter((s) => s.module !== module);
      localStorage.setItem(SEGMENTS_KEY, JSON.stringify(filtered));
    } else {
      localStorage.removeItem(SEGMENTS_KEY);
    }

    window.dispatchEvent(new CustomEvent('segmentsChanged', { detail: { action: 'clear' } }));
  } catch (error) {
    console.error('Failed to clear segments:', error);
  }
}

// Check if segment name exists
export function segmentNameExists(name: string, module?: string): boolean {
  const segments = getSegments(module);
  return segments.some((s) => s.name.toLowerCase() === name.toLowerCase());
}
