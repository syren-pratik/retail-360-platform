/**
 * Apparel Merchandise Demand data generator.
 * Spec: docs/apparel-merch-demand-spec.md
 *
 * Emits cache/apparel/merch_demand/{core,precomputed,insights}.json +
 * 32 cache/apparel/merch_demand/sku_detail/<id>.json shards.
 *
 * Field shapes mirror grocery (cache/merch_demand/*) for linter parity.
 * Numbers are USD-scale populated into *_inr field names per the locked
 * apparel-additive whitelist. See spec §9.2.
 *
 * Run: npx tsx scripts/gen-apparel-merch-demand.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// ────────────────────────────────────────────────────────────────────
// Seeded RNG (mulberry32) — deterministic
// ────────────────────────────────────────────────────────────────────
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED = 0xc1a7d3e4;
const rng = mulberry32(SEED);
const r = () => rng();
const rb = (lo: number, hi: number) => lo + r() * (hi - lo);
const ri = (lo: number, hi: number) => Math.floor(rb(lo, hi + 1));
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(r() * arr.length)];

// ────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────
const GEN_START = Date.now();
const ANCHOR_DATE = '2026-05-17';
const HIST_DAYS = 91;
const FORE_DAYS = 60;

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function diffDays(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00Z').getTime();
  const db = new Date(b + 'T00:00:00Z').getTime();
  return Math.round((db - da) / 86400000);
}
function dayOfWeek(iso: string): number {
  return new Date(iso + 'T00:00:00Z').getUTCDay();
}

const HIST_START = addDays(ANCHOR_DATE, -HIST_DAYS);
const FORE_END = addDays(ANCHOR_DATE, FORE_DAYS - 1);

// ────────────────────────────────────────────────────────────────────
// Apparel dimensions
// ────────────────────────────────────────────────────────────────────
const DEPARTMENTS = ['Mens', 'Womens', 'Kids', 'Footwear', 'Accessories'];

const DEPT_SUBCATS: Record<string, string[]> = {
  Mens: ['Tees', 'Denim', 'Outerwear', 'Tops', 'Activewear', 'Underwear & Socks', 'Swim'],
  Womens: ['Tops', 'Dresses', 'Bottoms', 'Outerwear', 'Activewear', 'Intimates', 'Swim'],
  Kids: ['Boys Tops', 'Boys Bottoms', 'Girls Tops', 'Girls Dresses', 'Baby', 'School Uniform', 'Activewear'],
  Footwear: ['Mens Sneaker', 'Womens Sneaker', 'Mens Dress', 'Womens Dress', 'Kids Sneaker', 'Sandal', 'Boot'],
  Accessories: ['Handbag', 'Belt', 'Wallet', 'Jewelry', 'Hat', 'Scarf', 'Sock', 'Backpack'],
};

const BRANDS = ['Nike', 'Levi', 'Lululemon', 'VF Corp', 'PVH', 'Tapestry', 'Under Armour', 'Adidas', 'Hanesbrands', 'Carter', 'New Balance', 'Gap'];
const BRAND_TIERS = ['national', 'pl_essentials', 'pl_premium'] as const;

const SEASON_TAGS = ['core', 'spring', 'summer', 'fall', 'holiday', 'transitional'] as const;
const LIFE_STAGES = ['intro', 'growth', 'peak', 'decline', 'markdown', 'eol'] as const;
const WEATHER_SENS = ['outerwear_cold', 'boots_cold', 'swim_heat', 'sandals_heat', 'tees_heat', 'sweater_cold', 'rain_gear', 'none'] as const;
const DCS = ['Reno', 'Memphis', 'Allentown', 'Atlanta'] as const;
const COLORS = ['Black', 'White', 'Cream', 'Navy', 'Olive', 'Burgundy', 'Stone', 'Charcoal', 'Indigo', 'Heather Grey', 'Brick', 'Forest', 'Mustard', 'Cobalt', 'Blush', 'Camel', 'Plum', 'Sage'];

const RETURNS_BY_SUBCAT: Record<string, number> = {
  Dresses: 22, Denim: 17, 'Girls Dresses': 18,
  'Mens Sneaker': 16, 'Womens Sneaker': 16, 'Kids Sneaker': 14, 'Mens Dress': 14, 'Womens Dress': 16,
  Sandal: 12, Boot: 14, Outerwear: 12, Tops: 11, Tees: 8, Bottoms: 16,
  Activewear: 10, Swim: 14, 'Underwear & Socks': 4, Intimates: 4,
  'Boys Tops': 9, 'Boys Bottoms': 11, 'Girls Tops': 10, Baby: 9, 'School Uniform': 8,
  Handbag: 7, Belt: 5, Wallet: 4, Jewelry: 8, Hat: 6, Scarf: 5, Sock: 4, Backpack: 7,
};

// Apparel size sets (used for size_curve)
const SIZE_SETS: Record<string, string[]> = {
  mens_tops: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
  mens_bottoms: ['28×30', '30×30', '30×32', '32×30', '32×32', '32×34', '34×30', '34×32', '34×34', '36×32', '38×32'],
  womens_tops: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'],
  womens_bottoms: ['00', '0', '2', '4', '6', '8', '10', '12', '14', '16'],
  womens_dresses: ['XXS', 'XS', 'S', 'M', 'L', 'XL'],
  kids: ['12M', '18M', '24M', '2T', '3T', '4T', '5', '6', '7', '8', '10', '12', '14', '16'],
  footwear_m: ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13'],
  footwear_w: ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '11'],
  footwear_k: ['10C', '11C', '12C', '13C', '1Y', '2Y', '3Y', '4Y', '5Y', '6Y'],
  os: ['OS'],
};

function sizeSetFor(dept: string, subcat: string): string[] {
  if (dept === 'Mens' && /denim|bottoms/i.test(subcat)) return SIZE_SETS.mens_bottoms;
  if (dept === 'Mens') return SIZE_SETS.mens_tops;
  if (dept === 'Womens' && /dress/i.test(subcat)) return SIZE_SETS.womens_dresses;
  if (dept === 'Womens' && /bottom|denim/i.test(subcat)) return SIZE_SETS.womens_bottoms;
  if (dept === 'Womens') return SIZE_SETS.womens_tops;
  if (dept === 'Kids') return SIZE_SETS.kids;
  if (dept === 'Footwear' && /mens/i.test(subcat)) return SIZE_SETS.footwear_m;
  if (dept === 'Footwear' && /womens/i.test(subcat)) return SIZE_SETS.footwear_w;
  if (dept === 'Footwear' && /kids/i.test(subcat)) return SIZE_SETS.footwear_k;
  if (dept === 'Footwear') return SIZE_SETS.footwear_m;
  return SIZE_SETS.os;
}

function buildSizeCurve(sizes: string[]): { size: string; share_pct: number }[] {
  // Bell-curve normalized to 100
  const n = sizes.length;
  if (n === 1) return [{ size: sizes[0], share_pct: 100 }];
  const center = Math.floor(n / 2);
  const sigma = Math.max(1.0, n / 4);
  const raw = sizes.map((_, i) => Math.exp(-Math.pow((i - center) / sigma, 2) / 2));
  const sum = raw.reduce((s, v) => s + v, 0);
  return sizes.map((s, i) => ({ size: s, share_pct: Math.round((raw[i] / sum) * 1000) / 10 }));
}

// ────────────────────────────────────────────────────────────────────
// Apparel events (US calendar)
// ────────────────────────────────────────────────────────────────────
const EVENTS_RAW: { id: string; name: string; type: string; start: string; end: string; date: string; lift: number; significance: string }[] = [
  { id: 'mlk-2026', name: 'MLK Weekend', type: 'national', start: '2026-01-16', end: '2026-01-19', date: '2026-01-19', lift: 1.3, significance: 'Outerwear clearance peak' },
  { id: 'valentines-2026', name: "Valentine's Day", type: 'national', start: '2026-02-10', end: '2026-02-14', date: '2026-02-14', lift: 1.4, significance: 'Womens dressy + accessories' },
  { id: 'presidents-2026', name: 'Presidents Day', type: 'national', start: '2026-02-13', end: '2026-02-16', date: '2026-02-16', lift: 1.5, significance: 'Mens denim event' },
  { id: 'stpaddy-2026', name: "St Patrick's Day", type: 'national', start: '2026-03-14', end: '2026-03-17', date: '2026-03-17', lift: 1.15, significance: 'Themed graphic tees' },
  { id: 'easter-2026', name: 'Easter', type: 'religious', start: '2026-03-22', end: '2026-04-05', date: '2026-04-05', lift: 1.8, significance: 'Kids Sunday-best dresses' },
  { id: 'mothers-2026', name: "Mother's Day", type: 'national', start: '2026-05-04', end: '2026-05-10', date: '2026-05-10', lift: 1.6, significance: 'Womens gifting + accessories' },
  { id: 'memorial-2026', name: 'Memorial Day', type: 'national', start: '2026-05-22', end: '2026-05-25', date: '2026-05-25', lift: 2.1, significance: 'Swim + outdoor' },
  { id: 'fathers-2026', name: "Father's Day", type: 'national', start: '2026-06-15', end: '2026-06-21', date: '2026-06-21', lift: 1.5, significance: 'Mens gifting' },
  { id: 'july4-2026', name: 'July 4', type: 'national', start: '2026-07-01', end: '2026-07-07', date: '2026-07-04', lift: 2.4, significance: 'Americana tees + swim' },
  { id: 'bts-2026', name: 'Back-to-School', type: 'national', start: '2026-07-15', end: '2026-09-05', date: '2026-08-15', lift: 2.8, significance: 'Largest non-holiday event' },
  { id: 'labor-2026', name: 'Labor Day', type: 'national', start: '2026-09-05', end: '2026-09-07', date: '2026-09-07', lift: 1.6, significance: 'Transitional outerwear' },
  { id: 'columbus-2026', name: 'Columbus Day', type: 'national', start: '2026-10-10', end: '2026-10-12', date: '2026-10-12', lift: 1.25, significance: 'Fall sale' },
  { id: 'halloween-2026', name: 'Halloween', type: 'national', start: '2026-10-15', end: '2026-10-31', date: '2026-10-31', lift: 1.3, significance: 'Kids costume-prep traffic' },
  { id: 'veterans-2026', name: 'Veterans Day', type: 'national', start: '2026-11-09', end: '2026-11-11', date: '2026-11-11', lift: 1.2, significance: 'National sale' },
  { id: 'thanksgiving-2026', name: 'Thanksgiving', type: 'national', start: '2026-11-25', end: '2026-11-26', date: '2026-11-26', lift: 1.5, significance: 'Pre-BFCM ramp' },
  { id: 'bfcm-2026', name: 'BFCM', type: 'national', start: '2026-11-27', end: '2026-11-30', date: '2026-11-27', lift: 3.1, significance: 'Year peak' },
  { id: 'cyber-2026', name: 'Cyber Monday', type: 'national', start: '2026-11-30', end: '2026-11-30', date: '2026-11-30', lift: 2.6, significance: 'Online peak' },
  { id: 'holiday-2026', name: 'Holiday/Christmas', type: 'religious', start: '2026-12-01', end: '2026-12-24', date: '2026-12-24', lift: 1.9, significance: 'Sustained gifting' },
  { id: 'xmas-eve-2026', name: 'Christmas Eve', type: 'religious', start: '2026-12-23', end: '2026-12-24', date: '2026-12-24', lift: 1.6, significance: 'Last-minute' },
  { id: 'boxing-2026', name: 'Boxing Day', type: 'national', start: '2026-12-26', end: '2026-12-31', date: '2026-12-26', lift: 1.7, significance: 'Post-holiday clearance' },
  { id: 'nye-2026', name: 'NYE', type: 'national', start: '2026-12-30', end: '2026-12-31', date: '2026-12-31', lift: 2.2, significance: 'Dressy occasion' },
  { id: 'local-warehouse-2026', name: 'Warehouse Reset', type: 'regional', start: '2026-04-12', end: '2026-04-14', date: '2026-04-13', lift: 1.1, significance: 'Internal allocation event' },
];

// ────────────────────────────────────────────────────────────────────
// SKUs (200)
// ────────────────────────────────────────────────────────────────────
interface SKU {
  sku_id: string;
  product_name: string;
  department: string;
  category: string;
  subcategory: string;
  velocity_class: 'A' | 'B' | 'C';
  perishability: 'non_perishable';
  price_inr: number;
  mrp_inr: number;
  margin_pct: number;
  is_weather_sensitive: boolean;
  is_festival_sensitive: boolean;
  launch_date: string;
  // apparel-additive
  brand: string;
  brand_tier: 'national' | 'pl_essentials' | 'pl_premium';
  season_tag: string;
  size_curve: { size: string; share_pct: number }[];
  color_mix_top3: { color: string; share_pct: number }[];
  weather_sensitivity: typeof WEATHER_SENS[number];
  returns_rate_pct: number;
  gross_forecast_units_14d: number;
  net_forecast_units_14d: number;
  life_stage: typeof LIFE_STAGES[number];
  life_stage_history: { date: string; stage: string }[];
  cold_start: null | { lookalike_sku_id: string; attribute_prior_units: number; blend_weight: number; confidence: 'low' | 'medium' | 'high' };
  dc_assignment: typeof DCS[number];
  ragm_pct: number;
  markdown_pressure_pct: number;
}

const STYLE_PREFIXES: Record<string, string[]> = {
  Mens: ['Performance', 'Classic', 'Vintage', 'Modern', 'Heritage', 'Tech', 'Essential'],
  Womens: ['Boho', 'Essential', 'Premium', 'Statement', 'Everyday', 'Refined', 'Pleated'],
  Kids: ['Play', 'Classic', 'Soft', 'Tough', 'Sunshine', 'Cozy'],
  Footwear: ['Court', 'Trail', 'Street', 'Performance', 'Daily', 'All-Day'],
  Accessories: ['Carry', 'Daily', 'Signature', 'Travel', 'Pocket'],
};

function brandTierMix(): 'national' | 'pl_essentials' | 'pl_premium' {
  const x = r();
  if (x < 0.62) return 'national';
  if (x < 0.85) return 'pl_essentials';
  return 'pl_premium';
}

function weatherFor(dept: string, subcat: string): typeof WEATHER_SENS[number] {
  if (/outerwear/i.test(subcat)) return 'outerwear_cold';
  if (/sweater/i.test(subcat)) return 'sweater_cold';
  if (/boot/i.test(subcat)) return 'boots_cold';
  if (/swim/i.test(subcat)) return 'swim_heat';
  if (/sandal/i.test(subcat)) return 'sandals_heat';
  if (/tees/i.test(subcat)) return r() < 0.25 ? 'tees_heat' : 'none';
  return 'none';
}

const SKUS: SKU[] = [];
let skuIdx = 0;
for (const dept of DEPARTMENTS) {
  const subcats = DEPT_SUBCATS[dept];
  const skusInDept = dept === 'Mens' ? 56 : dept === 'Womens' ? 60 : dept === 'Kids' ? 32 : dept === 'Footwear' ? 32 : 20;
  for (let i = 0; i < skusInDept; i++) {
    skuIdx++;
    const subcat = pick(subcats);
    const prefix = pick(STYLE_PREFIXES[dept] ?? STYLE_PREFIXES.Mens);
    const brand = pick(BRANDS);
    const brand_tier = brandTierMix();
    const price = Math.round((22 + r() * 95) * 100) / 100;
    const mrp = Math.round(price * (1.1 + r() * 0.35) * 100) / 100;
    const margin = Math.round((45 + r() * 22) * 10) / 10;
    const sizes = sizeSetFor(dept, subcat);
    const returns = (RETURNS_BY_SUBCAT[subcat] ?? 9) + Math.round((r() - 0.5) * 4);
    const gross_14d = Math.round(80 + r() * 420);
    const launchOffsetDays = -ri(7, 300);
    const launch_date = addDays(ANCHOR_DATE, launchOffsetDays);
    const daysSinceLaunch = -launchOffsetDays;
    const life_stage = daysSinceLaunch < 28 ? 'intro'
      : daysSinceLaunch < 84 ? 'growth'
      : daysSinceLaunch < 180 ? (r() < 0.6 ? 'peak' : 'growth')
      : daysSinceLaunch < 260 ? (r() < 0.5 ? 'decline' : 'peak')
      : r() < 0.4 ? 'markdown' : 'eol';
    const isColdStart = daysSinceLaunch < 14;
    SKUS.push({
      sku_id: `APR-${dept.substring(0, 2).toUpperCase()}-${String(skuIdx).padStart(4, '0')}`,
      product_name: `${prefix} ${subcat.split(' ')[0]} ${dept === 'Footwear' ? 'Shoe' : dept === 'Accessories' ? '' : 'Style'} ${String(skuIdx).padStart(3, '0')}`.trim(),
      department: dept,
      category: subcat,
      subcategory: subcat,
      velocity_class: r() < 0.2 ? 'A' : r() < 0.5 ? 'B' : 'C',
      perishability: 'non_perishable',
      price_inr: price,
      mrp_inr: mrp,
      margin_pct: margin,
      is_weather_sensitive: weatherFor(dept, subcat) !== 'none',
      is_festival_sensitive: r() < 0.55,
      launch_date,
      brand,
      brand_tier,
      season_tag: pick(SEASON_TAGS),
      size_curve: buildSizeCurve(sizes),
      color_mix_top3: [
        { color: pick(COLORS), share_pct: Math.round(rb(35, 55)) },
        { color: pick(COLORS), share_pct: Math.round(rb(20, 35)) },
        { color: pick(COLORS), share_pct: Math.round(rb(10, 25)) },
      ],
      weather_sensitivity: weatherFor(dept, subcat),
      returns_rate_pct: Math.max(2, returns),
      gross_forecast_units_14d: gross_14d,
      net_forecast_units_14d: Math.round(gross_14d * (1 - Math.max(2, returns) / 100)),
      life_stage,
      life_stage_history: [{ date: launch_date, stage: 'intro' }, { date: addDays(launch_date, 28), stage: 'growth' }],
      cold_start: isColdStart ? {
        lookalike_sku_id: `APR-${dept.substring(0, 2).toUpperCase()}-${String(ri(1, Math.max(1, skuIdx - 1))).padStart(4, '0')}`,
        attribute_prior_units: Math.round(gross_14d * 0.6),
        blend_weight: 0.7,
        confidence: 'medium',
      } : null,
      dc_assignment: DCS[ri(0, 3)],
      ragm_pct: Math.round((30 + r() * 20) * 10) / 10,
      markdown_pressure_pct: Math.round(r() * 60),
    });
  }
}

const SKU_MAP = new Map(SKUS.map((s) => [s.sku_id, s]));

// ────────────────────────────────────────────────────────────────────
// Stores (30 across US metros)
// ────────────────────────────────────────────────────────────────────
const US_METROS = [
  { city: 'New York', state: 'NY', region: 'Northeast', tier: 1 as const },
  { city: 'Los Angeles', state: 'CA', region: 'West', tier: 1 as const },
  { city: 'Chicago', state: 'IL', region: 'Midwest', tier: 1 as const },
  { city: 'Dallas', state: 'TX', region: 'South', tier: 1 as const },
  { city: 'Houston', state: 'TX', region: 'South', tier: 1 as const },
  { city: 'Atlanta', state: 'GA', region: 'South', tier: 1 as const },
  { city: 'Boston', state: 'MA', region: 'Northeast', tier: 1 as const },
  { city: 'Seattle', state: 'WA', region: 'West', tier: 1 as const },
  { city: 'Denver', state: 'CO', region: 'West', tier: 2 as const },
  { city: 'Miami', state: 'FL', region: 'South', tier: 2 as const },
  { city: 'Minneapolis', state: 'MN', region: 'Midwest', tier: 2 as const },
  { city: 'Phoenix', state: 'AZ', region: 'West', tier: 2 as const },
];

const STORE_TYPES = ['flagship', 'mall', 'outlet', 'urban', 'popup'] as const;
const STORE_TYPE_FACTOR: Record<string, number> = { flagship: 1.6, mall: 1.0, outlet: 0.85, urban: 1.2, popup: 0.55 };

interface Store {
  store_id: string;
  store_name: string;
  region: string;
  state: string;
  city: string;
  tier: 1 | 2 | 3;
  store_type: string;
  channels: string[];
}
const STORES: Store[] = [];
for (let i = 0; i < 30; i++) {
  const m = US_METROS[i % US_METROS.length];
  const store_type = STORE_TYPES[i % STORE_TYPES.length];
  STORES.push({
    store_id: `STR-${String(i + 1).padStart(4, '0')}`,
    store_name: `${m.city} ${store_type.charAt(0).toUpperCase() + store_type.slice(1)} ${Math.floor(i / US_METROS.length) + 1}`,
    region: m.region,
    state: m.state,
    city: m.city,
    tier: m.tier,
    store_type,
    channels: store_type === 'popup' ? ['In-Store'] : ['In-Store', 'Online', 'BOPIS'],
  });
}

// ────────────────────────────────────────────────────────────────────
// Events array (canonical schema with apparel data)
// ────────────────────────────────────────────────────────────────────
const events = EVENTS_RAW.map((e) => ({
  event_id: e.id,
  event_name: e.name,
  event_type: e.type,
  date: e.date,
  window_start: e.start,
  window_end: e.end,
  regions_affected: [] as string[],
  cultural_significance: e.significance,
  typical_prep_days: ri(7, 21),
  market: 'apparel_us',
}));

// event_lifts: per event × department
const event_lifts: any[] = [];
for (const ev of EVENTS_RAW) {
  for (const dept of DEPARTMENTS) {
    const lift = Math.round((ev.lift * (0.85 + r() * 0.35)) * 10) / 10;
    event_lifts.push({
      event_id: ev.id,
      category: dept,
      expected_lift_pct: Math.round((lift - 1) * 100),
      peak_offset_days: ri(-5, 0),
      historical_lifts: [
        { year: 2025, actual_lift_pct: Math.round((lift - 1) * 100) + ri(-15, 12) },
        { year: 2024, actual_lift_pct: Math.round((lift - 1) * 100) + ri(-10, 18) },
        { year: 2023, actual_lift_pct: Math.round((lift - 1) * 100) + ri(-20, 8) },
      ],
    });
  }
}

// ────────────────────────────────────────────────────────────────────
// Forecast series — daily, simple seasonal+trend+noise
// ────────────────────────────────────────────────────────────────────
const ALL_DATES: string[] = [];
for (let i = -HIST_DAYS; i < FORE_DAYS; i++) {
  ALL_DATES.push(addDays(ANCHOR_DATE, i));
}

interface DailyPoint {
  date: string;
  is_actual: boolean;
  is_forecast: boolean;
  actual_units: number | null;
  forecast_units: number;
  lower_95: number;
  upper_95: number;
  lower_80: number;
  upper_80: number;
  revenue_inr: number;
}

const SKU_SERIES = new Map<string, DailyPoint[]>();

function eventLiftOnDate(iso: string, dept: string): number {
  let mult = 1.0;
  for (const ev of EVENTS_RAW) {
    if (iso >= ev.start && iso <= ev.end) {
      // dampen by 0.3 to avoid stacking
      mult *= 1 + (ev.lift - 1) * 0.3;
    }
  }
  return mult;
}

const DOW_FACTOR = [1.18, 0.95, 0.92, 0.95, 1.0, 1.15, 1.25]; // Sun..Sat

for (const sku of SKUS) {
  const series: DailyPoint[] = [];
  const baseDaily = Math.max(2, sku.gross_forecast_units_14d / 14);
  const launchIdx = ALL_DATES.findIndex((d) => d >= sku.launch_date);
  for (let i = 0; i < ALL_DATES.length; i++) {
    const date = ALL_DATES[i];
    if (launchIdx === -1 || i < launchIdx) {
      series.push({ date, is_actual: i < HIST_DAYS, is_forecast: i >= HIST_DAYS, actual_units: i < HIST_DAYS ? 0 : null, forecast_units: 0, lower_95: 0, upper_95: 0, lower_80: 0, upper_80: 0, revenue_inr: 0 });
      continue;
    }
    const dow = dayOfWeek(date);
    const eventMult = eventLiftOnDate(date, sku.department);
    const trend = 1 + (i - HIST_DAYS) * 0.0008;
    const noise = 0.85 + r() * 0.3;
    const forecast = Math.max(0, Math.round(baseDaily * DOW_FACTOR[dow] * eventMult * trend * noise));
    const isActual = i < HIST_DAYS;
    const actual = isActual ? Math.max(0, Math.round(forecast * (0.82 + r() * 0.36))) : null;
    const ci80 = Math.round(forecast * 0.18);
    const ci95 = Math.round(forecast * 0.32);
    series.push({
      date,
      is_actual: isActual,
      is_forecast: !isActual,
      actual_units: actual,
      forecast_units: forecast,
      lower_95: Math.max(0, forecast - ci95),
      upper_95: forecast + ci95,
      lower_80: Math.max(0, forecast - ci80),
      upper_80: forecast + ci80,
      revenue_inr: Math.round((isActual ? actual ?? 0 : forecast) * sku.price_inr),
    });
  }
  SKU_SERIES.set(sku.sku_id, series);
}

// ────────────────────────────────────────────────────────────────────
// daily_forecast_points: aggregate by date across SKUs (sampled to limit size)
// ────────────────────────────────────────────────────────────────────
const allVols = SKUS.map((s) => {
  const series = SKU_SERIES.get(s.sku_id) ?? [];
  const totalUnits = series.reduce((sum, p) => sum + (p.actual_units ?? p.forecast_units), 0);
  return { sku: s, totalUnits };
}).sort((a, b) => b.totalUnits - a.totalUnits);

const TOP30_SKUS = allVols.slice(0, 30).map((x) => x.sku);
const COLD_START_SKUS = SKUS.filter((s) => s.cold_start).slice(0, 2);
const DETAIL_SKUS = [...TOP30_SKUS, ...COLD_START_SKUS];

const daily_forecast_points: any[] = [];
for (const sku of TOP30_SKUS.slice(0, 15)) {
  const series = SKU_SERIES.get(sku.sku_id) ?? [];
  for (const p of series) {
    daily_forecast_points.push({
      sku_id: sku.sku_id,
      store_id: 'ALL',
      date: p.date,
      is_actual: p.is_actual,
      actual_units: p.actual_units,
      forecast_units: p.forecast_units,
      lower_95: p.lower_95,
      upper_95: p.upper_95,
      lower_80: p.lower_80,
      upper_80: p.upper_80,
      revenue_inr: p.revenue_inr,
      confidence: p.is_actual ? 'High' : (Math.abs(diffDays(ANCHOR_DATE, p.date)) < 14 ? 'High' : 'Medium'),
    });
  }
}

// ────────────────────────────────────────────────────────────────────
// SKU drivers (top 20)
// ────────────────────────────────────────────────────────────────────
const DRIVERS_POOL = [
  { feature: 'rolling_28d_avg', display_name: '28-day rolling average' },
  { feature: 'bts_lift', display_name: 'Back-to-School event lift' },
  { feature: 'bfcm_lift', display_name: 'BFCM peak lift' },
  { feature: 'weather_overlay', display_name: 'Weather overlay (temp anomaly)' },
  { feature: 'size_curve_skew', display_name: 'Size-curve skew' },
  { feature: 'brand_promo_co_op', display_name: 'Brand co-op promo' },
  { feature: 'pl_substitution', display_name: 'PL substitution effect' },
  { feature: 'competitor_event', display_name: 'Competitor promo event' },
  { feature: 'cold_start_lookalike', display_name: 'Cold-start lookalike donor' },
  { feature: 'returns_drag', display_name: 'Returns drag (net adjustment)' },
];

const sku_drivers = TOP30_SKUS.slice(0, 20).map((sku) => ({
  sku_id: sku.sku_id,
  store_id: 'ALL',
  as_of_date: ANCHOR_DATE,
  horizon_days: 14,
  top_drivers: Array.from({ length: 5 }).map((_, i) => {
    const d = DRIVERS_POOL[(i + Math.floor(r() * 4)) % DRIVERS_POOL.length];
    return {
      feature: d.feature,
      display_name: d.display_name,
      contribution_pct: Math.round((20 + r() * 30) * (i === 0 ? 1 : 0.7)),
      direction: r() < 0.65 ? 'positive' : 'negative',
    };
  }),
}));

// ────────────────────────────────────────────────────────────────────
// Category plans (dept × subcat × quarter)
// ────────────────────────────────────────────────────────────────────
const category_plans: any[] = [];
const plan_vs_actual: any[] = [];
for (const dept of DEPARTMENTS) {
  for (const subcat of DEPT_SUBCATS[dept]) {
    const planRev = Math.round((180_000 + r() * 1_600_000));
    const actual = Math.round(planRev * (0.42 + r() * 0.45));
    const fcRem = Math.round(planRev * (0.95 + r() * 0.18));
    const variance = Math.round(((fcRem - planRev) / planRev) * 100);
    const plan = {
      department: dept,
      category: subcat,
      subcategory: subcat,
      quarter: 'Q2-2026',
      plan_revenue_inr: planRev,
      forecast_to_end_inr: fcRem,
      actual_to_date_inr: actual,
      variance_pct: variance,
      status: variance > 5 ? 'ahead' : variance < -5 ? 'behind' : 'on_track',
      // apparel-additive
      brand_mix: BRANDS.slice(0, 3).map((b) => ({ brand: b, share_pct: Math.round(15 + r() * 25) })),
      size_curve_health: r() < 0.7 ? 'green' : r() < 0.9 ? 'amber' : 'red',
      weather_sensitive: /outerwear|swim|boot|sandal/i.test(subcat),
      net_to_gross_ratio: Math.round((0.78 + r() * 0.15) * 100) / 100,
      pl_pen_target_pct: 28,
      pl_pen_actual_pct: Math.round((22 + r() * 14) * 10) / 10,
    };
    category_plans.push(plan);
    plan_vs_actual.push({
      department: dept,
      category: subcat,
      subcategory: subcat,
      quarter: 'Q2-2026',
      plan_revenue_inr: planRev,
      actual_revenue_inr: actual,
      forecast_to_end_inr: fcRem,
      variance_pct: variance,
      status: variance > 5 ? 'ahead' : variance < -5 ? 'behind' : 'on_track',
    });
  }
}

// ────────────────────────────────────────────────────────────────────
// Action items (53 to match grocery count)
// ────────────────────────────────────────────────────────────────────
const action_items: any[] = [];
for (let i = 0; i < 53; i++) {
  const sku = pick(TOP30_SKUS);
  const cluster = STORES.slice(ri(0, 25), ri(26, 30));
  action_items.push({
    action_id: `ACT-${String(i + 1).padStart(4, '0')}`,
    sku_id: sku.sku_id,
    store_scope: {
      type: 'cluster',
      store_ids: cluster.map((s) => s.store_id),
      label: `${cluster[0]?.city ?? 'Network'} cluster`,
    },
    action_type: pick(['understock_risk', 'overstock_risk', 'forecast_drift', 'cold_start_review', 'returns_spike']),
    context: 'Demand variance detected vs forecast band',
    recommendation: pick(['Expedite replenishment', 'Trigger markdown', 'Review forecast', 'Reassign DC', 'Confirm cold-start donor']),
    confidence: pick(['high', 'medium', 'low']),
    revenue_impact_inr: Math.round(8_000 + r() * 90_000),
    days_to_impact: ri(1, 14),
    created_at: addDays(ANCHOR_DATE, -ri(0, 14)),
  });
}

// ────────────────────────────────────────────────────────────────────
// Promos (31 to match grocery)
// ────────────────────────────────────────────────────────────────────
const PROMO_TYPES = ['Flat %', 'BOGO', 'Bundle', 'Cashback'] as const;
const promos = Array.from({ length: 31 }).map((_, i) => {
  const skuPicks = Array.from({ length: 3 + ri(0, 2) }).map(() => pick(SKUS).sku_id);
  const startOffset = ri(-30, 30);
  const start = addDays(ANCHOR_DATE, startOffset);
  const end = addDays(start, ri(5, 14));
  return {
    promo_id: `PRM-${String(i + 1).padStart(3, '0')}`,
    sku_ids: skuPicks,
    promo_type: pick(PROMO_TYPES),
    discount_depth_pct: ri(15, 50),
    start_date: start,
    end_date: end,
    status: startOffset < 0 && diffDays(start, ANCHOR_DATE) <= diffDays(start, end) ? 'active' : startOffset < 0 ? 'ended' : 'planned',
    target_lift_pct: ri(20, 65),
    actual_lift_pct: ri(15, 60),
    cannibalization_pct: Math.round(rb(6, 22) * 10) / 10,
    performance_status: pick(['on_target', 'above_target', 'below_target']),
    recommendation: pick(['Continue', 'Extend depth', 'Reduce cannibalization', 'End early']),
  };
});

// ────────────────────────────────────────────────────────────────────
// Launches (15)
// ────────────────────────────────────────────────────────────────────
const launches = SKUS.filter((s) => s.life_stage === 'intro' || s.life_stage === 'growth').slice(0, 15).map((sku, i) => ({
  launch_id: `LCH-${String(i + 1).padStart(3, '0')}`,
  sku_id: sku.sku_id,
  launch_date: sku.launch_date,
  days_in_market: diffDays(sku.launch_date, ANCHOR_DATE),
  target_units_30d: Math.round(sku.gross_forecast_units_14d * 2.2),
  actual_units_30d: Math.round(sku.gross_forecast_units_14d * (1.8 + r() * 0.8)),
  target_units_90d: Math.round(sku.gross_forecast_units_14d * 6.5),
  actual_units_90d: diffDays(sku.launch_date, ANCHOR_DATE) >= 90 ? Math.round(sku.gross_forecast_units_14d * (5 + r() * 3)) : null,
  performance_status: pick(['on_plan', 'ahead', 'lagging']),
  recommendation: pick(['Maintain', 'Broaden distribution', 'Deepen size runs', 'Add PL sibling', 'Review markdown timing']),
}));

// ────────────────────────────────────────────────────────────────────
// Anomalies (18) + structural shifts (6)
// ────────────────────────────────────────────────────────────────────
const anomalies = Array.from({ length: 18 }).map((_, i) => {
  const sku = pick(SKUS);
  return {
    anomaly_id: `ANO-${String(i + 1).padStart(4, '0')}`,
    sku_id: sku.sku_id,
    store_ids: STORES.slice(0, ri(2, 6)).map((s) => s.store_id),
    detected_date: addDays(ANCHOR_DATE, -ri(0, 14)),
    deviation_pct: ri(-35, 35),
    hypothesis: pick([
      'Unseasonal heat wave in Northeast — outerwear demand soft',
      'Competitor promo pulled traffic from Mens Denim',
      'BTS shopping started 8 days earlier than 5yr average',
      'Returns spike post-Memorial Day promo',
      'Cold-start donor mismatched for new Footwear style',
    ]),
    hypothesis_confidence: pick(['high', 'medium', 'low']),
    status: pick(['open', 'investigating', 'resolved']),
  };
});

const structural_shifts = Array.from({ length: 6 }).map((_, i) => {
  const sku = pick(SKUS);
  return {
    shift_id: `SHF-${String(i + 1).padStart(4, '0')}`,
    sku_id: sku.sku_id,
    detected_date: addDays(ANCHOR_DATE, -ri(14, 60)),
    shift_type: pick(['baseline_up', 'baseline_down', 'silhouette_shift', 'pl_share_gain']),
    magnitude_pct: ri(-25, 30),
    sustained_days: ri(21, 60),
    hypothesis: pick([
      'Wide-leg denim gaining share from skinny in Womens',
      'PL premium gaining share in Mens Tops',
      'Permanent baseline lift after competitor exit',
      'Subcategory decline post-trend cycle',
    ]),
  };
});

// ────────────────────────────────────────────────────────────────────
// KPIs + model_card + accuracy_by_horizon + worst/new_product
// ────────────────────────────────────────────────────────────────────
const totalDemandAtRisk = action_items.reduce((s, a) => s + a.revenue_impact_inr, 0);
const kpis = {
  demand_at_risk_inr: totalDemandAtRisk,
  demand_at_risk_sku_count: 14,
  overstock_exposure_inr: Math.round(totalDemandAtRisk * 1.4),
  overstock_exposure_sku_count: 22,
  next_event: { event_id: 'memorial-2026', event_name: 'Memorial Day', days_until: diffDays(ANCHOR_DATE, '2026-05-25'), skus_not_ramped: 34 },
  forecast_accuracy_30d_pct: 82.4,
  accuracy_trend_4w: [
    { week: 'W1 (04-19)', accuracy_pct: 81.2 },
    { week: 'W2 (04-26)', accuracy_pct: 81.8 },
    { week: 'W3 (05-03)', accuracy_pct: 82.1 },
    { week: 'W4 (05-10)', accuracy_pct: 82.4 },
  ],
  demand_at_risk_trend_4w: [
    { week: 'W1', value_inr: 2_800_000 },
    { week: 'W2', value_inr: 3_100_000 },
    { week: 'W3', value_inr: 2_950_000 },
    { week: 'W4', value_inr: 3_240_000 },
  ],
  overstock_trend_4w: [
    { week: 'W1', value_inr: 4_100_000 },
    { week: 'W2', value_inr: 4_300_000 },
    { week: 'W3', value_inr: 4_450_000 },
    { week: 'W4', value_inr: 4_540_000 },
  ],
  // apparel-additive
  net_vs_gross_demand_delta_pct: 12.4,
  size_curve_health_pct: 87,
  cold_start_skus_count: SKUS.filter((s) => s.cold_start).length,
  weather_adjusted_skus_count: SKUS.filter((s) => s.weather_sensitivity !== 'none').length,
  bts_window_lift_pct: 0,
  wape_overall_pct: 14.6,
  bias_overall_pct: -2.1,
  service_level_pct: 96.2,
  in_stock_rate_pct: 91.4,
  forecast_skus_count: SKUS.length,
  active_alerts: action_items.filter((a) => a.status === 'open').length,
  trend_12w: Array.from({ length: 12 }).map((_, w) => ({
    week: w + 1,
    wape_pct: Math.round((13 + r() * 6) * 10) / 10,
    bias_pct: Math.round((r() - 0.5) * 6 * 10) / 10,
    in_stock_pct: Math.round((88 + r() * 8) * 10) / 10,
  })),
};

const model_card = {
  test_mape: 14.6,
  test_wmape: 12.8,
  test_mae: 28.4,
  test_rmse: 41.2,
  test_bias: -2.1,
  production_model: {
    name: 'apparel_demand_forecast_champion',
    version: 'v3',
    type: 'Gradient Boost Ensemble',
    registry: 'Databricks MLflow',
    last_trained: '2026-04-28',
    test_mape: 0.146,
    test_wmape: 0.128,
    test_mae: 1.24,
    test_rmse: 2.32,
    test_bias: -0.021,
    mape_pct_test: 14.6,
    mape_pct_last_30d: 12.8,
    bias_pct: -2.1,
  },
  accuracy_by_velocity: [
    { velocity_class: 'A', mape_pct: 11.2 },
    { velocity_class: 'B', mape_pct: 16.4 },
    { velocity_class: 'C', mape_pct: 22.8 },
  ],
  accuracy_by_department: DEPARTMENTS.map((d) => ({
    department: d,
    mape_pct: Math.round((12 + r() * 8) * 10) / 10,
    sku_count: SKUS.filter((s) => s.department === d).length,
  })),
  accuracy_trend_12w: kpis.trend_12w.map((p) => ({ week: `W${p.week}`, mape_pct: p.wape_pct })),
  feature_importance_global: DRIVERS_POOL.map((d, i) => ({ feature: d.feature, display_name: d.display_name, importance: Math.round((0.22 - i * 0.016) * 1000) / 1000 })),
  drift_status: 'stable',
  drift_last_checked: ANCHOR_DATE,
  challenger_note: 'Challenger model v3.3 in shadow evaluation; +0.4pp MAPE improvement on holdout.',
};

const accuracy_by_horizon = {
  '7d': { mape_pct: 11.8, wmape_pct: 10.4, bias_pct: -1.2, sku_count: SKUS.length, by_life_stage: LIFE_STAGES.map((s) => ({ stage: s, wape_pct: Math.round((9 + r() * 12) * 10) / 10 })), by_brand_tier: BRAND_TIERS.map((t) => ({ tier: t, wape_pct: Math.round((9 + r() * 8) * 10) / 10 })) },
  '14d': { mape_pct: 15.2, wmape_pct: 13.6, bias_pct: -1.8, sku_count: SKUS.length, by_life_stage: LIFE_STAGES.map((s) => ({ stage: s, wape_pct: Math.round((11 + r() * 13) * 10) / 10 })), by_brand_tier: BRAND_TIERS.map((t) => ({ tier: t, wape_pct: Math.round((11 + r() * 9) * 10) / 10 })) },
  '28d': { mape_pct: 19.4, wmape_pct: 17.8, bias_pct: -2.4, sku_count: SKUS.length, by_life_stage: LIFE_STAGES.map((s) => ({ stage: s, wape_pct: Math.round((14 + r() * 15) * 10) / 10 })), by_brand_tier: BRAND_TIERS.map((t) => ({ tier: t, wape_pct: Math.round((14 + r() * 10) * 10) / 10 })) },
  '60d': { mape_pct: 26.1, wmape_pct: 24.2, bias_pct: -3.6, sku_count: SKUS.length, by_life_stage: LIFE_STAGES.map((s) => ({ stage: s, wape_pct: Math.round((18 + r() * 18) * 10) / 10 })), by_brand_tier: BRAND_TIERS.map((t) => ({ tier: t, wape_pct: Math.round((18 + r() * 12) * 10) / 10 })) },
};

const worst_forecasted_skus = allVols.slice(-10).map((x) => ({
  sku_id: x.sku.sku_id,
  product_name: x.sku.product_name,
  department: x.sku.department,
  mape_pct: Math.round((35 + r() * 20) * 10) / 10,
  direction: pick(['over', 'under']),
  avg_error_units: ri(30, 140),
}));

const new_product_skus = SKUS.filter((s) => s.life_stage === 'intro' || s.life_stage === 'growth').slice(0, 15).map((s) => ({
  sku_id: s.sku_id,
  product_name: s.product_name,
  launch_date: s.launch_date,
  days_in_market: diffDays(s.launch_date, ANCHOR_DATE),
  department: s.department,
  performance_status: pick(['on_plan', 'ahead', 'lagging']),
}));

// ────────────────────────────────────────────────────────────────────
// Precomputed (departments × horizon)
// ────────────────────────────────────────────────────────────────────
const HORIZONS = ['7', '14', '28', '60'];

function buildSubcategoryChart(deptFilter: string | null, horizonDays: number): { chart_points: any[]; subcategories: string[] } {
  const skus = deptFilter ? SKUS.filter((s) => s.department === deptFilter) : SKUS;
  const subcats = Array.from(new Set(skus.map((s) => s.subcategory))).slice(0, 6);
  const chart_points: any[] = [];
  const dateSlice = ALL_DATES.slice(HIST_DAYS - 30, HIST_DAYS + horizonDays);
  for (const date of dateSlice) {
    const pt: any = { date, is_actual: date < ANCHOR_DATE, is_forecast: date >= ANCHOR_DATE };
    let total = 0;
    let lower95 = 0;
    let upper95 = 0;
    for (const sc of subcats) {
      const skusInSc = skus.filter((s) => s.subcategory === sc);
      let unitsForSc = 0;
      for (const sku of skusInSc) {
        const series = SKU_SERIES.get(sku.sku_id) ?? [];
        const pt2 = series.find((p) => p.date === date);
        if (pt2) {
          unitsForSc += pt2.actual_units ?? pt2.forecast_units;
          lower95 += pt2.lower_95;
          upper95 += pt2.upper_95;
        }
      }
      pt[sc] = unitsForSc;
      total += unitsForSc;
    }
    pt.total = total;
    pt.lower_95 = date >= ANCHOR_DATE ? lower95 : null;
    pt.upper_95 = date >= ANCHOR_DATE ? upper95 : null;
    pt.ci_range = date >= ANCHOR_DATE ? upper95 - lower95 : null;
    chart_points.push(pt);
  }
  return { chart_points, subcategories: subcats };
}

function buildTopSkuChart(deptFilter: string | null, horizonDays: number) {
  const skus = deptFilter ? SKUS.filter((s) => s.department === deptFilter) : SKUS;
  const ranked = skus
    .map((s) => {
      const series = SKU_SERIES.get(s.sku_id) ?? [];
      const total = series.reduce((sum, p) => sum + (p.actual_units ?? p.forecast_units), 0);
      return { sku: s, total };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
  const dateSlice = ALL_DATES.slice(HIST_DAYS - 30, HIST_DAYS + horizonDays);
  const chart_points: any[] = [];
  for (const date of dateSlice) {
    const pt: any = { date, is_actual: date < ANCHOR_DATE, is_forecast: date >= ANCHOR_DATE };
    let total = 0;
    let lower95 = 0;
    let upper95 = 0;
    for (const { sku } of ranked) {
      const series = SKU_SERIES.get(sku.sku_id) ?? [];
      const pt2 = series.find((p) => p.date === date);
      const units = pt2 ? (pt2.actual_units ?? pt2.forecast_units) : 0;
      pt[sku.sku_id] = units;
      total += units;
      if (pt2) {
        lower95 += pt2.lower_95;
        upper95 += pt2.upper_95;
      }
    }
    pt.total = total;
    pt.lower_95 = date >= ANCHOR_DATE ? lower95 : null;
    pt.upper_95 = date >= ANCHOR_DATE ? upper95 : null;
    pt.ci_range = date >= ANCHOR_DATE ? upper95 - lower95 : null;
    chart_points.push(pt);
  }
  const sku_ids = ranked.map(({ sku }) => sku.sku_id);
  const sku_names = Object.fromEntries(ranked.map(({ sku }) => [sku.sku_id, sku.product_name]));
  return { chart_points, sku_ids, sku_names };
}

function topSkusList(deptFilter: string | null) {
  const skus = deptFilter ? SKUS.filter((s) => s.department === deptFilter) : SKUS;
  return skus
    .map((s) => {
      const series = SKU_SERIES.get(s.sku_id) ?? [];
      const total = series.reduce((sum, p) => sum + (p.actual_units ?? p.forecast_units), 0);
      return { sku: s, total, series };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map(({ sku, total, series }) => {
      const sparkline = series.slice(-14).map((p) => p.actual_units ?? p.forecast_units);
      const riskRoll = r();
      const risk = riskRoll < 0.15
        ? { label: 'Understock', variant: 'negative' }
        : riskRoll < 0.35
        ? { label: 'At Risk', variant: 'warning' }
        : riskRoll < 0.55
        ? { label: 'Overstock', variant: 'warning' }
        : { label: 'On Track', variant: 'neutral' };
      return {
        sku: {
          sku_id: sku.sku_id,
          product_name: sku.product_name,
          department: sku.department,
          category: sku.category,
          subcategory: sku.subcategory,
          velocity_class: sku.velocity_class,
          perishability: sku.perishability,
          price_inr: sku.price_inr,
          mrp_inr: sku.mrp_inr,
          margin_pct: sku.margin_pct,
          is_weather_sensitive: sku.is_weather_sensitive,
          is_festival_sensitive: sku.is_festival_sensitive,
          launch_date: sku.launch_date,
        },
        sparkline,
        revenue_at_stake: Math.round(total * sku.price_inr * 0.15),
        risk,
      };
    });
}

const precomputedDepartments: Record<string, any> = {};
for (const deptKey of ['all', ...DEPARTMENTS]) {
  const filter = deptKey === 'all' ? null : deptKey;
  const horizons: Record<string, any> = {};
  for (const h of HORIZONS) {
    horizons[h] = {
      subcategory_chart: buildSubcategoryChart(filter, parseInt(h)),
      top_sku_chart: buildTopSkuChart(filter, parseInt(h)),
      top_skus: topSkusList(filter),
    };
  }
  precomputedDepartments[deptKey] = horizons;
}

// Apparel-additive precomputed sections
const size_curve_grid = TOP30_SKUS.slice(0, 4).map((sku) => {
  const sizes = sku.size_curve.map((sc) => sc.size);
  const forecast = sku.size_curve.map((sc) => Math.round((sc.share_pct / 100) * sku.gross_forecast_units_14d * 1.0));
  const actual = forecast.map((f) => Math.round(f * (0.7 + r() * 0.8)));
  const broken = forecast.map((f, i) => actual[i] > f * 2 || actual[i] < f * 0.4);
  return {
    style_id: sku.sku_id,
    style_name: sku.product_name,
    sizes,
    forecast_units_per_size: forecast,
    actual_units_per_size: actual,
    broken_size_flags: broken,
  };
});

const weather_overlay_strip = Array.from({ length: 90 }).map((_, i) => {
  const date = addDays(addDays(ANCHOR_DATE, -45), i);
  const tempAnom = Math.round((Math.sin(i / 9) * 6 + (r() - 0.5) * 3) * 10) / 10;
  const precipAnom = Math.round((Math.max(0, Math.sin(i / 11) * 0.6 + (r() - 0.5) * 0.4)) * 100) / 100;
  const demandAdj = Math.round(Math.max(-25, Math.min(25, tempAnom * 1.6 + precipAnom * 12)) * 10) / 10;
  return { date, temp_anom_f: tempAnom, precip_anom_in: precipAnom, demand_adj_pct: demandAdj };
});

const brand_vs_pl_forecast_mix = DEPARTMENTS.map((dept) => {
  const weeks = Array.from({ length: 14 }).map((_, w) => w + 1);
  const brandBase = dept === 'Kids' ? 62 : dept === 'Mens' ? 70 : dept === 'Womens' ? 75 : dept === 'Footwear' ? 82 : 78;
  return {
    department: dept,
    weeks,
    brand_share_pct: weeks.map((_, i) => Math.round((brandBase - i * 0.4 + (r() - 0.5) * 2) * 10) / 10),
    pl_share_pct: weeks.map((_, i) => Math.round((100 - (brandBase - i * 0.4)) * 10) / 10),
  };
});

const returns_adjusted_sell_through = DEPARTMENTS.map((dept) => {
  const grossBase = dept === 'Womens' ? 64 : dept === 'Footwear' ? 71 : 68;
  const returnsRate = dept === 'Womens' ? 16 : dept === 'Footwear' ? 15 : dept === 'Accessories' ? 6 : 11;
  const gross = Array.from({ length: 14 }).map(() => Math.round((grossBase + (r() - 0.5) * 8) * 10) / 10);
  const net = gross.map((g) => Math.round(g * (1 - returnsRate / 100) * 10) / 10);
  const delta = gross.map((g, i) => Math.round((g - net[i]) * 10) / 10);
  return { department: dept, gross_st_pct: gross, net_st_pct: net, delta_pp: delta };
});

const precomputed = {
  generated_at: new Date().toISOString(),
  departments: precomputedDepartments,
  // apparel-additive sections (apparel-only)
  size_curve_grid,
  weather_overlay_strip,
  brand_vs_pl_forecast_mix,
  returns_adjusted_sell_through,
};

// ────────────────────────────────────────────────────────────────────
// Insights
// ────────────────────────────────────────────────────────────────────
const insights = {
  generated_at: new Date().toISOString(),
  source: 'apparel-generator',
  insights: [
    {
      id: 'apparel-insight-bts-pullforward',
      type: 'risk',
      severity: 'amber',
      title: 'BTS pull-forward detected',
      description: 'Back-to-School traffic started 8 days earlier than 5-year average. Recommend accelerating Kids Bottoms and Footwear in-season replan by 1 week.',
      metric: '+8d',
      action: 'Pull in BTS receipts 1 week earlier across Kids and Footwear',
      relatedChart: 'weather-driven-demand',
      source: 'anomaly-detection',
    },
    {
      type: 'risk',
      severity: 'red',
      title: 'Outerwear weather drag',
      description: 'Mens Outerwear net demand running 14% below gross plan due to heat anomaly +6°F in Northeast DCs. Recommend deferring Allentown DC outerwear receipts by 2 weeks.',
      metric: '-14%',
      action: 'Defer Allentown outerwear receipts',
      relatedChart: 'weather-driven-demand',
      source: 'weather-overlay',
    },
    {
      type: 'opportunity',
      severity: 'info',
      title: 'Denim silhouette shift',
      description: 'Wide-leg denim gaining 4.2pp share from skinny in Womens 16-week trailing. Recommend rebalancing Q3 OTB.',
      metric: '+4.2pp',
      action: 'Rebalance Q3 OTB toward wide-leg',
      relatedChart: 'plan-vs-actual',
      source: 'structural-shift',
    },
    {
      type: 'risk',
      severity: 'red',
      title: 'Returns spike: Womens Dresses',
      description: 'Memorial Day promo returns 28% (vs 22% baseline). Reduces net demand by $186K in next 14 days.',
      metric: '$186K',
      action: 'Tighten dress-promo cadence; review fit guides',
      relatedChart: 'returns-adjusted-sell-through',
      source: 'returns-monitor',
    },
    {
      type: 'opportunity',
      severity: 'green',
      title: 'PL Premium gaining share in Mens Tops',
      description: 'pl_premium up 3.4pp; ragm impact +1.8pp.',
      metric: '+3.4pp',
      action: 'Accelerate PL Premium SKU launches',
      relatedChart: 'brand-vs-pl-forecast-mix',
      source: 'brand-mix-monitor',
    },
    {
      type: 'risk',
      severity: 'amber',
      title: 'Cold-start risk: 12 new Footwear styles in BTS window',
      description: 'Half lack a usable lookalike donor. Recommend manual donor review.',
      metric: '12 styles',
      action: 'Run cold-start donor review for BTS Footwear',
      relatedChart: 'size-curve-forecast',
      source: 'cold-start-monitor',
    },
  ],
};

// ────────────────────────────────────────────────────────────────────
// Core payload + write
// ────────────────────────────────────────────────────────────────────
const corePayload = {
  market: 'apparel_us',
  generated_at: new Date().toISOString(),
  data_window: {
    history_start: HIST_START,
    history_end: ANCHOR_DATE,
    forecast_start: addDays(ANCHOR_DATE, 1),
    forecast_end: FORE_END,
    anchor_date: ANCHOR_DATE,
  },
  skus: SKUS,
  stores: STORES,
  events,
  event_lifts,
  sku_drivers,
  category_plans,
  action_items,
  promos,
  launches,
  anomalies,
  structural_shifts,
  kpis,
  model_card,
  plan_vs_actual,
  accuracy_by_horizon,
  worst_forecasted_skus,
  new_product_skus,
  daily_forecast_points,
};

const ROOT = process.cwd();
const CACHE_DIR = path.join(ROOT, 'cache', 'apparel', 'merch_demand');
const SKU_DETAIL_DIR = path.join(CACHE_DIR, 'sku_detail');
fs.mkdirSync(SKU_DETAIL_DIR, { recursive: true });

const corePath = path.join(CACHE_DIR, 'core.json');
const precomputedPath = path.join(CACHE_DIR, 'precomputed.json');
const insightsPath = path.join(CACHE_DIR, 'insights.json');

fs.writeFileSync(corePath, JSON.stringify(corePayload, null, 2));
fs.writeFileSync(precomputedPath, JSON.stringify(precomputed));
fs.writeFileSync(insightsPath, JSON.stringify(insights, null, 2));

for (const sku of DETAIL_SKUS) {
  const series = SKU_SERIES.get(sku.sku_id) ?? [];
  const sizes = sku.size_curve.map((sc) => sc.size);
  const detail = {
    sku_id: sku.sku_id,
    product_name: sku.product_name,
    daily_series: series.map((pt) => {
      const units = pt.is_actual ? (pt.actual_units ?? 0) : pt.forecast_units;
      return {
        date: pt.date,
        is_actual: pt.is_actual,
        is_forecast: !pt.is_actual,
        actual_units: pt.actual_units,
        forecast_units: pt.forecast_units,
        lower_95: pt.lower_95,
        upper_95: pt.upper_95,
        revenue_inr: Math.round(units * sku.price_inr),
        gross_units: pt.is_actual ? pt.actual_units ?? 0 : pt.forecast_units,
        net_units: Math.round((pt.is_actual ? pt.actual_units ?? 0 : pt.forecast_units) * (1 - sku.returns_rate_pct / 100)),
        weather_adj_pct: 0,
        event_lift_pct: 0,
      };
    }),
    size_curve_actual: sizes.map((s, i) => ({ size: s, units: Math.round((sku.size_curve[i]?.share_pct ?? 0) / 100 * sku.gross_forecast_units_14d * (0.7 + r() * 0.7)) })),
    size_curve_forecast: sizes.map((s, i) => ({ size: s, units: Math.round((sku.size_curve[i]?.share_pct ?? 0) / 100 * sku.gross_forecast_units_14d) })),
    cold_start_blend: sku.cold_start ? Array.from({ length: 4 }).map((_, w) => ({
      lookalike_sku_id: sku.cold_start!.lookalike_sku_id,
      week: w + 1,
      donor_weight: [0.7, 0.5, 0.3, 0.1][w],
      attribute_weight: [0.3, 0.4, 0.5, 0.4][w],
      actual_weight: [0.0, 0.1, 0.2, 0.5][w],
    })) : undefined,
  };
  fs.writeFileSync(path.join(SKU_DETAIL_DIR, `${sku.sku_id}.json`), JSON.stringify(detail));
}

// ────────────────────────────────────────────────────────────────────
// Summary
// ────────────────────────────────────────────────────────────────────
function sizeMB(p: string): string { return (fs.statSync(p).size / 1048576).toFixed(2); }
const elapsed = ((Date.now() - GEN_START) / 1000).toFixed(1);
console.log('\nApparel Merch Demand cache generated:');
console.log(`  ${corePath}                ${sizeMB(corePath)} MB`);
console.log(`  ${precomputedPath}         ${sizeMB(precomputedPath)} MB`);
console.log(`  ${insightsPath}            ${sizeMB(insightsPath)} MB`);
console.log(`  sku_detail/                ${DETAIL_SKUS.length} files`);
console.log(`\nSKUs: ${SKUS.length} · Stores: ${STORES.length} · Events: ${events.length} · ColdStart: ${SKUS.filter((s) => s.cold_start).length}`);
console.log(`Elapsed: ${elapsed}s`);
