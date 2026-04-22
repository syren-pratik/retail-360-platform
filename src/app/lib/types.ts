// KPI Types
export interface KPIData {
  total_customers: number;
  total_customers_prior: number;
  total_customers_trend: number[];
  avg_clv: number;
  avg_clv_prior: number;
  avg_clv_trend: number[];
  churn_rate_pct: number;
  churn_rate_pct_prior: number;
  churn_rate_pct_trend: number[];
  active_rate_pct: number;
  active_rate_pct_prior: number;
  active_rate_pct_trend: number[];
}

// CLV Distribution Types
export interface CLVTierData {
  clv_tier: string;
  customer_count: number;
  avg_clv: number;
  total_clv: number;
  avg_frequency: number;
  avg_recency: number;
}

// RFM Sample Types
export interface RFMCustomer {
  customer_id: string;
  recency_days: number;
  purchase_frequency: number;
  clv_12m: number;
  clv_tier: string;
  probability_alive: number;
}

// Churn Risk Types
export interface ChurnRiskData {
  churn_risk_tier: string;
  customer_count: number;
  avg_prob_30d: number;
  avg_prob_60d: number;
  avg_prob_90d: number;
}

// Churn Drivers Types
export interface ChurnDriver {
  feature_name: string;
  importance: number;
  direction: 'positive' | 'negative';
  rank: number;
}

// Cohort Retention Types
export interface CohortRetentionRow {
  cohort_month: string;
  period_number: number;
  original_customers: number;
  retained_customers: number;
  retention_rate: number;
}

export interface CohortRetentionMatrix {
  cohort_month: string;
  original_customers: number;
  retention: number[];
  retained: number[];  // retained_customers per period
}

// Basket Distribution Types
export interface BasketDistribution {
  basket_range: string;
  customer_count: number;
  avg_value: number;
}

// Category by Segment Types
export interface CategoryBySegment {
  customer_segment: string;
  top_category: string;
  customer_count: number;
  avg_spend: number;
}

// Customer Table Types
export interface CustomerRecord {
  customer_id: string;
  customer_segment: string;
  loyalty_tier: string;
  total_spend: number;
  total_transactions: number;
  avg_basket: number;
  days_since_last_purchase: number;
  clv_12m: number;
  clv_tier: string;
  churn_prob_90d: number;
  churn_risk_tier: string;
  preferred_channel: string;
  acquisition_channel?: string;
  city?: string;
  geography: string;
  top_category: string;
  probability_alive?: number;
  purchase_frequency?: number;
  recency_days?: number;
}

// Filter Types
export interface Store {
  store_id: string;
  store_name: string;
  city: string;
}

export interface Filters {
  dateRange: '7d' | '30d' | '90d' | 'YTD' | 'custom';
  startDate?: string;
  endDate?: string;
  stores: string[];
  segments: string[];
  loyaltyTiers: string[];
  channel: 'all' | 'online' | 'in-store';
  searchQuery: string;
}

// Dimensions Cache Types
export interface DimensionsCache {
  stores: Store[];
  segments: string[];
  loyalty_tiers: string[];
  categories: string[];
}

// AI Chat Types
export type UIComponentType =
  | { type: 'bar_chart'; data: Record<string, unknown>[]; x_key: string; y_key: string; title: string; color?: string }
  | { type: 'donut_chart'; data: Record<string, unknown>[]; name_key: string; value_key: string; title: string }
  | { type: 'line_chart'; data: Record<string, unknown>[]; x_key: string; y_key: string; title: string }
  | { type: 'data_table'; data: Record<string, unknown>[]; columns: string[]; title: string }
  | { type: 'kpi_card'; label: string; value: string; change?: string; direction?: 'up' | 'down' }
  | { type: 'comparison'; items: { label: string; metrics: Record<string, string> }[] }
  | { type: 'text_only' };

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ui_component?: UIComponentType;
  timestamp: Date;
}

