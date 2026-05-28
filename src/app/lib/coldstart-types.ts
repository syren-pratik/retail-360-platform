export interface ColdstartTargetCity {
  name: string;
  state: string;
  population_m: number;
  gdp_per_capita_usd: number;
  avg_basket_usd: number;
  climate_zone: string;
  tier: string;
}

export interface ColdstartModelVariant {
  id: string;
  label: string;
  description: string;
  mape: number;
  mae: number;
  bias: number;
  converged_day: number | null;
  color: string;
}

export interface ColdstartCityFeatures {
  city: string;
  state: string;
  population_m: number;
  gdp_per_capita_usd: number;
  avg_basket_usd: number;
  climate_zone: string;
  tier: string;
}

export interface ColdstartCitySimilarity {
  city: string;
  state: string;
  similarity_score: number;
  rank: number;
  population_m: number;
  gdp_per_capita_usd: number;
  avg_basket_usd: number;
  climate_zone: string;
  tier: string;
  weight: number;
}

export interface ColdstartMAPEPoint {
  day: number;
  naive_baseline: number;
  original_analog: number;
  fix1_store_type: number;
  fix2_blending: number;
  fix3_festival: number;
  all_3_combined: number;
  threshold_good: number;
  threshold_acceptable: number;
  is_festival_active: boolean;
  active_festival_name: string | null;
}

export interface ColdstartTimeBucket {
  label: string;
  day_start: number;
  day_end: number;
}

export interface ColdstartBucketMetric {
  bucket: string;
  naive_baseline: number;
  original_analog: number;
  fix1_store_type: number;
  fix2_blending: number;
  fix3_festival: number;
  all_3_combined: number;
}

export interface ColdstartHeatmapCell {
  sku_category: string;
  store_type: string;
  model: string;
  mape: number;
  n_skus: number;
  severity: 'good' | 'acceptable' | 'concerning' | 'critical';
}

export interface ColdstartSKUHoldout {
  sku_id: string;
  category: string;
  predicted: number;
  actual: number;
  error_pct: number;
  model: string;
}

export interface ColdstartFestivalUplift {
  festival: string;
  date: string;
  analog_uplift_pct: number;
  actual_uplift_pct: number;
}

export interface ColdstartFestivalDayPattern {
  day_offset: number;
  label: string;
  avg_uplift_pct: number;
}

export interface ColdstartKPIs {
  champion_mape: number;
  naive_mape: number;
  improvement_pct: number;
  total_skus: number;
  converged_skus: number;
  convergence_day: number;
  holdout_days: number;
  analog_cities: number;
  top_analog_city: string;
  top_analog_similarity: number;
}

// --- Sprint 5 types ---

export interface ColdstartHeroSKU {
  sku_id: string;
  name: string;
  category: string;
  store_type: string;
  avg_daily_units: number;
  analog_mape: number;
  champion_mape: number;
}

export interface ColdstartPredDecompPoint {
  sku_id: string;
  day_num: number;
  jaipur_contribution: number;
  ahmedabad_contribution: number;
  kolkata_contribution: number;
  festival_uplift: number;
  local_blend: number;
  total_prediction: number;
  actual: number;
}

export interface ColdstartSKUDrillPoint {
  sku_id: string;
  day: number;
  predicted: number;
  actual: number;
  lower_95: number;
  upper_95: number;
  ci_range: number;
}

export interface ColdstartAdaptationPoint {
  day: number;
  alpha: number;
  pure_analog: number;
  pure_local: number;
  blended: number;
}

export interface ColdstartFestivalCategoryPattern {
  festival_name: string;
  category: string;
  day_offset: number;
  uplift_multiplier: number;
}

export interface ColdstartMethodology {
  training_data_rows: number;
  holdout_data_rows: number;
  n_iterations: number;
  mlflow_experiment: string;
  algorithm: string;
  features: string[];
  convergence_criterion: string;
}

// --- Sprint 6 types ---

export interface ColdstartWeeklyCost {
  week_num: number;
  naive_cumulative_cost_inr: number;
  champion_cumulative_cost_inr: number;
  savings_cumulative_inr: number;
}

export interface ColdstartCostModel {
  mape_pct: number;
  total_cost_inr: number;
  cost_per_sku_inr: number;
  description: string;
}

export interface ColdstartSavings {
  total_savings_inr: number;
  savings_pct: number;
  description: string;
}

export interface ColdstartPRProjection {
  projected_savings_usd: number;
  projected_savings_inr: number;
  projected_savings_usd_per_billion_revenue: number;
  exchange_rate_inr_per_usd: number;
}

export interface ColdstartCostOfMAPE {
  naive_costs: ColdstartCostModel;
  champion_costs: ColdstartCostModel;
  savings: ColdstartSavings;
  pr_projection: ColdstartPRProjection;
  weekly_breakdown: ColdstartWeeklyCost[];
}

export interface ColdstartExternalSignal {
  signal_id: string;
  display_name: string;
  source_table: string;
  layer: 'Silver' | 'Gold' | 'ML';
  description: string;
  refresh_cadence: string;
  coverage_start: string;
  coverage_end: string;
  n_rows: number;
  n_columns: number;
  freshness_status: 'fresh' | 'stale' | 'delayed';
  key_features: string[];
  used_in_model: boolean;
  icon_name: string;
}

