/**
 * Databricks data dictionary for the chat agent.
 *
 * Tells Claude WHICH table to use for WHICH question — and the column
 * names + filters it should always include. Without this, the agent
 * fumbles names ("retail.customers") or runs unbounded queries against
 * 100M+ row fact tables.
 *
 * To keep token use small, we don't ship every column — only the ones the
 * agent typically reasons about. Full schema lives in Databricks.
 *
 * Scanned 2026-06-19 against workspace adb-3361736940380124. Re-run
 * scripts/scan-databricks.sh if the schema drifts.
 */

export interface DbxTable {
  /** Fully-qualified name to use in SQL. */
  fqn: string;
  /** One-line description for the agent. */
  blurb: string;
  /** Columns the agent will commonly reference (name → meaning). */
  cols: Record<string, string>;
  /** Approx row count — flags huge tables that need filtering. */
  rows: number;
  /** Filters Claude should ALWAYS include to avoid runaway queries. */
  alwaysFilter?: string;
  /** What domain this belongs to — drives prompt injection. */
  domain: 'cx' | 'inventory' | 'demand' | 'supply' | 'price' | 'promo' | 'dim';
}

/** date_id is YYYYMMDD as bigint — never a date string. */
export function toDateId(d: Date | string): number {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.getUTCFullYear() * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
}

export function fromDateId(id: number): Date {
  const s = String(id);
  return new Date(Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8)));
}

/** Most recent date_id we can reasonably assume has data. */
export const LATEST_DATE_ID_SQL =
  '(SELECT MAX(date_id) FROM hive_metastore.retail_gold.gold_demand_daily_sku_store)';

/**
 * "Last N days" anchored on the table's LATEST date_id — NOT on CURRENT_DATE.
 * The dataset cuts off at 2025-12-31; using today's date filters everything out.
 */
export function lastNDays(n: number): string {
  return `date_id >= CAST(DATE_FORMAT(DATE_SUB(TO_DATE(CAST(${LATEST_DATE_ID_SQL} AS STRING), 'yyyyMMdd'), ${n}), 'yyyyMMdd') AS BIGINT)`;
}

