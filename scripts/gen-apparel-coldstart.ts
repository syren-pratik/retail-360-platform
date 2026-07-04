/**
 * Apparel Cold-Start data generator.
 * Spec: docs/apparel-coldstart-spec.md
 * Emits cache/apparel/coldstart.json (schema-mirror of grocery).
 */

import * as fs from 'fs';
import * as path from 'path';

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(0xc07d57a2);
const r = () => rng();
const ri = (lo: number, hi: number) => Math.floor(lo + r() * (hi - lo + 1));
const rb = (lo: number, hi: number) => lo + r() * (hi - lo);
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(r() * arr.length)];
const round2 = (n: number) => Math.round(n * 10000) / 10000;

const target_city = {
  name: 'Austin',
  state: 'TX',
  population_m: 2.4,
  gdp_per_capita_usd: 64500,
  avg_basket_usd: 68.5,
  climate_zone: 'Humid Subtropical',
  tier: 'Tier-1',
};

const model_variants = [
  { id: 'naive_baseline',   label: 'Naive Baseline',                description: 'National average demand scaled to Austin population',   mape: 0.42,  mae: 8.2, bias: 0.14,  converged_day: null, color: '#94a3b8' },
  { id: 'original_analog',  label: 'Original Analog',               description: 'Pure top-1 analog city (Dallas) forecast',              mape: 0.31,  mae: 6.1, bias: 0.08,  converged_day: 45,   color: '#64748b' },
  { id: 'fix1_store_type',  label: '+ Store-Type Weighting',        description: 'Weight analogs by matching store format',               mape: 0.26,  mae: 5.0, bias: 0.05,  converged_day: 32,   color: '#3b82f6' },
  { id: 'fix2_blending',    label: '+ Attribute + Analog Blend',    description: 'Attribute-based prior blended with top-3 analog',       mape: 0.18,  mae: 3.4, bias: 0.02,  converged_day: 21,   color: '#10b981' },
  { id: 'fix3_festival',    label: '+ BTS Event Overlay',           description: 'Overlay BTS lift multipliers from analog seasonality',  mape: 0.19,  mae: 3.6, bias: 0.03,  converged_day: 24,   color: '#f59e0b' },
  { id: 'all_3_combined',   label: 'Champion (all 3)',              description: 'Store-type + blend + BTS overlay',                       mape: 0.16,  mae: 2.9, bias: 0.01,  converged_day: 18,   color: '#8b5cf6' },
];

const analog_cities = [
  { city: 'Dallas',    state: 'TX', rank: 1, similarity_score: 0.82, weight: 0.34, population_m: 7.6, gdp_per_capita_usd: 71200, avg_basket_usd: 72.4, climate_zone: 'Humid Subtropical', tier: 'Tier-1', climate_similarity_pct: 92, demo_similarity_pct: 88, competitor_density_similarity_pct: 76, key_drivers: ['climate', 'demographics', 'basket size'] },
  { city: 'Houston',   state: 'TX', rank: 2, similarity_score: 0.78, weight: 0.26, population_m: 7.2, gdp_per_capita_usd: 68400, avg_basket_usd: 69.1, climate_zone: 'Humid Subtropical', tier: 'Tier-1', climate_similarity_pct: 94, demo_similarity_pct: 82, competitor_density_similarity_pct: 71, key_drivers: ['climate', 'brand mix'] },
  { city: 'Atlanta',   state: 'GA', rank: 3, similarity_score: 0.71, weight: 0.18, population_m: 6.1, gdp_per_capita_usd: 62800, avg_basket_usd: 65.2, climate_zone: 'Humid Subtropical', tier: 'Tier-1', climate_similarity_pct: 88, demo_similarity_pct: 76, competitor_density_similarity_pct: 82, key_drivers: ['climate', 'mall foot-traffic'] },
  { city: 'Phoenix',   state: 'AZ', rank: 4, similarity_score: 0.62, weight: 0.12, population_m: 4.9, gdp_per_capita_usd: 58600, avg_basket_usd: 63.8, climate_zone: 'Arid',              tier: 'Tier-1', climate_similarity_pct: 54, demo_similarity_pct: 74, competitor_density_similarity_pct: 68, key_drivers: ['brand mix', 'basket size'] },
  { city: 'Denver',    state: 'CO', rank: 5, similarity_score: 0.55, weight: 0.10, population_m: 3.0, gdp_per_capita_usd: 66400, avg_basket_usd: 67.2, climate_zone: 'Semi-Arid Cold',    tier: 'Tier-1', climate_similarity_pct: 41, demo_similarity_pct: 71, competitor_density_similarity_pct: 74, key_drivers: ['demographics', 'apparel spend'] },
];

