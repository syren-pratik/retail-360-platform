/**
 * Apparel Store-Opening data generator.
 * Emits cache/apparel/store_opening.json (schema-mirror of grocery).
 * Austin flagship apparel launch — 52-week ramp with BTS + BFCM + Holiday.
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
const rng = mulberry32(0xa057507e);
const r = () => rng();
const rb = (lo: number, hi: number) => lo + r() * (hi - lo);
const ri = (lo: number, hi: number) => Math.floor(rb(lo, hi + 0.9999));

// Weekly revenue trend (USD absolute): grand-opening pop + BTS peak + BFCM/Holiday
function trendUSD(week: number): number {
  const baseline = 92_000;
  const openingPop = week <= 4 ? (5 - week) * 32_000 : 0;
  // BTS peak W12-16 (Aug for a May opening + 12 weeks)
  const bts = 68_000 * Math.exp(-Math.pow((week - 14) / 2.5, 2));
  // BFCM/Holiday W26-32
  const bfcm = 78_000 * Math.exp(-Math.pow((week - 28) / 3.0, 2));
  // holiday sustained peak
  const holiday = 42_000 * Math.exp(-Math.pow((week - 32) / 2.5, 2));
  // year-end resort/NYE
  const yearend = 22_000 * Math.exp(-Math.pow((week - 45) / 4.0, 2));
  const ramp = 18_000 * (1 - Math.exp(-week / 18));
  return baseline + openingPop + bts + bfcm + holiday + yearend + ramp;
}

const ramp_actuals_wk = {
  1: 132_000,
  2: 118_000,
  3: 109_500,
};

const ramp_points = Array.from({ length: 52 }).map((_, i) => {
  const week = i + 1;
  const point_forecast = Math.round(trendUSD(week));
  const compBand = Math.round(point_forecast * 0.18);
  const coldBand = Math.round(point_forecast * 0.52);
  return {
    week,
    week_label: `W${week}`,
    point_forecast_inr: point_forecast,
    comp_lower_inr: point_forecast - compBand,
    comp_upper_inr: point_forecast + compBand,
    cold_lower_inr: point_forecast - coldBand,
    cold_upper_inr: point_forecast + coldBand,
    actual_sales_inr: ramp_actuals_wk[week as 1 | 2 | 3] ?? null,
  };
});

const ramp_markers = [
  { week: 14, label: 'Back-to-School peak',    color: '#F59E0B' },
  { week: 22, label: 'Labor Day',              color: '#3B82F6' },
  { week: 28, label: 'BFCM peak',              color: '#EF4444' },
  { week: 32, label: 'Holiday season',         color: '#10B981' },
  { week: 45, label: 'NYE dressy',             color: '#8B5CF6' },
];

const APPAREL_COMPS = [
  { rank: 1, store_name: 'Dallas Flagship',    city_state: 'Dallas · Uptown, TX',       match_pct: 88, first_year_net: 4_620_000 },
  { rank: 2, store_name: 'Houston Uptown',     city_state: 'Houston · Uptown Park, TX', match_pct: 84, first_year_net: 4_320_000 },
  { rank: 3, store_name: 'Atlanta Buckhead',   city_state: 'Atlanta · Buckhead, GA',    match_pct: 78, first_year_net: 4_180_000 },
  { rank: 4, store_name: 'Denver Cherry Creek', city_state: 'Denver · Cherry Creek, CO', match_pct: 72, first_year_net: 3_940_000 },
  { rank: 5, store_name: 'Phoenix Scottsdale', city_state: 'Phoenix · Scottsdale, AZ',  match_pct: 68, first_year_net: 3_720_000 },
  { rank: 6, store_name: 'Charlotte SouthPark', city_state: 'Charlotte · SouthPark, NC', match_pct: 66, first_year_net: 3_640_000 },
  { rank: 7, store_name: 'Nashville Green Hills', city_state: 'Nashville · Green Hills, TN', match_pct: 64, first_year_net: 3_520_000 },
  { rank: 8, store_name: 'Raleigh Cameron Vlg', city_state: 'Raleigh · Cameron Village, NC', match_pct: 61, first_year_net: 3_360_000 },
];

const comparables_rows = APPAREL_COMPS.map((c) => ({
  ...c,
  first_year_net_inr: c.first_year_net,
  sparkline: Array.from({ length: 52 }).map((_, w) => Math.round(trendUSD(w + 1) * rb(0.85, 1.15))),
}));

const drivers_rows = [
  { label: 'Downtown mall foot-traffic · Domain',           effect_pct: 18 },
  { label: 'Austin apparel spend +11% YoY',                 effect_pct: 12 },
  { label: 'Nike/Adidas brand co-op (BTS)',                 effect_pct: 8 },
  { label: 'Warm-climate skew: swim + sandals extended',    effect_pct: 6 },
  { label: 'PL premium launch (Womens denim)',              effect_pct: 4 },
  { label: 'Sole apparel department store within 8 miles',  effect_pct: 5 },
  { label: 'Competitor Amazon Style closing 2 mi away',     effect_pct: 3 },
  { label: 'Returns policy tightening (industry trend)',    effect_pct: -3 },
  { label: 'Heat anomaly forecast (Aug-Sep)',               effect_pct: -4 },
  { label: 'Freight capacity constraint (Reno DC)',         effect_pct: -2 },
];

const drivers_net = drivers_rows.reduce((s, r) => s + r.effect_pct, 0);

const departments_rows = [
  { department: 'Womens',      mix_pct: 32,   year1_net_inr: 1_378_000, confidence: 0.68, opening_buy_inr: 232_000, status: 'Ready'   },
  { department: 'Mens',        mix_pct: 30,   year1_net_inr: 1_292_000, confidence: 0.65, opening_buy_inr: 218_000, status: 'Ready'   },
  { department: 'Kids',        mix_pct: 16,   year1_net_inr:   689_000, confidence: 0.72, opening_buy_inr: 116_000, status: 'Ready'   },
  { department: 'Footwear',    mix_pct: 14,   year1_net_inr:   602_000, confidence: 0.61, opening_buy_inr: 102_000, status: 'Review'  },
  { department: 'Accessories', mix_pct:  8,   year1_net_inr:   345_000, confidence: 0.58, opening_buy_inr:  58_000, status: 'Review'  },
];

const total_opening_buy = departments_rows.reduce((s, r) => s + r.opening_buy_inr, 0);
const total_year1 = departments_rows.reduce((s, r) => s + r.year1_net_inr, 0);

const kpis = [
  { id: 'forecast-52w', label: 'Forecast · First 52 Weeks', value: `$${(total_year1 / 1_000_000).toFixed(2)}M net`, sub: `P10-P90 $${(total_year1 * 0.72 / 1_000_000).toFixed(2)}M–$${(total_year1 * 1.36 / 1_000_000).toFixed(2)}M`, tone: 'neutral' },
  { id: 'confidence',   label: 'Model Confidence',           value: '0.64',   sub: 'Moderate · first Austin store',             dot: 'amber' },
  { id: 'comparables',  label: 'Comparable Stores',          value: '8',      sub: 'Sun-belt flagships · match ≥ 68%',           tone: 'neutral' },
  { id: 'opening-buy',  label: 'Opening Buy · GMV',          value: `$${(total_opening_buy / 1_000).toFixed(0)}K`, sub: '5 depts sized against P50 forecast',        tone: 'positive' },
  { id: 'grand-open',   label: 'Grand Opening',              value: '30 May 2026', sub: '42 days out · BTS-ready',              tone: 'neutral' },
];

const header = {
  store_name: 'Domain Northside · Austin',
  store_id: 'AUS-001-DOM',
  format: '14,800 sq ft · Flagship Apparel',
  grand_opening_iso: '2026-05-30',
  grand_opening_label: '30 May 2026',
  model_run_label: 'model run · 30 Jun 2026',
  trade_area_label: 'Mall in-line · trade area ~485K · opened 30 May 2026',
  chips: [
    'First store in Austin',
    'US flagship apparel format',
    'BTS peak launch',
    'Nike/Adidas co-op',
    'Reno DC lead times',
    'CA sales tax 8.25%',
  ],
};

const payload = {
  header,
  kpis,
  ramp: {
    points: ramp_points,
    markers: ramp_markers,
    callout: 'First Austin flagship — no in-market comps. Forecast leans on 8 sun-belt mainland US flagships; interval stays wide until local BTS + BFCM data accrues.',
  },
  comparables: {
    rows: comparables_rows,
    total_count: comparables_rows.length,
    weighted_avg_inr: Math.round(comparables_rows.reduce((s, c) => s + c.first_year_net_inr * c.match_pct, 0) / comparables_rows.reduce((s, c) => s + c.match_pct, 0)),
  },
  drivers: { rows: drivers_rows, net_effect_pct: drivers_net },
  departments: { rows: departments_rows, remainder_label: 'Balance across categories', total_opening_buy_inr: total_opening_buy },
  footer_left: 'New-store cold-start ensemble (comp-weighted + site-attribute GBM) · intervals are P10–P90 · illustrative planning model, simulated figures',
  footer_right: 'v4.3-apparel · refreshed daily',
};

const outPath = path.join(process.cwd(), 'cache', 'apparel', 'store_opening.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
const sz = (fs.statSync(outPath).size / 1024).toFixed(1);
console.log(`✓ ${outPath} · ${sz}KB · 52 ramp weeks, ${comparables_rows.length} comps, ${departments_rows.length} depts`);
