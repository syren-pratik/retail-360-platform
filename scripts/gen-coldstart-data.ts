import * as fs from 'fs';
import * as path from 'path';
import type {
  ColdstartTargetCity,
  ColdstartModelVariant,
  ColdstartCitySimilarity,
  ColdstartMAPEPoint,
  ColdstartTimeBucket,
  ColdstartBucketMetric,
  ColdstartHeatmapCell,
  ColdstartSKUHoldout,
  ColdstartFestivalUplift,
  ColdstartFestivalDayPattern,
  ColdstartKPIs,
  ColdstartPayload,
  ColdstartHeroSKU,
  ColdstartPredDecompPoint,
  ColdstartSKUDrillPoint,
  ColdstartAdaptationPoint,
  ColdstartFestivalCategoryPattern,
  ColdstartMethodology,
  ColdstartCostOfMAPE,
  ColdstartExternalSignal,
  ColdstartSignalIntegration,
  WeatherTemperatureElasticity,
  WeatherMonsoonImpact,
  WeatherMonsoonMonth,
  WeatherMonsoonRecommendation,
  WeatherStoreRisk,
  WeatherSignalInput,
  AnalogContribution,
  AnalogCityCard,
  AnalogWaterfallEntry,
} from '../src/app/lib/coldstart-types';

// --- PRNG (mulberry32, seed=42) ---
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(42);
const randN = () => rng();
function randBetween(lo: number, hi: number) { return lo + rng() * (hi - lo); }
function randInt(lo: number, hi: number) { return Math.floor(lo + rng() * (hi - lo + 1)); }

// --- HEADLINE CONSTANTS (never derive these) ---
const CHAMPION_MAPE = 0.277;
const NAIVE_MAPE = 0.442;
const IMPROVEMENT_PCT = +((NAIVE_MAPE - CHAMPION_MAPE) / NAIVE_MAPE * 100).toFixed(1); // 37.3
const TOTAL_SKUS = 42;
const HOLDOUT_DAYS = 90;

// Model MAPEs
const MODEL_MAPES: Record<string, number> = {
  naive_baseline: 0.442,
  original_analog: 0.540,
  fix1_store_type: 0.541,
  fix2_blending: 0.277,
  fix3_festival: 0.544,
  all_3_combined: 0.312,
};

// --- FIX 2: Real Databricks city similarity scores (Notebook 22) ---
// Raw similarities
const SIM_JAIPUR = 0.6481;
const SIM_AHMEDABAD = 0.5145;
const SIM_KOLKATA = 0.5067;
const SIM_TOTAL = SIM_JAIPUR + SIM_AHMEDABAD + SIM_KOLKATA;

// Weights normalized to sum 1.000
const W_JAIPUR = +(SIM_JAIPUR / SIM_TOTAL).toFixed(3);
const W_AHMEDABAD = +(SIM_AHMEDABAD / SIM_TOTAL).toFixed(3);
// Force exact sum=1
const W_KOLKATA = +(1 - W_JAIPUR - W_AHMEDABAD).toFixed(3);

// --- TARGET CITY ---
const targetCity: ColdstartTargetCity = {
  name: 'Lucknow',
  state: 'Uttar Pradesh',
  population_m: 3.7,
  gdp_per_capita_usd: 1850,
  avg_basket_usd: 14.2,
  climate_zone: 'Semi-arid',
  tier: 'Tier-2',
};

// --- ALL 9 ANALOG CITIES (top 3 with real scores; remaining with real similarity ranks) ---
const analogCities: ColdstartCitySimilarity[] = [
  { city: 'Jaipur',    state: 'Rajasthan',      rank: 1, similarity_score: SIM_JAIPUR,    weight: W_JAIPUR,    population_m: 4.0,  gdp_per_capita_usd: 1780, avg_basket_usd: 14.8, climate_zone: 'Semi-arid',          tier: 'Tier-2' },
  { city: 'Ahmedabad', state: 'Gujarat',         rank: 2, similarity_score: SIM_AHMEDABAD, weight: W_AHMEDABAD, population_m: 8.5,  gdp_per_capita_usd: 2380, avg_basket_usd: 16.4, climate_zone: 'Semi-arid',          tier: 'Tier-1' },
  { city: 'Kolkata',   state: 'West Bengal',     rank: 3, similarity_score: SIM_KOLKATA,   weight: W_KOLKATA,   population_m: 15.0, gdp_per_capita_usd: 2060, avg_basket_usd: 16.5, climate_zone: 'Humid subtropical',  tier: 'Metro'  },
  { city: 'Chennai',   state: 'Tamil Nadu',      rank: 4, similarity_score: 0.4793,        weight: 0,           population_m: 11.2, gdp_per_capita_usd: 2780, avg_basket_usd: 16.8, climate_zone: 'Tropical',           tier: 'Metro'  },
  { city: 'Bangalore', state: 'Karnataka',       rank: 5, similarity_score: 0.4714,        weight: 0,           population_m: 14.0, gdp_per_capita_usd: 3400, avg_basket_usd: 18.5, climate_zone: 'Tropical',           tier: 'Metro'  },
  { city: 'Mumbai',    state: 'Maharashtra',     rank: 6, similarity_score: 0.4625,        weight: 0,           population_m: 20.6, gdp_per_capita_usd: 4100, avg_basket_usd: 18.9, climate_zone: 'Tropical coastal',   tier: 'Metro'  },
  { city: 'Hyderabad', state: 'Telangana',       rank: 7, similarity_score: 0.4610,        weight: 0,           population_m: 10.5, gdp_per_capita_usd: 3100, avg_basket_usd: 17.2, climate_zone: 'Semi-arid',          tier: 'Metro'  },
  { city: 'Pune',      state: 'Maharashtra',     rank: 8, similarity_score: 0.4575,        weight: 0,           population_m: 7.4,  gdp_per_capita_usd: 2900, avg_basket_usd: 16.8, climate_zone: 'Semi-arid',          tier: 'Tier-1' },
  { city: 'Delhi NCR', state: 'Delhi',           rank: 9, similarity_score: 0.3908,        weight: 0,           population_m: 32.0, gdp_per_capita_usd: 3800, avg_basket_usd: 17.5, climate_zone: 'Semi-arid',          tier: 'Metro'  },
];

// --- MODEL VARIANTS (6 models) ---
const modelVariants: ColdstartModelVariant[] = [
  { id: 'naive_baseline',  label: 'Naive Baseline',         description: 'National average demand scaled to Lucknow population',                             mape: 0.442, mae: 6.3, bias: 0.142, converged_day: null, color: '#94a3b8' },
  { id: 'original_analog', label: 'Original Analog',        description: 'Direct transfer from analog cities — uncalibrated, no store format weighting',      mape: 0.540, mae: 7.8, bias: 0.192, converged_day: null, color: '#ef4444' },
  { id: 'fix1_store_type', label: 'Fix 1: Store Type',      description: 'Analog transfer weighted by store format (Express / Dark Store / Hypermarket)',    mape: 0.541, mae: 7.7, bias: 0.187, converged_day: null, color: '#f97316' },
  { id: 'fix2_blending',   label: 'Fix 2: Blending',        description: 'Bayesian blend: analog prior decays as live Lucknow data grows (day_alpha = d/90)', mape: 0.277, mae: 3.8, bias: 0.021, converged_day: null, color: '#3b82f6' },
  { id: 'fix3_festival',   label: 'Fix 3: Festival',        description: 'Festival calendar uplift from analog city patterns — applied on top of analog',     mape: 0.544, mae: 7.9, bias: 0.201, converged_day: null, color: '#f59e0b' },
  { id: 'all_3_combined',  label: 'All 3 Combined',         description: 'Store type + Bayesian blending + festival — combined but Fix 2 alone wins',        mape: 0.312, mae: 4.4, bias: 0.038, converged_day: null, color: '#8b5cf6' },
];

// --- FIX 3: MAPE curves with correct means ---
function scaleCurveToMean(curve: number[], targetMean: number): number[] {
  const rawMean = curve.reduce((a, b) => a + b, 0) / curve.length;
  if (rawMean < 1e-9) return curve;
  return curve.map((v) => Math.max(0.05, (v / rawMean) * targetMean));
}

function computeMean(curve: number[]): number {
  return curve.reduce((a, b) => a + b, 0) / curve.length;
}

// Festival active windows: days 35-42 (Onam), days 75-82 (Diwali)
function isFestival(day: number): { active: boolean; name: string | null } {
  if (day >= 35 && day <= 42) return { active: true, name: 'Onam' };
  if (day >= 75 && day <= 82) return { active: true, name: 'Diwali' };
  return { active: false, name: null };
}

const DAYS = HOLDOUT_DAYS;

// --- naive_baseline: linear drift 40.5% → 47.9% (mean = 44.2% by construction) ---
// Mean of linear ramp: (40.5 + 47.9) / 2 = 44.2 exactly
const naiveRaw: number[] = [];
for (let d = 1; d <= DAYS; d++) {
  const base = 0.405 + 0.074 * ((d - 1) / 89); // 40.5% to 47.9%
  const noise = (randN() - 0.5) * 0.03;         // ±1.5pp noise
  naiveRaw.push(Math.max(0.05, base + noise));
}
const naiveCurve = scaleCurveToMean(naiveRaw, MODEL_MAPES.naive_baseline);

// --- original_analog: Gaussian bell peaking day 40, base=50%, amp=16%, sigma=9 ---
// Integral ≈ base*90 + amp*sigma*sqrt(2π) = 45 + 16*9*2.507 = 45 + 361 → mean = 4861/90 = 54.01%
const analogRaw: number[] = [];
for (let d = 1; d <= DAYS; d++) {
  const base = 0.50;
  const amp = 0.16;
  const sigma = 9;
  const peakDay = 40;
  const gauss = amp * Math.exp(-Math.pow(d - peakDay, 2) / (2 * sigma * sigma));
  const noise = (randN() - 0.5) * 0.015;
  analogRaw.push(Math.max(0.05, base + gauss + noise));
}
const analogCurve = scaleCurveToMean(analogRaw, MODEL_MAPES.original_analog);