const DEPARTMENTS = ['Mens', 'Womens', 'Kids', 'Footwear', 'Accessories'];
const STORE_TYPES = ['Flagship', 'Mall', 'Outlet', 'Urban'];
const BRANDS = ['Nike', 'Levi', 'Lululemon', 'VF Corp', 'Adidas', 'Gap'];

const mape_over_time = Array.from({ length: 90 }).map((_, i) => {
  const day = i + 1;
  const decay = (base: number) => Math.max(0.05, base * (1 - i * 0.006) * (0.9 + r() * 0.2));
  return {
    day,
    naive_baseline:   round2(decay(0.42)),
    original_analog:  round2(decay(0.31)),
    fix1_store_type:  round2(decay(0.26)),
    fix2_blending:    round2(decay(0.18)),
    fix3_festival:    round2(decay(0.19)),
    all_3_combined:   round2(decay(0.16)),
    threshold_good:       0.15,
    threshold_acceptable: 0.25,
    threshold_poor:       0.35,
  };
});

const time_buckets = [
  { label: 'Week 1',   day_start: 1,  day_end: 7 },
  { label: 'Week 2',   day_start: 8,  day_end: 14 },
  { label: 'Week 3-4', day_start: 15, day_end: 28 },
  { label: 'Month 2',  day_start: 29, day_end: 60 },
  { label: 'Month 3',  day_start: 61, day_end: 90 },
];

const bucket_metrics = time_buckets.map((b) => ({
  bucket: b.label,
  naive_baseline:   round2(0.42 + rb(-0.04, 0.04)),
  original_analog:  round2(0.31 + rb(-0.04, 0.04)),
  fix1_store_type:  round2(0.26 + rb(-0.03, 0.03)),
  fix2_blending:    round2(0.18 + rb(-0.02, 0.02)),
  fix3_festival:    round2(0.19 + rb(-0.03, 0.03)),
  all_3_combined:   round2(0.16 + rb(-0.02, 0.02)),
}));

const heatmap_cells: any[] = [];
for (const dept of DEPARTMENTS) {
  for (const st of STORE_TYPES) {
    for (const m of ['naive_baseline', 'original_analog', 'fix2_blending', 'all_3_combined']) {
      const mape = round2(rb(0.12, 0.48));
      const severity = mape < 0.20 ? 'good' : mape < 0.30 ? 'acceptable' : 'poor';
      heatmap_cells.push({ sku_category: dept, store_type: st, model: m, mape, n_skus: ri(8, 24), severity });
    }
  }
}
// pad to ~240 cells to match grocery volume
while (heatmap_cells.length < 240) {
  const dept = pick(DEPARTMENTS);
  const st = pick(STORE_TYPES);
  const m = pick(['naive_baseline', 'original_analog', 'fix1_store_type', 'fix2_blending', 'fix3_festival', 'all_3_combined']);
  const mape = round2(rb(0.10, 0.45));
  const severity = mape < 0.20 ? 'good' : mape < 0.30 ? 'acceptable' : 'poor';
  heatmap_cells.push({ sku_category: dept, store_type: st, model: m, mape, n_skus: ri(4, 20), severity });
}

