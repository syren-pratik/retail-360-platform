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

// Basket Distribution Types (legacy flat)
export interface BasketDistribution {
  basket_range: string;
  customer_count: number;
  avg_value: number;
}

// Rich Basket Distribution Types
export interface BasketBucket {
  range: string;
  min: number;
  max: number;
  customer_count: number;
  pct_customers: number;
  transactions: number;
  pct_transactions: number;
  revenue: number;
  pct_revenue: number;
  avg_value: number;
  median_value: number;
}

export interface BasketFrequencyCell {
  basket_range: string;
  frequency_range: string;
  customers: number;
  label: string;
  quadrant: string;
}

export interface BasketTrendPoint {
  month: string;
  mean: number;
  median: number;
  p75: number;
  p90: number;
}

export interface BasketDiscountRow {
  range: string;
  promo_pct: number;
  full_price_pct: number;
}

export interface BasketData {
  summary: {
    total_customers: number;
    total_transactions: number;
    total_revenue: number;
    mean_basket: number;
    median_basket: number;
    top_10pct_threshold: number;
    top_20pct_revenue_share: number;
    basket_trend_mom: number;
  };
  distribution: BasketBucket[];
  by_segment: Record<string, number>[];
  by_channel: Record<string, number>[];
  basket_frequency_matrix: BasketFrequencyCell[];
  trend: BasketTrendPoint[];
  category_by_basket: Record<string, Record<string, number>>;
  discount_dependency: BasketDiscountRow[];
  insights: string[];
}

// Category by Segment Types (legacy flat)
export interface CategoryBySegment {
  customer_segment: string;
  top_category: string;
  customer_count: number;
  avg_spend: number;
}

// Category by Segment — rich matrix format
export interface CategoryMetrics {
  customers: number;
  revenue: number;
  penetration: number;
  revenue_share: number;
  avg_spend: number;
  growth_mom: number;
  affinity_index: number;
}

export interface CategorySegmentRow {
  segment: string;
  total_customers: number;
  total_revenue: number;
  categories: Record<string, CategoryMetrics>;
}

export interface CrossSellOpportunity {
  segment: string;
  from_category: string;
  to_category: string;
  current_penetration: number;
  potential_penetration: number;
  gap_customers: number;
  estimated_revenue: number;
  priority: string;
}

