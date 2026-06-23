/**
 * Static mock data for the Markdown & Clearance screen.
 * Represents: Summer season (April–June 2026), Week 8 of 14.
 * 150 stores, 5 regions, INR currency.
 *
 * Data would be fed from Databricks tables:
 *   - fact_inventory_daily       → current stock, aging, WOS
 *   - fact_sales_transactions    → units sold, revenue, sell-through
 *   - dim_product                → MRP, cost, expiry metadata
 *   - markdown_plan_targets      → plan sell-through by category x week
 *   - markdown_response_curves   → historical elasticity per category
 *   - markdown_approvals         → queue, status, audit trail
 */

import type {
  MarkdownClearancePayload,
  HeatmapCategory,
  HeatmapWeekCell,
} from './markdown-types';

// ─── Helper: Generate heatmap cells ──────────────────────────────────────────
// Front-loaded pacing for perishables (Dairy, Beverages) — 60% of target in first half.
// Back-loaded for durables (Snacks, Grocery Staples) — linear pace.

function genCells(
  totalWeeks: number,
  targetEndPct: number,
  currentWeek: number,
  pattern: 'frontloaded' | 'linear' | 'slow_start',
  randomSeed: number,
): HeatmapWeekCell[] {
  const cells: HeatmapWeekCell[] = [];
  let cumulativeActual = 0;

  const rand = (n: number) => {
    const x = Math.sin(n * randomSeed) * 10000;
    return x - Math.floor(x);
  };

  for (let w = 1; w <= totalWeeks; w++) {
    // Target pace
    let targetFraction: number;
    if (pattern === 'frontloaded') {
      // Exponential: more pressure early (perishables, summer beverages)
      targetFraction = (1 - Math.exp((-3 * w) / totalWeeks)) / (1 - Math.exp(-3));
    } else if (pattern === 'slow_start') {
      // S-curve: slow early, fast middle (festive gifting — late rush)
      const t = w / totalWeeks;
      targetFraction = (3 * t * t - 2 * t * t * t);
    } else {
      // Linear
      targetFraction = w / totalWeeks;
    }
    const targetPct = Math.round(targetFraction * targetEndPct * 10) / 10;

    // Actual: only fill up to currentWeek
    let actualPct = 0;
    if (w <= currentWeek) {
      const noise = (rand(w * 7 + randomSeed) - 0.5) * 8; // ±4 pp noise
      const weekActualIncrement = (targetEndPct / totalWeeks) * (pattern === 'frontloaded' ? 1.15 : 0.88) + noise / totalWeeks;
      cumulativeActual = Math.min(100, Math.max(0, cumulativeActual + weekActualIncrement));
      actualPct = Math.round(cumulativeActual * 10) / 10;
    }

    const weeklyUnits = w <= currentWeek ? Math.round(1200 + rand(w + randomSeed * 3) * 3000) : 0;

    cells.push({
      week_number: w,
      actual_sell_through_pct: actualPct,
      target_sell_through_pct: targetPct,
      pace_gap_pct: w <= currentWeek ? Math.round((actualPct - targetPct) * 10) / 10 : 0,
      units_sold_this_week: weeklyUnits,
      is_current_week: w === currentWeek,
    });
  }
  return cells;
}