const NUM_HERO = 10;
const hero_skus = Array.from({ length: NUM_HERO }).map((_, i) => {
  const dept = pick(DEPARTMENTS);
  return {
    sku_id: `AUS-SKU-${String(i + 1).padStart(4, '0')}`,
    name: `${pick(['Performance', 'Classic', 'Modern', 'Heritage'])} ${dept} ${pick(['Tee', 'Denim', 'Jacket', 'Sneaker'])} ${String(i + 1).padStart(3, '0')}`,
    category: dept,
    store_type: pick(STORE_TYPES),
    avg_daily_units: round2(rb(28, 65)),
    analog_mape: round2(rb(0.28, 0.45)),
    champion_mape: round2(rb(0.10, 0.22)),
    brand: pick(BRANDS),
    brand_tier: r() < 0.65 ? 'national' : 'pl_essentials',
    season_tag: pick(['bts', 'transitional', 'fall']),
    weather_sensitivity: pick(['none', 'tees_heat', 'outerwear_cold']),
    returns_rate_pct: ri(6, 18),
  };
});

const sku_holdouts = Array.from({ length: 42 }).map((_, i) => {
  const predicted = round2(rb(30, 120));
  const actual = round2(predicted * rb(0.6, 1.5));
  const error_pct = round2(Math.abs(actual - predicted) / actual);
  return {
    sku_id: `AUS-SKU-${String(i + 1).padStart(4, '0')}`,
    category: pick(DEPARTMENTS),
    predicted,
    actual,
    error_pct,
    model: 'fix2_blending',
  };
});

const APPAREL_FESTIVALS = [
  { name: 'BTS 2026',      date: '2026-08-15', lift: 65 },
  { name: 'Labor Day',     date: '2026-09-07', lift: 24 },
  { name: 'Halloween ramp', date: '2026-10-25', lift: 18 },
  { name: 'BFCM',          date: '2026-11-27', lift: 92 },
];

const festival_uplifts = APPAREL_FESTIVALS.map((f) => ({
  festival: f.name,
  date: f.date,
  analog_uplift_pct: round2(f.lift * rb(0.85, 1.15)),
  actual_uplift_pct: round2(f.lift * rb(0.9, 1.1)),
}));

const festival_day_pattern = Array.from({ length: 15 }).map((_, i) => {
  const offset = i - 7;
  const peak = offset === 0 ? 8.5 : offset === -1 ? 6.2 : offset === 1 ? 5.1 : Math.max(0.5, 4.0 - Math.abs(offset) * 0.4);
  return {
    day_offset: offset,
    label: offset === 0 ? 'D-0' : offset > 0 ? `D+${offset}` : `D${offset}`,
    avg_uplift_pct: round2(peak * rb(0.9, 1.1)),
  };
});

const kpis = {
  champion_mape: 0.16,
  naive_mape: 0.42,
  improvement_pct: 62,
  total_skus: 240,
  converged_skus: 189,
  convergence_day: 18,
  holdout_days: 30,
  analog_cities: 5,
  top_analog_city: 'Dallas',
  top_analog_similarity: 0.82,
  target_city: 'Austin',
  days_to_launch: 42,
  revenue_at_stake_usd: 2_450_000,
};

const prediction_decomposition: any[] = [];
const SNAP_DAYS = [1, 15, 30, 45, 60, 90];
for (const sku of hero_skus.slice(0, 5)) {
  for (const d of SNAP_DAYS) {
    prediction_decomposition.push({
      sku_id: sku.sku_id,
      day_num: d,
      dallas_contribution:   round2(rb(15, 30)),
      houston_contribution:  round2(rb(10, 22)),
      atlanta_contribution:  round2(rb(8, 18)),
      festival_uplift:       round2(rb(0.4, 1.2)),
      local_blend:           round2(rb(0.3, 0.9)),
      total_prediction:      round2(rb(45, 85)),
      actual:                round2(rb(42, 88)),
    });
  }
}