export interface SQLGenerationResponse {
  sql: string;
  explanation: string;
  ui_hint: string;
}

export interface ChatResponse {
  answer: string;
  ui_component: UIComponentType;
}

// Segment Migration Types
export interface SegmentFlow {
  from: string;
  to: string;
  count: number;
  pct: number;
}

export interface SegmentMigrationData {
  period: {
    from: string;
    to: string;
  };
  segments: string[];
  flows: SegmentFlow[];
  summary: {
    total_customers: number;
    upgraded: number;
    stable: number;
    downgraded: number;
    churned: number;
  };
}

// Revenue Concentration Types
export interface ParetoDataPoint {
  percentile: number;
  cumulative_revenue_pct: number;
  customer_count: number;
}

export interface RevenueBySegment {
  segment: string;
  revenue: number;
  revenue_pct: number;
  customers: number;
  avg_revenue: number;
}

export interface RevenueConcentrationData {
  pareto: ParetoDataPoint[];
  by_segment: RevenueBySegment[];
  summary: {
    total_revenue: number;
    top_10_pct_revenue: number;
    top_20_pct_revenue: number;
    gini_coefficient: number;
  };
}

// Recency & Frequency Types
export interface DistributionBucket {
  range: string;
  count: number;
  pct: number;
}

export interface RecencyFrequencyData {
  recency_distribution: DistributionBucket[];
  frequency_distribution: DistributionBucket[];
  summary: {
    avg_recency_days: number;
    median_recency_days: number;
    avg_frequency: number;
    median_frequency: number;
    active_30_days: number;
    active_30_days_pct: number;
  };
}

// Channel Analysis Types
export interface ChannelPerformance {
  channel: string;
  customers: number;
  orders: number;
  revenue: number;
  avg_order_value: number;
  conversion_rate: number | null;
  retention_rate: number;
}

export interface AcquisitionChannel {
  channel: string;
  customers: number;
  pct: number;
  cac: number;
  ltv_cac_ratio: number | null;
}

export interface MultiChannelStats {
  single_channel: { customers: number; pct: number; avg_clv: number };
  two_channels: { customers: number; pct: number; avg_clv: number };
  three_plus_channels: { customers: number; pct: number; avg_clv: number };
}

export interface ChannelAnalysisData {
  channel_performance: ChannelPerformance[];
  acquisition_by_channel: AcquisitionChannel[];
  multi_channel: MultiChannelStats;
  summary: {
    total_channels_active: number;
    dominant_channel: string;
    fastest_growing: string;
    highest_retention: string;
    highest_aov: string;
  };
}

// At-Risk Alerts Types
export interface AtRiskAlert {
  customer_id: string;
  customer_name: string;
  segment: string;
  clv: number;
  churn_probability: number;
  days_since_last_order: number;
  alert_type: string;
  recommended_action: string;
  potential_revenue_at_risk: number;
}

export interface AtRiskAlertsData {
  alerts: AtRiskAlert[];
  summary: {
    total_at_risk: number;
    high_priority: number;
    medium_priority: number;
    low_priority: number;
    total_revenue_at_risk: number;
    avg_churn_probability: number;
  };
}

// Geography Types
export interface GeographyByCity {
  city: string;
  state: string;
  customers: number;
  avg_churn: number;
  avg_clv: number;
  stores: number;
}

export interface GeographyByState {
  state: string;
  region: string;
  customers: number;
  avg_clv: number;
  avg_churn: number;
  revenue: number;
}

// Store and Dimensions Types for Geography Filters
export interface StoreData {
  store_id: string;
  store_name: string;
  region: string;
  state: string;
  city: string;
}

export interface StateData {
  state: string;
  cities: string[];
}

export interface RegionData {
  region: string;
  states: StateData[];
}

export interface DimensionsData {
  geography: {
    regions: RegionData[];
  };
  stores: StoreData[];
  segments?: string[];
  loyalty_tiers?: string[];
  categories?: string[];
}