export interface CategoryBySegmentData {
  categories: string[];
  segments: string[];
  matrix: CategorySegmentRow[];
  cross_sell_opportunities: CrossSellOpportunity[];
  segment_diagnostics: Record<string, string>;
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

// Frequency Detail Types
export interface FrequencyBucket {
  range: string;
  customer_count: number;
  pct: number;
  revenue: number;
  pct_revenue: number;
  avg_basket: number;
  avg_clv: number;
}

export interface FrequencyMigrationFlow {
  from: string;
  to: string;
  count: number;
  direction: 'up' | 'down' | 'same' | 'lost';
}

export interface FrequencyTrendPoint {
  month: string;
  avg_freq: number;
  median_freq: number;
  repeat_rate: number;
  active_pct: number;
}

export interface EarlyWarningCustomer {
  customer_id: string;
  normal_interval: number;
  current_gap: number;
  days_overdue: number;
  clv: number;
  risk: string;
}

export interface FrequencyData {
  summary: {
    total_customers: number;
    avg_frequency: number;
    median_frequency: number;
    repeat_rate_90d: number;
    pct_active_30d: number;
    pct_active_60d: number;
    pct_active_90d: number;
    median_interpurchase_days: number;
    omni_frequent_pct: number;
    frequency_trend_mom: number;
  };
  distribution: FrequencyBucket[];
  by_segment: Record<string, number>[];
  with_recency: Record<string, number>[];
  frequency_migration: {
    period: string;
    flows: FrequencyMigrationFlow[];
  };
  interpurchase_interval: { range: string; customers: number; pct: number; segment_dominant: string }[];
  frequency_trend: FrequencyTrendPoint[];
  early_warning: EarlyWarningCustomer[];
  insights: string[];
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

// ─── Cohort Detail (expand modal) ───────────────────────────────────────────

export interface CohortHeatmapRow {
  cohort: string;
  size: number;
  m0: number;
  [key: string]: number | string;
}

export interface CohortQualityRow {
  cohort: string;
  size: number;
  paid_pct: number;
  organic_pct: number;
  referral_pct: number;
  avg_cac: number;
  first_aov: number;
  campaign: string;
  shape: string;
}

export interface CohortByChannelPoint {
  cohort: string;
  m1: number;
  m3: number;
  m6: number;
}

export interface CohortCumulativeRevRow {
  cohort: string;
  m0: number;
  m3?: number;
  m6?: number;
  m9?: number;
  m11?: number;
  cac_payback_month: number;
  cohort_cac_total: number;
  [key: string]: number | string | undefined;
}

export interface CohortCurveShape {
  shape: string;
  description: string;
  action: string;
}

export interface CohortLeadingScatter {
  cohort: string;
  m1: number;
  m12: number;
  predicted: boolean;
}

export interface CohortPrediction {
  cohort: string;
  m1_actual: number;
  m12_predicted: number;
  m12_target: number;
  status: string;
}

export interface CohortDetailData {
  summary: {
    weighted_avg_m1: number;
    weighted_avg_m6: number;
    weighted_avg_m12: number;
    best_cohort: { month: string; m6_retention: number };
    worst_cohort: { month: string; m6_retention: number };
    m1_trend_mom: number;
    pct_cohorts_hitting_target: number;
    target_m6: number;
    avg_payback_months: number;
  };
  retention_heatmap: CohortHeatmapRow[];
  revenue_retention: CohortHeatmapRow[];
  cohort_quality: CohortQualityRow[];
  by_channel: Record<string, CohortByChannelPoint[]>;
  cumulative_revenue: CohortCumulativeRevRow[];
  curve_shapes: Record<string, CohortCurveShape>;
  leading_indicator: {
    m1_predicts_m12_r2: number;
    predictions: CohortPrediction[];
    historical_scatter: CohortLeadingScatter[];
    insight: string;
  };
  insights: string[];
}

// ─── Churn Detail (expand modal) ────────────────────────────────────────────

export interface ChurnDriver2 {
  driver: string;
  pct_affected: number;
  direction: string;
}

export interface ChurnTierDetail {
  tier: string;
  customer_count: number;
  pct_of_total: number;
  avg_prob_30d: number;
  avg_prob_60d: number;
  avg_prob_90d: number;
  revenue_at_risk: number;
  margin_at_risk: number;
  avg_clv: number;
  avg_days_since_purchase: number;
  top_drivers: ChurnDriver2[];
  recommended_action: string;
  historical_save_rate: number | null;
  cost_per_intervention: number;
  expected_roi: number | null;
}

export interface ChurnRiskValueCell {
  risk: string;
  value: string;
  customers: number;
  revenue_at_risk: number;
  avg_clv: number;
  action: string;
  priority: number;
}

export interface ChurnMigrationFlow {
  from: string;
  to: string;
  count: number;
  direction: string;
}

export interface ChurnTrendPoint {
  month: string;
  critical_pct: number;
  high_pct: number;
  medium_pct: number;
  low_pct: number;
  revenue_at_risk: number;
}

export interface ChurnByChannelRow {
  channel: string;
  critical_pct: number;
  high_pct: number;
  medium_pct: number;
  low_pct: number;
  total_at_risk: number;
}

export interface RecentlyChurnedCustomer {
  customer_id: string;
  segment: string;
  clv: number;
  last_purchase: string;
  days_since: number;
  lifetime_spend: number;
  top_category: string;
  cause: string;
}

export interface ChurnInterventionAction {
  action: string;
  count: number;
  save_rate: number;
  avg_cost: number;
  roi: number | null;
}

export interface ChurnDetailData {
  summary: {
    total_customers: number;
    overall_churn_rate_90d: number;
    net_churn_last_month: number;
    revenue_at_risk_90d: number;
    margin_at_risk_90d: number;
    save_rate_last_quarter: number;
    intervention_roi: number;
    churn_trend_mom: number;
    model_last_retrained: string;
    model_precision: number;
    model_recall: number;
  };
  tier_detail: ChurnTierDetail[];
  risk_value_matrix: ChurnRiskValueCell[];
  tier_migration: {
    period: string;
    flows: ChurnMigrationFlow[];
    net_movement: { improved: number; worsened: number; churned: number; net: number; direction: string };
  };
  churn_trend: ChurnTrendPoint[];
  by_channel: ChurnByChannelRow[];
  recently_churned: RecentlyChurnedCustomer[];
  intervention_results: {
    last_quarter: {
      total_interventions: number;
      total_cost: number;
      customers_saved: number;
      save_rate: number;
      revenue_retained: number;
      roi: number;
    };
    by_tier: { tier: string; interventions: number; saved: number; save_rate: number; cost: number; revenue_saved: number; roi: number }[];
    by_action: ChurnInterventionAction[];
  };
  model_performance: {
    precision: number;
    recall: number;
    f1: number;
    auc_roc: number;
    last_retrained: string;
    calibration: string;
    predicted_vs_actual: { tier: string; predicted_churn_pct: number; actual_churn_pct: number }[];
  };
  insights: string[];
}

// ─── Revenue Detail (expand modal) ──────────────────────────────────────────

export interface RevenueSegmentDetail {
  segment: string;
  revenue: number;
  customers: number;
  revenue_pct: number;
  avg_revenue: number;
  risk_status: 'healthy' | 'warning' | 'critical' | 'neutral';
  margin_pct: number;
  growth_mom: number;
  avg_basket: number;
  top_category: string;
  repeat_rate: number;
}

export interface RevenueQualityRow {
  segment: string;
  nps: number;
  repeat_rate: number;
  avg_tenure_months: number;
  discount_dependency: number;
  margin_pct: number;
  cac: number;
  ltv_cac: number;
}

export interface RevenueHealthRow {
  segment: string;
  revenue_trend: string;
  churn_risk: string;
  growth_potential: string;
  health_score: number;
  action: string;
}

export interface RevenueConcentrationPoint {
  top_pct: number;
  customer_count: number;
  revenue: number;
  cumulative_revenue_pct: number;
}

export interface RevenueWaterfallItem {
  label: string;
  value: number;
  type: 'base' | 'positive' | 'negative' | 'total';
}

export interface RevenueDetailData {
  summary: {
    total_revenue: number;
    top_20pct_customers_revenue_share: number;
    gini_coefficient: number;
    fastest_growing_segment: string;
    fastest_growing_mom: number;
    revenue_at_risk: number;
    revenue_at_risk_pct: number;
    avg_revenue_per_customer: number;
  };
  segments: RevenueSegmentDetail[];
  concentration: RevenueConcentrationPoint[];
  quality: RevenueQualityRow[];
  health_matrix: RevenueHealthRow[];
  revenue_migration: {
    period: string;
    waterfall: RevenueWaterfallItem[];
  };
  drill_down: Record<string, {
    top_skus: string[];
    top_cities: string[];
    channel_mix: Record<string, number>;
    avg_items_per_basket: number;
    preferred_day: string;
    seasonal_peak: string;
  }>;
  insights: string[];
}

// ─── CLV Detail (expand modal) ───────────────────────────────────────────────

export interface CLVTierEconomics {
  tier: string;
  customer_count: number;
  pct: number;
  avg_clv: number;
  total_clv: number;
  margin_pct: number;
  cac: number;
  ltv_cac: number;
  payback_months: number;
  avg_basket: number;
  avg_frequency: number;
  avg_recency: number;
}

export interface CLVBehavioralProfile {
  tier: string;
  top_category: string;
  top_channel: string;
  avg_sessions_pw: number;
  browse_to_buy: number;
  discount_sensitivity: string;
  omni_rate: number;
  mobile_share: number;
  nps: number;
}

export interface CLVMigrationFlow {
  from: string;
  to: string;
  count: number;
  direction: 'up' | 'down' | 'lost';
}

export interface CLVUpgradeOpportunity {
  tier: string;
  customers: number;
  gap_avg_clv: number;
  revenue_potential: number;
  action: string;
}

export interface CLVTrendPoint {
  month: string;
  platinum_avg: number;
  gold_avg: number;
  silver_avg: number;
  bronze_avg: number;
  total_avg: number;
}

export interface CLVDetailData {
  summary: {
    total_customers: number;
    total_clv: number;
    avg_clv: number;
    median_clv: number;
    top_tier_share: number;
    platinum_pct: number;
    avg_payback_months: number;
    clv_growth_mom: number;
  };
  tier_economics: CLVTierEconomics[];
  behavioral_profile: CLVBehavioralProfile[];
  pareto: { top_pct: number; customers: number; clv_share: number }[];
  migration_flows: CLVMigrationFlow[];
  upgrade_opportunities: CLVUpgradeOpportunity[];
  at_risk_high_clv: { tier: string; at_risk_count: number; avg_clv: number; revenue_at_risk: number; avg_days_inactive: number; action: string }[];
  trends: CLVTrendPoint[];
  insights: string[];
}

// ─── RFM Detail (expand modal) ───────────────────────────────────────────────

export interface RFMNineBoxCell {
  r_band: string;
  f_band: string;
  label: string;
  r_score: number;
  f_score: number;
  customer_count: number;
  avg_clv: number;
  revenue: number;
  avg_recency: number;
  avg_frequency: number;
  action: string;
  color: string;
}

export interface RFMDensityPoint {
  r_score: number;
  f_score: number;
  m_score: number;
  count: number;
}

export interface RFMActionPlaybookRow {
  segment: string;
  size: number;
  message: string;
  channel: string;
  timing: string;
  expected_lift: number;
  cost_per_customer: number;
}

export interface RFMMigrationFlow {
  from: string;
  to: string;
  count: number;
}

export interface RFMDefinition {
  metric: string;
  definition: string;
  why: string;
}

export interface RFMDetailData {
  summary: {
    total_customers: number;
    champions_pct: number;
    at_risk_pct: number;
    avg_rfm_score: number;
    segments_monitored: number;
    high_value_at_risk_revenue: number;
  };
  nine_box: RFMNineBoxCell[];
  density_heatmap: RFMDensityPoint[];
  action_playbook: RFMActionPlaybookRow[];
  migration: {
    period: string;
    flows: RFMMigrationFlow[];
    net_change: { upgraded: number; stable: number; downgraded: number; lost: number };
  };
  definitions: RFMDefinition[];
  insights: string[];
}