const sku_drill_series: any[] = [];
for (const sku of hero_skus) {
  for (let day = 1; day <= 90; day++) {
    const predicted = round2(sku.avg_daily_units * (0.85 + Math.sin(day / 14) * 0.15) * rb(0.9, 1.1));
    const actual = round2(predicted * rb(0.75, 1.2));
    const ci = predicted * 0.28;
    sku_drill_series.push({
      sku_id: sku.sku_id,
      day,
      predicted,
      actual,
      lower_95: round2(Math.max(0, predicted - ci)),
      upper_95: round2(predicted + ci),
      ci_range: round2(ci * 2),
    });
  }
}

const adaptation_curve = Array.from({ length: 90 }).map((_, i) => {
  const day = i + 1;
  const alpha = round2(Math.min(1, 0.01 + i * 0.011));
  return {
    day,
    alpha,
    pure_analog: round2(7.0 * (1 - i * 0.006) + rb(-0.4, 0.4)),
    pure_local: round2(0.05 + i * 0.08 + rb(-0.1, 0.2)),
    blended: round2(7.0 * (1 - i * 0.005) + rb(-0.3, 0.3)),
  };
});

const festival_category_patterns: any[] = [];
for (const f of APPAREL_FESTIVALS) {
  for (const dept of DEPARTMENTS) {
    for (let offset = -3; offset <= 3; offset++) {
      const peak = f.name === 'BFCM' ? 3.2 : f.name === 'BTS 2026' ? 2.4 : 1.4;
      const mult = offset === 0 ? peak : Math.max(1.02, peak - Math.abs(offset) * 0.3);
      festival_category_patterns.push({
        festival_name: f.name,
        category: dept,
        day_offset: offset,
        uplift_multiplier: round2(mult * rb(0.9, 1.1)),
      });
    }
  }
}

const methodology = {
  training_data_rows: 4_820_000,
  holdout_data_rows: 780_000,
  n_iterations: 24,
  mlflow_experiment: 'coldstart_apparel_us_v3',
  algorithm: 'Attribute-Blend + Analog-Weighted Ensemble',
  features: ['dept', 'brand', 'brand_tier', 'store_type', 'climate_zone', 'demo_index', 'competitor_density', 'apparel_spend_index'],
  convergence_criterion: 'MAPE < 20% on rolling 7-day window',
};

const naive_cost_usd = 1_820_000;
const champion_cost_usd = 640_000;
const cost_of_mape = {
  naive_costs: {
    mape_pct: 42.0,
    total_cost_inr: naive_cost_usd,
    cost_per_sku_inr: Math.round(naive_cost_usd / 42),
    description: 'National baseline — unacceptable error drives overstock and stockout losses at Austin launch',
  },
  champion_costs: {
    mape_pct: 16.0,
    total_cost_inr: champion_cost_usd,
    cost_per_sku_inr: Math.round(champion_cost_usd / 42),
    description: 'Champion attribute-blend model — analog prior with live Austin adaptation',
  },
  savings: {
    total_savings_inr: naive_cost_usd - champion_cost_usd,
    savings_pct: Math.round(((naive_cost_usd - champion_cost_usd) / naive_cost_usd) * 100),
    description: 'Cost avoided through champion model over 90-day holdout window',
  },
  pr_projection: {
    projected_savings_usd: naive_cost_usd - champion_cost_usd,
    projected_savings_inr: naive_cost_usd - champion_cost_usd,
    projected_savings_usd_per_billion_revenue: 4_800_000,
    exchange_rate_inr_per_usd: 1,
  },
  weekly_breakdown: (() => {
    let naive_cum = 0;
    let champ_cum = 0;
    return Array.from({ length: 13 }).map((_, w) => {
      naive_cum += ri(140_000, 180_000);
      champ_cum += ri(48_000, 62_000);
      return {
        week_num: w + 1,
        naive_cumulative_cost_inr: naive_cum,
        champion_cumulative_cost_inr: champ_cum,
        savings_cumulative_inr: naive_cum - champ_cum,
      };
    });
  })(),
};

