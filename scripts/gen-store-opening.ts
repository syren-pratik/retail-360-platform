import * as fs from 'fs';
import * as path from 'path';
import type {
  StoreOpeningPayload,
  StoreOpeningRampPoint,
  StoreOpeningComparable,
} from '../src/app/lib/store-opening-types';

// --- seeded RNG (mulberry32) ---
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(2026_05_30);
const r = () => rng();
const rb = (lo: number, hi: number) => lo + r() * (hi - lo);

// Smooth weekly trend (₹ in absolute units):
// - W1-3 grand-opening pop (~₹56L in W1, settles)
// - back-to-school bump around W12-16
// - Diwali peak around W20-26 (festive index roughly Oct-Nov for May opening)
// - mild post-Diwali decline; Q4 baseline; year-end uptick
function trendINR(week: number): number {
  const baseline = 4_300_000; // ~₹43L weekly baseline run-rate after settle
  // opening pop tapers over first 4 weeks
  const openingPop = week <= 4 ? (5 - week) * 1_500_000 : 0;
  // back-to-school bell W12-16
  const b2s = 1_200_000 * Math.exp(-Math.pow((week - 14) / 2.5, 2));
  // Diwali bell W20-26 (peak W23)
  const diwali = 3_000_000 * Math.exp(-Math.pow((week - 23) / 3.0, 2));
  // late-year wedding / new-year ramp
  const yearend = 900_000 * Math.exp(-Math.pow((week - 45) / 4.0, 2));
  // long-run gentle ramp as awareness builds
  const ramp = 800_000 * (1 - Math.exp(-week / 18));
  return baseline + openingPop + b2s + diwali + yearend + ramp;
}

function buildRampPoints(): StoreOpeningRampPoint[] {
  const out: StoreOpeningRampPoint[] = [];
  // Wk 1-3 "actuals" — make Wk1 ~₹56L (14% above the comp-blend expectation)
  const actualOverrides: Record<number, number> = {
    1: 5_600_000,
    2: 4_900_000,
    3: 4_650_000,
  };
  for (let w = 1; w <= 52; w++) {
    const trend = trendINR(w);
    // small weekly noise around the trend (deterministic from rng)
    const noise = rb(-0.05, 0.05);
    const point = Math.round(trend * (1 + noise));

    // Comp-blend P10-P90 band: narrower; widens slightly with the festival surge.
    const compHalf = trend * (0.18 + 0.04 * Math.exp(-Math.pow((w - 23) / 4.0, 2)));
    const comp_lower = Math.round(point - compHalf);
    const comp_upper = Math.round(point + compHalf);

    // Cold-start P10-P90 band: much wider near opening, tightens as weeks pass.
    // Wider when actuals haven't arrived yet (we say it tightens with sell-through).
    const tightenFactor = 1 - Math.min(0.55, w * 0.012);
    const coldHalf = trend * (0.55 * tightenFactor);
    const cold_lower = Math.round(point - coldHalf);
    const cold_upper = Math.round(point + coldHalf);

    const actual = actualOverrides[w] ?? null;

    out.push({
      week: w,
      week_label: `W${w}`,
      point_forecast_inr: point,
      comp_lower_inr: comp_lower,
      comp_upper_inr: comp_upper,
      cold_lower_inr: cold_lower,
      cold_upper_inr: cold_upper,
      actual_sales_inr: actual,
    });
  }
  return out;
}

// Sparkline for a comparable store: scaled trend with comp-specific multiplier and noise.
function buildSparkline(scale: number, phase: number): number[] {
  const out: number[] = [];
  for (let w = 1; w <= 52; w++) {
    const t = trendINR(w + phase) * scale;
    out.push(Math.round(t * (1 + rb(-0.06, 0.06))));
  }
  return out;
}

const COMPS: Array<Omit<StoreOpeningComparable, 'sparkline'>> = [
  { rank: 1, store_name: 'Andheri W',     city_state: 'Mumbai · Andheri W, MH',     match_pct: 88, first_year_net_inr: 241_000_000 },
  { rank: 2, store_name: 'Hadapsar',      city_state: 'Pune · Hadapsar, MH',         match_pct: 85, first_year_net_inr: 257_000_000 },
  { rank: 3, store_name: 'Gachibowli',    city_state: 'Hyderabad · Gachibowli, TG',  match_pct: 80, first_year_net_inr: 208_000_000 },
  { rank: 4, store_name: 'Vijay Nagar',   city_state: 'Indore · Vijay Nagar, MP',    match_pct: 75, first_year_net_inr: 224_000_000 },
  { rank: 5, store_name: 'Mansarovar',    city_state: 'Jaipur · Mansarovar, RJ',     match_pct: 71, first_year_net_inr: 199_000_000 },
  { rank: 6, store_name: 'Adajan',        city_state: 'Surat · Adajan, GJ',          match_pct: 68, first_year_net_inr: 215_000_000 },
  { rank: 7, store_name: 'MP Nagar',      city_state: 'Bhopal · MP Nagar, MP',       match_pct: 64, first_year_net_inr: 188_000_000 },
  { rank: 8, store_name: 'Swaroop Nagar', city_state: 'Kanpur · Swaroop Nagar, UP',  match_pct: 62, first_year_net_inr: 196_000_000 },
];