export const DBX_CATALOG: Record<string, DbxTable> = {
  // ─── CX 360 ────────────────────────────────────────────────────────────────
  genome_customer_360: {
    fqn: 'hive_metastore.cx_genome.genome_customer_360',
    blurb:
      'Master customer record — one fat row per customer with RFM, CLV, churn, NBA. Use this FIRST for any customer question.',
    domain: 'cx',
    rows: 111_731,
    cols: {
      customer_id: 'unique customer id',
      city: 'customer city',
      state: 'customer state',
      total_orders: 'lifetime order count',
      total_spend: 'lifetime spend in INR',
      avg_order_value: 'AOV in INR',
      recency_days: 'days since last order',
      rfm_segment: 'segment name (Champions / Loyal / At-Risk / etc.)',
      rfm_score: 'composite RFM score',
      clv_predicted_12m: 'predicted 12-month CLV in INR',
      clv_tier: 'CLV tier (Platinum / Gold / Silver / Bronze)',
      churn_probability: '30-day churn probability (0–1)',
      churn_risk_tier: 'Very High / High / Medium / Low',
      churn_reason_1: 'top churn driver',
      revenue_at_risk: 'INR revenue at risk if this customer churns',
      next_best_action: 'recommended action string',
      save_priority_rank: 'lower = save first',
      nps_category: 'Promoter / Passive / Detractor',
    },
  },
  churn_scores: {
    fqn: 'hive_metastore.retail_ml.churn_scores',
    blurb: 'Churn model output — 30/60/90-day probabilities per customer.',
    domain: 'cx',
    rows: 50_000,
    cols: {
      customer_id: 'customer id',
      churn_probability_30d: '30-day churn prob (0–1)',
      churn_probability_60d: '60-day churn prob',
      churn_probability_90d: '90-day churn prob',
      churn_risk_tier: 'Very High / High / Medium / Low',
    },
  },
  clv_scores: {
    fqn: 'hive_metastore.retail_ml.clv_scores',
    blurb: 'CLV model output — predicted lifetime value per customer.',
    domain: 'cx',
    rows: 50_000,
    cols: {
      customer_id: 'customer id',
      clv_12m: '12-month CLV in INR',
      clv_tier: 'Platinum / Gold / Silver / Bronze',
      probability_alive: 'BTYD probability customer is still active',
      predicted_purchases_12m: 'expected 12-month purchase count',
    },
  },
  cohort_retention: {
    fqn: 'hive_metastore.retail_gold.gold_cohort_retention',
    blurb: 'Monthly cohort retention curves.',
    domain: 'cx',
    rows: 26,
    cols: {
      cohort_month: 'cohort start month',
      months_since_cohort: 'months elapsed (0 = signup month)',
      retention_rate: 'pct of cohort still active',
      cohort_size: 'original cohort size',
    },
  },

  // ─── Inventory ────────────────────────────────────────────────────────────
  inventory_health: {
    fqn: 'hive_metastore.retail_gold.gold_inventory_health',
    blurb:
      'Daily inventory snapshot per SKU × store. HUGE (182M rows) — always filter on date_id AND city/store_type.',
    domain: 'inventory',
    rows: 182_167_633,
    alwaysFilter: `date_id = ${LATEST_DATE_ID_SQL}`,
    cols: {
      product_id: 'sku',
      store_id: 'store',
      date_id: 'YYYYMMDD bigint',
      department: 'top-level dept',
      category_l1: 'category',
      abc_class: 'A / B / C velocity class',
      city: 'store city',
      store_type: 'Hypermarket / Supermarket / etc.',
      closing_stock_qty: 'units on hand',
      days_of_stock: 'cover at current velocity',
      is_stockout: 'boolean',
      inventory_health_status: 'Healthy / Low / Stockout / Overstock',
    },
  },
  safety_stock: {
    fqn: 'hive_metastore.retail_gold.gold_safety_stock',
    blurb: 'Calculated safety stock + reorder point per SKU × store.',
    domain: 'inventory',
    rows: 117_126,
    cols: {
      product_id: 'sku',
      store_id: 'store',
      product_name: 'product name',
      city: 'store city',
      avg_daily_demand: 'mean daily units',
      stddev_daily_demand: 'demand stdev',
      lead_time_days: 'supplier lead time',
      safety_stock_qty: 'recommended safety stock',
      reorder_point: 'trigger qty',
    },
  },
  replenishment_signal: {
    fqn: 'hive_metastore.retail_gold.gold_replenishment_signal',
    blurb:
      'Daily replenishment recommendations. HUGE (140M) — always filter date_id.',
    domain: 'inventory',
    rows: 140_537_885,
    alwaysFilter: `date_id = ${LATEST_DATE_ID_SQL}`,
    cols: {
      product_id: 'sku',
      store_id: 'store',
      date_id: 'YYYYMMDD',
      city: 'store city',
      current_stock: 'units on hand',
      replenishment_status: 'Reorder / Watch / OK / Overstock',
      suggested_order_qty: 'recommended qty to order',
    },
  },
  osa_tracker: {
    fqn: 'hive_metastore.retail_gold.gold_osa_tracker',
    blurb: 'Stockout events with root cause and revenue lost.',
    domain: 'inventory',
    rows: 315_138,
    cols: {
      product_id: 'sku',
      store_id: 'store',
      stockout_start_date: 'start date',
      duration_hours: 'how long out of stock',
      root_cause: 'Supplier / Forecast / Demand spike / etc.',
      estimated_lost_revenue: 'INR lost',
      is_resolved: 'boolean',
      is_festival_period: 'in-festival flag',
    },
  },

  // ─── Demand ───────────────────────────────────────────────────────────────
  demand_daily: {
    fqn: 'hive_metastore.retail_gold.gold_demand_daily_sku_store',
    blurb:
      'THE big demand table — daily SKU × store with sales, margin, promo, festival, weather flags. 140M rows, always filter date_id.',
    domain: 'demand',
    rows: 140_537_885,
    alwaysFilter: `date_id >= CAST(DATE_FORMAT(DATE_SUB(CURRENT_DATE(), 30), 'yyyyMMdd') AS BIGINT)`,
    cols: {
      date_id: 'YYYYMMDD bigint',
      product_id: 'sku',
      store_id: 'store',
      department: 'department',
      category_l1: 'category',
      abc_class: 'velocity class',
      city: 'store city',
      state: 'state',
      store_type: 'store format',
      quantity_sold: 'units',
      revenue: 'INR net revenue',
      total_margin: 'INR margin',
      avg_selling_price: 'realised price',
      total_discount: 'INR discount given',
      is_on_promo: '0/1 flag',
      promo_id: 'active promo id if any',
      is_stockout: '0/1',
      days_of_stock: 'cover',
      festival_name: 'festival if active',
      is_festival_period: 'in-festival flag',
      festival_intensity: 'High / Medium / Low',
      days_to_festival: 'days until next festival',
      is_monsoon_active: 'monsoon flag',
      is_salary_week: 'pay-cycle flag',
      is_weekend: 'weekend flag',
    },
  },
  festival_demand: {
    fqn: 'hive_metastore.retail_gold.gold_festival_demand',
    blurb: 'Festival uplift by department × category × geo × festival × year.',
    domain: 'demand',
    rows: 22_680,
    cols: {
      department: 'department',
      category_l1: 'category',
      city: 'city',
      festival_name: 'Diwali / Holi / etc.',
      year: 'year',
      total_qty: 'units sold during festival',
      avg_daily_qty: 'avg daily units',
      estimated_multiplier: 'uplift vs baseline (e.g. 2.30 = 130% lift)',
    },
  },
  forecast_output: {
    fqn: 'hive_metastore.retail_ml.forecast_output',
    blurb:
      'ML forecast per SKU × store × horizon with 80/95 CI. NOTE: only department, store_type, abc_class, city — NO category_l1. JOIN to dim_product if you need category.',
    domain: 'demand',
    rows: 351_378,
    cols: {
      product_id: 'sku (join dim_product for name/category)',
      store_id: 'store',
      horizon_days: 'forecast horizon',
      target_date_id: 'YYYYMMDD forecast for',
      forecast_qty: 'predicted units',
      lower_80: 'lower 80% CI',
      upper_80: 'upper 80% CI',
      confidence_score: '0–1 model confidence',
      department: 'department (NOT category_l1)',
      store_type: 'store format',
      abc_class: 'velocity class',
      city: 'city',
      model_version: 'model id',
    },
  },
  store_demand_index: {
    fqn: 'hive_metastore.retail_gold.gold_store_profile_demand_index',
    blurb: 'Weekly seasonality index per category × store_type × city_tier.',
    domain: 'demand',
    rows: 11_232,
    cols: {
      category_l1: 'category',
      store_type: 'format',
      city_tier: 'Tier 1 / 2 / 3',
      week_of_year: 'ISO week',
      avg_qty_per_store_per_day: 'baseline daily qty',
      seasonality_index: 'multiplier vs annual avg',
      n_stores: 'sample size',
    },
  },

  // ─── Supply ───────────────────────────────────────────────────────────────
  supplier_scorecard: {
    fqn: 'hive_metastore.retail_gold.gold_supplier_scorecard',
    blurb: 'One row per supplier — OTIF, lead time, $ ordered. Small (30 rows).',
    domain: 'supply',
    rows: 30,
    cols: {
      supplier_id: 'supplier id',
      supplier_name: 'name',
      supplier_city: 'city',
      lead_time_days: 'committed lead time',
      avg_actual_lead_time: 'actual lead time',
      total_pos: 'POs raised',
      total_po_value: 'INR ordered',
      on_time_pct: 'on-time delivery %',
      in_full_pct: 'in-full delivery %',
    },
  },
  cost_passthrough: {
    fqn: 'hive_metastore.retail_gold.gold_cost_passthrough',
    blurb:
      'Supplier cost-change events with passthrough recommendation. Use for "cost passthrough gap" questions.',
    domain: 'supply',
    rows: 721,
    cols: {
      supplier_id: 'supplier id',
      supplier_name: 'name',
      effective_date: 'when the cost changed',
      change_type: 'increase / decrease',
      old_cost: 'INR',
      new_cost: 'INR',
      cost_change_pct: 'pct change',
      affected_products_count: '# SKUs touched',
      total_impact_monthly_inr: 'INR monthly impact if not passed through',
      recommended_passthrough_pct: 'recommended price uplift',
    },
  },

  // ─── Price ─────────────────────────────────────────────────────────────────
  optimal_price: {
    fqn: 'hive_metastore.retail_gold.gold_optimal_price',
    blurb:
      'Per-SKU optimal price with margin and competitor info. THE table for pricing questions.',
    domain: 'price',
    rows: 470_700,
    cols: {
      product_id: 'sku',
      product_name: 'name',
      category_l1: 'category',
      abc_class: 'velocity',
      current_price: 'shelf INR',
      mrp: 'MRP INR',
      cost_price: 'COGS INR',
      recommended_price: 'optimal INR',
      min_price: 'floor INR',
      max_price: 'ceiling INR',
      elasticity_coefficient: 'price elasticity',
      competitor_price: 'lowest competitor price',
      competitive_index: 'our_price / competitor_price',
    },
  },
  price_elasticity: {
    fqn: 'hive_metastore.retail_gold.gold_price_elasticity_matrix',
    blurb: 'Modelled price elasticity per SKU with cross-elasticity.',
    domain: 'price',
    rows: 3_000,
    cols: {
      product_id: 'sku',
      product_name: 'name',
      category_l1: 'category',
      elasticity_coefficient: 'own-price elasticity',
      cross_elasticity: 'cross-elasticity to substitutes',
      confidence_score: 'model confidence',
      current_price: 'INR',
      current_mrp: 'INR',
    },
  },
  competitive_index: {
    fqn: 'hive_metastore.retail_gold.gold_competitive_index',
    blurb: 'SKU prices vs competitors per platform (Blinkit / Zepto / etc.).',
    domain: 'price',
    rows: 78_458,
    cols: {
      product_id: 'sku',
      effective_date: 'snapshot date',
      product_name: 'name',
      our_price: 'our INR',
      our_mrp: 'our MRP',
      competitor_price: 'competitor INR',
      competitor_name: 'competitor name',
      platform: 'channel',
      competitive_index: 'our_price / competitor_price',
      is_kvi: 'key-value-item flag',
    },
  },
  price_recommendations: {
    fqn: 'hive_metastore.retail_ml.price_recommendations',
    blurb:
      'ML-generated pricing recommendations with revenue impact. Small — easy full scan.',
    domain: 'price',
    rows: 486,
    cols: {
      product_id: 'sku',
      product_name: 'name',
      current_price: 'INR',
      recommended_price: 'INR',
      price_change_pct: 'pct change',
      current_margin_pct: 'current margin %',
      projected_margin_pct: 'projected margin %',
      revenue_impact: 'INR weekly impact',
      recommendation_priority: 'High / Medium / Low',
    },
  },

  // ─── Promo ────────────────────────────────────────────────────────────────
  promo_effectiveness: {
    fqn: 'hive_metastore.retail_gold.gold_promo_effectiveness',
    blurb:
      'Per-promo SKU × store performance with lift. 13M rows — filter on promo_id or product_id. NO product_name column — JOIN to dim_product if you need names.',
    domain: 'promo',
    rows: 13_588_188,
    cols: {
      promo_id: 'promo id',
      product_id: 'sku (join to dim_product for name)',
      store_id: 'store',
      promo_type: 'percent_off / bogo / bundle / etc.',
      discount_pct: 'depth %',
      start_date: 'date',
      end_date: 'date',
      promo_qty: 'units sold during promo',
      promo_revenue: 'INR during promo',
      baseline_daily_qty: 'pre-promo baseline',
      promo_daily_qty: 'during-promo daily avg',
      volume_lift_pct: 'lift vs baseline',
    },
  },
  fact_promotions: {
    fqn: 'hive_metastore.retail_silver.fact_promotions',
    blurb: 'Promo master — definitions, dates, scope.',
    domain: 'promo',
    rows: 600,
    cols: {
      promo_id: 'id',
      promo_name: 'name',
      promo_type: 'type',
      discount_pct: 'depth %',
      start_date: 'start',
      end_date: 'end',
      budget_allocated_inr: 'INR budget',
      is_active: 'currently live',
    },
  },

  // ─── Dimensions ────────────────────────────────────────────────────────────
  dim_store: {
    fqn: 'hive_metastore.retail_silver.dim_store',
    blurb: 'Store master — 275 stores. Use for store name/city/format lookups.',
    domain: 'dim',
    rows: 275,
    cols: {
      store_id: 'id',
      store_name: 'name',
      store_type: 'format',
      city: 'city',
      state: 'state',
      region: 'region',
      store_area_sqft: 'size',
      opening_date: 'when store opened',
    },
  },
  dim_product: {
    fqn: 'hive_metastore.retail_silver.dim_product',
    blurb: 'Product master — 508 SKUs. Use for name/brand/category lookups.',
    domain: 'dim',
    rows: 508,
    cols: {
      product_id: 'id',
      product_name: 'name',
      brand_id: 'brand',
      department: 'department',
      category_l1: 'category',
      current_mrp: 'INR',
      abc_class: 'velocity',
      is_perishable: 'flag',
      lifecycle_stage: 'New / Growth / Mature / Decline',
    },
  },
  dim_supplier: {
    fqn: 'hive_metastore.retail_silver.dim_supplier',
    blurb: 'Supplier master — 30 suppliers.',
    domain: 'dim',
    rows: 30,
    cols: {
      supplier_id: 'id',
      supplier_name: 'name',
      city: 'city',
      payment_terms_days: 'credit days',
      supplier_rating: 'rating',
      is_preferred: 'flag',
    },
  },
};

