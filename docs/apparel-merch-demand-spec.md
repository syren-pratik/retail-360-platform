# Apparel Merchandise Demand — Canonical Design Specification

**Version:** v1.0
**Last updated:** 2026-06-30
**Status:** DRAFT — awaiting sign-off
**Owners:** Product (user), Engineering (generator author), AI/Chat (system-prompt author)

**Purpose:** Lock the design of the US-apparel skin of the Merchandise Demand module so the data-generator, chart-reskins, four net-new chart implementations, the SKU drill panel, and the chat-agent prompt become mechanical execution against a frozen contract.

**Hard scope statement.** This spec covers the **Merchandise Demand module dashboards ONLY** — the main shell at `/merchandise/demand`, the 3 deep-dive routes (`/merchandise/demand/deep-dive/{forecast,plan,events}`), the dynamic `[section]` route, the 19 components under `src/app/merchandise/demand/components/`, the 4 panel/modal pieces (SKU drill, SKU detail view, what-if simulator, drivers panel), the standalone `/demand` forecast page, and the associated cache files under `cache/apparel/merch_demand/`.

**Five forecasting AI agents (Forecast Refiner, Exception Triage, Event Impact Modeler, Cold-Start Predictor, Plan Reconciler) — both their form UI and their backend system prompts — are EXPLICITLY DEFERRED to a later sprint** (see §4). The What-If Simulator's existing chat handle stays as-is; no agent route modifications in this sprint.

CX360 (`apparel-cx360-spec.md`), Inventory + Supply (`apparel-inventory-spec.md`), and Price-Intel (`apparel-price-intel-spec.md`) modules are shipped or out of scope here. Cold-Start and Store-Opening have their own future specs. ~19 existing Merch-Demand charts + 4 net-new apparel-native charts are covered.

---

## Table of contents

1. Domain dictionary — apparel demand constants source of truth
2. Per-cache-file JSON specs (4 cache files + `sku_detail/` shards)
3. Four NEW apparel-native chart specs
4. AI Agents — explicitly deferred (scope wall)
5. Settings + tenant integration (palette / dimensions / cache-loader / format)
6. Chat agent skinning for merch-demand module
7. SKU drill panel + what-if simulator (`MerchSKUDrillPanel.tsx`, `MerchWhatIfSimulator.tsx`)
8. Hardcoded label / formatter sweep (file-by-file table)
9. Migration runbook + validation rules
10. Performance considerations
11. Risks + gotchas
12. Phase effort estimates + out-of-scope

---

## 1. Domain dictionary — apparel demand constants source of truth