function build(): StoreOpeningPayload {
  const ramp = buildRampPoints();

  const comparables: StoreOpeningComparable[] = COMPS.map((c, i) => ({
    ...c,
    sparkline: buildSparkline(0.85 + i * 0.05, i * 2),
  }));

  const payload: StoreOpeningPayload = {
    header: {
      store_name: 'Hazratganj · Lucknow',
      store_id: 'LK-001-HZR',
      format: '8,200 sq ft · Standard',
      grand_opening_iso: '2026-05-30',
      grand_opening_label: '30 May 2026',
      model_run_label: 'model run · 16 Jun 2026',
      trade_area_label: 'Mall in-line · trade area ~620K · opened 30 May 2026',
      chips: [
        'First store in Lucknow',
        'Hindi-first signage',
        'Diwali peak',
        'Monsoon safety stock',
        'Lucknow lead times',
        'GST 18%',
      ],
    },
    kpis: [
      {
        id: 'forecast-52w',
        label: 'Forecast · First 52 Weeks',
        value: '₹21.6Cr net',
        sub: 'P10-P90 ₹15.6Cr-₹29.5Cr',
        tone: 'neutral',
      },
      {
        id: 'confidence',
        label: 'Model Confidence',
        value: '0.58',
        sub: 'Moderate · first Lucknow store',
        dot: 'amber',
      },
      {
        id: 'comparables',
        label: 'Comparable Stores',
        value: '18',
        sub: 'top match 88% · backtest WAPE 18.6%',
      },
      {
        id: 'opening-buy',
        label: 'Opening Inventory Buy',
        value: '₹3.7Cr',
        sub: '~8 wks cover at upcountry lead time',
      },
      {
        id: 'grand-opening-actual',
        label: 'Grand-Opening Week · Actual',
        value: '₹56L',
        sub: '+14% vs comp-blend expectation',
        tone: 'positive',
      },
    ],
    ramp: {
      points: ramp,
      markers: [
        { week: 14, label: 'Back-to-school', color: '#F59E0B' },
        { week: 22, label: 'Diwali · holidays', color: '#8B5CF6' },
      ],
      callout:
        'First store in Lucknow — no in-market comps. Forecast leans on 18 Hindi-speaking, Tier-2 mainland city stores; the interval stays wide until local demand accrues.',
    },
    comparables: {
      rows: comparables,
      total_count: 18,
      weighted_avg_inr: 224_000_000,
    },
    drivers: {
      rows: [
        { label: 'Mall foot traffic · Hazratganj',         effect_pct: 16 },
        { label: 'No in-market brand awareness',           effect_pct: -12 },
        { label: 'Value-retail fit · price sensitivity',   effect_pct: 10 },
        { label: 'Tween / teen population share',          effect_pct: 8 },
        { label: 'Median household income · basket',       effect_pct: -7 },
        { label: 'Upcountry replenishment lead time',      effect_pct: -6 },
        { label: 'Diwali gifting calendar',                effect_pct: 6 },
      ],
      net_effect_pct: 15,
    },
    departments: {
      rows: [
        { department: 'Grocery & Staples',        mix_pct: 17.5, year1_net_inr: 38_000_000, confidence: 0.62, opening_buy_inr: 6_100_000, status: 'Review' },
        { department: 'Snacks & Beverages',       mix_pct: 15.0, year1_net_inr: 33_000_000, confidence: 0.74, opening_buy_inr: 4_700_000, status: 'Ready' },
        { department: 'Personal Care',            mix_pct: 14.0, year1_net_inr: 30_000_000, confidence: 0.66, opening_buy_inr: 5_000_000, status: 'Review' },
        { department: 'Home & Kitchen',           mix_pct: 12.0, year1_net_inr: 26_000_000, confidence: 0.71, opening_buy_inr: 3_600_000, status: 'Ready' },
        { department: 'Apparel · ₹100–₹500',      mix_pct: 10.0, year1_net_inr: 22_000_000, confidence: 0.60, opening_buy_inr: 3_400_000, status: 'Review' },
        { department: 'Stationery & Toys',        mix_pct: 10.0, year1_net_inr: 22_000_000, confidence: 0.69, opening_buy_inr: 3_100_000, status: 'Ready' },
        { department: 'Festive & Seasonal',       mix_pct:  9.0, year1_net_inr: 20_000_000, confidence: 0.55, opening_buy_inr: 2_700_000, status: 'Low conf.' },
      ],
      remainder_label: '+ Beauty, Footwear & front-end impulse · 12.5%',
      total_opening_buy_inr: 37_000_000,
    },
    footer_left:
      'New-store cold-start ensemble (comp-weighted + site-attribute GBM) · intervals are P10–P90 · illustrative planning model, simulated figures',
    footer_right: 'v4.2 · refreshed daily',
  };

  return payload;
}

function main() {
  const outDir = path.join(process.cwd(), 'cache');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'store_opening.json');
  const payload = build();
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  // eslint-disable-next-line no-console
  console.log(`[gen-store-opening] wrote ${outPath} — ${payload.ramp.points.length} ramp points, ${payload.comparables.rows.length} comps`);
}

main();
