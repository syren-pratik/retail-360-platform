// Price Intelligence — canonical type definitions.
// All exports use the PriceIntel* prefix.

export interface PriceIntelHeadline {
  sentence: string;
  supporting_line: string;
  week_label: string;
  season_context: string;
}

export interface PriceIntelTrend12WPoint {
  week: number;
  margin_realization_pct: number;
  promo_roi: number;
  sell_through: number;
}

export interface PriceIntelMarginLeakageBreakdown {
  promo_free_rider_inr: number;
  cost_passthrough_gap_inr: number;
  premature_markdown_inr: number;
  elasticity_underpricing_inr: number;
}

export interface PriceIntelKPIs {
  margin_realization_pct: number;
  margin_realization_trend: number;
  gross_margin_pct: number;
  gross_margin_vs_floor: number;
  promo_roi_index: number;
  promo_roi_trend: number;
  free_rider_ratio_pct: number;
  sell_through_pct: number;
  sell_through_vs_target: number;
  active_alerts: number;
  total_margin_leakage_inr: number;
  margin_leakage_breakdown: PriceIntelMarginLeakageBreakdown;
  weeks_of_supply: number;
  weeks_of_supply_trend: number;
  trend_12w: PriceIntelTrend12WPoint[];
}

export interface PriceIntelActionItem {
  id: string;
  priority: 'urgent' | 'review' | 'info';
  alert_type:
    | 'free_rider'
    | 'cost_passthrough'
    | 'margin_floor'
    | 'sell_through'
    | 'elasticity_opportunity'
    | 'promo_ending'
    | 'competitor_gap'
    | 'markdown_trigger';
  sku_id: string;
  product_name: string;
  department: string;
  category: string;
  headline: string;
  recommended_action: string;
  financial_impact_inr: number;
  confidence: 'high' | 'medium' | 'low';
  action_window: string;
  status: 'pending' | 'approved' | 'snoozed';
}

export interface PriceIntelLiveActivity {
  id: string;
  event_type:
    | 'promo_accepted'
    | 'cost_alert'
    | 'markdown_triggered'
    | 'elasticity_update'
    | 'campaign_live'
    | 'compliance_gap'
    | 'free_rider_detected'
    | 'season_alert';
  headline: string;
  detail: string;
  timestamp_ago: string;
  severity: 'red' | 'amber' | 'green' | 'blue';
}

export interface PriceIntelSKU {
  sku_id: string;
  product_name: string;
  department: string;
  category: string;
  subcategory: string;
  velocity_class: 'A' | 'B' | 'C';
  mrp_inr: number;
  cost_inr: number;
  current_price_inr: number;
  current_margin_pct: number;
  target_margin_pct: number;
  elasticity: number;
  elasticity_class: 'inelastic' | 'moderate' | 'elastic';
  recommended_price_inr: number;
  price_change_pct: number;
  projected_margin_pct: number;
  revenue_impact_inr: number;
  recommendation_priority: 'High' | 'Medium' | 'Low';
  is_festival_sensitive: boolean;
  is_weather_sensitive: boolean;
  launch_date: string;
  promo_frequency_pct: number;
  weeks_of_supply: number;
  sell_through_pct: number;
  sell_through_target_pct: number;
  inventory_age_bucket: '0-4W' | '5-8W' | '9-12W' | '13W+';
}

export interface PriceIntelDepartment {
  name: string;
  sku_count: number;
  margin_floor_pct: number;
  current_margin_pct: number;
  margin_vs_floor: number;
  promo_roi_index: number;
  sell_through_pct: number;
  sell_through_target_pct: number;
  categories: string[];
}

export interface PriceIntelCampaign {
  campaign_id: string;
  campaign_name: string;
  mechanic: 'pct_off' | 'bogo' | 'bundle' | 'multipack' | 'cashback';
  department: string;
  category: string;
  budget_inr: number;
  start_date: string;
  end_date: string;
  status: 'live' | 'ended' | 'paused' | 'review';
  spend_to_date_inr: number;
  incremental_revenue_inr: number;
  gross_promo_revenue_inr: number;
  roi: number;
  free_rider_ratio_pct: number;
  post_promo_dip_pct: number;
  lift_pct: number;
  cannibalization_inr: number;
  net_incremental_inr: number;
  confidence: number;
  affected_skus: string[];
}