export interface ColdstartSignalIntegration {
  total_signals: number;
  total_columns: number;
  total_rows_millions: number;
  used_in_cold_start_model: number;
  refresh_cadences: Record<string, number>;
}

// --- Sprint 7a types ---

export interface WeatherTemperatureElasticity {
  category: string;
  elasticity_pct_per_c: number;
  threshold_c: number;
  direction: 'positive' | 'negative' | 'neutral';
  confidence_high_pct: number;
  confidence_low_pct: number;
  n_observations: number;
  source_table: 'gold_weather_impact';
}

export interface WeatherMonsoonImpact {
  category: string;
  non_monsoon_avg_qty: number;
  monsoon_avg_qty: number;
  delta_pct: number;
  direction: 'positive' | 'negative' | 'neutral';
  statistical_significance: 'high' | 'medium' | 'low';
  source_table: 'demand_features';
}

export interface WeatherMonsoonMonth {
  month_num: number;
  month_name: string;
  risk_index: number;
  risk_tier: 'low' | 'moderate' | 'high' | 'peak';
  typical_rainfall_mm: number;
  is_pull_forward_window: boolean;
}

export interface WeatherMonsoonRecommendation {
  pull_forward_window_start: string;
  pull_forward_window_end: string;
  weeks_before_peak: number;
  peak_month: string;
  recommended_safety_stock_pct: number;
  affected_categories: string[];
  estimated_revenue_at_risk_inr: number;
  estimated_revenue_at_risk_usd: number;
  source_signal: string;
}

export interface WeatherStoreRisk {
  store_id: string;
  store_name: string;
  store_type: string;
  heatwave_risk: 'low' | 'medium' | 'high' | 'critical';
  heavy_rain_risk: 'low' | 'medium' | 'high' | 'critical';
  cold_spell_risk: 'low' | 'medium' | 'high' | 'critical';
  air_quality_risk: 'low' | 'medium' | 'high' | 'critical';
  monsoon_flood_risk: 'low' | 'medium' | 'high' | 'critical';
  resilience_score: number;
}

export interface WeatherSignalInput {
  column_name: string;
  description: string;
  source_table: string;
  n_observations_millions: number;
  refresh_cadence: 'Daily' | 'Hourly' | 'Real-time';
  coverage_pct: number;
  freshness_status: 'fresh' | 'stale';
  used_in_cold_start: boolean;
}

// --- Sprint 7b types ---

export interface AnalogContribution {
  step_label: string;
  category: 'analog_baseline' | 'analog_adjustment' | 'festival' | 'weather' | 'blend_local';
  city_attribution: 'Jaipur' | 'Ahmedabad' | 'Kolkata' | 'multi' | 'none';
  value_units: number;
  explanation: string;
}

export interface SimilarityAxis {
  axis_name: 'GDP per capita' | 'Population' | 'Basket value';
  similarity_pct: number;
  target_value: string;
  analog_value: string;
}

export interface AnalogCityCard {
  city: 'Jaipur' | 'Ahmedabad' | 'Kolkata';
  weight_pct: number;
  similarity_score: number;
  tier_label: string;
  similarity_axes: SimilarityAxis[];
  adjustments_applied: string[];
  confidence: 'high' | 'medium' | 'low';
  confidence_reason: string;
}

export interface AnalogWaterfallEntry {
  sku_id: string;
  product_name: string;
  day_num: number;
  final_forecast_units: number;
  actual_units: number;
  contributions: AnalogContribution[];
  analog_cards: AnalogCityCard[];
}

export interface ColdstartPayload {
  generated_at: string;
  target_city: ColdstartTargetCity;
  model_variants: ColdstartModelVariant[];
  analog_cities: ColdstartCitySimilarity[];
  mape_over_time: ColdstartMAPEPoint[];
  time_buckets: ColdstartTimeBucket[];
  bucket_metrics: ColdstartBucketMetric[];
  heatmap_cells: ColdstartHeatmapCell[];
  sku_holdouts: ColdstartSKUHoldout[];
  festival_uplifts: ColdstartFestivalUplift[];
  festival_day_pattern: ColdstartFestivalDayPattern[];
  kpis: ColdstartKPIs;
  // Sprint 5
  hero_skus: ColdstartHeroSKU[];
  prediction_decomposition: ColdstartPredDecompPoint[];
  sku_drill_series: ColdstartSKUDrillPoint[];
  adaptation_curve: ColdstartAdaptationPoint[];
  festival_category_patterns: ColdstartFestivalCategoryPattern[];
  methodology: ColdstartMethodology;
  // Sprint 6
  cost_of_mape: ColdstartCostOfMAPE;
  external_signals: ColdstartExternalSignal[];
  signal_integration: ColdstartSignalIntegration;
  // Sprint 7a
  weather_temperature_elasticity: WeatherTemperatureElasticity[];
  weather_monsoon_impact: WeatherMonsoonImpact[];
  weather_monsoon_calendar: WeatherMonsoonMonth[];
  weather_monsoon_recommendation: WeatherMonsoonRecommendation;
  weather_store_risk: WeatherStoreRisk[];
  weather_signal_inputs: WeatherSignalInput[];
  // Sprint 7b
  analog_waterfall: AnalogWaterfallEntry[];
}