The grocery generator (`scripts/gen-merch-demand.ts`) sources its dimensional truth from `src/app/lib/market-config.ts → INDIA_V1`. The apparel generator (`scripts/gen-apparel-merch-demand.ts`) sources from `src/app/lib/dimensions-apparel.json` plus an apparel-only market config object inlined at the top of the generator (mirroring INDIA_V1's shape). This section locks the dictionary values.

### 1.1 Departments (top-level)

Exactly five top-level departments, in display order:

| Code     | Display     | Anchor brands (subset)            | Share of forecast units (target) |
| -------- | ----------- | --------------------------------- | -------------------------------- |
| `mens`   | Mens        | Nike, Levi, VF Corp, PVH          | 30%                              |
| `womens` | Womens      | Lululemon, Tapestry, Gap          | 32%                              |
| `kids`   | Kids        | Carter, Hanesbrands, Adidas Kids  | 16%                              |
| `fw`     | Footwear    | Nike, Adidas, New Balance         | 14%                              |
| `acc`    | Accessories | Tapestry, PVH, generic PL         | 8%                               |

**Decision D1:** Five-department model is canonical. We do not break out Intimates / Activewear as separate departments — they ride inside Mens/Womens. (Grocery uses 6 departments; mapping is deliberately different and the lint allowlist accepts this.)

### 1.2 Subcategories (subset that drives demand)

Roll-up under each department. Forecast generation produces SKUs at this leaf.

- **Mens:** Tees (Crew, V-Neck, Henley, Graphic), Bottoms (Denim Straight/Slim/Bootcut, Chinos, Joggers, Shorts), Outerwear (Light Jacket, Puffer, Vest, Rain Shell), Tops (Polo, Button-down, Sweater, Hoodie), Activewear (Performance Tee, Compression, Track Pant), Underwear & Socks (3-pack tee, 6-pack sock), Swim (Trunks, Boardshort)
- **Womens:** Tops (Tank, Tee, Blouse, Sweater, Cardigan), Dresses (Casual, Sundress, Maxi, Wrap), Bottoms (Denim Skinny/Boyfriend/Wide-leg, Legging, Skirt, Short), Outerwear (Trench, Puffer, Wool Coat, Blazer), Activewear (Sports Bra, Legging, Tank), Intimates (Bra 3-pack, Brief 5-pack), Swim (One-Piece, Bikini Top, Bikini Bottom)
- **Kids:** Boys Tops/Bottoms/Outerwear, Girls Tops/Dresses/Bottoms/Outerwear, Baby (0-24m) Bodysuit/Sleeper/Set, School Uniform (Polo, Pant, Skort, Cardigan), Activewear, Swim
- **Footwear:** Mens Sneaker (Running, Lifestyle, Court), Womens Sneaker, Mens Dress, Womens Dress, Kids Sneaker, Sandal/Slide (Mens/Womens/Kids), Boot (Mens Work, Womens Fashion, Kids Snow), Athletic Cleat
- **Accessories:** Handbag (Tote, Crossbody, Clutch), Belt, Wallet, Jewelry (Necklace, Earring, Bracelet), Hat (Cap, Beanie, Sun Hat), Scarf, Sunglasses, Sock, Umbrella, Backpack

**Decision D2:** Subcategory taxonomy is exactly this list — no additional rollups. New subcats need an additive whitelist entry plus a brand-anchor selection.

### 1.3 Brands

National brands carried (12, sourced from `dimensions-apparel.json`):

`Nike`, `Levi`, `Lululemon`, `VF Corp` (rolls up The North Face, Vans, Timberland), `PVH` (rolls up Tommy Hilfiger, Calvin Klein), `Tapestry` (rolls up Coach, Kate Spade), `Under Armour`, `Adidas`, `Hanesbrands`, `Carter`, `New Balance`, `Gap` (rolls up Old Navy, Athleta, Banana Republic — note: Gap divested Athleta in late 2026 in our timeline, but for forecast purposes Q1-Q3 2026 series treats the whole Gap Inc. portfolio as one rollup).

Plus Private Label umbrella: `pl_essentials` (basics), `pl_premium` (upmarket PL).

**Decision D3:** Brand-vs-PL is a first-class dim with PL pen target = 28% blended (Mens 30%, Womens 25%, Kids 38%, FW 18%, Acc 22%).

### 1.4 Sizes (size-curve forecasting)

| Department      | Size set                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------- |
| Mens tops       | XS, S, M, L, XL, XXL, XXXL                                                                    |
| Mens bottoms    | Waist × Inseam pairs: 28×30, 30×30, 30×32, 32×30, 32×32, 32×34, 34×30, 34×32, 34×34, 36×32, 38×32 |
| Womens tops     | XXS, XS, S, M, L, XL, XXL                                                                     |
| Womens bottoms  | 00, 0, 2, 4, 6, 8, 10, 12, 14, 16                                                             |
| Womens dresses  | XXS, XS, S, M, L, XL                                                                          |
| Kids            | 12M, 18M, 24M, 2T, 3T, 4T, 5, 6, 7, 8, 10, 12, 14, 16                                         |
| Footwear (US M) | 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 13                                            |
| Footwear (US W) | 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 11                                                |
| Footwear (Kids) | 10C, 11C, 12C, 13C, 1Y, 2Y, 3Y, 4Y, 5Y, 6Y                                                    |
| Accessories     | OS (one size) for most; Belt 30/32/34/36/38/40; Hat S/M/L                                     |

**Decision D4:** Size-curve forecast runs at SKU × size with bell-curve priors. Center-of-bell defaults per department:

- Mens tops/bottoms center on L / 32×32
- Womens tops/dresses center on M; bottoms center on size 8
- Kids: bell centers on 5-6 (toddler) and 8-10 (kid)
- Footwear: M=9, W=8, Kids=2Y

Bell width (1σ) is 1.3 sizes for tops, 1.8 for bottoms, 0.9 for footwear, 0.4 for kids (narrower runs).

### 1.5 Colors (color-mix drivers)

Per-season palette of 18 active colors at any moment, sourced from `dimensions-apparel.json → colors`:

Black, White, Cream, Navy, Olive, Burgundy, Stone, Charcoal, Indigo, Heather Grey, Brick, Forest, Mustard, Cobalt, Blush, Camel, Plum, Sage.

**Decision D5:** Forecast does not split by color for the headline series — color enters only via the Size×Color price grid (Price-Intel) and via the apparel-additive `color_mix_top3` field per category in the demand SKU. (Avoids size×color×SKU explosion in the forecast cube.)

### 1.6 Stores / Distribution Centers

Mirrors the apparel inventory module: 30 stores across 12 US metros + 4 DCs (Reno NV, Memphis TN, Allentown PA, Atlanta GA). Store types: `flagship` (3), `mall` (12), `outlet` (8), `urban` (5), `popup` (2). Channel mix per store loaded from `dimensions-apparel.json`.

**Decision D6:** Demand series carries `dc_assignment` per SKU (which DC fulfills) so the Plan Deep-Dive can roll demand by DC for the Inventory team.

### 1.7 Velocity classes

ABC classification by 91-day historical units:

- `A` (top 20% of SKUs, ~70% of units): tight forecast band, 14-day re-forecast cadence
- `B` (next 30% of SKUs, ~20% of units): standard band, weekly re-forecast
- `C` (bottom 50% of SKUs, ~10% of units): wide band, bi-weekly re-forecast, no SKU-level alerting

**Decision D7:** A-class is reforecast every Monday and Thursday. B-class Monday only. C-class roll-up to subcat-level only.

### 1.8 Life-stage flags

Every SKU carries `life_stage` ∈ `{intro, growth, peak, decline, markdown, eol}`:

- `intro`: first 4 weeks since launch; cold-start logic applies (see §1.11)
- `growth`: weeks 5-12 with positive WoW units
- `peak`: rolling 4-wk units ≥ 80% of style max
- `decline`: 3 consecutive WoW negatives in non-promo weeks
- `markdown`: first markdown applied; forecast switches to depletion-rate model
- `eol`: <14 days inventory at full price OR clearance bucket

**Decision D8:** Life-stage transitions are auto-detected weekly and locked into the SKU's `life_stage_history[]`. The forecast model differs by life-stage; see §1.10.

### 1.9 Apparel event calendar (US retail year)

Replaces the India grocery event set (Diwali, Holi, etc.). All events have `(start, end, lift_by_dept{}, weight_by_subcat{})`.

| Event             | Window               | Notes                                                                            |
| ----------------- | -------------------- | -------------------------------------------------------------------------------- |
| MLK Weekend       | 3rd Mon of Jan       | Outerwear clearance peak; PL boots lift 1.3×                                     |
| Presidents Day    | 3rd Mon of Feb       | Mattress + denim event; Mens bottoms lift 1.4×                                   |
| Easter            | Mar 22 – Apr 25      | Kids Sunday-best dresses + boys polos lift 1.8×                                  |
| Memorial Day      | Last Mon of May      | Swim hits 2.1×; outdoor accessories 1.5×                                         |
| July 4            | Jul 1–7              | Tees graphic-Americana 2.4×; swim sustained 1.9×                                 |
| BTS (Back-to-School) | Jul 15 – Sep 5    | Kids 2.8×, Mens chinos 1.4×, footwear school 2.2×; biggest non-holiday event     |
| Labor Day         | 1st Mon of Sep       | Transitional outerwear 1.6×; activewear 1.3×                                     |
| Halloween         | Oct 15 – Oct 31      | Kids costumes are out of scope but kids basics +1.2× from costume-prep traffic   |
| BFCM              | Black Fri – Cyber Mon | Everything 2.4× peak Fri; Mens outerwear 3.1×, womens dress 2.2×                |
| Holiday/Christmas | Dec 1 – Dec 24       | Sustained 1.9×; gifting categories (accessories, intimates packs) 2.6×           |
| Boxing Day        | Dec 26 – Dec 31      | Clearance + winter coat 1.7×                                                     |
| NYE               | Dec 30 – Dec 31      | Womens dressy 2.2×; mens going-out 1.6×                                          |

**Decision D9:** BTS is the largest non-holiday event for the apparel skin and gets its own dedicated banner on the forecast deep-dive between Jul 15 and Sep 5. BFCM peak day forecast uncertainty is widened to ±35% band vs ±18% baseline.

### 1.10 Forecast model assignments

Per life-stage:

- `intro` (cold-start): lookalike-borrowed forecast — borrow 70% from the chosen lookalike SKU's first-12-weeks curve + 30% attribute-based prior (brand-subcat-pricepoint). Re-blend weekly. See §1.11.
- `growth`: ARIMAX with event regressors + WoW momentum term
- `peak`: rolling 4-wk holt-winters seasonal
- `decline`: exponential decay model with slope from last 21 days
- `markdown`: depletion-rate model — forecast = inventory_units / observed_weekly_pickup
- `eol`: linear ramp to zero over remaining inventory days

The model card chart (existing `MerchAccuracyDashboard.tsx`) renders WAPE/bias by life-stage; apparel skin shows all six stages whereas grocery had four.

### 1.11 Cold-start (new product) logic

A SKU with <14 days history is in cold-start. The generator builds:

- `cold_start_lookalike_sku_id`: the chosen donor SKU (same brand + subcat + within ±15% price point)
- `cold_start_attribute_prior_units`: attribute-model prior (brand × subcat × pricepoint × season-week)
- `cold_start_blend_weight`: 0.7 → 0.5 → 0.3 → 0.1 across weeks 1-4 (donor weight; remainder = attribute prior; week 5+ switches to actual history)
- `cold_start_confidence`: 'low' first week → 'medium' weeks 2-3 → 'high' week 4+

**Decision D10:** Cold-start logic is a dedicated future module (separate from this sprint's scope). For Phase E we surface the cold-start blend as a chart panel within the SKU drill but do not add a standalone deep-dive.

### 1.12 Weather sensitivity

Categories carry a `weather_sensitivity` enum and `(temp_threshold_F, precip_threshold_in)` triggers:

- `outerwear_cold`: T < 50°F drives +12% per 5° drop (puffers, wool coats)
- `boots_cold`: T < 45°F or precip > 0.5" drives +18%
- `swim_heat`: T > 78°F drives +14% per 3° rise
- `sandals_heat`: T > 75°F drives +9%
- `tees_heat`: T > 85°F drives +6%
- `sweater_cold`: T < 55°F drives +8% per 5° drop
- `rain_gear`: precip > 1.0" drives +24% (umbrellas, rain shells)
- `none`: weather-insensitive

**Decision D11:** Weather overlay is computed per-store (using DC region's weather anomaly) and aggregates to the network forecast as a multiplicative overlay capped at ±25%. Chart §3.2 surfaces it.

### 1.13 Returns rates by category (returns drag on demand)

Net sell-through = gross sell-through × (1 - returns_rate). Apparel returns are heavy and category-specific:

| Category          | Returns rate | Notes                                                  |
| ----------------- | ------------ | ------------------------------------------------------ |
| Womens dresses    | 22%          | Fit + occasion-driven; weddings/events return spike    |
| Mens denim        | 18%          | Wrong waist/inseam combos                              |
| Footwear          | 16%          | Wrong size + comfort returns                           |
| Womens denim      | 16%          | Same as mens                                           |
| Mens outerwear    | 12%          | Fit + duplicate purchases                              |
| Womens tops       | 11%          |                                                        |
| Kids              | 9%           | Grown out before wear in some cases                    |
| Mens tops         | 8%           |                                                        |
| Activewear        | 10%          | Fit + return-after-wear                                |
| Accessories       | 6%           |                                                        |
| Intimates/socks   | 4%           | Hygiene policy limits returns                          |
| Swim              | 14%          | Fit + post-trip returns                                |

**Decision D12:** Forecast emits `gross_units` and `net_units` (= gross × (1 - returns_rate)). Plan-vs-actual KPI bars render the net delta with a tooltip showing the gross/returns split.

### 1.14 Pre-season plan & OTB

Apparel runs a 6-month pre-season cycle. Pre-season plan = forecast-locked + OTB-allocated 26 weeks ahead. In-season replan triggers:

- ±15% WoW deviation 3 weeks in a row
- Weather anomaly > 2σ
- Competitive event (named in `competitor_actions[]`)
- Markdown step trigger

**Decision D13:** Plan-vs-Actual chart renders pre-season plan as a solid line, in-season replan as a dashed line, and actual as bars. Existing `MerchPlanVsActual.tsx` is reskinned (no new component needed); apparel cache adds `replan_history[]`.

---

## 2. Per-cache-file JSON specs

Apparel cache target: `cache/apparel/merch_demand/{core,insights,precomputed}.json` + `sku_detail/*.json`. Each file mirrors the grocery schema exactly with apparel-additive fields whitelisted (see lint allowlist in §9.2). USD numerics populate `*_inr` field names (this is the locked compromise — the field name is a wire-protocol holdover; the renderer formats per tenant).

### 2.1 `core.json` — top-level keys (mirror of grocery)

```ts
interface MerchDemandCore {
  market: 'apparel_us';               // grocery emits 'india_grocery'
  generated_at: string;               // ISO
  data_window: {
    history_start: string;            // 2026-02-15 (anchor - 91d)
    history_end: string;              // 2026-05-17 (anchor)
    forecast_start: string;           // 2026-05-18
    forecast_end: string;             // 2026-07-15 (anchor + 59d)
    anchor_date: string;              // 2026-05-17
  };
  skus: MerchDemandSKU[];             // 200 SKUs
  stores: MerchDemandStore[];         // 30 stores
  events: MerchDemandEvent[];         // ~22 (apparel calendar above)
  event_lifts: MerchDemandEventLift[];// dept × event × lift_pct
  sku_drivers: SKUDriver[];           // top 20 SKUs × 5 drivers each
  category_plans: CategoryPlan[];     // dept-subcat level, 14w plan
  action_items: ActionItem[];         // exception queue
  promos: Promo[];                    // active + recent
  launches: Launch[];                 // intro/peak launches
  anomalies: Anomaly[];               // detected
  structural_shifts: StructuralShift[]; // detected
  kpis: MerchDemandKPIs;
  model_card: ModelCard;
  plan_vs_actual: PlanVsActualPoint[];// 14w
  accuracy_by_horizon: AccuracyPoint[];// 1w/2w/4w/8w/13w
  worst_forecasted_skus: SKUSummary[]; // top 10 worst WAPE
  new_product_skus: SKUSummary[];     // intro stage list
  daily_forecast_points: DailyPoint[]; // network roll-up daily
}
```

Apparel-additive fields on `MerchDemandSKU`:

```ts
brand: 'Nike' | 'Levi' | ... ;                // §1.3
brand_tier: 'national' | 'pl_essentials' | 'pl_premium';
season_tag: 'core' | 'spring' | 'summer' | 'fall' | 'holiday' | 'transitional';
size_curve: { size: string; share_pct: number }[]; // bell normalized to 100
color_mix_top3: { color: string; share_pct: number }[];
weather_sensitivity: 'outerwear_cold'|'boots_cold'|'swim_heat'|'sandals_heat'|'tees_heat'|'sweater_cold'|'rain_gear'|'none';
returns_rate_pct: number;
gross_forecast_units_14d: number;
net_forecast_units_14d: number;             // gross × (1 - returns_rate)
life_stage: 'intro'|'growth'|'peak'|'decline'|'markdown'|'eol';
life_stage_history: { date: string; stage: string }[];
cold_start: null | {
  lookalike_sku_id: string;
  attribute_prior_units: number;
  blend_weight: number;     // donor-side weight 0..1
  confidence: 'low'|'medium'|'high';
};
dc_assignment: 'Reno'|'Memphis'|'Allentown'|'Atlanta';
ragm_pct: number;           // returns-adjusted gross margin (carries from price-intel)
markdown_pressure_pct: number;
```

### 2.2 `core.json → events[]`

Apparel events replace India grocery events one-for-one. Each event:

```ts
{
  event_id: string;
  event_name: string;        // 'Back-to-School', 'BFCM', ...
  start_date: string;        // ISO
  end_date: string;
  category: 'national'|'regional'|'religious'|'sporting';
  market: 'apparel_us';
  baseline_lift_pct: number; // headline overall lift
  confidence: 'high'|'medium'|'low';
}
```

22 events total: MLK, Presidents, Easter, Memorial, July4, BTS, Labor Day, Halloween, BFCM, Cyber Monday, Holiday-Dec, Boxing, NYE, Valentine's Day, St Patrick's, Mother's Day, Father's Day, Columbus Day, Veterans Day, Thanksgiving, Christmas Eve, plus one rolling local event (named per market).

### 2.3 `core.json → event_lifts[]`

Per event × department × subcat:

```ts
{
  event_id: string;
  department: string;
  subcat: string;
  lift_pct: number;     // multiplicative over baseline; 1.0 = no lift, 2.4 = 240%
  applies_to_brand_tier: 'all' | 'national' | 'pl_only';
  confidence: 'high'|'medium'|'low';
}
```

For BTS the row count is dept(5) × subcat(~12 each) = ~60 rows. Total event_lifts ≈ 22 × 60 = 1,320 rows. Already manageable.

### 2.4 `core.json → kpis`

```ts
interface MerchDemandKPIs {
  forecast_accuracy_30d_pct: number;        // 82.4
  forecast_accuracy_trend_pp: number;       // +1.2 vs prior 30d
  wape_overall_pct: number;                 // 14.6
  bias_overall_pct: number;                 // -2.1 (negative = under-forecast)
  demand_at_risk_usd: number;               // sum of forecast revenue at risk from exceptions
  service_level_pct: number;                // 96.2
  in_stock_rate_pct: number;                // 91.4
  forecast_skus_count: number;              // 200
  active_alerts: number;
  // apparel-additive
  net_vs_gross_demand_delta_pct: number;    // 12.4 (avg returns drag across portfolio)
  size_curve_health_pct: number;            // 87 (% of styles with complete size coverage)
  cold_start_skus_count: number;
  weather_adjusted_skus_count: number;
  bts_window_lift_pct: number;              // current window vs LY; 0 outside BTS
  trend_12w: { week: number; wape_pct: number; bias_pct: number; in_stock_pct: number }[];
}
```

### 2.5 `core.json → plan_vs_actual[]`

14-week rolling, anchor +/- 7 weeks:

```ts
{
  week: number;
  week_label: string;          // 'W23'
  iso_week_start: string;
  preseason_plan_units: number;
  inseason_replan_units: number | null;     // null if no replan
  actual_units: number | null;              // null for future weeks
  forecast_units: number;
  variance_vs_plan_pct: number | null;
  // apparel-additive
  gross_units: number;
  net_units: number;                        // gross × (1 - blended_returns_rate)
  weather_adjustment_pct: number;
}
```

### 2.6 `core.json → accuracy_by_horizon[]`

```ts
{ horizon: '1w'|'2w'|'4w'|'8w'|'13w';
  wape_pct: number; mape_pct: number; bias_pct: number;
  // apparel-additive
  by_life_stage: { stage: string; wape_pct: number }[];
  by_brand_tier: { tier: 'national'|'pl_essentials'|'pl_premium'; wape_pct: number }[];
}
```

### 2.7 `core.json → anomalies[]` + `structural_shifts[]`

Anomalies are 7-day windows where actual deviates >2σ from forecast band. Apparel-additive shifts include:

- `bts_pull_forward`: BTS shopping started 8 days earlier than 5yr avg
- `denim_silhouette_shift`: wide-leg gaining share from skinny
- `returns_spike_post_event`: returns rate jumped post-promo
- `pl_share_gain`: PL pen up >3pp in a subcat for 4 consecutive weeks
- `competitor_promo_pull`: traffic dip correlated with a named competitor event

### 2.8 `core.json → sku_drivers[]`

Per top-20 SKU, top-5 drivers explaining the next-14d forecast:

```ts
{
  sku_id: string;
  drivers: {
    name: string;            // 'BTS event', 'weather: heat wave', 'cold-start lookalike SKU-A123', ...
    contribution_pct: number;// positive or negative
    confidence: 'high'|'medium'|'low';
  }[];
}
```

Apparel-additive driver names: `weather_overlay`, `bts_lift`, `bfcm_lift`, `size_curve_skew`, `brand_promo_co_op`, `pl_substitution`, `competitor_event`, `cold_start_lookalike`, `returns_drag`, `markdown_acceleration`.

### 2.9 `core.json → category_plans[]`

14-week category-level plan at dept × subcat:

```ts
{
  department: string;
  subcat: string;
  preseason_units: number;       // 14w total
  preseason_revenue_usd: number;
  inseason_units: number | null;
  actual_units_to_date: number;
  forecast_units_remaining: number;
  variance_pct: number;
  // apparel-additive
  brand_mix: { brand: string; share_pct: number }[];
  size_curve_health: 'green'|'amber'|'red';
  weather_sensitive: boolean;
  net_to_gross_ratio: number;
  pl_pen_target_pct: number;
  pl_pen_actual_pct: number;
}
```

### 2.10 `precomputed.json`

Heatmaps + waterfalls pre-aggregated to avoid client-side compute:

```ts
{
  generated_at: string;
  forecast_accuracy_heatmap: { dept: string; week_offset: number; wape_pct: number }[];
  plan_vs_actual_waterfall: { stage: string; units_delta: number; revenue_delta_usd: number }[];
  event_calendar_strip: { date: string; events: string[]; expected_lift_pct: number }[]; // 90 days
  // apparel-additive
  size_curve_grid: {
    style_id: string;
    style_name: string;
    sizes: string[];
    forecast_units_per_size: number[];
    actual_units_per_size: number[];
    broken_size_flags: boolean[];
  }[];
  weather_overlay_strip: { date: string; temp_anom_f: number; precip_anom_in: number; demand_adj_pct: number }[];
  brand_vs_pl_forecast_mix: {
    department: string;
    weeks: number[];                   // 14
    brand_share_pct: number[];
    pl_share_pct: number[];
  }[];
  returns_adjusted_sell_through: {
    department: string;
    gross_st_pct: number[];            // 14w
    net_st_pct: number[];
    delta_pp: number[];
  }[];
}
```

### 2.11 `insights.json`

Same shape as grocery — array of insight objects with `id, severity, title, description, action, metric, related_chart_id, source`. Severity tokens accept both canonical `{critical, warning, info, positive}` and color aliases `{red, amber, blue, green}` (InsightCard already tolerates both per Sprint D8 fix).

Apparel insight examples (locked text for the seed run):

1. **BTS pull-forward detected** (amber) — Back-to-School traffic started 8 days earlier than 5-year average. Recommend accelerating Kids Bottoms and Footwear in-season replan by 1 week.
2. **Outerwear weather drag** (red) — Mens Outerwear net demand running 14% below gross plan due to heat anomaly +6°F in Northeast DCs. Recommend deferring Allentown DC outerwear receipts by 2 weeks.
3. **Denim silhouette shift** (info) — Wide-leg denim gaining 4.2pp share from skinny in Womens 16-week trailing. Recommend rebalancing Q3 OTB.
4. **Returns spike: Womens Dresses** (red) — Memorial Day promo returns 28% (vs 22% baseline). Reduces net demand by $186K in next 14 days.
5. **PL Premium gaining share in Mens Tops** (positive) — pl_premium up 3.4pp; ragm impact +1.8pp.
6. **Cold-start risk: 12 new Footwear styles in BTS window** (amber) — half lack a usable lookalike donor. Recommend manual donor review.

### 2.12 `sku_detail/*.json`

32 top SKUs (mirror of grocery TOP30 + 2 cold-start exemplars). Each:

```ts
{
  sku_id: string;
  product_name: string;
  daily_series: {
    date: string;
    is_actual: boolean;
    is_forecast: boolean;
    actual_units?: number | null;
    forecast_units: number;
    lower_95: number;
    upper_95: number;
    revenue_inr: number;        // populated with USD
    // apparel-additive
    gross_units: number;
    net_units: number;
    weather_adj_pct: number;
    event_lift_pct: number;
  }[];
  size_curve_actual: { size: string; units: number }[];
  size_curve_forecast: { size: string; units: number }[];
  cold_start_blend?: {
    lookalike_sku_id: string;
    week: number;
    donor_weight: number;
    attribute_weight: number;
    actual_weight: number;
  }[];
}
```

---

## 3. Four NEW apparel-native chart specs

### 3.1 `MerchSizeCurveForecast.tsx`

**Purpose:** show a selected style's forecast units per size as a bell-curve overlay on actual units per size; flag "broken sizes" where actuals are >2× or <0.4× forecast.

**Props:** `{ grid: SizeCurveGridRow }` — pulled from `precomputed.size_curve_grid[]`.

**Render:** Recharts ComposedChart, bars = actual, line = forecast, dots highlighted where `broken_size_flags[i]` true. Y-axis units, X-axis size labels. Tooltip shows actual vs forecast vs delta-pct.

**Title:** "Size-Curve Forecast" / subtitle: `${grid.style_name}` / wrapped in `MerchChartCard`.

**Tenant gate:** rendered inside `{isApparel && precomputed?.size_curve_grid && (...)}` block; falls back to existing forecast chart for grocery.

### 3.2 `MerchWeatherDrivenDemand.tsx`

**Purpose:** overlay a temperature anomaly band on the daily forecast for weather-sensitive subcats; show demand_adj_pct as a secondary line.

**Props:** `{ strip: WeatherOverlayStripPoint[]; selectedSubcat?: string }`.

**Render:** ComposedChart with two Y-axes — left = units forecast, right = temp anomaly °F. Bars or area for temp anom, bold line for forecast, faded reference forecast line (= forecast without weather adjustment). Tooltip shows date, temp anom, demand adjustment.

**Title:** "Weather-Driven Demand" / subtitle: "Forecast with temp-anom overlay (Northeast region)".

### 3.3 `MerchBrandVsPLForecastMix.tsx`

**Purpose:** stacked area showing brand vs PL share over the next 14 weeks per department, with a target line for PL penetration.

**Props:** `{ rows: BrandVsPLForecastMixRow[]; selectedDept?: string }`.

**Render:** stacked area (brand = teal #0D9488, PL = emerald #10B981), dashed horizontal line at `pl_pen_target_pct` (28% blended or per-dept). Tooltip per week shows brand/PL units and pp gap to target.

**Title:** "Brand vs Private Label — Forecast Mix" / subtitle: `${selectedDept} · 14-week outlook`.

### 3.4 `MerchReturnsAdjustedSellThrough.tsx`

**Purpose:** dual-bar grouped chart per department — gross sell-through vs net sell-through (after returns), with a δ chip per dept.

**Props:** `{ rows: ReturnsAdjustedSellThroughRow[] }`.

**Render:** grouped horizontal bars — gross = light gray, net = brand emerald, δ chip in rose if delta > 12pp. Tooltip shows gross %, net %, returns rate %.

**Title:** "Returns-Adjusted Sell-Through" / subtitle: "Gross vs net by department · 14-week".

### 3.5 Common chart contract

All four:

- Start with `'use client';`
- Wrap with existing `MerchChartCard` (provides title bar, height, export)
- Use Tailwind tokens (`var(--text-primary)`, etc.)
- Use `formatMoneyAuto` for money (tenant-aware $/₹)
- Use `APPAREL_MARKDOWN_STEP_COLORS` from `palette-apparel.ts` where step colors apply
- No prop beyond the data shape above

### 3.6 Tab wiring

- `MerchDemandShell.tsx` → after the existing forecast section, render an apparel-only block with `MerchSizeCurveForecast` + `MerchWeatherDrivenDemand` side-by-side, then `MerchBrandVsPLForecastMix` full-width, then `MerchReturnsAdjustedSellThrough` full-width.
- `ForecastDeepDive.tsx` → inject `MerchSizeCurveForecast` as a second tab inside the existing forecast tab set.
- `PlanDeepDive.tsx` → inject `MerchReturnsAdjustedSellThrough` above the existing plan vs actual chart.
- `EventsDeepDive.tsx` → inject `MerchWeatherDrivenDemand` below the event calendar strip.

All four insertions gated by `useTenant().isApparel`.

---

## 4. AI Agents — explicitly deferred (scope wall)

Five forecasting AI agents identified for the future sprint:

1. **Forecast Refiner** — propose ARIMAX coefficient adjustments per category
2. **Exception Triage** — classify the action_items queue into "auto-act / approve / ignore"
3. **Event Impact Modeler** — pre-event lift estimator with confidence intervals
4. **Cold-Start Predictor** — recommend lookalike donor + initial cold-start blend
5. **Plan Reconciler** — diff pre-season plan vs in-season actuals and propose OTB reallocation

**Scope wall (do not touch in this sprint):**

- No new API routes under `src/app/api/merch/demand/agents/*`
- No new form components
- `MerchWhatIfSimulator.tsx` already exists and keeps its current behavior (no agent backing)
- No system-prompt updates beyond the chat-agent skinning in §6

A single explanatory banner appears once on the Merch Demand shell when `isApparel`:

> **5 AI agents (Forecast Refiner, Exception Triage, Event Impact Modeler, Cold-Start Predictor, Plan Reconciler) are coming in a future sprint.** Today's release ships forecast dashboards + size-curve + weather overlay + brand-vs-PL + returns-adjusted views.

The banner mounts in `MerchDemandShell.tsx` above the KPI strip, conditional on `isApparel`.

---

## 5. Settings + tenant integration

### 5.1 Tenant context + cache loader

No changes needed — `TenantContext` + `loadCache(filename)` from prior sprints already work. The merch-demand route uses `fs.readFile(path.join(CACHE_DIR, ...))` directly today; in Phase D we replace that with `loadCache('merch_demand/core.json')` which transparently swaps `cache/` → `cache/apparel/` when the cookie is set.

### 5.2 Palette

Uses existing `palette-apparel.ts`:

- `APPAREL_BRAND_COLORS` for brand bars
- `APPAREL_MARKDOWN_STEP_COLORS` for life-stage badges
- `APPAREL_PROMO_MECHANIC_COLORS` for event bars

Add (Phase E) a `LIFE_STAGE_COLORS` map:

```ts
export const APPAREL_LIFE_STAGE_COLORS = {
  intro:    '#3B82F6', // blue
  growth:   '#10B981', // emerald
  peak:     '#F59E0B', // amber
  decline:  '#F97316', // orange
  markdown: '#EF4444', // red
  eol:      '#94A3B8', // slate
};
```

### 5.3 Format

`formatMoneyAuto`, `formatMoneyPlainAuto`, `getLocaleAuto` from `src/app/lib/format-money.ts` — already tenant-aware. All numeric `*_inr` fields populated with USD numbers in the apparel cache; renderer formats as `$` based on cookie.

### 5.4 Dimensions

Reads from `src/app/lib/dimensions-apparel.json` — already shipped from prior sprints. Brand list, color list, store/DC list, size sets all live there.

---

## 6. Chat agent skinning for merch-demand module

The right-side AI assistant (`src/app/components/chat/*`) gets a module-aware system prompt. The merch-demand module's prompt segment must reflect apparel when tenant is apparel.

**Apparel system prompt fragment (Merch Demand context):**

> You are advising a US apparel merchant team on demand planning. Categories are Mens / Womens / Kids / Footwear / Accessories. Brands include Nike, Levi, Lululemon, VF Corp (North Face, Vans, Timberland), PVH (Tommy, Calvin Klein), Tapestry (Coach, Kate Spade), Under Armour, Adidas, Hanesbrands, Carter, New Balance, Gap. Sizes follow US apparel and footwear conventions (XS-XXXL tops, waist×inseam bottoms, US 5-13 footwear). Major retail events: BTS (Jul-Sep), BFCM, Holiday, MLK/Presidents/Memorial/July4. Returns rates are heavy: Womens dresses 22%, denim 16-18%, footwear 16%. Forecasts emit gross and net units; always report net for planning decisions. Currency is USD; never use ₹. Weather sensitivity matters for outerwear (cold), swim/sandals (heat), rain gear (precip).

**Decision D14:** chat agent prompt branching is wired off `tenant === 'us_apparel'` in `src/app/api/chat/route.ts`. The grocery prompt stays as the default else-branch.

**Decision D15:** Chat agent does NOT cite specific SKUs or stores by ID in its replies — it stays at category/department level. (Same constraint as prior modules; consistent UX.)

---

## 7. SKU drill panel + what-if simulator

### 7.1 `MerchSKUDrillPanel.tsx`

Apparel additions when `isApparel`:

- New "Size Curve" tab — renders the SKU's `size_curve_actual` vs `size_curve_forecast` as bars
- Brand + brand-tier chip in the header
- `life_stage` badge with `APPAREL_LIFE_STAGE_COLORS`
- `cold_start_blend[]` panel when `cold_start != null`
- Returns rate chip in the header
- Weather sensitivity chip in the header (suppress when `none`)
- Net vs gross delta on the main forecast chart

### 7.2 `MerchSKUForecastChart.tsx`

Chart additions when `isApparel`:

- Secondary dashed line = forecast WITHOUT weather adjustment
- Hatched area = returns-drag band (net to gross)
- Event-lift markers along the X-axis use apparel event names (BTS, BFCM, Holiday)

### 7.3 `MerchWhatIfSimulator.tsx`

Apparel sliders added:

- "Weather anomaly (°F)" slider ±10°F — shows demand adjustment per weather-sensitive subcat
- "Returns rate adjustment (pp)" slider ±5pp — shows net-units impact
- "PL penetration shift (pp)" slider ±10pp — shows brand-vs-PL forecast mix shift

Grocery sliders unchanged.

### 7.4 `MerchSKUDriversPanel.tsx`

When `isApparel`, the driver list includes the apparel-additive driver names from §2.8. No other code change; the panel is data-driven.

---

## 8. Hardcoded label / formatter sweep (file-by-file table)

19 components + 3 deep-dives + 1 standalone page + 2 routes. Sweep:

| File                                         | Sweep target                                          | Action                              |
| -------------------------------------------- | ----------------------------------------------------- | ----------------------------------- |
| `MerchKPIStrip.tsx`                          | `₹` literals, `toLocaleString('en-IN')`               | `formatMoneyAuto`, `getLocaleAuto`  |
| `MerchAccuracyDashboard.tsx`                 | category labels (none assumed; verify)                | none                                |
| `MerchActiveFilterChips.tsx`                 | dept/category chip labels                             | none (data-driven)                  |
| `MerchCategoryTimeline.tsx`                  | `₹L`/`₹Cr` suffix logic, axis formatter               | `formatCrOrUsdMAuto`, `formatMoneyAuto` |
| `MerchChartCard.tsx`                         | export filename suffix                                | leave grocery default; data-driven  |
| `MerchEventIntelligence.tsx`                 | event names (Diwali, Holi)                            | data-driven from `core.events`; no hardcode after Phase C |
| `MerchExceptionCenter.tsx`                   | currency formatting                                   | `formatMoneyAuto`                   |
| `MerchExpandModal.tsx`                       | tooltip + table money                                 | `formatMoneyAuto`, `formatMoneyPlainAuto` |
| `MerchForecastExplorer.tsx`                  | Y-axis tickFormatter, tooltip                         | `formatMoneyAuto`                   |
| `MerchInsightsStrip.tsx`                     | insight metric formatting                             | data-driven; metric string set in cache |
| `MerchPlanVsActual.tsx`                      | Y-axis money, dashed-line legend label                | `formatMoneyAuto`; label data-driven |
| `MerchSKUDetailView.tsx`                     | header chips (price), money cells                     | `formatMoneyAuto`                   |
| `MerchSKUDrillPanel.tsx`                     | header chips, drivers                                 | `formatMoneyAuto`; Phase E adds size-curve tab |
| `MerchSKUDriversPanel.tsx`                   | driver labels                                         | data-driven                         |
| `MerchSKUForecastChart.tsx`                  | tooltip, Y-axis, event markers                        | `formatMoneyAuto`; Phase E overlay  |
| `MerchSKUMetaChips.tsx`                      | brand/tier chips                                      | data-driven; apparel-additive fields |
| `MerchTopFilterBar.tsx`                      | dept dropdown labels                                  | data-driven                         |
| `MerchWhatIfSimulator.tsx`                   | result-box money                                      | `formatMoneyAuto`; Phase E new sliders |
| `deep-dive/forecast/ForecastDeepDive.tsx`    | tabbed Y-axes                                         | `formatMoneyAuto`; Phase E size-curve tab |
| `deep-dive/forecast/tabs/*.tsx`              | money in trend tabs                                   | `formatMoneyAuto`                   |
| `deep-dive/plan/PlanDeepDive.tsx`            | waterfall money                                       | `formatMoneyAuto`; Phase E returns chart |
| `deep-dive/plan/tabs/*.tsx`                  | money in tabs                                         | `formatMoneyAuto`                   |
| `deep-dive/events/EventsDeepDive.tsx`        | event names if hardcoded; calendar strip              | data-driven; Phase E weather chart  |
| `deep-dive/events/tabs/*.tsx`                | money + lift labels                                   | `formatMoneyAuto`                   |
| `src/app/demand/page.tsx`                    | direct import of grocery cache                        | replace with `loadCache('supply_forecast.json')` + `loadCache('supply_kpis.json')` |
| `src/app/api/merch/demand/payload/route.ts`  | `fs.readFile(CACHE_DIR, ...)` + in-memory cache       | replace `CACHE_DIR` derivation with `loadCache('merch_demand/core.json')` etc.; flush cached payload across tenants OR key the in-memory cache by tenant |
| `src/app/api/merch/demand/insights/route.ts` | `fs.readFile`                                          | replace with `loadCache('merch_demand/insights.json')` |

**Sweep estimate:** ~28 file edits, mostly mechanical, mirrors prior Price-Intel D-phase volume.

---

## 9. Migration runbook + validation rules

### 9.1 Phase order (locked)

1. Phase A — scaffolding (DONE in prior sprints; nothing to do)
2. Phase B — spec doc (this document)
3. Phase C — generator `scripts/gen-apparel-merch-demand.ts`; runs `npx tsx`, writes `cache/apparel/merch_demand/*`. Extend `scripts/lint-apparel-schema.ts` allowlist with the ~40 apparel-additive field names listed in §2.1 + §2.4 + §2.5 + §2.6 + §2.7 + §2.8 + §2.9 + §2.10
4. Phase D — chart sweep per §8 table
5. Phase E — 4 new chart components per §3
6. Phase F-slim — `scripts/e2e-merch-demand.mjs` (4-test suite mirroring Price-Intel); Sprint D9 commit; `az webapp deploy` to `rct-app`

### 9.2 Lint allowlist additions

Add these field names to `APPAREL_ADDITIVE_WHITELIST` in `scripts/lint-apparel-schema.ts`:

```
market (already), brand, brand_tier, season_tag, size_curve, color_mix_top3,
weather_sensitivity, returns_rate_pct, gross_forecast_units_14d,
net_forecast_units_14d, life_stage, life_stage_history, cold_start,
lookalike_sku_id, attribute_prior_units, blend_weight, dc_assignment,
ragm_pct, markdown_pressure_pct, gross_units, net_units,
weather_adjustment_pct, weather_adj_pct, event_lift_pct,
net_vs_gross_demand_delta_pct, size_curve_health_pct,
cold_start_skus_count, weather_adjusted_skus_count, bts_window_lift_pct,
by_life_stage, by_brand_tier, size_curve_grid, weather_overlay_strip,
brand_vs_pl_forecast_mix, returns_adjusted_sell_through, size_curve_actual,
size_curve_forecast, cold_start_blend, donor_weight, attribute_weight,
actual_weight, brand_share_pct, pl_share_pct, gross_st_pct, net_st_pct,
delta_pp, pl_pen_target_pct, pl_pen_actual_pct, broken_size_flags,
forecast_units_per_size, actual_units_per_size, temp_anom_f,
precip_anom_in, demand_adj_pct, replan_history, competitor_actions,
attribute_prior_units, donor_weight
```

Plus `ROOT_KEY_AGNOSTIC_FILES` add `merch_demand/core.json` for the events array key-set divergence (grocery emits Diwali/Holi; apparel emits BTS/BFCM).

### 9.3 Validation rules (post-generator)

- `core.json` size between 3-7 MB
- `precomputed.json` size between 200KB-1MB
- `sku_detail/` count exactly 32
- All 200 SKUs have `brand`, `brand_tier`, `season_tag`, `weather_sensitivity`, `returns_rate_pct`, `life_stage` set
- `net_units` ≤ `gross_units` for every plan_vs_actual row
- `kpis.forecast_accuracy_30d_pct` between 65-95
- `kpis.wape_overall_pct` between 5-30
- `events[]` length ≥ 20 and contains "Back-to-School" and "BFCM"
- `event_lifts[]` length > 500
- `precomputed.size_curve_grid[]` has ≥ 3 styles
- `precomputed.brand_vs_pl_forecast_mix[]` has all 5 departments
- `precomputed.returns_adjusted_sell_through[]` has all 5 departments
- Lint schema parity vs grocery: 0 missing, 0 diffs

### 9.4 Smoke test (in browser, both tenants)

- `/merchandise/demand` with apparel cookie: zero page errors, 4 new charts visible, $ dominant, ₹ absent
- `/merchandise/demand` with grocery cookie: zero page errors, no apparel block visible, ₹ present
- `/merchandise/demand/deep-dive/forecast` apparel: size-curve tab present
- `/merchandise/demand/deep-dive/plan` apparel: returns-adjusted chart present
- `/merchandise/demand/deep-dive/events` apparel: weather chart present
- `/demand` standalone page apparel: renders without errors (reuses inventory deep-dive)

---

## 10. Performance considerations

- Apparel `core.json` budgeted at 3-7 MB (grocery is 3.8 MB). The additional fields are ~25% overhead.
- `precomputed.json` grows from ~250 KB to ~600 KB (size_curve_grid + weather_overlay_strip + brand_vs_pl_forecast_mix + returns_adjusted_sell_through).
- The merch-demand API route currently caches the payload in-memory across requests. The cache MUST be keyed by tenant (or invalidated on tenant cookie change) — otherwise the first-loaded tenant sticks for the process. Use a `Map<tenant, payload>` keyed lookup or call `loadCache` (which already does cookie-aware reads) on each request.
- Size-curve grid is rendered with ~12 bars max per style — well under Recharts performance threshold.
- Weather overlay chart renders 90 days × 2 series — under 200 data points; safe.
- Brand-vs-PL stacked area renders 14 weeks × 2 series × 5 depts — 140 points; safe.
- SKU drill panel size-curve tab renders ≤ 15 size bars — trivial.

---

## 11. Risks + gotchas

| Risk                                                                | Mitigation                                                                                              |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| In-memory payload cache leaks grocery data into apparel session     | Drop the module-level cache; let `loadCache` handle per-request cookie-aware reads. Documented in §10. |
| Lint allowlist explosion (~40 new field names)                      | Group them in a `// apparel-additive` block in the allowlist with a comment block explaining provenance |
| Size-curve forecast chart confusing for stakeholders                | Subtitle includes style name + size sigma; tooltip shows actual vs forecast delta-pct                   |
| Cold-start blend chart confusing                                    | Defer to Cold-Start module's own deep-dive. Phase E surfaces only the donor-weight column in SKU drill |
| BTS event window overlaps with Holiday in some markets              | Apparel calendar §1.9 has discrete windows; generator clips lift to its window only                     |
| `/demand` standalone page imports grocery JSON statically            | §8 sweep replaces with `loadCache` — must export `dynamic = 'force-dynamic'` (page already does)        |
| Returns rate doubles up if Inventory module already applies it      | Inventory module's returns drag is at the inventory aging level; demand's is at forecast level. They are independent layers; no double-count. |
| Weather overlay implies real weather data integration               | Generator synthesizes deterministic weather anomaly series (seeded mulberry32); spec calls out this is a fixture, not live weather |
| Apparel events array breaks any UI that hardcodes "Diwali"          | Verified in §8 sweep — only `MerchEventIntelligence.tsx` references events, data-driven from `core.events` |
| Chat agent leaks grocery facts when tenant is apparel               | §6 system prompt branching; Decision D14 locks this                                                     |

---

## 12. Phase effort estimates + out-of-scope

### 12.1 Effort (engineer-hours)

| Phase | Subject                              | Estimate |
| ----- | ------------------------------------ | -------- |
| B     | This spec doc                        | 6h       |
| C     | Generator + lint + cache regen       | 14h      |
| D     | 28-file chart sweep + route flip     | 16h      |
| E     | 4 new charts + tab wiring + palette  | 12h      |
| F-slim| E2E test + smoke + commit + deploy   | 4h       |
| —     | **Total in scope (charts-only)**     | **52h**  |

### 12.2 Out of scope (deferred to future sprints)

- 5 AI agents (see §4)
- Live weather API integration (overlay is fixture-only this sprint)
- Cold-Start module dedicated deep-dive (this sprint surfaces blend in SKU drill only)
- Multi-locale demand (US-only for the apparel skin)
- Store-level granular forecasting (network roll-up only)
- Cross-module forecast↔inventory↔price reconciliation loop (each module ships independently)
- AB testing of new chart layouts (default-on for apparel; behind cookie)
- Mobile-responsive layout of 4 new charts (desktop-first; mobile is a follow-up)

### 12.3 Decisions index (D1–D15)

D1: 5 departments canonical. D2: subcategory taxonomy locked. D3: brand-vs-PL first-class with 28% blended PL target. D4: size-curve bell parameters per dept. D5: forecast not split by color (use color_mix_top3 metadata only). D6: dc_assignment carries on every SKU. D7: A-class re-forecast Mon+Thu, B Mon, C bi-weekly subcat-only. D8: 6-stage life_stage auto-detected weekly. D9: BTS dedicated banner Jul 15 – Sep 5; BFCM uncertainty widened. D10: cold-start surfaces in SKU drill only this sprint. D11: weather overlay capped ±25%. D12: forecast emits gross + net; KPIs render net. D13: plan-vs-actual uses pre-season solid + replan dashed + actual bars. D14: chat agent prompt branches on tenant. D15: chat agent stays at category level (no SKU/store IDs in replies).

---

**End of spec.** Implementation begins at Phase C (`scripts/gen-apparel-merch-demand.ts`).
