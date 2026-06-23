// ─── Markdown & Clearance Types ─────────────────────────────────────────────
// All monetary values in INR paisa (divide by 100 for display) unless noted.
// Sell-through % = (units sold / opening stock) * 100.

export type Region = 'North' | 'South' | 'East' | 'West' | 'Central';
export type StoreType = 'Metro' | 'Tier-2' | 'Tier-3';
export type SeasonWindow = 'summer' | 'festive' | 'winter_health' | 'monsoon' | 'evergreen';
export type MarkdownDepthTier = '-15%' | '-25%' | '-40%' | '-60%';
export type AgingBucket = '0-4W' | '5-8W' | '9-12W' | '13W+';

// ─── Headline / Context ───────────────────────────────────────────────────────

export interface MarkdownHeadlineStats {
  /** Total active SKUs currently in markdown program across all categories */
  active_markdown_skus: number;
  /** ISO date of season exit — when clearance window closes */
  season_exit_date: string;
  /** Days remaining until season exit */
  days_to_season_exit: number;
  /** SKUs where current sell-through pace predicts < 70% clearance by exit */
  skus_flagged_at_risk: number;
  /** INR value of inventory at risk of write-off (units * cost price) */
  inventory_at_risk_inr: number;
  /** % of total markdown SKUs that are on track (>= pace target) */
  on_track_pct: number;
  /** Current active season label */
  active_season_label: string;
}

// ─── KPI Cards ───────────────────────────────────────────────────────────────

export interface MarkdownKPIs {
  /** (Total units sold in markdown window / Total opening stock at markdown start) * 100 */
  sell_through_pct: number;
  sell_through_trend_4w: { week: string; value: number }[];

  /** Average (MRP - actual selling price) / MRP * 100 across all active markdown SKUs */
  avg_markdown_depth_pct: number;
  avg_markdown_depth_trend_4w: { week: string; value: number }[];

  /**
   * (Actual selling price - COGS) / Actual selling price * 100.
   * Lower than base margin because markdown erodes realization.
   */
  gross_margin_realized_pct: number;
  gross_margin_realized_trend_4w: { week: string; value: number }[];

  /** Absolute unit count sold under markdown this season */
  units_cleared: number;
  units_cleared_trend_4w: { week: string; value: number }[];

  /**
   * Current closing stock / avg weekly sales over trailing 4 weeks.
   * > 8 WOS = danger; 4-8 = watch; < 4 = healthy given remaining weeks.
   */
  weeks_of_supply: number;
  weeks_of_supply_trend_4w: { week: string; value: number }[];
}

// ─── Sell-Through Pace Heatmap ────────────────────────────────────────────────

export interface HeatmapCategory {
  name: string;
  /** Indian FMCG examples: 'Beverages', 'Dairy', 'Snacks', 'Personal Care', 'Grocery Staples' */
  season_window: SeasonWindow;
  /** Total season length in weeks for this category */
  total_season_weeks: number;
  weekly_data: HeatmapWeekCell[];
}

export interface HeatmapWeekCell {
  week_number: number;
  /** Cumulative sell-through % from week 1 to this week */
  actual_sell_through_pct: number;
  /**
   * Linear pace target: if total season is 14 weeks and target is 85%,
   * week 8 target = (8/14) * 85 = ~48.6%.
   * Front-loaded for perishables: target higher in early weeks.
   */
  target_sell_through_pct: number;
  /** actual - target. Negative = behind pace. */
  pace_gap_pct: number;
  /** Unit count sold this week (not cumulative) */
  units_sold_this_week: number;
  is_current_week: boolean;
}

// ─── Markdown Queue (Pending Approvals) ──────────────────────────────────────

export interface MarkdownQueueItem {
  sku_id: string;
  product_name: string;
  brand: string;
  category: string;
  /** e.g. "Bisleri 1L PET", "Horlicks 500g Classic" */
  pack_desc: string;

  /** Current inventory in units across all stores (or filtered scope) */
  current_stock_units: number;

  /**
   * Weeks of Supply = current_stock_units / avg_weekly_sales_trailing_4w.
   * Triggers queue entry when WOS > remaining_season_weeks.
   */
  weeks_of_supply: number;
  remaining_season_weeks: number;

  /** Product expiry date — critical for FMCG write-off risk */
  expiry_date: string | null;
  /** Days from today to expiry */
  days_to_expiry: number | null;

  /** Current sell-through % this season */
  current_sell_through_pct: number;
  /** Target sell-through % at this point in the season */
  target_sell_through_pct: number;

  /** Current MRP */
  mrp_inr: number;
  /** Current selling price (already discounted if any) */
  current_price_inr: number;

  /**
   * AI-recommended new price.
   * Calculated from: pace gap + days to expiry + historical markdown response curve.
   */
  recommended_price_inr: number;
  /** Recommended markdown depth as % of MRP */
  recommended_markdown_depth_pct: number;

  /**
   * Gross margin at recommended price.
   * If negative = below cost — shows write-off is better than deep markdown.
   */
  projected_margin_at_recommendation_pct: number;

