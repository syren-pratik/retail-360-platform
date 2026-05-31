// Merchandise Demand — canonical type definitions.
// All exports use the MerchDemand* prefix to avoid collision with existing types.

export type MerchDemandMarketCode = 'india-v1';

export type MerchDemandChannel = 'In-Store' | 'Online' | 'Dark Store' | 'Quick-Commerce';

export type MerchDemandHorizon = 7 | 14 | 28 | 60;

export interface MerchDemandSKU {
  sku_id: string;
  product_name: string;
  department: string;
  category: string;
  subcategory: string;
  velocity_class: 'A' | 'B' | 'C';
  perishability: 'non_perishable' | 'short_shelf' | 'perishable';
  price_inr: number;
  mrp_inr: number;
  margin_pct: number;
  is_weather_sensitive: boolean;
  is_festival_sensitive: boolean;
  launch_date: string;
}

export interface MerchDemandStore {
  store_id: string;
  store_name: string;
  region: 'North' | 'South' | 'East' | 'West';
  state: string;
  city: string;
  tier: 1 | 2 | 3;
  store_type: 'Hypermarket' | 'Supermarket' | 'Express' | 'Dark Store' | 'Kirana Partner';
  channels: MerchDemandChannel[];
}

export interface MerchDemandForecastPoint {
  sku_id: string;
  store_id: string;
  date: string;
  is_actual: boolean;
  actual_units: number | null;
  forecast_units: number | null;
  lower_95: number | null;
  upper_95: number | null;
  lower_80: number | null;
  upper_80: number | null;
  revenue_inr: number;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface MerchDemandDriverContribution {
  feature: string;
  display_name: string;
  contribution_pct: number;
  direction: 'positive' | 'negative';
}

export interface MerchDemandSKUDrivers {
  sku_id: string;
  store_id: string;
  as_of_date: string;
  horizon_days: number;
  top_drivers: MerchDemandDriverContribution[];
}

export interface MerchDemandEvent {
  event_id: string;
  event_name: string;
  event_type: 'festival' | 'season' | 'shopping_event' | 'sports' | 'school';
  date: string;
  window_start: string;
  window_end: string;
  regions_affected: string[];
  cultural_significance: 'high' | 'medium' | 'low';
  typical_prep_days: number;
}

export interface MerchDemandEventLift {
  event_id: string;
  category: string;
  expected_lift_pct: number;
  historical_lifts: { year: number; actual_lift_pct: number }[];
  peak_offset_days: number;
}

export interface MerchDemandCategoryPlan {
  department: string;
  category: string;
  subcategory: string;
  quarter: string;
  plan_revenue_inr: number;
  forecast_to_end_inr: number;
  actual_to_date_inr: number;
  variance_pct: number;
  status: 'on_track' | 'at_risk' | 'will_miss' | 'will_beat';
}

export interface MerchDemandActionItem {
  action_id: string;
  sku_id: string;
  store_scope: { type: 'single' | 'cluster' | 'all'; store_ids: string[]; label: string };
  action_type: 'understock_risk' | 'overstock_risk' | 'demand_spike' | 'demand_drop' | 'event_ramp' | 'promo_extend' | 'promo_pull' | 'launch_scale' | 'anomaly';
  context: string;
  recommendation: string;
  confidence: 'High' | 'Medium' | 'Low';
  revenue_impact_inr: number;
  days_to_impact: number;
  created_at: string;
}

export interface MerchDemandPromo {
  promo_id: string;
  sku_ids: string[];
  promo_type: 'Flat %' | 'BOGO' | 'Bundle' | 'Cashback';
  discount_depth_pct: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'planned';
  target_lift_pct: number;
  actual_lift_pct: number | null;
  cannibalization_pct: number | null;
  performance_status: 'over_performing' | 'on_track' | 'under_performing' | 'pending';
  recommendation: string;
}

export interface MerchDemandLaunch {
  launch_id: string;
  sku_id: string;
  launch_date: string;
  days_in_market: number;
  target_units_30d: number;
  actual_units_30d: number | null;
  target_units_90d: number;
  actual_units_90d: number | null;
  performance_status: 'beat_plan' | 'on_plan' | 'missed_plan' | 'too_early';
  recommendation: string;
}

export interface MerchDemandAnomaly {
  anomaly_id: string;
  sku_id: string;
  store_ids: string[];
  detected_date: string;
  deviation_pct: number;
  hypothesis: string;
  hypothesis_confidence: 'High' | 'Medium' | 'Low';
  status: 'open' | 'investigating' | 'confirmed' | 'dismissed';
}

export interface MerchDemandStructuralShift {
  shift_id: string;
  sku_id: string;
  detected_date: string;
  shift_type: 'baseline_up' | 'baseline_down' | 'volatility_up' | 'seasonality_change';
  magnitude_pct: number;
  sustained_days: number;
  hypothesis: string;
}

export interface MerchDemandWeeklyPoint {
  sku_id: string;
  store_id: string;
  week_start: string;       // ISO date of Monday
  units_sum: number;        // total units that week
  units_avg_daily: number;  // for plotting
  revenue_inr: number;
  had_event: boolean;       // true if any event window overlapped this week
}

export interface MerchDemandShardManifest {
  generated_at: string;
  departments: string[];
  daily_window: { start: string; end: string };
  weekly_window: { start: string; end: string };
}

export interface MerchDemandKPIs {
  demand_at_risk_inr: number;
  demand_at_risk_sku_count: number;
  overstock_exposure_inr: number;
  overstock_exposure_sku_count: number;
  next_event: { event_id: string; event_name: string; days_until: number; skus_not_ramped: number };
  forecast_accuracy_30d_pct: number;
  accuracy_trend_4w: { week: string; accuracy_pct: number }[];
  demand_at_risk_trend_4w: { week: string; value_inr: number }[];
  overstock_trend_4w: { week: string; value_inr: number }[];
}

export interface MerchDemandModelMeta {
  production_model: {
    name: string;
    type: string;
    last_trained: string;
    mape_pct_test: number;
    mape_pct_last_30d: number;
    bias_pct: number;
  };
  accuracy_by_velocity: { velocity_class: 'A' | 'B' | 'C'; mape_pct: number }[];
  accuracy_by_department: { department: string; mape_pct: number; sku_count: number }[];
  accuracy_trend_12w: { week: string; mape_pct: number }[];
  feature_importance_global: { feature: string; display_name: string; importance: number }[];
  drift_status: 'stable' | 'degrading' | 'needs_retraining';
  drift_last_checked: string;
  challenger_note: string;
}

export interface MerchDemandPayload {
  market: MerchDemandMarketCode;
  generated_at: string;
  data_window: {
    history_start: string;
    history_end: string;
    forecast_start: string;
    forecast_end: string;
  };
  skus: MerchDemandSKU[];
  stores: MerchDemandStore[];
  events: MerchDemandEvent[];
  event_lifts: MerchDemandEventLift[];
  shard_manifest: MerchDemandShardManifest;
  sku_drivers: MerchDemandSKUDrivers[];
  category_plans: MerchDemandCategoryPlan[];
  action_items: MerchDemandActionItem[];
  promos: MerchDemandPromo[];
  launches: MerchDemandLaunch[];
  anomalies: MerchDemandAnomaly[];
  structural_shifts: MerchDemandStructuralShift[];
  kpis: MerchDemandKPIs;
  model_meta: MerchDemandModelMeta;
}

// Pre-aggregated chart data per department+horizon (used when precomputed is populated)
export interface MerchDemandPrecomputedHorizon {
  subcategory_chart: {
    chart_points: Record<string, unknown>[];
    subcategories: string[];
  };
  top_sku_chart: {
    chart_points: Record<string, unknown>[];
    sku_ids: string[];
    sku_names: Record<string, string>;
  };
  top_skus: {
    sku: MerchDemandSKU;
    sparkline: number[];
    revenue_at_stake: number;
    risk: { label: string; variant: string };
  }[];
}

export interface MerchDemandFullPayload extends MerchDemandPayload {
  daily_forecast_points: MerchDemandForecastPoint[];
  weekly_forecast_points: MerchDemandWeeklyPoint[];
  // Populated by the API; structured as departments → deptKey → horizonStr → data
  precomputed?: {
    departments: Record<string, Record<string, MerchDemandPrecomputedHorizon>>;
  };
  model_card?: Record<string, unknown>;
  plan_vs_actual?: Record<string, unknown>[];
  accuracy_by_horizon?: Record<string, { mape_pct: number; wmape_pct: number; bias_pct: number; sku_count: number }>;
  worst_forecasted_skus?: Record<string, unknown>[];
  new_product_skus?: Record<string, unknown>[];
}