export interface PriceIntelPromoTrendPoint {
  week: number;
  week_label: string;
  roi: number;
  spend_inr: number;
  incremental_revenue_inr: number;
  goal_roi: number;
  active_campaign_name: string | null;
}

export interface PriceIntelAISuggestion {
  id: string;
  type: 'raise_depth' | 'cut_spend' | 'extend' | 'pause' | 'redirect';
  badge_label: string;
  badge_color: 'green' | 'red' | 'amber';
  campaign_name: string;
  sku_or_category: string;
  explanation: string;
  financial_impact_inr: number;
  confidence: number;
  action_label: string;
}

export interface PriceIntelLiftSegment {
  segment: string;
  lift_pct: number;
  free_rider_ratio_pct: number;
  bar_width_pct: number;
}

export interface PriceIntelMechanicROI {
  mechanic: string;
  roi: number;
  color: string;
  share_pct: number;
}

export interface PriceIntelHeatmapRow {
  category: string;
  department: string;
  values: number[];
  target_pct: number;
}

export interface PriceIntelMarkdownQueueItem {
  sku_id: string;
  product_name: string;
  category: string;
  department: string;
  current_sell_through_pct: number;
  target_sell_through_pct: number;
  days_remaining: number;
  weeks_of_supply: number;
  recommended_depth_pct: number;
  recommended_price_inr: number;
  units_at_risk: number;
  revenue_at_risk_inr: number;
  urgency_score: number;
  inventory_age_bucket: '0-4W' | '5-8W' | '9-12W' | '13W+';
  status: 'pending' | 'approved' | 'snoozed';
}

export interface PriceIntelInventoryAgingBucket {
  units: number;
  value_inr: number;
  flag?: boolean;
}

export interface PriceIntelInventoryAging {
  bucket_0_4w: PriceIntelInventoryAgingBucket;
  bucket_5_8w: PriceIntelInventoryAgingBucket & { flag: boolean };
  bucket_9_12w: PriceIntelInventoryAgingBucket & { flag: boolean };
  bucket_13w_plus: PriceIntelInventoryAgingBucket & { flag: boolean };
  insight: string;
}

export interface PriceIntelChannelPerformance {
  channel: string;
  revenue_inr: number;
  revenue_lift_pct: number;
  bar_width_pct: number;
  baseline_bar_width_pct: number;
}

export interface PriceIntelWaterfallBar {
  label: string;
  value_inr: number;
  is_total: boolean;
  color_type: 'base' | 'leak' | 'result';
}

export interface PriceIntelForecastPoint {
  week: number;
  week_label: string;
  forecast_revenue_inr: number;
  forecast_margin_inr: number;
  lower_ci_inr: number;
  upper_ci_inr: number;
  seasonality_index: number;
  event_label: string | null;
}

export interface PriceIntelModelCard {
  experiment: string;
  target_margin_pct: number;
  max_price_increase_pct: number;
  max_price_decrease_pct: number;
  min_transactions: number;
  products_analyzed: number;
  avg_current_margin: number;
  avg_projected_margin: number;
  total_revenue_impact: number;
  products_with_increase: number;
  products_with_decrease: number;
}

export interface PriceIntelCore {
  generated_at: string;
  anchor_date: string;
  headline: PriceIntelHeadline;
  kpis: PriceIntelKPIs;
  action_queue: PriceIntelActionItem[];
  live_activity: PriceIntelLiveActivity[];
  skus: PriceIntelSKU[];
  departments: PriceIntelDepartment[];
  campaigns: PriceIntelCampaign[];
  promo_roi_trend: PriceIntelPromoTrendPoint[];
  ai_suggestions: PriceIntelAISuggestion[];
  lift_by_segment: PriceIntelLiftSegment[];
  mechanic_roi: PriceIntelMechanicROI[];
  sell_through_heatmap: PriceIntelHeatmapRow[];
  markdown_queue: PriceIntelMarkdownQueueItem[];
  inventory_aging: PriceIntelInventoryAging;
  channel_performance: PriceIntelChannelPerformance[];
  margin_waterfall: PriceIntelWaterfallBar[];
  forecast_14w: PriceIntelForecastPoint[];
  model_card: PriceIntelModelCard;
  markdown_cadence_ladder?: PriceIntelMarkdownCadenceStep[];
  size_color_price_grid?: PriceIntelSizeColorGrid;
  brand_vs_pl_gap?: PriceIntelBrandVsPLRow[];
  returns_margin_overlay?: PriceIntelReturnsMarginOverlay;
}

