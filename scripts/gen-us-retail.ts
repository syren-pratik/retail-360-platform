/**
 * US General Retail data generator — Sprint RT1.
 *
 * Mirrors scripts/gen-apparel-price-intel.ts field shapes so the price_intel
 * cache/us_retail/... payload matches what the app expects. Chain: "Meridian
 * Retail" — 85 US stores, 7 departments, 200 SKUs, USD values in *_inr fields.
 *
 * Run: npm run gen:us-retail
 */

import * as fs from 'fs';
import * as path from 'path';

// ==== SEEDED RNG ====================================================
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED = 42;
const rng = mulberry32(SEED);
const r = () => rng();
const rb = (lo: number, hi: number) => lo + r() * (hi - lo);
const ri = (lo: number, hi: number) => Math.floor(rb(lo, hi + 1));
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(r() * arr.length)];
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

// ==== CONSTANTS =====================================================
const ANCHOR_DATE = '2026-05-17';
const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(REPO_ROOT, 'cache', 'us_retail');
const PI_DIR = path.join(OUT_DIR, 'price_intel');
const SKU_DIR = path.join(PI_DIR, 'sku_detail');
const MD_DIR = path.join(OUT_DIR, 'merch_demand');
const MD_SKU_DIR = path.join(MD_DIR, 'sku_detail');

type Dept =
  | 'Electronics'
  | 'Apparel & Shoes'
  | 'Home & Garden'
  | 'Sports & Outdoor'
  | 'Beauty & Personal'
  | 'Grocery & Snacks'
  | 'Toys & Games';

const DEPTS: Dept[] = [
  'Electronics',
  'Apparel & Shoes',
  'Home & Garden',
  'Sports & Outdoor',
  'Beauty & Personal',
  'Grocery & Snacks',
  'Toys & Games',
];
const DEPT_CODE: Record<Dept, string> = {
  Electronics: 'EL',
  'Apparel & Shoes': 'AP',
  'Home & Garden': 'HG',
  'Sports & Outdoor': 'SP',
  'Beauty & Personal': 'BP',
  'Grocery & Snacks': 'GR',
  'Toys & Games': 'TG',
};
const DEPT_COUNT: Record<Dept, number> = {
  Electronics: 40,
  'Apparel & Shoes': 45,
  'Home & Garden': 35,
  'Sports & Outdoor': 25,
  'Beauty & Personal': 30,
  'Grocery & Snacks': 15,
  'Toys & Games': 10,
};

// Categories per dept (used for cache heatmap + shard breadth)
const CATEGORIES: Record<Dept, string[]> = {
  Electronics: ['TVs & Displays', 'Phones & Tablets', 'Audio', 'Laptops & Computers'],
  'Apparel & Shoes': ["Men's Clothing", "Women's Clothing", 'Footwear', 'Accessories'],
  'Home & Garden': ['Kitchen & Dining', 'Bedding', 'Outdoor & Garden', 'Home Décor'],
  'Sports & Outdoor': ['Fitness Equipment', 'Outdoor Recreation', 'Team Sports', 'Cycling'],
  'Beauty & Personal': ['Skincare', 'Haircare', 'Fragrance', 'Personal Care'],
  'Grocery & Snacks': ['Packaged Foods & Beverages', 'Snacks', 'Frozen', 'Pantry Staples'],
  'Toys & Games': ['Building Sets', 'Action Figures', 'Games', 'Outdoor Play'],
};

const MARGIN_FLOORS: Record<Dept, { floor: number; target: number; ceiling: number; ragm_floor: number; returns: number }> = {
  Electronics: { floor: 12, target: 18, ceiling: 26, ragm_floor: 8, returns: 12 },
  'Apparel & Shoes': { floor: 45, target: 52, ceiling: 60, ragm_floor: 34, returns: 18 },
  'Home & Garden': { floor: 38, target: 44, ceiling: 52, ragm_floor: 30, returns: 10 },
  'Sports & Outdoor': { floor: 35, target: 42, ceiling: 50, ragm_floor: 28, returns: 12 },
  'Beauty & Personal': { floor: 48, target: 55, ceiling: 62, ragm_floor: 42, returns: 6 },
  'Grocery & Snacks': { floor: 22, target: 28, ceiling: 34, ragm_floor: 18, returns: 2 },
  'Toys & Games': { floor: 40, target: 46, ceiling: 54, ragm_floor: 34, returns: 8 },
};

const COST_RATIO: Record<Dept, [number, number]> = {
  Electronics: [0.65, 0.75],
  'Apparel & Shoes': [0.35, 0.45],
  'Home & Garden': [0.55, 0.65],
  'Sports & Outdoor': [0.55, 0.65],
  'Beauty & Personal': [0.35, 0.45],
  'Grocery & Snacks': [0.72, 0.82],
  'Toys & Games': [0.45, 0.55],
};

const ELASTICITY_RANGE: Record<Dept, [number, number]> = {
  Electronics: [-1.2, -0.85],
  'Apparel & Shoes': [-0.95, -0.45],
  'Home & Garden': [-0.9, -0.55],
  'Sports & Outdoor': [-1.0, -0.6],
  'Beauty & Personal': [-0.55, -0.35],
  'Grocery & Snacks': [-0.4, -0.25],
  'Toys & Games': [-0.95, -0.7],
};

const AUR: Record<Dept, number> = {
  Electronics: 380,
  'Apparel & Shoes': 58,
  'Home & Garden': 72,
  'Sports & Outdoor': 96,
  'Beauty & Personal': 34,
  'Grocery & Snacks': 8,
  'Toys & Games': 42,
};

// Realistic brand rosters per dept
const BRANDS: Record<Dept, string[]> = {
  Electronics: ['Samsung', 'Apple', 'Sony', 'LG', 'Bose', 'JBL', 'Dell', 'HP', 'Lenovo', 'Google'],
  'Apparel & Shoes': ["Levi's", 'Nike', 'Adidas', 'Gap', 'Old Navy', 'Under Armour', 'Puma', 'Calvin Klein'],
  'Home & Garden': ['Dyson', 'KitchenAid', 'Cuisinart', 'Instant Pot', 'Weber', 'Yeti', 'Ninja'],
  'Sports & Outdoor': ['Nike', 'Adidas', 'Peloton', 'Bowflex', 'YETI', 'Coleman', 'Wilson', 'Spalding'],
  'Beauty & Personal': ["L'Oréal", 'Neutrogena', 'Olay', 'Maybelline', 'CeraVe', 'Dove', 'Gillette'],
  'Grocery & Snacks': ['Coca-Cola', 'Pepsi', 'Nestlé', 'General Mills', 'Kraft Heinz', 'Kellogg', 'Frito-Lay'],
  'Toys & Games': ['LEGO', 'Mattel', 'Hasbro', 'Nintendo', 'Melissa & Doug', 'Play-Doh'],
};
const PL_BRAND = 'Meridian';

const CHANNELS = ['In-Store', 'Online', 'App', 'Curbside', 'Marketplace'] as const;

// US retail events for the season context
const US_EVENTS = [
  { name: 'Memorial Day', date: '2026-05-25', mech: 'pct_off' },
  { name: 'Fathers Day', date: '2026-06-15', mech: 'bundle' },
  { name: 'July 4', date: '2026-07-04', mech: 'pct_off' },
  { name: 'Back to School', date: '2026-08-15', mech: 'b2g1_half' },
  { name: 'Labor Day', date: '2026-09-05', mech: 'bogo_50' },
  { name: 'Halloween', date: '2026-10-31', mech: 'pct_off' },
  { name: 'Black Friday', date: '2026-11-27', mech: 'pct_off' },
  { name: 'Cyber Monday', date: '2026-11-30', mech: 'pct_off' },
];

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
  full_price: 'Full Price', md25: '-25%', md40: '-40%', md60: '-60%', md80: '-80%', clearance: 'Clearance',
};
const LIFECYCLE = ['Intro', 'Core', 'Markdown-1', 'Markdown-2', 'Markdown-3', 'Clearance', 'Discontinued'] as const;
const SEASONS = ['SS26', 'FW26', 'Holiday26', 'SS27'] as const;
const VELOCITY_DIST: Array<[string, number]> = [['A', 0.18], ['B', 0.32], ['C', 0.32], ['D', 0.18]];

const COMPETITORS = ['AMZN', 'TGT', 'WMT', 'BBY', 'COST', 'HD', 'LOW', 'MACY'];

function isoDateOffset(daysFromAnchor: number): string {
  const anchor = new Date(ANCHOR_DATE + 'T00:00:00Z');
  anchor.setUTCDate(anchor.getUTCDate() + daysFromAnchor);
  return anchor.toISOString().slice(0, 10);
}

