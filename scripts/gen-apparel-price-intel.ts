/**
 * Apparel Price Intelligence data generator.
 * Spec: docs/apparel-price-intel-spec.md
 *
 * Emits 12 standalone cache files into cache/apparel/ +
 * cache/apparel/price_intel/{core,precomputed,insights}.json +
 * 200 cache/apparel/price_intel/sku_detail/<id>.json shards.
 *
 * Field shapes preserve grocery EXACTLY (so the schema linter passes).
 * Numbers are USD-scale; apparel-additive fields are emitted alongside
 * grocery-mirror fields per the whitelist in spec §9.3.
 *
 * Run: npm run gen:apparel-price-intel
 */

import * as fs from 'fs';
import * as path from 'path';

// ====================================================================
// SEEDED RNG (mulberry32) — deterministic
// ====================================================================
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED = 0xb003ec51;
const rng = mulberry32(SEED);
const r = () => rng();
const rb = (lo: number, hi: number) => lo + r() * (hi - lo);
const ri = (lo: number, hi: number) => Math.floor(rb(lo, hi + 1));
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(r() * arr.length)];
function weightedPick<T>(items: ReadonlyArray<[T, number]>): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = r() * total;
  for (const [v, w] of items) { x -= w; if (x <= 0) return v; }
  return items[items.length - 1][0];
}
function gaussian(mu: number, sigma: number): number {
  const u1 = Math.max(1e-9, r());
  const u2 = r();
  return mu + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;
const round4 = (v: number) => Math.round(v * 10000) / 10000;
const num2str1 = (v: number) => round1(v).toString();
const num2str2 = (v: number) => round2(v).toString();

// ====================================================================
// CONSTANTS
// ====================================================================
const ANCHOR_DATE = '2026-06-29';
const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(REPO_ROOT, 'cache', 'apparel');
const PI_DIR = path.join(OUT_DIR, 'price_intel');
const SKU_DIR = path.join(PI_DIR, 'sku_detail');

type Dept = "Women's Tops" | "Women's Bottoms" | "Women's Dresses" | "Men's Tops" | "Men's Bottoms" | "Kids'" | 'Footwear' | 'Accessories';

const DEPTS: Dept[] = ["Women's Tops", "Women's Bottoms", "Women's Dresses", "Men's Tops", "Men's Bottoms", "Kids'", 'Footwear', 'Accessories'];
const DEPT_CODE: Record<Dept, string> = {
  "Women's Tops": 'WT', "Women's Bottoms": 'WB', "Women's Dresses": 'WD',
  "Men's Tops": 'MT', "Men's Bottoms": 'MB', "Kids'": 'KD', 'Footwear': 'FW', 'Accessories': 'AC',
};

const CATEGORIES: Record<Dept, string[]> = {
  "Women's Tops": ['Tees', 'Blouses', 'Sweaters', 'Tanks'],
  "Women's Bottoms": ['Jeans', 'Trousers', 'Skirts', 'Leggings'],
  "Women's Dresses": ['Sheath Dresses', 'Midi Dresses', 'Maxi Dresses', 'Casual Dresses'],
  "Men's Tops": ['Tees', 'Polos', 'Button-Downs', 'Sweaters'],
  "Men's Bottoms": ['Jeans', 'Chinos', 'Shorts', 'Trousers'],
  "Kids'": ['Tops', 'Bottoms', 'Sets', 'Outerwear'],
  'Footwear': ['Sneakers', 'Boots', 'Sandals', 'Dress Shoes'],
  'Accessories': ['Bags', 'Belts', 'Hats', 'Jewelry'],
};

const MARGIN_FLOORS: Record<Dept, { floor: number; target: number; ceiling: number; ragm_floor: number; returns: number }> = {
  "Women's Tops": { floor: 54, target: 60, ceiling: 68, ragm_floor: 44, returns: 18 },
  "Women's Bottoms": { floor: 52, target: 58, ceiling: 66, ragm_floor: 38, returns: 28 },
  "Women's Dresses": { floor: 56, target: 62, ceiling: 70, ragm_floor: 44, returns: 22 },
  "Men's Tops": { floor: 50, target: 56, ceiling: 64, ragm_floor: 42, returns: 14 },
  "Men's Bottoms": { floor: 48, target: 54, ceiling: 62, ragm_floor: 38, returns: 18 },
  "Kids'": { floor: 52, target: 56, ceiling: 62, ragm_floor: 46, returns: 12 },
  'Footwear': { floor: 45, target: 50, ceiling: 58, ragm_floor: 36, returns: 20 },
  'Accessories': { floor: 58, target: 64, ceiling: 72, ragm_floor: 56, returns: 6 },
};

const AUR: Record<Dept, number> = {
  "Women's Tops": 32, "Women's Bottoms": 58, "Women's Dresses": 78,
  "Men's Tops": 42, "Men's Bottoms": 62, "Kids'": 24, 'Footwear': 84, 'Accessories': 36,
};

const BRANDS = ['Nike', "Levi's", 'Lululemon', 'Adidas', 'Under Armour', 'J.Crew', 'H&M', 'Uniqlo', 'Coach', 'Old Navy', "Carter's", 'Madewell', 'Banana Republic', 'Gap', 'Anthropologie', 'Free People', 'Vans', 'Converse', 'New Balance', 'Patagonia', 'North Face', 'Calvin Klein', 'Tommy Hilfiger', 'Polo Ralph Lauren', 'Michael Kors'];
const PL_BRAND = 'House Brand';

const COMPETITORS = ['AMZN', 'TGT', 'WMT', 'MACYS', 'NORD', 'OLDN', 'HM', 'UNQ', 'ASOS', 'SHEIN'];
const COMPETITOR_NAMES: Record<string, string> = {
  AMZN: 'Amazon Fashion', TGT: 'Target', WMT: 'Walmart', MACYS: "Macy's",
  NORD: 'Nordstrom', OLDN: 'Old Navy', HM: 'H&M', UNQ: 'Uniqlo', ASOS: 'ASOS', SHEIN: 'Shein',
};

const PROMO_MECHANICS = ['bogo_50', 'b2g1_half', 'pct_off', 'dollar_off', 'bundle', 'gwp', 'tiered', 'free_ship', 'member_excl'] as const;
const PROMO_MECHANIC_LABELS: Record<string, string> = {
  bogo_50: 'BOGO 50%', b2g1_half: 'B2G1 Half', pct_off: '% Off', dollar_off: '$ Off',
  bundle: 'Bundle', gwp: 'GWP', tiered: 'Tiered', free_ship: 'Free Ship', member_excl: 'Member Exclusive',
};
const PROMO_MECHANIC_COLORS: Record<string, string> = {
  bogo_50: '#3B82F6', b2g1_half: '#6366F1', pct_off: '#10B981', dollar_off: '#F59E0B',
  bundle: '#A855F7', gwp: '#EC4899', tiered: '#06B6D4', free_ship: '#84CC16', member_excl: '#F43F5E',
};

const MARKDOWN_STEPS = ['full_price', 'md25', 'md40', 'md60', 'md80', 'clearance'] as const;
const STEP_DEPTH: Record<string, number> = { full_price: 0, md25: -25, md40: -40, md60: -60, md80: -80, clearance: -80 };
const STEP_TARGET_DAYS: Record<string, number> = { full_price: 84, md25: 14, md40: 21, md60: 14, md80: 14, clearance: 28 };
const STEP_LABEL: Record<string, string> = {
  full_price: 'Full Price', md25: '-25% (Week 13)', md40: '-40% (Week 17)',
  md60: '-60% (Week 21)', md80: '-80% (Week 25)', clearance: 'Clearance (Week 25+)',
};

const LIFECYCLE = ['Intro', 'Core', 'Markdown-1', 'Markdown-2', 'Markdown-3', 'Clearance', 'Discontinued'] as const;
const SEASONS = ['SS25', 'FW25', 'SS26', 'FW26', 'Resort27'] as const;

const VELOCITY_DIST: Array<[string, number]> = [['A', 0.18], ['B', 0.32], ['C', 0.32], ['D', 0.18]];

const US_EVENTS = [
  { name: 'BFCM', date: '2026-11-27', depth: 50, mult: 4.2, mech: 'pct_off' },
  { name: 'Cyber Monday', date: '2026-12-01', depth: 50, mult: 3.8, mech: 'pct_off' },
  { name: 'Christmas', date: '2026-12-22', depth: 50, mult: 2.2, mech: 'pct_off' },
  { name: 'Boxing Day', date: '2026-12-26', depth: 60, mult: 2.8, mech: 'pct_off' },
  { name: 'BTS Peak', date: '2026-08-15', depth: 25, mult: 2.4, mech: 'b2g1_half' },
  { name: 'Labor Day', date: '2026-09-05', depth: 30, mult: 1.6, mech: 'bogo_50' },
  { name: 'Memorial Day', date: '2026-05-25', depth: 30, mult: 1.6, mech: 'bogo_50' },
  { name: "Mother's Day", date: '2026-05-10', depth: 25, mult: 2.1, mech: 'gwp' },
  { name: "Father's Day", date: '2026-06-15', depth: 25, mult: 1.4, mech: 'bundle' },
  { name: 'July 4', date: '2026-07-04', depth: 25, mult: 1.8, mech: 'pct_off' },
  { name: 'Halloween', date: '2026-10-31', depth: 30, mult: 1.4, mech: 'pct_off' },
  { name: 'Columbus Day', date: '2026-10-12', depth: 20, mult: 1.3, mech: 'pct_off' },
  { name: 'Veterans Day', date: '2026-11-11', depth: 25, mult: 1.4, mech: 'tiered' },
  { name: 'NYE', date: '2026-12-31', depth: 60, mult: 1.8, mech: 'pct_off' },
];

// ====================================================================
// MASTER SPINE: 200 styles
// ====================================================================
interface Style {
  product_id: string;       // APR-<DEPT>-<NNNN> (sku_id alias)
  style_id: string;
  style_code: string;
  product_name: string;
  brand: string;
  is_private_label: boolean;
  department: Dept;
  category: string;
  subcategory: string;
  velocity_class: 'A' | 'B' | 'C' | 'D';
  msrp: number;
  cost: number;
  current_price: number;
  gross_margin_pct: number;
  ragm_pct: number;
  elasticity: number;
  elasticity_class: 'inelastic' | 'moderate' | 'elastic';
  lifecycle_stage: typeof LIFECYCLE[number];
  markdown_step: typeof MARKDOWN_STEPS[number];
  days_in_step: number;
  target_days_in_step: number;
  is_stuck: boolean;
  season_tag: typeof SEASONS[number];
  weeks_on_floor: number;
  competitive_index: number;
  return_rate_pct: number;
  sell_through_pct: number;
  sell_through_target_pct: number;
  inventory_age_bucket: '0-4W' | '5-8W' | '9-12W' | '13W+';
  size_breadth: number;
  color_breadth: number;
  promo_frequency_pct: number;
  is_event_sensitive: boolean;
  is_weather_sensitive: boolean;
  launch_date: string;
  weeks_of_supply: number;
  current_margin_pct: number;
  target_margin_pct: number;
  recommended_price: number;
  price_change_pct: number;
  projected_margin_pct: number;
  revenue_impact: number;
  recommendation_priority: 'High' | 'Medium' | 'Low';
  total_transactions: number;
  competitor_top3: { competitor_id: string; price_usd: number }[];
}

function makeStyles(): Style[] {
  const styles: Style[] = [];
  const deptShares: Record<Dept, number> = {
    "Women's Tops": 0.18, "Women's Bottoms": 0.16, "Women's Dresses": 0.12,
    "Men's Tops": 0.14, "Men's Bottoms": 0.12, "Kids'": 0.10, 'Footwear': 0.12, 'Accessories': 0.06,
  };
  const counts: Record<Dept, number> = {} as any;
  let total = 0;
  for (const d of DEPTS) { counts[d] = Math.round(deptShares[d] * 200); total += counts[d]; }
  // adjust to exactly 200
  counts["Women's Tops"] += (200 - total);

  let perDeptSeq: Record<Dept, number> = {} as any;
  for (const d of DEPTS) perDeptSeq[d] = 0;

  // lifecycle distribution: Intro 8%, Core 48%, Md1 14%, Md2 11%, Md3 8%, Clearance 9%, Disc 2%
  const lifecycleDist: Array<[typeof LIFECYCLE[number], number]> = [
    ['Intro', 0.08], ['Core', 0.48], ['Markdown-1', 0.14], ['Markdown-2', 0.11],
    ['Markdown-3', 0.08], ['Clearance', 0.09], ['Discontinued', 0.02],
  ];

  const lifecycleToStep: Record<string, typeof MARKDOWN_STEPS[number]> = {
    Intro: 'full_price', Core: 'full_price', 'Markdown-1': 'md25',
    'Markdown-2': 'md40', 'Markdown-3': 'md60', Clearance: 'clearance', Discontinued: 'md80',
  };

  for (const dept of DEPTS) {
    const n = counts[dept];
    for (let i = 0; i < n; i++) {
      perDeptSeq[dept]++;
      const seqStr = String(perDeptSeq[dept]).padStart(4, '0');
      const product_id = `APR-${DEPT_CODE[dept]}-${seqStr}`;
      const is_pl = r() < 0.28;
      const brand = is_pl ? PL_BRAND : pick(BRANDS);
      const cat = pick(CATEGORIES[dept]);
      const subcat = pick(['Classic', 'Slim', 'Relaxed', 'Modern', 'Premium']);
      const velocity_class = weightedPick(VELOCITY_DIST) as 'A' | 'B' | 'C' | 'D';
      const aur = AUR[dept];
      const msrp = round2(gaussian(aur, aur * 0.22));
      const msrpFinal = Math.max(8, msrp);
      const floor = MARGIN_FLOORS[dept];
      // margin: PL ~+10pp over branded
      const baseMargin = is_pl ? gaussian(floor.target + 8, 3) : gaussian(floor.target - 4, 3);
      const grossMargin = clamp(baseMargin, floor.floor - 4, floor.ceiling + 2);
      const cost = round2(msrpFinal * (1 - grossMargin / 100));
      const lifecycle = weightedPick(lifecycleDist);
      const step = lifecycleToStep[lifecycle];
      const stepDepth = STEP_DEPTH[step];
      const current_price = round2(msrpFinal * (1 + stepDepth / 100));
      const targetDays = STEP_TARGET_DAYS[step];
      // for "stuck" calibration, ~25% of MD steps stuck
      const stuckChance = step === 'full_price' ? 0.0 : 0.25;
      const isStuck = r() < stuckChance;
      const days_in_step = isStuck
        ? Math.round(targetDays * (1.4 + r() * 0.5))
        : Math.round(targetDays * (0.3 + r() * 0.9));
      // elasticity by lifecycle/category
      const baseElast = cat === 'Tees' || subcat === 'Classic' ? gaussian(-0.7, 0.2) :
        (lifecycle === 'Intro' || lifecycle === 'Core' ? gaussian(-1.4, 0.4) : gaussian(-1.8, 0.4));
      const elasticity = round2(clamp(baseElast, -2.5, -0.3));
      const elastClass = elasticity > -0.8 ? 'inelastic' : (elasticity > -1.5 ? 'moderate' : 'elastic');
      // RAGM
      const ret = clamp(gaussian(floor.returns, 4), 4, 36);
      const ragm = round2(grossMargin * (1 - ret / 100) - (ret / 100) * 8);
      // weeks_on_floor by lifecycle
      const weeksOnFloor = lifecycle === 'Intro' ? ri(1, 3) :
        lifecycle === 'Core' ? ri(4, 12) :
        lifecycle === 'Markdown-1' ? ri(13, 16) :
        lifecycle === 'Markdown-2' ? ri(17, 20) :
        lifecycle === 'Markdown-3' ? ri(21, 24) :
        lifecycle === 'Clearance' ? ri(25, 36) : ri(36, 52);
      const season: typeof SEASONS[number] = lifecycle === 'Intro' ? 'FW26' :
        lifecycle === 'Core' ? 'SS26' :
        lifecycle === 'Markdown-1' || lifecycle === 'Markdown-2' ? 'SS26' :
        lifecycle === 'Markdown-3' || lifecycle === 'Clearance' ? 'FW25' :
        'SS25';
      const ageBucket: Style['inventory_age_bucket'] =
        weeksOnFloor <= 4 ? '0-4W' :
        weeksOnFloor <= 8 ? '5-8W' :
        weeksOnFloor <= 12 ? '9-12W' : '13W+';
      const compIdx = round1(clamp(gaussian(101, 8), 78, 132));
      const sellThru = round1(clamp(gaussian(
        lifecycle === 'Intro' ? 22 : lifecycle === 'Core' ? 58 :
        lifecycle === 'Markdown-1' ? 68 : lifecycle === 'Markdown-2' ? 74 :
        lifecycle === 'Markdown-3' ? 82 : lifecycle === 'Clearance' ? 88 : 95,
        6), 8, 99));
      const stTarget = cat === 'Tees' || cat === 'Polos' ? 70 :
        dept === 'Footwear' ? 65 : dept === 'Accessories' ? 72 :
        dept === "Kids'" ? 68 : 62;
      const size_breadth = dept === 'Footwear' ? ri(8, 14) : dept === 'Accessories' ? ri(1, 3) : ri(6, 12);
      const color_breadth = ri(2, 6);
      const promoFreq = round1(clamp(gaussian(18, 6), 4, 42));
      const isEvent = r() < 0.42;
      const isWeather = r() < 0.28 && (dept === 'Footwear' || dept.includes('Outerwear') || dept === "Women's Dresses");
      const launchDays = weeksOnFloor * 7 + ri(0, 5);
      const launchDate = isoDateOffset(-launchDays);
      const wos = round1(clamp(gaussian(7, 2.4), 1.4, 22));
      // recommendation
      const currentMargin = round1(grossMargin);
      const targetMargin = round1(floor.target);
      let recPrice = current_price;
      let recPriority: 'High' | 'Medium' | 'Low' = 'Medium';
      if (isStuck) { recPrice = round2(current_price * 0.75); recPriority = 'High'; }
      else if (compIdx > 115) { recPrice = round2(current_price * 0.92); recPriority = 'High'; }
      else if (compIdx < 88) { recPrice = round2(current_price * 1.05); recPriority = 'Medium'; }
      else if (lifecycle === 'Markdown-1' && sellThru < 55) { recPrice = round2(msrpFinal * 0.6); recPriority = 'High'; }
      else { recPrice = current_price; recPriority = r() < 0.3 ? 'Low' : 'Medium'; }
      const priceChange = round1((recPrice - current_price) / current_price * 100);
      const projMargin = round1(currentMargin + (priceChange * 0.6));
      const txns = ri(820, 38400) * (velocity_class === 'A' ? 4 : velocity_class === 'B' ? 2 : velocity_class === 'C' ? 1 : 0.4);
      const revImpact = Math.round(Math.abs(priceChange) * txns * current_price * 0.001) * 100;

      // competitor top 3
      const compShuffled = [...COMPETITORS].sort(() => r() - 0.5).slice(0, 3);
      const top3 = compShuffled.map(c => ({
        competitor_id: c,
        price_usd: round2(current_price * (compIdx / 100) * (1 + (r() - 0.5) * 0.18)),
      }));

      styles.push({
        product_id, style_id: `${(brand.replace(/[^A-Z]/g, '').slice(0, 3) || brand.toUpperCase().slice(0, 3))}-${dept[0]}${DEPT_CODE[dept][1]}-${seqStr}`,
        style_code: `STY-${DEPT_CODE[dept]}-${seqStr}`,
        product_name: `${brand} ${cat} ${subcat}`,
        brand, is_private_label: is_pl,
        department: dept, category: cat, subcategory: subcat,
        velocity_class, msrp: msrpFinal, cost, current_price,
        gross_margin_pct: round1(grossMargin), ragm_pct: round1(ragm),
        elasticity, elasticity_class: elastClass,
        lifecycle_stage: lifecycle, markdown_step: step,
        days_in_step, target_days_in_step: targetDays, is_stuck: isStuck,
        season_tag: season, weeks_on_floor: weeksOnFloor,
        competitive_index: compIdx, return_rate_pct: round1(ret),
        sell_through_pct: sellThru, sell_through_target_pct: stTarget,
        inventory_age_bucket: ageBucket,
        size_breadth, color_breadth, promo_frequency_pct: promoFreq,
        is_event_sensitive: isEvent, is_weather_sensitive: isWeather,
        launch_date: launchDate, weeks_of_supply: wos,
        current_margin_pct: currentMargin, target_margin_pct: targetMargin,
        recommended_price: recPrice, price_change_pct: priceChange,
        projected_margin_pct: projMargin, revenue_impact: revImpact,
        recommendation_priority: recPriority,
        total_transactions: Math.round(txns),
        competitor_top3: top3,
      });
    }
  }
  return styles;
}

function isoDateOffset(daysFromAnchor: number): string {
  const anchor = new Date(ANCHOR_DATE + 'T00:00:00Z');
  anchor.setUTCDate(anchor.getUTCDate() + daysFromAnchor);
  return anchor.toISOString().slice(0, 10);
}

// ====================================================================
// GENERATORS — standalone files (12)
// ====================================================================
function genPriceKpis() {
  const revImpact = Math.round(gaussian(14_200_000, 900_000));
  const marginCur = round1(clamp(gaussian(54.2, 1.4), 50, 60));
  const marginProj = round1(marginCur + rb(2.4, 3.6));
  const promoRoi = round1(clamp(gaussian(2.3, 0.2), 1.6, 2.8));
  const compIdx = round1(clamp(gaussian(101.4, 2.6), 94, 110));
  const ragmCur = round1(marginCur * 0.74 - 1.6);
  const mdStyles = Math.round(clamp(gaussian(84, 12), 50, 130));
  const spark = (end: number, drift = 0.6) => {
    const arr: number[] = [];
    let v = end - drift * 6 - rb(0, drift * 2);
    for (let i = 0; i < 7; i++) { v += drift + rb(-0.1, 0.2); arr.push(round1(v)); }
    arr[6] = end;
    return arr;
  };
  return {
    revenue_impact: { value: revImpact, prior: Math.round(revImpact * 0.94), unit: '$', label: 'Revenue Impact' },
    avg_margin_current: { value: marginCur, prior: round1(marginCur - 0.6), unit: '%', label: 'Current Margin' },
    avg_margin_projected: { value: marginProj, prior: round1(marginProj - 3.2), unit: '%', label: 'Projected Margin' },
    promo_roi: { value: promoRoi, prior: round1(promoRoi - 0.3), unit: 'x', label: 'Promo ROI' },
    competitive_index: { value: compIdx, prior: round1(compIdx + 1.8), unit: '', label: 'Competitive Index' },
    sparklines: {
      revenue_impact: [11_800_000, 12_400_000, 12_800_000, 13_200_000, 13_400_000, 13_800_000, revImpact],
      margin_current: spark(marginCur, 0.4),
      margin_projected: spark(marginProj, 0.4),
      promo_roi: spark(promoRoi, 0.08),
      competitive_index: spark(compIdx, -0.4),
      ragm_current: spark(ragmCur, 0.2),
    },
    // apparel-additive
    ragm_current: { value: ragmCur, prior: round1(ragmCur - 0.6), unit: '%', label: 'RAGM (Returns-Adj)' },
    markdown_active_styles: { value: mdStyles, prior: mdStyles - 12, unit: '', label: 'Active Markdown Styles' },
  };
}

function genCompetitiveIndex(styles: Style[]) {
  const out: any[] = [];
  for (const d of DEPTS) {
    const rows = styles.filter(s => s.department === d);
    const avgCur = rows.reduce((s, x) => s + x.current_price, 0) / rows.length;
    const avgRec = rows.reduce((s, x) => s + x.recommended_price, 0) / rows.length;
    const avgMar = rows.reduce((s, x) => s + x.gross_margin_pct, 0) / rows.length;
    const compIdx = rows.reduce((s, x) => s + x.competitive_index, 0) / rows.length / 100;
    const topComp = pick(COMPETITORS);
    out.push({
      department: d,
      avg_current_price: num2str2(avgCur),
      avg_recommended_price: num2str2(avgRec),
      avg_margin: num2str1(avgMar),
      product_count: String(rows.length),
      competitive_index: num2str2(compIdx),
      top_competitor: topComp,
      vs_top_competitor_pct: num2str1((compIdx - 1) * 100),
    });
  }
  return out;
}

function genCostPassthrough() {
  const out: any[] = [];
  // grocery has `category` key; keep it.
  for (const d of DEPTS) {
    const cost_change = round1(clamp(gaussian(4, 1.4), 1.2, 8.5));
    const passthrough = round1(clamp(gaussian(72, 18), 32, 118));
    const price_change = round1(cost_change * passthrough / 100);
    const margin_impact = round1(price_change - cost_change);
    const ragm_impact = round1(margin_impact * 1.4);
    out.push({
      category: d, cost_change_pct: cost_change, price_change_pct: price_change,
      passthrough_rate: passthrough, margin_impact, ragm_impact,
    });
  }
  return out;
}

function genElasticityHeatmap(styles: Style[]) {
  const out: any[] = [];
  for (const d of DEPTS) {
    for (const c of CATEGORIES[d]) {
      const rows = styles.filter(s => s.department === d && s.category === c);
      if (rows.length === 0) continue;
      const avgEl = rows.reduce((s, x) => s + x.elasticity, 0) / rows.length;
      const avgMar = rows.reduce((s, x) => s + x.gross_margin_pct, 0) / rows.length;
      const avgRagm = rows.reduce((s, x) => s + x.ragm_pct, 0) / rows.length;
      out.push({
        department: d, category: c,
        avg_elasticity: num2str2(avgEl),
        product_count: String(rows.length),
        avg_margin: num2str1(avgMar),
        avg_ragm: num2str1(avgRagm),
      });
    }
  }
  return out;
}

function genMarginDistribution(styles: Style[]) {
  // grocery buckets: <5%, 5-10%, 10-15%, 15-20%, 20-25%, 25%+
  // we keep same ranges for parity. Apparel margins concentrate in higher buckets.
  const bucketsRanges = [
    { range: '<5%', lo: -100, hi: 5 },
    { range: '5-10%', lo: 5, hi: 10 },
    { range: '10-15%', lo: 10, hi: 15 },
    { range: '15-20%', lo: 15, hi: 20 },
    { range: '20-25%', lo: 20, hi: 25 },
    { range: '25%+', lo: 25, hi: 1000 },
  ];
  const ragmBucketsRanges = [
    { range: '<10%', lo: -100, hi: 10 },
    { range: '10-20%', lo: 10, hi: 20 },
    { range: '20-30%', lo: 20, hi: 30 },
    { range: '30-40%', lo: 30, hi: 40 },
    { range: '40-50%', lo: 40, hi: 50 },
    { range: '50%+', lo: 50, hi: 1000 },
  ];
  const bucketize = (vals: number[], rngs: typeof bucketsRanges, rev: number[]) => {
    return rngs.map(b => {
      const idx: number[] = [];
      vals.forEach((v, i) => { if (v >= b.lo && v < b.hi) idx.push(i); });
      const cnt = idx.length;
      const avgRev = cnt > 0 ? Math.round(idx.reduce((s, i) => s + rev[i], 0) / cnt) : 0;
      return { range: b.range, count: cnt, avg_revenue: avgRev };
    });
  };
  const cur = styles.map(s => s.gross_margin_pct);
  const proj = styles.map(s => s.projected_margin_pct);
  const ragm = styles.map(s => s.ragm_pct);
  const projRagm = styles.map(s => Math.min(s.ragm_pct + rb(2, 5), 60));
  const revs = styles.map(s => Math.round(s.current_price * s.total_transactions));
  return {
    current: bucketize(cur, bucketsRanges, revs),
    projected: bucketize(proj, bucketsRanges, revs),
    current_ragm: bucketize(ragm, ragmBucketsRanges, revs),
    projected_ragm: bucketize(projRagm, ragmBucketsRanges, revs),
  };
}

function genPriceMarkdown(styles: Style[]) {
  const mdStyles = styles.filter(s => s.markdown_step !== 'full_price');
  const cleared7 = Math.round(mdStyles.length * 0.28);
  const cleared14 = Math.round(mdStyles.length * 0.42);
  const cleared30 = Math.round(mdStyles.length * 0.62);
  const active30 = mdStyles.length - cleared30;
  const totalRecov = Math.round(mdStyles.reduce((s, x) => s + x.msrp * 240 * 0.6, 0));
  const totalOrig = Math.round(mdStyles.reduce((s, x) => s + x.msrp * 240, 0));
  const stuckCount = mdStyles.filter(s => s.is_stuck).length;

  const by_bucket = [
    { bucket: '<7 days', count: cleared7, avg_discount: 25, recovery_rate: 88.2 },
    { bucket: '8-14 days', count: cleared14 - cleared7, avg_discount: 40, recovery_rate: 72.5 },
    { bucket: '15-30 days', count: cleared30 - cleared14, avg_discount: 60, recovery_rate: 58.2 },
    { bucket: '>30 days', count: active30, avg_discount: 78, recovery_rate: 38.6 },
  ];
  const recovery_trend = Array.from({ length: 12 }, (_, i) => ({
    week: `W${i + 1}`,
    cumulative_recovery: Math.round(totalRecov * (i + 1) / 12),
    target: totalOrig,
  }));
  const top_markdown_products = mdStyles.slice(0, 10).map(s => ({
    product_id: s.product_id,
    product_name: s.product_name,
    department: s.department,
    original_price: s.msrp,
    markdown_price: s.current_price,
    discount_pct: Math.round((1 - s.current_price / s.msrp) * 100),
    days_active: s.days_in_step,
    units_sold: ri(140, 1840),
    recovery_pct: round1(clamp(gaussian(64, 16), 18, 92)),
  }));

  const stepRecov: Record<string, { count: number; days: number; targ: number; stuck: number; val: number; exp: number }> = {};
  for (const step of ['md25', 'md40', 'md60', 'md80', 'clearance']) {
    const rows = mdStyles.filter(s => s.markdown_step === step);
    const val = rows.reduce((s, x) => s + x.msrp * 240, 0);
    const expRecov = rows.reduce((s, x) => s + x.current_price * 240 * 0.65, 0);
    stepRecov[step] = {
      count: rows.length,
      days: rows.length > 0 ? Math.round(rows.reduce((s, x) => s + x.days_in_step, 0) / rows.length) : 0,
      targ: STEP_TARGET_DAYS[step],
      stuck: rows.filter(x => x.is_stuck).length,
      val: Math.round(val),
      exp: Math.round(expRecov),
    };
  }

  return {
    summary: {
      total_markdown_skus: mdStyles.length,
      cleared_in_7d: cleared7,
      cleared_in_14d: cleared14,
      cleared_in_30d: cleared30,
      still_active_30d_plus: active30,
      total_recovery: totalRecov,
      total_original_value: totalOrig,
      recovery_rate: round1(totalRecov / totalOrig * 100),
      // additive
      cadence_compliance_pct: round1(clamp(gaussian(78, 4), 60, 92)),
      stuck_styles: stuckCount,
    },
    by_bucket,
    recovery_trend,
    top_markdown_products,
    // additive
    by_cadence_step: Object.entries(stepRecov).map(([step, v]) => ({
      step,
      style_count: v.count,
      avg_days_in_step: v.days,
      target_days_in_step: v.targ,
      stuck_count: v.stuck,
      total_value_usd: v.val,
      expected_recovery_usd: v.exp,
    })),
  };
}

function genPositionMap(styles: Style[]) {
  const top80 = [...styles].sort((a, b) => b.total_transactions - a.total_transactions).slice(0, 80);
  return top80.map(s => ({
    product_id: s.product_id,
    product_name: s.product_name,
    department: s.department,
    price: num2str2(s.current_price),
    margin_pct: num2str1(s.gross_margin_pct),
    volume: String(s.total_transactions),
    elasticity: num2str2(s.elasticity),
    // additive
    brand: s.brand,
    ragm_pct: num2str1(s.ragm_pct),
    competitive_index: num2str1(s.competitive_index),
  }));
}

function genProductTable(styles: Style[]) {
  return styles.map(s => ({
    product_id: s.product_id,
    product_name: s.product_name,
    department: s.department,
    category: s.category,
    unit_cost: num2str2(s.cost),
    current_price: num2str2(s.current_price),
    recommended_price: num2str2(s.recommended_price),
    price_change_pct: num2str1(s.price_change_pct),
    current_margin_pct: num2str1(s.current_margin_pct),
    elasticity: num2str2(s.elasticity),
    total_transactions: String(s.total_transactions),
    priority: s.recommendation_priority,
  }));
}

function genRecommendations(styles: Style[]) {
  return styles.map(s => {
    const currentRev = Math.round(s.current_price * s.total_transactions);
    const projRev = Math.round(s.recommended_price * s.total_transactions * (1 + s.elasticity * s.price_change_pct / 100));
    return {
      product_id: s.product_id,
      product_name: s.product_name,
      department: s.department,
      category: s.category,
      unit_cost: s.cost,
      current_price: s.current_price,
      recommended_price: s.recommended_price,
      price_change_pct: s.price_change_pct,
      current_margin_pct: s.current_margin_pct,
      projected_margin_pct: s.projected_margin_pct,
      elasticity_estimate: s.elasticity,
      total_transactions: s.total_transactions,
      current_revenue: currentRev,
      projected_revenue: projRev,
      revenue_impact: projRev - currentRev,
      recommendation_priority: s.recommendation_priority,
      action_status: 'pending',
    };
  });
}

function genPromoCalendar() {
  const out: any[] = [];
  for (const d of DEPTS) {
    for (const wk of ['W1', 'W2', 'W3', 'W4'] as const) {
      const active = r() < 0.55;
      if (active) {
        const mech = pick(PROMO_MECHANICS);
        const ev = pick(US_EVENTS);
        out.push({
          category: d, week: wk,
          promo_type: PROMO_MECHANIC_LABELS[mech],
          expected_lift: ri(15, 45),
          discount: [20, 25, 30, 40, 50][ri(0, 4)],
          active: true,
          mechanic_id: mech,
          event_anchor: ev.name,
        });
      } else {
        out.push({
          category: d, week: wk, promo_type: null,
          expected_lift: null, discount: null, active: false,
          mechanic_id: null, event_anchor: null,
        });
      }
    }
  }
  return out;
}

function genAlerts() {
  const items = [
    { type: 'critical', message: "Women's Bottoms RAGM erosion: 14 styles below 30% RAGM due to returns spike", related_chart: 'margin_distribution', category: "Women's Bottoms", impact: -1_840_000 },
    { type: 'warning', message: "Competitive gap widening in Men's Footwear — Nike Air Force 1 cheaper at Foot Locker by 9%", related_chart: 'competitive_index', category: 'Footwear', impact: -920_000 },
    { type: 'warning', message: 'Markdown stuck cohort: 28 styles past target days_in_step >40% — BTS floor space risk', related_chart: 'markdown_performance', category: null, impact: -2_240_000 },
    { type: 'info', message: 'Cadence opportunity: 18 styles can skip md60 (sell-through already 78%) — direct to clearance', related_chart: 'markdown_performance', category: null, impact: 1_240_000 },
    { type: 'info', message: 'A/B test ready: 12 fashion styles with high elasticity flagged for price tests', related_chart: 'ab_tests', category: null, impact: 840_000 },
    { type: 'info', message: 'BFCM overlap: 4 active markdown styles in W Puffers — pre-clear by Nov 15', related_chart: 'promo_calendar', category: "Women's Tops", impact: 1_460_000 },
  ];
  return items;
}

function genAbTests(styles: Style[]) {
  const candidates = styles.filter(s => s.elasticity_class === 'elastic').slice(0, 8);
  return candidates.map((s, i) => {
    const ctlPrice = s.current_price;
    const testPrice = round2(s.recommended_price);
    const ctlQty = ri(820, 14_400);
    const testQty = Math.round(ctlQty * (1 + s.elasticity * (testPrice - ctlPrice) / ctlPrice));
    const liftPct = round1((testQty - ctlQty) / ctlQty * 100);
    const revLiftPct = round1(((testQty * testPrice) - (ctlQty * ctlPrice)) / (ctlQty * ctlPrice) * 100);
    return {
      test_id: `TEST-${String(i + 1).padStart(3, '0')}`,
      product_name: s.product_name,
      department: s.department,
      control_price: ctlPrice,
      test_price: testPrice,
      control_qty: ctlQty,
      test_qty: testQty,
      lift_pct: liftPct,
      revenue_lift_pct: revLiftPct,
      significance: pick(['95%', '92%', '88%', '99%']),
      winner: revLiftPct > 0 ? 'test' : 'control',
      status: pick(['completed', 'completed', 'completed', 'running']),
      // additive
      mechanic: pick(PROMO_MECHANICS),
      style_id: s.style_id,
      brand: s.brand,
    };
  });
}

// ====================================================================
// CORE.JSON (the big nested one)
// ====================================================================
function genHeadline(): any {
  return {
    sentence: 'You are leaving $1.82M on the table this week — $0.78M in BFCM-overlap free-rider, $0.42M in premature markdowns, $0.34M in returns-margin leak, $0.28M in elasticity gap.',
    supporting_line: 'Optimization model has 14 actionable recommendations that could recover $1.24M this week.',
    week_label: 'Week of Jun 29, 2026',
    season_context: 'BTS ramp · 26 days to Back-to-School peak',
  };
}

function genKpis(styles: Style[]): any {
  const avgMargin = round1(styles.reduce((s, x) => s + x.gross_margin_pct, 0) / styles.length);
  const avgRagm = round1(styles.reduce((s, x) => s + x.ragm_pct, 0) / styles.length);
  const sellThru = round1(styles.reduce((s, x) => s + x.sell_through_pct, 0) / styles.length);
  const mdShare = round1(styles.filter(s => s.markdown_step !== 'full_price').length / styles.length * 100);
  return {
    margin_realization_pct: round1(clamp(gaussian(87, 1.6), 84, 92)),
    margin_realization_trend: round1(rb(-0.6, 1.4)),
    gross_margin_pct: avgMargin,
    gross_margin_vs_floor: round1(avgMargin - 53),
    promo_roi_index: round1(clamp(gaussian(68, 4), 60, 78)),
    promo_roi_trend: round1(rb(1.4, 4.2)),
    free_rider_ratio_pct: round1(clamp(gaussian(40, 3), 32, 48)),
    sell_through_pct: sellThru,
    sell_through_vs_target: round1(sellThru - 65),
    active_alerts: ri(18, 32),
    total_margin_leakage_inr: 1_820_000,    // grocery key with USD value (parity)
    margin_leakage_breakdown: {
      promo_free_rider_inr: 780_000,
      cost_passthrough_gap_inr: 220_000,
      premature_markdown_inr: 420_000,
      elasticity_underpricing_inr: 280_000,
      // additive
      returns_margin_loss_usd: 340_000,
    },
    weeks_of_supply: round1(clamp(gaussian(7.8, 1.2), 4, 11)),
    weeks_of_supply_trend: round1(rb(-0.6, 0.6)),
    trend_12w: Array.from({ length: 12 }, (_, i) => ({
      week: i + 1,
      margin_realization_pct: round1(85 + i * 0.18),
      promo_roi: round1(2.0 + i * 0.04),
      sell_through: round1(58 + i * 0.6),
      // additive
      ragm_pct: round1(36 + i * 0.18),
    })),
    // additive
    ragm_pct: avgRagm,
    ragm_vs_floor: round1(avgRagm - 42),
    markdown_pressure_pct: mdShare,
  };
}

const ALERT_TYPES = ['markdown_stuck', 'competitive_match', 'free_rider', 'cost_passthrough', 'margin_floor', 'elasticity_opportunity', 'size_break_oos', 'returns_margin', 'promo_ending', 'presell_window'] as const;

function genActionQueue(styles: Style[]): any[] {
  const out: any[] = [];
  const distribution: Array<[typeof ALERT_TYPES[number], number]> = [
    ['markdown_stuck', 0.35], ['competitive_match', 0.15], ['returns_margin', 0.12],
    ['free_rider', 0.10], ['size_break_oos', 0.08], ['margin_floor', 0.08],
    ['elasticity_opportunity', 0.05], ['presell_window', 0.04], ['cost_passthrough', 0.03],
  ];
  for (let i = 0; i < 10; i++) {
    const at = weightedPick(distribution);
    const s = pick(styles.filter(x => at === 'markdown_stuck' ? x.is_stuck : true).concat(styles));
    const priority = i < 4 ? 'urgent' : i < 8 ? 'review' : 'info';
    const sizeColor = `${pick(['S', 'M', 'L', 'XL', '32×32', '34×32', '8', '9.5'])} ${pick(['Indigo', 'Black', 'Navy', 'Cream', 'Olive', 'Burgundy'])}`;
    const fin = Math.round(rb(8_000, 84_000));
    out.push({
      id: `AQ-A${String(i + 1).padStart(3, '0')}`,
      priority,
      alert_type: at,
      sku_id: s.product_id,
      product_name: s.product_name,
      department: s.department,
      category: s.category,
      headline: actionHeadline(at, s),
      recommended_action: actionRecommendation(at, s),
      financial_impact_inr: fin,   // grocery key with USD value
      confidence: pick(['high', 'medium', 'high', 'high', 'low']),
      action_window: pick(['Act by EOD', 'Act by Friday', 'Act by Thursday', 'Review by Friday', 'Monitor']),
      status: r() < 0.85 ? 'pending' : 'snoozed',
      // additive
      style_id: s.style_id,
      size_color_dim: sizeColor,
    });
  }
  return out;
}

function actionHeadline(at: string, s: Style): string {
  if (at === 'markdown_stuck') return `Stuck in ${STEP_LABEL[s.markdown_step]} for ${s.days_in_step} days (target ${s.target_days_in_step}d) — sell-through ${s.sell_through_pct}%.`;
  if (at === 'competitive_match') return `Competitor dropped to $${round2(s.current_price * 0.78)} vs our $${s.current_price} — competitive index ${s.competitive_index}.`;
  if (at === 'returns_margin') return `Returns at ${s.return_rate_pct}% on this style — RAGM collapsed to ${s.ragm_pct}% vs ${s.gross_margin_pct}% gross.`;
  if (at === 'free_rider') return `Free-rider ratio ${ri(58, 72)}% on recent promo — wasted spend on already-loyal buyers.`;
  if (at === 'size_break_oos') return `Size-break OOS in ${pick(['XS', '2XL', '38×32', '11W'])} — losing premium customers.`;
  if (at === 'margin_floor') return `Margin ${s.gross_margin_pct}% vs floor ${MARGIN_FLOORS[s.department].floor}% — pricing pressure.`;
  if (at === 'elasticity_opportunity') return `Elasticity ${s.elasticity} suggests +${ri(5, 12)}% price headroom.`;
  if (at === 'presell_window') return `${pick(['BFCM', 'BTS', 'Labor Day'])} presell window opens in ${ri(8, 24)} days.`;
  return `Cost up ${ri(3, 8)}%; passthrough only ${ri(40, 70)}%.`;
}

function actionRecommendation(at: string, s: Style): string {
  if (at === 'markdown_stuck') return `Advance to next step (e.g., -60%) by Friday; recovers ~$${ri(18, 64)}K.`;
  if (at === 'competitive_match') return `Match to $${round2(s.current_price * 0.85)} (premium retained); recovers ~$${ri(18, 42)}K weekly.`;
  if (at === 'returns_margin') return 'Pause web promo; add fit-guide module; expected returns drop 8-12pp.';
  if (at === 'free_rider') return 'Tighten audience to lapsed/at-risk only; expected ROI +0.6x.';
  if (at === 'size_break_oos') return 'Submit STO request; reroute 24-48 units from low-velocity store.';
  if (at === 'margin_floor') return 'Hold price; rework cost structure with supplier next QBR.';
  if (at === 'elasticity_opportunity') return `Test +${ri(5, 9)}% price hike on top 3 SKUs for 14 days.`;
  if (at === 'presell_window') return 'Lock allocation by EOW; pre-clear conflicting markdowns.';
  return 'Pass through 70%+ of cost increase; reset price column.';
}

function genLiveActivity(): any[] {
  const events = [
    { event_type: 'competitive_drop', severity: 'red', headline: "Macy's dropped Levi's 501 indigo to $49.50 (was $69.50)", detail: 'Detected by web scrape · category Men\'s Bottoms · gap widened to -29%', ago: '2h ago' },
    { event_type: 'markdown_triggered', severity: 'amber', headline: 'Lululemon Align HR 25" black size 6 hit 88% sell-through', detail: 'Auto-snap to md25 queued for approval', ago: '41 min ago' },
    { event_type: 'season_alert', severity: 'blue', headline: 'BTS ramp signal: Kids Tops volume +24% WoW', detail: 'Recommend allocation +18% to top 12 styles', ago: '3h ago' },
    { event_type: 'returns_spike', severity: 'red', headline: 'Returns spike: H&M linen midi M — 38% returns last 14d', detail: 'Top reason: Fit (54%) · pause web promo', ago: '1h ago' },
    { event_type: 'campaign_live', severity: 'green', headline: 'Mother\'s Day Dress GWP live · day 2', detail: 'Lift +118% vs baseline · ROI 2.6x', ago: '14h ago' },
    { event_type: 'cost_alert', severity: 'amber', headline: 'Cotton spot price up 6.2% — denim margin under pressure', detail: 'Next PO cycle Aug 4 · review pass-through', ago: '5h ago' },
    { event_type: 'elasticity_update', severity: 'blue', headline: 'Nike crew tee elasticity refit: -0.82 (was -0.94)', detail: 'Headroom +7% on Adult Basics line', ago: '8h ago' },
    { event_type: 'promo_accepted', severity: 'green', headline: 'Free-Shipping >$50 mechanic approved for Web', detail: 'Live Wed; budget $240K · projected ROI 3.1x', ago: '12h ago' },
  ];
  return events.map((e, i) => ({
    id: `LA-A${String(i + 1).padStart(3, '0')}`,
    event_type: e.event_type,
    severity: e.severity,
    headline: e.headline,
    detail: e.detail,
    timestamp_ago: e.ago,
  }));
}

function genSkusForCore(styles: Style[]): any[] {
  return styles.map(s => ({
    sku_id: s.product_id,
    product_name: s.product_name,
    department: s.department,
    category: s.category,
    subcategory: s.subcategory,
    velocity_class: s.velocity_class,
    mrp_inr: s.msrp,                        // grocery key
    cost_inr: s.cost,                       // grocery key
    current_price_inr: s.current_price,     // grocery key
    current_margin_pct: s.current_margin_pct,
    target_margin_pct: s.target_margin_pct,
    elasticity: s.elasticity,
    elasticity_class: s.elasticity_class,
    recommended_price_inr: s.recommended_price,
    price_change_pct: s.price_change_pct,
    projected_margin_pct: s.projected_margin_pct,
    revenue_impact_inr: s.revenue_impact,
    recommendation_priority: s.recommendation_priority,
    is_festival_sensitive: s.is_event_sensitive,
    is_weather_sensitive: s.is_weather_sensitive,
    launch_date: s.launch_date,
    promo_frequency_pct: s.promo_frequency_pct,
    weeks_of_supply: s.weeks_of_supply,
    sell_through_pct: s.sell_through_pct,
    sell_through_target_pct: s.sell_through_target_pct,
    inventory_age_bucket: s.inventory_age_bucket,
    // additive (whitelisted)
    style_id: s.style_id,
    brand: s.brand,
    ragm_pct: s.ragm_pct,
    weeks_on_floor: s.weeks_on_floor,
    lifecycle_stage: s.lifecycle_stage,
    markdown_step: s.markdown_step,
    days_in_step: s.days_in_step,
    season_tag: s.season_tag,
    competitive_index: s.competitive_index,
    competitor_top3: s.competitor_top3,
    return_rate_pct: s.return_rate_pct,
    size_breadth: s.size_breadth,
    color_breadth: s.color_breadth,
  }));
}

function genDepartments(styles: Style[]): any[] {
  return DEPTS.map(d => {
    const rows = styles.filter(s => s.department === d);
    const fl = MARGIN_FLOORS[d];
    const cur = round1(rows.reduce((s, x) => s + x.gross_margin_pct, 0) / rows.length);
    const ragm = round1(rows.reduce((s, x) => s + x.ragm_pct, 0) / rows.length);
    const sellThru = round1(rows.reduce((s, x) => s + x.sell_through_pct, 0) / rows.length);
    const sellTarget = round1(rows.reduce((s, x) => s + x.sell_through_target_pct, 0) / rows.length);
    return {
      name: d,
      sku_count: rows.length,
      margin_floor_pct: fl.floor,
      current_margin_pct: cur,
      margin_vs_floor: round1(cur - fl.floor),
      promo_roi_index: round1(clamp(gaussian(66, 6), 52, 78)),
      sell_through_pct: sellThru,
      sell_through_target_pct: sellTarget,
      categories: CATEGORIES[d],
      // additive
      ragm_pct: ragm,
      ragm_vs_floor: round1(ragm - fl.ragm_floor),
    };
  });
}

function genCampaigns(styles: Style[]): any[] {
  const events = US_EVENTS.slice(0, 12);
  return events.map((ev, i) => {
    const dept = pick(DEPTS);
    const budget = ri(200_000, 2_800_000);
    const lift = ri(120, 280);
    const incRev = Math.round(budget * (2.0 + r() * 2.2));
    const gross = Math.round(incRev * 1.28);
    const roi = round2(incRev / budget);
    const freeRider = round1(clamp(gaussian(46, 8), 32, 62));
    const startDate = ev.date;
    const startDt = new Date(ev.date + 'T00:00:00Z');
    startDt.setUTCDate(startDt.getUTCDate() + ri(2, 5));
    const endDate = startDt.toISOString().slice(0, 10);
    const status: string = new Date(ev.date) < new Date(ANCHOR_DATE) ? 'completed' : 'scheduled';
    const sample = styles.filter(s => s.department === dept).slice(0, 4).map(s => s.product_id);
    const overlap = sample.some(id => {
      const st = styles.find(x => x.product_id === id);
      return st && st.markdown_step !== 'full_price';
    });
    return {
      campaign_id: `CAMP-A${String(i + 1).padStart(3, '0')}`,
      campaign_name: `${ev.name} ${dept.split("'")[0]} ${PROMO_MECHANIC_LABELS[ev.mech]}`,
      mechanic: ev.mech,
      department: dept,
      category: pick(CATEGORIES[dept]),
      budget_inr: budget,
      start_date: startDate,
      end_date: endDate,
      status,
      spend_to_date_inr: status === 'completed' ? budget : status === 'live' ? Math.round(budget * 0.4) : 0,
      incremental_revenue_inr: status === 'scheduled' ? Math.round(incRev * 0.0) : incRev,
      gross_promo_revenue_inr: status === 'scheduled' ? 0 : gross,
      roi,
      free_rider_ratio_pct: freeRider,
      post_promo_dip_pct: round1(-rb(10, 22)),
      lift_pct: lift,
      cannibalization_inr: Math.round(incRev * 0.06),
      net_incremental_inr: Math.round(incRev * 0.92),
      confidence: round2(clamp(gaussian(0.78, 0.08), 0.5, 0.95)),
      affected_skus: sample,
      // additive
      event_anchor: ev.name,
      markdown_overlap_flag: overlap,
    };
  });
}

function genPromoROITrend(): any[] {
  return Array.from({ length: 14 }, (_, i) => {
    const wk = i + 1;
    const event = US_EVENTS[i % US_EVENTS.length];
    return {
      week: wk,
      week_label: `W${wk}`,
      roi: round2(clamp(gaussian(2.3, 0.4), 1.4, 3.4)),
      spend_inr: ri(180_000, 1_400_000),
      incremental_revenue_inr: ri(420_000, 3_800_000),
      goal_roi: 2.5,
      active_campaign_name: `${event.name} ${PROMO_MECHANIC_LABELS[event.mech]}`,
    };
  });
}

function genAISuggestions(): any[] {
  const suggestions = [
    { title: 'Cut July 4 cargo shorts', expl: 'Free-rider 58%, recommend pause; redirect to BTS Kids Tops.', badge: 'pause', impact: 184_000 },
    { title: 'Extend Labor Day denim BOGO', expl: 'Sell-through 38% (target 70%); 1-week extension yields +$220K.', badge: 'extend', impact: 220_000 },
    { title: "Raise Mother's Day GWP depth", expl: 'VIP elasticity unlocked; from 15% to 22% gives +$184K incremental.', badge: 'increase', impact: 184_000 },
    { title: 'Pause Premium Tee Trial', expl: 'ROI 0.78x after 3 weeks; free-rider 71%.', badge: 'pause', impact: 92_000 },
    { title: 'Redirect H&M Linen capsule budget', expl: 'Shift to BTS Kids Tops campaign — 2.6x projected vs 1.4x.', badge: 'redirect', impact: 248_000 },
  ];
  return suggestions.map((sg, i) => ({
    id: `AI-${String(i + 1).padStart(3, '0')}`,
    type: sg.badge,
    badge_label: sg.badge.charAt(0).toUpperCase() + sg.badge.slice(1),
    badge_color: sg.badge === 'pause' ? '#EF4444' : sg.badge === 'extend' ? '#10B981' : sg.badge === 'increase' ? '#3B82F6' : '#F59E0B',
    campaign_name: sg.title,
    sku_or_category: pick(['BTS Kids Tops', 'Memorial Denim', 'July 4 Cargo', "Mother's Day GWP", 'Premium Tee Trial']),
    explanation: sg.expl,
    financial_impact_inr: sg.impact,
    confidence: round2(clamp(gaussian(0.78, 0.08), 0.55, 0.95)),
    action_label: sg.badge === 'pause' ? 'Pause Campaign' : sg.badge === 'extend' ? 'Extend by 1 Week' : sg.badge === 'increase' ? 'Raise Depth' : 'Reallocate Budget',
  }));
}

function genLiftBySegment(): any[] {
  const segs = ['VIP', 'Loyalist', 'Enthusiast', 'Casual', 'At-Risk', 'Lapsed'];
  const lifts = [12, 18, 22, 28, 34, 38];
  const free = [68, 56, 48, 42, 38, 30];
  return segs.map((seg, i) => ({
    segment: seg,
    lift_pct: lifts[i] + ri(-2, 2),
    free_rider_ratio_pct: free[i] + ri(-3, 3),
    bar_width_pct: Math.round(lifts[i] * 2.4),
  }));
}

function genMechanicROI(): any[] {
  const shares = { bogo_50: 22, b2g1_half: 14, pct_off: 28, dollar_off: 8, bundle: 9, gwp: 5, tiered: 7, free_ship: 4, member_excl: 3 };
  const rois = { bogo_50: 2.8, b2g1_half: 2.5, pct_off: 2.0, dollar_off: 2.3, bundle: 2.6, gwp: 2.1, tiered: 2.2, free_ship: 2.9, member_excl: 3.4 };
  return PROMO_MECHANICS.map(m => ({
    mechanic: PROMO_MECHANIC_LABELS[m],
    roi: rois[m],
    color: PROMO_MECHANIC_COLORS[m],
    share_pct: shares[m],
  }));
}

function genSellThroughHeatmap(styles: Style[]): any[] {
  const out: any[] = [];
  for (const d of DEPTS) {
    for (const c of CATEGORIES[d]) {
      const rows = styles.filter(s => s.department === d && s.category === c);
      if (rows.length === 0) continue;
      const base = rows.reduce((s, x) => s + x.sell_through_pct, 0) / rows.length;
      const values: number[] = [];
      for (let i = 0; i < 14; i++) {
        if (i < 8) {
          values.push(round1(clamp(base * (i + 1) / 8 + rb(-3, 3), 0, 99)));
        } else {
          values.push(0);
        }
      }
      out.push({
        category: c, department: d,
        values, target_pct: rows[0].sell_through_target_pct,
      });
    }
  }
  return out.slice(0, 16);
}

function genMarkdownQueue(styles: Style[]): any[] {
  const candidates = styles.filter(s => s.markdown_step !== 'full_price').slice(0, 24);
  return candidates.map(s => {
    const nextStep = s.markdown_step === 'md25' ? 'md40' :
      s.markdown_step === 'md40' ? 'md60' :
      s.markdown_step === 'md60' ? 'md80' :
      s.markdown_step === 'md80' ? 'clearance' : 'clearance';
    const recDepth = STEP_DEPTH[nextStep] as -25 | -40 | -60 | -80;
    return {
      sku_id: s.product_id,
      product_name: s.product_name,
      category: s.category,
      department: s.department,
      current_sell_through_pct: s.sell_through_pct,
      target_sell_through_pct: s.sell_through_target_pct,
      days_remaining: Math.max(0, s.target_days_in_step - s.days_in_step),
      weeks_of_supply: s.weeks_of_supply,
      recommended_depth_pct: recDepth,
      recommended_price_inr: round2(s.msrp * (1 + recDepth / 100)),
      units_at_risk: ri(180, 980),
      revenue_at_risk_inr: ri(18_000, 82_000),
      urgency_score: s.is_stuck ? ri(75, 95) : ri(40, 70),
      inventory_age_bucket: s.inventory_age_bucket,
      status: 'pending',
      // additive
      style_id: s.style_id,
      brand: s.brand,
      color: pick(['Indigo', 'Black', 'Navy', 'Cream', 'Olive', 'Burgundy', 'Charcoal']),
      size: s.department === 'Footwear' ? pick(['8', '9', '9.5', '10', '11']) : pick(['S', 'M', 'L', 'XL', '32×32', 'All sizes']),
      weeks_on_floor: s.weeks_on_floor,
      current_markdown_step: s.markdown_step,
      recommended_markdown_step: nextStep,
      lifecycle_stage: s.lifecycle_stage,
      days_in_step: s.days_in_step,
      is_stuck: s.is_stuck,
    };
  });
}

function genInventoryAging(styles: Style[]): any {
  const buckets = ['0-4W', '5-8W', '9-12W', '13W+'] as const;
  const out: any = { insight: '13W+ stock down 32% vs same week last year — markdown cadence working' };
  const keys: Record<string, string> = {
    '0-4W': 'bucket_0_4w', '5-8W': 'bucket_5_8w', '9-12W': 'bucket_9_12w', '13W+': 'bucket_13w_plus',
  };
  for (const b of buckets) {
    const rows = styles.filter(s => s.inventory_age_bucket === b);
    const units = rows.reduce((s, x) => s + 200 + Math.round(x.weeks_on_floor * 4), 0);
    const val = Math.round(rows.reduce((s, x) => s + x.msrp * 200, 0));
    const obj: any = { units, value_inr: val };
    if (b === '5-8W' || b === '9-12W' || b === '13W+') {
      obj.flag = b === '13W+';
    }
    out[keys[b]] = obj;
  }
  // additive
  const ss25Val = styles.filter(s => s.season_tag === 'SS25' || s.season_tag === 'FW25')
    .reduce((s, x) => s + x.msrp * 200, 0);
  out.season_carryover_usd = Math.round(ss25Val);
  return out;
}

function genChannelPerformance(): any[] {
  const channels = [
    { channel: 'In-Store', conv: 18 },
    { channel: 'Online-Web', conv: 2.2 },
    { channel: 'Online-App', conv: 3.4 },
    { channel: 'Marketplace', conv: 1.6 },
  ];
  return channels.map((c, i) => {
    const rev = ri(2_400_000, 8_400_000);
    return {
      channel: c.channel,
      revenue_inr: rev,
      revenue_lift_pct: round1(rb(-3, 14)),
      bar_width_pct: 60 + ri(10, 35),
      baseline_bar_width_pct: 60 + ri(8, 28),
      // additive
      conversion_pct: c.conv,
    };
  });
}

function genMarginWaterfall(): any[] {
  return [
    { label: 'Theoretical max', value_inr: 14_800_000, is_total: true, color_type: 'base' },
    { label: 'Free-rider waste', value_inr: -780_000, is_total: false, color_type: 'leak' },
    { label: 'Cost passthrough gap', value_inr: -220_000, is_total: false, color_type: 'leak' },
    { label: 'Premature markdown', value_inr: -420_000, is_total: false, color_type: 'apparel_leak' },
    { label: 'Elasticity gap', value_inr: -280_000, is_total: false, color_type: 'leak' },
    { label: 'Return-margin loss', value_inr: -340_000, is_total: false, color_type: 'apparel_leak' },
    { label: 'Realized', value_inr: 12_760_000, is_total: true, color_type: 'result' },
  ];
}

function genForecast14w(): any[] {
  const events: Record<number, string> = { 4: 'BTS Peak', 9: 'Labor Day', 14: 'Columbus Day' };
  return Array.from({ length: 14 }, (_, i) => {
    const wk = i + 1;
    const dt = new Date(ANCHOR_DATE + 'T00:00:00Z');
    dt.setUTCDate(dt.getUTCDate() + wk * 7);
    const isoLbl = dt.toISOString().slice(5, 10).replace('-', '/');
    const seasonal = wk < 4 ? 1.0 : wk < 8 ? 2.0 : wk < 12 ? 1.4 : 1.6;
    const baseRev = 12_400_000 * seasonal;
    return {
      week: wk,
      week_label: `W${wk} ${isoLbl}`,
      forecast_revenue_inr: Math.round(baseRev),
      forecast_margin_inr: Math.round(baseRev * 0.42),
      lower_ci_inr: Math.round(baseRev * 0.88),
      upper_ci_inr: Math.round(baseRev * 1.12),
      seasonality_index: round2(seasonal),
      event_label: events[wk] || null,
      // additive
      ragm_forecast_usd: Math.round(baseRev * 0.32),
    };
  });
}

function genModelCard(styles: Style[]): any {
  const avgCur = styles.reduce((s, x) => s + x.gross_margin_pct, 0) / styles.length / 100;
  const avgProj = styles.reduce((s, x) => s + x.projected_margin_pct, 0) / styles.length / 100;
  const avgRagm = styles.reduce((s, x) => s + x.ragm_pct, 0) / styles.length / 100;
  return {
    experiment: '/Shared/apparel_price_optimization',
    target_margin_pct: 0.58,
    max_price_increase_pct: 0.15,
    max_price_decrease_pct: 0.40,
    min_transactions: 100,
    products_analyzed: 200,
    avg_current_margin: round4(avgCur),
    avg_projected_margin: round4(avgProj),
    total_revenue_impact: styles.reduce((s, x) => s + x.revenue_impact, 0),
    products_with_increase: styles.filter(s => s.price_change_pct > 0).length,
    products_with_decrease: styles.filter(s => s.price_change_pct < 0).length,
    // additive
    avg_current_ragm: round4(avgRagm),
    avg_projected_ragm: round4(avgRagm + 0.024),
    cadence_compliance_pct: 78,
  };
}

function genCore(styles: Style[]): any {
  return {
    generated_at: new Date('2026-06-29T00:00:00.000Z').toISOString(),
    anchor_date: ANCHOR_DATE,
    headline: genHeadline(),
    kpis: genKpis(styles),
    action_queue: genActionQueue(styles),
    live_activity: genLiveActivity(),
    skus: genSkusForCore(styles),
    departments: genDepartments(styles),
    campaigns: genCampaigns(styles),
    promo_roi_trend: genPromoROITrend(),
    ai_suggestions: genAISuggestions(),
    lift_by_segment: genLiftBySegment(),
    mechanic_roi: genMechanicROI(),
    sell_through_heatmap: genSellThroughHeatmap(styles),
    markdown_queue: genMarkdownQueue(styles),
    inventory_aging: genInventoryAging(styles),
    channel_performance: genChannelPerformance(),
    margin_waterfall: genMarginWaterfall(),
    forecast_14w: genForecast14w(),
    model_card: genModelCard(styles),
    // Phase E additive
    markdown_cadence_ladder: ['full_price','md25','md40','md60','md80','clearance'].map((step, i) => {
      const startUnits = 1000;
      const survival = [1, 0.62, 0.41, 0.24, 0.12, 0.05][i];
      const units = Math.round(startUnits * survival);
      const targetDays = [14, 21, 14, 14, 14, 9999][i];
      const actualDays = Math.round(targetDays * (0.7 + r()*0.9));
      const isStuck = i > 0 && i < 5 && actualDays > targetDays * 1.4;
      return {
        step,
        label: ['Full Price','25% off','40% off','60% off','80% off','Clearance'][i],
        units_remaining: units,
        units_sold_in_step: i === 0 ? 380 : Math.round(units * 0.4),
        target_days_in_step: targetDays,
        actual_days_in_step: actualDays,
        is_stuck: isStuck,
        margin_pct: [56,42,33,22,12,4][i],
        revenue_usd: units * [85,65,52,38,22,12][i],
      };
    }),
    size_color_price_grid: {
      style_id: 'STY-A042',
      style_name: 'Performance Crew Tee',
      sizes: ['XS','S','M','L','XL','XXL'],
      colors: ['Black','Navy','Olive','Burgundy','Cream'],
      cells: (() => {
        const out: any[] = [];
        const sizes = ['XS','S','M','L','XL','XXL'];
        const colors = ['Black','Navy','Olive','Burgundy','Cream'];
        const sizeWeight = [0.8, 1.0, 1.15, 1.1, 0.95, 0.7];
        const colorWeight = { Black:1.1, Navy:1.05, Olive:0.95, Burgundy:0.85, Cream:0.92 } as any;
        for (let si=0; si<sizes.length; si++) for (let ci=0; ci<colors.length; ci++) {
          const base = 32;
          const premium = sizeWeight[si] * colorWeight[colors[ci]];
          const price = Math.round(base * premium * 100)/100;
          const margin = Math.round((45 + (premium-1)*60 + (r()-0.5)*6) * 10)/10;
          const units = Math.round(40 * premium + r()*20);
          out.push({ size: sizes[si], color: colors[ci], price_usd: price, margin_pct: margin, units_sold: units });
        }
        return out;
      })(),
    },
    brand_vs_pl_gap: ['Mens','Womens','Kids','Footwear','Accessories'].map(dept => {
      const brandMargin = 38 + r()*10;
      const plMargin = brandMargin + 8 + r()*10;
      const brandRev = Math.round(1_200_000 + r()*2_000_000);
      const plRev = Math.round(brandRev * (0.35 + r()*0.35));
      return {
        department: dept,
        brand_margin_pct: Math.round(brandMargin*10)/10,
        pl_margin_pct: Math.round(plMargin*10)/10,
        margin_gap_pp: Math.round((plMargin - brandMargin)*10)/10,
        brand_revenue_usd: brandRev,
        pl_revenue_usd: plRev,
        pl_penetration_pct: Math.round((plRev/(brandRev+plRev))*1000)/10,
      };
    }),
    returns_margin_overlay: {
      gross_margin_pct: 56.5,
      returns_rate_pct: 14.2,
      returns_cost_pct: 6.3,
      ragm_pct: 44.6,
      by_department: ['Mens','Womens','Kids','Footwear','Accessories'].map(d => ({
        department: d,
        gross_margin_pct: Math.round((50 + r()*15)*10)/10,
        returns_rate_pct: Math.round((8 + r()*15)*10)/10,
        ragm_pct: Math.round((35 + r()*15)*10)/10,
      })),
    },
  };
}

// ====================================================================
// PRECOMPUTED
// ====================================================================
function genPrecomputed(styles: Style[], core: any): any {
  const departments: Record<string, any> = {};
  const allDepts: (Dept | 'all')[] = ['all', ...DEPTS];
  for (const dept of allDepts) {
    const subset = dept === 'all' ? styles : styles.filter(s => s.department === dept);
    const heatmap = core.sell_through_heatmap.filter((h: any) => dept === 'all' || h.department === dept);
    const top_skus = subset.slice(0, 10).map(s => ({
      sku_id: s.product_id,
      product_name: s.product_name,
      category: s.category,
      revenue_impact_inr: s.revenue_impact,
      price_change_pct: s.price_change_pct,
      recommendation_priority: s.recommendation_priority,
    }));
    const cats = dept === 'all' ? DEPTS.flatMap(d => CATEGORIES[d]) : CATEGORIES[dept as Dept];
    const margin_by_category = cats.map(c => {
      const r = subset.filter(s => s.category === c);
      if (r.length === 0) return null;
      const cm = round1(r.reduce((s, x) => s + x.gross_margin_pct, 0) / r.length);
      const fl = r[0] ? MARGIN_FLOORS[r[0].department].floor : 50;
      return {
        category: c,
        current_margin_pct: cm,
        target_margin_pct: round1(fl + 4),
        margin_floor_pct: fl,
        sku_count: r.length,
      };
    }).filter(Boolean);
    const campaign_performance = core.campaigns.filter((c: any) => dept === 'all' || c.department === dept);
    departments[dept] = {
      sell_through_heatmap: heatmap,
      top_skus_by_impact: top_skus,
      margin_by_category,
      campaign_performance,
    };
  }
  return {
    generated_at: new Date('2026-06-29T00:00:00.000Z').toISOString(),
    departments,
  };
}

// ====================================================================
// INSIGHTS
// ====================================================================
function genInsights(): any {
  const insights = [
    { type: 'opportunity', severity: 'amber', title: "Levi's 511 indigo 32×32 nearing markdown trigger", description: '56% sell-through at Week 6 — promote to Wk 8 markdown queue at -25%.', metric: 'sell_through_pct', action: 'Queue for md25', relatedChart: 'markdown_queue' },
    { type: 'risk', severity: 'red', title: 'BFCM Outerwear Doorbuster overlaps 4 active markdown styles', description: 'W Puffers — pre-clear by Nov 15 to protect margin.', metric: 'markdown_overlap_flag', action: 'Pre-clear overlap', relatedChart: 'campaigns_table' },
    { type: 'competitive', severity: 'amber', title: 'Nordstrom dropped Lululemon Align HR 25" black by 12%', description: 'Competitive index now 108 (was 96). Match within 48h.', metric: 'competitive_index', action: 'Match price', relatedChart: 'competitive_index' },
    { type: 'returns', severity: 'red', title: "Women's Bottoms RAGM collapsing", description: '14 styles below 30% RAGM due to 28% return rate. Fit-guide intervention recommended.', metric: 'ragm_pct', action: 'Add fit guide', relatedChart: 'margin_distribution' },
    { type: 'opportunity', severity: 'green', title: 'BTS Kids Tops volume +24% WoW', description: 'Reallocate $240K from H&M Linen capsule to BTS Kids Tops — projected 2.6x ROI.', metric: 'campaign_roi', action: 'Reallocate budget', relatedChart: 'ai_suggestions' },
    { type: 'cadence', severity: 'amber', title: '11 styles stuck at -40% beyond target', description: 'Advance worst 6 directly to -60% Friday; recover $1.44M.', metric: 'stuck_styles', action: 'Advance to md60', relatedChart: 'markdown_cadence' },
    { type: 'pricing', severity: 'blue', title: 'Cotton spot price up 6.2%', description: 'Pass through 70%+ on denim PO cycle Aug 4 to protect margin.', metric: 'cost_change_pct', action: 'Reset price column', relatedChart: 'cost_passthrough' },
  ];
  return {
    generated_at: new Date('2026-06-29T00:00:00.000Z').toISOString(),
    insights: insights.map((it, i) => ({
      type: it.type,
      severity: it.severity,
      title: it.title,
      description: it.description,
      metric: it.metric,
      action: it.action,
      relatedChart: it.relatedChart,
      id: `INS-A${String(i + 1).padStart(3, '0')}`,
      source: 'rule_engine',
    })),
    source: 'rule_engine',
  };
}

// ====================================================================
// SKU DETAIL SHARDS
// ====================================================================
function genShard(s: Style, campaigns: any[]): any {
  const price_history: any[] = [];
  for (let dOff = -119; dOff <= 0; dOff++) {
    const date = isoDateOffset(dOff);
    // older days = full price more likely; closer to today = current_step
    const ageFrac = (-dOff) / 119;
    let price = s.msrp;
    let mdStep: string = 'full_price';
    let isPromo = false;
    let depth: number | null = null;
    let mech: string | null = null;
    let evName: string | null = null;
    if (ageFrac < 0.6) {
      // recent days reflect current state
      price = s.current_price;
      mdStep = s.markdown_step;
    }
    // occasional promo days
    if (!isPromo && r() < 0.06 && s.markdown_step === 'full_price') {
      isPromo = true;
      depth = -[15, 20, 25, 30][ri(0, 3)];
      mech = pick(PROMO_MECHANICS);
      price = round2(s.msrp * (1 + depth / 100));
      const ev = pick(US_EVENTS);
      evName = ev.name;
    }
    const margin = round4((price - s.cost) / price);
    const ragm = round4(margin * (1 - s.return_rate_pct / 100) - (s.return_rate_pct / 100) * 0.08);
    const compIdx = round1(s.competitive_index + rb(-3, 3));
    price_history.push({
      date,
      price_inr: price,
      mrp_inr: s.msrp,
      cost_inr: s.cost,
      margin_pct: margin,
      is_promo: isPromo,
      promo_depth_pct: depth,
      event_name: evName,
      // additive
      ragm_pct: ragm,
      promo_mechanic: mech,
      markdown_step: mdStep,
      competitive_index: compIdx,
    });
  }

  // elasticity_curve: 12 points
  const elasticity_curve: any[] = [];
  const priceCenter = s.msrp;
  for (let i = 0; i < 12; i++) {
    const ratio = 0.5 + i * 0.08; // 0.5 .. 1.38
    const p = round2(priceCenter * ratio);
    const volIdx = Math.round(100 * Math.pow(ratio, s.elasticity));
    const margin = round2(p - s.cost);
    const rev = Math.round(p * volIdx * 10);
    elasticity_curve.push({
      price_inr: p,
      demand_index: volIdx,
      margin_inr: margin,
      revenue_inr: rev,
    });
  }

  // grocery margin_waterfall (kept for parity)
  const margin_waterfall = {
    cost_inr: s.cost,
    shelf_price_inr: s.msrp,
    gross_margin_inr: round2(s.msrp - s.cost),
    gross_margin_pct: round4((s.msrp - s.cost) / s.msrp),
    promo_discount_inr: round2(s.msrp - s.current_price),
    realized_price_inr: s.current_price,
    realized_margin_inr: round2(s.current_price - s.cost),
    realized_margin_pct: round4((s.current_price - s.cost) / s.current_price),
    free_rider_waste_inr: Math.round(s.msrp * 0.06),
    net_margin_inr: round2(s.current_price - s.cost - s.msrp * 0.06),
    net_margin_pct: round4((s.current_price - s.cost - s.msrp * 0.06) / s.current_price),
  };

  // promo_history: grocery shape
  const promo_history: any[] = [];
  for (let i = 0; i < ri(2, 4); i++) {
    const ev = pick(US_EVENTS);
    promo_history.push({
      promo_id: `PROMO-${s.product_id}-${i + 1}`,
      mechanic: pick(PROMO_MECHANICS),
      start_date: ev.date,
      end_date: isoDateOffset(-30 + i * 8),
      depth_pct: [15, 20, 25, 30, 40][ri(0, 4)],
      budget_inr: ri(40_000, 220_000),
      lift_pct: round2(rb(8, 36)),
      incremental_revenue_inr: ri(80_000, 380_000),
      free_rider_ratio_pct: round1(clamp(gaussian(48, 8), 28, 72)),
      post_promo_dip_pct: round1(-rb(10, 22)),
      roi: round2(rb(1.6, 3.2)),
      net_roi: round2(rb(1.0, 2.4)),
    });
  }

  const recommendation = {
    current_price_inr: s.current_price,
    recommended_price_inr: s.recommended_price,
    price_change_pct: s.price_change_pct,
    rationale: `${s.brand} ${s.category} — ${s.is_stuck ? 'stuck at ' + STEP_LABEL[s.markdown_step] + ', advance recommended.' : 'priced near target; minor adjustment for elasticity ' + s.elasticity + '.'}`,
    projected_volume_change_pct: round2(s.elasticity * s.price_change_pct),
    projected_revenue_change_inr: Math.round(s.revenue_impact),
    projected_margin_change_pp: round1(s.projected_margin_pct - s.current_margin_pct),
    confidence: s.recommendation_priority === 'High' ? 'high' : 'medium',
    priority: s.recommendation_priority,
  };

  // additive: competitive_positioning + size_color_breakdown + recent_promo_history (spec §7)
  const competitive_positioning = s.competitor_top3.map(c => ({
    competitor_id: c.competitor_id,
    price_usd: c.price_usd,
    last_seen: isoDateOffset(-ri(0, 3)),
    delta_vs_us_pct: round1((c.price_usd - s.current_price) / s.current_price * 100),
  }));

  const colors = ['Indigo', 'Black', 'Navy', 'Cream', 'Olive', 'Burgundy', 'Charcoal', 'Selvedge Wash'].slice(0, s.color_breadth);
  const sizes = s.department === 'Footwear'
    ? ['8', '9', '9.5', '10', '11', '12'].slice(0, s.size_breadth)
    : ['XS', 'S', 'M', 'L', 'XL', '2XL', '32×32', '34×32', '36×32'].slice(0, s.size_breadth);
  const size_color_breakdown: any[] = [];
  for (const col of colors) {
    for (const sz of sizes) {
      if (size_color_breakdown.length >= 22) break;
      const oh = ri(2, 120);
      size_color_breakdown.push({
        color: col,
        size: sz,
        on_hand_units: oh,
        sell_through_pct: round1(clamp(gaussian(s.sell_through_pct, 8), 4, 99)),
        weeks_on_floor: s.weeks_on_floor,
        current_price_usd: s.current_price,
        is_size_break_oos: oh < 8,
      });
    }
    if (size_color_breakdown.length >= 22) break;
  }

  const recent_promo_history = promo_history.slice(0, 4).map((p, i) => ({
    campaign_id: campaigns[i % campaigns.length].campaign_id,
    campaign_name: campaigns[i % campaigns.length].campaign_name,
    mechanic: p.mechanic,
    start_date: p.start_date,
    end_date: p.end_date,
    depth_pct: p.depth_pct,
    units_sold: ri(280, 2_400),
    incremental_revenue_usd: p.incremental_revenue_inr,
    roi: p.roi,
    free_rider_pct: p.free_rider_ratio_pct,
  }));

  return {
    sku_id: s.product_id,
    product_name: s.product_name,
    price_history,
    elasticity_curve,
    margin_waterfall,
    promo_history,
    recommendation,
    // additive
    style_id: s.style_id,
    brand: s.brand,
    competitive_positioning,
    recent_promo_history,
    size_color_breakdown,
  };
}

// ====================================================================
// WRITE
// ====================================================================
function ensureDir(p: string) { fs.mkdirSync(p, { recursive: true }); }
function writeJson(p: string, obj: any) { fs.writeFileSync(p, JSON.stringify(obj, null, 2)); }

function main() {
  const t0 = Date.now();
  ensureDir(OUT_DIR);
  ensureDir(PI_DIR);
  ensureDir(SKU_DIR);

  const styles = makeStyles();

  // Standalone files
  writeJson(path.join(OUT_DIR, 'price_kpis.json'), genPriceKpis());
  writeJson(path.join(OUT_DIR, 'price_competitive_index.json'), genCompetitiveIndex(styles));
  writeJson(path.join(OUT_DIR, 'price_cost_passthrough.json'), genCostPassthrough());
  writeJson(path.join(OUT_DIR, 'price_elasticity_heatmap.json'), genElasticityHeatmap(styles));
  writeJson(path.join(OUT_DIR, 'price_margin_distribution.json'), genMarginDistribution(styles));
  writeJson(path.join(OUT_DIR, 'price_markdown.json'), genPriceMarkdown(styles));
  writeJson(path.join(OUT_DIR, 'price_position_map.json'), genPositionMap(styles));
  writeJson(path.join(OUT_DIR, 'price_product_table.json'), genProductTable(styles));
  writeJson(path.join(OUT_DIR, 'price_promo_calendar.json'), genPromoCalendar());
  writeJson(path.join(OUT_DIR, 'price_recommendations.json'), genRecommendations(styles));
  writeJson(path.join(OUT_DIR, 'price_alerts.json'), genAlerts());
  writeJson(path.join(OUT_DIR, 'price_ab_tests.json'), genAbTests(styles));

  // Core + precomputed + insights
  const core = genCore(styles);
  writeJson(path.join(PI_DIR, 'core.json'), core);
  writeJson(path.join(PI_DIR, 'precomputed.json'), genPrecomputed(styles, core));
  writeJson(path.join(PI_DIR, 'insights.json'), genInsights());

  // SKU detail shards
  for (const s of styles) {
    writeJson(path.join(SKU_DIR, `${s.product_id}.json`), genShard(s, core.campaigns));
  }

  const N = 12 + 3 + styles.length;
  const ms = Date.now() - t0;
  console.log(`✓ ${N} files written (${styles.length} sku_detail shards) in ${ms}ms`);
}

main();