export interface PriceIntelMarkdownCadenceStep {
  step: 'full_price'|'md25'|'md40'|'md60'|'md80'|'clearance';
  label: string;
  units_remaining: number;
  units_sold_in_step: number;
  target_days_in_step: number;
  actual_days_in_step: number;
  is_stuck: boolean;
  margin_pct: number;
  revenue_usd: number;
}
export interface PriceIntelSizeColorCell {
  size: string; color: string; price_usd: number; margin_pct: number; units_sold: number;
}
export interface PriceIntelSizeColorGrid {
  style_id: string; style_name: string; sizes: string[]; colors: string[];
  cells: PriceIntelSizeColorCell[];
}
export interface PriceIntelBrandVsPLRow {
  department: string; brand_margin_pct: number; pl_margin_pct: number;
  margin_gap_pp: number; brand_revenue_usd: number; pl_revenue_usd: number;
  pl_penetration_pct: number;
}
export interface PriceIntelReturnsMarginOverlay {
  gross_margin_pct: number; returns_rate_pct: number; returns_cost_pct: number; ragm_pct: number;
  by_department: { department: string; gross_margin_pct: number; returns_rate_pct: number; ragm_pct: number; }[];
}

// ─── Precomputed ───────────────────────────────────────────────────────────────

export interface PriceIntelTopSKURow {
  sku_id: string;
  product_name: string;
  category: string;
  revenue_impact_inr: number;
  price_change_pct: number;
  recommendation_priority: 'High' | 'Medium' | 'Low';
}

export interface PriceIntelMarginByCategoryRow {
  category: string;
  current_margin_pct: number;
  target_margin_pct: number;
  margin_floor_pct: number;
  sku_count: number;
}

export interface PriceIntelPrecomputedDept {
  sell_through_heatmap: PriceIntelHeatmapRow[];
  top_skus_by_impact: PriceIntelTopSKURow[];
  margin_by_category: PriceIntelMarginByCategoryRow[];
  campaign_performance: PriceIntelCampaign[];
}

export interface PriceIntelPrecomputed {
  generated_at: string;
  departments: Record<string, PriceIntelPrecomputedDept>;
}

// ─── SKU Detail ────────────────────────────────────────────────────────────────

export interface PriceIntelPriceHistoryPoint {
  date: string;
  price_inr: number;
  mrp_inr: number;
  cost_inr: number;
  margin_pct: number;
  is_promo: boolean;
  promo_depth_pct: number | null;
  event_name: string | null;
}

export interface PriceIntelElasticityCurvePoint {
  price_inr: number;
  demand_index: number;
  margin_inr: number;
  revenue_inr: number;
}

export interface PriceIntelMarginWaterfall {
  cost_inr: number;
  shelf_price_inr: number;
  gross_margin_inr: number;
  gross_margin_pct: number;
  promo_discount_inr: number;
  realized_price_inr: number;
  realized_margin_inr: number;
  realized_margin_pct: number;
  free_rider_waste_inr: number;
  net_margin_inr: number;
  net_margin_pct: number;
}

export interface PriceIntelPromoHistoryItem {
  promo_id: string;
  mechanic: string;
  start_date: string;
  end_date: string;
  depth_pct: number;
  budget_inr: number;
  lift_pct: number;
  incremental_revenue_inr: number;
  free_rider_ratio_pct: number;
  post_promo_dip_pct: number;
  roi: number;
  net_roi: number;
}

export interface PriceIntelRecommendation {
  current_price_inr: number;
  recommended_price_inr: number;
  price_change_pct: number;
  rationale: string;
  projected_volume_change_pct: number;
  projected_revenue_change_inr: number;
  projected_margin_change_pp: number;
  confidence: 'high' | 'medium' | 'low';
  priority: 'High' | 'Medium' | 'Low';
}

export interface PriceIntelSKUDetail {
  sku_id: string;
  product_name: string;
  price_history: PriceIntelPriceHistoryPoint[];
  elasticity_curve: PriceIntelElasticityCurvePoint[];
  margin_waterfall: PriceIntelMarginWaterfall;
  promo_history: PriceIntelPromoHistoryItem[];
  recommendation: PriceIntelRecommendation;
}