// ─── Heatmap Categories ───────────────────────────────────────────────────────
const heatmapCategories: HeatmapCategory[] = [
  {
    name: 'Beverages',
    season_window: 'summer',
    total_season_weeks: 14,
    weekly_data: genCells(14, 85, 8, 'frontloaded', 1.7),
    // Bisleri, Maaza, Frooti, Limca — peak April-June, must clear by June end
  },
  {
    name: 'Dairy & Chilled',
    season_window: 'summer',
    total_season_weeks: 14,
    weekly_data: genCells(14, 90, 8, 'frontloaded', 2.3),
    // Amul ice cream, flavored milk — short shelf life, front-load critical
  },
  {
    name: 'Snacks & Namkeen',
    season_window: 'summer',
    total_season_weeks: 14,
    weekly_data: genCells(14, 75, 8, 'linear', 3.1),
    // Lays, Haldirams, Kurkure — longer shelf life, linear pace acceptable
  },
  {
    name: 'Personal Care',
    season_window: 'summer',
    total_season_weeks: 14,
    weekly_data: genCells(14, 70, 8, 'linear', 4.5),
    // Nivea sunscreen, Parachute summer edition — seasonal but not perishable
  },
  {
    name: 'Grocery Staples',
    season_window: 'evergreen',
    total_season_weeks: 14,
    weekly_data: genCells(14, 80, 8, 'slow_start', 5.9),
    // Tata Salt, Aashirvaad Atta — slow start common; catch-up feasible
  },
  {
    name: 'Health Drinks',
    season_window: 'summer',
    total_season_weeks: 14,
    weekly_data: genCells(14, 65, 8, 'linear', 6.2),
    // Horlicks summer SKUs, Complan — slower season vs peak (Oct-Feb)
  },
];