// --- fix1_store_type: nearly identical to original_analog (marginal improvement) ---
const fix1Raw: number[] = [];
for (let d = 1; d <= DAYS; d++) {
  const base = 0.50;
  const amp = 0.161;   // tiny difference from analog
  const sigma = 9;
  const peakDay = 40;
  const gauss = amp * Math.exp(-Math.pow(d - peakDay, 2) / (2 * sigma * sigma));
  const noise = (randN() - 0.5) * 0.015;
  fix1Raw.push(Math.max(0.05, base + gauss + noise));
}
const fix1Curve = scaleCurveToMean(fix1Raw, MODEL_MAPES.fix1_store_type);

// --- fix2_blending: two-segment linear, mean=27.7% by construction ---
// Segment 1: day 1 (33.6%) → day 55 (26.0%) — slope = -7.6/54
// Segment 2: day 55 (26.0%) → day 90 (21.0%) — slope = -5/35
// Mean seg1 = (33.6+26.0)/2 * 55/90 = 29.8 * 0.611 = 18.21%
// Mean seg2 = (26.0+21.0)/2 * 35/90 = 23.5 * 0.389 = 9.14%
// Total mean = 27.35% → scale to 27.7% (ratio 1.013)
const fix2Raw: number[] = [];
for (let d = 1; d <= DAYS; d++) {
  let base: number;
  if (d <= 55) {
    base = 0.336 - 0.076 * ((d - 1) / 54);   // 33.6% → 26.0%
  } else {
    base = 0.260 - 0.050 * ((d - 55) / 35);   // 26.0% → 21.0%
  }
  const noise = (randN() - 0.5) * 0.01;
  fix2Raw.push(Math.max(0.05, base + noise));
}
const fix2Curve = scaleCurveToMean(fix2Raw, MODEL_MAPES.fix2_blending);

// --- fix3_festival: analog shape + festival bumps at days 35-42 and 75-82 ---
const fix3Raw: number[] = [];
for (let d = 1; d <= DAYS; d++) {
  const base = 0.50;
  const amp = 0.162;   // slightly more than analog
  const sigma = 9;
  const peakDay = 40;
  const gauss = amp * Math.exp(-Math.pow(d - peakDay, 2) / (2 * sigma * sigma));
  // Festival bumps add noise/variance (festivals hurt accuracy)
  const festBump = (d >= 35 && d <= 42) || (d >= 75 && d <= 82) ? 0.010 : 0;
  const noise = (randN() - 0.5) * 0.015;
  fix3Raw.push(Math.max(0.05, base + gauss + festBump + noise));
}
const fix3Curve = scaleCurveToMean(fix3Raw, MODEL_MAPES.fix3_festival);

// --- all_3_combined: two-segment linear, mean=31.2% by construction ---
// Segment 1: day 1 (36%) → day 60 (30%) — slope = -6/59
// Segment 2: day 60 (30%) → day 90 (25%) — slope = -5/30
// Mean seg1 = (36+30)/2 * 60/90 = 33 * 0.667 = 22.0%
// Mean seg2 = (30+25)/2 * 30/90 = 27.5 * 0.333 = 9.16%
// Total mean = 31.16% → scale to 31.2% (≈1.001)
const allRaw: number[] = [];
for (let d = 1; d <= DAYS; d++) {
  let base: number;
  if (d <= 60) {
    base = 0.360 - 0.060 * ((d - 1) / 59);   // 36% → 30%
  } else {
    base = 0.300 - 0.050 * ((d - 60) / 30);   // 30% → 25%
  }
  const noise = (randN() - 0.5) * 0.012;
  allRaw.push(Math.max(0.05, base + noise));
}
const allCurve = scaleCurveToMean(allRaw, MODEL_MAPES.all_3_combined);

// --- Verify means (printed at end) ---
const means = {
  naive_baseline:  computeMean(naiveCurve),
  original_analog: computeMean(analogCurve),
  fix1_store_type: computeMean(fix1Curve),
  fix2_blending:   computeMean(fix2Curve),
  fix3_festival:   computeMean(fix3Curve),
  all_3_combined:  computeMean(allCurve),
};

// --- Compute convergence_day: first day where 7-day trailing avg of fix2 is within ±5pp of day-90 value ---
const v90 = fix2Curve[89];
const tol = 0.05;
let convergenceDay = 90;
for (let d = 7; d <= 90; d++) {
  const window = fix2Curve.slice(d - 7, d);
  const avg = window.reduce((a, b) => a + b, 0) / 7;
  if (avg >= v90 - tol && avg <= v90 + tol) {
    convergenceDay = d;
    break;
  }
}

// --- Assemble MAPE over time ---
const mapeOverTime: ColdstartMAPEPoint[] = [];
for (let d = 1; d <= DAYS; d++) {
  const { active, name } = isFestival(d);
  mapeOverTime.push({
    day: d,
    naive_baseline:  +naiveCurve[d - 1].toFixed(4),
    original_analog: +analogCurve[d - 1].toFixed(4),
    fix1_store_type: +fix1Curve[d - 1].toFixed(4),
    fix2_blending:   +fix2Curve[d - 1].toFixed(4),
    fix3_festival:   +fix3Curve[d - 1].toFixed(4),
    all_3_combined:  +allCurve[d - 1].toFixed(4),
    threshold_good: 0.30,
    threshold_acceptable: 0.40,
    is_festival_active: active,
    active_festival_name: name,
  });
}

// Update converged_day on fix2_blending variant
modelVariants[3].converged_day = convergenceDay;

// --- TIME BUCKETS (kept for bucket_metrics) ---
const timeBuckets: ColdstartTimeBucket[] = [
  { label: 'Week 1',    day_start: 1,  day_end: 7  },
  { label: 'Week 2',    day_start: 8,  day_end: 14 },
  { label: 'Weeks 3-4', day_start: 15, day_end: 30 },
  { label: 'Month 2',   day_start: 31, day_end: 60 },
  { label: 'Month 3',   day_start: 61, day_end: 90 },
];

