#!/usr/bin/env ts-node
/**
 * Sprint D1 generator — replaces 200MB shards with:
 *   cache/merch_demand/core.json          (~1-3 MB)
 *   cache/merch_demand/precomputed.json   (~3-8 MB)
 *   cache/merch_demand/sku_detail/*.json  (30 files, one per top-SKU)
 *
 * Run: npm run gen:merch-demand
 */

import * as fs from 'fs';
import * as path from 'path';
import { INDIA_V1 } from '../src/app/lib/market-config';
import type { MerchDemandForecastPoint } from '../src/app/lib/merch-demand-types';

const GEN_START = Date.now();

// ─── Constants ────────────────────────────────────────────────────────────────

const SEED = 42;
const ANCHOR_DATE = '2026-05-17';
const HIST_DAYS = 90;
const FORE_DAYS = 60;

const HIST_START = addDays(ANCHOR_DATE, -HIST_DAYS);        // 2026-02-16
const FORE_END   = addDays(ANCHOR_DATE, FORE_DAYS - 1);     // 2026-07-15

// ─── PRNG (Mulberry32) ────────────────────────────────────────────────────────

let _s = SEED;
function rng(): number {
  _s = (_s + 0x6d2b79f5) >>> 0;
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function gaussian(mean: number, std: number): number {
  const u1 = Math.max(1e-10, rng());
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * std;
}

function randInt(lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  return Math.round(
    (new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime()) / 86400000,
  );
}

function isBetween(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

// ─── Market Config ────────────────────────────────────────────────────────────

const DEPARTMENTS = INDIA_V1.departments;
const EVENTS_CONFIG = INDIA_V1.events;
const EVENT_LIFTS_CONFIG = INDIA_V1.event_lifts;

const EVENT_LIFT_MAP = new Map<string, Map<string, number>>();
for (const el of EVENT_LIFTS_CONFIG) {
  if (!EVENT_LIFT_MAP.has(el.event_id)) EVENT_LIFT_MAP.set(el.event_id, new Map());
  EVENT_LIFT_MAP.get(el.event_id)!.set(el.category, el.expected_lift_pct);
}

const DEPT_CAT_MAP = new Map<string, Map<string, string[]>>();
for (const d of DEPARTMENTS) {
  const catMap = new Map<string, string[]>();
  for (const c of d.categories) catMap.set(c.name, c.subcategories);
  DEPT_CAT_MAP.set(d.name, catMap);
}

const DOW_FACTOR = [1.18, 0.95, 0.92, 0.95, 1.0, 1.15, 1.25];

const STORE_TYPE_FACTOR: Record<string, number> = {
  Hypermarket: 1.4, Supermarket: 1.0, Express: 0.5,
  'Dark Store': 0.7, 'Kirana Partner': 0.3,
};

const CITY_STATE: Record<string, string> = {
  Mumbai: 'Maharashtra', 'Delhi NCR': 'Delhi', Bangalore: 'Karnataka',
  Chennai: 'Tamil Nadu', Hyderabad: 'Telangana', Kolkata: 'West Bengal',
  Pune: 'Maharashtra', Ahmedabad: 'Gujarat', Jaipur: 'Rajasthan', Lucknow: 'Uttar Pradesh',
};

const CITY_TIER: Record<string, 1 | 2 | 3> = {
  Mumbai: 1, 'Delhi NCR': 1, Bangalore: 1, Chennai: 2, Hyderabad: 2,
  Kolkata: 2, Pune: 2, Ahmedabad: 2, Jaipur: 3, Lucknow: 3,
};

const STORE_CHANNELS: Record<string, string[]> = {
  Hypermarket: ['In-Store', 'Online'], Supermarket: ['In-Store', 'Online'],
  Express: ['In-Store', 'Quick-Commerce'], 'Dark Store': ['Online', 'Quick-Commerce'],
  'Kirana Partner': ['In-Store'],
};

// ─── Load source data ─────────────────────────────────────────────────────────

const ROOT = process.cwd();
const CACHE_ROOT = path.join(ROOT, 'cache');

const rawProducts: Array<Record<string, string>> = JSON.parse(
  fs.readFileSync(path.join(CACHE_ROOT, 'price_product_table.json'), 'utf-8'),
);

const rawDimensions: Array<Record<string, string>> = JSON.parse(
  fs.readFileSync(path.join(CACHE_ROOT, 'dimensions.json'), 'utf-8'),
);

const rawStores = rawDimensions.filter((r) => r.dim_type === 'stores');

// ─── SKU helpers ──────────────────────────────────────────────────────────────

type VelocityClass = 'A' | 'B' | 'C';
type Perishability = 'non_perishable' | 'short_shelf' | 'perishable';

const STAPLE_CATS = new Set(['Salt', 'Rice', 'Atta & Flour', 'Edible Oil', 'Milk', 'Toothpaste', 'Detergent', 'Biscuits']);
const SPECIALTY_CATS = new Set(['Energy Drinks', 'Coffee', 'Curd & Yogurt', 'Cheese']);

function deriveVelocity(category: string, productName: string): VelocityClass {
  if (STAPLE_CATS.has(category)) return 'A';
  if (SPECIALTY_CATS.has(category) || /premium|specialty|artisan/i.test(productName)) return 'C';
  return 'B';
}

function derivePerishability(category: string): Perishability {
  if (['Milk', 'Curd & Yogurt', 'Paneer', 'Cheese'].includes(category)) return 'perishable';
  if (['Butter & Ghee', 'Frozen Foods', 'Ice Cream'].includes(category)) return 'short_shelf';
  return 'non_perishable';
}

function deriveWeatherSensitive(category: string): boolean {
  return ['Soft Drinks', 'Juice', 'Water', 'Ice Cream', 'Frozen Foods', 'Energy Drinks'].includes(category);
}

function deriveFestivalSensitive(category: string, dept: string): boolean {
  if (['Dairy & Frozen', 'Grocery & Staples', 'Snacks & Biscuits', 'Personal Care'].includes(dept)) return true;
  return ['Butter & Ghee', 'Paneer', 'Cheese', 'Spices', 'Atta & Flour', 'Rice'].includes(category);
}

function deriveSubcategory(productName: string, category: string, dept: string): string {
  const name = productName.toLowerCase();
  const catMap = DEPT_CAT_MAP.get(dept);
  const subs = catMap?.get(category) ?? [];
  if (subs.length === 0) return 'General';
  for (const sub of subs) {
    const keywords = sub.toLowerCase().split(/[\s&]+/);
    if (keywords.some((k) => k.length > 3 && name.includes(k))) return sub;
  }
  if (category === 'Rice' && name.includes('basmati')) return 'Basmati';
  if (category === 'Tea' && name.includes('green')) return 'Green Tea';
  if (category === 'Coffee' && name.includes('instant')) return 'Instant';
  if (category === 'Biscuits' && name.includes('glucose')) return 'Glucose';
  if (category === 'Biscuits' && (name.includes('cream') || name.includes('sandwich'))) return 'Cream';
  return subs[0];
}

// ─── Build SKUs ───────────────────────────────────────────────────────────────

interface SKU {
  sku_id: string; product_name: string; department: string; category: string;
  subcategory: string; velocity_class: VelocityClass; perishability: Perishability;
  price_inr: number; mrp_inr: number; margin_pct: number;
  is_weather_sensitive: boolean; is_festival_sensitive: boolean; launch_date: string;
  base_demand: number; sigma_noise: number; bias_forecast: number; sigma_forecast: number;
}

const SKUS: SKU[] = rawProducts.map((p, i) => {
  const price = parseFloat(p.current_price);
  const margin = parseFloat(p.current_margin_pct);
  const velocity = deriveVelocity(p.category, p.product_name);
  const baseRanges: Record<VelocityClass, [number, number]> = { A: [80, 180], B: [25, 70], C: [4, 18] };
  const [lo, hi] = baseRanges[velocity];
  const baseDemand = lo + ((i * 47 + 13) % (hi - lo + 1));
  const sigmas: Record<VelocityClass, [number, number, number]> = {
    A: [0.08, -0.03, 0.06], B: [0.16, -0.02, 0.12], C: [0.32, 0.01, 0.25],
  };
  const [noise, biasF, sigmaF] = sigmas[velocity];
  const launchOffset = -(90 + ((i * 29 + 7) % 990));
  return {
    sku_id: p.product_id, product_name: p.product_name, department: p.department,
    category: p.category, subcategory: deriveSubcategory(p.product_name, p.category, p.department),
    velocity_class: velocity, perishability: derivePerishability(p.category),
    price_inr: price, mrp_inr: Math.round(price * (1 + 0.05 + ((i * 11 + 3) % 20) / 100)),
    margin_pct: margin, is_weather_sensitive: deriveWeatherSensitive(p.category),
    is_festival_sensitive: deriveFestivalSensitive(p.category, p.department),
    launch_date: addDays(ANCHOR_DATE, launchOffset),
    base_demand: baseDemand, sigma_noise: noise, bias_forecast: biasF, sigma_forecast: sigmaF,
  };
});

// ─── Build Stores ─────────────────────────────────────────────────────────────

interface Store {
  store_id: string; store_name: string; region: string; state: string;
  city: string; tier: 1 | 2 | 3; store_type: string; channels: string[];
}

const CITIES = ['Mumbai', 'Delhi NCR', 'Bangalore', 'Chennai', 'Hyderabad', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'];
const PREFERRED_TYPES = ['Hypermarket', 'Supermarket', 'Express', 'Dark Store', 'Kirana Partner'];

const selectedStoreIds = new Set<string>();
const STORES: Store[] = [];

for (const city of CITIES) {
  const cityStores = rawStores.filter((s) => s.city === city);
  let added = 0;
  for (const type of PREFERRED_TYPES) {
    if (added >= 3) break;
    const match = cityStores.find((s) => s.store_type === type && !selectedStoreIds.has(s.id));
    if (match) {
      selectedStoreIds.add(match.id);
      STORES.push({
        store_id: match.id, store_name: match.name, region: match.region,
        state: CITY_STATE[city] ?? city, city, tier: CITY_TIER[city] ?? 3,
        store_type: match.store_type, channels: STORE_CHANNELS[match.store_type] ?? ['In-Store'],
      });
      added++;
    }
  }
}

// ─── Demand helpers ───────────────────────────────────────────────────────────

function getEventMultiplier(date: string, dept: string, region: string): number {
  let mult = 1.0;
  for (const ev of EVENTS_CONFIG) {
    if (!isBetween(date, ev.window_start, ev.window_end)) continue;
    if (ev.regions_affected.length > 0 && !ev.regions_affected.includes(region)) continue;
    const liftPct = EVENT_LIFT_MAP.get(ev.event_id)?.get(dept) ?? 0;
    mult *= 1 + liftPct / 100;
  }
  return mult;
}

function avgEventMultiplier(date: string, dept: string): number {
  let total = 0;
  for (const s of STORES) total += getEventMultiplier(date, dept, s.region);
  return STORES.length > 0 ? total / STORES.length : 1.0;
}

function getSeasonalMultiplier(date: string, dept: string, category: string, weatherSensitive: boolean): number {
  if (!weatherSensitive) return 1.0;
  const month = parseInt(date.slice(5, 7), 10);
  const isMonsoon = [6, 7, 8, 9].includes(month);
  const isSummer  = [4, 5].includes(month);
  const isWinter  = [12, 1, 2].includes(month);
  if (isMonsoon) {
    if (dept === 'Beverages') return 0.75;
    if (category === 'Ice Cream') return 0.65;
    if (dept === 'Snacks & Biscuits') return 1.2;
    return 1.0;
  }
  if (isSummer) {
    if (dept === 'Beverages') return 1.35;
    if (category === 'Ice Cream') return 1.55;
    if (['Tea', 'Coffee'].includes(category)) return 0.8;
    return 1.0;
  }
  if (isWinter) {
    if (['Tea', 'Coffee'].includes(category)) return 1.25;
    if (category === 'Ice Cream') return 0.75;
    if (category === 'Frozen Foods') return 1.15;
    return 1.0;
  }
  return 1.0;
}

function getSalaryWeekMult(date: string, dept: string): number {
  const day = parseInt(date.slice(8, 10), 10);
  if (day > 7) return 1.0;
  if (dept === 'Grocery & Staples') return 1.18;
  if (dept === 'Personal Care') return 1.12;
  return 1.0;
}

// ─── Per-SKU promo windows ────────────────────────────────────────────────────

const PROMO_DEPTHS = [1.25, 1.35, 1.5, 1.65, 1.8];
const WINDOW_DAYS = diffDays(HIST_START, FORE_END) + 1; // 151

const SKU_PROMO_WINDOWS = new Map<number, [string, string, number][]>();
for (let si = 0; si < SKUS.length; si++) {
  const count = 3 + Math.floor(rng() * 4);
  const wins: [string, string, number][] = [];
  for (let p = 0; p < count; p++) {
    const startOff = Math.floor(rng() * (WINDOW_DAYS - 10));
    const dur = 5 + Math.floor(rng() * 6);
    const pStart = addDays(HIST_START, startOff);
    const pEnd   = addDays(pStart, dur);
    const mult   = PROMO_DEPTHS[Math.floor(rng() * PROMO_DEPTHS.length)];
    wins.push([pStart, pEnd, mult]);
  }
  SKU_PROMO_WINDOWS.set(si, wins);
}

function skuPromoMult(date: string, si: number): number {
  for (const [ps, pe, m] of SKU_PROMO_WINDOWS.get(si) ?? []) {
    if (isBetween(date, ps, pe)) return m;
  }
  return 1.0;
}

// ─── Compute total store factor (sum of all store type multipliers) ───────────

const TOTAL_STORE_FACTOR = STORES.reduce((sum, s) => sum + (STORE_TYPE_FACTOR[s.store_type] ?? 1.0), 0);

// ─── Build ALL_DATES array (151 dates: HIST_START to FORE_END) ────────────────

const ALL_DATES: string[] = [];
{
  let d = HIST_START;
  while (d <= FORE_END) { ALL_DATES.push(d); d = addDays(d, 1); }
}

// ─── PASS 1: Per-SKU aggregate 151-day series ─────────────────────────────────

console.log(`Generating per-SKU aggregate series (${ALL_DATES.length} days × ${SKUS.length} SKUs)…`);

interface AggPoint {
  date: string; is_actual: boolean;
  actual_units: number | null; forecast_units: number;
  lower_95: number; upper_95: number; lower_80: number; upper_80: number;
}

const SKU_SERIES = new Map<string, AggPoint[]>();

for (let si = 0; si < SKUS.length; si++) {
  const sku = SKUS[si];
  const series: AggPoint[] = [];

  for (const date of ALL_DATES) {
    const isActual = date < ANCHOR_DATE;
    const dowF    = DOW_FACTOR[new Date(date + 'T00:00:00Z').getUTCDay()];
    const eventF  = avgEventMultiplier(date, sku.department);
    const seasonF = getSeasonalMultiplier(date, sku.department, sku.category, sku.is_weather_sensitive);
    const salaryF = getSalaryWeekMult(date, sku.department);
    const promoF  = skuPromoMult(date, si);

    const noise = 1 + gaussian(0, sku.sigma_noise);
    let lumpF = 1.0;
    if (sku.velocity_class === 'C') {
      const lr = rng(); const lm = rng();
      if (lr < 0.15) lumpF = 0.3 + lm * 0.5;
      else if (lr < 0.2) lumpF = 1.5 + lm * 1.0;
    }

    const baseUnits = Math.max(0, Math.round(
      sku.base_demand * TOTAL_STORE_FACTOR * dowF * salaryF * eventF * seasonF * promoF * noise * lumpF,
    ));

    if (isActual) {
      const fErr     = gaussian(sku.bias_forecast, sku.sigma_forecast);
      const forecast = Math.max(0, Math.round(baseUnits / (1 + fErr)));
      const s        = sku.sigma_forecast;
      series.push({
        date, is_actual: true, actual_units: baseUnits, forecast_units: forecast,
        lower_95: Math.max(0, Math.round(forecast * (1 - 1.96 * s))),
        upper_95: Math.round(forecast * (1 + 1.96 * s)),
        lower_80: Math.max(0, Math.round(forecast * (1 - 1.28 * s))),
        upper_80: Math.round(forecast * (1 + 1.28 * s)),
      });
    } else {
      const dOut = diffDays(ANCHOR_DATE, date);
      const sR   = sku.sigma_forecast * (1 + 0.02 * dOut);
      series.push({
        date, is_actual: false, actual_units: null, forecast_units: baseUnits,
        lower_95: Math.max(0, Math.round(baseUnits * (1 - 1.96 * sR))),
        upper_95: Math.round(baseUnits * (1 + 1.96 * sR)),
        lower_80: Math.max(0, Math.round(baseUnits * (1 - 1.28 * sR))),
        upper_80: Math.round(baseUnits * (1 + 1.28 * sR)),
      });
    }
  }

  SKU_SERIES.set(sku.sku_id, series);
}

console.log(`  Done. Total aggregate points: ${SKUS.length * ALL_DATES.length}`);

// ─── Top-30 SKUs by total forecast volume ─────────────────────────────────────

const allSkuVols = SKUS.map((sku) => ({
  sku,
  vol: (SKU_SERIES.get(sku.sku_id) ?? [])
    .filter((p) => !p.is_actual)
    .reduce((s, p) => s + p.forecast_units, 0),
})).sort((a, b) => b.vol - a.vol);

const TOP30_SKUS = allSkuVols.slice(0, 30).map((x) => x.sku);
const TOP30_SET  = new Set(TOP30_SKUS.map((s) => s.sku_id));

// ─── daily_forecast_points (top-30 SKUs, store_id='ALL') ──────────────────────

const daily_forecast_points: MerchDemandForecastPoint[] = [];
for (const sku of TOP30_SKUS) {
  for (const pt of SKU_SERIES.get(sku.sku_id) ?? []) {
    const units = pt.is_actual ? (pt.actual_units ?? 0) : pt.forecast_units;
    daily_forecast_points.push({
      sku_id: sku.sku_id,
      store_id: 'ALL',
      date: pt.date,
      is_actual: pt.is_actual,
      actual_units: pt.actual_units,
      forecast_units: pt.forecast_units,
      lower_95: pt.lower_95,
      upper_95: pt.upper_95,
      lower_80: pt.lower_80,
      upper_80: pt.upper_80,
      revenue_inr: Math.round(units * sku.price_inr),
      confidence: sku.velocity_class === 'A' ? 'High' : sku.velocity_class === 'B' ? 'Medium' : 'Low',
    });
  }
}

// ─── SKU Drivers ──────────────────────────────────────────────────────────────

const FEATURE_POOL = [
  { feature: 'lag_7d', display_name: "Last week's demand" },
  { feature: 'lag_14d', display_name: 'Two weeks ago demand' },
  { feature: 'rolling_28d_avg', display_name: '28-day rolling average' },
  { feature: 'dow_sin', display_name: 'Day of week pattern' },
  { feature: 'salary_week', display_name: 'Salary week effect' },
  { feature: 'festival_active', display_name: 'Active festival window' },
  { feature: 'is_weekend', display_name: 'Weekend effect' },
  { feature: 'price_to_mrp', display_name: 'Current pricing' },
  { feature: 'is_promo_active', display_name: 'Promo running' },
  { feature: 'weather_temp', display_name: 'Temperature' },
  { feature: 'monsoon_active', display_name: 'Monsoon impact' },
  { feature: 'trend_slope_28d', display_name: 'Recent trend' },
  { feature: 'days_to_eid', display_name: 'Eid proximity' },
];

const skuDrivers = SKUS.map((sku) => {
  const prio: string[] = ['rolling_28d_avg', 'lag_7d', 'dow_sin'];
  if (['Grocery & Staples', 'Personal Care'].includes(sku.department)) prio.push('salary_week');
  if (sku.is_weather_sensitive) prio.push('weather_temp', 'trend_slope_28d');
  if (sku.is_festival_sensitive) prio.push('days_to_eid', 'festival_active');
  if (sku.department === 'Beverages') prio.push('monsoon_active');

  const chosen: string[] = [];
  for (const f of prio) { if (chosen.length < 5 && !chosen.includes(f)) chosen.push(f); }
  while (chosen.length < 5) {
    const f = pickOne(FEATURE_POOL).feature;
    if (!chosen.includes(f)) chosen.push(f);
  }

  const totalAbs = 85 + Math.floor(rng() * 16);
  const portions: number[] = [];
  let rem = totalAbs;
  for (let i = 0; i < 4; i++) { const sh = Math.floor(rng() * (rem * 0.5)) + 1; portions.push(sh); rem -= sh; }
  portions.push(rem);
  portions.sort((a, b) => b - a);

  return {
    sku_id: sku.sku_id,
    store_id: 'ALL',
    as_of_date: ANCHOR_DATE,
    horizon_days: 14,
    top_drivers: chosen.map((feat, i) => {
      const entry = FEATURE_POOL.find((p) => p.feature === feat)!;
      const direction: 'positive' | 'negative' = rng() > 0.3 ? 'positive' : 'negative';
      return { feature: feat, display_name: entry?.display_name ?? feat, contribution_pct: direction === 'positive' ? portions[i] : -portions[i], direction };
    }),
  };
});

// ─── Category Plans ───────────────────────────────────────────────────────────

const DEPT_SCALE: Record<string, number> = {
  'Grocery & Staples': 8_00_00_000, 'Dairy & Frozen': 6_00_00_000,
  Beverages: 5_00_00_000, 'Snacks & Biscuits': 4_00_00_000, 'Personal Care': 3_00_00_000,
};

const categoryPlans = [];
for (const dept of DEPARTMENTS) {
  for (const cat of dept.categories) {
    const catScale = (DEPT_SCALE[dept.name] ?? 2_00_00_000) / dept.categories.length;
    for (const sub of cat.subcategories) {
      const subScale = catScale / cat.subcategories.length;
      const plan = Math.round(subScale * (0.8 + rng() * 0.4));
      const actual = Math.round(plan * 0.58 * (0.92 + rng() * 0.16));
      const forecastToEnd = Math.round(plan * (0.9 + rng() * 0.3));
      const variance = ((forecastToEnd - plan) / plan) * 100;
      const status = variance < -10 ? 'will_miss' : variance < -3 ? 'at_risk' : variance > 5 ? 'will_beat' : 'on_track';
      categoryPlans.push({ department: dept.name, category: cat.name, subcategory: sub, quarter: 'Q2-2026', plan_revenue_inr: plan, forecast_to_end_inr: forecastToEnd, actual_to_date_inr: actual, variance_pct: Math.round(variance * 10) / 10, status });
    }
  }
}

// ─── Promos ───────────────────────────────────────────────────────────────────

const PROMO_TYPES = ['Flat %', 'BOGO', 'Bundle', 'Cashback'] as const;
const skuIds = SKUS.map((s) => s.sku_id);
const discountDepths = [10, 15, 20, 25, 30];

const promos = [];
// 10 active
for (let i = 0; i < 10; i++) {
  const daysAgo = randInt(1, 12);
  const start = addDays(ANCHOR_DATE, -daysAgo);
  const end = addDays(start, randInt(5, 14));
  const targetLift = randInt(20, 60);
  const actualLift = Math.round(targetLift * (0.8 + rng() * 0.5));
  const perf = actualLift > targetLift * 1.1 ? 'over_performing' : actualLift >= targetLift * 0.9 ? 'on_track' : 'under_performing';
  promos.push({
    promo_id: `PRM-${String(i + 1).padStart(3, '0')}`,
    sku_ids: Array.from({ length: randInt(2, 5) }, () => pickOne(skuIds)),
    promo_type: pickOne([...PROMO_TYPES]),
    discount_depth_pct: pickOne(discountDepths),
    start_date: start, end_date: end, status: 'active',
    target_lift_pct: targetLift, actual_lift_pct: actualLift,
    cannibalization_pct: null,
    performance_status: perf,
    recommendation: perf === 'over_performing' ? 'Extend promo by 5 days — demand tracking above plan' : perf === 'under_performing' ? 'Review pricing; consider adding Bundle mechanic to lift basket' : 'On track — maintain current plan',
  });
}
// 17 completed
for (let i = 0; i < 17; i++) {
  const endDaysAgo = randInt(5, 55);
  const end = addDays(ANCHOR_DATE, -endDaysAgo);
  const start = addDays(end, -randInt(5, 14));
  const targetLift = randInt(15, 55);
  const actualLift = Math.round(targetLift * (0.75 + rng() * 0.55));
  const cannib = Math.round(5 + rng() * 10);
  const perf = actualLift > targetLift * 1.1 ? 'over_performing' : actualLift >= targetLift * 0.9 ? 'on_track' : 'under_performing';
  promos.push({
    promo_id: `PRM-${String(i + 11).padStart(3, '0')}`,
    sku_ids: Array.from({ length: randInt(2, 6) }, () => pickOne(skuIds)),
    promo_type: pickOne([...PROMO_TYPES]),
    discount_depth_pct: pickOne(discountDepths),
    start_date: start, end_date: end, status: 'completed',
    target_lift_pct: targetLift, actual_lift_pct: actualLift,
    cannibalization_pct: cannib, performance_status: perf,
    recommendation: perf === 'over_performing' ? 'Repeat in next cycle — strong ROI. Reduce depth by 5pp to improve margin.' : perf === 'under_performing' ? `Cannibalization at ${cannib}% — avoid co-running adjacent subcategory promo next time` : 'Perform deep-dive on basket attachment to find incremental levers',
  });
}
// 4 planned
for (let i = 0; i < 4; i++) {
  const start = addDays(ANCHOR_DATE, randInt(5, 30));
  promos.push({
    promo_id: `PRM-${String(i + 28).padStart(3, '0')}`,
    sku_ids: Array.from({ length: randInt(3, 8) }, () => pickOne(skuIds)),
    promo_type: pickOne([...PROMO_TYPES]),
    discount_depth_pct: pickOne(discountDepths),
    start_date: start, end_date: addDays(start, randInt(7, 14)), status: 'planned',
    target_lift_pct: randInt(25, 65), actual_lift_pct: null, cannibalization_pct: null,
    performance_status: 'pending', recommendation: 'Confirm allocation with supply team before launch',
  });
}

// ─── Launches ─────────────────────────────────────────────────────────────────

const launches = Array.from({ length: 15 }, (_, i) => {
  const daysAgo = randInt(5, 85);
  const sku = SKUS[i % SKUS.length];
  const isEarly = daysAgo < 14;
  const target30 = randInt(800, 5000);
  const target90 = Math.round(target30 * (2.5 + rng()));
  const actual30 = isEarly ? null : Math.round(target30 * (0.55 + rng() * 0.9));
  const actual90 = daysAgo >= 90 ? Math.round(target90 * (0.6 + rng() * 0.8)) : null;
  let perf: 'beat_plan' | 'on_plan' | 'missed_plan' | 'too_early' = 'on_plan';
  if (isEarly) perf = 'too_early';
  else if (actual30 && actual30 > target30 * 1.1) perf = 'beat_plan';
  else if (actual30 && actual30 < target30 * 0.85) perf = 'missed_plan';
  const recs: Record<string, string> = {
    beat_plan: 'Scale distribution to 20 more stores — demand trajectory above plan',
    on_plan: 'Maintain current rollout cadence — tracking to plan',
    missed_plan: 'Review pricing and shelf placement; consider activating digital sampling',
    too_early: 'First 14 days — insufficient data for performance verdict',
  };
  return { launch_id: `LCH-${String(i + 1).padStart(3, '0')}`, sku_id: sku.sku_id, launch_date: addDays(ANCHOR_DATE, -daysAgo), days_in_market: daysAgo, target_units_30d: target30, actual_units_30d: actual30, target_units_90d: target90, actual_units_90d: actual90, performance_status: perf, recommendation: recs[perf] };
});

// ─── Action Items ─────────────────────────────────────────────────────────────

const actionItems = [];
let actionIdx = 1;
const mkId = () => `ACT-${String(actionIdx++).padStart(4, '0')}`;

const understockContexts = [
  'Demand +47% next week, salary effect + early Eid prep',
  'Stock cover 3.2 days vs 7-day safety threshold — replenishment delayed',
  'Velocity spike +38% over last 7 days — current coverage: 4 days',
  'Festival prep demand kicking in — 12% above forecast, stock running low',
  'Competitor OOS reported nearby — spillover demand detected',
  'School holiday effect — Ice Cream velocity up 65%, stock critical',
  'Monsoon onset — hot drinks demand +30% vs plan, POG not updated',
  'Promo activation tomorrow — pre-promo stock insufficient',
  'Recent trend: +22% WoW for 3 consecutive weeks — reorder point needs revision',
  'Summer heat +4°C above seasonal norm — Beverages demand +25% vs model',
  'Wedding season cluster — Dairy & Ghee elevated in North stores',
  'Festive gifting SKU — demand started 18 days ahead of Diwali window',
  'Top-10 revenue SKU — safety stock breach detected at cluster level',
  'Rapid sell-through from promo exhausted buffer — replenishment needed',
  'High-velocity A-class SKU with shelf gap reported by operations team',
];
for (let i = 0; i < 15; i++) {
  const sku = SKUS[(i * 7 + 3) % SKUS.length];
  const storeSubset = STORES.slice(i % 5, (i % 5) + 3).map((s) => s.store_id);
  actionItems.push({ action_id: mkId(), sku_id: sku.sku_id, store_scope: { type: 'cluster', store_ids: storeSubset, label: `${STORES[i % 5].city} cluster` }, action_type: 'understock_risk', context: understockContexts[i], recommendation: `Order ${randInt(100, 500)} units to ${storeSubset[0]} cluster — covers next 14 days`, confidence: pickOne(['High', 'Medium', 'High'] as const), revenue_impact_inr: randInt(80000, 600000), days_to_impact: randInt(1, 7), created_at: ANCHOR_DATE });
}

const overstockContexts = [
  'Demand -28% WoW for 2 weeks — model has not revised down sufficiently',
  'Post-festival demand cliff — Diwali tail ended 3 weeks ago, stock elevated',
  'Weather impact: cooler than normal — Ice Cream turn rate 40% below plan',
  'Competitor launched aggressive promo — our volume down 22%',
  'Seasonal exit — summer range not cleared before monsoon onset',
  'Launch underperformance — 30-day actual at 62% of target, excess at DC',
  'DOW anomaly: weekday velocity collapsed — possible local event interference',
  'Cannibalisation from new variant launched last month',
  'Price increase impact — demand elasticity higher than modelled (-1.4 vs -0.8)',
  'Promotional overhang — bought forward during sale, now regular demand low',
];
for (let i = 0; i < 10; i++) {
  const sku = SKUS[(i * 11 + 5) % SKUS.length];
  actionItems.push({ action_id: mkId(), sku_id: sku.sku_id, store_scope: { type: 'all', store_ids: [], label: 'All stores' }, action_type: 'overstock_risk', context: overstockContexts[i], recommendation: `Hold next PO — ${randInt(50, 300)} units in transit, request deferral from supplier`, confidence: pickOne(['Medium', 'High'] as const), revenue_impact_inr: -randInt(40000, 300000), days_to_impact: randInt(5, 21), created_at: ANCHOR_DATE });
}

const rampEvents = ['Eid al-Adha', 'School Summer Holiday', 'Monsoon Onset', 'Diwali', 'Dussehra'];
for (let i = 0; i < 8; i++) {
  const sku = SKUS[(i * 13 + 2) % SKUS.length];
  const daysUntil = randInt(8, 25);
  actionItems.push({ action_id: mkId(), sku_id: sku.sku_id, store_scope: { type: 'cluster', store_ids: STORES.slice(0, 4).map((s) => s.store_id), label: 'Top-4 cities' }, action_type: 'event_ramp', context: `${rampEvents[i % rampEvents.length]} in ${daysUntil} days — historical lift +${randInt(40, 160)}%; stock ramp not started`, recommendation: `Front-load ${randInt(150, 400)} units to DC — distribute within 5 days to avoid OOS`, confidence: 'High', revenue_impact_inr: randInt(1_20_000, 8_00_000), days_to_impact: daysUntil, created_at: ANCHOR_DATE });
}

const spikeContexts = [
  'Demand +52% last 3 days — possible viral social media moment for this SKU',
  'Local weather event (unseasonal heat) driving Ice Cream spike across Bangalore',
  'Competitor OOS driving spillover — +38% in affected pin codes',
  'New recipe video went viral — Paneer demand up 70% in urban stores',
  'IPL match day demand spike — Beverages and Chips both +45%',
];
for (let i = 0; i < 5; i++) {
  const sku = SKUS[(i * 17 + 9) % SKUS.length];
  actionItems.push({ action_id: mkId(), sku_id: sku.sku_id, store_scope: { type: 'cluster', store_ids: [STORES[i % STORES.length].store_id], label: STORES[i % STORES.length].city }, action_type: 'demand_spike', context: spikeContexts[i], recommendation: 'Emergency transfer from nearest DC — authorise priority pick', confidence: 'Medium', revenue_impact_inr: randInt(60_000, 3_00_000), days_to_impact: randInt(1, 3), created_at: ANCHOR_DATE });
}

const dropContexts = [
  'Demand -34% vs 28-day avg — investigate shelf availability and planogram compliance',
  'Post-promo demand cliff — normalization steeper than expected',
  'Price increase of 12% took effect last week — demand elastic at -1.6',
  'Category reset pulled 3 SKUs, residual demand spillover fragmented',
  'Monsoon cooling demand for Cold Beverages — market-wide effect, not store-specific',
];
for (let i = 0; i < 5; i++) {
  const sku = SKUS[(i * 19 + 11) % SKUS.length];
  actionItems.push({ action_id: mkId(), sku_id: sku.sku_id, store_scope: { type: 'all', store_ids: [], label: 'All stores' }, action_type: 'demand_drop', context: dropContexts[i], recommendation: 'Defer next 2 POs — adjust reorder point downward by 15% pending 14-day review', confidence: 'Medium', revenue_impact_inr: -randInt(30_000, 2_00_000), days_to_impact: randInt(7, 21), created_at: ANCHOR_DATE });
}

const promoActionContexts: [string, string, string][] = [
  ['promo_extend', 'Promo ROI 3.8x — demand still elevated, no cliff detected', 'Extend by 7 days — negotiate additional units with supplier at locked price'],
  ['promo_pull', 'Promo causing heavy cannibalization on adjacent SKU (-31%) — net negative', 'Pull promo 3 days early — communicate markdown to floor team by EOD'],
  ['promo_extend', 'Bundle promo clearing excess stock ahead of range refresh', 'Extend by 10 days to clear remaining inventory before new range'],
  ['promo_pull', 'Margin impact worse than modelled — depth 30% eroding contribution', 'Pull and switch to 15% depth — relaunch in 5 days'],
  ['promo_extend', 'Festive window opened unexpectedly early — promo timing is optimal', 'Extend by 5 days to capture full festive window uplift'],
];
for (let i = 0; i < 5; i++) {
  const [atype, ctx, rec] = promoActionContexts[i];
  const sku = SKUS[(i * 23 + 7) % SKUS.length];
  actionItems.push({ action_id: mkId(), sku_id: sku.sku_id, store_scope: { type: 'all', store_ids: [], label: 'All stores' }, action_type: atype, context: ctx, recommendation: rec, confidence: pickOne(['High', 'Medium'] as const), revenue_impact_inr: atype === 'promo_extend' ? randInt(50_000, 3_00_000) : -randInt(20_000, 1_50_000), days_to_impact: randInt(1, 5), created_at: ANCHOR_DATE });
}

const anomalyActionContexts: [string, string, string][] = [
  ['anomaly', 'Unexplained +45% spike at STR-0012 — no event, promo, or weather cause identified', 'Audit shelf presence and check for phantom transaction or data feed issue'],
  ['anomaly', 'Demand collapsed 80% in single day at Kolkata cluster — possible POS outage', 'Verify POS uptime with store ops; apply imputation if data error confirmed'],
  ['anomaly', 'SKU velocity doubled WoW at single store with no promo active', 'Investigate substitution effect or forward-buying by bulk buyer'],
  ['anomaly', 'Systematic -15% deviation for 8 consecutive days — possibly planogram issue', 'Request shelf audit from field team within 24 hours'],
  ['anomaly', 'Negative demand recorded (returns > sales) on 2 SKUs at Jaipur store', 'Review returns process at store; check for system booking error'],
];
for (let i = 0; i < 5; i++) {
  const [atype, ctx, rec] = anomalyActionContexts[i];
  const sku = SKUS[(i * 29 + 3) % SKUS.length];
  actionItems.push({ action_id: mkId(), sku_id: sku.sku_id, store_scope: { type: 'single', store_ids: [STORES[(i * 3) % STORES.length].store_id], label: STORES[(i * 3) % STORES.length].store_name }, action_type: atype, context: ctx, recommendation: rec, confidence: 'Low', revenue_impact_inr: randInt(5_000, 80_000), days_to_impact: randInt(1, 5), created_at: ANCHOR_DATE });
}

// ─── Anomalies ────────────────────────────────────────────────────────────────

const hypotheses: [string, string][] = [
  ['Unseasonal rain in Bangalore — 4 days of monsoon-like weather, model did not expect', 'Medium'],
  ['Possible competitor activity near STR-0034 — sustained -22% deviation over 9 days', 'Medium'],
  ['Cannibalization from PRD-000403 promo — competing SKU in same Biscuits subcategory', 'High'],
  ['Stockout cascade — substitution from out-of-stock parent SKU driving unplanned lift', 'High'],
  ['Early salary effect — corporate payday shifted to last working day of previous month', 'High'],
  ['Local event impact — 5K marathon near Powai store drove atypical morning demand', 'Low'],
  ['Supply disruption — supplier OTIF dropped to 62%, downstream demand spike observed', 'Medium'],
  ['Viral social content featuring product — TikTok/Reels effect on Gen-Z skewing SKU', 'Low'],
  ['Price scrape artefact — system recorded ₹0 for 3 hours, corrupted demand signal', 'High'],
  ['Heatwave effect — ambient temp 6°C above seasonal norm, Ice Cream +85% vs model', 'Medium'],
  ['New outlet opened 800m away — trading area demand redistributed', 'Medium'],
  ['Festival date mismatch — system calendar used incorrect regional Onam date', 'High'],
  ['Planogram revision caused shelf gap — demand lost to adjacent shelf position', 'Medium'],
  ['Phantom returns batch: 200 units processed twice due to WMS error', 'High'],
  ['Delivery crew training day — store received no replenishment, OOS for 11 hours', 'High'],
  ['Bulk purchase by catering company (wedding order) — not a consumer demand signal', 'Medium'],
  ['Data pipeline lag — 6-hour delay in POS data causing visible trough in intraday', 'High'],
  ['Regional holiday (Ugadi) not in model calendar — South stores all spiked', 'High'],
];
const anomalyStatuses = ['open', 'investigating', 'confirmed', 'dismissed'] as const;

const anomalies = Array.from({ length: 18 }, (_, i) => {
  const sku = SKUS[(i * 37 + 5) % SKUS.length];
  const [hyp, hypConf] = hypotheses[i % hypotheses.length];
  const detectedDaysAgo = randInt(1, 14);
  const deviation = (rng() > 0.5 ? 1 : -1) * randInt(18, 85);
  return { anomaly_id: `ANO-${String(i + 1).padStart(4, '0')}`, sku_id: sku.sku_id, store_ids: STORES.slice(i % 8, (i % 8) + randInt(1, 4)).map((s) => s.store_id), detected_date: addDays(ANCHOR_DATE, -detectedDaysAgo), deviation_pct: deviation, hypothesis: hyp, hypothesis_confidence: hypConf as 'High' | 'Medium' | 'Low', status: anomalyStatuses[i % anomalyStatuses.length] };
});

// ─── Structural Shifts ────────────────────────────────────────────────────────

const shiftHyps: [string, string][] = [
  ['baseline_up', '+18% permanent baseline lift after competitor closure in catchment area'],
  ['baseline_down', '-14% baseline erosion — new format (quick-commerce) cannibalising weekly top-up'],
  ['volatility_up', 'Demand variance 2.3x higher since promo frequency increased — harder to forecast'],
  ['seasonality_change', 'Ice Cream peak now starts 3 weeks earlier — climate shift effect'],
  ['baseline_up', '+22% structural lift after store renovation and expanded refrigerated shelf space'],
  ['baseline_down', '-11% demand drop after price repositioning premium ward upward'],
];

const structuralShifts = shiftHyps.map(([type, hyp], i) => {
  const sku = SKUS[(i * 41 + 7) % SKUS.length];
  return { shift_id: `SHF-${String(i + 1).padStart(4, '0')}`, sku_id: sku.sku_id, detected_date: addDays(ANCHOR_DATE, -randInt(15, 55)), shift_type: type, magnitude_pct: randInt(10, 25), sustained_days: randInt(18, 48), hypothesis: hyp };
});

// ─── KPIs ─────────────────────────────────────────────────────────────────────

const understockItems = actionItems.filter((a) => a.action_type === 'understock_risk' && a.days_to_impact <= 14);
const demand_at_risk_inr = understockItems.reduce((s, a) => s + (a.revenue_impact_inr as number), 0);
const demand_at_risk_sku_count = new Set(understockItems.map((a) => a.sku_id)).size;

const overstockItems = actionItems.filter((a) => a.action_type === 'overstock_risk');
const overstock_exposure_inr = Math.abs(overstockItems.reduce((s, a) => s + (a.revenue_impact_inr as number), 0));
const overstock_exposure_sku_count = new Set(overstockItems.map((a) => a.sku_id)).size;

// MAPE from aggregate series (last 30 days of history)
const last30Start = addDays(ANCHOR_DATE, -30);
let mapeSum = 0, mapeCount = 0;
for (const sku of SKUS) {
  for (const pt of SKU_SERIES.get(sku.sku_id) ?? []) {
    if (!pt.is_actual || pt.actual_units === null || pt.actual_units === 0) continue;
    if (pt.date < last30Start) continue;
    mapeSum += Math.abs((pt.forecast_units - pt.actual_units) / pt.actual_units);
    mapeCount++;
  }
}
const avgMape = mapeCount > 0 ? (mapeSum / mapeCount) * 100 : 15.9;
const forecast_accuracy_30d_pct = Math.round((100 - avgMape) * 10) / 10;

const accuracy_trend_4w = [3, 2, 1, 0].map((weeksAgo) => {
  const wStart = addDays(ANCHOR_DATE, -(weeksAgo + 1) * 7);
  const wEnd   = addDays(ANCHOR_DATE, -weeksAgo * 7 - 1);
  let wMapeSum = 0, wMapeCount = 0;
  for (const sku of SKUS) {
    for (const pt of SKU_SERIES.get(sku.sku_id) ?? []) {
      if (!pt.is_actual || pt.actual_units === null || pt.actual_units === 0) continue;
      if (pt.date < wStart || pt.date > wEnd) continue;
      wMapeSum += Math.abs((pt.forecast_units - pt.actual_units) / pt.actual_units);
      wMapeCount++;
    }
  }
  const wMape = wMapeCount > 0 ? (wMapeSum / wMapeCount) * 100 : 15.0 - weeksAgo * 0.3;
  return { week: `W${4 - weeksAgo} (${wStart.slice(5, 10)})`, accuracy_pct: Math.round((100 - wMape) * 10) / 10 };
});

const futureEvents = EVENTS_CONFIG.filter((e) => e.date > ANCHOR_DATE).sort((a, b) => a.date.localeCompare(b.date));
const nextEv = futureEvents[0];
const daysUntilNext = diffDays(ANCHOR_DATE, nextEv?.date ?? addDays(ANCHOR_DATE, 30));
const festivalSensitiveSKUs = SKUS.filter((s) => s.is_festival_sensitive).length;

const kpis = {
  demand_at_risk_inr: Math.round(demand_at_risk_inr),
  demand_at_risk_sku_count,
  overstock_exposure_inr: Math.round(overstock_exposure_inr),
  overstock_exposure_sku_count,
  next_event: {
    event_id: nextEv?.event_id ?? 'unknown',
    event_name: nextEv?.event_name ?? 'Unknown',
    days_until: daysUntilNext,
    skus_not_ramped: Math.min(festivalSensitiveSKUs, randInt(40, 65)),
  },
  forecast_accuracy_30d_pct,
  accuracy_trend_4w,
  demand_at_risk_trend_4w: [3, 2, 1, 0].map((i) => ({ week: `W${4 - i}`, value_inr: Math.round(demand_at_risk_inr * (0.75 + (3 - i) * 0.08)) })),
  overstock_trend_4w: [3, 2, 1, 0].map((i) => ({ week: `W${4 - i}`, value_inr: Math.round(overstock_exposure_inr * (0.9 + (3 - i) * 0.03)) })),
};

// ─── Model Meta (exact Databricks MLflow numbers) ─────────────────────────────

const deptMape: Record<string, { sum: number; count: number }> = {};
for (const sku of SKUS) {
  const dept = sku.department;
  if (!deptMape[dept]) deptMape[dept] = { sum: 0, count: 0 };
  for (const pt of SKU_SERIES.get(sku.sku_id) ?? []) {
    if (!pt.is_actual || pt.actual_units === null || pt.actual_units === 0) continue;
    if (pt.date < last30Start) continue;
    deptMape[dept].sum += Math.abs((pt.forecast_units - pt.actual_units) / pt.actual_units);
    deptMape[dept].count++;
  }
}

const modelMeta = {
  production_model: {
    name: 'demand_forecast_champion',
    version: 'v1',
    type: 'LightGBM Regressor',
    registry: 'Databricks MLflow',
    last_trained: '2026-04-15',
    test_mape: 0.15908,
    test_wmape: 0.1439,
    test_mae: 1.14293,
    test_rmse: 2.16967,
    test_bias: -0.01293,
    mape_pct_test: 15.9,
    mape_pct_last_30d: Math.round((100 - forecast_accuracy_30d_pct) * 10) / 10,
    bias_pct: -1.3,
  },
  accuracy_by_velocity: [
    { velocity_class: 'A' as const, mape_pct: 7.2 },
    { velocity_class: 'B' as const, mape_pct: 12.4 },
    { velocity_class: 'C' as const, mape_pct: 21.8 },
  ],
  accuracy_by_department: DEPARTMENTS.map((d, idx) => {
    const m = deptMape[d.name];
    const mape = m && m.count > 0 ? (m.sum / m.count) * 100 : 12 + idx * 2;
    return { department: d.name, mape_pct: Math.round(mape * 10) / 10, sku_count: SKUS.filter((s) => s.department === d.name).length };
  }),
  accuracy_trend_12w: Array.from({ length: 12 }, (_, i) => ({
    week: `W${i + 1}`, mape_pct: Math.round((15.9 + (rng() - 0.5) * 2.5) * 10) / 10,
  })),
  feature_importance_global: [
    { feature: 'rolling_28d_avg',   display_name: '28-day rolling average',   importance: 0.182 },
    { feature: 'lag_7d',            display_name: "Last week's demand",        importance: 0.148 },
    { feature: 'lag_14d',           display_name: 'Two weeks ago demand',      importance: 0.112 },
    { feature: 'dow_sin',           display_name: 'Day of week pattern',       importance: 0.098 },
    { feature: 'festival_intensity',display_name: 'Festival intensity score',  importance: 0.087 },
    { feature: 'days_to_festival',  display_name: 'Days to nearest festival',  importance: 0.072 },
    { feature: 'salary_week',       display_name: 'Salary week flag',          importance: 0.063 },
    { feature: 'price_to_mrp',      display_name: 'Price to MRP ratio',        importance: 0.055 },
    { feature: 'is_promo_active',   display_name: 'Active promo flag',         importance: 0.048 },
    { feature: 'monsoon_active',    display_name: 'Monsoon active flag',       importance: 0.038 },
    { feature: 'weather_temp',      display_name: 'Temperature (°C)',          importance: 0.034 },
    { feature: 'lag_364d',          display_name: 'Same day last year',        importance: 0.028 },
    { feature: 'trend_slope_28d',   display_name: '28-day trend slope',        importance: 0.022 },
    { feature: 'is_weekend',        display_name: 'Weekend flag',              importance: 0.012 },
    { feature: 'store_type_encoded',display_name: 'Store type encoding',       importance: 0.001 },
  ],
  drift_status: 'stable' as const,
  drift_last_checked: ANCHOR_DATE,
  challenger_note: 'Challenger model v4 (Ensemble) in shadow evaluation — current improvement +0.4pp MAPE, not yet promoted.',
};

// ─── Core payload ─────────────────────────────────────────────────────────────

const generatedAt = new Date().toISOString();

const corePayload = {
  market: 'india-v1' as const,
  generated_at: generatedAt,
  data_window: {
    history_start: HIST_START,
    history_end: addDays(ANCHOR_DATE, -1),
    forecast_start: ANCHOR_DATE,
    forecast_end: FORE_END,
  },
  skus: SKUS.map(({ sku_id, product_name, department, category, subcategory, velocity_class, perishability, price_inr, mrp_inr, margin_pct, is_weather_sensitive, is_festival_sensitive, launch_date }) => ({ sku_id, product_name, department, category, subcategory, velocity_class, perishability, price_inr, mrp_inr, margin_pct, is_weather_sensitive, is_festival_sensitive, launch_date })),
  stores: STORES,
  events: EVENTS_CONFIG,
  event_lifts: EVENT_LIFTS_CONFIG,
  sku_drivers: skuDrivers,
  category_plans: categoryPlans,
  action_items: actionItems,
  promos,
  launches,
  anomalies,
  structural_shifts: structuralShifts,
  kpis,
  model_meta: modelMeta,
  // top-30 SKU daily aggregate series for the SKU detail view
  daily_forecast_points,
};

// ─── PASS 2: Build precomputed.json ───────────────────────────────────────────

console.log('\nBuilding precomputed.json…');

const SKU_MAP = new Map(SKUS.map((s) => [s.sku_id, s]));

const DEPT_KEY_MAP: Record<string, string | null> = {
  'all':               null,
  'Grocery & Staples': 'Grocery & Staples',
  'Dairy & Frozen':    'Dairy & Frozen',
  'Beverages':         'Beverages',
  'Snacks & Biscuits': 'Snacks & Biscuits',
  'Personal Care':     'Personal Care',
};

const FORECAST_DATES = ALL_DATES.filter((d) => d >= ANCHOR_DATE);

const precomputed: Record<string, unknown> = {};

for (const [deptKey, deptName] of Object.entries(DEPT_KEY_MAP)) {
  const deptSKUs = deptName === null ? SKUS : SKUS.filter((s) => s.department === deptName);

  // Build per-SKU date→point lookup
  const seriesLookup = new Map<string, Map<string, AggPoint>>();
  for (const sku of deptSKUs) {
    const dateMap = new Map<string, AggPoint>();
    for (const pt of SKU_SERIES.get(sku.sku_id) ?? []) dateMap.set(pt.date, pt);
    seriesLookup.set(sku.sku_id, dateMap);
  }

  // Top 8 subcategories by forecast volume
  const subcatVol = new Map<string, number>();
  for (const sku of deptSKUs) {
    const vol = (SKU_SERIES.get(sku.sku_id) ?? []).filter((p) => !p.is_actual).reduce((s, p) => s + p.forecast_units, 0);
    subcatVol.set(sku.subcategory, (subcatVol.get(sku.subcategory) ?? 0) + vol);
  }
  const topSubcats = Array.from(subcatVol.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([s]) => s);

  // Top 5 SKUs by forecast volume
  const skuVol = new Map<string, number>();
  for (const sku of deptSKUs) {
    const vol = (SKU_SERIES.get(sku.sku_id) ?? []).filter((p) => !p.is_actual).reduce((s, p) => s + p.forecast_units, 0);
    skuVol.set(sku.sku_id, vol);
  }
  const top5Ids = Array.from(skuVol.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
  const top5Set = new Set(top5Ids);
  const topsku_ids = [...top5Ids, 'Others'];
  const topsku_names: Record<string, string> = { Others: 'Others' };
  for (const id of top5Ids) topsku_names[id] = (SKU_MAP.get(id)?.product_name ?? id).substring(0, 22);

  // subcat_chart
  const subcat_chart = ALL_DATES.map((date) => {
    const pt: Record<string, unknown> = { date, is_actual: date < ANCHOR_DATE, total: 0, lower_95: null, ci_range: null };
    for (const sub of topSubcats) pt[sub] = 0;
    let totalForecast = 0;
    for (const sku of deptSKUs) {
      const dp = seriesLookup.get(sku.sku_id)?.get(date);
      if (!dp) continue;
      const units = dp.is_actual ? (dp.actual_units ?? 0) : dp.forecast_units;
      if (topSubcats.includes(sku.subcategory)) pt[sku.subcategory] = ((pt[sku.subcategory] as number) ?? 0) + units;
      pt.total = (pt.total as number) + units;
      if (!dp.is_actual) totalForecast += dp.forecast_units;
    }
    if (date >= ANCHOR_DATE && totalForecast > 0) {
      pt.lower_95 = Math.max(0, totalForecast * 0.88);
      pt.ci_range = totalForecast * 0.24;
    }
    return pt;
  });

  // topsku_chart
  const topsku_chart = ALL_DATES.map((date) => {
    const pt: Record<string, unknown> = { date, is_actual: date < ANCHOR_DATE, total: 0, lower_95: null, ci_range: null };
    for (const id of topsku_ids) pt[id] = 0;
    let totalForecast = 0;
    for (const sku of deptSKUs) {
      const dp = seriesLookup.get(sku.sku_id)?.get(date);
      if (!dp) continue;
      const units = dp.is_actual ? (dp.actual_units ?? 0) : dp.forecast_units;
      const key = top5Set.has(sku.sku_id) ? sku.sku_id : 'Others';
      pt[key] = ((pt[key] as number) ?? 0) + units;
      pt.total = (pt.total as number) + units;
      if (!dp.is_actual) totalForecast += dp.forecast_units;
    }
    if (date >= ANCHOR_DATE && totalForecast > 0) {
      pt.lower_95 = Math.max(0, totalForecast * 0.88);
      pt.ci_range = totalForecast * 0.24;
    }
    return pt;
  });

  // sku_tables per horizon
  const sku_tables: Record<number, unknown[]> = {};
  for (const h of [7, 14, 28, 60]) {
    const hDates = FORECAST_DATES.slice(0, h);
    const hDateSet = new Set(hDates);

    const ranked = deptSKUs.map((sku) => {
      const rev = (SKU_SERIES.get(sku.sku_id) ?? [])
        .filter((p) => hDateSet.has(p.date) && !p.is_actual)
        .reduce((s, p) => s + p.forecast_units * sku.price_inr, 0);
      return { sku, rev };
    }).sort((a, b) => b.rev - a.rev).slice(0, 10);

    sku_tables[h] = ranked.map(({ sku, rev }) => {
      const dateMap = seriesLookup.get(sku.sku_id)!;
      const sparkline = hDates.map((d) => dateMap.get(d)?.forecast_units ?? 0);

      const recentActuals = (SKU_SERIES.get(sku.sku_id) ?? []).filter((p) => p.is_actual && p.actual_units !== null).slice(-7);
      const risk: { label: string; variant: string } = { label: 'On Track', variant: 'neutral' };
      if (recentActuals.length >= 3) {
        const sumA = recentActuals.reduce((s, p) => s + (p.actual_units ?? 0), 0);
        const sumF = recentActuals.reduce((s, p) => s + p.forecast_units, 0);
        if (sumF > 0) {
          const ratio = sumA / sumF;
          if (ratio < 0.8) { risk.label = 'Under-forecast risk'; risk.variant = 'warning'; }
          else if (ratio > 1.2) { risk.label = 'Over-forecast risk'; risk.variant = 'warning'; }
        }
      }

      return {
        sku: { sku_id: sku.sku_id, product_name: sku.product_name, department: sku.department, category: sku.category, subcategory: sku.subcategory, velocity_class: sku.velocity_class, perishability: sku.perishability, price_inr: sku.price_inr, mrp_inr: sku.mrp_inr, margin_pct: sku.margin_pct, is_weather_sensitive: sku.is_weather_sensitive, is_festival_sensitive: sku.is_festival_sensitive, launch_date: sku.launch_date },
        sparkline,
        revenue_at_stake: Math.round(rev),
        risk,
      };
    });
  }

  precomputed[deptKey] = { subcat_chart, subcategories: topSubcats, topsku_chart, topsku_ids, topsku_names: topsku_names, sku_tables };
  console.log(`  ${deptKey}: ${deptSKUs.length} SKUs, ${topSubcats.length} subcats, ${top5Ids.length} top SKUs`);
}

// ─── Write output files ───────────────────────────────────────────────────────

const CACHE_DIR = path.join(CACHE_ROOT, 'merch_demand');
const SKU_DETAIL_DIR = path.join(CACHE_DIR, 'sku_detail');
fs.mkdirSync(CACHE_DIR, { recursive: true });
fs.mkdirSync(SKU_DETAIL_DIR, { recursive: true });

const corePath = path.join(CACHE_DIR, 'core.json');
fs.writeFileSync(corePath, JSON.stringify(corePayload, null, 2), 'utf-8');

const precomputedPath = path.join(CACHE_DIR, 'precomputed.json');
fs.writeFileSync(precomputedPath, JSON.stringify(precomputed), 'utf-8');

// Write top-30 SKU detail files
console.log(`\nWriting ${TOP30_SKUS.length} SKU detail files…`);
for (const sku of TOP30_SKUS) {
  const series = SKU_SERIES.get(sku.sku_id) ?? [];
  const detail = {
    sku_id: sku.sku_id,
    product_name: sku.product_name,
    series: series.map((pt) => {
      const units = pt.is_actual ? (pt.actual_units ?? 0) : pt.forecast_units;
      return {
        date: pt.date,
        is_actual: pt.is_actual,
        actual_units: pt.actual_units,
        forecast_units: pt.forecast_units,
        lower_95: pt.lower_95,
        upper_95: pt.upper_95,
        revenue_inr: Math.round(units * sku.price_inr),
      };
    }),
  };
  fs.writeFileSync(path.join(SKU_DETAIL_DIR, `${sku.sku_id}.json`), JSON.stringify(detail), 'utf-8');
}

// ─── Summary ─────────────────────────────────────────────────────────────────

function fileSizeMB(p: string): string { return (fs.statSync(p).size / 1048576).toFixed(2); }
const genElapsed = ((Date.now() - GEN_START) / 1000).toFixed(1);

console.log('\nFiles written:');
console.log(`  cache/merch_demand/core.json         ${fileSizeMB(corePath)} MB`);
console.log(`  cache/merch_demand/precomputed.json  ${fileSizeMB(precomputedPath)} MB`);
console.log(`  cache/merch_demand/sku_detail/       ${TOP30_SKUS.length} files`);

const totalBytes = fs.statSync(corePath).size + fs.statSync(precomputedPath).size +
  TOP30_SKUS.reduce((s, sku) => s + fs.statSync(path.join(SKU_DETAIL_DIR, `${sku.sku_id}.json`)).size, 0);
console.log(`\nTotal size: ${(totalBytes / 1048576).toFixed(2)} MB`);
console.log(`Generation time: ${genElapsed}s`);
console.log(`\nSKUs: ${SKUS.length}, Stores: ${STORES.length}, Events: ${EVENTS_CONFIG.length}`);
console.log(`KPIs: forecast_accuracy_30d=${forecast_accuracy_30d_pct}%, demand_at_risk=₹${(demand_at_risk_inr / 1e5).toFixed(1)}L`);