const external_signals = [
  { signal_id: 'sig-01', display_name: 'Weather & Climate Signals',       source_table: 'silver.ext_weather',      layer: 'Silver', description: 'Daily temperature, precipitation, humidity for 25 US metros with climate-zone scores', last_refreshed: '2026-07-01T04:00:00Z' },
  { signal_id: 'sig-02', display_name: 'Placer.ai Foot-Traffic',           source_table: 'silver.ext_placer',       layer: 'Silver', description: 'Weekly mall foot-traffic index by metro',                                     last_refreshed: '2026-06-30T02:00:00Z' },
  { signal_id: 'sig-03', display_name: 'Competitor Density (Nike/Adidas)', source_table: 'silver.ext_competitor',   layer: 'Silver', description: 'Store count + estimated sales share by competitor per metro',                last_refreshed: '2026-06-15T00:00:00Z' },
  { signal_id: 'sig-04', display_name: 'Social Apparel Demand Index',      source_table: 'silver.ext_social',       layer: 'Silver', description: 'TikTok/Instagram trending styles index for each dept',                       last_refreshed: '2026-07-01T06:00:00Z' },
  { signal_id: 'sig-05', display_name: 'US BTS Calendar',                  source_table: 'silver.ext_bts_calendar', layer: 'Silver', description: 'School district BTS start dates by metro',                                   last_refreshed: '2026-06-01T00:00:00Z' },
  { signal_id: 'sig-06', display_name: 'Apparel Spend Index',              source_table: 'silver.ext_spend',        layer: 'Silver', description: 'US Census apparel spend per household by metro',                             last_refreshed: '2026-06-10T00:00:00Z' },
  { signal_id: 'sig-07', display_name: 'Returns Rate Baseline',            source_table: 'silver.ext_returns',      layer: 'Silver', description: 'Category returns rates by metro (industry benchmark)',                       last_refreshed: '2026-06-20T00:00:00Z' },
  { signal_id: 'sig-08', display_name: 'Style Life-Stage Signals',         source_table: 'gold.style_lifecycle',    layer: 'Gold',   description: 'Life-stage transitions for hero SKUs',                                       last_refreshed: '2026-07-01T00:00:00Z' },
  { signal_id: 'sig-09', display_name: 'Analog City Store-Format Match',   source_table: 'gold.analog_store_match', layer: 'Gold',   description: 'Store-type × analog-city pairing scores',                                   last_refreshed: '2026-06-25T00:00:00Z' },
  { signal_id: 'sig-10', display_name: 'MLflow Champion Model',            source_table: 'gold.champion_model',     layer: 'Gold',   description: 'Currently-deployed champion coldstart model',                               last_refreshed: '2026-07-01T04:15:00Z' },
  { signal_id: 'sig-11', display_name: 'Cold-Start Feature Store',         source_table: 'gold.coldstart_features', layer: 'Gold',   description: 'Feature vectors for all cold-start SKUs',                                    last_refreshed: '2026-07-01T05:30:00Z' },
];

// Apparel-additive: analog similarity radar payload (used by Phase E chart)
const analog_similarity_radar = analog_cities.map((c) => ({
  city: c.city,
  climate: c.climate_similarity_pct,
  demographics: c.demo_similarity_pct,
  competitor_density: c.competitor_density_similarity_pct,
  apparel_spend: Math.round(rb(60, 95)),
}));