/**
 * Build a compact catalog excerpt for the system prompt.
 * Only includes tables for the active module to keep token use small.
 */
export function catalogForModule(module: string): string {
  const domains: Record<string, Array<keyof typeof DBX_CATALOG>> = {
    cx360: ['genome_customer_360', 'churn_scores', 'clv_scores', 'cohort_retention'],
    inventory: [
      'inventory_health',
      'safety_stock',
      'replenishment_signal',
      'osa_tracker',
      'supplier_scorecard',
      'cost_passthrough',
      'dim_store',
      'dim_product',
      'dim_supplier',
    ],
    demand: [
      'demand_daily',
      'festival_demand',
      'forecast_output',
      'store_demand_index',
      'dim_product',
      'dim_store',
    ],
    'price-intel': [
      'optimal_price',
      'price_elasticity',
      'competitive_index',
      'price_recommendations',
      'promo_effectiveness',
      'fact_promotions',
      'cost_passthrough',
      'dim_product',
    ],
  };

  const keys = domains[module] ?? Object.keys(DBX_CATALOG);
  const lines: string[] = [];
  for (const k of keys) {
    const t = DBX_CATALOG[k];
    if (!t) continue;
    lines.push(`### ${t.fqn}`);
    lines.push(`${t.blurb} (${t.rows.toLocaleString()} rows)`);
    if (t.alwaysFilter) lines.push(`ALWAYS include: ${t.alwaysFilter}`);
    const colList = Object.entries(t.cols)
      .map(([n, m]) => `${n} (${m})`)
      .join(', ');
    lines.push(`Columns: ${colList}`);
    lines.push('');
  }
  return lines.join('\n');
}
