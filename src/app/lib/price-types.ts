// Price Intelligence Types

export interface PriceKPI {
  value: number;
  prior: number;
  unit: string;
  label: string;
}

export interface PriceKPIsData {
  revenue_impact: PriceKPI;
  avg_margin_current: PriceKPI;
  avg_margin_projected: PriceKPI;
  promo_roi: PriceKPI;
  competitive_index: PriceKPI;
  sparklines: {
    revenue_impact: number[];
    margin_current: number[];
    margin_projected: number[];
    promo_roi: number[];
    competitive_index: number[];
  };
}

export interface PriceRecommendation {
  product_id: string;
  product_name: string;
  department: string;
  category: string;
  unit_cost: number;
  current_price: number;
  recommended_price: number;
  price_change_pct: number;
  current_margin_pct: number;
  projected_margin_pct: number;
  elasticity_estimate: number;
  total_transactions: number;
  current_revenue: number;
  projected_revenue: number;
  revenue_impact: number;
  recommendation_priority: 'High' | 'Medium' | 'Low';
  action_status: 'pending' | 'accepted' | 'rejected' | 'overridden';
}

export interface ElasticityData {
  department: string;
  category: string;
  elasticity: number;
  confidence: 'high' | 'medium' | 'low';
  sample_size: number;
}

export interface PromoEffectiveness {
  promo_type: string;
  count: number;
  avg_lift_pct: number;
  avg_roi: number;
  avg_cannibalization: number;
  total_incremental_revenue: number;
}

export interface PromoLiftCurvePoint {
  discount_pct: number;
  expected_lift: number;
  actual_lift: number;
  roi: number;
}

export interface PromoLiftCurveData {
  categories: Record<string, PromoLiftCurvePoint[]>;
}

export interface CompetitiveIndex {
  category: string;
  own_price_avg: number;
  competitor_price_avg: number;
  price_index: number;
  position: 'below' | 'parity' | 'slightly_above' | 'above' | 'well_above';
}

export interface PricePositionData {
  category: string;
  price_index: number;
  elasticity: number;
  revenue: number;
  quadrant: 'sweet_spot' | 'premium' | 'danger' | 'watch';
}

export interface MarginDistributionBucket {
  range: string;
  count: number;
  avg_revenue: number;
}

export interface MarginDistributionData {
  current: MarginDistributionBucket[];
  projected: MarginDistributionBucket[];
}

export interface CostPassthrough {
  category: string;
  cost_change_pct: number;
  price_change_pct: number;
  passthrough_rate: number;
  margin_impact: number;
}

export interface ABTest {
  test_id: string;
  product_name: string;
  department: string;
  control_price: number;
  test_price: number;
  control_qty: number;
  test_qty: number | null;
  lift_pct: number | null;
  revenue_lift_pct: number | null;
  significance: string | null;
  winner: 'test' | 'control' | 'inconclusive' | null;
  status: 'running' | 'completed';
}

export interface MarkdownProduct {
  product_id: string;
  product_name: string;
  department: string;
  original_price: number;
  markdown_price: number;
  discount_pct: number;
  days_active: number;
  units_sold: number;
  recovery_pct: number;
}

export interface MarkdownBucket {
  bucket: string;
  count: number;
  avg_discount: number;
  recovery_rate: number;
}

export interface MarkdownRecoveryTrend {
  week: string;
  cumulative_recovery: number;
  target: number;
}

export interface MarkdownData {
  summary: {
    total_markdown_skus: number;
    cleared_in_7d: number;
    cleared_in_14d: number;
    cleared_in_30d: number;
    still_active_30d_plus: number;
    total_recovery: number;
    total_original_value: number;
    recovery_rate: number;
  };
  by_bucket: MarkdownBucket[];
  recovery_trend: MarkdownRecoveryTrend[];
  top_markdown_products: MarkdownProduct[];
}

export interface PromoCalendarItem {
  category: string;
  week: string;
  promo_type: string | null;
  expected_lift: number | null;
  discount: number | null;
  active: boolean;
}

export interface PriceProductRow {
  product_id: string;
  product_name: string;
  department: string;
  category: string;
  current_price: number;
  mrp: number;
  cost_price: number;
  margin_pct: number;
  elasticity: number;
  competitor_avg: number;
  competitive_index: number;
  recommended_price: number;
  recommendation_priority: 'High' | 'Medium' | 'Low';
  last_price_change: string;
  price_change_90d: number;
}

export interface PriceAlert {
  type: 'critical' | 'warning' | 'info';
  message: string;
  related_chart: string;
  category: string | null;
  impact: number;
}

// Summary Types for the hero section
export interface RecommendationSummaryData {
  increases: {
    count: number;
    avgChangePct: number;
    totalRevenueImpact: number;
  };
  decreases: {
    count: number;
    avgChangePct: number;
    totalRevenueImpact: number;
  };
  noChange: {
    count: number;
  };
}

// Filter helper types
export type PriceAction = 'all' | 'increase' | 'decrease' | 'no_change';
export type RecommendationPriority = 'all' | 'High' | 'Medium' | 'Low';
export type ElasticityRange = 'all' | 'elastic' | 'unit' | 'inelastic';

// Helper to determine elasticity category
export function getElasticityCategory(elasticity: number): 'elastic' | 'unit' | 'inelastic' {
  const absElasticity = Math.abs(elasticity);
  if (absElasticity > 1) return 'elastic';
  if (absElasticity === 1) return 'unit';
  return 'inelastic';
}

// Helper to determine price action
export function getPriceAction(priceChangePct: number): 'increase' | 'decrease' | 'no_change' {
  if (priceChangePct > 1) return 'increase';
  if (priceChangePct < -1) return 'decrease';
  return 'no_change';
}
