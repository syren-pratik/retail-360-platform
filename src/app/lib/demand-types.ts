// Demand Forecasting Types

export interface DemandKPIs {
  totalForecastedUnits: number;
  totalActualUnits: number;
  forecastAccuracy: number;
  accuracyTrend: number;
  mape: number;
  mapeTrend: number;
  bias: number;
  biasTrend: number;
  stockoutRate: number;
  stockoutTrend: number;
  excessInventoryPct: number;
  excessTrend: number;
  totalSkusTracked: number;
  modelVersion: string;
  lastUpdated: string;
  forecastHorizon: number;
  coveragePct: number;
}

export interface ForecastDataPoint {
  date: string;
  forecast: number;
  actual: number | null;
  lowerBound: number;
  upperBound: number;
}

export interface DepartmentAccuracy {
  department: string;
  accuracy: number;
  mape: number;
  bias: number;
  skuCount: number;
  trend: number;
}

export interface AccuracyTrendPoint {
  week: string;
  accuracy: number;
  mape: number;
  bias: number;
}

export interface DecompositionData {
  baselinePct: number;
  trendPct: number;
  seasonalPct: number;
  promotionPct: number;
  components: {
    date: string;
    baseline: number;
    trend: number;
    seasonal: number;
    promotion: number;
  }[];
}

export interface HourlyHeatmapPoint {
  day: string;
  hour: number;
  value: number;
}

export interface CategoryDemand {
  category: string;
  month: string;
  demand: number;
}

export interface GeographyDemand {
  region: string;
  city: string;
  demand: number;
  growth: number;
}

export interface MonthlyCatGeoData {
  byCategory: CategoryDemand[];
  byGeography: GeographyDemand[];
}

export interface LostSalesItem {
  sku: string;
  name: string;
  department: string;
  lostUnits: number;
  lostRevenue: number;
  stockoutDays: number;
  reason: string;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  category: string;
}

export interface ModelComparison {
  model: string;
  mape: number;
  accuracy: number;
  rmse: number;
  mae: number;
  trainingTime: string;
  isActive: boolean;
}

export interface SKUForecast {
  product_id: string;
  product_name: string;
  department: string;
  current_stock: string;
  forecast_7d: string;
  forecast_14d: string;
  days_of_stock: string;
  stockout_risk: string;
  // Computed/derived fields (optional for backward compatibility)
  sku?: string;
  name?: string;
  abcClass?: 'A' | 'B' | 'C';
  forecast7d?: number;
  actual7d?: number;
  accuracy?: number;
  bias?: number;
  trend?: 'up' | 'down' | 'stable';
  stockDays?: number;
}

export interface DemandAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  type: 'stockout_risk' | 'forecast_deviation' | 'excess_inventory' | 'demand_spike' | 'model_update' | 'seasonality';
  title: string;
  description: string;
  sku?: string;
  department?: string;
  metric: string;
  action: string;
  timestamp: string;
}

export interface DemandAnomaly {
  id: string;
  type: 'spike' | 'drop' | 'trend_change';
  magnitude_pct: number;
  was_forecasted: boolean;
  category: string;
  store_name: string;
  date: string;
  likely_cause: string;
}

export interface AnomalySummary {
  spikes: number;
  drops: number;
  trend_changes: number;
  total_anomalies: number;
  avg_magnitude: number;
  forecasted: number;
  unforecasted: number;
}

export interface FestivalData {
  festival: string;
  date: string;
  expected_demand_lift: number;
  regions_affected: string[];
  categories_affected: string[];
}

export interface PastFestivalImpact {
  festival: string;
  accuracy: 'good' | 'under_forecast' | 'over_forecast';
  actual_lift: number;
  forecast_lift: number;
}

export interface StoreAccuracyData {
  store_name: string;
  city: string;
  region: string;
  mape: number;
  bias: number;
  top_issue: string;
}

export interface StoreAccuracySummary {
  stores_under_10_mape: number;
  stores_10_to_15_mape: number;
  stores_over_15_mape: number;
}

export interface StoreDemandData {
  store_id: string;
  store_name: string;
  city: string;
  department: string;
  avg_daily_demand: number;
}