// Apparel-additive: size-curve borrow per hero SKU
const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const size_curve_borrow = hero_skus.slice(0, 5).map((sku) => ({
  sku_id: sku.sku_id,
  sku_name: sku.name,
  sizes: APPAREL_SIZES,
  dallas_share_pct: APPAREL_SIZES.map((_, i) => Math.round((15 + Math.exp(-Math.pow((i - 3) / 1.4, 2)) * 30) * rb(0.9, 1.1))),
  houston_share_pct: APPAREL_SIZES.map((_, i) => Math.round((15 + Math.exp(-Math.pow((i - 3) / 1.5, 2)) * 30) * rb(0.9, 1.1))),
  atlanta_share_pct: APPAREL_SIZES.map((_, i) => Math.round((15 + Math.exp(-Math.pow((i - 3) / 1.3, 2)) * 30) * rb(0.9, 1.1))),
  blended_share_pct: APPAREL_SIZES.map((_, i) => Math.round((15 + Math.exp(-Math.pow((i - 3) / 1.4, 2)) * 30) * rb(0.95, 1.05))),
}));

// Apparel-additive: brand vs PL penetration ramp (90 days)
const brand_pl_penetration_ramp = Array.from({ length: 90 }).map((_, i) => {
  const day = i + 1;
  const pl_penetration = round2(0.10 + Math.min(0.25, i * 0.0025) + rb(-0.01, 0.01));
  return {
    day,
    brand_share_pct: round2(1 - pl_penetration),
    pl_share_pct: pl_penetration,
    dallas_baseline_pl_pct: round2(0.28 + rb(-0.02, 0.02)),
  };
});

// Grocery-parity keys (re-purposed for apparel: monsoon → BTS weather anomaly)
const analog_waterfall = [
  { step: 'Baseline national',    delta_pct: 0,     cumulative_pct: 42 },
  { step: 'Top-1 analog (Dallas)', delta_pct: -11,   cumulative_pct: 31 },
  { step: '+ Store-type match',    delta_pct: -5,    cumulative_pct: 26 },
  { step: '+ Blend top-3',         delta_pct: -8,    cumulative_pct: 18 },
  { step: '+ BTS overlay',         delta_pct: -2,    cumulative_pct: 16 },
];

const signal_integration = {
  total_signals: external_signals.length,
  active_signals: external_signals.length - 1,
  layers: { Silver: external_signals.filter((s) => s.layer === 'Silver').length, Gold: external_signals.filter((s) => s.layer === 'Gold').length },
  last_full_refresh: '2026-07-01T04:00:00Z',
  next_scheduled_refresh: '2026-07-02T04:00:00Z',
};

// Weather (apparel-adapted from monsoon shape) — schema mirror of grocery
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const weather_monsoon_calendar = MONTHS.map((m, i) => {
  const heatMonths = i >= 5 && i <= 8;
  return {
    month_num: i + 1,
    month_name: m,
    risk_index: heatMonths ? ri(55, 85) : ri(10, 40),
    risk_tier: heatMonths ? 'high' : i === 4 || i === 9 ? 'medium' : 'low',
    typical_rainfall_mm: ri(20, 220),
    is_pull_forward_window: i === 6 || i === 7, // BTS window Aug
  };
});

const weather_monsoon_impact = DEPARTMENTS.map((dept) => {
  const non = 100;
  const delta = ri(-15, 25);
  return {
    category: dept,
    non_monsoon_avg_qty: non,
    monsoon_avg_qty: non + delta,
    delta_pct: delta,
    direction: delta >= 0 ? 'positive' : 'negative',
    statistical_significance: r() < 0.6 ? 'high' : 'medium',
    source_table: 'gold_weather_impact',
  };
});

const weather_monsoon_recommendation = {
  pull_forward_window_start: '2026-07-15',
  pull_forward_window_end: '2026-08-05',
  weeks_before_peak: 3,
  peak_month: 'Aug',
  recommended_safety_stock_pct: 18,
  affected_categories: ['Mens', 'Womens', 'Footwear'],
  estimated_revenue_at_risk_inr: 1_680_000,
  estimated_revenue_at_risk_usd: 1_680_000,
  source_signal: 'sig-01 (weather anomaly)',
};