function bucketMean(curve: number[], start: number, end: number): number {
  const slice = curve.slice(start - 1, end);
  return +(slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(4);
}

const bucketMetrics: ColdstartBucketMetric[] = timeBuckets.map((b) => ({
  bucket:          b.label,
  naive_baseline:  bucketMean(naiveCurve,  b.day_start, b.day_end),
  original_analog: bucketMean(analogCurve, b.day_start, b.day_end),
  fix1_store_type: bucketMean(fix1Curve,   b.day_start, b.day_end),
  fix2_blending:   bucketMean(fix2Curve,   b.day_start, b.day_end),
  fix3_festival:   bucketMean(fix3Curve,   b.day_start, b.day_end),
  all_3_combined:  bucketMean(allCurve,    b.day_start, b.day_end),
}));

// --- FIX 4: HEATMAP — 10 categories × 4 store types × 6 models = 240 cells ---
const HEATMAP_CATEGORIES = [
  'Coffee', 'Dal & Pulses', 'Chips & Namkeen', 'Paneer', 'Edible Oil',
  'Curd & Yogurt', 'Butter & Ghee', 'Energy Drinks', 'Tea', 'Rice',
];

const STORE_TYPES = ['Express', 'Dark Store', 'Hypermarket', 'Supermarket'];

const HEATMAP_MODELS = [
  'naive_baseline', 'original_analog', 'fix1_store_type',
  'fix2_blending', 'fix3_festival', 'all_3_combined',
];

// Category difficulty multipliers (relative to champion model MAPE)
const CAT_MULT: Record<string, number> = {
  'Energy Drinks':  1.50,
  'Chips & Namkeen': 1.30,
  'Paneer':          1.30,
  'Coffee':          0.95,
  'Dal & Pulses':    1.00,
  'Curd & Yogurt':   0.90,
  'Butter & Ghee':   0.85,
  'Edible Oil':      0.70,
  'Rice':            0.95,
  'Tea':             0.95,
};

// Store-type multipliers (relative to champion model MAPE)
const STORE_MULT: Record<string, number> = {
  'Express':      0.85,
  'Dark Store':   1.05,
  'Hypermarket':  1.40,
  'Supermarket':  1.35,
};

function getSeverity(mape: number): 'good' | 'acceptable' | 'concerning' | 'critical' {
  if (mape < 0.25) return 'good';
  if (mape < 0.40) return 'acceptable';
  if (mape < 0.60) return 'concerning';
  return 'critical';
}

const heatmapCells: ColdstartHeatmapCell[] = [];
for (const cat of HEATMAP_CATEGORIES) {
  for (const storeType of STORE_TYPES) {
    for (const model of HEATMAP_MODELS) {
      const baseMAPE = MODEL_MAPES[model];
      const catMult = CAT_MULT[cat] ?? 1.0;
      const storeMult = STORE_MULT[storeType] ?? 1.0;
      // Deterministic noise in range 0.85–1.15
      const noiseFactor = 0.85 + randN() * 0.30;
      const mape = Math.min(0.99, baseMAPE * catMult * storeMult * noiseFactor);
      const n_skus = randInt(3, 6);
      heatmapCells.push({
        sku_category: cat,
        store_type: storeType,
        model,
        mape: +mape.toFixed(4),
        n_skus,
        severity: getSeverity(mape),
      });
    }
  }
}

// --- SKU HOLDOUTS (42 SKUs, new category names) ---
const holdoutCategories = HEATMAP_CATEGORIES;
const skuHoldouts: ColdstartSKUHoldout[] = [];
for (let i = 0; i < TOTAL_SKUS; i++) {
  const category = holdoutCategories[i % holdoutCategories.length];
  const actual = +(randBetween(20, 180)).toFixed(1);
  const errorPct = +(randBetween(0.05, 0.55)).toFixed(4);
  const predicted = +(actual * (1 + (randN() > 0.5 ? errorPct : -errorPct))).toFixed(1);
  skuHoldouts.push({
    sku_id: `LKO-SKU-${String(i + 1).padStart(4, '0')}`,
    category,
    predicted,
    actual,
    error_pct: errorPct,
    model: 'fix2_blending',
  });
}

// --- FESTIVAL UPLIFTS ---
const festivalUplifts: ColdstartFestivalUplift[] = [
  { festival: 'Onam',        date: '2024-01-35', analog_uplift_pct: 18.4, actual_uplift_pct: 15.9 },
  { festival: 'Diwali',      date: '2024-03-15', analog_uplift_pct: 52.6, actual_uplift_pct: 48.9 },
  { festival: 'Holi',        date: '2024-03-25', analog_uplift_pct: 34.7, actual_uplift_pct: 31.2 },
  { festival: 'Eid ul-Fitr', date: '2024-04-10', analog_uplift_pct: 28.9, actual_uplift_pct: 26.5 },
];

// --- FESTIVAL DAY PATTERN (±7 days) ---
const festivalDayPattern: ColdstartFestivalDayPattern[] = [];
for (let offset = -7; offset <= 7; offset++) {
  let uplift = 0;
  if (offset < -3) uplift = randBetween(2, 8);
  else if (offset < 0) uplift = randBetween(10, 25);
  else if (offset === 0) uplift = randBetween(40, 55);
  else if (offset <= 2) uplift = randBetween(15, 30);
  else uplift = randBetween(3, 12);
  festivalDayPattern.push({
    day_offset: offset,
    label: offset === 0 ? 'Festival Day' : offset < 0 ? `D${offset}` : `D+${offset}`,
    avg_uplift_pct: +uplift.toFixed(1),
  });
}

// ============================================================
// SPRINT 5: NEW DATA
// ============================================================

// --- HERO SKUs (10, one per category, all 4 store types covered) ---
const HERO_SKUS_DEF = [
  { sku_id: 'LKO-SKU-0001', name: 'Bru Instant Coffee 200g',        category: 'Coffee',          store_type: 'Express'     },
  { sku_id: 'LKO-SKU-0002', name: 'Toor Dal Premium 1kg',           category: 'Dal & Pulses',    store_type: 'Hypermarket' },
  { sku_id: 'LKO-SKU-0003', name: 'Haldirams Aloo Bhujia 400g',     category: 'Chips & Namkeen', store_type: 'Dark Store'  },
  { sku_id: 'LKO-SKU-0004', name: 'Amul Fresh Paneer 200g',         category: 'Paneer',          store_type: 'Supermarket' },
  { sku_id: 'LKO-SKU-0005', name: 'Saffola Gold Oil 1L',            category: 'Edible Oil',      store_type: 'Express'     },
  { sku_id: 'LKO-SKU-0006', name: 'Mother Dairy Curd 500g',         category: 'Curd & Yogurt',   store_type: 'Dark Store'  },
  { sku_id: 'LKO-SKU-0007', name: 'Amul Butter 500g',               category: 'Butter & Ghee',   store_type: 'Hypermarket' },
  { sku_id: 'LKO-SKU-0008', name: 'Red Bull Energy Drink 250ml',    category: 'Energy Drinks',   store_type: 'Express'     },
  { sku_id: 'LKO-SKU-0009', name: 'Tata Tea Gold 250g',             category: 'Tea',             store_type: 'Supermarket' },
  { sku_id: 'LKO-SKU-0010', name: 'India Gate Classic Basmati 1kg', category: 'Rice',            store_type: 'Hypermarket' },
];

const heroSKUs: ColdstartHeroSKU[] = HERO_SKUS_DEF.map((def) => {
  const base_units = randBetween(20, 120);
  const catMult = CAT_MULT[def.category] ?? 1.0;
  const storeMult = STORE_MULT[def.store_type] ?? 1.0;
  const analog_mape = +(MODEL_MAPES.original_analog * catMult * storeMult * (0.85 + randN() * 0.30)).toFixed(4);
  const champion_mape = +(MODEL_MAPES.fix2_blending * catMult * storeMult * (0.85 + randN() * 0.30)).toFixed(4);
  return { ...def, avg_daily_units: +base_units.toFixed(1), analog_mape, champion_mape };
});

// --- PREDICTION DECOMPOSITION (10 SKUs × 5 day snapshots = 50) ---
const SNAP_DAYS = [1, 15, 30, 60, 90];
const predDecomposition: ColdstartPredDecompPoint[] = [];
for (const sku of heroSKUs) {
  for (const day of SNAP_DAYS) {
    const alpha = day / 90;
    const base = sku.avg_daily_units;
    const jaipur = +(base * W_JAIPUR * (1 - alpha) * (0.85 + randN() * 0.30)).toFixed(2);
    const ahmedabad = +(base * W_AHMEDABAD * (1 - alpha) * (0.85 + randN() * 0.30)).toFixed(2);
    const kolkata = +(base * W_KOLKATA * (1 - alpha) * (0.85 + randN() * 0.30)).toFixed(2);
    const festival_uplift = +(base * 0.06 * randN()).toFixed(2);
    const local_blend = +(base * alpha * (0.85 + randN() * 0.30)).toFixed(2);
    const total_prediction = +(jaipur + ahmedabad + kolkata + festival_uplift + local_blend).toFixed(2);
    const actual = +(base * (0.85 + randN() * 0.30)).toFixed(2);
    predDecomposition.push({
      sku_id: sku.sku_id, day_num: day,
      jaipur_contribution: jaipur, ahmedabad_contribution: ahmedabad, kolkata_contribution: kolkata,
      festival_uplift, local_blend, total_prediction, actual,
    });
  }
}

// --- SKU DRILL SERIES (10 SKUs × 90 days = 900 points) ---
// confidence_width(day) = 0.06 + 0.44 × exp(-day / 25)
const skuDrillSeries: ColdstartSKUDrillPoint[] = [];
for (const sku of heroSKUs) {
  const base = sku.avg_daily_units;
  for (let day = 1; day <= 90; day++) {
    const ci_frac = 0.06 + 0.44 * Math.exp(-day / 25);
    const predicted = +(base * (1 + (randN() - 0.5) * 0.12)).toFixed(2);
    const actual = +(base * (1 + (randN() - 0.5) * 0.12)).toFixed(2);
    const ci_half = +(base * ci_frac).toFixed(2);
    const lower_95 = +(predicted - ci_half).toFixed(2);
    const upper_95 = +(predicted + ci_half).toFixed(2);
    skuDrillSeries.push({ sku_id: sku.sku_id, day, predicted, actual, lower_95, upper_95, ci_range: +(upper_95 - lower_95).toFixed(2) });
  }
}

// --- ADAPTATION CURVE (90 days): pure_analog ≈ flat 7, pure_local 0→8 linearly ---
const adaptationCurve: ColdstartAdaptationPoint[] = [];
for (let day = 1; day <= 90; day++) {
  const alpha = +(day / 90).toFixed(4);
  const pure_analog = +(7.0 * (0.90 + randN() * 0.20)).toFixed(3);
  const pure_local = +(8.0 * (day / 90) * (0.90 + randN() * 0.20)).toFixed(3);
  const blended = +(alpha * pure_local + (1 - alpha) * pure_analog).toFixed(3);
  adaptationCurve.push({ day, alpha, pure_analog, pure_local, blended });
}

// --- FESTIVAL CATEGORY PATTERNS (5 pairs × 8 days = 40) ---
// Diwali × Frozen Foods pattern is hardcoded per spec: peak 3.13× at day 0
const DIWALI_FROZEN_MULTS = [1.05, 1.10, 1.20, 1.45, 1.85, 2.40, 3.13, 2.75];
const FEST_CAT_PAIRS = [
  { festival_name: 'Diwali', category: 'Frozen Foods',    peak_mult: 3.13 },
  { festival_name: 'Diwali', category: 'Chips & Namkeen', peak_mult: 2.45 },
  { festival_name: 'Onam',   category: 'Curd & Yogurt',   peak_mult: 1.92 },
  { festival_name: 'Diwali', category: 'Energy Drinks',   peak_mult: 2.80 },
  { festival_name: 'Holi',   category: 'Rice',            peak_mult: 1.65 },
];
const festivalCategoryPatterns: ColdstartFestivalCategoryPattern[] = [];
for (const pair of FEST_CAT_PAIRS) {
  for (let i = 0; i < 8; i++) {
    const day_offset = i - 7;  // -7 → 0
    let uplift_multiplier: number;
    if (pair.festival_name === 'Diwali' && pair.category === 'Frozen Foods') {
      uplift_multiplier = DIWALI_FROZEN_MULTS[i];
    } else {
      const ramp = (i + 1) / 8;
      uplift_multiplier = +Math.max(1.0, 1.0 + (pair.peak_mult - 1.0) * ramp * (0.85 + randN() * 0.30)).toFixed(3);
    }
    festivalCategoryPatterns.push({ festival_name: pair.festival_name, category: pair.category, day_offset, uplift_multiplier });
  }
}

// --- METHODOLOGY ---
const methodology: ColdstartMethodology = {
  training_data_rows: 6195143,
  holdout_data_rows: 809417,
  n_iterations: 5,
  mlflow_experiment: '/Shared/pr_coldstart_forecast',
  algorithm: 'Bayesian analog blending with store-format calibration and festival uplift',
  features: [
    'city_gdp_per_capita', 'city_population', 'avg_basket_size', 'climate_zone',
    'store_format', 'day_of_week', 'festival_proximity', 'analog_similarity_weight',
  ],
  convergence_criterion: '7-day rolling MAPE within ±5pp of day-90 value',
};

// ============================================================
// SPRINT 6: NEW DATA
// ============================================================

// --- COST OF MAPE (hardcoded financials) ---
// Weekly breakdown: weeks 1-4 steep, 5-8 moderate, 9-13 flat
// Naive increments: [600K,450K,350K,300K, 175K×4, 140K×5]
// Champion increments: [230K,165K,120K,100K, 80K×4, 55K×5]
const WEEKLY_NAIVE_INCREMENTS   = [600000,450000,350000,300000, 175000,175000,175000,175000, 140000,140000,140000,140000,140000];
const WEEKLY_CHAMP_INCREMENTS   = [230000,165000,120000,100000,  80000, 80000, 80000, 80000,  55000, 55000, 55000, 55000, 55000];
const weeklyBreakdown = WEEKLY_NAIVE_INCREMENTS.map((_, i) => {
  const naiveCum    = WEEKLY_NAIVE_INCREMENTS.slice(0, i + 1).reduce((a, b) => a + b, 0);
  const champCum    = WEEKLY_CHAMP_INCREMENTS.slice(0, i + 1).reduce((a, b) => a + b, 0);
  return {
    week_num: i + 1,
    naive_cumulative_cost_inr:    naiveCum,
    champion_cumulative_cost_inr: champCum,
    savings_cumulative_inr:       naiveCum - champCum,
  };
});

const EXCHANGE_RATE = 83.5;
const costOfMAPE: ColdstartCostOfMAPE = {
  naive_costs: {
    mape_pct: NAIVE_MAPE * 100,
    total_cost_inr: 3100000,
    cost_per_sku_inr: +(3100000 / TOTAL_SKUS).toFixed(0),
    description: 'National average baseline — unacceptably high error leads to overstock and stockout losses',
  },
  champion_costs: {
    mape_pct: CHAMPION_MAPE * 100,
    total_cost_inr: 1210000,
    cost_per_sku_inr: +(1210000 / TOTAL_SKUS).toFixed(0),
    description: 'Bayesian blended champion — analog prior with live Lucknow adaptation',
  },
  savings: {
    total_savings_inr: 1890000,
    savings_pct: 61.0,
    description: 'Cost avoided through champion model over 90-day holdout window',
  },
  pr_projection: {
    projected_savings_usd: 850000,
    projected_savings_inr: Math.round(850000 * EXCHANGE_RATE),
    projected_savings_usd_per_billion_revenue: 27800000,
    exchange_rate_inr_per_usd: EXCHANGE_RATE,
  },
  weekly_breakdown: weeklyBreakdown,
};

// --- EXTERNAL SIGNALS (11 signals across Silver / Gold / ML layers) ---
const externalSignals: ColdstartExternalSignal[] = [
  {
    signal_id: 'sig-01',
    display_name: 'Weather & Climate Signals',
    source_table: 'silver.ext_weather',
    layer: 'Silver',
    description: 'Daily temperature, rainfall, humidity and climate zone scores for 28 tier-1/2 cities',
    refresh_cadence: 'Daily',
    coverage_start: '2020-01-01',
    coverage_end: '2024-03-31',
    n_rows: 8500000,
    n_columns: 17,
    freshness_status: 'fresh',
    key_features: ['temperature_max', 'rainfall_mm', 'humidity_pct', 'climate_zone_score'],
    used_in_model: true,
    icon_name: 'Cloud',
  },
  {
    signal_id: 'sig-02',
    display_name: 'Macro-Economic Indicators',
    source_table: 'silver.ext_macro_economic',
    layer: 'Silver',
    description: 'City-level CPI, fuel price index, disposable income proxy from RBI and census data',
    refresh_cadence: 'Monthly',
    coverage_start: '2018-01-01',
    coverage_end: '2024-03-31',
    n_rows: 1200000,
    n_columns: 12,
    freshness_status: 'fresh',
    key_features: ['cpi_index', 'fuel_price_idx', 'income_proxy', 'gdp_growth_pct'],
    used_in_model: true,
    icon_name: 'TrendingUp',
  },
  {
    signal_id: 'sig-03',
    display_name: 'Traffic & Mobility Signals',
    source_table: 'silver.ext_traffic_mobility',
    layer: 'Silver',
    description: 'Store-level footfall scores derived from Google Mobility and OpenStreetMap catchment analysis',
    refresh_cadence: 'Weekly',
    coverage_start: '2021-06-01',
    coverage_end: '2024-03-31',
    n_rows: 3800000,
    n_columns: 11,
    freshness_status: 'fresh',
    key_features: ['footfall_index', 'catchment_pop', 'transit_score', 'weekend_lift'],
    used_in_model: true,
    icon_name: 'Activity',
  },
  {
    signal_id: 'sig-04',
    display_name: 'Events & Festival Calendar',
    source_table: 'silver.ext_events_festivals',
    layer: 'Silver',
    description: 'National and state-level festival dates, public holiday flags and category-specific uplift multipliers',
    refresh_cadence: 'Quarterly',
    coverage_start: '2019-01-01',
    coverage_end: '2025-12-31',
    n_rows: 890000,
    n_columns: 15,
    freshness_status: 'fresh',
    key_features: ['festival_name', 'proximity_days', 'state_scope', 'category_uplift_mult'],
    used_in_model: true,
    icon_name: 'Calendar',
  },
  {
    signal_id: 'sig-05',
    display_name: 'Competitor Intelligence',
    source_table: 'silver.ext_competitor',
    layer: 'Silver',
    description: 'Scraped price and promo data from 6 rival retail chains across 42 target micro-markets',
    refresh_cadence: 'Weekly',
    coverage_start: '2022-01-01',
    coverage_end: '2024-03-31',
    n_rows: 2400000,
    n_columns: 20,
    freshness_status: 'stale',
    key_features: ['competitor_price', 'promo_flag', 'market_share_idx', 'price_gap_pct'],
    used_in_model: false,
    icon_name: 'Tag',
  },
  {
    signal_id: 'sig-06',
    display_name: 'Geography Dimension',
    source_table: 'silver.dim_geography',
    layer: 'Silver',
    description: 'City/district master with tier, climate zone, analog similarity pre-computed for all 9 candidate cities',
    refresh_cadence: 'On-demand',
    coverage_start: '2020-01-01',
    coverage_end: '2024-03-31',
    n_rows: 24600,
    n_columns: 25,
    freshness_status: 'fresh',
    key_features: ['city_tier', 'similarity_score', 'analog_weight', 'population_m'],
    used_in_model: true,
    icon_name: 'MapPin',
  },
  {
    signal_id: 'sig-07',
    display_name: 'Weather Impact Scores',
    source_table: 'gold.gold_weather_impact',
    layer: 'Gold',
    description: 'Category-level demand sensitivity to weather patterns — pre-aggregated from silver.ext_weather',
    refresh_cadence: 'Daily',
    coverage_start: '2020-01-01',
    coverage_end: '2024-03-31',
    n_rows: 980000,
    n_columns: 8,
    freshness_status: 'fresh',
    key_features: ['category', 'weather_sensitivity_score', 'rain_uplift_pct', 'heat_dampening_pct'],
    used_in_model: true,
    icon_name: 'Layers',
  },
  {
    signal_id: 'sig-08',
    display_name: 'Festival Demand Index',
    source_table: 'gold.gold_festival_demand',
    layer: 'Gold',
    description: 'City × category × festival demand uplift index derived from 5 years of analog city sales',
    refresh_cadence: 'Quarterly',
    coverage_start: '2019-01-01',
    coverage_end: '2024-03-31',
    n_rows: 490000,
    n_columns: 12,
    freshness_status: 'fresh',
    key_features: ['festival_demand_mult', 'category_sensitivity', 'city_adjustment', 'lead_days'],
    used_in_model: true,
    icon_name: 'DollarSign',
  },
  {
    signal_id: 'sig-09',
    display_name: 'Macro Sensitivity Scores',
    source_table: 'gold.gold_macro_sensitivity',
    layer: 'Gold',
    description: 'Category elasticity w.r.t. CPI, fuel prices and income proxies — monthly rolling window',
    refresh_cadence: 'Monthly',
    coverage_start: '2018-01-01',
    coverage_end: '2024-03-31',
    n_rows: 410000,
    n_columns: 9,
    freshness_status: 'fresh',
    key_features: ['price_elasticity', 'income_elasticity', 'fuel_sensitivity', 'cpi_beta'],
    used_in_model: true,
    icon_name: 'Database',
  },
  {
    signal_id: 'sig-10',
    display_name: 'Store Profile Demand Index',
    source_table: 'gold.gold_store_profile_demand_index',
    layer: 'Gold',
    description: 'Store format × category demand baseline index calibrated to analog city sales history',
    refresh_cadence: 'Weekly',
    coverage_start: '2021-01-01',
    coverage_end: '2024-03-31',
    n_rows: 210000,
    n_columns: 15,
    freshness_status: 'fresh',
    key_features: ['store_format', 'category_demand_idx', 'basket_size_adj', 'format_weight'],
    used_in_model: true,
    icon_name: 'Building2',
  },
  {
    signal_id: 'sig-11',
    display_name: 'Demand Feature Store',
    source_table: 'retail_ml.demand_features',
    layer: 'ML',
    description: '79 engineered features across weather, festival, macro and mobility signals for all 42 SKUs × 90 holdout days',
    refresh_cadence: 'Daily',
    coverage_start: '2020-01-01',
    coverage_end: '2024-03-31',
    n_rows: 140000000,
    n_columns: 79,
    freshness_status: 'fresh',
    key_features: ['blended_demand_est', 'festival_proximity_score', 'weather_adjusted_baseline', 'store_format_weight'],
    used_in_model: true,
    icon_name: 'Sparkles',
  },
];

// Compute signal integration dynamically from the signal definitions
const totalSignalColumns = externalSignals.reduce((sum, s) => sum + s.n_columns, 0);
const totalSignalRowsM   = +(externalSignals.reduce((sum, s) => sum + s.n_rows, 0) / 1e6).toFixed(1);
const usedInModelCount   = externalSignals.filter((s) => s.used_in_model).length;
const cadenceCounts = externalSignals.reduce<Record<string, number>>((acc, s) => {
  acc[s.refresh_cadence] = (acc[s.refresh_cadence] ?? 0) + 1;
  return acc;
}, {});

const signalIntegration: ColdstartSignalIntegration = {
  total_signals:              externalSignals.length,
  total_columns:              totalSignalColumns,
  total_rows_millions:        totalSignalRowsM,
  used_in_cold_start_model:   usedInModelCount,
  refresh_cadences:           cadenceCounts,
};

// ============================================================
// SPRINT 7a: WEATHER SENSITIVITY DATA
// ============================================================

// Helper: resilience score from risk levels
function riskWeight(r: 'low' | 'medium' | 'high' | 'critical'): number {
  return r === 'critical' ? 35 : r === 'high' ? 20 : r === 'medium' ? 10 : 0;
}
function resilienceScore(
  a: 'low'|'medium'|'high'|'critical',
  b: 'low'|'medium'|'high'|'critical',
  c: 'low'|'medium'|'high'|'critical',
  d: 'low'|'medium'|'high'|'critical',
  e: 'low'|'medium'|'high'|'critical',
): number {
  return Math.max(0, Math.min(100, 100 - (riskWeight(a)+riskWeight(b)+riskWeight(c)+riskWeight(d)+riskWeight(e))));
}

// (a) Temperature Elasticity — 10 entries (one per heatmap category)
// NOTE: "Ice Cream proxy" uses Butter & Ghee (6.5%/°C); Curd & Yogurt entry is at 2.4%/°C (verified by V2.c)
const weatherTemperatureElasticity: WeatherTemperatureElasticity[] = [
  { category: 'Butter & Ghee',   elasticity_pct_per_c: 6.5,  threshold_c: 28, direction: 'positive', confidence_high_pct: 7.2,  confidence_low_pct: 5.8,  n_observations: 4380, source_table: 'gold_weather_impact' },
  { category: 'Energy Drinks',   elasticity_pct_per_c: 4.2,  threshold_c: 30, direction: 'positive', confidence_high_pct: 4.8,  confidence_low_pct: 3.6,  n_observations: 4380, source_table: 'gold_weather_impact' },
  { category: 'Curd & Yogurt',   elasticity_pct_per_c: 2.4,  threshold_c: 30, direction: 'positive', confidence_high_pct: 2.9,  confidence_low_pct: 1.9,  n_observations: 4380, source_table: 'gold_weather_impact' },
  { category: 'Paneer',          elasticity_pct_per_c: 1.8,  threshold_c: 32, direction: 'positive', confidence_high_pct: 2.3,  confidence_low_pct: 1.3,  n_observations: 4380, source_table: 'gold_weather_impact' },
  { category: 'Chips & Namkeen', elasticity_pct_per_c: 0.8,  threshold_c: 32, direction: 'positive', confidence_high_pct: 1.2,  confidence_low_pct: 0.4,  n_observations: 4380, source_table: 'gold_weather_impact' },
  { category: 'Dal & Pulses',    elasticity_pct_per_c: 0.1,  threshold_c: 35, direction: 'neutral',  confidence_high_pct: 0.5,  confidence_low_pct: -0.3, n_observations: 4380, source_table: 'gold_weather_impact' },
  { category: 'Edible Oil',      elasticity_pct_per_c: 0.0,  threshold_c: 30, direction: 'neutral',  confidence_high_pct: 0.4,  confidence_low_pct: -0.4, n_observations: 4380, source_table: 'gold_weather_impact' },
  { category: 'Rice',            elasticity_pct_per_c: -0.2, threshold_c: 32, direction: 'neutral',  confidence_high_pct: 0.2,  confidence_low_pct: -0.6, n_observations: 4380, source_table: 'gold_weather_impact' },
  { category: 'Coffee',          elasticity_pct_per_c: -1.5, threshold_c: 28, direction: 'negative', confidence_high_pct: -1.0, confidence_low_pct: -2.0, n_observations: 4380, source_table: 'gold_weather_impact' },
  { category: 'Tea',             elasticity_pct_per_c: -2.2, threshold_c: 28, direction: 'negative', confidence_high_pct: -1.6, confidence_low_pct: -2.8, n_observations: 4380, source_table: 'gold_weather_impact' },
];

// (b) Monsoon Impact — 10 entries (non_monsoon_avg_qty=100 baseline for all)
const weatherMonsoonImpact: WeatherMonsoonImpact[] = [
  { category: 'Tea',             non_monsoon_avg_qty: 100, monsoon_avg_qty: 122, delta_pct: 22,  direction: 'positive', statistical_significance: 'high',   source_table: 'demand_features' },
  { category: 'Chips & Namkeen', non_monsoon_avg_qty: 100, monsoon_avg_qty: 118, delta_pct: 18,  direction: 'positive', statistical_significance: 'high',   source_table: 'demand_features' },
  { category: 'Paneer',          non_monsoon_avg_qty: 100, monsoon_avg_qty: 114, delta_pct: 14,  direction: 'positive', statistical_significance: 'high',   source_table: 'demand_features' },
  { category: 'Edible Oil',      non_monsoon_avg_qty: 100, monsoon_avg_qty: 112, delta_pct: 12,  direction: 'positive', statistical_significance: 'medium', source_table: 'demand_features' },
  { category: 'Coffee',          non_monsoon_avg_qty: 100, monsoon_avg_qty: 108, delta_pct: 8,   direction: 'positive', statistical_significance: 'medium', source_table: 'demand_features' },
  { category: 'Rice',            non_monsoon_avg_qty: 100, monsoon_avg_qty: 102, delta_pct: 2,   direction: 'neutral',  statistical_significance: 'low',    source_table: 'demand_features' },
  { category: 'Dal & Pulses',    non_monsoon_avg_qty: 100, monsoon_avg_qty: 97,  delta_pct: -3,  direction: 'neutral',  statistical_significance: 'low',    source_table: 'demand_features' },
  { category: 'Butter & Ghee',   non_monsoon_avg_qty: 100, monsoon_avg_qty: 92,  delta_pct: -8,  direction: 'negative', statistical_significance: 'medium', source_table: 'demand_features' },
  { category: 'Energy Drinks',   non_monsoon_avg_qty: 100, monsoon_avg_qty: 78,  delta_pct: -22, direction: 'negative', statistical_significance: 'high',   source_table: 'demand_features' },
  { category: 'Curd & Yogurt',   non_monsoon_avg_qty: 100, monsoon_avg_qty: 65,  delta_pct: -35, direction: 'negative', statistical_significance: 'high',   source_table: 'demand_features' },
];

// (c) Monsoon Calendar — 12 months (Indian monsoon for Lucknow / tier-2 UP)
const weatherMonsoonCalendar: WeatherMonsoonMonth[] = [
  { month_num:  1, month_name: 'Jan', risk_index: 10, risk_tier: 'low',      typical_rainfall_mm:  15, is_pull_forward_window: false },
  { month_num:  2, month_name: 'Feb', risk_index: 12, risk_tier: 'low',      typical_rainfall_mm:  20, is_pull_forward_window: false },
  { month_num:  3, month_name: 'Mar', risk_index: 18, risk_tier: 'low',      typical_rainfall_mm:  25, is_pull_forward_window: false },
  { month_num:  4, month_name: 'Apr', risk_index: 28, risk_tier: 'moderate', typical_rainfall_mm:  40, is_pull_forward_window: true  },
  { month_num:  5, month_name: 'May', risk_index: 45, risk_tier: 'moderate', typical_rainfall_mm:  60, is_pull_forward_window: true  },
  { month_num:  6, month_name: 'Jun', risk_index: 72, risk_tier: 'high',     typical_rainfall_mm: 180, is_pull_forward_window: false },
  { month_num:  7, month_name: 'Jul', risk_index: 88, risk_tier: 'peak',     typical_rainfall_mm: 320, is_pull_forward_window: false },
  { month_num:  8, month_name: 'Aug', risk_index: 95, risk_tier: 'peak',     typical_rainfall_mm: 380, is_pull_forward_window: false },
  { month_num:  9, month_name: 'Sep', risk_index: 75, risk_tier: 'high',     typical_rainfall_mm: 240, is_pull_forward_window: false },
  { month_num: 10, month_name: 'Oct', risk_index: 35, risk_tier: 'moderate', typical_rainfall_mm:  90, is_pull_forward_window: false },
  { month_num: 11, month_name: 'Nov', risk_index: 15, risk_tier: 'low',      typical_rainfall_mm:  20, is_pull_forward_window: false },
  { month_num: 12, month_name: 'Dec', risk_index: 10, risk_tier: 'low',      typical_rainfall_mm:  15, is_pull_forward_window: false },
];

// (d) Monsoon Recommendation
const weatherMonsoonRecommendation: WeatherMonsoonRecommendation = {
  pull_forward_window_start:      'April 15',
  pull_forward_window_end:        'May 31',
  weeks_before_peak:              12,
  peak_month:                     'August',
  recommended_safety_stock_pct:   35,
  affected_categories:            ['Tea', 'Chips & Namkeen', 'Paneer', 'Edible Oil', 'Coffee'],
  estimated_revenue_at_risk_inr:  2400000,
  estimated_revenue_at_risk_usd:  28700,
  source_signal:                  'ext_weather + ext_events_festivals + gold_weather_impact',
};

// (e) Store-Level Weather Risk — 12 Lucknow stores
// Risk weights: low=0, medium=10, high=20, critical=35
// resilience = max(0, 100 - sum). Constraints: ≥2 stores < 50, ≥3 stores > 75
const weatherStoreRisk: WeatherStoreRisk[] = [
  // resilience=60 (medium range)
  { store_id: 'STR-LKO-001', store_name: 'Hazratganj Hypermarket',       store_type: 'Hypermarket',
    heatwave_risk: 'medium', heavy_rain_risk: 'medium', cold_spell_risk: 'low', air_quality_risk: 'high',   monsoon_flood_risk: 'low',
    resilience_score: resilienceScore('medium','medium','low','high','low') },
  // resilience=0 (<50 ✓) — near Gomti river, flood-prone
  { store_id: 'STR-LKO-002', store_name: 'Gomti Nagar Express',          store_type: 'Express',
    heatwave_risk: 'high',   heavy_rain_risk: 'critical', cold_spell_risk: 'low', air_quality_risk: 'medium', monsoon_flood_risk: 'critical',
    resilience_score: resilienceScore('high','critical','low','medium','critical') },
  // resilience=70
  { store_id: 'STR-LKO-003', store_name: 'Alambagh Supermarket',         store_type: 'Supermarket',
    heatwave_risk: 'high',   heavy_rain_risk: 'low',      cold_spell_risk: 'low', air_quality_risk: 'medium', monsoon_flood_risk: 'low',
    resilience_score: resilienceScore('high','low','low','medium','low') },
  // resilience=80 (>75 ✓) — newer residential, good infrastructure
  { store_id: 'STR-LKO-004', store_name: 'Indira Nagar Dark Store',      store_type: 'Dark Store',
    heatwave_risk: 'medium', heavy_rain_risk: 'low',      cold_spell_risk: 'low', air_quality_risk: 'medium', monsoon_flood_risk: 'low',
    resilience_score: resilienceScore('medium','low','low','medium','low') },
  // resilience=60
  { store_id: 'STR-LKO-005', store_name: 'Aliganj Supermarket',          store_type: 'Supermarket',
    heatwave_risk: 'high',   heavy_rain_risk: 'medium',   cold_spell_risk: 'low', air_quality_risk: 'medium', monsoon_flood_risk: 'low',
    resilience_score: resilienceScore('high','medium','low','medium','low') },
  // resilience=0 (<50 ✓) — old city, worst drainage, AQI critical
  { store_id: 'STR-LKO-006', store_name: 'Chowk Hypermarket',            store_type: 'Hypermarket',
    heatwave_risk: 'high',   heavy_rain_risk: 'high',     cold_spell_risk: 'low', air_quality_risk: 'critical', monsoon_flood_risk: 'critical',
    resilience_score: resilienceScore('high','high','low','critical','critical') },
  // resilience=60
  { store_id: 'STR-LKO-007', store_name: 'Mahanagar Express',            store_type: 'Express',
    heatwave_risk: 'medium', heavy_rain_risk: 'medium',   cold_spell_risk: 'low', air_quality_risk: 'high',   monsoon_flood_risk: 'low',
    resilience_score: resilienceScore('medium','medium','low','high','low') },
  // resilience=80 (>75 ✓) — upscale planned township
  { store_id: 'STR-LKO-008', store_name: 'Sushant Golf City Hypermarket', store_type: 'Hypermarket',
    heatwave_risk: 'medium', heavy_rain_risk: 'low',      cold_spell_risk: 'low', air_quality_risk: 'medium', monsoon_flood_risk: 'low',
    resilience_score: resilienceScore('medium','low','low','medium','low') },
  // resilience=40 (<50 ✓) — dense old commercial, high AQI & rain risk
  { store_id: 'STR-LKO-009', store_name: 'Aminabad Supermarket',         store_type: 'Supermarket',
    heatwave_risk: 'high',   heavy_rain_risk: 'medium',   cold_spell_risk: 'low', air_quality_risk: 'high',   monsoon_flood_risk: 'medium',
    resilience_score: resilienceScore('high','medium','low','high','medium') },
  // resilience=90 (>75 ✓) — modern planned sector
  { store_id: 'STR-LKO-010', store_name: 'Vibhuti Khand Dark Store',     store_type: 'Dark Store',
    heatwave_risk: 'low',    heavy_rain_risk: 'low',      cold_spell_risk: 'low', air_quality_risk: 'medium', monsoon_flood_risk: 'low',
    resilience_score: resilienceScore('low','low','low','medium','low') },
  // resilience=60
  { store_id: 'STR-LKO-011', store_name: 'Faizabad Road Express',        store_type: 'Express',
    heatwave_risk: 'high',   heavy_rain_risk: 'medium',   cold_spell_risk: 'low', air_quality_risk: 'medium', monsoon_flood_risk: 'low',
    resilience_score: resilienceScore('high','medium','low','medium','low') },
  // resilience=80 (>75 ✓) — south-east corridor, relatively modern
  { store_id: 'STR-LKO-012', store_name: 'Telibagh Supermarket',         store_type: 'Supermarket',
    heatwave_risk: 'medium', heavy_rain_risk: 'low',      cold_spell_risk: 'low', air_quality_risk: 'medium', monsoon_flood_risk: 'low',
    resilience_score: resilienceScore('medium','low','low','medium','low') },
];

// (f) Weather Signal Inputs — 6 columns used in cold-start model
const weatherSignalInputs: WeatherSignalInput[] = [
  { column_name: 'temp_avg_c',         description: 'Daily mean temperature in °C',                           source_table: 'ext_weather',      n_observations_millions: 16.4, refresh_cadence: 'Daily', coverage_pct: 100, freshness_status: 'fresh', used_in_cold_start: true },
  { column_name: 'rainfall_mm',        description: 'Daily rainfall in millimeters',                          source_table: 'ext_weather',      n_observations_millions: 16.4, refresh_cadence: 'Daily', coverage_pct: 100, freshness_status: 'fresh', used_in_cold_start: true },
  { column_name: 'humidity_pct',       description: 'Relative humidity percentage',                           source_table: 'ext_weather',      n_observations_millions: 16.4, refresh_cadence: 'Daily', coverage_pct: 100, freshness_status: 'fresh', used_in_cold_start: true },
  { column_name: 'aqi',                description: 'Air Quality Index (CPCB scale)',                         source_table: 'ext_weather',      n_observations_millions: 16.4, refresh_cadence: 'Daily', coverage_pct:  87, freshness_status: 'fresh', used_in_cold_start: true },
  { column_name: 'is_monsoon_day',     description: 'Derived monsoon active flag',                            source_table: 'demand_features',  n_observations_millions: 140.0, refresh_cadence: 'Daily', coverage_pct: 100, freshness_status: 'fresh', used_in_cold_start: true },
  { column_name: 'is_extreme_weather', description: 'Derived extreme event flag (heatwave/heavy rain/cold snap)', source_table: 'demand_features', n_observations_millions: 140.0, refresh_cadence: 'Daily', coverage_pct: 100, freshness_status: 'fresh', used_in_cold_start: true },
];

// ============================================================
// SPRINT 7b: ANALOG CONTRIBUTION WATERFALL
// ============================================================

// --- ANALOG CITY CARDS (identical for all 10 SKUs) ---
const analogCards: AnalogCityCard[] = [
  {
    city: 'Jaipur',
    weight_pct: 38.8,
    similarity_score: SIM_JAIPUR,
    tier_label: 'Tier-2 · Rajasthan · Semi-arid',
    similarity_axes: [
      { axis_name: 'GDP per capita', similarity_pct: 78, target_value: '$2,000', analog_value: '$2,500' },
      { axis_name: 'Population',     similarity_pct: 88, target_value: '3.5M',   analog_value: '4.0M'   },
      { axis_name: 'Basket value',   similarity_pct: 91, target_value: '₹1,700', analog_value: '₹1,800' },
    ],
    adjustments_applied: ['Store format match (Express)', 'Income downward adj', 'Climate match (semi-arid)'],
    confidence: 'high',
    confidence_reason: 'Strong similarity across all 3 axes. Semi-arid climate matches. Store format identical.',
  },
  {
    city: 'Ahmedabad',
    weight_pct: 30.8,
    similarity_score: SIM_AHMEDABAD,
    tier_label: 'Tier-1 · Gujarat · Semi-arid',
    similarity_axes: [
      { axis_name: 'GDP per capita', similarity_pct: 68, target_value: '$2,000', analog_value: '$3,500' },
      { axis_name: 'Population',     similarity_pct: 72, target_value: '3.5M',   analog_value: '8.0M'   },
      { axis_name: 'Basket value',   similarity_pct: 84, target_value: '₹1,700', analog_value: '₹2,100' },
    ],
    adjustments_applied: ['Price-tier upward adj', 'Population scaling', 'Higher basket value adj'],
    confidence: 'high',
    confidence_reason: 'Strong basket value alignment. Larger market scaled appropriately. Climate matches.',
  },
  {
    city: 'Kolkata',
    weight_pct: 30.4,
    similarity_score: SIM_KOLKATA,
    tier_label: 'Tier-1 · West Bengal · Humid subtropical',
    similarity_axes: [
      { axis_name: 'GDP per capita', similarity_pct: 72, target_value: '$2,000', analog_value: '$3,000' },
      { axis_name: 'Population',     similarity_pct: 58, target_value: '3.5M',   analog_value: '15.0M'  },
      { axis_name: 'Basket value',   similarity_pct: 78, target_value: '₹1,700', analog_value: '₹2,250' },
    ],
    adjustments_applied: ['Humidity adjustment (spoilage)', 'Population scaling', 'Climate mismatch dampener'],
    confidence: 'medium',
    confidence_reason: 'Larger population and different climate zone (humid subtropical vs semi-arid). Humidity differences affect spoilage-sensitive SKUs.',
  },
];

// Festival-sensitive and weather-sensitive category sets
const FESTIVAL_CATS_7B = new Set(['Tea', 'Chips & Namkeen', 'Paneer', 'Edible Oil']);
const WEATHER_NEG_CATS_7B = new Set(['Coffee', 'Tea']);
const WEATHER_POS_CATS_7B = new Set(['Curd & Yogurt', 'Energy Drinks', 'Butter & Ghee']);

// Snapshot at Day 45: alpha=0.5, analogScale=0.5
// Festival windows are Day 35-42 (Onam) and Day 75-82 (Diwali) — Day 45 is outside both
const DAY_45_ALPHA = 0.5;
const ANALOG_SCALE_45 = 1 - DAY_45_ALPHA; // 0.5

const analogWaterfall: AnalogWaterfallEntry[] = HERO_SKUS_DEF.map((def, idx) => {
  const base = heroSKUs[idx].avg_daily_units;
  const isFestivalSensitive = FESTIVAL_CATS_7B.has(def.category);
  const isWeatherNeg = WEATHER_NEG_CATS_7B.has(def.category);
  const isWeatherPos = WEATHER_POS_CATS_7B.has(def.category);

  // rng() call 1: Jaipur baseline
  const jaipurBase = +(base * W_JAIPUR * ANALOG_SCALE_45 * (0.90 + rng() * 0.20)).toFixed(2);
  // rng() call 2: Jaipur store format adj (positive)
  const jaipurStoreAdj = +(jaipurBase * (0.08 + rng() * 0.08)).toFixed(2);
  // rng() call 3: Jaipur income adj (negative — Lucknow income lower)
  const jaipurIncomeAdjAbs = +(jaipurBase * (0.04 + rng() * 0.04)).toFixed(2);

  // rng() call 4: Ahmedabad baseline
  const ahmedabadBase = +(base * W_AHMEDABAD * ANALOG_SCALE_45 * (0.88 + rng() * 0.24)).toFixed(2);
  // rng() call 5: Ahmedabad price-tier adj (positive — higher basket)
  const ahmedabadPriceAdj = +(ahmedabadBase * (0.06 + rng() * 0.08)).toFixed(2);

  // rng() call 6: Kolkata baseline
  const kolkataBase = +(base * W_KOLKATA * ANALOG_SCALE_45 * (0.88 + rng() * 0.24)).toFixed(2);
  // rng() call 7: Kolkata humidity adj (negative — spoilage dampener)
  const kolkataHumidityAdjAbs = +(kolkataBase * (0.10 + rng() * 0.10)).toFixed(2);

  // rng() call 8: Festival uplift (Day 45 is outside all festival windows → always 0)
  const festivalRaw = rng();
  const festivalLift = isFestivalSensitive && false // Day 45: no festival active
    ? +(base * (0.030 + festivalRaw * 0.030)).toFixed(2)
    : 0;

  // rng() call 9: Weather adjustment
  const weatherRaw = rng();
  const weatherAdj = isWeatherNeg
    ? +(-(base * (0.015 + weatherRaw * 0.015))).toFixed(2)
    : isWeatherPos
    ? +(base * (0.015 + weatherRaw * 0.015)).toFixed(2)
    : 0;

  // rng() call 10: Local data Bayesian blend
  const localBlend = +(base * DAY_45_ALPHA * (0.85 + rng() * 0.30)).toFixed(2);

  // rng() call 11: Actual units (observed demand)
  const actual_units = +(base * (0.80 + rng() * 0.40)).toFixed(2);

  const contributions: AnalogContribution[] = [
    {
      step_label: 'Jaipur baseline',
      category: 'analog_baseline',
      city_attribution: 'Jaipur',
      value_units: jaipurBase,
      explanation: `Jaipur analog (rank 1, sim=${SIM_JAIPUR}) × ${ANALOG_SCALE_45} analogScale`,
    },
    {
      step_label: 'Jaipur store format adj',
      category: 'analog_adjustment',
      city_attribution: 'Jaipur',
      value_units: jaipurStoreAdj,
      explanation: 'Store format match (Express → Express): +8–16% lift applied',
    },
    {
      step_label: 'Jaipur income adj',
      category: 'analog_adjustment',
      city_attribution: 'Jaipur',
      value_units: -jaipurIncomeAdjAbs,
      explanation: 'Lucknow GDP/cap lower than Jaipur: income downward adjustment',
    },
    {
      step_label: 'Ahmedabad baseline',
      category: 'analog_baseline',
      city_attribution: 'Ahmedabad',
      value_units: ahmedabadBase,
      explanation: `Ahmedabad analog (rank 2, sim=${SIM_AHMEDABAD}) × ${ANALOG_SCALE_45} analogScale`,
    },
    {
      step_label: 'Ahmedabad price-tier adj',
      category: 'analog_adjustment',
      city_attribution: 'Ahmedabad',
      value_units: ahmedabadPriceAdj,
      explanation: 'Higher avg basket in Ahmedabad: price-tier upward adjustment',
    },
    {
      step_label: 'Kolkata baseline',
      category: 'analog_baseline',
      city_attribution: 'Kolkata',
      value_units: kolkataBase,
      explanation: `Kolkata analog (rank 3, sim=${SIM_KOLKATA}) × ${ANALOG_SCALE_45} analogScale`,
    },
    {
      step_label: 'Kolkata humidity adj',
      category: 'analog_adjustment',
      city_attribution: 'Kolkata',
      value_units: -kolkataHumidityAdjAbs,
      explanation: 'Humid subtropical climate: spoilage dampener applied to Kolkata signal',
    },
    {
      step_label: 'Festival uplift',
      category: 'festival',
      city_attribution: 'multi',
      value_units: festivalLift,
      explanation: 'No festival active on Day 45 (windows: Day 35–42 Onam, Day 75–82 Diwali)',
    },
    {
      step_label: 'Weather adjustment',
      category: 'weather',
      city_attribution: 'none',
      value_units: weatherAdj,
      explanation: isWeatherNeg
        ? 'Temperature-negative category: weather dampener applied'
        : isWeatherPos
        ? 'Temperature-positive category: weather demand boost'
        : 'Weather-neutral category: no adjustment',
    },
    {
      step_label: 'Local data blend',
      category: 'blend_local',
      city_attribution: 'none',
      value_units: localBlend,
      explanation: `Day 45 α=${DAY_45_ALPHA}: ${(DAY_45_ALPHA * 100).toFixed(0)}% weight on live Lucknow demand observations`,
    },
  ];

  const final_forecast_units = +(contributions.reduce((s, c) => s + c.value_units, 0)).toFixed(2);

  return {
    sku_id: def.sku_id,
    product_name: def.name,
    day_num: 45,
    final_forecast_units,
    actual_units,
    contributions,
    analog_cards: analogCards,
  };
});

// --- KPIs ---
const convergedSKUs = Math.floor(TOTAL_SKUS * 0.857);
const kpis: ColdstartKPIs = {
  champion_mape:        CHAMPION_MAPE,
  naive_mape:           NAIVE_MAPE,
  improvement_pct:      IMPROVEMENT_PCT,
  total_skus:           TOTAL_SKUS,
  converged_skus:       convergedSKUs,
  convergence_day:      convergenceDay,
  holdout_days:         HOLDOUT_DAYS,
  analog_cities:        3,
  top_analog_city:      'Jaipur',
  top_analog_similarity: SIM_JAIPUR,
};

// --- ASSEMBLE PAYLOAD ---
const payload: ColdstartPayload = {
  generated_at: new Date().toISOString(),
  target_city: targetCity,
  model_variants: modelVariants,
  analog_cities: analogCities,
  mape_over_time: mapeOverTime,
  time_buckets: timeBuckets,
  bucket_metrics: bucketMetrics,
  heatmap_cells: heatmapCells,
  sku_holdouts: skuHoldouts,
  festival_uplifts: festivalUplifts,
  festival_day_pattern: festivalDayPattern,
  kpis,
  // Sprint 5
  hero_skus: heroSKUs,
  prediction_decomposition: predDecomposition,
  sku_drill_series: skuDrillSeries,
  adaptation_curve: adaptationCurve,
  festival_category_patterns: festivalCategoryPatterns,
  methodology,
  // Sprint 6
  cost_of_mape: costOfMAPE,
  external_signals: externalSignals,
  signal_integration: signalIntegration,
  // Sprint 7a
  weather_temperature_elasticity: weatherTemperatureElasticity,
  weather_monsoon_impact:         weatherMonsoonImpact,
  weather_monsoon_calendar:       weatherMonsoonCalendar,
  weather_monsoon_recommendation: weatherMonsoonRecommendation,
  weather_store_risk:             weatherStoreRisk,
  weather_signal_inputs:          weatherSignalInputs,
  // Sprint 7b
  analog_waterfall:               analogWaterfall,
};

// --- WRITE ---
const outDir = path.join(__dirname, '..', 'cache');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const outPath = path.join(outDir, 'coldstart.json');
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');

// --- VERIFICATION OUTPUT ---
console.log(`✓ Wrote ${outPath}`);
console.log(`\n=== FIX 2: City Similarities ===`);
console.log(`  Jaipur    rank=1 sim=${SIM_JAIPUR} weight=${W_JAIPUR}`);
console.log(`  Ahmedabad rank=2 sim=${SIM_AHMEDABAD} weight=${W_AHMEDABAD}`);
console.log(`  Kolkata   rank=3 sim=${SIM_KOLKATA} weight=${W_KOLKATA}`);
console.log(`  Weight sum=${(W_JAIPUR+W_AHMEDABAD+W_KOLKATA).toFixed(3)}`);

console.log(`\n=== FIX 3: MAPE Curve Means ===`);
for (const [model, target] of Object.entries(MODEL_MAPES)) {
  const actual = means[model as keyof typeof means];
  const delta = Math.abs(actual - target) * 100;
  const ok = delta <= 0.5 ? '✓' : '✗ OFF BY >0.5pp';
  console.log(`  ${model}: mean=${(actual*100).toFixed(2)}% target=${(target*100).toFixed(1)}% Δ=${delta.toFixed(2)}pp ${ok}`);
}

console.log(`\n=== FIX 4: Heatmap ===`);
console.log(`  heatmap_cells.length = ${heatmapCells.length} (want 240)`);
const distinctCats = Array.from(new Set(heatmapCells.map(c => c.sku_category)));
const distinctStores = Array.from(new Set(heatmapCells.map(c => c.store_type)));
const distinctModels = Array.from(new Set(heatmapCells.map(c => c.model)));
console.log(`  categories(${distinctCats.length}): ${distinctCats.join(', ')}`);
console.log(`  store_types(${distinctStores.length}): ${distinctStores.join(', ')}`);
console.log(`  models(${distinctModels.length}): ${distinctModels.join(', ')}`);

console.log(`\n=== Convergence ===`);
console.log(`  fix2_blending day-90 value: ${(v90*100).toFixed(2)}%`);
console.log(`  convergence_day: ${convergenceDay} (want 55-65)`);

console.log(`\n=== KPIs ===`);
console.log(`  champion_mape=${kpis.champion_mape} naive_mape=${kpis.naive_mape} improvement=${kpis.improvement_pct}%`);
console.log(`  total_skus=${kpis.total_skus} convergence_day=${kpis.convergence_day}`);

console.log(`\n=== Sprint 6 ===`);
console.log(`  cost_of_mape.naive_costs.total_cost_inr = ${costOfMAPE.naive_costs.total_cost_inr} (want 3100000)`);
console.log(`  cost_of_mape.champion_costs.total_cost_inr = ${costOfMAPE.champion_costs.total_cost_inr} (want 1210000)`);
console.log(`  cost_of_mape.savings.total_savings_inr = ${costOfMAPE.savings.total_savings_inr} (want 1890000)`);
console.log(`  cost_of_mape.savings.savings_pct = ${costOfMAPE.savings.savings_pct} (want 61.0)`);
const wk13 = weeklyBreakdown[12];
console.log(`  week 13 naive_cum=${wk13.naive_cumulative_cost_inr} champ_cum=${wk13.champion_cumulative_cost_inr} savings_cum=${wk13.savings_cumulative_inr}`);
console.log(`  external_signals.length = ${externalSignals.length} (want 11)`);
console.log(`  signal_integration.total_columns = ${signalIntegration.total_columns} (spec=213, computed=223 → DEVIATION noted)`);
console.log(`  signal_integration.total_rows_millions = ${signalIntegration.total_rows_millions} (spec=159.5, computed=158.9 → DEVIATION noted)`);
console.log(`  signal_integration.used_in_cold_start_model = ${signalIntegration.used_in_cold_start_model} (want 10)`);
console.log(`  refresh_cadences = ${JSON.stringify(signalIntegration.refresh_cadences)}`);

console.log(`\n=== Sprint 7a: Weather ===`);
console.log(`  weather_temperature_elasticity.length = ${weatherTemperatureElasticity.length} (want 10)`);
const curdEntry = weatherTemperatureElasticity.find(e => e.category === 'Curd & Yogurt');
console.log(`  Curd & Yogurt elasticity=${curdEntry?.elasticity_pct_per_c} threshold=${curdEntry?.threshold_c} (want 2.4, 30)`);
const teaEntry = weatherTemperatureElasticity.find(e => e.category === 'Tea');
console.log(`  Tea elasticity=${teaEntry?.elasticity_pct_per_c} (want -2.2)`);
const coffeeEntry = weatherTemperatureElasticity.find(e => e.category === 'Coffee');
console.log(`  Coffee elasticity=${coffeeEntry?.elasticity_pct_per_c} (want -1.5)`);
console.log(`  weather_monsoon_impact.length = ${weatherMonsoonImpact.length} (want 10)`);
const teaMonsoon = weatherMonsoonImpact.find(e => e.category === 'Tea');
console.log(`  Tea monsoon delta=${teaMonsoon?.delta_pct} (want 22)`);
const curdMonsoon = weatherMonsoonImpact.find(e => e.category === 'Curd & Yogurt');
console.log(`  Curd & Yogurt monsoon delta=${curdMonsoon?.delta_pct} (want -35)`);
console.log(`  weather_monsoon_calendar.length = ${weatherMonsoonCalendar.length} (want 12)`);
const aug = weatherMonsoonCalendar.find(m => m.month_name === 'Aug');
console.log(`  August risk_index=${aug?.risk_index} tier=${aug?.risk_tier} (want 95, peak)`);
const pullMonths = weatherMonsoonCalendar.filter(m => m.is_pull_forward_window);
console.log(`  pull_forward months: ${pullMonths.map(m=>m.month_name).join(', ')} (want Apr, May)`);
console.log(`  monsoon_recommendation.recommended_safety_stock_pct = ${weatherMonsoonRecommendation.recommended_safety_stock_pct} (want 35)`);
console.log(`  monsoon_recommendation.affected_categories.length = ${weatherMonsoonRecommendation.affected_categories.length} (want 5)`);
console.log(`  weather_store_risk.length = ${weatherStoreRisk.length} (want 12)`);
const storesUnder50 = weatherStoreRisk.filter(s => s.resilience_score < 50);
const storesOver75 = weatherStoreRisk.filter(s => s.resilience_score > 75);
console.log(`  stores with resilience < 50: ${storesUnder50.length} (want ≥2) → ${storesUnder50.map(s=>`${s.store_name}(${s.resilience_score})`).join(', ')}`);
console.log(`  stores with resilience > 75: ${storesOver75.length} (want ≥3) → ${storesOver75.map(s=>`${s.store_name}(${s.resilience_score})`).join(', ')}`);
console.log(`  weather_signal_inputs.length = ${weatherSignalInputs.length} (want 6)`);
const aqiSig = weatherSignalInputs.find(s => s.column_name === 'aqi');
console.log(`  aqi coverage_pct=${aqiSig?.coverage_pct} (want 87)`);
const otherSigs = weatherSignalInputs.filter(s => s.column_name !== 'aqi');
console.log(`  other signals coverage_pct: ${Array.from(new Set(otherSigs.map(s=>s.coverage_pct))).join(', ')} (want all 100)`);

console.log(`\n=== Sprint 5 ===`);
console.log(`  hero_skus.length = ${heroSKUs.length} (want 10)`);
console.log(`  prediction_decomposition.length = ${predDecomposition.length} (want 50)`);
console.log(`  sku_drill_series.length = ${skuDrillSeries.length} (want 900)`);
console.log(`  adaptation_curve.length = ${adaptationCurve.length} (want 90)`);
console.log(`  festival_category_patterns.length = ${festivalCategoryPatterns.length} (want 40)`);
const diwFrozen = festivalCategoryPatterns.filter(p => p.festival_name === 'Diwali' && p.category === 'Frozen Foods');
const diwFrozenPeak = Math.max(...diwFrozen.map(p => p.uplift_multiplier));
console.log(`  Diwali×Frozen Foods peak: ${diwFrozenPeak} (want 3.13)`);
console.log(`  Diwali×Frozen Foods day 0 (festival): ${diwFrozen.find(p => p.day_offset === 0)?.uplift_multiplier} (want 2.75)`);

console.log(`\n=== Sprint 7b: Analog Waterfall ===`);
console.log(`  analog_waterfall.length = ${analogWaterfall.length} (want 10)`);
const allHave10 = analogWaterfall.every(e => e.contributions.length === 10);
console.log(`  all entries have 10 contributions: ${allHave10} (want true)`);
const allHave3Cards = analogWaterfall.every(e => e.analog_cards.length === 3);
console.log(`  all entries have 3 analog_cards: ${allHave3Cards} (want true)`);
const weightSum = analogCards.reduce((s, c) => s + c.weight_pct, 0);
console.log(`  analog card weight sum: ${weightSum.toFixed(1)}% (want 100.0)`);
let sumOk = true;
for (const e of analogWaterfall) {
  const contribSum = +(e.contributions.reduce((s, c) => s + c.value_units, 0)).toFixed(2);
  const diff = Math.abs(contribSum - e.final_forecast_units);
  if (diff > 0.1) { console.log(`  ✗ ${e.sku_id} sum=${contribSum} final=${e.final_forecast_units} diff=${diff.toFixed(4)}`); sumOk = false; }
}
console.log(`  all contribution sums match final_forecast (≤0.1 tol): ${sumOk} (want true)`);
const allPositiveForecast = analogWaterfall.every(e => e.final_forecast_units > 0);
console.log(`  all final_forecast_units > 0: ${allPositiveForecast} (want true)`);
const allPositiveActual = analogWaterfall.every(e => e.actual_units > 0);
console.log(`  all actual_units > 0: ${allPositiveActual} (want true)`);
const catCounts = analogWaterfall[0].contributions.reduce((acc, c) => {
  acc[c.category] = (acc[c.category] || 0) + 1; return acc;
}, {} as Record<string, number>);
console.log(`  SKU-0001 contribution categories: ${JSON.stringify(catCounts)}`);
console.log(`    (want analog_baseline:3, analog_adjustment:4, festival:1, weather:1, blend_local:1)`);
const festivalEntries = analogWaterfall.map(e => e.contributions.find(c => c.category === 'festival'));
const allFestivalZero = festivalEntries.every(c => c?.value_units === 0);
console.log(`  all festival contributions = 0 at day 45: ${allFestivalZero} (want true)`);
const coffeeEntry7b = analogWaterfall.find(e => e.sku_id === 'LKO-SKU-0001');
const coffeeWeather = coffeeEntry7b?.contributions.find(c => c.category === 'weather');
console.log(`  Coffee (SKU-0001) weather adj < 0: ${(coffeeWeather?.value_units ?? 0) < 0} (want true)`);
const curdEntry7b = analogWaterfall.find(e => e.sku_id === 'LKO-SKU-0006');
const curdWeather = curdEntry7b?.contributions.find(c => c.category === 'weather');
console.log(`  Curd & Yogurt (SKU-0006) weather adj > 0: ${(curdWeather?.value_units ?? 0) > 0} (want true)`);
const riceEntry7b = analogWaterfall.find(e => e.sku_id === 'LKO-SKU-0010');
const riceWeather = riceEntry7b?.contributions.find(c => c.category === 'weather');
console.log(`  Rice (SKU-0010) weather adj = 0: ${(riceWeather?.value_units ?? 1) === 0} (want true)`);
const allDay45 = analogWaterfall.every(e => e.day_num === 45);
console.log(`  all entries at day_num=45: ${allDay45} (want true)`);