// ─── Full Payload ─────────────────────────────────────────────────────────────
export const mockMarkdownPayload: MarkdownClearancePayload = {
  generated_at: '2026-06-04T06:00:00+05:30',

  active_season: {
    name: 'Summer 2026',
    window: 'summer',
    start_date: '2026-04-01',
    end_date: '2026-06-30',
    current_week: 8,
    total_weeks: 14,
  },

  headline: {
    active_markdown_skus: 342,
    season_exit_date: '2026-06-30',
    days_to_season_exit: 26,
    skus_flagged_at_risk: 89,
    inventory_at_risk_inr: 18_60_000, // ₹18.6L
    on_track_pct: 67.3,
    active_season_label: 'Summer 2026 (Wk 8 / 14)',
  },

  kpis: {
    // Sell-through: 342 SKUs, avg 54.2% sold vs opening stock at markdown start
    sell_through_pct: 54.2,
    sell_through_trend_4w: [
      { week: 'Wk 5', value: 33.1 },
      { week: 'Wk 6', value: 40.8 },
      { week: 'Wk 7', value: 47.4 },
      { week: 'Wk 8', value: 54.2 },
    ],

    // Avg markdown depth: weighted average across active SKUs
    avg_markdown_depth_pct: 22.4,
    avg_markdown_depth_trend_4w: [
      { week: 'Wk 5', value: 15.2 },
      { week: 'Wk 6', value: 18.7 },
      { week: 'Wk 7', value: 20.1 },
      { week: 'Wk 8', value: 22.4 },
    ],

    // Gross margin realized at markdown prices
    gross_margin_realized_pct: 18.7,
    gross_margin_realized_trend_4w: [
      { week: 'Wk 5', value: 23.1 },
      { week: 'Wk 6', value: 21.4 },
      { week: 'Wk 7', value: 19.9 },
      { week: 'Wk 8', value: 18.7 },
    ],

    // Units cleared this season
    units_cleared: 4_82_340,
    units_cleared_trend_4w: [
      { week: 'Wk 5', value: 2_89_100 },
      { week: 'Wk 6', value: 3_41_200 },
      { week: 'Wk 7', value: 4_12_800 },
      { week: 'Wk 8', value: 4_82_340 },
    ],

    // WOS: current closing stock / trailing 4-week avg weekly sales
    weeks_of_supply: 6.2,
    weeks_of_supply_trend_4w: [
      { week: 'Wk 5', value: 9.1 },
      { week: 'Wk 6', value: 8.3 },
      { week: 'Wk 7', value: 7.1 },
      { week: 'Wk 8', value: 6.2 },
    ],
  },

  heatmap_categories: heatmapCategories,

  markdown_queue: [
    {
      sku_id: 'SKU-BIS-1L-PET',
      product_name: 'Bisleri Mineral Water',
      brand: 'Bisleri',
      category: 'Beverages',
      pack_desc: '1L PET Bottle',
      current_stock_units: 14_820,
      weeks_of_supply: 8.4,
      remaining_season_weeks: 3.7,
      expiry_date: '2026-07-15',
      days_to_expiry: 41,
      current_sell_through_pct: 41.2,
      target_sell_through_pct: 57.1,
      mrp_inr: 20,
      current_price_inr: 20,
      recommended_price_inr: 16,
      recommended_markdown_depth_pct: 20,
      projected_margin_at_recommendation_pct: 14.2,
      margin_impact_inr: -52_800,
      store_variance: [
        { store_id: 'S-MUM-01', store_name: 'Andheri West', store_type: 'Metro', region: 'West', sell_through_pct: 67.3, weeks_of_supply: 3.2, recommended_depth_pct: 15 },
        { store_id: 'S-JAI-03', store_name: 'Jaipur Vaishali', store_type: 'Tier-2', region: 'North', sell_through_pct: 28.1, weeks_of_supply: 11.4, recommended_depth_pct: 25 },
        { store_id: 'S-KOT-01', store_name: 'Kota Central', store_type: 'Tier-3', region: 'North', sell_through_pct: 19.6, weeks_of_supply: 16.8, recommended_depth_pct: 35 },
      ],
      priority_rank: 1,
      status: 'pending',
      trigger_reason: 'pace_gap',
    },
    {
      sku_id: 'SKU-MAA-600ML',
      product_name: 'Maaza Mango Drink',
      brand: 'Maaza',
      category: 'Beverages',
      pack_desc: '600ml PET',
      current_stock_units: 9_440,
      weeks_of_supply: 7.1,
      remaining_season_weeks: 3.7,
      expiry_date: '2026-07-30',
      days_to_expiry: 56,
      current_sell_through_pct: 38.7,
      target_sell_through_pct: 57.1,
      mrp_inr: 35,
      current_price_inr: 32,
      recommended_price_inr: 27,
      recommended_markdown_depth_pct: 22.9,
      projected_margin_at_recommendation_pct: 11.8,
      margin_impact_inr: -38_200,
      store_variance: [
        { store_id: 'S-DEL-04', store_name: 'Connaught Place', store_type: 'Metro', region: 'North', sell_through_pct: 61.2, weeks_of_supply: 2.9, recommended_depth_pct: 15 },
        { store_id: 'S-LKO-02', store_name: 'Lucknow Hazratganj', store_type: 'Tier-2', region: 'North', sell_through_pct: 31.4, weeks_of_supply: 9.2, recommended_depth_pct: 25 },
        { store_id: 'S-GKP-01', store_name: 'Gorakhpur', store_type: 'Tier-3', region: 'North', sell_through_pct: 14.8, weeks_of_supply: 19.1, recommended_depth_pct: 40 },
      ],
      priority_rank: 2,
      status: 'pending',
      trigger_reason: 'pace_gap',
    },
    {
      sku_id: 'SKU-AMU-ICE-500',
      product_name: 'Amul Tricone Ice Cream',
      brand: 'Amul',
      category: 'Dairy & Chilled',
      pack_desc: '4-piece multipack',
      current_stock_units: 3_210,
      weeks_of_supply: 5.8,
      remaining_season_weeks: 3.7,
      expiry_date: '2026-06-25',
      days_to_expiry: 21,
      current_sell_through_pct: 47.3,
      target_sell_through_pct: 61.4,
      mrp_inr: 80,
      current_price_inr: 72,
      recommended_price_inr: 59,
      recommended_markdown_depth_pct: 26.3,
      projected_margin_at_recommendation_pct: 6.4,
      margin_impact_inr: -29_400,
      store_variance: [
        { store_id: 'S-BLR-02', store_name: 'Koramangala', store_type: 'Metro', region: 'South', sell_through_pct: 72.1, weeks_of_supply: 1.8, recommended_depth_pct: 10 },
        { store_id: 'S-HYD-03', store_name: 'Secunderabad', store_type: 'Metro', region: 'South', sell_through_pct: 44.2, weeks_of_supply: 5.2, recommended_depth_pct: 25 },
      ],
      priority_rank: 3,
      status: 'pending',
      trigger_reason: 'expiry_risk',
    },
    {
      sku_id: 'SKU-FRO-200ML-MNG',
      product_name: 'Frooti Mango Tetra',
      brand: 'Frooti',
      category: 'Beverages',
      pack_desc: '200ml Tetra',
      current_stock_units: 22_100,
      weeks_of_supply: 9.3,
      remaining_season_weeks: 3.7,
      expiry_date: '2026-09-01',
      days_to_expiry: 89,
      current_sell_through_pct: 33.2,
      target_sell_through_pct: 57.1,
      mrp_inr: 15,
      current_price_inr: 15,
      recommended_price_inr: 12,
      recommended_markdown_depth_pct: 20,
      projected_margin_at_recommendation_pct: 16.7,
      margin_impact_inr: -44_100,
      store_variance: [
        { store_id: 'S-MUM-03', store_name: 'Dharavi', store_type: 'Metro', region: 'West', sell_through_pct: 52.8, weeks_of_supply: 4.1, recommended_depth_pct: 15 },
        { store_id: 'S-PUN-02', store_name: 'Pimpri', store_type: 'Tier-2', region: 'West', sell_through_pct: 25.4, weeks_of_supply: 12.7, recommended_depth_pct: 30 },
      ],
      priority_rank: 4,
      status: 'pending',
      trigger_reason: 'wos_excess',
    },
    {
      sku_id: 'SKU-NIV-SUN50',
      product_name: 'Nivea Sun Protect',
      brand: 'Nivea',
      category: 'Personal Care',
      pack_desc: 'SPF50 100ml',
      current_stock_units: 6_780,
      weeks_of_supply: 7.8,
      remaining_season_weeks: 3.7,
      expiry_date: '2027-03-01',
      days_to_expiry: 270,
      current_sell_through_pct: 42.1,
      target_sell_through_pct: 49.0,
      mrp_inr: 249,
      current_price_inr: 224,
      recommended_price_inr: 199,
      recommended_markdown_depth_pct: 20.1,
      projected_margin_at_recommendation_pct: 19.4,
      margin_impact_inr: -22_300,
      store_variance: [
        { store_id: 'S-DEL-01', store_name: 'South Extension', store_type: 'Metro', region: 'North', sell_through_pct: 64.8, weeks_of_supply: 3.2, recommended_depth_pct: 15 },
        { store_id: 'S-JDH-01', store_name: 'Jodhpur Station Road', store_type: 'Tier-2', region: 'North', sell_through_pct: 28.3, weeks_of_supply: 10.4, recommended_depth_pct: 25 },
      ],
      priority_rank: 5,
      status: 'pending',
      trigger_reason: 'pace_gap',
    },
  ],

  cadence_data: {
    tiers: [
      {
        tier: '-15%',
        plan_sku_count: 145,
        actual_sku_count: 138,
        gap: -7,
        gap_margin_impact_inr: -3_40_000,
      },
      {
        tier: '-25%',
        plan_sku_count: 98,
        actual_sku_count: 72,
        gap: -26,
        gap_margin_impact_inr: -8_90_000,
      },
      {
        tier: '-40%',
        plan_sku_count: 54,
        actual_sku_count: 31,
        gap: -23,
        gap_margin_impact_inr: -12_10_000,
      },
      {
        tier: '-60%',
        plan_sku_count: 22,
        actual_sku_count: 8,
        gap: -14,
        gap_margin_impact_inr: -6_70_000,
      },
    ],
  },

  category_sell_through: [
    { category: 'Beverages',        actual_pct: 41.2, plan_pct: 57.1, gap_pct: -15.9, at_risk_inr: 8_40_000, is_at_risk: true,  season_window: 'summer' },
    { category: 'Dairy & Chilled',  actual_pct: 54.8, plan_pct: 61.4, gap_pct: -6.6,  at_risk_inr: 2_90_000, is_at_risk: true,  season_window: 'summer' },
    { category: 'Snacks & Namkeen', actual_pct: 62.4, plan_pct: 53.6, gap_pct: 8.8,   at_risk_inr: 0,         is_at_risk: false, season_window: 'summer' },
    { category: 'Personal Care',    actual_pct: 44.7, plan_pct: 49.0, gap_pct: -4.3,  at_risk_inr: 1_20_000, is_at_risk: false, season_window: 'summer' },
    { category: 'Grocery Staples',  actual_pct: 71.3, plan_pct: 57.1, gap_pct: 14.2,  at_risk_inr: 0,         is_at_risk: false, season_window: 'evergreen' },
    { category: 'Health Drinks',    actual_pct: 29.4, plan_pct: 45.7, gap_pct: -16.3, at_risk_inr: 3_80_000, is_at_risk: true,  season_window: 'summer' },
  ],

  aging_data: {
    buckets: [
      {
        bucket: '0-4W',
        unit_count: 2_18_400,
        value_inr: 42_10_000,
        trend_vs_prior_year_pct: -8.2,
        expiry_risk_units: 0,
        color_signal: 'green',
      },
      {
        bucket: '5-8W',
        unit_count: 1_42_300,
        value_inr: 31_80_000,
        trend_vs_prior_year_pct: 4.7,
        expiry_risk_units: 12_400,
        color_signal: 'green',
      },
      {
        bucket: '9-12W',
        unit_count: 68_100,
        value_inr: 16_40_000,
        trend_vs_prior_year_pct: 22.3,
        expiry_risk_units: 31_200,
        color_signal: 'amber',
      },
      {
        bucket: '13W+',
        unit_count: 24_800,
        value_inr: 7_20_000,
        trend_vs_prior_year_pct: 41.8,
        expiry_risk_units: 18_600,
        color_signal: 'red',
      },
    ],
    expiry_overlap_units: 62_200,
  },

  ai_suggestions: [
    {
      sku_id: 'SKU-BIS-1L-PET',
      product_name: 'Bisleri Mineral Water 1L',
      brand: 'Bisleri',
      category: 'Beverages',
      recommendation_headline: 'Drop to ₹16 immediately — 3.7 weeks left, pace 15.9 pp behind',
      consumer_facing_framing: '₹4 off — ₹16 only',
      recommended_price_inr: 16,
      markdown_depth_pct: 20,
      confidence_score: 91,
      primary_driver: 'sell_through_pace',
      reasoning:
        'Bisleri 1L is at 41.2% sell-through vs 57.1% plan at Week 8. Historical response curve for packaged water (2023–2025 summer) shows a -20% markdown from MRP drives +34% unit velocity. At current pace, 8,700 units remain at season exit — a ₹1.74L write-off. Jaipur and Kota stores are critical: Jaipur at 11.4 WOS needs -25%, Kota at 16.8 WOS needs -35%. Mumbai Andheri is already at 3.2 WOS — apply only -15% there to preserve margin.',
      projected_additional_units: 6_200,
      projected_revenue_recovery_inr: 99_200,
      store_specific_notes: [
        'Mumbai (Metro): -15% (₹17) — strong natural velocity, preserve margin',
        'Jaipur (Tier-2): -25% (₹15) — moderate velocity, price-sensitive market',
        'Kota (Tier-3): -35% (₹13) — stagnant; ₹X-off framing critical for impulse',
      ],
      data_inputs: [
        'fact_inventory_daily: 14,820 units as of June 4',
        'fact_sales_transactions: 4-week trailing velocity = 1,764 units/week',
        'markdown_response_curves: Packaged Water, summer, -15% to -40% range',
        'dim_product: MRP ₹20, cost ₹11.80, expiry July 15',
      ],
    },
    {
      sku_id: 'SKU-MAA-600ML',
      product_name: 'Maaza Mango Drink 600ml',
      brand: 'Maaza',
      category: 'Beverages',
      recommendation_headline: 'Apply ₹8 off to unlock North India velocity — expiry July 30',
      consumer_facing_framing: '₹8 off — ₹27 only',
      recommended_price_inr: 27,
      markdown_depth_pct: 22.9,
      confidence_score: 87,
      primary_driver: 'sell_through_pace',
      reasoning:
        'Maaza 600ml at 38.7% sell-through vs 57.1% plan. North India stores (Lucknow, Gorakhpur) are dragging national average — Gorakhpur at 14.8% is essentially stalled. Historical data: Maaza in Tier-2/3 North responds strongly to "₹X off" framing — a -23% markdown in summer 2025 drove +41% velocity in Tier-2. Mango drinks peak demand is June; clearance window is now. Delhi Connaught Place needs only -15% — strong walk-in traffic.',
      projected_additional_units: 4_100,
      projected_revenue_recovery_inr: 1_10_700,
      store_specific_notes: [
        'Delhi (Metro): -15% (₹30) — natural peak demand, light touch',
        'Lucknow (Tier-2): -25% (₹26) — "Save ₹9" framing for shelf talker',
        'Gorakhpur (Tier-3): -40% (₹21) — deep discount; consider bundle (3-for-₹60)',
      ],
      data_inputs: [
        'fact_inventory_daily: 9,440 units',
        'fact_sales_transactions: trailing velocity 1,329 units/week',
        'markdown_response_curves: Mango Drinks, North India, summer 2023-2025',
        'dim_product: expiry July 30, cost ₹18.20, MRP ₹35',
      ],
    },
    {
      sku_id: 'SKU-AMU-ICE-500',
      product_name: 'Amul Tricone Ice Cream 4-pk',
      brand: 'Amul',
      category: 'Dairy & Chilled',
      recommendation_headline: 'URGENT: Expiry June 25 — apply ₹21 off, clear in 21 days',
      consumer_facing_framing: '₹21 off — only ₹59',
      recommended_price_inr: 59,
      markdown_depth_pct: 26.3,
      confidence_score: 94,
      primary_driver: 'expiry_proximity',
      reasoning:
        'Amul Tricone multipack expires June 25 — 21 days. At current velocity of 553 units/week, 1,597 units will remain at expiry. Write-off cost at ₹48 COGS = ₹76,656. A -26% markdown (₹59) drives estimated +68% velocity based on ice cream response curve (impulse category, high price elasticity). Revenue recovery: ₹94K vs ₹0 write-off. Bangalore Koramangala is already clearing — focus this markdown on Hyderabad Secunderabad and any Tier-2 stores with chilled infrastructure.',
      projected_additional_units: 2_600,
      projected_revenue_recovery_inr: 1_53_400,
      store_specific_notes: [
        'Bengaluru (Metro): -10% (₹72) — already at 72% sell-through, apply only if WOS > 2.5',
        'Hyderabad (Metro): -26% (₹59) — impulse trigger at this price point',
        'Do NOT apply to stores without functional cold chain — write-off is preferable to compromised cold chain',
      ],
      data_inputs: [
        'fact_inventory_daily: 3,210 units',
        'dim_product: expiry June 25, cost ₹48, MRP ₹80',
        'markdown_response_curves: Ice Cream / Frozen, impulse category, summer',
        'store_coldchain_status: verified for 14 of 16 impacted stores',
      ],
    },
  ],

  regions: ['North', 'South', 'East', 'West', 'Central'],
  store_types: ['Metro', 'Tier-2', 'Tier-3'],
};