const weather_signal_inputs = [
  { column_name: 'temp_avg_f',       description: 'Daily mean temperature in °F',        source_table: 'ext_weather', n_observations_millions: 12.8, refresh_cadence: 'Daily',   coverage_pct: 100, freshness_status: 'fresh',    used_in_cold_start: true  },
  { column_name: 'precip_in',        description: 'Daily precipitation in inches',       source_table: 'ext_weather', n_observations_millions: 12.8, refresh_cadence: 'Daily',   coverage_pct: 100, freshness_status: 'fresh',    used_in_cold_start: true  },
  { column_name: 'humidity_pct',     description: 'Daily average relative humidity',     source_table: 'ext_weather', n_observations_millions: 12.6, refresh_cadence: 'Daily',   coverage_pct: 98,  freshness_status: 'fresh',    used_in_cold_start: false },
  { column_name: 'heat_index_f',     description: 'Heat-index feels-like temperature',   source_table: 'ext_weather', n_observations_millions: 12.4, refresh_cadence: 'Daily',   coverage_pct: 96,  freshness_status: 'fresh',    used_in_cold_start: true  },
  { column_name: 'wind_speed_mph',   description: 'Daily average wind speed',            source_table: 'ext_weather', n_observations_millions: 12.8, refresh_cadence: 'Daily',   coverage_pct: 100, freshness_status: 'stale',    used_in_cold_start: false },
];

const weather_store_risk = Array.from({ length: 6 }).map((_, i) => ({
  store_id: `AUS-STR-${String(i + 1).padStart(3, '0')}`,
  store_name: `Austin ${pick(STORE_TYPES)} ${i + 1}`,
  store_type: pick(STORE_TYPES),
  heatwave_risk: pick(['high', 'medium', 'low']),
  heavy_rain_risk: pick(['medium', 'low']),
  cold_spell_risk: 'low',
  air_quality_risk: pick(['medium', 'low']),
  monsoon_flood_risk: 'low',
  resilience_score: ri(45, 82),
}));

const weather_temperature_elasticity = DEPARTMENTS.map((dept) => {
  const elast = round2(rb(-4, 8));
  return {
    category: dept,
    elasticity_pct_per_c: elast,
    threshold_c: ri(24, 32),
    direction: elast >= 0 ? 'positive' : 'negative',
    confidence_high_pct: round2(elast + rb(0.4, 1.2)),
    confidence_low_pct: round2(elast - rb(0.4, 1.2)),
    n_observations: ri(2800, 5200),
    source_table: 'gold_weather_impact',
  };
});

const payload = {
  generated_at: new Date().toISOString(),
  target_city,
  model_variants,
  analog_cities,
  mape_over_time,
  time_buckets,
  bucket_metrics,
  heatmap_cells,
  sku_holdouts,
  festival_uplifts,
  festival_day_pattern,
  kpis,
  hero_skus,
  prediction_decomposition,
  sku_drill_series,
  adaptation_curve,
  festival_category_patterns,
  methodology,
  cost_of_mape,
  external_signals,
  analog_waterfall,
  signal_integration,
  weather_monsoon_calendar,
  weather_monsoon_impact,
  weather_monsoon_recommendation,
  weather_signal_inputs,
  weather_store_risk,
  weather_temperature_elasticity,
  // apparel-additive
  analog_similarity_radar,
  size_curve_borrow,
  brand_pl_penetration_ramp,
};

const ROOT = process.cwd();
const outPath = path.join(ROOT, 'cache', 'apparel', 'coldstart.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
const sz = (fs.statSync(outPath).size / 1024).toFixed(1);
console.log(`✓ ${outPath} · ${sz}KB · hero=${hero_skus.length} analogs=${analog_cities.length} models=${model_variants.length}`);