  /** INR margin impact of applying this markdown (can be negative = cost of markdown) */
  margin_impact_inr: number;

  /** Which stores are most lagging — same SKU may need different depth */
  store_variance: StoreVariance[];

  /** Priority rank for approval — driven by expiry risk + pace gap magnitude */
  priority_rank: number;

  /** 'pending' | 'approved' | 'rejected' | 'escalated' */
  status: string;

  /** Trigger reason for appearing in queue */
  trigger_reason: 'pace_gap' | 'expiry_risk' | 'wos_excess' | 'season_exit_risk';
}

export interface StoreVariance {
  store_id: string;
  store_name: string;
  store_type: StoreType;
  region: Region;
  /** Sell-through at this specific store */
  sell_through_pct: number;
  /** WOS at this specific store */
  weeks_of_supply: number;
  /** Recommended markdown depth for this specific store — may differ from national */
  recommended_depth_pct: number;
}

// ─── Markdown Cadence: Plan vs Actual ────────────────────────────────────────

export interface MarkdownCadenceData {
  tiers: MarkdownDepthTierData[];
}

export interface MarkdownDepthTierData {
  tier: MarkdownDepthTier;
  /** Plan: how many SKUs should have reached this depth by now (set at season start) */
  plan_sku_count: number;
  /** Actual: how many SKUs are currently at this depth */
  actual_sku_count: number;
  /**
   * Gap: plan - actual.
   * Positive gap = behind plan = margin risk (should have marked down more by now).
   * Negative gap = ahead of plan = may indicate panic markdowns.
   */
  gap: number;
  /** INR margin impact of the gap (cost of delayed markdowns = inventory stuck at higher price but lower velocity) */
  gap_margin_impact_inr: number;
}

// ─── Sell-Through vs Plan: Top Categories ────────────────────────────────────

export interface CategorySellThrough {
  category: string;
  /** Actual sell-through % this season to date */
  actual_pct: number;
  /**
   * Plan sell-through % at this point in the season.
   * Built from prior 3 years average pacing + seasonal index.
   */
  plan_pct: number;
  /** actual - plan. Negative = at risk. */
  gap_pct: number;
  /** INR value of inventory behind plan (gap units * avg cost price) */
  at_risk_inr: number;
  is_at_risk: boolean;
  season_window: SeasonWindow;
}

// ─── Inventory Aging ─────────────────────────────────────────────────────────

export interface InventoryAgingData {
  buckets: AgingBucketData[];
  /** Total units with expiry date falling within their aging bucket window */
  expiry_overlap_units: number;
}

export interface AgingBucketData {
  bucket: AgingBucket;
  unit_count: number;
  /** INR value at cost price */
  value_inr: number;
  /** % change in unit count vs same bucket same week prior year */
  trend_vs_prior_year_pct: number;
  /** Units in this bucket where expiry date falls within the next (bucket_weeks) weeks */
  expiry_risk_units: number;
  /** 'green' | 'amber' | 'red' */
  color_signal: string;
}

// ─── AI Markdown Suggestions ─────────────────────────────────────────────────

export interface AIMarkdownSuggestion {
  sku_id: string;
  product_name: string;
  brand: string;
  category: string;
  /** The specific recommendation with exact INR framing */
  recommendation_headline: string;
  /**
   * "₹X off" framing — Indian consumers respond stronger to this vs %.
   * e.g. "₹12 off" instead of "-15%"
   */
  consumer_facing_framing: string;
  /** Exact recommended new price */
  recommended_price_inr: number;
  /** Markdown depth % from MRP */
  markdown_depth_pct: number;
  /** Confidence score 0-100 based on: data sufficiency + response curve quality + days remaining */
  confidence_score: number;
  /** Primary driver of this recommendation */
  primary_driver: 'sell_through_pace' | 'expiry_proximity' | 'season_exit' | 'store_variance';
  /** Human-readable explanation referencing real data */
  reasoning: string;
  /** Projected additional units sold if markdown applied immediately */
  projected_additional_units: number;
  /** Projected additional revenue recovery in INR */
  projected_revenue_recovery_inr: number;
  /** Store-specific variations if same SKU needs different depth by store */
  store_specific_notes: string[];
  /** Which inputs from Databricks drove this suggestion */
  data_inputs: string[];
}

// ─── Full Payload ─────────────────────────────────────────────────────────────

export interface MarkdownClearancePayload {
  generated_at: string;
  /** Currently active season context */
  active_season: {
    name: string;
    window: SeasonWindow;
    start_date: string;
    end_date: string;
    current_week: number;
    total_weeks: number;
  };
  headline: MarkdownHeadlineStats;
  kpis: MarkdownKPIs;
  heatmap_categories: HeatmapCategory[];
  markdown_queue: MarkdownQueueItem[];
  cadence_data: MarkdownCadenceData;
  category_sell_through: CategorySellThrough[];
  aging_data: InventoryAgingData;
  ai_suggestions: AIMarkdownSuggestion[];
  /** Available filter dimensions */
  regions: Region[];
  store_types: StoreType[];
}