// ==== SKU SPINE =====================================================
interface Sku {
  product_id: string;
  style_id: string;
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

function makeSkus(): Sku[] {
  const skus: Sku[] = [];
  const lifecycleDist: Array<[typeof LIFECYCLE[number], number]> = [
    ['Intro', 0.08], ['Core', 0.50], ['Markdown-1', 0.14], ['Markdown-2', 0.10],
    ['Markdown-3', 0.07], ['Clearance', 0.09], ['Discontinued', 0.02],
  ];
  const lifecycleToStep: Record<string, typeof MARKDOWN_STEPS[number]> = {
    Intro: 'full_price', Core: 'full_price', 'Markdown-1': 'md25',
    'Markdown-2': 'md40', 'Markdown-3': 'md60', Clearance: 'clearance', Discontinued: 'md80',
  };

  for (const dept of DEPTS) {
    const n = DEPT_COUNT[dept];
    for (let i = 0; i < n; i++) {
      const seqStr = String(i + 1).padStart(4, '0');
      const product_id = `USR-${DEPT_CODE[dept]}-${seqStr}`;
      const is_pl = r() < 0.22;
      const brand = is_pl ? PL_BRAND : pick(BRANDS[dept]);
      const cat = pick(CATEGORIES[dept]);
      const subcat = pick(['Classic', 'Premium', 'Value', 'Modern', 'Everyday']);
      const velocity_class = weightedPick(VELOCITY_DIST) as 'A' | 'B' | 'C' | 'D';
      const aur = AUR[dept];
      const msrpRaw = round2(gaussian(aur, aur * 0.24));
      const msrp = Math.max(2, msrpRaw);
      const [lo, hi] = COST_RATIO[dept];
      const costRatio = rb(lo, hi);
      const cost = round2(msrp * costRatio);
      const grossMargin = round1((1 - costRatio) * 100);
      const lifecycle = weightedPick(lifecycleDist);
      const step = lifecycleToStep[lifecycle];
      const stepDepth = STEP_DEPTH[step];
      const current_price = round2(msrp * (1 + stepDepth / 100));
      const targetDays = STEP_TARGET_DAYS[step];
      const stuckChance = step === 'full_price' ? 0 : 0.25;
      const isStuck = r() < stuckChance;
      const days_in_step = isStuck
        ? Math.round(targetDays * (1.4 + r() * 0.5))
        : Math.round(targetDays * (0.3 + r() * 0.9));
      const [elo, ehi] = ELASTICITY_RANGE[dept];
      // Adjust for PL
      const elasticity = round2(clamp(is_pl ? gaussian((elo + ehi) / 2 - 0.15, 0.1) : gaussian((elo + ehi) / 2, 0.15), -2.2, -0.25));
      const elastClass: Sku['elasticity_class'] = elasticity > -0.55 ? 'inelastic' : (elasticity > -0.95 ? 'moderate' : 'elastic');
      const floor = MARGIN_FLOORS[dept];
      const ret = clamp(gaussian(floor.returns, 3), 0, 36);
      const ragm = round2(grossMargin * (1 - ret / 100) - (ret / 100) * 8);
      const weeksOnFloor = lifecycle === 'Intro' ? ri(1, 3) :
        lifecycle === 'Core' ? ri(4, 12) :
        lifecycle === 'Markdown-1' ? ri(13, 16) :
        lifecycle === 'Markdown-2' ? ri(17, 20) :
        lifecycle === 'Markdown-3' ? ri(21, 24) :
        lifecycle === 'Clearance' ? ri(25, 36) : ri(36, 52);
      const season: typeof SEASONS[number] = pick(SEASONS);
      const ageBucket: Sku['inventory_age_bucket'] =
        weeksOnFloor <= 4 ? '0-4W' :
        weeksOnFloor <= 8 ? '5-8W' :
        weeksOnFloor <= 12 ? '9-12W' : '13W+';
      const compIdx = round1(clamp(gaussian(101, 8), 78, 132));
      const sellThru = round1(clamp(gaussian(
        lifecycle === 'Intro' ? 22 : lifecycle === 'Core' ? 58 :
        lifecycle === 'Markdown-1' ? 68 : lifecycle === 'Markdown-2' ? 74 :
        lifecycle === 'Markdown-3' ? 82 : lifecycle === 'Clearance' ? 88 : 95,
        6), 8, 99));
      const stTarget = dept === 'Grocery & Snacks' ? 82 : dept === 'Electronics' ? 60 : 68;
      const size_breadth = dept === 'Apparel & Shoes' ? ri(6, 12) : dept === 'Electronics' ? ri(1, 4) : ri(1, 6);
      const color_breadth = dept === 'Apparel & Shoes' ? ri(3, 6) : ri(1, 4);
      const promoFreq = round1(clamp(gaussian(18, 6), 4, 42));
      const isEvent = r() < 0.42;
      const isWeather = r() < 0.24 && (dept === 'Apparel & Shoes' || dept === 'Sports & Outdoor' || dept === 'Home & Garden');
      const launchDays = weeksOnFloor * 7 + ri(0, 5);
      const launchDate = isoDateOffset(-launchDays);
      const wos = round1(clamp(gaussian(7, 2.4), 1.4, 22));
      const currentMargin = grossMargin;
      const targetMargin = round1(floor.target);
      let recPrice = current_price;
      let recPriority: 'High' | 'Medium' | 'Low' = 'Medium';
      if (isStuck) { recPrice = round2(current_price * 0.75); recPriority = 'High'; }
      else if (compIdx > 115) { recPrice = round2(current_price * 0.92); recPriority = 'High'; }
      else if (compIdx < 88) { recPrice = round2(current_price * 1.05); recPriority = 'Medium'; }
      else if (lifecycle === 'Markdown-1' && sellThru < 55) { recPrice = round2(msrp * 0.6); recPriority = 'High'; }
      else { recPrice = current_price; recPriority = r() < 0.3 ? 'Low' : 'Medium'; }
      const priceChange = current_price > 0 ? round1((recPrice - current_price) / current_price * 100) : 0;
      const projMargin = round1(currentMargin + (priceChange * 0.6));
      const txns = ri(820, 38400) * (velocity_class === 'A' ? 4 : velocity_class === 'B' ? 2 : velocity_class === 'C' ? 1 : 0.4);
      const revImpact = Math.round(Math.abs(priceChange) * txns * current_price * 0.001) * 100;
      const compShuffled = [...COMPETITORS].sort(() => r() - 0.5).slice(0, 3);
      const top3 = compShuffled.map(c => ({ competitor_id: c, price_usd: round2(current_price * (compIdx / 100) * (1 + (r() - 0.5) * 0.18)) }));

      skus.push({
        product_id,
        style_id: `STY-${DEPT_CODE[dept]}-${seqStr}`,
        product_name: `${brand} ${cat} ${subcat}`,
        brand, is_private_label: is_pl,
        department: dept, category: cat, subcategory: subcat,
        velocity_class, msrp, cost, current_price,
        gross_margin_pct: currentMargin, ragm_pct: ragm,
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
  return skus;
}

// ==== CORE.JSON SECTIONS ============================================
function genHeadline() {
  return {
    sentence:
      'You are leaving $142K on the table this week — $58K in free-rider promotions in Electronics, $34K in missed cost passthroughs, and $28K in premature markdowns.',
    supporting_line: 'Optimization model has 14 actionable recommendations that could recover $92K this week.',
    week_label: 'Week of May 17, 2026',
    season_context: 'Pre-Black Friday build · 187 days to Black Friday · Back to School winding down',
  };
}

function genKpis(skus: Sku[]) {
  const avgMargin = round1(skus.reduce((s, x) => s + x.gross_margin_pct, 0) / skus.length);
  const avgRagm = round1(skus.reduce((s, x) => s + x.ragm_pct, 0) / skus.length);
  const sellThru = 74.2;
  const mdShare = round1(skus.filter(s => s.markdown_step !== 'full_price').length / skus.length * 100);
  return {
    margin_realization_pct: 81.4,
    margin_realization_trend: round1(rb(-0.6, 1.4)),
    gross_margin_pct: avgMargin,
    gross_margin_vs_floor: round1(avgMargin - 34),
    promo_roi_index: 71.2,
    promo_roi_trend: round1(rb(1.4, 4.2)),
    free_rider_ratio_pct: 38.5,
    sell_through_pct: sellThru,
    sell_through_vs_target: round1(sellThru - 68),
    active_alerts: 14,
    total_margin_leakage_inr: 142000,
    margin_leakage_breakdown: {
      promo_free_rider_inr: 58000,
      cost_passthrough_gap_inr: 34000,
      premature_markdown_inr: 28000,
      elasticity_underpricing_inr: 12000,
      returns_margin_loss_usd: 10000,
    },
    weeks_of_supply: round1(clamp(gaussian(7.4, 1.2), 4, 11)),
    weeks_of_supply_trend: round1(rb(-0.6, 0.6)),
    trend_12w: Array.from({ length: 12 }, (_, i) => ({
      week: i + 1,
      margin_realization_pct: round1(78 + i * 0.32),
      promo_roi: round1(2.0 + i * 0.04),
      sell_through: round1(68 + i * 0.5),
      ragm_pct: round1(30 + i * 0.18),
    })),
    ragm_pct: avgRagm,
    ragm_vs_floor: round1(avgRagm - 28),
    markdown_pressure_pct: mdShare,
  };
}

const ALERT_TYPES = ['markdown_stuck', 'competitive_match', 'free_rider', 'cost_passthrough', 'margin_floor', 'elasticity_opportunity', 'returns_margin', 'promo_ending'] as const;
function actionHeadline(at: string, s: Sku): string {
  if (at === 'markdown_stuck') return `Stuck at ${STEP_LABEL[s.markdown_step]} for ${s.days_in_step} days (target ${s.target_days_in_step}d) — sell-through ${s.sell_through_pct}%.`;
  if (at === 'competitive_match') return `Competitor priced at $${round2(s.current_price * 0.9)} vs our $${s.current_price} — competitive index ${s.competitive_index}.`;
  if (at === 'returns_margin') return `Returns ${s.return_rate_pct}% on this SKU — RAGM ${s.ragm_pct}% vs GM ${s.gross_margin_pct}%.`;
  if (at === 'free_rider') return `Free-rider ratio ${ri(58, 72)}% on recent promo — wasted spend.`;
  if (at === 'margin_floor') return `Margin ${s.gross_margin_pct}% vs floor ${MARGIN_FLOORS[s.department].floor}% — pricing pressure.`;
  if (at === 'elasticity_opportunity') return `Elasticity ${s.elasticity} suggests +${ri(4, 10)}% price headroom.`;
  return `Cost up ${ri(3, 7)}%; passthrough only ${ri(40, 70)}%.`;
}
function actionReco(at: string): string {
  if (at === 'markdown_stuck') return `Advance to next markdown step by Friday; recovers ~$${ri(4, 24)}K.`;
  if (at === 'competitive_match') return `Match to competitor within 48h; recovers ~$${ri(4, 18)}K weekly.`;
  if (at === 'returns_margin') return 'Add fit / product-info module; expected returns drop 6-10pp.';
  if (at === 'free_rider') return 'Tighten audience to lapsed / at-risk; expected ROI +0.6x.';
  if (at === 'margin_floor') return 'Hold price; renegotiate cost with supplier.';
  if (at === 'elasticity_opportunity') return `Test +${ri(4, 8)}% price hike on top SKUs for 14 days.`;
  return 'Pass through 70%+ of cost increase.';
}
function genActionQueue(skus: Sku[]) {
  const out: any[] = [];
  const distribution: Array<[typeof ALERT_TYPES[number], number]> = [
    ['markdown_stuck', 0.30], ['competitive_match', 0.18], ['free_rider', 0.14],
    ['returns_margin', 0.10], ['margin_floor', 0.10], ['elasticity_opportunity', 0.08],
    ['cost_passthrough', 0.06], ['promo_ending', 0.04],
  ];
  for (let i = 0; i < 12; i++) {
    const at = weightedPick(distribution);
    const s = pick(skus.filter(x => at === 'markdown_stuck' ? x.is_stuck : true).concat(skus));
    const priority = i < 4 ? 'urgent' : i < 8 ? 'review' : 'info';
    const fin = Math.round(rb(4_000, 42_000));
    out.push({
      id: `AQ-R${String(i + 1).padStart(3, '0')}`,
      priority, alert_type: at,
      sku_id: s.product_id, product_name: s.product_name,
      department: s.department, category: s.category,
      headline: actionHeadline(at, s), recommended_action: actionReco(at),
      financial_impact_inr: fin,
      confidence: pick(['high', 'medium', 'high', 'high', 'low']),
      action_window: pick(['Act by EOD', 'Act by Friday', 'Review by Friday', 'Monitor']),
      status: r() < 0.85 ? 'pending' : 'snoozed',
      style_id: s.style_id, size_color_dim: '',
    });
  }
  return out;
}

function genLiveActivity() {
  const events = [
    { event_type: 'competitive_drop', severity: 'red', headline: 'Best Buy dropped Samsung 55" 4K TV to $429 (was $499)', detail: 'Detected by web scrape · Electronics · gap widened to -14%', ago: '2h ago' },
    { event_type: 'markdown_triggered', severity: 'amber', headline: "Levi's 501 stonewash size 32 hit 88% sell-through", detail: 'Auto-snap to md25 queued for approval', ago: '41 min ago' },
    { event_type: 'season_alert', severity: 'blue', headline: 'Back-to-School Electronics volume +18% WoW', detail: 'Recommend allocation +12% to top laptops', ago: '3h ago' },
    { event_type: 'returns_spike', severity: 'red', headline: 'Returns spike: Sony WH-1000XM5 headphones — 22% returns last 14d', detail: 'Top reason: fit (48%) · review product page', ago: '1h ago' },
    { event_type: 'campaign_live', severity: 'green', headline: 'Beauty Loyalty Rewards live · day 2', detail: 'Lift +112% vs baseline · ROI 3.4x', ago: '14h ago' },
    { event_type: 'cost_alert', severity: 'amber', headline: 'Aluminum spot price up 4.8% — grill margin under pressure', detail: 'Next PO cycle Jul 4 · review pass-through', ago: '5h ago' },
    { event_type: 'elasticity_update', severity: 'blue', headline: 'Nintendo Switch bundle elasticity refit: -0.78 (was -0.92)', detail: 'Headroom +5% on holiday bundles', ago: '8h ago' },
    { event_type: 'promo_accepted', severity: 'green', headline: 'Free-Shipping >$50 mechanic approved for Web', detail: 'Live Wed; budget $180K · projected ROI 3.1x', ago: '12h ago' },
  ];
  return events.map((e, i) => ({
    id: `LA-R${String(i + 1).padStart(3, '0')}`,
    event_type: e.event_type, severity: e.severity,
    headline: e.headline, detail: e.detail, timestamp_ago: e.ago,
  }));
}

function genSkusForCore(skus: Sku[]) {
  return skus.map(s => ({
    sku_id: s.product_id, product_name: s.product_name,
    department: s.department, category: s.category, subcategory: s.subcategory,
    velocity_class: s.velocity_class,
    mrp_inr: s.msrp, cost_inr: s.cost, current_price_inr: s.current_price,
    current_margin_pct: s.current_margin_pct, target_margin_pct: s.target_margin_pct,
    elasticity: s.elasticity, elasticity_class: s.elasticity_class,
    recommended_price_inr: s.recommended_price, price_change_pct: s.price_change_pct,
    projected_margin_pct: s.projected_margin_pct, revenue_impact_inr: s.revenue_impact,
    recommendation_priority: s.recommendation_priority,
    is_festival_sensitive: s.is_event_sensitive, is_weather_sensitive: s.is_weather_sensitive,
    launch_date: s.launch_date, promo_frequency_pct: s.promo_frequency_pct,
    weeks_of_supply: s.weeks_of_supply,
    sell_through_pct: s.sell_through_pct, sell_through_target_pct: s.sell_through_target_pct,
    inventory_age_bucket: s.inventory_age_bucket,
    style_id: s.style_id, brand: s.brand, ragm_pct: s.ragm_pct,
    weeks_on_floor: s.weeks_on_floor, lifecycle_stage: s.lifecycle_stage,
    markdown_step: s.markdown_step, days_in_step: s.days_in_step,
    season_tag: s.season_tag,
    competitive_index: s.competitive_index, competitor_top3: s.competitor_top3,
    return_rate_pct: s.return_rate_pct, size_breadth: s.size_breadth, color_breadth: s.color_breadth,
  }));
}

function genDepartments(skus: Sku[]) {
  return DEPTS.map(d => {
    const rows = skus.filter(s => s.department === d);
    const fl = MARGIN_FLOORS[d];
    const cur = round1(rows.reduce((s, x) => s + x.gross_margin_pct, 0) / rows.length);
    const ragm = round1(rows.reduce((s, x) => s + x.ragm_pct, 0) / rows.length);
    const sellThru = round1(rows.reduce((s, x) => s + x.sell_through_pct, 0) / rows.length);
    const sellTarget = round1(rows.reduce((s, x) => s + x.sell_through_target_pct, 0) / rows.length);
    return {
      name: d, sku_count: rows.length,
      margin_floor_pct: fl.floor, current_margin_pct: cur,
      margin_vs_floor: round1(cur - fl.floor),
      promo_roi_index: round1(clamp(gaussian(66, 6), 52, 78)),
      sell_through_pct: sellThru, sell_through_target_pct: sellTarget,
      categories: CATEGORIES[d],
      ragm_pct: ragm, ragm_vs_floor: round1(ragm - fl.ragm_floor),
    };
  });
}

// 12 campaigns with US retail names
const CAMPAIGN_TEMPLATES = [
  { name: 'Back to School Electronics Bundle', mech: 'bundle', dept: 'Electronics', fr: 42, roi: 2.6 },
  { name: 'Labor Day Apparel Sale', mech: 'bogo_50', dept: 'Apparel & Shoes', fr: 58, roi: 1.8 },
  { name: 'Beauty Loyalty Rewards', mech: 'member_excl', dept: 'Beauty & Personal', fr: 22, roi: 3.4 },
  { name: 'Memorial Day Grill & Garden', mech: 'pct_off', dept: 'Home & Garden', fr: 44, roi: 2.2 },
  { name: 'Summer Sports BOGO', mech: 'bogo_50', dept: 'Sports & Outdoor', fr: 46, roi: 2.1 },
  { name: 'July 4 Snack Bundle', mech: 'bundle', dept: 'Grocery & Snacks', fr: 32, roi: 2.9 },
  { name: 'Toys Early Holiday Preview', mech: 'pct_off', dept: 'Toys & Games', fr: 38, roi: 2.3 },
  { name: 'Fitness New Year Prep', mech: 'tiered', dept: 'Sports & Outdoor', fr: 40, roi: 2.4 },
  { name: 'Phone Trade-In Boost', mech: 'dollar_off', dept: 'Electronics', fr: 34, roi: 2.8 },
  { name: 'Skincare Refresh GWP', mech: 'gwp', dept: 'Beauty & Personal', fr: 28, roi: 3.0 },
  { name: 'Free Ship Weekend', mech: 'free_ship', dept: 'Apparel & Shoes', fr: 36, roi: 2.5 },
  { name: 'Halloween Toys Early Bird', mech: 'pct_off', dept: 'Toys & Games', fr: 48, roi: 1.9 },
];
function genCampaigns(skus: Sku[]) {
  return CAMPAIGN_TEMPLATES.map((t, i) => {
    const budget = ri(80_000, 480_000);
    const incRev = Math.round(budget * t.roi);
    const gross = Math.round(incRev * 1.24);
    const sample = skus.filter(s => s.department === t.dept).slice(0, 4).map(s => s.product_id);
    const overlap = sample.some(id => skus.find(x => x.product_id === id)?.markdown_step !== 'full_price');
    const status = i < 6 ? 'completed' : i < 10 ? 'live' : 'scheduled';
    const startDate = isoDateOffset(-30 + i * 4);
    const endDate = isoDateOffset(-30 + i * 4 + 7);
    return {
      campaign_id: `CAMP-R${String(i + 1).padStart(3, '0')}`,
      campaign_name: t.name, mechanic: t.mech,
      department: t.dept, category: CATEGORIES[t.dept as Dept][0],
      budget_inr: budget, start_date: startDate, end_date: endDate, status,
      spend_to_date_inr: status === 'completed' ? budget : status === 'live' ? Math.round(budget * 0.4) : 0,
      incremental_revenue_inr: status === 'scheduled' ? 0 : incRev,
      gross_promo_revenue_inr: status === 'scheduled' ? 0 : gross,
      roi: t.roi, free_rider_ratio_pct: t.fr,
      post_promo_dip_pct: round1(-rb(8, 20)), lift_pct: ri(80, 220),
      cannibalization_inr: Math.round(incRev * 0.06),
      net_incremental_inr: Math.round(incRev * 0.92),
      confidence: round2(clamp(gaussian(0.78, 0.08), 0.5, 0.95)),
      affected_skus: sample, event_anchor: t.name.split(' ')[0], markdown_overlap_flag: overlap,
    };
  });
}

function genPromoROITrend() {
  return Array.from({ length: 14 }, (_, i) => {
    const wk = i + 1;
    const tmpl = CAMPAIGN_TEMPLATES[i % CAMPAIGN_TEMPLATES.length];
    return {
      week: wk, week_label: `W${wk}`,
      roi: round2(clamp(gaussian(2.4, 0.4), 1.4, 3.4)),
      spend_inr: ri(60_000, 480_000),
      incremental_revenue_inr: ri(140_000, 1_200_000),
      goal_roi: 2.5, active_campaign_name: tmpl.name,
    };
  });
}

function genAISuggestions() {
  const sugs = [
    { title: 'Pause underperforming Labor Day denim BOGO', expl: 'Free-rider 58%; redirect budget to Beauty Loyalty (ROI 3.4x).', badge: 'pause', impact: 32_000 },
    { title: 'Extend Beauty Loyalty Rewards by 1 week', expl: 'ROI 3.4x, tail still strong; +$28K projected.', badge: 'extend', impact: 28_000 },
    { title: 'Raise Toys Halloween depth to 30%', expl: 'Elasticity headroom unlocked; +$18K incremental.', badge: 'increase', impact: 18_000 },
    { title: 'Redirect Grocery snack budget to BTS Electronics', expl: 'Shift $40K — 2.6x vs 1.6x projected.', badge: 'redirect', impact: 24_000 },
    { title: 'Pause Home & Garden clearance email blast', expl: 'Free-rider 62%; margin dilution.', badge: 'pause', impact: 12_000 },
  ];
  return sugs.map((sg, i) => ({
    id: `AI-R${String(i + 1).padStart(3, '0')}`,
    type: sg.badge,
    badge_label: sg.badge.charAt(0).toUpperCase() + sg.badge.slice(1),
    badge_color: sg.badge === 'pause' ? '#EF4444' : sg.badge === 'extend' ? '#10B981' : sg.badge === 'increase' ? '#3B82F6' : '#F59E0B',
    campaign_name: sg.title,
    sku_or_category: pick(['Electronics', 'Apparel & Shoes', 'Beauty & Personal', 'Home & Garden']),
    explanation: sg.expl, financial_impact_inr: sg.impact,
    confidence: round2(clamp(gaussian(0.78, 0.08), 0.55, 0.95)),
    action_label: sg.badge === 'pause' ? 'Pause Campaign' : sg.badge === 'extend' ? 'Extend by 1 Week' : sg.badge === 'increase' ? 'Raise Depth' : 'Reallocate Budget',
  }));
}

function genLiftBySegment() {
  const segs = ['VIP', 'Loyalist', 'Enthusiast', 'Casual', 'At-Risk', 'Lapsed'];
  const lifts = [12, 18, 22, 28, 34, 38];
  const free = [58, 48, 42, 38, 32, 26];
  return segs.map((seg, i) => ({
    segment: seg, lift_pct: lifts[i] + ri(-2, 2),
    free_rider_ratio_pct: free[i] + ri(-3, 3),
    bar_width_pct: Math.round(lifts[i] * 2.4),
  }));
}

function genMechanicROI() {
  const shares = { bogo_50: 18, b2g1_half: 12, pct_off: 30, dollar_off: 10, bundle: 12, gwp: 5, tiered: 6, free_ship: 4, member_excl: 3 };
  const rois = { bogo_50: 2.2, b2g1_half: 2.5, pct_off: 2.0, dollar_off: 2.4, bundle: 2.6, gwp: 3.0, tiered: 2.3, free_ship: 2.9, member_excl: 3.4 };
  return (PROMO_MECHANICS as readonly string[]).map(m => ({
    mechanic: PROMO_MECHANIC_LABELS[m], roi: (rois as any)[m],
    color: PROMO_MECHANIC_COLORS[m], share_pct: (shares as any)[m],
  }));
}

// Fixed 14-row heatmap with US retail category strings
const HEATMAP_CATEGORIES: Array<{ department: Dept; category: string }> = [
  { department: 'Electronics', category: 'TVs & Displays' },
  { department: 'Electronics', category: 'Phones & Tablets' },
  { department: 'Electronics', category: 'Audio' },
  { department: 'Apparel & Shoes', category: "Men's Clothing" },
  { department: 'Apparel & Shoes', category: "Women's Clothing" },
  { department: 'Apparel & Shoes', category: 'Footwear' },
  { department: 'Home & Garden', category: 'Kitchen & Dining' },
  { department: 'Home & Garden', category: 'Outdoor & Garden' },
  { department: 'Sports & Outdoor', category: 'Fitness Equipment' },
  { department: 'Sports & Outdoor', category: 'Outdoor Recreation' },
  { department: 'Beauty & Personal', category: 'Skincare' },
  { department: 'Beauty & Personal', category: 'Haircare' },
  { department: 'Beauty & Personal', category: 'Fragrance' },
  { department: 'Grocery & Snacks', category: 'Packaged Foods & Beverages' },
];
function genSellThroughHeatmap(skus: Sku[]) {
  return HEATMAP_CATEGORIES.map(h => {
    const rows = skus.filter(s => s.department === h.department);
    const base = rows.reduce((s, x) => s + x.sell_through_pct, 0) / Math.max(1, rows.length);
    const values: number[] = [];
    for (let i = 0; i < 14; i++) {
      if (i < 8) values.push(round1(clamp(base * (i + 1) / 8 + rb(-3, 3), 0, 99)));
      else values.push(0);
    }
    return {
      category: h.category, department: h.department,
      values, target_pct: 68,
    };
  });
}

function genMarkdownQueue(skus: Sku[]) {
  // 8 items per spec
  const themed: Array<{ dept: Dept; hint: string }> = [
    { dept: 'Toys & Games', hint: 'Halloween' },
    { dept: 'Toys & Games', hint: 'Halloween' },
    { dept: 'Apparel & Shoes', hint: 'Summer clearance' },
    { dept: 'Apparel & Shoes', hint: 'Summer clearance' },
    { dept: 'Electronics', hint: 'Last-year TV' },
    { dept: 'Electronics', hint: 'Last-year TV' },
    { dept: 'Home & Garden', hint: 'Outdoor clearance' },
    { dept: 'Sports & Outdoor', hint: 'Seasonal' },
  ];
  return themed.map((t, i) => {
    const pool = skus.filter(x => x.department === t.dept && x.markdown_step !== 'full_price');
    const s = pool[i % Math.max(1, pool.length)] ?? skus.find(x => x.department === t.dept) ?? skus[0];
    const nextStep = s.markdown_step === 'md25' ? 'md40' :
      s.markdown_step === 'md40' ? 'md60' :
      s.markdown_step === 'md60' ? 'md80' :
      s.markdown_step === 'md80' ? 'clearance' : 'clearance';
    const recDepth = STEP_DEPTH[nextStep];
    return {
      sku_id: s.product_id, product_name: `${s.product_name} — ${t.hint}`,
      category: s.category, department: s.department,
      current_sell_through_pct: s.sell_through_pct,
      target_sell_through_pct: s.sell_through_target_pct,
      days_remaining: Math.max(0, s.target_days_in_step - s.days_in_step),
      weeks_of_supply: s.weeks_of_supply, recommended_depth_pct: recDepth,
      recommended_price_inr: round2(s.msrp * (1 + recDepth / 100)),
      units_at_risk: ri(80, 780), revenue_at_risk_inr: ri(6_000, 42_000),
      urgency_score: s.is_stuck ? ri(75, 95) : ri(40, 70),
      inventory_age_bucket: s.inventory_age_bucket, status: 'pending',
      style_id: s.style_id, brand: s.brand,
      color: pick(['Black', 'Silver', 'White', 'Navy', 'Charcoal']),
      size: pick(['Std', 'M', 'L', '55"', '65"']),
      weeks_on_floor: s.weeks_on_floor,
      current_markdown_step: s.markdown_step,
      recommended_markdown_step: nextStep,
      lifecycle_stage: s.lifecycle_stage, days_in_step: s.days_in_step,
      is_stuck: s.is_stuck,
    };
  });
}

function genInventoryAging(skus: Sku[]) {
  const keys: Record<string, string> = {
    '0-4W': 'bucket_0_4w', '5-8W': 'bucket_5_8w', '9-12W': 'bucket_9_12w', '13W+': 'bucket_13w_plus',
  };
  const out: any = { insight: '13W+ stock trending down · pre-Black Friday clearance running to plan' };
  for (const b of ['0-4W', '5-8W', '9-12W', '13W+'] as const) {
    const rows = skus.filter(s => s.inventory_age_bucket === b);
    const units = rows.reduce((s, x) => s + 200 + Math.round(x.weeks_on_floor * 4), 0);
    const val = Math.round(rows.reduce((s, x) => s + x.msrp * 200, 0));
    const obj: any = { units, value_inr: val };
    if (b === '5-8W' || b === '9-12W' || b === '13W+') obj.flag = b === '13W+';
    out[keys[b]] = obj;
  }
  out.season_carryover_usd = Math.round(skus.filter(s => s.season_tag === 'FW26' || s.season_tag === 'Holiday26').reduce((s, x) => s + x.msrp * 200, 0));
  return out;
}

function genChannelPerformance() {
  const data: Array<{ channel: string; rev: number; lift: number }> = [
    { channel: 'In-Store', rev: 1_200_000, lift: 4.2 },
    { channel: 'Online', rev: 890_000, lift: 18.4 },
    { channel: 'App', rev: 340_000, lift: 28.1 },
    { channel: 'Curbside', rev: 180_000, lift: 6.2 },
    { channel: 'Marketplace', rev: 95_000, lift: -2.1 },
  ];
  return data.map(c => ({
    channel: c.channel, revenue_inr: c.rev, revenue_lift_pct: c.lift,
    bar_width_pct: 60 + Math.round(c.rev / 20_000),
    baseline_bar_width_pct: 60 + Math.round(c.rev / 22_000),
    conversion_pct: c.channel === 'In-Store' ? 22 : c.channel === 'App' ? 4.2 : c.channel === 'Online' ? 2.6 : 1.8,
  }));
}

function genMarginWaterfall() {
  return [
    { label: 'Theoretical max', value_inr: 1_580_000, is_total: true, color_type: 'base' },
    { label: 'Free-rider waste', value_inr: -58_000, is_total: false, color_type: 'leak' },
    { label: 'Cost passthrough gap', value_inr: -34_000, is_total: false, color_type: 'leak' },
    { label: 'Premature markdown', value_inr: -28_000, is_total: false, color_type: 'apparel_leak' },
    { label: 'Elasticity gap', value_inr: -12_000, is_total: false, color_type: 'leak' },
    { label: 'Return-margin loss', value_inr: -10_000, is_total: false, color_type: 'apparel_leak' },
    { label: 'Realized', value_inr: 1_438_000, is_total: true, color_type: 'result' },
  ];
}

function genForecast14w() {
  const events: Record<number, string> = { 3: 'Labor Day', 8: 'Back to School peak', 12: 'Halloween' };
  const seasonalIdx: Record<number, number> = { 3: 1.28, 8: 1.42, 12: 1.24 };
  return Array.from({ length: 14 }, (_, i) => {
    const wk = i + 1;
    const dt = new Date(ANCHOR_DATE + 'T00:00:00Z');
    dt.setUTCDate(dt.getUTCDate() + wk * 7);
    const isoLbl = dt.toISOString().slice(5, 10).replace('-', '/');
    const seasonal = seasonalIdx[wk] ?? (wk < 4 ? 1.0 : wk < 8 ? 1.15 : wk < 12 ? 1.2 : 1.05);
    const baseRev = 1_240_000 * seasonal;
    return {
      week: wk, week_label: `W${wk} ${isoLbl}`,
      forecast_revenue_inr: Math.round(baseRev),
      forecast_margin_inr: Math.round(baseRev * 0.38),
      lower_ci_inr: Math.round(baseRev * 0.88),
      upper_ci_inr: Math.round(baseRev * 1.12),
      seasonality_index: round2(seasonal),
      event_label: events[wk] || null,
      ragm_forecast_usd: Math.round(baseRev * 0.30),
    };
  });
}

function genModelCard(skus: Sku[]) {
  const avgCur = skus.reduce((s, x) => s + x.gross_margin_pct, 0) / skus.length / 100;
  const avgProj = skus.reduce((s, x) => s + x.projected_margin_pct, 0) / skus.length / 100;
  const avgRagm = skus.reduce((s, x) => s + x.ragm_pct, 0) / skus.length / 100;
  return {
    experiment: '/Shared/us_retail_price_optimization',
    target_margin_pct: 0.34, max_price_increase_pct: 0.15, max_price_decrease_pct: 0.40,
    min_transactions: 100, products_analyzed: skus.length,
    avg_current_margin: round4(avgCur),
    avg_projected_margin: round4(avgProj),
    total_revenue_impact: skus.reduce((s, x) => s + x.revenue_impact, 0),
    products_with_increase: skus.filter(s => s.price_change_pct > 0).length,
    products_with_decrease: skus.filter(s => s.price_change_pct < 0).length,
    avg_current_ragm: round4(avgRagm),
    avg_projected_ragm: round4(avgRagm + 0.02),
    cadence_compliance_pct: 78,
  };
}

function genCore(skus: Sku[]) {
  return {
    generated_at: new Date('2026-05-17T00:00:00.000Z').toISOString(),
    anchor_date: ANCHOR_DATE,
    headline: genHeadline(),
    kpis: genKpis(skus),
    action_queue: genActionQueue(skus),
    live_activity: genLiveActivity(),
    skus: genSkusForCore(skus),
    departments: genDepartments(skus),
    campaigns: genCampaigns(skus),
    promo_roi_trend: genPromoROITrend(),
    ai_suggestions: genAISuggestions(),
    lift_by_segment: genLiftBySegment(),
    mechanic_roi: genMechanicROI(),
    sell_through_heatmap: genSellThroughHeatmap(skus),
    markdown_queue: genMarkdownQueue(skus),
    inventory_aging: genInventoryAging(skus),
    channel_performance: genChannelPerformance(),
    margin_waterfall: genMarginWaterfall(),
    forecast_14w: genForecast14w(),
    model_card: genModelCard(skus),
    markdown_cadence_ladder: ['full_price', 'md25', 'md40', 'md60', 'md80', 'clearance'].map((step, i) => {
      const startUnits = 1000;
      const survival = [1, 0.62, 0.41, 0.24, 0.12, 0.05][i];
      const units = Math.round(startUnits * survival);
      const targetDays = [14, 21, 14, 14, 14, 9999][i];
      const actualDays = Math.round(targetDays * (0.7 + r() * 0.9));
      const isStuck = i > 0 && i < 5 && actualDays > targetDays * 1.4;
      return {
        step, label: ['Full Price', '25% off', '40% off', '60% off', '80% off', 'Clearance'][i],
        units_remaining: units, units_sold_in_step: i === 0 ? 380 : Math.round(units * 0.4),
        target_days_in_step: targetDays, actual_days_in_step: actualDays, is_stuck: isStuck,
        margin_pct: [42, 32, 24, 16, 8, 2][i],
        revenue_usd: units * [58, 46, 36, 24, 14, 8][i],
      };
    }),
    size_color_price_grid: {
      style_id: 'STY-AP-0001',
      style_name: "Levi's 501 Original Fit",
      sizes: ['30x30', '32x30', '34x30', '36x30', '38x30'],
      colors: ['Indigo', 'Stonewash', 'Black', 'Rinse'],
      cells: (() => {
        const out: any[] = [];
        const sizes = ['30x30', '32x30', '34x30', '36x30', '38x30'];
        const colors = ['Indigo', 'Stonewash', 'Black', 'Rinse'];
        const sizeW = [0.9, 1.15, 1.1, 0.95, 0.85];
        const colorW: Record<string, number> = { Indigo: 1.1, Stonewash: 1.0, Black: 1.05, Rinse: 0.9 };
        for (let si = 0; si < sizes.length; si++) for (let ci = 0; ci < colors.length; ci++) {
          const base = 68;
          const premium = sizeW[si] * colorW[colors[ci]];
          const price = Math.round(base * premium * 100) / 100;
          const margin = Math.round((45 + (premium - 1) * 40 + (r() - 0.5) * 5) * 10) / 10;
          const units = Math.round(40 * premium + r() * 20);
          out.push({ size: sizes[si], color: colors[ci], price_usd: price, margin_pct: margin, units_sold: units });
        }
        return out;
      })(),
    },
    brand_vs_pl_gap: DEPTS.map(dept => {
      const brandMargin = MARGIN_FLOORS[dept].target - 4 + r() * 6;
      const plMargin = brandMargin + 6 + r() * 6;
      const brandRev = Math.round(400_000 + r() * 1_800_000);
      const plRev = Math.round(brandRev * (0.28 + r() * 0.4));
      return {
        department: dept,
        brand_margin_pct: Math.round(brandMargin * 10) / 10,
        pl_margin_pct: Math.round(plMargin * 10) / 10,
        margin_gap_pp: Math.round((plMargin - brandMargin) * 10) / 10,
        brand_revenue_usd: brandRev, pl_revenue_usd: plRev,
        pl_penetration_pct: Math.round((plRev / (brandRev + plRev)) * 1000) / 10,
      };
    }),
    returns_margin_overlay: {
      gross_margin_pct: 34.2, returns_rate_pct: 10.6, returns_cost_pct: 4.4, ragm_pct: 27.8,
      by_department: DEPTS.map(d => ({
        department: d,
        gross_margin_pct: Math.round((MARGIN_FLOORS[d].target + r() * 6) * 10) / 10,
        returns_rate_pct: Math.round((MARGIN_FLOORS[d].returns + r() * 4) * 10) / 10,
        ragm_pct: Math.round((MARGIN_FLOORS[d].ragm_floor + r() * 8) * 10) / 10,
      })),
    },
  };
}

// ==== PRECOMPUTED ====================================================
function genPrecomputed(skus: Sku[], core: any) {
  const departments: Record<string, any> = {};
  const allDepts: (Dept | 'all')[] = ['all', ...DEPTS];
  for (const dept of allDepts) {
    const subset = dept === 'all' ? skus : skus.filter(s => s.department === dept);
    const heatmap = core.sell_through_heatmap.filter((h: any) => dept === 'all' || h.department === dept);
    const top_skus = subset.slice(0, 10).map(s => ({
      sku_id: s.product_id, product_name: s.product_name, category: s.category,
      revenue_impact_inr: s.revenue_impact, price_change_pct: s.price_change_pct,
      recommendation_priority: s.recommendation_priority,
    }));
    const cats = dept === 'all' ? DEPTS.flatMap(d => CATEGORIES[d]) : CATEGORIES[dept as Dept];
    const margin_by_category = cats.map(c => {
      const rows = subset.filter(s => s.category === c);
      if (rows.length === 0) return null;
      const cm = round1(rows.reduce((s, x) => s + x.gross_margin_pct, 0) / rows.length);
      const fl = rows[0] ? MARGIN_FLOORS[rows[0].department].floor : 30;
      return { category: c, current_margin_pct: cm, target_margin_pct: round1(fl + 4), margin_floor_pct: fl, sku_count: rows.length };
    }).filter(Boolean);
    const campaign_performance = core.campaigns.filter((c: any) => dept === 'all' || c.department === dept);
    departments[dept] = { sell_through_heatmap: heatmap, top_skus_by_impact: top_skus, margin_by_category, campaign_performance };
  }
  return { generated_at: new Date('2026-05-17T00:00:00.000Z').toISOString(), departments };
}

// ==== INSIGHTS =======================================================
function genInsights() {
  const items = [
    { type: 'opportunity', severity: 'amber', title: 'Samsung 55" TV nearing markdown trigger', description: 'Sell-through 58% at week 6 — queue md25.', metric: 'sell_through_pct', action: 'Queue md25', relatedChart: 'markdown_queue' },
    { type: 'risk', severity: 'red', title: 'Black Friday overlap: 4 active markdowns in Electronics', description: 'Pre-clear by Nov 15 to protect margin.', metric: 'markdown_overlap_flag', action: 'Pre-clear', relatedChart: 'campaigns_table' },
    { type: 'competitive', severity: 'amber', title: 'Best Buy dropped Sony headphones by 12%', description: 'Competitive index now 108 (was 96). Match within 48h.', metric: 'competitive_index', action: 'Match price', relatedChart: 'competitive_index' },
    { type: 'returns', severity: 'red', title: 'Home & Garden returns RAGM erosion', description: '8 SKUs below 20% RAGM due to 14% returns.', metric: 'ragm_pct', action: 'Add product info', relatedChart: 'margin_distribution' },
    { type: 'opportunity', severity: 'green', title: 'Back-to-School Electronics volume +18% WoW', description: 'Reallocate budget to top laptops; projected 2.6x ROI.', metric: 'campaign_roi', action: 'Reallocate', relatedChart: 'ai_suggestions' },
  ];
  return {
    generated_at: new Date('2026-05-17T00:00:00.000Z').toISOString(),
    insights: items.map((it, i) => ({ ...it, id: `INS-R${String(i + 1).padStart(3, '0')}`, source: 'rule_engine' })),
    source: 'rule_engine',
  };
}

// ==== SKU SHARDS =====================================================
function genShard(s: Sku, campaigns: any[]) {
  const price_history: any[] = [];
  for (let d = -119; d <= 0; d++) {
    const date = isoDateOffset(d);
    const ageFrac = -d / 119;
    let price = s.msrp;
    let mdStep: string = 'full_price';
    let isPromo = false;
    let depth: number | null = null;
    let mech: string | null = null;
    let evName: string | null = null;
    if (ageFrac < 0.6) { price = s.current_price; mdStep = s.markdown_step; }
    if (!isPromo && r() < 0.06 && s.markdown_step === 'full_price') {
      isPromo = true; depth = -[15, 20, 25, 30][ri(0, 3)];
      mech = pick(PROMO_MECHANICS as unknown as string[]);
      price = round2(s.msrp * (1 + depth / 100));
      evName = pick(US_EVENTS).name;
    }
    const margin = round4((price - s.cost) / price);
    const ragm = round4(margin * (1 - s.return_rate_pct / 100) - (s.return_rate_pct / 100) * 0.08);
    const compIdx = round1(s.competitive_index + rb(-3, 3));
    price_history.push({
      date, price_inr: price, mrp_inr: s.msrp, cost_inr: s.cost,
      margin_pct: margin, is_promo: isPromo, promo_depth_pct: depth,
      event_name: evName, ragm_pct: ragm, promo_mechanic: mech,
      markdown_step: mdStep, competitive_index: compIdx,
    });
  }
  const elasticity_curve: any[] = [];
  for (let i = 0; i < 12; i++) {
    const ratio = 0.5 + i * 0.08;
    const p = round2(s.msrp * ratio);
    const volIdx = Math.round(100 * Math.pow(ratio, s.elasticity));
    elasticity_curve.push({
      price_inr: p, demand_index: volIdx,
      margin_inr: round2(p - s.cost),
      revenue_inr: Math.round(p * volIdx * 10),
    });
  }
  const margin_waterfall = {
    cost_inr: s.cost, shelf_price_inr: s.msrp,
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
  const promo_history: any[] = [];
  for (let i = 0; i < ri(2, 4); i++) {
    const ev = pick(US_EVENTS);
    promo_history.push({
      promo_id: `PROMO-${s.product_id}-${i + 1}`,
      mechanic: pick(PROMO_MECHANICS as unknown as string[]),
      start_date: ev.date, end_date: isoDateOffset(-30 + i * 8),
      depth_pct: [15, 20, 25, 30, 40][ri(0, 4)],
      budget_inr: ri(12_000, 92_000),
      lift_pct: round2(rb(8, 30)),
      incremental_revenue_inr: ri(22_000, 140_000),
      free_rider_ratio_pct: round1(clamp(gaussian(42, 8), 22, 66)),
      post_promo_dip_pct: round1(-rb(10, 22)),
      roi: round2(rb(1.6, 3.2)),
      net_roi: round2(rb(1.0, 2.4)),
    });
  }
  const recommendation = {
    current_price_inr: s.current_price, recommended_price_inr: s.recommended_price,
    price_change_pct: s.price_change_pct,
    rationale: `${s.brand} ${s.category} — ${s.is_stuck ? 'stuck at ' + STEP_LABEL[s.markdown_step] + ', advance recommended.' : 'priced near target; elasticity ' + s.elasticity + '.'}`,
    projected_volume_change_pct: round2(s.elasticity * s.price_change_pct),
    projected_revenue_change_inr: Math.round(s.revenue_impact),
    projected_margin_change_pp: round1(s.projected_margin_pct - s.current_margin_pct),
    confidence: s.recommendation_priority === 'High' ? 'high' : 'medium',
    priority: s.recommendation_priority,
  };
  const competitive_positioning = s.competitor_top3.map(c => ({
    competitor_id: c.competitor_id, price_usd: c.price_usd,
    last_seen: isoDateOffset(-ri(0, 3)),
    delta_vs_us_pct: round1((c.price_usd - s.current_price) / Math.max(0.01, s.current_price) * 100),
  }));
  const recent_promo_history = promo_history.slice(0, 4).map((p, i) => ({
    campaign_id: campaigns[i % campaigns.length].campaign_id,
    campaign_name: campaigns[i % campaigns.length].campaign_name,
    mechanic: p.mechanic, start_date: p.start_date, end_date: p.end_date,
    depth_pct: p.depth_pct, units_sold: ri(120, 1_400),
    incremental_revenue_usd: p.incremental_revenue_inr,
    roi: p.roi, free_rider_pct: p.free_rider_ratio_pct,
  }));
  return {
    sku_id: s.product_id, product_name: s.product_name,
    price_history, elasticity_curve, margin_waterfall,
    promo_history, recommendation,
    style_id: s.style_id, brand: s.brand,
    competitive_positioning, recent_promo_history,
    size_color_breakdown: [],
  };
}

// ==== MERCH DEMAND (scaled-down) ====================================
function genMerchDemandCore(skus: Sku[]) {
  const subset = skus.slice(0, 30);
  return {
    market: 'us_retail',
    generated_at: new Date('2026-05-17T00:00:00.000Z').toISOString(),
    data_window: { start_date: isoDateOffset(-90), end_date: ANCHOR_DATE, anchor_date: ANCHOR_DATE },
    skus: subset.map(s => ({
      sku_id: s.product_id, product_name: s.product_name,
      department: s.department, category: s.category,
      current_forecast_units: ri(140, 1800),
      current_forecast_revenue_inr: Math.round(s.current_price * ri(140, 1800)),
      abc_class: s.velocity_class === 'A' ? 'A' : s.velocity_class === 'B' ? 'B' : 'C',
      forecast_accuracy_pct: round1(clamp(gaussian(84, 6), 60, 96)),
      brand: s.brand,
    })),
    stores: Array.from({ length: 6 }, (_, i) => ({
      store_id: `MR-${String(i + 1).padStart(3, '0')}`,
      store_name: `Meridian Retail Store ${i + 1}`, city: pick(['Dallas', 'Chicago', 'Atlanta', 'Seattle', 'Denver', 'Boston']),
      state: pick(['TX', 'IL', 'GA', 'WA', 'CO', 'MA']),
    })),
    events: US_EVENTS.slice(0, 6),
    event_lifts: US_EVENTS.slice(0, 6).map(e => ({ event_name: e.name, lift_pct: ri(15, 60) })),
    sku_drivers: [],
    category_plans: DEPTS.map(d => ({ department: d, plan_revenue_inr: ri(400_000, 1_800_000) })),
    action_items: [],
    promos: CAMPAIGN_TEMPLATES.slice(0, 4).map((c, i) => ({ campaign_id: `MC-${i + 1}`, name: c.name })),
    launches: [], anomalies: [], structural_shifts: [],
    kpis: {
      forecast_accuracy_pct: 84.2, total_forecast_revenue_inr: 12_400_000,
      week_over_week_change_pct: 4.2, active_anomalies: 3,
    },
    model_card: { experiment: '/Shared/us_retail_demand', horizon_weeks: 14, min_history_days: 90 },
    plan_vs_actual: Array.from({ length: 8 }, (_, i) => ({ week: i + 1, plan_inr: 1_200_000, actual_inr: 1_200_000 + ri(-60_000, 120_000) })),
    accuracy_by_horizon: Array.from({ length: 6 }, (_, i) => ({ horizon_weeks: i + 1, mape_pct: round1(6 + i * 1.4) })),
    worst_forecasted_skus: [], new_product_skus: [], daily_forecast_points: [],
  };
}
function genMerchPrecomputed() {
  return { generated_at: new Date('2026-05-17T00:00:00.000Z').toISOString(), departments: {} };
}
function genMerchShard(s: Sku) {
  return {
    sku_id: s.product_id, product_name: s.product_name,
    department: s.department, category: s.category, brand: s.brand,
    forecast_14w: Array.from({ length: 14 }, (_, i) => ({
      week: i + 1,
      forecast_units: ri(80, 1200),
      forecast_revenue_inr: Math.round(s.current_price * ri(80, 1200)),
      lower_ci: ri(60, 900), upper_ci: ri(90, 1400),
    })),
    history_90d: Array.from({ length: 90 }, (_, i) => ({
      date: isoDateOffset(-89 + i),
      units: ri(4, 60), revenue_inr: ri(80, 1400),
    })),
  };
}

// ==== CX360 (minimal shapes) =========================================
function genCx360Kpis() {
  return {
    total_customers: 1_240_000, active_customers: 720_000, active_rate_pct: 58.1,
    avg_clv: 342.4, total_revenue: 424_800_000, avg_basket_value: 68.2,
    churn_rate_pct: 12.4, new_customers_30d: 18_200,
    at_risk_count: 92_400, at_risk_rate_pct: 7.4,
    total_customers_prior: 1_218_000, total_customers_trend: 1.8,
    avg_clv_prior: 336.2, avg_clv_trend: 1.8,
    churn_rate_pct_prior: 12.8, churn_rate_pct_trend: -0.4,
    active_rate_pct_prior: 57.4, active_rate_pct_trend: 0.7,
  };
}
function genCx360CustomerTable() {
  return {
    generated_at: new Date('2026-05-17T00:00:00.000Z').toISOString(),
    customers: Array.from({ length: 40 }, (_, i) => ({
      customer_id: `CUS-${String(i + 1).padStart(6, '0')}`,
      name: `Customer ${i + 1}`,
      city: pick(['Dallas', 'Chicago', 'Atlanta', 'Seattle', 'Denver', 'Boston', 'Phoenix', 'Miami']),
      rfm_segment: pick(['VIP', 'Loyal', 'Regular', 'Occasional', 'New', 'At-Risk']),
      clv_inr: ri(120, 2_400),
      last_order_date: isoDateOffset(-ri(1, 90)),
      total_orders: ri(2, 40),
      churn_risk: pick(['Very High', 'High', 'Medium', 'Low']),
    })),
  };
}
function genCx360ChurnRisk() {
  return {
    generated_at: new Date('2026-05-17T00:00:00.000Z').toISOString(),
    tiers: ['Very High', 'High', 'Medium', 'Low'].map((t, i) => ({
      tier: t, customer_count: [24_000, 68_000, 240_000, 640_000][i],
      avg_clv_inr: [820, 540, 320, 180][i],
      revenue_at_risk_inr: [24_000 * 820, 68_000 * 540, 0, 0][i] || 0,
    })),
    top_at_risk: Array.from({ length: 20 }, (_, i) => ({
      customer_id: `CUS-${String(i + 1).padStart(6, '0')}`,
      churn_prob: round2(0.6 + r() * 0.35), clv_inr: ri(400, 2_400),
    })),
  };
}
function genCx360AtRiskAlerts() {
  return {
    generated_at: new Date('2026-05-17T00:00:00.000Z').toISOString(),
    alerts: Array.from({ length: 10 }, (_, i) => ({
      alert_id: `AR-${String(i + 1).padStart(3, '0')}`,
      severity: pick(['critical', 'warning', 'info']),
      message: `Segment ${pick(['VIP', 'Loyal', 'At-Risk'])} churn risk up ${ri(3, 12)}% WoW`,
      impact_inr: ri(4_000, 42_000),
    })),
  };
}

// ==== INVENTORY (minimal shapes) =====================================
function genInventoryKpis() {
  return {
    total_skus: 200, healthy_pct: 68.4, stockout_pct: 6.2, overstock_pct: 12.4,
    weeks_of_supply_avg: 7.4, active_alerts: 18,
    inventory_value_inr: 12_400_000, days_sales_of_inventory: 52,
    total_skus_prior: 200, healthy_pct_prior: 66.8,
    healthy_pct_trend: 1.6, active_alerts_prior: 22, active_alerts_trend: -4,
  };
}
function genInventoryAlerts() {
  return {
    generated_at: new Date('2026-05-17T00:00:00.000Z').toISOString(),
    alerts: Array.from({ length: 12 }, (_, i) => ({
      alert_id: `INV-${String(i + 1).padStart(3, '0')}`,
      severity: pick(['critical', 'warning', 'info']),
      category: pick(DEPTS),
      message: pick([
        'Stockout risk within 3 days',
        'Overstock — 22 weeks of supply',
        'Replenishment overdue',
        'Safety stock breached',
      ]),
      impact_inr: ri(4_000, 42_000),
    })),
  };
}
function genInventorySkuTable(skus: Sku[]) {
  return {
    generated_at: new Date('2026-05-17T00:00:00.000Z').toISOString(),
    skus: skus.slice(0, 60).map(s => ({
      sku_id: s.product_id, product_name: s.product_name,
      department: s.department, category: s.category,
      on_hand_units: ri(20, 1400),
      weeks_of_supply: s.weeks_of_supply,
      status: s.weeks_of_supply < 2 ? 'stockout_risk' : s.weeks_of_supply > 14 ? 'overstock' : 'healthy',
      abc_class: s.velocity_class === 'A' ? 'A' : s.velocity_class === 'B' ? 'B' : 'C',
      unit_cost_inr: s.cost, value_inr: Math.round(s.cost * ri(40, 800)),
    })),
  };
}

// ==== WRITE ==========================================================
function ensureDir(p: string) { fs.mkdirSync(p, { recursive: true }); }
function writeJson(p: string, obj: any) { fs.writeFileSync(p, JSON.stringify(obj, null, 2)); }

/**
 * Mirror apparel flat cache files into us_retail with lightweight text
 * transformations (dept names, SKU prefixes, segment names). Keeps JSON
 * structure identical so every apparel-shaped page renders under us_retail
 * without a bespoke generator per file.
 *
 * Skipped: apparel_*.json (apparel-only features), coldstart.json,
 * store_opening.json (pages hidden from us_retail nav).
 */
function mirrorApparelFlats(): number {
  const APPAREL = path.join(process.cwd(), 'cache', 'apparel');
  const SKIP = new Set(['coldstart.json', 'store_opening.json']);
  const DEPT_MAP: Array<[RegExp, string]> = [
    [/Mens/g, 'Electronics'],
    [/Womens/g, 'Apparel & Shoes'],
    [/Kids/g, 'Home & Garden'],
    [/Footwear/g, 'Sports & Outdoor'],
    [/Accessories/g, 'Beauty & Personal'],
    [/APR-([A-Z]{2,3})-(\d{4})/g, 'USR-$1-$2'],
  ];
  const SEG_MAP: Array<[RegExp, string]> = [
    [/Fashion Forward/g, 'Premium Loyalist'],
    [/Athletic Enthusiast/g, 'Deal Seeker'],
    [/Value Shopper/g, 'Occasional Buyer'],
    [/Brand Loyalist/g, 'Omnichannel Shopper'],
    [/Returner/g, 'High Returner'],
    [/Casual/g, 'New Customer'],
  ];
  const transform = (text: string): string => {
    let out = text;
    for (const [from, to] of DEPT_MAP) out = out.replace(from, to);
    for (const [from, to] of SEG_MAP) out = out.replace(from, to);
    return out;
  };

  const appFiles = fs.readdirSync(APPAREL)
    .filter((f) => f.endsWith('.json'))
    .filter((f) => !f.startsWith('apparel_'))
    .filter((f) => !SKIP.has(f));
  const rtFiles = new Set(fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.json')));

  let written = 0;
  for (const f of appFiles) {
    if (rtFiles.has(f)) continue; // preserve any file the main generator already wrote
    const src = path.join(APPAREL, f);
    const dst = path.join(OUT_DIR, f);
    try {
      const text = fs.readFileSync(src, 'utf8');
      const transformed = transform(text);
      JSON.parse(transformed);
      fs.writeFileSync(dst, transformed);
      written++;
    } catch (e) {
      console.error(`mirror FAIL ${f}: ${(e as Error).message}`);
    }
  }
  return written;
}

function main() {
  const t0 = Date.now();
  ensureDir(OUT_DIR); ensureDir(PI_DIR); ensureDir(SKU_DIR); ensureDir(MD_DIR); ensureDir(MD_SKU_DIR);

  const skus = makeSkus();

  const core = genCore(skus);
  writeJson(path.join(PI_DIR, 'core.json'), core);
  writeJson(path.join(PI_DIR, 'precomputed.json'), genPrecomputed(skus, core));
  writeJson(path.join(PI_DIR, 'insights.json'), genInsights());

  for (const s of skus) {
    writeJson(path.join(SKU_DIR, `${s.product_id}.json`), genShard(s, core.campaigns));
  }

  // merch demand
  const mdCore = genMerchDemandCore(skus);
  writeJson(path.join(MD_DIR, 'core.json'), mdCore);
  writeJson(path.join(MD_DIR, 'precomputed.json'), genMerchPrecomputed());
  writeJson(path.join(MD_DIR, 'insights.json'), { generated_at: new Date().toISOString(), insights: [] });
  for (const s of skus.slice(0, 30)) {
    writeJson(path.join(MD_SKU_DIR, `${s.product_id}.json`), genMerchShard(s));
  }

  // cx360 + inventory
  writeJson(path.join(OUT_DIR, 'cx360_kpis.json'), genCx360Kpis());
  writeJson(path.join(OUT_DIR, 'cx360_customer_table.json'), genCx360CustomerTable());
  writeJson(path.join(OUT_DIR, 'cx360_churn_risk.json'), genCx360ChurnRisk());
  writeJson(path.join(OUT_DIR, 'cx360_at_risk_alerts.json'), genCx360AtRiskAlerts());
  writeJson(path.join(OUT_DIR, 'inventory_kpis.json'), genInventoryKpis());
  writeJson(path.join(OUT_DIR, 'inventory_alerts.json'), genInventoryAlerts());
  writeJson(path.join(OUT_DIR, 'inventory_sku_table.json'), genInventorySkuTable(skus));

  // Mirror all apparel flat files into us_retail (with dept/SKU/segment
  // rewrites) so every apparel-shaped page renders under us_retail too.
  const mirrored = mirrorApparelFlats();

  const total = 3 + skus.length + 3 + 30 + 4 + 3 + mirrored;
  const ms = Date.now() - t0;
  console.log(`us_retail: ${total} files written (${skus.length} price sku shards, 30 merch sku shards, ${mirrored} mirrored from apparel) in ${ms}ms`);
  console.log(`  price_intel/core.json kpis: leakage=${core.kpis.total_margin_leakage_inr} margin_realization=${core.kpis.margin_realization_pct}`);
}

main();
