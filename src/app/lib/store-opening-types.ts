// Types for the Store Opening Forecast page (/merchandise/cold-start/store-opening).
// Store opening · Lucknow Hazratganj — first-year ramp forecast for a new Tier-2 store.

export interface StoreOpeningHeader {
  store_name: string;          // "Hazratganj · Lucknow"
  store_id: string;            // "LK-001-HZR"
  format: string;              // "8,200 sq ft · Standard"
  grand_opening_iso: string;   // "2026-05-30"
  grand_opening_label: string; // "30 May 2026"
  model_run_label: string;     // "model run · 16 Jun 2026"
  trade_area_label: string;    // "Mall in-line · trade area ~620K · opened 30 May 2026"
  chips: string[];             // ["First store in Lucknow", ...]
}

export interface StoreOpeningKPI {
  id: string;
  label: string;
  value: string;
  sub: string;
  tone?: 'positive' | 'warning' | 'neutral';
  dot?: 'green' | 'amber' | 'rose' | 'slate';
}

export interface StoreOpeningRampPoint {
  week: number;                          // 1..52
  week_label: string;                    // "W1"
  point_forecast_inr: number;            // central forecast
  // P10/P90 comp-blend (narrower band)
  comp_lower_inr: number;
  comp_upper_inr: number;
  // P10/P90 cold-start (wider band)
  cold_lower_inr: number;
  cold_upper_inr: number;
  actual_sales_inr: number | null;       // Wk 1-3 only
}

export interface StoreOpeningRampMarker {
  week: number;
  label: string;
  color: string;   // tailwind / hex
}

export interface StoreOpeningRamp {
  points: StoreOpeningRampPoint[];
  markers: StoreOpeningRampMarker[];
  callout: string;
}

export interface StoreOpeningComparable {
  rank: number;
  store_name: string;       // "Andheri W"
  city_state: string;       // "Mumbai · Andheri W, MH"
  match_pct: number;        // 88
  first_year_net_inr: number;
  sparkline: number[];      // 52 weekly values for the mini chart
}

export interface StoreOpeningComparables {
  rows: StoreOpeningComparable[];
  total_count: number;
  weighted_avg_inr: number;
}

export interface StoreOpeningDriver {
  label: string;
  effect_pct: number;       // positive or negative, vs baseline
}

export interface StoreOpeningDrivers {
  rows: StoreOpeningDriver[];
  net_effect_pct: number;
}

export interface StoreOpeningDepartmentRow {
  department: string;
  mix_pct: number;
  year1_net_inr: number;
  confidence: number;              // 0..1
  opening_buy_inr: number;
  status: 'Review' | 'Ready' | 'Low conf.';
}

export interface StoreOpeningDepartments {
  rows: StoreOpeningDepartmentRow[];
  remainder_label: string;         // "+ Beauty, Footwear & front-end impulse · 12.5%"
  total_opening_buy_inr: number;
}

export interface StoreOpeningPayload {
  header: StoreOpeningHeader;
  kpis: StoreOpeningKPI[];
  ramp: StoreOpeningRamp;
  comparables: StoreOpeningComparables;
  drivers: StoreOpeningDrivers;
  departments: StoreOpeningDepartments;
  footer_left: string;
  footer_right: string;
}
