# Apparel Price Intelligence — Canonical Design Specification

**Version:** v1.0
**Last updated:** 2026-06-29
**Status:** DRAFT — awaiting sign-off
**Owners:** Product (user), Engineering (generator author), AI/Chat (system-prompt author)

**Purpose:** Lock the design of the US-apparel skin of the Price Intelligence module so the data-generator, chart-reskins, four net-new chart implementations, the SKU drawer, and the chat-agent prompt become mechanical execution against a frozen contract.

**Hard scope statement.** This spec covers the **Price Intelligence module dashboards ONLY** — the main shell at `/price-intel` and its 4 tabs (Overview, Promo, Markdown, Forecasting), the 4 deep-dive routes (`/price-intel/deep-dive/{overview,promo,markdown,forecasting}`), the 4 chart-expansion routes under `/price-intel/chart/[chartId]/`, the 22 chart components in `src/app/price-intel/components/`, the SKU drawer (`PriceIntelSKUDrawer.tsx`), the chat agent (right-side widget), and the associated cache files under `cache/apparel/price_intel/`.

**The 5 AI Agents (Promo Scenario, Price Strategy, Markdown Timing, Competitive Response, Weekly Briefing) — both their form UI and their backend system prompts — are EXPLICITLY DEFERRED to a later sprint** (see §4). The 5 form components in `src/app/price-intel/agents/` and the 5 API routes in `src/app/api/price-intel/agents/*/route.ts` are NOT modified in this sprint. The dashboards must function without changes to any agent route.

CX360, Inventory + Supply, Merch Demand, Cold-Start, and Store-Opening modules are out of scope; they have their own specs (`apparel-cx360-spec.md`, `apparel-inventory-spec.md`) or remain grocery for now. ~22 existing Price-Intel charts + 4 net-new apparel-native charts are covered.

---

## Table of contents

1. Domain dictionary — apparel pricing constants source of truth
2. Per-cache-file JSON specs (15 files, including nested `core.json` slices and `sku_detail/` shards)
3. Four NEW apparel-native chart specs
4. AI Agents tab — explicitly deferred (scope wall)
5. Settings + tenant integration (palette / dimensions / cache-loader / format)
6. Chat agent skinning for price-intel module
7. SKU detail drawer (`PriceIntelSKUDrawer.tsx`)
8. Hardcoded label / formatter sweep (file-by-file table)
9. Migration runbook + validation rules
10. Performance considerations
11. Risks + gotchas
12. Effort estimate

---

## 1. Domain dictionary — apparel pricing constants

All constants below live in `scripts/lib/apparel-price-intel-constants.ts` (created by the generator author). Where a concept is already defined in `docs/apparel-cx360-spec.md` (brands, stores, US holidays, customer segments, palette tokens, AOV ranges, departments, sizes, colors, suppliers) or `docs/apparel-inventory-spec.md` (lifecycle stages, season tags, ABCD velocity, supplier types), this spec **references** that source — it does not redefine. Pricing-specific extensions are spelled out below.

### 1.1 Carry-overs from CX360 + Inventory specs (do not redefine)

| Carry-over | Source | Used by |
|---|---|---|
| 25 apparel brands with category market-share splits | `apparel-cx360-spec.md §1.3` | Action Queue product_name, Campaigns table, AI Suggestions copy, SKU drawer brand badge |
| 50-store retail network with metros | `apparel-cx360-spec.md §1.12` | Channel Performance store rollup, deep-dive store breakdown |
| 24 US holiday calendar with uplift multipliers | `apparel-cx360-spec.md §1.11` | Promo ROI Trend `active_campaign_name`, Forecast event annotations, Event Calendar 52-week heatmap |
| 12 standard apparel colours | `apparel-cx360-spec.md §1.5` | Size/Color Price Grid §3.2, Color Performance overlays |
| 8 apparel departments + 32 L2 categories | `apparel-cx360-spec.md §1.1/1.2` | Sell-Through Heatmap rows, Department filter, Margin floors keying |
| Apparel size vectors (TOPS_ADULT / JEANS_M / DRESSES_W / KIDS / SHOES_M/W) | `apparel-cx360-spec.md §1.4` | Size/Color Price Grid §3.2, Markdown Queue size column, SKU drawer |
| Style lifecycle stages (Intro/Core/Markdown-1/-2/-3/Clearance/Discontinued) | `apparel-inventory-spec.md §1.3` | Markdown Cadence Ladder §3.1, SKU drawer, Markdown Queue |
| Season tags (SS25/FW25/SS26/FW26/Resort27) | `apparel-inventory-spec.md §1.4` | Forecast Calendar shading, SKU drawer, Markdown Queue carryover badge |
| ABCD velocity classes | `apparel-inventory-spec.md §1.6` | SKU table velocity_class column |
| Customer-name pool, RFM segments | `apparel-cx360-spec.md §1.13/1.15` | Segment Lift chart segment labels |
| `formatMoneyForTenant`, `formatMoneyAuto`, `useFormatMoney` | `src/app/lib/format-money.ts` (CX360 sprint) | every chart |
| `useTenant()` hook | `src/app/lib/TenantContext.tsx` | shell + components |
| `loadCache(name, tenant)` | `src/app/lib/cache-loader.ts` | server fetcher |
| `APPAREL_DEPT_COLORS`, `APPAREL_LIFECYCLE_COLORS`, `APPAREL_SEASON_COLORS` | `palette-apparel.ts` (CX360 + Inventory sprints) | every chart |

### 1.2 Markdown cadence steps (apparel pricing's defining concept)

This is the most important pricing primitive in apparel and has no grocery analog. Every chart in §2 + §3 keys against this 5-step ladder.

| step_id | discount_off_msrp | days at this step (typical) | trigger to next step | colour token |
|---|---|---|---|---|
| `full_price` | 0 % | 0–84 d (12 weeks; Intro + Core lifecycle) | week 13 elapses OR sell-through ≥ 60 % | `#10B981` (emerald) |
| `md25` | -25 % | 14 d (target) | sell-through ≥ 75 % OR 14 d elapsed | `#84CC16` (lime) |
| `md40` | -40 % | 21 d (target) | sell-through ≥ 82 % OR 21 d elapsed | `#EAB308` (yellow) |
| `md60` | -60 % | 14 d (target) | sell-through ≥ 88 % OR 14 d elapsed | `#F97316` (orange) |
| `md80` | -80 % | 14 d (target) | sell-through ≥ 92 % OR 14 d elapsed | `#EF4444` (red) |
| `clearance` | -80 % → liquidate | open-ended | sold out / liquidated / charity | `#94A3B8` (slate) |

A SKU is **"stuck"** if `days_in_current_step > target_days_at_step × 1.4`. Stuck-step warnings are the killer view on the Markdown Cadence Ladder §3.1.

### 1.3 Promo mechanics (US apparel mix)

Replaces the grocery mechanic enum {`pct_off, bogo, bundle, multipack, cashback`}.

| mechanic_id | display label | typical depth | apparel share of promo $ | typical ROI band |
|---|---|---|---|---|
| `bogo_50` | BOGO 50% (Buy 1, get 1 at 50% off) | 50 % off 2nd | 22 % | 2.4×–3.2× |
| `b2g1_half` | Buy 2 Get 1 Half (50% off 3rd) | 50 % off 3rd | 14 % | 2.1×–2.9× |
| `pct_off` | % Off (storewide / category) | 20–50 % | 28 % | 1.6×–2.4× |
| `dollar_off` | $ Off threshold (Spend $X, save $Y) | $20/$100 typical | 8 % | 2.0×–2.6× |
| `bundle` | Outfit / 3-pack bundle | 15–25 % implicit | 9 % | 2.2×–3.0× |
| `gwp` | Gift With Purchase (free tote, sample, accessory) | implicit ~6 % | 5 % | 1.8×–2.4× |
| `tiered` | Tiered discount (10/20/30% at $50/$100/$200) | 10/20/30 % | 7 % | 1.9×–2.5× |
| `free_ship` | Free Shipping above $X | $X threshold | 4 % | 2.4×–3.4× (high — low cost) |
| `member_excl` | Member Exclusive (loyalty-gated) | 20–30 % | 3 % | 3.0×–3.8× (lowest free-rider) |

Mechanic ROI ranges are **lower than grocery** (grocery cashback hit 3.7×; apparel BOGO-50 caps around 3.2×) — apparel buyers anchor on the discounted price faster, so free-rider is higher and lift is more bounded.

### 1.4 US apparel competitor set (10 named competitors)

Replaces the grocery competitor set (Blinkit / Zepto / Instamart / BigBasket / JioMart / DMart).

| competitor_id | name | tier | colour token (for competitive-index bars) |
|---|---|---|---|
| `AMZN` | Amazon Fashion | Mass / online | `#FF9900` |
| `TGT` | Target | Mass | `#CC0000` |
| `WMT` | Walmart | Mass | `#0071CE` |
| `MACYS` | Macy's | Mid-tier department | `#E21A2C` |
| `NORD` | Nordstrom | Premium department | `#000000` |
| `OLDN` | Old Navy | Value specialty | `#0033A0` |
| `HM` | H&M | Fast fashion | `#E50010` |
| `UNQ` | Uniqlo | Basics / quality | `#FF0000` |
| `ASOS` | ASOS | Online fast fashion | `#000000` |
| `SHEIN` | Shein | Ultra-fast fashion | `#000000` |

Each SKU in the SKU table carries a `competitive_index` (your price ÷ competitor avg × 100; 100 = parity). Default comparator set: AMZN, TGT, MACYS for women's; AMZN, WMT, OLDN for men's basics; NORD, MACYS for premium.

### 1.5 Pricing strategies (5 — keyed by department/lifecycle)

Used by Price Strategy AI agent (deferred — §4) and by SKU drawer "strategy" badge.

| strategy_id | label | applies to | margin posture |
|---|---|---|---|
| `skim` | Skim — launch high, defend | New collection W1–W4 (Intro lifecycle) | margin > floor + 5 pp |
| `penetration` | Penetration — lead price down | New brand entry, basics rollouts | margin = floor |
| `match_plus` | Match-Plus — match competitor + service premium | Core lifecycle, key items | margin = floor + 2 pp |
| `value` | Value — under-cut for traffic | Loss-leader styles, doorbuster | margin = floor − 4 pp (accepted) |
| `premium` | Premium — defend brand equity | Premium tier (Nordstrom-like) | margin = floor + 8 pp |
| `off_price` | Off-Price — clear at any price | Markdown-2/3/Clearance | margin > 0 acceptable |

### 1.6 Margin floors and ceilings by department (apparel-realistic)

These are the floors the Margin Waterfall §2.2 leaks against and the Action Queue `alert_type: 'margin_floor'` triggers under.

| department | gross margin floor | gross margin target | gross margin ceiling | returns-adjusted floor |
|---|---|---|---|---|
| Women's Tops | 54 % | 60 % | 68 % | 44 % |
| Women's Bottoms | 52 % | 58 % | 66 % | 38 % (returns 28 %) |
| Women's Dresses | 56 % | 62 % | 70 % | 44 % |
| Men's Tops | 50 % | 56 % | 64 % | 42 % |
| Men's Bottoms | 48 % | 54 % | 62 % | 38 % |
| Kids' | 52 % | 56 % | 62 % | 46 % |
| Footwear | 45 % | 50 % | 58 % | 36 % (returns 20 %) |
| Accessories | 58 % | 64 % | 72 % | 56 % (returns 6 %) |

### 1.7 AUR (Average Unit Retail) bands by category

Already covered in `apparel-cx360-spec.md §1.7`. Briefly recap: Women's Tops $32, Women's Bottoms $58, Women's Dresses $78, Men's Tops $42, Men's Bottoms $62, Kids' $24, Footwear $84, Accessories $36.

### 1.8 Elasticity coefficients (apparel — more elastic than grocery)

Used by SKU table `elasticity`, by elasticity heatmap, by Price Strategy AI agent.

| segment | elasticity range | apparel example |
|---|---|---|
| Basics (Levi's 501 indigo, Nike crew tee, Hanes 6-pack) | −0.4 to −1.0 (less elastic) | core tees, basic denim |
| Fashion / trend | −1.4 to −2.5 (highly elastic) | seasonal dresses, novelty graphic tees |
| Athleisure premium (Lululemon Align, Nike Tech) | −0.6 to −1.2 (brand-loyal) | brand premium |
| Footwear staples (Air Force 1, Chuck Taylor) | −0.5 to −0.9 (brand-loyal) | franchise sneakers |
| Footwear fashion | −1.6 to −2.4 | seasonal heels, novelty sneakers |
| Accessories (handbags, belts) | −0.8 to −1.6 | mid-elastic |

Grocery range was −0.27 to −1.31; apparel is wider on both ends.

### 1.9 Returns-adjusted gross margin (RAGM) — apparel-only concept

Definition (frozen formula):

```
RAGM_pct = gross_margin_pct × (1 - return_rate_pct/100) - (return_rate_pct/100) × restocking_cost_pct
```

Where `restocking_cost_pct` defaults to 8 % (avg shipping back + inspection + repack + size-curve disruption cost).

Apparel return rates: 18–22 % overall, 24–32 % web, 9–14 % store. Without RAGM, a 60 % gross margin on Women's Bottoms reads as 60; the truth is `60 × (1 - 0.28) - 0.28 × 8 = 41 %`. Every margin chart in §2 + §3 supports a **toggle** between gross margin and RAGM. **Default for VP-commercial persona is RAGM; default for category-manager persona is gross.**

### 1.10 Holiday / event promo calendar (apparel-realistic depths)

Used by `promo_roi_trend.active_campaign_name`, by Forecast Calendar shading, by Event Calendar 52-week heatmap. Anchored against `current_date = 2026-06-29`.

| event | window | typical depth | apparel uplift multiplier | typical mechanic |
|---|---|---|---|---|
| MLK Day | Jan 19 | 20 % | 1.4× | pct_off |
| Valentine's | Feb 10–14 | 25 % | 1.6× (W lingerie, accessories) | bogo_50, gwp |
| Presidents Day | Feb 16 | 25 % | 1.5× | pct_off, tiered |
| Spring Break Drive | Mar 1–15 | 20 % | 1.3× (swim, resort) | bundle |
| Mother's Day | May 10 | 25 % | 2.1× (W dresses, accessories) | gwp, bundle |
| Memorial Day | May 24–27 | 30 % | 1.6× (denim, casual) | bogo_50, b2g1_half |
| Father's Day | Jun 15 | 25 % | 1.4× (M tops, accessories) | bundle, gwp |
| July 4 Doorbuster | Jul 1–5 | 25 % | 1.8× (Americana, swim) | pct_off, tiered |
| BTS (Back-to-School) | Jul 25–Aug 25 | 25 % | 2.4× (Kids', M Bottoms, footwear) | b2g1_half, tiered |
| Labor Day | Sep 4–7 | 30 % | 1.6× (denim, outerwear preview) | bogo_50 |
| Columbus / Indigenous Day | Oct 12 | 20 % | 1.3× (outerwear, footwear) | pct_off |
| Halloween | Oct 25–31 | 30 % | 1.4× (costumes, novelty) | pct_off |
| Veterans Day | Nov 11 | 25 % | 1.4× | tiered |
| **BFCM (Black Friday + Cyber Monday)** | **Nov 27–30** | **40–60 %** | **4.2×** (outerwear, footwear) | doorbuster pct_off, bogo_50 |
| Cyber Monday | Dec 1 | 50 % | 3.8× (online-only) | pct_off, free_ship |
| Green Monday | Dec 14 | 40 % | 2.4× | pct_off |
| Christmas | Dec 22–25 | 50 % | 2.2× | pct_off, gwp |
| Boxing Day | Dec 26 | 60 % | 2.8× (clearance kickoff) | pct_off, md60 cadence |
| New Year's Eve | Dec 31 | 60 % | 1.8× | pct_off, clearance |
| Awareness Months | Feb (BHM) / Mar (Women's) / May (AAPI) / Jun (Pride) / Sep (Hispanic) / Oct (BCA) | 10–15 % | 1.1× | bundle, gwp (donation tie-in) |

### 1.11 Apparel pricing intelligence persona modes

The shell already supports 3 personas (`category_manager`, `pricing_analyst`, `vp_commercial`). Persona defaults under apparel:

| persona | default tab | default margin view | confidence bars visible | additional surfaces |
|---|---|---|---|---|
| category_manager | Overview | gross margin | no | Action Queue, Insights Strip prominent |
| pricing_analyst | Promo | RAGM | yes (Confidence Score progress) | A/B Tests deep-dive, elasticity heatmap |
| vp_commercial | Overview | RAGM | no | Weekly Briefing agent prominent (deferred), Brand vs PL gap chart §3.4 |

### 1.12 Brand vs Private-Label (PL) margin gap (apparel-only structural concept)

Used by §3.4 chart. Branded SKUs (Nike, Levi's, Lululemon, Coach, etc. — `apparel-cx360-spec.md §1.3` brand list) carry 45–55 % gross margin. Private-label SKUs (e.g., the retailer's own house brand — typically priced 30 % below comparable brand) carry 60–72 % gross margin. The gap is the lever VP-commercial views the world through.

### 1.13 Size/color price premium (limited edition tax)

Apparel often prices limited or "exclusive" colors 10–20 % above the same-style core color. Sizes outside the median (e.g., XXL/XS in tops, 38×32 in jeans, women's size 11 footwear) sometimes carry +$2–$4 size surcharge from suppliers; some retailers pass through, some don't. Captured in the Size/Color Price Grid §3.2 as `price_premium_pct_vs_core`.

---

## 2. Per-cache-file JSON specs

All apparel cache files live in `cache/apparel/` (small standalone files mirroring grocery filenames 1:1) and `cache/apparel/price_intel/` (the nested core + sku_detail tree). The cache-loader registry (`src/app/lib/cache-loader.ts`) is the indirection — see §5. Field names match grocery exactly so transform layers don't change shape; only values and *additive* fields differ.

Cross-file invariants:
- `product_id` follows `APR-<DEPT>-<NNNN>` convention from inventory spec (e.g., `APR-WB-0001` for Women's Bottoms #1).
- `sku_id` aliases to `product_id` for the existing components that use `sku_id`.
- `style_id` follows `<BRAND>-<MODEL>-<SEQ>` (e.g., `LEV-511-001`); the style_id is one tier above sku_id (a style has many SKUs — one per color × size).
- `campaign_id` ∈ `CAMP-A001..A040`.
- `department` ∈ 8 apparel L1 from CX360 §1.1.
- `category` ∈ 32 apparel L2 from CX360 §1.2.

### 2.1 `cache/apparel/price_kpis.json`

- **Cardinality:** 1 object, 5 KPI tiles + sparklines block.
- **Shape (preserves grocery shape; units swap `₹` → `$`):**

```ts
{
  revenue_impact: { value: number; prior: number; unit: '$'; label: 'Revenue Impact' };
  avg_margin_current: { value: number; prior: number; unit: '%'; label: 'Current Margin' };
  avg_margin_projected: { value: number; prior: number; unit: '%'; label: 'Projected Margin' };
  promo_roi: { value: number; prior: number; unit: 'x'; label: 'Promo ROI' };
  competitive_index: { value: number; prior: number; unit: ''; label: 'Competitive Index' };
  sparklines: {
    revenue_impact: number[7];
    margin_current: number[7];
    margin_projected: number[7];
    promo_roi: number[7];
    competitive_index: number[7];
  };
  // apparel-additive (whitelist) — surfaced only when tenant=us_apparel
  ragm_current: { value: number; prior: number; unit: '%'; label: 'RAGM (Returns-Adj)' };
  markdown_active_styles: { value: number; prior: number; unit: ''; label: 'Active Markdown Styles' };
}
```

- **Generation rules:**
  - `revenue_impact.value`: gaussian(μ=14_200_000, σ=900_000) USD (~$14.2M weekly impact opportunity).
  - `avg_margin_current.value`: gaussian(μ=54.2, σ=1.4) % — apparel margin is 2× grocery.
  - `avg_margin_projected.value` = current + uniform(2.4, 3.6) pp.
  - `promo_roi.value`: gaussian(μ=2.3, σ=0.2) — apparel ROI lower than grocery.
  - `competitive_index.value`: gaussian(μ=101.4, σ=2.6) — slight premium vs Amazon/Target.
  - `ragm_current.value` = `avg_margin_current × 0.74 - 0.20 × 8 = current × 0.74 - 1.6` (so ~38–40 %).
  - `markdown_active_styles.value`: gaussian(μ=84, σ=12) of 200 active styles.

- **Sample:**

```json
{
  "revenue_impact": { "value": 14200000, "prior": 13400000, "unit": "$", "label": "Revenue Impact" },
  "avg_margin_current": { "value": 54.2, "prior": 53.6, "unit": "%", "label": "Current Margin" },
  "avg_margin_projected": { "value": 57.4, "prior": 54.2, "unit": "%", "label": "Projected Margin" },
  "promo_roi": { "value": 2.3, "prior": 2.0, "unit": "x", "label": "Promo ROI" },
  "competitive_index": { "value": 101.4, "prior": 103.2, "unit": "", "label": "Competitive Index" },
  "ragm_current": { "value": 38.8, "prior": 38.2, "unit": "%", "label": "RAGM (Returns-Adj)" },
  "markdown_active_styles": { "value": 84, "prior": 72, "unit": "", "label": "Active Markdown Styles" },
  "sparklines": {
    "revenue_impact":[11.8,12.4,12.8,13.2,13.4,13.8,14.2],
    "margin_current":[52.4,52.8,53.1,53.4,53.6,54.0,54.2],
    "margin_projected":[55.1,55.6,56.2,56.7,57.0,57.2,57.4],
    "promo_roi":[1.8,1.9,2.0,2.1,2.2,2.2,2.3],
    "competitive_index":[104.2,103.8,103.2,102.6,102.0,101.6,101.4]
  }
}
```

### 2.2 `cache/apparel/price_intel/core.json` — the big nested file

- **Cardinality:** ~210 KB JSON (vs grocery ~280 KB). One root object with 16 nested arrays/objects.
- **Top-level shape:**

```ts
{
  generated_at: string;          // ISO timestamp
  anchor_date: '2026-06-29';     // frozen current date for the apparel skin
  headline: PriceIntelHeadline;
  kpis: PriceIntelKPIs;          // shape preserves grocery — see 2.2.2
  action_queue: ActionQueueItem[10];
  live_activity: LiveActivityItem[8];
  skus: PriceIntelSKU[200];      // capped at 200 styles for size; SKU drawer reads sku_detail shard for detail
  departments: PriceIntelDepartment[8];
  campaigns: PriceIntelCampaign[12];
  promo_roi_trend: PromoROIWeek[14];
  ai_suggestions: AISuggestion[5];
  lift_by_segment: LiftBySegment[6];
  mechanic_roi: MechanicROI[9];          // 9 apparel mechanics (vs grocery 5)
  sell_through_heatmap: HeatmapRow[16];  // 16 apparel L2 categories
  markdown_queue: MarkdownQueueItem[24];
  inventory_aging: InventoryAging;
  channel_performance: ChannelPerformance[4];   // apparel channels: In-Store/Online-Web/Online-App/Marketplace
  margin_waterfall: WaterfallBar[7];     // 7 bars (apparel adds Return Margin Loss leak)
  forecast_14w: ForecastWeek[14];
  model_card: ModelCard;
}
```

#### 2.2.1 `headline`

```ts
{
  sentence: string;       // e.g., "You are leaving $1.82M on the table this week — $0.78M in BFCM-overlap free-rider, $0.42M in premature markdowns, $0.34M in returns-margin leak."
  supporting_line: string;
  week_label: string;     // "Week of Jun 29, 2026"
  season_context: string; // "BTS ramp · 26 days to Back-to-School peak"
}
```

#### 2.2.2 `kpis` (preserves grocery 13-field shape + 3 apparel-additive fields)

```ts
{
  margin_realization_pct: number;       // 84–92 (apparel)
  margin_realization_trend: number;     // pp WoW
  gross_margin_pct: number;             // 52–58
  gross_margin_vs_floor: number;        // pp
  promo_roi_index: number;              // 0–100 (apparel ~62–74)
  promo_roi_trend: number;
  free_rider_ratio_pct: number;         // 32–48 (higher than grocery)
  sell_through_pct: number;             // 56–68 (lower than grocery)
  sell_through_vs_target: number;
  active_alerts: number;                // 18–32 (apparel has more markdown alerts)
  total_margin_leakage_usd: number;     // renamed from _inr
  margin_leakage_breakdown: {
    promo_free_rider_usd: number;
    cost_passthrough_gap_usd: number;
    premature_markdown_usd: number;
    elasticity_underpricing_usd: number;
    returns_margin_loss_usd: number;    // NEW apparel
  };
  weeks_of_supply: number;              // 6–10 (apparel)
  weeks_of_supply_trend: number;
  ragm_pct: number;                     // NEW apparel — returns-adjusted gross margin
  ragm_vs_floor: number;                // NEW
  markdown_pressure_pct: number;        // NEW — % of inventory $ in any markdown step
  trend_12w: { week: number; margin_realization_pct: number; promo_roi: number; sell_through: number; ragm_pct: number /* NEW */ }[12];
}
```

#### 2.2.3 `action_queue` (10 items)

```ts
{
  id: 'AQ-A001'..'AQ-A010';
  priority: 'urgent' | 'review' | 'info';
  alert_type: 'markdown_stuck' | 'competitive_match' | 'free_rider' | 'cost_passthrough' | 'margin_floor' | 'elasticity_opportunity' | 'size_break_oos' | 'returns_margin' | 'promo_ending' | 'presell_window';
  sku_id: string;        // APR-* or CAMP-A*
  style_id?: string;     // NEW apparel (e.g., LEV-511-001)
  size_color_dim?: string; // NEW apparel (e.g., "32×32 Indigo")
  product_name: string;
  department: string;    // apparel L1
  category: string;      // apparel L2
  headline: string;
  recommended_action: string;
  financial_impact_usd: number;    // renamed from _inr
  confidence: 'high' | 'medium' | 'low';
  action_window: string;           // "Act by Thursday" | "Act by EOD" | "Monitor"
  status: 'pending' | 'snoozed';
}
```

- **alert_type apparel distribution:** markdown_stuck 35 %, competitive_match 15 %, returns_margin 12 %, free_rider 10 %, size_break_oos 8 %, margin_floor 8 %, elasticity_opportunity 5 %, presell_window 4 %, cost_passthrough 3 %.
- **Sample (3 rows):**

```json
[
  {"id":"AQ-A001","priority":"urgent","alert_type":"markdown_stuck","sku_id":"APR-WD-0014","style_id":"JCR-LUDLOW-014","size_color_dim":"M Navy","product_name":"J.Crew Ludlow Sheath Dress","department":"Women's Dresses","category":"Sheath Dresses","headline":"Stuck in -40% for 28 days (target 21d) — sell-through 62%, BTS floor space needed.","recommended_action":"Advance to -60% (md60) by Friday; recovers ~$48K on remaining 540 units.","financial_impact_usd":48000,"confidence":"high","action_window":"Act by Friday","status":"pending"},
  {"id":"AQ-A002","priority":"urgent","alert_type":"competitive_match","sku_id":"APR-MB-0007","style_id":"LEV-501-007","size_color_dim":"32×32 Indigo","product_name":"Levi's 501 Original Indigo","department":"Men's Bottoms","category":"Jeans","headline":"Macy's dropped Levi's 501 to $49.50 vs our $69.50 — -29% gap, lost 184 units last 7d.","recommended_action":"Match to $54.99 (premium retained); recovers ~$22K weekly volume.","financial_impact_usd":22000,"confidence":"high","action_window":"Act by EOD","status":"pending"},
  {"id":"AQ-A003","priority":"urgent","alert_type":"returns_margin","sku_id":"APR-WB-0021","style_id":"OLD-NAVY-PIXIE-021","size_color_dim":"All sizes Black","product_name":"Old Navy Pixie Mid-Rise Pant","department":"Women's Bottoms","category":"Trousers","headline":"Returns at 34% on this style — RAGM collapsed to 18% vs 52% gross.","recommended_action":"Pause web promo; add fit-guide module; expected returns drop to 24%.","financial_impact_usd":18400,"confidence":"medium","action_window":"Review by Friday","status":"pending"}
]
```

#### 2.2.4 `live_activity` (8 items)

```ts
{
  id: 'LA-A001'..;
  event_type: 'markdown_triggered' | 'competitive_drop' | 'free_rider_detected' | 'campaign_live' | 'cost_alert' | 'season_alert' | 'elasticity_update' | 'promo_accepted' | 'returns_spike';
  severity: 'red' | 'amber' | 'blue' | 'green';
  headline: string;
  detail: string;
  timestamp_ago: string;   // "12 min ago" | "1h ago" | "3h ago"
}
```

- **Apparel example samples:**
  - "Macy's dropped Levi's 501 indigo to $49.50 (was $69.50)" — competitive_drop, red, 2h ago
  - "Lululemon Align HR 25\" black size 6 hit 88% sell-through" — markdown_triggered, amber, 41 min ago
  - "BTS ramp signal: Kids Tops volume +24% WoW" — season_alert, blue, 3h ago
  - "Returns spike: H&M linen midi M — 38% returns last 14d" — returns_spike, red, 1h ago

#### 2.2.5 `skus` (200 rows; one row per style — color/size detail in sku_detail shards)

```ts
{
  sku_id: string;              // APR-<DEPT>-<NNNN>
  style_id: string;            // NEW apparel
  product_name: string;
  brand: string;               // NEW apparel — from CX360 §1.3
  department: string;
  category: string;
  subcategory: string;
  velocity_class: 'A' | 'B' | 'C' | 'D';      // 4-class ABCD
  msrp_usd: number;            // renamed mrp_inr → msrp_usd
  cost_usd: number;
  current_price_usd: number;
  current_margin_pct: number;
  target_margin_pct: number;
  ragm_pct: number;            // NEW apparel
  elasticity: number;          // −0.4 to −2.5 apparel range
  elasticity_class: 'inelastic' | 'moderate' | 'elastic';
  recommended_price_usd: number;
  price_change_pct: number;
  projected_margin_pct: number;
  revenue_impact_usd: number;
  recommendation_priority: 'High' | 'Medium' | 'Low';
  is_event_sensitive: boolean;        // renamed from is_festival_sensitive
  is_weather_sensitive: boolean;
  launch_date: string;
  promo_frequency_pct: number;
  weeks_of_supply: number;
  weeks_on_floor: number;             // NEW apparel
  lifecycle_stage: 'Intro' | 'Core' | 'Markdown-1' | 'Markdown-2' | 'Markdown-3' | 'Clearance' | 'Discontinued';  // NEW
  markdown_step: 'full_price' | 'md25' | 'md40' | 'md60' | 'md80' | 'clearance';  // NEW
  days_in_step: number;               // NEW
  season_tag: 'SS25' | 'FW25' | 'SS26' | 'FW26' | 'Resort27';  // NEW
  sell_through_pct: number;
  sell_through_target_pct: number;
  inventory_age_bucket: '0-4W' | '5-8W' | '9-12W' | '13W+';
  competitive_index: number;          // NEW — 100 = parity
  competitor_top3: { competitor_id: string; price_usd: number }[3];  // NEW
  return_rate_pct: number;            // NEW
  size_breadth: number;               // NEW — # of size SKUs under this style
  color_breadth: number;              // NEW — # of colorways
}
```

- **Sample:**

```json
{
  "sku_id":"APR-MB-0007","style_id":"LEV-501-007",
  "product_name":"Levi's 501 Original",
  "brand":"Levi's",
  "department":"Men's Bottoms","category":"Jeans","subcategory":"Straight",
  "velocity_class":"A",
  "msrp_usd":69.50,"cost_usd":28.60,"current_price_usd":69.50,
  "current_margin_pct":58.8,"target_margin_pct":56.0,"ragm_pct":48.2,
  "elasticity":-0.62,"elasticity_class":"moderate",
  "recommended_price_usd":54.99,"price_change_pct":-20.9,
  "projected_margin_pct":48.0,"revenue_impact_usd":22000,
  "recommendation_priority":"High",
  "is_event_sensitive":true,"is_weather_sensitive":false,
  "launch_date":"2024-08-12",
  "promo_frequency_pct":18.4,
  "weeks_of_supply":7.2,
  "weeks_on_floor":86,
  "lifecycle_stage":"Core",
  "markdown_step":"full_price","days_in_step":86,
  "season_tag":"SS26",
  "sell_through_pct":62.4,"sell_through_target_pct":60,
  "inventory_age_bucket":"13W+",
  "competitive_index":126,
  "competitor_top3":[
    {"competitor_id":"MACYS","price_usd":49.50},
    {"competitor_id":"AMZN","price_usd":58.00},
    {"competitor_id":"WMT","price_usd":48.00}
  ],
  "return_rate_pct":14.2,
  "size_breadth":11,"color_breadth":3
}
```

#### 2.2.6 `departments` (8 rows)

```ts
{
  name: string;                  // apparel L1
  sku_count: number;             // styles, not size-color SKUs
  margin_floor_pct: number;      // from §1.6
  current_margin_pct: number;
  margin_vs_floor: number;       // pp
  promo_roi_index: number;
  sell_through_pct: number;
  sell_through_target_pct: number;
  categories: string[];          // L2 children
  ragm_pct: number;              // NEW
  ragm_vs_floor: number;         // NEW
}
```

#### 2.2.7 `campaigns` (12 rows)

```ts
{
  campaign_id: 'CAMP-A001'..;
  campaign_name: string;     // "BFCM Outerwear Doorbuster", "Memorial Day Denim BOGO", "Mother's Day Dress GWP"
  mechanic: 'bogo_50' | 'b2g1_half' | 'pct_off' | 'dollar_off' | 'bundle' | 'gwp' | 'tiered' | 'free_ship' | 'member_excl';
  department: string;
  category: string;
  budget_usd: number;            // $200K–$3M range (vs grocery ₹3-18L)
  start_date: string;
  end_date: string;
  status: 'live' | 'paused' | 'scheduled' | 'completed';
  spend_to_date_usd: number;
  incremental_revenue_usd: number;
  gross_promo_revenue_usd: number;
  roi: number;                   // 1.4–3.8
  free_rider_ratio_pct: number;  // 32–62 (apparel higher)
  post_promo_dip_pct: number;
  lift_pct: number;
  cannibalization_usd: number;
  net_incremental_usd: number;
  confidence: number;            // 0..1
  affected_skus: string[];       // APR-* references
  event_anchor: string;          // NEW — "BFCM" | "Memorial Day" | "BTS" | etc.
  markdown_overlap_flag: boolean;// NEW — true if any affected SKU is also in markdown_queue
}
```

- **Sample:**

```json
{
  "campaign_id":"CAMP-A001","campaign_name":"BFCM Outerwear Doorbuster",
  "mechanic":"pct_off","department":"Women's Outerwear","category":"Puffers",
  "budget_usd":2800000,"start_date":"2026-11-25","end_date":"2026-11-30",
  "status":"scheduled","spend_to_date_usd":0,
  "incremental_revenue_usd":9800000,"gross_promo_revenue_usd":12400000,
  "roi":3.5,"free_rider_ratio_pct":38,"post_promo_dip_pct":-18,
  "lift_pct":248,"cannibalization_usd":620000,"net_incremental_usd":9180000,
  "confidence":0.84,
  "affected_skus":["APR-WO-0001","APR-WO-0002","APR-WO-0014"],
  "event_anchor":"BFCM","markdown_overlap_flag":false
}
```

#### 2.2.8 `promo_roi_trend` (14 weeks)

```ts
{
  week: 1..14;
  week_label: 'W1'..'W14';
  roi: number;
  spend_usd: number;
  incremental_revenue_usd: number;
  goal_roi: 2.5;
  active_campaign_name: string;  // anchored to event calendar (§1.10)
}
```

#### 2.2.9 `ai_suggestions` (5 cards)

Preserves grocery shape; field rename `_inr` → `_usd`; sample copy:

- "Cut spend on July 4 cargo shorts — free-rider 58%, recommend pause."
- "Extend Labor Day denim BOGO 1 week — sell-through 38% (target 70%)."
- "Raise depth on Mother's Day Dress GWP from 15% to 22% — VIP elasticity unlocked, +$184K."
- "Pause Premium Tee Trial — ROI 0.78× after 3 weeks, free-rider 71%."
- "Redirect H&M Linen capsule budget into BTS Kids Tops campaign — 2.6× projected."

#### 2.2.10 `lift_by_segment` (6 rows — RFM segments from CX360 §1.13)

```ts
{ segment: 'VIP' | 'Loyalist' | 'Enthusiast' | 'Casual' | 'At-Risk' | 'Lapsed' | 'New'; lift_pct: number; free_rider_ratio_pct: number; bar_width_pct: number }
```

- **Apparel pattern:** Lapsed shows highest lift (28–42 %); VIP shows lowest lift but highest absolute volume (free-rider 64–72 %).

#### 2.2.11 `mechanic_roi` (9 rows from §1.3)

```ts
{ mechanic: 'BOGO 50%' | 'B2G1 Half' | '% Off' | '$ Off' | 'Bundle' | 'GWP' | 'Tiered' | 'Free Ship' | 'Member Exclusive'; roi: number; color: string; share_pct: number }
```

Σ share_pct = 100.

#### 2.2.12 `sell_through_heatmap` (16 apparel L2 categories × 8 weeks)

```ts
{
  category: string;       // apparel L2 (Jeans, Tees, Dresses, Sneakers, etc.)
  department: string;     // L1
  values: number[8];      // weekly sell-through % cumulative; weeks 1..8 active, 9..14 zero (matches grocery 14-slot pad)
  target_pct: number;     // 60–75 (lower than grocery)
}
```

- **Apparel target distribution:** Tees/Basics 70 %, Jeans 65 %, Dresses 62 %, Outerwear 58 %, Footwear 65 %, Accessories 72 %, Kids' 68 %.

#### 2.2.13 `markdown_queue` (24 rows)

```ts
{
  sku_id: string;
  style_id: string;        // NEW
  color: string;           // NEW
  size: string;            // NEW (or "All sizes" if style-level)
  product_name: string;
  brand: string;           // NEW
  category: string;
  department: string;
  current_sell_through_pct: number;
  target_sell_through_pct: number;
  weeks_on_floor: number;          // NEW
  days_remaining: number;
  weeks_of_supply: number;
  current_markdown_step: 'full_price' | 'md25' | 'md40' | 'md60' | 'md80';  // NEW
  recommended_markdown_step: 'md25' | 'md40' | 'md60' | 'md80' | 'clearance'; // NEW — the cadence step
  recommended_depth_pct: -25 | -40 | -60 | -80;  // NEW — snapped to cadence
  recommended_price_usd: number;
  units_at_risk: number;
  revenue_at_risk_usd: number;
  urgency_score: number;       // 0–100
  inventory_age_bucket: '0-4W' | '5-8W' | '9-12W' | '13W+';
  lifecycle_stage: string;      // NEW
  days_in_step: number;         // NEW — drives stuck-step flag
  is_stuck: boolean;            // NEW — true if days_in_step > target × 1.4
  status: 'pending' | 'approved' | 'snoozed';
}
```

- **Sample:**

```json
{
  "sku_id":"APR-WD-0014","style_id":"JCR-LUDLOW-014",
  "color":"Navy","size":"M",
  "product_name":"J.Crew Ludlow Sheath Dress",
  "brand":"J.Crew","category":"Sheath Dresses","department":"Women's Dresses",
  "current_sell_through_pct":62,"target_sell_through_pct":75,
  "weeks_on_floor":18,"days_remaining":12,"weeks_of_supply":4.4,
  "current_markdown_step":"md40","recommended_markdown_step":"md60",
  "recommended_depth_pct":-60,"recommended_price_usd":54.99,
  "units_at_risk":540,"revenue_at_risk_usd":48000,
  "urgency_score":82,"inventory_age_bucket":"13W+",
  "lifecycle_stage":"Markdown-2","days_in_step":28,"is_stuck":true,
  "status":"pending"
}
```

#### 2.2.14 `inventory_aging`

```ts
{
  bucket_0_4w: { units: number; value_usd: number };
  bucket_5_8w: { units: number; value_usd: number; flag?: boolean };
  bucket_9_12w: { units: number; value_usd: number; flag?: boolean };
  bucket_13w_plus: { units: number; value_usd: number; flag?: boolean };
  insight: string;        // "13W+ stock down 32% vs same week last year — markdown cadence working"
  season_carryover_usd?: number;  // NEW apparel — $ of SS25/FW25 still on floor
}
```

#### 2.2.15 `channel_performance` (4 apparel channels)

```ts
{ channel: 'In-Store' | 'Online-Web' | 'Online-App' | 'Marketplace'; revenue_usd: number; revenue_lift_pct: number; bar_width_pct: number; baseline_bar_width_pct: number; conversion_pct: number /* NEW */ }
```

- **Apparel conversion baselines:** In-Store 18 %, Online-Web 2.2 %, Online-App 3.4 %, Marketplace 1.6 %.
- (Removes grocery's Dark Store and Quick-Commerce channels — apparel has no 10-min delivery.)

#### 2.2.16 `margin_waterfall` (7 bars — apparel adds 2 new leak stages)

```ts
{ label: string; value_usd: number; is_total: boolean; color_type: 'base' | 'leak' | 'apparel_leak' | 'result' }[]
```

Bars:
1. Theoretical max — `is_total: true, color_type: 'base'`
2. Free-rider waste — leak
3. Cost passthrough gap — leak
4. **Premature markdown** — apparel_leak (highlighted)
5. Elasticity gap — leak
6. **Return-margin loss** — apparel_leak (NEW — biggest grocery→apparel delta)
7. Realized — `is_total: true, color_type: 'result'`

#### 2.2.17 `forecast_14w` (14 weeks)

```ts
{
  week: 1..14;
  week_label: string;            // "W1 Jul 6" etc.
  forecast_revenue_usd: number;
  forecast_margin_usd: number;
  lower_ci_usd: number;          // 90 % lower confidence interval
  upper_ci_usd: number;
  seasonality_index: number;     // 0.6 to 4.2 (BFCM peaks at 4.2)
  event_label: string | null;    // "BTS Peak" | "Labor Day" | "Columbus Day" | "BFCM" | "Cyber Monday" | "Christmas"
  ragm_forecast_usd: number;     // NEW
}
```

#### 2.2.18 `model_card`

```ts
{
  experiment: '/Shared/apparel_price_optimization';
  target_margin_pct: 0.58;       // apparel-tuned
  max_price_increase_pct: 0.15;
  max_price_decrease_pct: 0.40;  // apparel allows deeper cuts (markdown cadence)
  min_transactions: 100;
  products_analyzed: 200;        // styles
  avg_current_margin: 0.542;
  avg_projected_margin: 0.578;
  total_revenue_impact: 14200000;
  products_with_increase: 38;
  products_with_decrease: 84;    // more decreases than grocery (markdown bias)
  // NEW apparel
  avg_current_ragm: 0.388;
  avg_projected_ragm: 0.412;
  cadence_compliance_pct: 78;    // % of markdown SKUs snapped to 25/40/60/80 steps
}
```

### 2.3 `cache/apparel/price_intel/precomputed.json`

- **Cardinality:** ~150 KB. Per-department-filtered slices of the heatmap and trend arrays.
- **Shape (preserves grocery structure):**

```ts
{
  generated_at: string;
  departments: {
    'all' | 'Women\'s Tops' | ... : {
      sell_through_heatmap: HeatmapRow[];   // filtered to that dept's categories
      promo_roi_trend: PromoROIWeek[];      // recomputed within dept
      mechanic_roi: MechanicROI[];          // dept-specific mix
      lift_by_segment: LiftBySegment[];     // dept-weighted
      forecast_14w: ForecastWeek[];         // dept-share of total
    }
  }
}
```

- **Generation:** for each of `['all', ...8 L1 depts]`, filter and re-aggregate from `core.json` arrays.

### 2.4 `cache/apparel/price_intel/sku_detail/<sku_id>.json` shards

- **Cardinality:** one shard per SKU in `core.skus[]` — 200 shards. Each ~14 KB (120 daily price points × ~110 bytes). Total ~2.8 MB on disk.
- **Shape:**

```ts
{
  sku_id: string;
  style_id: string;            // NEW
  product_name: string;
  brand: string;               // NEW
  price_history: {
    date: string;              // ISO YYYY-MM-DD, 120 days back from anchor_date
    price_usd: number;         // renamed price_inr
    msrp_usd: number;          // renamed mrp_inr
    cost_usd: number;
    margin_pct: number;
    ragm_pct: number;          // NEW
    is_promo: boolean;
    promo_depth_pct: number | null;
    promo_mechanic: string | null;  // NEW — one of §1.3 mechanic_ids when is_promo=true
    event_name: string | null;
    markdown_step: 'full_price' | 'md25' | 'md40' | 'md60' | 'md80' | 'clearance';  // NEW
    competitive_index: number;       // NEW — daily competitive index
  }[];                                // 120 daily rows
  elasticity_curve: { price_usd: number; volume_index: number }[];   // 12-point curve
  competitive_positioning: {
    competitor_id: string;
    price_usd: number;
    last_seen: string;
    delta_vs_us_pct: number;
  }[];                          // top 3 competitors
  recent_promo_history: {
    campaign_id: string;
    campaign_name: string;
    mechanic: string;
    start_date: string;
    end_date: string;
    depth_pct: number;
    units_sold: number;
    incremental_revenue_usd: number;
    roi: number;
    free_rider_pct: number;
  }[];                          // last 4 promos
  size_color_breakdown: {       // NEW apparel
    color: string;
    size: string;
    on_hand_units: number;
    sell_through_pct: number;
    weeks_on_floor: number;
    current_price_usd: number;
    is_size_break_oos: boolean;
  }[];                          // up to 22 size×color rows
}
```

### 2.5 `cache/apparel/price_competitive_index.json`

- **Cardinality:** 8 rows (one per apparel L1 department; grocery had 5 rows).
- **Shape:**

```ts
{
  department: string;
  avg_current_price: string;    // numeric-as-string for grocery parity
  avg_recommended_price: string;
  avg_margin: string;
  product_count: string;
  competitive_index: string;    // "1.0" = parity
  // apparel-additive
  top_competitor: string;       // competitor_id from §1.4
  vs_top_competitor_pct: string;
}
```

### 2.6 `cache/apparel/price_cost_passthrough.json`

- **Cardinality:** 8 rows (per apparel L1).
- **Shape:**

```ts
{ department: string; cost_change_pct: number; price_change_pct: number; passthrough_rate: number; margin_impact: number; ragm_impact: number /* NEW */ }
```

- **Sample:**

```json
[
  {"department":"Women's Bottoms","cost_change_pct":4.2,"price_change_pct":2.8,"passthrough_rate":66.7,"margin_impact":-1.4,"ragm_impact":-2.0},
  {"department":"Men's Tops","cost_change_pct":3.6,"price_change_pct":3.4,"passthrough_rate":94.4,"margin_impact":-0.2,"ragm_impact":-0.4},
  {"department":"Footwear","cost_change_pct":5.8,"price_change_pct":3.2,"passthrough_rate":55.2,"margin_impact":-2.6,"ragm_impact":-3.4}
]
```

### 2.7 `cache/apparel/price_elasticity_heatmap.json`

- **Cardinality:** 32 rows (8 L1 × ~4 L2 each).
- **Shape:**

```ts
{ department: string; category: string; avg_elasticity: string; product_count: string; avg_margin: string; avg_ragm: string /* NEW */ }
```

- **Apparel ranges:** core basics −0.4 to −1.0; fashion −1.4 to −2.5.

### 2.8 `cache/apparel/price_margin_distribution.json`

- **Cardinality:** `current[]` + `projected[]` + apparel-additive `current_ragm[]` + `projected_ragm[]`.
- **Shape:**

```ts
{
  current: { range: string; count: number; avg_revenue_usd: number }[];   // 6 buckets: '<20%','20-30%','30-40%','40-50%','50-60%','60%+'
  projected: { range: string; count: number; avg_revenue_usd: number }[];
  current_ragm: { range: string; count: number; avg_revenue_usd: number }[];   // NEW — 6 buckets: '<10%','10-20%','20-30%','30-40%','40-50%','50%+'
  projected_ragm: { range: string; count: number; avg_revenue_usd: number }[]; // NEW
}
```

(Bucket ranges shift upward from grocery: apparel margins live higher.)

### 2.9 `cache/apparel/price_markdown.json`

- **Cardinality:** `summary` + `by_bucket[4]` + `recovery_trend[12]` + apparel-additive `by_cadence_step[5]`.
- **Shape:**

```ts
{
  summary: {
    total_markdown_styles: number;       // renamed _skus
    cleared_in_7d: number;
    cleared_in_14d: number;
    cleared_in_30d: number;
    still_active_30d_plus: number;
    total_recovery_usd: number;
    total_original_value_usd: number;
    recovery_rate: number;
    cadence_compliance_pct: number;      // NEW — % of MDs on 25/40/60/80 ladder
    stuck_styles: number;                // NEW
  };
  by_bucket: { bucket: string; count: number; avg_discount: number; recovery_rate: number }[];
  recovery_trend: { week: string; cumulative_recovery_usd: number; target_usd: number }[];
  by_cadence_step: {                      // NEW apparel — feeds Markdown Cadence Ladder §3.1
    step: 'md25' | 'md40' | 'md60' | 'md80' | 'clearance';
    style_count: number;
    avg_days_in_step: number;
    target_days_in_step: number;
    stuck_count: number;
    total_value_usd: number;
    expected_recovery_usd: number;
  }[];
}
```

### 2.10 `cache/apparel/price_position_map.json`

- **Cardinality:** 80 rows (top 80 styles by volume).
- **Shape (preserves grocery shape; numbers as strings):**

```ts
{ product_id: string; product_name: string; brand: string /* NEW */; department: string; price: string; margin_pct: string; volume: string; elasticity: string; ragm_pct: string /* NEW */; competitive_index: string /* NEW */ }
```

### 2.11 `cache/apparel/price_product_table.json` and `cache/apparel/price_recommendations.json`

- **Cardinality:** 200 rows each (mirrors `core.skus`).
- **Shape:** preserved grocery shape, currency renames `_inr` → `_usd`, plus apparel-additive `brand`, `lifecycle_stage`, `markdown_step`, `ragm_pct`, `competitive_index`, `return_rate_pct`.

### 2.12 `cache/apparel/price_promo_calendar.json`

- **Cardinality:** 32 rows (8 apparel L1 × 4 weeks).
- **Shape:**

```ts
{ category: string; week: 'W1'|'W2'|'W3'|'W4'; promo_type: string | null; expected_lift: number | null; discount: number | null; active: boolean; mechanic_id: string /* NEW */; event_anchor: string /* NEW — e.g. "BFCM" */ }
```

Promo_type values use apparel mechanic labels from §1.3 (not grocery "BOGO/% Off/Bundle" generics).

### 2.13 `cache/apparel/price_alerts.json`

- **Cardinality:** 5–8 rows.
- **Shape:**

```ts
{ type: 'critical' | 'warning' | 'info'; message: string; related_chart: string; category: string | null; impact_usd: number }
```

- **Sample apparel messages:**
  - "Women's Bottoms RAGM erosion: 14 styles below 30% RAGM due to returns spike"
  - "Competitive gap widening in Men's Footwear — Nike Air Force 1 cheaper at Foot Locker by 9%"
  - "Markdown stuck cohort: 28 styles past target days_in_step >40% — BTS floor space risk"
  - "Cadence opportunity: 18 styles can skip md60 (sell-through already 78%) — direct to clearance"

### 2.14 `cache/apparel/price_ab_tests.json`

- **Cardinality:** 8 rows.
- **Shape:** preserved grocery shape, `_inr` → `_usd` rename, plus apparel-additive `mechanic`, `style_id`, `brand`.

### 2.15 `cache/apparel/price_intel/insights.json`

- **Cardinality:** 6–10 insight strings (used by `PriceIntelInsightsStrip`).
- **Shape:**

```ts
{ insights: { id: string; severity: 'red' | 'amber' | 'green' | 'blue'; text: string; related_chart: string }[] }
```

- **Sample apparel:**
  - "Levi's 511 indigo 32×32 is 56% through Week 6 — promote to Wk8 markdown queue at -25%."
  - "BFCM Outerwear Doorbuster scheduled — overlap with 4 active markdown styles in W Puffers; pre-clear by Nov 15."
  - "Nordstrom dropped Lululemon Align HR 25\" black by 12% yesterday — competitive index now 108 (was 96)."

---

## 3. Four NEW apparel-native chart specs

Apparel charts that don't exist today and are essential to make the demo land. Each gets a dedicated component file, JSON shape, sample rows, recharts implementation hint, and a placement.

### 3.1 Markdown Cadence Ladder (THE apparel pricing chart)

- **Component path (new):** `src/app/price-intel/components/MarkdownCadenceLadder.tsx`
- **Cache:** consumes `cache/apparel/price_markdown.json::by_cadence_step` (already in §2.9) + `cache/apparel/price_intel/core.json::markdown_queue` (already in §2.2.13). No new cache file.
- **Chart type:** horizontal waterfall — 5 stacked bars (md25 → md40 → md60 → md80 → clearance), with a red **stuck-step warning band** overlaid on each. Width = `total_value_usd`. Height of red band = `stuck_count / style_count`.
- **Interaction:**
  - Hover any bar → tooltip shows `style_count`, `avg_days_in_step` vs `target_days_in_step`, `stuck_count`, `expected_recovery_usd`.
  - Click a bar → opens a side panel listing the stuck styles in that step (sourced from `markdown_queue.filter(m => m.current_markdown_step === step && m.is_stuck)`).
- **Recharts:** `BarChart` with `Bar layout="vertical"`, `ReferenceLine` for target days, secondary `Bar` for stuck overlay using `APPAREL_MARKDOWN_STEP_COLORS` from §1.2.
- **Placement:** Markdown Tab (`src/app/price-intel/tabs/MarkdownTab.tsx`), top-right slot, replacing the old day-of-week MarkdownCadenceChart.
- **Why apparel-essential:** Without this view the audience cannot see the single most apparel-defining flow — the 25→40→60→80 lifecycle and the styles that have stalled at a step.

- **Sample data (5 rows — one per cadence step):**

```json
[
  {"step":"md25","style_count":34,"avg_days_in_step":12,"target_days_in_step":14,"stuck_count":4,"total_value_usd":1840000,"expected_recovery_usd":1240000,"step_label":"-25% (Week 13)"},
  {"step":"md40","style_count":28,"avg_days_in_step":24,"target_days_in_step":21,"stuck_count":11,"total_value_usd":2340000,"expected_recovery_usd":1440000,"step_label":"-40% (Week 17)"},
  {"step":"md60","style_count":14,"avg_days_in_step":18,"target_days_in_step":14,"stuck_count":6,"total_value_usd":840000,"expected_recovery_usd":420000,"step_label":"-60% (Week 21)"},
  {"step":"md80","style_count":6,"avg_days_in_step":12,"target_days_in_step":14,"stuck_count":1,"total_value_usd":240000,"expected_recovery_usd":92000,"step_label":"-80% (Week 25)"},
  {"step":"clearance","style_count":12,"avg_days_in_step":42,"target_days_in_step":28,"stuck_count":8,"total_value_usd":380000,"expected_recovery_usd":76000,"step_label":"Clearance (Week 25+)"}
]
```

### 3.2 Size/Color Price Grid

- **Component path (new):** `src/app/price-intel/components/SizeColorPriceGrid.tsx`
- **Cache (new):** `cache/apparel/price_size_color_grid.json` — pre-rendered for top 24 styles (one block per style).
- **Chart type:** Heatmap matrix — rows = sizes (from the style's `size_set_id` per CX360 §1.4), cols = colors (up to 8 per style). Cell value = current_price_usd; cell color intensity = `price_premium_pct_vs_core` (limited-edition tax).
- **Cache shape:**

```ts
{
  styles: {
    style_id: string;
    product_name: string;
    brand: string;
    department: string;
    size_set: string;                 // 'TOPS_ADULT' | 'JEANS_M' | ...
    core_color: string;               // baseline color used as price reference
    core_size: string;
    base_price_usd: number;
    grid: {
      size: string;
      color: string;
      hex: string;
      current_price_usd: number;
      msrp_usd: number;
      price_premium_pct_vs_core: number;     // 0 for core color × core size; >0 for limited
      on_hand_units: number;
      sell_through_pct: number;
      is_limited_edition: boolean;
    }[];
  }[];
}
```

- **Interaction:**
  - Style selector dropdown (default = top revenue style).
  - Click cell → opens SKU drawer (§7).
  - Toggle "show price premium" overlays % above/below core.
- **Recharts:** custom grid (not a stock recharts chart — implemented as a CSS grid with cell tooltip overlay). Color intensity via `APPAREL_PALETTE.priceLadder` scale (light grey at 0% premium → deep purple at +20%).
- **Placement:** Markdown Tab, secondary row (below Cadence Ladder); also accessible from SKU drawer (§7) as a "see all size/colors" link.
- **Why apparel-essential:** Apparel buyers reason about price across the size-color matrix; grocery doesn't have this dimensional fan-out. Reveals limited-color premium pricing and size-curve scarcity tax.

- **Sample data (1 style — Levi's 511 Indigo grid, 6 cells):**

```json
{
  "styles":[{
    "style_id":"LEV-511-018","product_name":"Levi's 511 Slim Fit","brand":"Levi's","department":"Men's Bottoms",
    "size_set":"JEANS_M","core_color":"Indigo","core_size":"32×32","base_price_usd":69.50,
    "grid":[
      {"size":"32×32","color":"Indigo","hex":"#264273","current_price_usd":69.50,"msrp_usd":69.50,"price_premium_pct_vs_core":0,"on_hand_units":124,"sell_through_pct":68,"is_limited_edition":false},
      {"size":"32×32","color":"Black","hex":"#000000","current_price_usd":69.50,"msrp_usd":69.50,"price_premium_pct_vs_core":0,"on_hand_units":86,"sell_through_pct":72,"is_limited_edition":false},
      {"size":"32×32","color":"Selvedge Wash","hex":"#1a2447","current_price_usd":89.50,"msrp_usd":89.50,"price_premium_pct_vs_core":28.8,"on_hand_units":34,"sell_through_pct":86,"is_limited_edition":true},
      {"size":"38×32","color":"Indigo","hex":"#264273","current_price_usd":71.50,"msrp_usd":71.50,"price_premium_pct_vs_core":2.9,"on_hand_units":18,"sell_through_pct":48,"is_limited_edition":false},
      {"size":"28×30","color":"Indigo","hex":"#264273","current_price_usd":69.50,"msrp_usd":69.50,"price_premium_pct_vs_core":0,"on_hand_units":4,"sell_through_pct":92,"is_limited_edition":false},
      {"size":"32×32","color":"Vintage Distressed","hex":"#3a4a73","current_price_usd":78.00,"msrp_usd":78.00,"price_premium_pct_vs_core":12.2,"on_hand_units":42,"sell_through_pct":74,"is_limited_edition":true}
    ]
  }]
}
```

### 3.3 Returns-Margin Overlay (cross-chart toggle, ships as one shared utility)

- **Component path (new):** `src/app/price-intel/components/ReturnsMarginToggle.tsx` (the toggle UI) + a `useReturnsMode()` hook stored in React context (`src/app/price-intel/ReturnsMarginContext.tsx`).
- **Cache:** no new cache — reads `ragm_pct`, `ragm_*_usd` fields already added in §2.2 to every relevant slice.
- **Chart type:** not a chart per se — a **toggle** that switches three existing charts between gross and RAGM views:
  1. **Margin Waterfall §2.2.16** — when RAGM mode on, the "Return-margin loss" bar grows from 0 to its full value; remaining bars unchanged.
  2. **Plan Waterfall** (in `/price-intel/deep-dive/overview/MarginLeakageTab.tsx`) — same swap.
  3. **Cost-of-MAPE chart** (in cold-start; cross-module but exposed via the toggle when both modules visible).
- **Toggle UI:** two-segment control "Gross | RAGM" at the top of the Overview Tab and the Overview Deep-Dive. Default by persona: VP_commercial → RAGM; category_manager → Gross; pricing_analyst → Gross.
- **Persistence:** localStorage key `cx360_apparel_margin_mode` (`'gross' | 'ragm'`); also a URL query param `?margin=ragm` so insights can deep-link.
- **Why apparel-essential:** Apparel returns are 15–30 %; a gross-margin-only view is naive. Buyers need to flip the lens.

### 3.4 Brand vs Private-Label Margin Gap

- **Component path (new):** `src/app/price-intel/components/BrandVsPLMarginGap.tsx`
- **Cache (new):** `cache/apparel/price_brand_vs_pl.json`.
- **Chart type:** Grouped bar — 8 apparel L1 departments on x-axis; two bars per dept: branded margin %, PL margin %. Difference annotated above. Secondary panel below shows competitive index per tier (branded vs Amazon Fashion; PL vs Walmart Free Assembly / Target Universal Thread).
- **Cache shape:**

```ts
{
  departments: {
    department: string;
    branded: {
      sku_count: number;
      avg_msrp_usd: number;
      avg_cost_usd: number;
      avg_margin_pct: number;       // 45–55
      avg_ragm_pct: number;
      competitive_index_vs_amzn: number;
      top_brand: string;            // e.g., "Nike"
    };
    private_label: {
      sku_count: number;
      avg_msrp_usd: number;
      avg_cost_usd: number;
      avg_margin_pct: number;       // 60–72
      avg_ragm_pct: number;
      competitive_index_vs_wmt: number;
      pl_brand: string;             // "House Brand" or named PL line
    };
    margin_gap_pp: number;          // PL − branded
    price_ladder_delta_pct: number; // (branded MSRP − PL MSRP) / branded MSRP × 100, typically 28–42 %
  }[];
}
```

- **Interaction:** click a department bar → drills into a styles list filtered to branded vs PL within that dept (uses SKU drawer §7).
- **Recharts:** `BarChart` with `Bar dataKey="branded.avg_margin_pct"` + `Bar dataKey="private_label.avg_margin_pct"` grouped, `ReferenceLine` at the floor from §1.6.
- **Placement:** Overview Tab — appears in `vp_commercial` persona only (category_manager and pricing_analyst slots are taken by other widgets); also appears in `/price-intel/deep-dive/overview/IntelligenceTab.tsx` for all personas.
- **Why apparel-essential:** Brand-vs-PL margin gap is the central VP-commercial decision lever in apparel; grocery has it too but milder. Numbers here are an order of magnitude more interesting.

- **Sample data (3 rows of 8):**

```json
{
  "departments":[
    {"department":"Women's Tops","branded":{"sku_count":48,"avg_msrp_usd":42,"avg_cost_usd":18.4,"avg_margin_pct":56.2,"avg_ragm_pct":44.8,"competitive_index_vs_amzn":108,"top_brand":"Lululemon"},"private_label":{"sku_count":22,"avg_msrp_usd":28,"avg_cost_usd":8.4,"avg_margin_pct":70.0,"avg_ragm_pct":58.8,"competitive_index_vs_wmt":104,"pl_brand":"House Brand"},"margin_gap_pp":13.8,"price_ladder_delta_pct":33.3},
    {"department":"Men's Bottoms","branded":{"sku_count":34,"avg_msrp_usd":68,"avg_cost_usd":28,"avg_margin_pct":58.8,"avg_ragm_pct":50.6,"competitive_index_vs_amzn":112,"top_brand":"Levi's"},"private_label":{"sku_count":18,"avg_msrp_usd":42,"avg_cost_usd":13.4,"avg_margin_pct":68.1,"avg_ragm_pct":58.6,"competitive_index_vs_wmt":98,"pl_brand":"House Brand"},"margin_gap_pp":9.3,"price_ladder_delta_pct":38.2},
    {"department":"Footwear","branded":{"sku_count":42,"avg_msrp_usd":98,"avg_cost_usd":49,"avg_margin_pct":50.0,"avg_ragm_pct":40.0,"competitive_index_vs_amzn":102,"top_brand":"Nike"},"private_label":{"sku_count":12,"avg_msrp_usd":56,"avg_cost_usd":18,"avg_margin_pct":67.9,"avg_ragm_pct":54.3,"competitive_index_vs_wmt":108,"pl_brand":"Generic"},"margin_gap_pp":17.9,"price_ladder_delta_pct":42.9}
  ]
}
```

---

## 4. AI Agents tab — explicitly deferred

The 5 AI Agents in `src/app/price-intel/agents/` (`PromoScenarioAgent.tsx`, `PriceStrategyAgent.tsx`, `MarkdownTimingAgent.tsx`, `CompetitiveResponseAgent.tsx`, `WeeklyBriefingAgent.tsx`) and their API routes (`src/app/api/price-intel/agents/*/route.ts`) are **NOT touched in this sprint.**

### 4.1 What stays as-is

- The 5 agent UI form components — no apparel reskin beyond what the dimensions/locale layer gives for free.
- The 5 API route handlers — system prompts still say "Indian retail" / "₹" / use grocery competitor set / call Indian Databricks tools.
- The `AgentsTab.tsx` wrapper — renders the 5 agents in a grid; no change.

### 4.2 What this means in apparel mode

- A user on the apparel tenant who opens the Agents tab gets a US-locale form (USD inputs, English copy) wrapping a system prompt that still narrates Indian grocery context.
- Agent outputs will mix forms-in-USD with model-generated copy that may reference ₹, Indian SKU IDs, Diwali, BigBasket, Hindustan Unilever, etc.
- The 5 agents still call live Databricks via the typed tools (`priceIntelLookup`, `inventoryStatus`, `demandLookup`) which return Indian grocery data.
- **This is acceptable per scope. The dashboards must work without changes to any agent route.**

### 4.3 Demo guidance during deferral

- The product demo script should **not open the Agents tab** when the apparel tenant is active.
- If a stakeholder asks, the answer is: "Agents are a follow-on sprint — the dashboards are tenant-aware today, the agents are next."
- Add a banner inside `AgentsTab.tsx` (under apparel tenant only) that reads: *"Agents are not yet apparel-localized. Outputs may reference Indian grocery context until the next sprint."* — 1-line guarded by `tenant.id === 'us_apparel'`. This is the ONLY agent-tab change in scope.

### 4.4 Future sprint estimate (deferred work)

| Agent | Estimated hours |
|---|---|
| Promo Scenario Planner — system prompt rewrite, mechanic enum swap, USD field renames, cache routing | 1.5 |
| Price Strategy Advisor — same + category enum to apparel L1/L2 + season_phase form field | 1.5 |
| Markdown Timing Optimizer — same + cadence_constraint toggle (snap to 25/40/60/80) | 1.5 |
| Competitive Response Analyst — system prompt rewrite, competitor set swap | 1.5 |
| Weekly Briefing — system prompt rewrite, output USD rename, BFCM/BTS anchoring | 1.5 |
| **Total** | **7.5 h** |

### 4.5 Cross-reference

The full per-agent reframing plan is documented in `/tmp/apparel-plan-demand-price.md` §"Price-Intel AI Agents Tab (5 agents)". That document is the authoritative scope for the deferred sprint.

---

## 5. Settings + tenant integration

### 5.1 Carry-over (no work needed)

- `TenantContext` and `useTenant()` hook — already shipped.
- `formatMoneyForTenant`, `formatMoneyAuto`, `formatMoneyPlainAuto`, `useFormatMoney` — already shipped in `src/app/lib/format-money.ts`.
- `cache-loader` server-side tenant-aware reader — already shipped (`loadCache(name, tenant)`).
- `palette-apparel.ts` already exports `APPAREL_DEPT_COLORS`, `APPAREL_LIFECYCLE_COLORS`, `APPAREL_SEASON_COLORS`.
- `dimensions-apparel.json` already enumerates 25 brands, 50 stores, 8 departments, sizes, colors, US holidays, 30 suppliers.
- `lint:apparel-schema` already in package.json — extend per §9.
- Settings page → Demo dataset → "US — Apparel" radio already toggles `cx360_tenant` cookie.

### 5.2 Additions to `palette-apparel.ts`

Add three new color groups (lifecycle and season already exist from Inventory spec; these are pricing-specific):

```ts
export const APPAREL_MARKDOWN_STEP_COLORS = {
  full_price: "#10B981",   // emerald
  md25:       "#84CC16",   // lime
  md40:       "#EAB308",   // yellow
  md60:       "#F97316",   // orange
  md80:       "#EF4444",   // red
  clearance:  "#94A3B8",   // slate
} as const;

export const APPAREL_PROMO_MECHANIC_COLORS = {
  bogo_50:     "#3B82F6",
  b2g1_half:   "#6366F1",
  pct_off:     "#10B981",
  dollar_off:  "#F59E0B",
  bundle:      "#A855F7",
  gwp:         "#EC4899",
  tiered:      "#06B6D4",
  free_ship:   "#84CC16",
  member_excl: "#F43F5E",
} as const;

export const APPAREL_COMPETITOR_COLORS = {
  AMZN: "#FF9900",
  TGT: "#CC0000",
  WMT: "#0071CE",
  MACYS: "#E21A2C",
  NORD: "#000000",
  OLDN: "#0033A0",
  HM: "#E50010",
  UNQ: "#FF0000",
  ASOS: "#1A1A1A",
  SHEIN: "#2A2A2A",
} as const;
```

### 5.3 Additions to `dimensions-apparel.json`

Add `markdown_cadence_steps`, `promo_mechanics`, `competitors`, `pricing_strategies` blocks per §1.2/1.3/1.4/1.5. Schema:

```json
{
  "markdown_cadence_steps": [
    { "id": "md25", "label": "-25% (Week 13)", "depth_pct": -25, "target_days": 14, "color": "#84CC16" },
    { "id": "md40", "label": "-40% (Week 17)", "depth_pct": -40, "target_days": 21, "color": "#EAB308" },
    { "id": "md60", "label": "-60% (Week 21)", "depth_pct": -60, "target_days": 14, "color": "#F97316" },
    { "id": "md80", "label": "-80% (Week 25)", "depth_pct": -80, "target_days": 14, "color": "#EF4444" },
    { "id": "clearance", "label": "Clearance", "depth_pct": -80, "target_days": 28, "color": "#94A3B8" }
  ],
  "promo_mechanics": [ ... 9 entries from §1.3 ... ],
  "competitors": [ ... 10 entries from §1.4 ... ],
  "pricing_strategies": [ ... 6 entries from §1.5 ... ],
  "margin_floors_by_dept": [ ... 8 entries from §1.6 ... ]
}
```

### 5.4 Cache-loader REGISTRY additions

Pair every file in §2 (15 files: `price_kpis`, `price_competitive_index`, `price_cost_passthrough`, `price_elasticity_heatmap`, `price_margin_distribution`, `price_markdown`, `price_position_map`, `price_product_table`, `price_promo_calendar`, `price_recommendations`, `price_alerts`, `price_ab_tests`, `price_intel/core`, `price_intel/precomputed`, `price_intel/insights`) and add NEW caches (`price_size_color_grid`, `price_brand_vs_pl`). The `price_intel/sku_detail/<id>.json` shards are loaded via a different mechanism — `loadSkuDetail(sku_id, tenant)` which constructs the path on demand (no registry entry per shard).

```ts
// in src/app/lib/cache-loader.ts REGISTRY
{
  'price_kpis':                       { grocery: 'cache/price_kpis.json',                       apparel: 'cache/apparel/price_kpis.json' },
  'price_intel/core':                 { grocery: 'cache/price_intel/core.json',                 apparel: 'cache/apparel/price_intel/core.json' },
  'price_intel/precomputed':          { grocery: 'cache/price_intel/precomputed.json',          apparel: 'cache/apparel/price_intel/precomputed.json' },
  'price_intel/insights':             { grocery: 'cache/price_intel/insights.json',             apparel: 'cache/apparel/price_intel/insights.json' },
  // ... all 15 paired entries ...
  'price_size_color_grid':            { grocery: null,                                          apparel: 'cache/apparel/price_size_color_grid.json' },
  'price_brand_vs_pl':                { grocery: null,                                          apparel: 'cache/apparel/price_brand_vs_pl.json' },
}
```

Apparel-only caches (`null` grocery counterpart) — loader guards: `if (tenant === 'india_grocery' && !entry.grocery) throw new Error('cache X not available in grocery tenant')`. Component should not request these unless `tenant.id === 'us_apparel'`.

### 5.5 How charts consume

Every price-intel chart component reads tenant once at mount:

```ts
const { tenant } = useTenant();
const core = useCache('price_intel/core', tenant.id);     // returns typed PriceIntelCore
const fmt = useFormatMoney();
const palette = tenant.palette === 'apparel' ? APPAREL_MARKDOWN_STEP_COLORS : GROCERY_MARKDOWN_COLORS;
```

No `if (tenant.id === 'us_apparel')` branches inside chart logic — all tenant-conditional behavior goes through palette, formatter, and cache-loader.

---

## 6. Chat agent skinning for price-intel module

Add a branch in `src/app/api/chat/route.ts` and `src/app/api/widget-ai/route.ts` mirroring the CX360 and Inventory patterns.

Detection: route handler inspects request body for `module: 'price-intel' | 'inventory' | 'cx360' | ...` (the AIInsightButton already includes module context). Cookie `cx360_tenant` provides tenant.

```ts
const tenant = req.cookies.get("cx360_tenant")?.value ?? "india_grocery";
const module = body.module ?? "cx360";
const systemPrompt =
  tenant === "us_apparel" && module === "price-intel"
    ? APPAREL_PRICE_INTEL_SYSTEM_PROMPT
    : tenant === "us_apparel" && module === "inventory"
    ? APPAREL_INVENTORY_SYSTEM_PROMPT
    : tenant === "us_apparel" && module === "cx360"
    ? APPAREL_CX360_SYSTEM_PROMPT
    : GROCERY_DEFAULT_SYSTEM_PROMPT;
```

Place `APPAREL_PRICE_INTEL_SYSTEM_PROMPT` in `src/app/api/chat/prompts/apparel-price-intel.ts`.

**Important scope note:** this is the **right-side CHAT widget** (the conversational panel that appears across all dashboards). It is IN SCOPE. The 5 AI Agents in the Agents tab (§4) are a different surface and ARE OUT OF SCOPE.

### 6.1 Full system prompt (apparel price-intel)

```
You are PriceOps-Assist, an analytics co-pilot for a US omnichannel apparel
retailer's pricing, promo, and markdown teams. You are cast as a
"head of pricing strategy": numerate, opinionated, action-biased, fluent in
apparel-specific concepts (markdown cadence, returns-adjusted margin, size
curve, AUR, competitive index).

Your scope is the Price Intelligence module — Overview, Promo, Markdown,
and Forecasting tabs, the deep-dives (Overview, Promo, Markdown,
Forecasting), and the SKU drawer. You answer questions about margin
realization, promo ROI, markdown cadence, sell-through, competitive
positioning, returns-adjusted margin, elasticity, scenario forecasting,
and event-anchored campaign performance, all denominated in US dollars.

Conventions you must follow:
- Currency: USD, formatted $X / $X.XM / $XK / $X.XB. Never use ₹, Cr, or Lakh.
- Geography: US cities and metros only (NYC SoHo, LA Melrose, Chicago Mag
  Mile, Boston Newbury, Austin S Lamar). 50-store retail network. Never
  reference Mumbai, Delhi, Bangalore, Chennai.
- Departments: 8 apparel L1 — Women's Tops, Women's Bottoms, Women's
  Dresses, Men's Tops, Men's Bottoms, Kids', Footwear, Accessories.
- Brands: real US apparel brands (Nike, Levi's, Lululemon, Adidas, Under
  Armour, J.Crew, H&M, Uniqlo, Coach, Old Navy, Carter's, etc.). Never
  reference HUL, ITC, Britannia, Patanjali, Amul, Tata Sampann.
- Competitors: Amazon Fashion, Target, Walmart, Macy's, Nordstrom, Old
  Navy, H&M, Uniqlo, ASOS, Shein. Never reference Blinkit, Zepto,
  Instamart, BigBasket, JioMart, DMart.
- Promo mechanics: BOGO 50%, B2G1 Half, % Off, $ Off Threshold, Bundle,
  GWP, Tiered, Free Shipping above $X, Member Exclusive. Never reference
  cashback or multipack as primary mechanics.
- Markdown cadence: full price → -25% (Week 13) → -40% (Week 17) → -60%
  (Week 21) → -80% (Week 25) → Clearance. A SKU is "stuck" if it has
  exceeded the target days at its current step by 40%.
- Lifecycle stages: Intro (W1-3) / Core (W4-12) / Markdown-1/-2/-3 /
  Clearance / Discontinued.
- Season tags: SS25 (aged), FW25 (aging), SS26 (current), FW26 (pipeline),
  Resort27 (pipeline).
- Margin: report BOTH gross margin AND returns-adjusted gross margin (RAGM)
  when discussing pricing decisions. RAGM = gross × (1 - return_rate) -
  return_rate × restocking_cost (default 8%). Apparel returns: 18-22%
  network avg; 24-32% web; 9-14% store; Bottoms 26-32% (highest);
  Accessories 4-8% (lowest).
- Margin floors by department: W Tops 54%, W Bottoms 52%, W Dresses 56%,
  M Tops 50%, M Bottoms 48%, Kids' 52%, Footwear 45%, Accessories 58%.
- Elasticity: apparel −0.4 to −2.5 (wider than grocery). Basics −0.4 to
  −1.0; fashion/trend −1.4 to −2.5; athleisure premium −0.6 to −1.2.
- Competitive index: 100 = parity with comparator set. >100 = we are
  priced above; <100 = below.
- AUR (Average Unit Retail) ranges: W Tops $32, W Bottoms $58, W Dresses
  $78, M Tops $42, M Bottoms $62, Kids' $24, Footwear $84, Accessories $36.
- Event calendar: MLK / Valentine's / Presidents / Mother's Day / Memorial
  Day / Father's Day / July 4 / BTS (Jul 25 - Aug 25) / Labor Day /
  Columbus / Halloween / Veterans / BFCM (Nov 27-30) / Cyber Mon /
  Christmas / Boxing Day / NYE. Never reference Diwali, Onam, Eid,
  Pongal, Holi.
- Persona modes: category_manager (gross margin default, focused on
  action queue and insights), pricing_analyst (RAGM, deep on elasticity
  and A/B), vp_commercial (RAGM, focused on brand-vs-PL margin gap and
  channel mix).
- Brand-vs-PL gap: branded apparel typically 45-55% gross margin; private
  label 60-72% gross margin. The 10-18pp gap is the central VP-commercial
  lever.

When data is needed, call the available tools (cache lookups for apparel
caches under cache/apparel/price_intel/ and cache/apparel/price_*.json).
If a tool returns no data, say so plainly.

Tone: concise, executive-ready, numerate. Lead with the headline number,
then the so-what, then the recommended action. Maximum 4 sentences unless
asked for depth.
```

### 6.2 Few-shot examples (4)

1.
> **Q:** Which styles are stuck at -40% longer than target?
> **A:** 11 styles are stuck at -40% beyond the 21-day target — concentrated in Women's Dresses (5 styles, mostly FW25 Ludlow/sheath carryover) and Men's Outerwear (3 styles). Total at-risk value $2.34M. Recommend advancing the worst 6 directly to -60% this Friday to free BTS floor space before allocations land Jul 25. Expected recovery $1.44M (62% of at-risk).

2.
> **Q:** Should we match Macy's $49.50 on Levi's 501 indigo?
> **A:** Current price $69.50, Macy's $49.50, Amazon $58.00, Walmart $48.00 — competitive index 126 (very above market). Last 7 days we lost 184 units to Macy's per the activity stream. Recommend a tactical match at $54.99 (premium retained vs Walmart, parity-ish to Amazon) for 14 days, expected to recover ~$22K weekly volume. Margin compresses 9pp; RAGM holds at 41% (above floor 38%). High confidence — basics elasticity is well-bounded.

3.
> **Q:** Why is RAGM on Women's Bottoms collapsing?
> **A:** W Bottoms gross margin 58% but RAGM 38% — the gap is driven by 28% return rate (top reason: Fit). Three styles do most of the damage: Old Navy Pixie Mid-Rise (return rate 34%), J.Crew Slim Boyfriend (31%), and the H&M linen wide-leg (29%). Recommend pausing web promo on those three, adding a fit-guide module, and shifting media spend to the Lululemon Align HR cohort (return rate 11%). Expected RAGM lift +4pp over 4 weeks.

4.
> **Q:** What's our BFCM exposure on outerwear?
> **A:** $9.8M projected incremental revenue on BFCM Outerwear Doorbuster (CAMP-A001) at 3.5× ROI, but it overlaps 4 active markdown styles in W Puffers — risk of double-discounting margin away. Recommend pre-clearing those 4 (advance to -60% by Nov 15) before BFCM launches, then resetting to full-price baseline for the doorbuster. Net effect: $9.8M → $11.2M, margin protected. Confidence high; this overlap is in the markdown_overlap_flag.

---

## 7. SKU detail drawer (`PriceIntelSKUDrawer.tsx`)

Drawer (480px sidebar) that opens when clicking a SKU row in Action Queue, Markdown Queue, Campaigns Table, or SKU Table. Reads from `cache/apparel/price_intel/sku_detail/<sku_id>.json` (per-SKU shard) plus the matching row from `core.skus[]`.

### 7.1 Layout (preserved from grocery, fields swapped)

| Section | Fields | Source |
|---|---|---|
| Header | brand badge · product name · style_id · department > category > subcategory | `core.skus[i]` + `shard` |
| Lifecycle banner | season_tag · lifecycle_stage chip · markdown_step chip · days_in_step (with stuck warning) · weeks_on_floor | `core.skus[i]` |
| Price block | current_price · MSRP · cost · current_margin · target_margin · **RAGM** · recommended_price · price_change_pct | `core.skus[i]` |
| Competitive index | 3 competitor logos with prices · delta vs us · last-seen timestamp · index gauge | `shard.competitive_positioning` |
| Price history chart | 120-day line of price + markdown overlay bands · event annotations (Memorial/BTS/etc.) | `shard.price_history` |
| Elasticity curve | 12-point price-volume curve | `shard.elasticity_curve` |
| Size/color breakdown table | up to 22 size×color rows: on_hand, sell_through, weeks_on_floor, current_price, size_break_oos flag | `shard.size_color_breakdown` |
| Recent promo history | last 4 promos with mechanic, depth, ROI, free-rider | `shard.recent_promo_history` |
| Returns block | return_rate_pct · top return reason (link to CX360 returns cache) · RAGM vs gross | `core.skus[i].return_rate_pct` |
| AI action recommendations | 1–3 cards keyed to alert_type | derived |

### 7.2 Sample apparel SKU shard (abbreviated — Levi's 501 indigo 32×32)

```json
{
  "sku_id":"APR-MB-0007","style_id":"LEV-501-007",
  "product_name":"Levi's 501 Original",
  "brand":"Levi's",
  "price_history":[
    {"date":"2026-06-29","price_usd":69.50,"msrp_usd":69.50,"cost_usd":28.60,"margin_pct":58.8,"ragm_pct":48.2,"is_promo":false,"promo_depth_pct":null,"promo_mechanic":null,"event_name":null,"markdown_step":"full_price","competitive_index":126},
    {"date":"2026-05-24","price_usd":54.99,"msrp_usd":69.50,"cost_usd":28.60,"margin_pct":48.0,"ragm_pct":38.4,"is_promo":true,"promo_depth_pct":-21,"promo_mechanic":"bogo_50","event_name":"Memorial Day","markdown_step":"full_price","competitive_index":98}
  ],
  "elasticity_curve":[
    {"price_usd":49.99,"volume_index":148},
    {"price_usd":54.99,"volume_index":124},
    {"price_usd":59.99,"volume_index":108},
    {"price_usd":64.99,"volume_index":98},
    {"price_usd":69.50,"volume_index":92},
    {"price_usd":74.99,"volume_index":82}
  ],
  "competitive_positioning":[
    {"competitor_id":"MACYS","price_usd":49.50,"last_seen":"2026-06-28","delta_vs_us_pct":-28.8},
    {"competitor_id":"AMZN","price_usd":58.00,"last_seen":"2026-06-28","delta_vs_us_pct":-16.5},
    {"competitor_id":"WMT","price_usd":48.00,"last_seen":"2026-06-28","delta_vs_us_pct":-30.9}
  ],
  "recent_promo_history":[
    {"campaign_id":"CAMP-A012","campaign_name":"Memorial Day Denim BOGO","mechanic":"bogo_50","start_date":"2026-05-22","end_date":"2026-05-27","depth_pct":-21,"units_sold":1840,"incremental_revenue_usd":48200,"roi":2.4,"free_rider_pct":34}
  ],
  "size_color_breakdown":[
    {"color":"Indigo","size":"32×32","on_hand_units":124,"sell_through_pct":68,"weeks_on_floor":86,"current_price_usd":69.50,"is_size_break_oos":false},
    {"color":"Indigo","size":"38×32","on_hand_units":4,"sell_through_pct":92,"weeks_on_floor":86,"current_price_usd":69.50,"is_size_break_oos":true},
    {"color":"Black","size":"32×32","on_hand_units":86,"sell_through_pct":72,"weeks_on_floor":86,"current_price_usd":69.50,"is_size_break_oos":false},
    {"color":"Selvedge Wash","size":"32×32","on_hand_units":34,"sell_through_pct":86,"weeks_on_floor":42,"current_price_usd":89.50,"is_size_break_oos":false}
  ]
}
```

---

## 8. Hardcoded label / formatter sweep

Mechanical replacement table for label strings, hardcoded currency, and date formats. Generator author runs `rg -n` and applies per row.

| File | Approx line range | Current | Apparel replacement |
|---|---|---|---|
| `src/app/price-intel/components/PriceIntelKPIStrip.tsx` | full file | `₹`, `_inr` field reads, "Margin Realization" label | tenant-aware `useFormatMoney`; reads `_usd` fields; add 5th/6th tile for RAGM + Active Markdown Styles when tenant=us_apparel |
| `src/app/price-intel/components/PriceIntelInsightsStrip.tsx` | full file | reads `core.insights[]` strings | reads `cache/apparel/price_intel/insights.json` via cache-loader; no hardcoding |
| `src/app/price-intel/components/PriceIntelActionQueue.tsx` | full file | `financial_impact_inr`, "₹X" tooltip formatting | reads `financial_impact_usd`; tooltip via `formatMoneyForTenant`; show optional `style_id` + `size_color_dim` columns when tenant=us_apparel |
| `src/app/price-intel/components/PriceIntelLiveActivity.tsx` | full file | grocery event copy hardcoded in fallbacks | remove fallbacks; render purely from cache |
| `src/app/price-intel/components/PriceIntelMarginWaterfall.tsx` | full file | 5-bar enum {Theoretical max, Free-rider waste, Cost passthrough gap, Premature markdown, Elasticity gap, Realized} | 7-bar enum adding Premature markdown (highlighted apparel_leak color), Return-margin loss (NEW apparel_leak); reads from `core.margin_waterfall[]` directly; integrates ReturnsMarginToggle (§3.3) |
| `src/app/price-intel/components/PriceIntelChannelChart.tsx` | full file | channels {In-Store, Online, Dark Store, Quick-Commerce, Wholesale} | channels {In-Store, Online-Web, Online-App, Marketplace} (4); add `conversion_pct` secondary metric column |
| `src/app/price-intel/components/PromoROITrend.tsx` | full file | `incremental_revenue_inr` formatter; grocery `active_campaign_name` strings | `_usd`; event-anchored campaign names from §1.10 |
| `src/app/price-intel/components/PromoMechanicROI.tsx` | full file | 5 grocery mechanics {Cashback, Bundle, Multipack, % Off MRP, BOGO} hardcoded enum | reads dynamically from `core.mechanic_roi[]`; supports 9 apparel mechanics from §1.3 |
| `src/app/price-intel/components/PromoAISuggestions.tsx` | full file | `financial_impact_inr`; grocery suggestion templates in fallback | `_usd`; no fallbacks (cache-only) |
| `src/app/price-intel/components/PromoCampaignsTable.tsx` | full file | `budget_inr/spend_to_date_inr/...`; grocery campaign names | `_usd`; apparel campaign names; new column `markdown_overlap_flag` rendered as a warning chip |
| `src/app/price-intel/components/PromoSegmentLift.tsx` | full file | grocery segment enums {Elastic switchers, Occasional buyers, New-to-brand, Lapsed, Loyal core} | apparel RFM enum {VIP, Loyalist, Enthusiast, Casual, At-Risk, Lapsed, New} from CX360 §1.13 |
| `src/app/price-intel/components/MarkdownHeatmap.tsx` | full file | 8-week × ~15 grocery categories; `target_pct` defaults 65–88 | 8-week × 16 apparel L2 from §2.2.12; targets 60–75 |
| `src/app/price-intel/components/MarkdownQueue.tsx` | full file | grocery SKU shape (no style_id/color/size); arbitrary `recommended_depth_pct` | apparel shape with style_id/color/size columns; depth snapped to {-25,-40,-60,-80}; new "Stuck" warning badge when `is_stuck === true`; new "Step" column showing current_markdown_step chip |
| `src/app/price-intel/components/MarkdownCadenceChart.tsx` | full file | day-of-week distribution of markdown actions | DEPRECATE in apparel mode; replace with new `MarkdownCadenceLadder.tsx` (§3.1) |
| `src/app/price-intel/components/MarkdownSellThrough.tsx` | full file | grocery `trend_12w` reads | apparel `trend_12w` with `ragm_pct` added line option |
| `src/app/price-intel/components/MarkdownAgingBuckets.tsx` | full file | `value_inr` reads; flag thresholds tuned to grocery | `value_usd` reads; flag thresholds tuned to apparel (flag at 9-12W and 13W+) |
| `src/app/price-intel/components/ForecastChart.tsx` | full file | event_label values are Indian festivals; `_inr` fields | event_label values from §1.10 US holidays; `_usd` fields; ribbon adds RAGM line under toggle |
| `src/app/price-intel/components/ForecastScenarioPlanner.tsx` | full file | mechanic enum grocery; horizon options grocery-anchored | mechanic enum from §1.3; add `markdown_step` scenario parameter (snap to 25/40/60/80); horizons aligned to season-end weeks |
| `src/app/price-intel/components/ForecastCalendar.tsx` | full file | grocery 52-week event labels (Diwali, Onam, Eid, Pongal) | 52-week US apparel calendar from §1.10; holiday-tier badging Tier 1 (BFCM/BTS/Memorial Day) / Tier 2 / Awareness Month |
| `src/app/price-intel/components/PriceIntelHeadlineSentence.tsx` | full file | reads `core.headline.sentence` (grocery copy) | reads apparel headline; no hardcoding |
| `src/app/price-intel/components/PriceIntelSKUDrawer.tsx` | full file | grocery shard shape; `₹` price labels | apparel shard shape per §7; `$` labels via `formatMoneyForTenant`; new size/color breakdown section; new RAGM line; competitive positioning shows 3 named US competitors |
| `src/app/price-intel/components/PriceIntelChartCard.tsx` | full file | no domain hardcoding (wrapper) | no change |
| `src/app/price-intel/PriceIntelShell.tsx` | persona defaults | grocery persona view layouts | apparel persona defaults per §1.11; ReturnsMarginContext provider added at shell level |
| `src/app/price-intel/PriceIntelFilterContext.tsx` | dept filter | grocery dept enum | apparel L1 enum from CX360 §1.1 |
| `src/app/price-intel/tabs/OverviewTab.tsx` | full file | layout uses grocery channel chart, 5-bar waterfall | swap to apparel channel chart, 7-bar waterfall; add `BrandVsPLMarginGap` panel (vp_commercial persona only) |
| `src/app/price-intel/tabs/PromoTab.tsx` | full file | grocery 5-mechanic bars | 9-mechanic bars; markdown_overlap warnings on campaigns table |
| `src/app/price-intel/tabs/MarkdownTab.tsx` | full file | old cadence chart slot | swap to `MarkdownCadenceLadder` (§3.1); add `SizeColorPriceGrid` (§3.2) below |
| `src/app/price-intel/tabs/ForecastingTab.tsx` | full file | event annotations grocery | US event annotations; RAGM forecast line via toggle |
| `src/app/price-intel/tabs/AgentsTab.tsx` | full file | unchanged backend agents | add deferred-notice banner under apparel tenant (§4.3) — 1-line guard |
| `src/app/price-intel/deep-dive/overview/*` | full | grocery copy, channel breakdown, waterfall | apparel sweep; integrate ReturnsMarginToggle |
| `src/app/price-intel/deep-dive/promo/*` | full | grocery mechanic matrix, free-rider donut | apparel 9-mechanic matrix; donut sources from apparel campaigns; add return_rate_pct column to mechanics matrix |
| `src/app/price-intel/deep-dive/markdown/*` | full | grocery 4-bucket aging, queue table | apparel aging buckets aligned to lifecycle stages; queue with size/color/style; aging scatter x-axis weeks_on_floor (cap 26); color by L1 from APPAREL_DEPT_COLORS |
| `src/app/price-intel/deep-dive/forecasting/*` | full | grocery 52-week calendar, sensitivity params | US 52-week calendar; sensitivity params include markdown_cadence_step, returns_rate, BFCM_intensity |
| `src/app/price-intel/chart/[chartId]/*` | full | grocery chart re-renders | tenant-aware re-renders; default Map of chartId → chart component preserved |
| `src/app/api/chat/route.ts` | system prompt switch | grocery-only system prompt | branch on `module === 'price-intel' && tenant === 'us_apparel'` → `APPAREL_PRICE_INTEL_SYSTEM_PROMPT` (§6) |
| `src/app/api/widget-ai/route.ts` | system prompt switch | grocery | same branch as above; chart-specific apparel system prompt for AIInsightButton calls from price-intel module |
| `src/app/api/price-intel/agents/*/route.ts` | system prompts | grocery (DEFERRED per §4) | NO CHANGE this sprint |
| `src/app/lib/format-money.ts` | already done in CX360 sprint | verified | verify call sites in price-intel components migrated off `formatRupees`/`formatLakh` to tenant-aware variant |

**Date format:** grocery uses `DD/MM/YYYY` in forecast labels and campaign date columns. Under apparel tenant, switch to `MM/DD/YYYY` in `ForecastChart.tsx`, `ForecastCalendar.tsx`, `PromoCampaignsTable.tsx`, and `PriceIntelSKUDrawer.tsx` price history axis.

---

## 9. Migration runbook + validation rules

### 9.1 Commands

```bash
# 1. Add generator + apparel price-intel constants
#    (developer creates scripts/gen-apparel-price-intel.ts and
#     scripts/lib/apparel-price-intel-constants.ts)

# 2. Generate apparel price-intel data
npm run gen:apparel-price-intel
# Expected: writes 15 standalone files to cache/apparel/ +
# 1 core.json + 1 precomputed.json + 1 insights.json +
# 200 sku_detail/<id>.json shards to cache/apparel/price_intel/,
# ~6 MB total, ~10-14s wall time

# 3. Verify schema parity vs grocery (extends CX360 + Inventory lint)
npm run lint:apparel-schema
# Compares every cache/apparel/{price_*}.json + price_intel/{core,
# precomputed, insights}.json against cache/{price_*}.json +
# price_intel/{core, precomputed, insights}.json.
# Apparel-additive fields whitelisted (see §9.3).

# 4. Verify sanity ranges + cross-file invariants
npm run lint:apparel-price-intel-sanity

# 5. Run the app
npm run dev

# 6. Toggle tenant
#    → http://localhost:3000/settings → Demo dataset → "US — Apparel"
#    → page reloads
#    → /price-intel should show $, apparel brands, US competitors,
#      9 promo mechanics, markdown cadence ladder, 7-bar waterfall

# 7. End-to-end smoke test
npm run test:e2e:price-intel-apparel
```

### 9.2 Schema linter extension

Extend `scripts/lint-apparel-schema.ts` (per CX360 §10.1 / Inventory §9.2) FILES[] array with all 15 grocery-mirror price files from §2 (12 standalone + `price_intel/core` + `price_intel/precomputed` + `price_intel/insights`). Apparel-only NEW caches (`price_size_color_grid.json`, `price_brand_vs_pl.json`) are linted by `scripts/lint-apparel-new-caches.ts` against TS interfaces inlined in §3.

The 200 `sku_detail/<id>.json` shards are sampled — lint the first 10 shards against the grocery shard at `cache/price_intel/sku_detail/PRD-000001.json` plus apparel-additive whitelist.

### 9.3 Whitelist of apparel-additive fields

Linter accepts (does not flag mismatch):

```
price_kpis.json:ragm_current
price_kpis.json:markdown_active_styles
price_kpis.json:sparklines.ragm_current
price_intel/core.json:kpis.ragm_pct
price_intel/core.json:kpis.ragm_vs_floor
price_intel/core.json:kpis.markdown_pressure_pct
price_intel/core.json:kpis.margin_leakage_breakdown.returns_margin_loss_usd
price_intel/core.json:kpis.trend_12w[].ragm_pct
price_intel/core.json:action_queue[].style_id
price_intel/core.json:action_queue[].size_color_dim
price_intel/core.json:skus[].style_id
price_intel/core.json:skus[].brand
price_intel/core.json:skus[].ragm_pct
price_intel/core.json:skus[].weeks_on_floor
price_intel/core.json:skus[].lifecycle_stage
price_intel/core.json:skus[].markdown_step
price_intel/core.json:skus[].days_in_step
price_intel/core.json:skus[].season_tag
price_intel/core.json:skus[].competitive_index
price_intel/core.json:skus[].competitor_top3
price_intel/core.json:skus[].return_rate_pct
price_intel/core.json:skus[].size_breadth
price_intel/core.json:skus[].color_breadth
price_intel/core.json:departments[].ragm_pct
price_intel/core.json:departments[].ragm_vs_floor
price_intel/core.json:campaigns[].event_anchor
price_intel/core.json:campaigns[].markdown_overlap_flag
price_intel/core.json:markdown_queue[].style_id
price_intel/core.json:markdown_queue[].brand
price_intel/core.json:markdown_queue[].color
price_intel/core.json:markdown_queue[].size
price_intel/core.json:markdown_queue[].weeks_on_floor
price_intel/core.json:markdown_queue[].current_markdown_step
price_intel/core.json:markdown_queue[].recommended_markdown_step
price_intel/core.json:markdown_queue[].lifecycle_stage
price_intel/core.json:markdown_queue[].days_in_step
price_intel/core.json:markdown_queue[].is_stuck
price_intel/core.json:inventory_aging.season_carryover_usd
price_intel/core.json:channel_performance[].conversion_pct
price_intel/core.json:margin_waterfall[].color_type=apparel_leak
price_intel/core.json:forecast_14w[].ragm_forecast_usd
price_intel/core.json:model_card.avg_current_ragm
price_intel/core.json:model_card.avg_projected_ragm
price_intel/core.json:model_card.cadence_compliance_pct
price_markdown.json:summary.cadence_compliance_pct
price_markdown.json:summary.stuck_styles
price_markdown.json:by_cadence_step
price_position_map.json:[].brand
price_position_map.json:[].ragm_pct
price_position_map.json:[].competitive_index
price_competitive_index.json:[].top_competitor
price_competitive_index.json:[].vs_top_competitor_pct
price_cost_passthrough.json:[].ragm_impact
price_elasticity_heatmap.json:[].avg_ragm
price_margin_distribution.json:current_ragm
price_margin_distribution.json:projected_ragm
price_promo_calendar.json:[].mechanic_id
price_promo_calendar.json:[].event_anchor
price_ab_tests.json:[].mechanic
price_ab_tests.json:[].style_id
price_ab_tests.json:[].brand
sku_detail/*.json:price_history[].ragm_pct
sku_detail/*.json:price_history[].promo_mechanic
sku_detail/*.json:price_history[].markdown_step
sku_detail/*.json:price_history[].competitive_index
sku_detail/*.json:size_color_breakdown
```

### 9.4 Sanity linter (`scripts/lint-apparel-price-intel-sanity.ts`) asserts

- `price_kpis.avg_margin_current.value ∈ [50, 60]`, `promo_roi.value ∈ [1.6, 2.8]`, `competitive_index.value ∈ [94, 110]`, `ragm_current.value ∈ [32, 46]`.
- `core.kpis.sell_through_pct ∈ [56, 70]`, `core.kpis.free_rider_ratio_pct ∈ [30, 50]`, `core.kpis.ragm_pct ∈ [32, 46]`.
- `core.margin_waterfall` has exactly 7 bars; labels include "Return-margin loss" and "Premature markdown" with `color_type === 'apparel_leak'`.
- `core.mechanic_roi` has exactly 9 rows; Σ `share_pct ≈ 100 (±1)`; mechanic labels from §1.3 only.
- `core.channel_performance` has exactly 4 channels; channel names ∈ {In-Store, Online-Web, Online-App, Marketplace}.
- `core.markdown_queue[].current_markdown_step` ∈ {full_price, md25, md40, md60, md80}; `recommended_markdown_step` snaps to {md25, md40, md60, md80, clearance}.
- `core.markdown_queue[].is_stuck === (days_in_step > target_days_for_step × 1.4)` — derived consistency.
- `core.skus[].lifecycle_stage` distribution ≈ Intro 8 % / Core 48 % / Markdown-1 14 % / Markdown-2 11 % / Markdown-3 8 % / Clearance 9 % / Discontinued 2 % (±3pp tolerance).
- Every `competitor_id` in `competitor_top3` ∈ {AMZN, TGT, WMT, MACYS, NORD, OLDN, HM, UNQ, ASOS, SHEIN}.
- Every `brand` field value ∈ apparel brand list from CX360 §1.3.
- No grocery strings: fail if any apparel JSON contains `/Mumbai|Delhi NCR|Bangalore|Chennai|Diwali|Onam|Pongal|Eid|HUL|ITC|Patanjali|Amul|Britannia|Tata Sampann|Aashirvaad|Saffola|Blinkit|Zepto|Instamart|BigBasket|JioMart|DMart|₹|Cashback|Multipack/i`.
- `price_intel/sku_detail/` shard count exactly equals `core.skus.length` (200).
- Every shard `sku_id` matches its filename and exists in `core.skus[]`.
- Every shard's `recent_promo_history[].campaign_id` exists in `core.campaigns[]` (cross-file integrity).
- All `_usd` numeric values are positive (except waterfall leak bars which are negative).
- Σ `inventory_aging.{bucket_*.value_usd}` ≈ `core.kpis.total_inventory_value_usd` (±2 %).

### 9.5 E2E test plan (Playwright)

| Test ID | Page | Tenant | Assertion |
|---|---|---|---|
| PI-E2E-01 | `/price-intel` | us_apparel | KPI strip shows 6 tiles (5 grocery + RAGM); all use `$`; "BFCM" appears in headline or supporting line |
| PI-E2E-02 | `/price-intel` (Overview) | us_apparel | Margin Waterfall has 7 bars; "Return-margin loss" bar visible; ReturnsMarginToggle present |
| PI-E2E-03 | `/price-intel` (Overview, vp_commercial persona) | us_apparel | Brand vs PL Margin Gap chart renders with 8 dept rows |
| PI-E2E-04 | `/price-intel` (Promo) | us_apparel | Mechanic ROI bars show 9 mechanics; mechanic labels include "BOGO 50%", "B2G1 Half", "GWP" |
| PI-E2E-05 | `/price-intel` (Promo) | us_apparel | Campaigns table contains "BFCM Outerwear Doorbuster" or "Memorial Day Denim BOGO"; no Diwali campaigns |
| PI-E2E-06 | `/price-intel` (Markdown) | us_apparel | Markdown Cadence Ladder renders 5 bars (md25→clearance); at least one bar shows stuck-step warning band |
| PI-E2E-07 | `/price-intel` (Markdown) | us_apparel | Size/Color Price Grid renders ≥4 cells; clicking a cell opens SKU drawer |
| PI-E2E-08 | `/price-intel` (Forecasting) | us_apparel | Event Calendar 52-week heatmap shows BFCM (Nov W22 area) and BTS (Aug W14 area); no Diwali/Onam markers |
| PI-E2E-09 | `/price-intel/chart/promo-roi` | us_apparel | Full-screen ROI trend chart loads; campaign markers reference US events |
| PI-E2E-10 | `/price-intel/deep-dive/markdown` | us_apparel | All 4 tabs (Queue, Heatmap, Aging, Cadence) load; queue table has style_id, color, size columns |
| PI-E2E-11 | SKU drawer (click row in Action Queue) | us_apparel | Drawer opens with brand badge "Levi's" (or other apparel brand); shows 3 US competitor prices; size/color breakdown section visible |
| PI-E2E-12 | Chat widget on /price-intel | us_apparel | Send "Which styles are stuck at -40%?" — response references USD, "Markdown-2", apparel styles; no ₹ |
| PI-E2E-13 | `/price-intel` (Agents tab) | us_apparel | Deferred-notice banner visible at top; the 5 agent forms still render (no apparel changes) |
| PI-E2E-14 | `/price-intel` | india_grocery | KPI strip shows 5 tiles, `₹`, grocery categories — no regression |
| PI-E2E-15 | Persona toggle test | us_apparel | Switching persona from category_manager to vp_commercial flips margin default from gross to RAGM via ReturnsMarginContext |

---

## 10. Performance considerations

### 10.1 File sizes (apparel cache footprint)

| File | Est. size | Notes |
|---|---|---|
| `price_intel/core.json` | ~220 KB | 200 styles × ~620 bytes/sku + 16 nested arrays; vs grocery ~280 KB (200 grocery SKUs) — comparable |
| `price_intel/precomputed.json` | ~160 KB | 9 department-filtered slices (`all` + 8 L1) |
| `price_intel/insights.json` | ~6 KB | 6–10 insights |
| `price_intel/sku_detail/*.json` | ~14 KB each × 200 = ~2.8 MB | 120 daily price points × ~110 bytes + size_color_breakdown |
| `price_kpis.json` | ~2 KB | small |
| `price_competitive_index.json` | ~3 KB | 8 rows |
| `price_cost_passthrough.json` | ~2 KB | 8 rows |
| `price_elasticity_heatmap.json` | ~6 KB | 32 rows |
| `price_margin_distribution.json` | ~4 KB | current + projected + ragm |
| `price_markdown.json` | ~14 KB | summary + by_bucket + by_cadence_step + trend |
| `price_position_map.json` | ~24 KB | 80 rows |
| `price_product_table.json` | ~64 KB | 200 rows |
| `price_promo_calendar.json` | ~6 KB | 32 rows |
| `price_recommendations.json` | ~58 KB | 200 rows |
| `price_alerts.json` | ~2 KB | 5–8 rows |
| `price_ab_tests.json` | ~6 KB | 8 rows |
| `price_size_color_grid.json` | ~120 KB | 24 styles × ~22 cells avg |
| `price_brand_vs_pl.json` | ~6 KB | 8 dept rows |
| **Total `cache/apparel/` (price-intel portion)** | **~3.5 MB** | sku_detail shards dominate at 80% |

Bundle impact: cache-loader REGISTRY adds both tenants → +3.5 MB JS bundle vs 0 today (grocery side already shipped). Acceptable for demo. SKU detail shards are NOT pre-bundled — they are fetched on demand via `/api/sku-detail/<sku_id>?tenant=us_apparel` route which reads from disk lazily.

### 10.2 Generator runtime estimate

Target ≤ 14 seconds wall time on a 2025 MacBook Pro for full regen:

- 200 `sku_detail/*.json` shards is the long pole: 200 × ~6 ms generation + ~14 KB serialize each ≈ 4 s.
- `core.json` second longest: 200 SKUs × 12 fields + 16 nested arrays ≈ 3 s.
- All standalone files combined < 4 s.
- `precomputed.json` recompute (9 slices) ≈ 1.5 s.
- Sanity lint pass after generation ≈ 1.5 s.

### 10.3 Memory footprint

- Generator peak heap ≈ 65 MB (smaller than Inventory because no 10K row SKU table — capped at 200 styles).
- App runtime: `core.json` resident ≈ 0.6 MB heap (after JSON.parse expansion ≈ 1.4 MB); sku_detail shards loaded lazily and cached up to 20 shards (~280 KB) in a LRU. Total resident apparel price-intel ≈ 2 MB heap; negligible vs Next.js baseline (~120 MB).

### 10.4 Per-SKU drawer latency

- SKU drawer opens → fetches `/api/sku-detail/<sku_id>?tenant=us_apparel` → returns ~14 KB → renders.
- Target: <120 ms p95 from click to drawer-visible. Already in budget for static disk reads on Next.js dev server; production CDN edge cache makes this <40 ms.

---

## 11. Risks + gotchas

1. **The `core.json` 16-slice shape is the highest-risk surface.** Each nested array (action_queue, skus, departments, campaigns, promo_roi_trend, ai_suggestions, lift_by_segment, mechanic_roi, sell_through_heatmap, markdown_queue, inventory_aging, channel_performance, margin_waterfall, forecast_14w, model_card, plus headline + kpis + live_activity) is consumed by at least one chart component. Getting any one of them wrong silently breaks a chart. Generator must produce all 16 in a single pass and lint each against an inlined TS interface.

2. **Sub-routes under `/price-intel/chart/[chartId]` re-render the same chart components at full-screen.** After Phase E + F sweep, every chart component must still work in both contexts (tab card and full-screen route). Don't hardcode dimensions or assume parent layout; use percentage widths and recharts `ResponsiveContainer`.

3. **Markdown logic is STEPPED in apparel, CONTINUOUS in grocery.** Grocery uses arbitrary `recommended_depth_pct` values; apparel snaps to {-25, -40, -60, -80}. The Markdown Queue table cell renderer must show step chips ("md40 → md60") not free-form percentages. The Markdown Cadence Ladder §3.1 is the canonical view of this discreteness — without it the demo reads as naive.

4. **Some charts read both `core.json` AND a `sku_detail/` shard for drill-down.** Verify the dual-read pattern still holds in apparel: action_queue row click → shard fetch → drawer; campaign row click → multi-shard fetch for affected_skus[] → drawer. The shard must contain at least `competitive_positioning`, `size_color_breakdown`, and `price_history` for the drawer to render correctly.

5. **The 5 AI Agents will leak grocery context if a demo viewer opens the Agents tab in apparel mode.** Per §4, this is documented and acceptable, but the deferred-notice banner is the only mitigation. Make sure it ships.

6. **RAGM toggle persistence across tabs.** The `ReturnsMarginContext` lives at the shell level (`PriceIntelShell.tsx`). Make sure it does NOT reset on tab change; only on tenant change. The localStorage key `cx360_apparel_margin_mode` is the source of truth.

7. **Persona-specific layouts.** The shell renders different chart sets per persona (category_manager vs pricing_analyst vs vp_commercial). The new `BrandVsPLMarginGap` chart (§3.4) should appear ONLY in vp_commercial persona's Overview Tab to avoid clutter; in other personas it lives in the Overview deep-dive's IntelligenceTab.

8. **Date anchor.** All generated data anchors against `current_date = 2026-06-29` (BTS ramp window). If the demo is shown after Aug 25 (BTS peak passes), the Forecast Calendar event annotations and the headline `season_context` need to be regenerated. Freeze `current_date` constant in `apparel-price-intel-constants.ts` and document the refresh cadence.

9. **MSRP vs current_price.** Apparel has explicit `msrp_usd` separate from `current_price_usd` (grocery used `mrp_inr` but apparel MSRP is the actual list price, not a regulated maximum). The SKU drawer price history shows both as separate lines. Make sure MSRP doesn't render as a flat horizontal line during clearance periods (when current_price has fallen 80%) — it must still show the unchanged MSRP.

10. **Returns cache cross-module read.** The SKU drawer's "Returns block" links into `cache/apparel/cx360_returns_by_reason.json` (owned by CX360 spec §3.1). If CX360 generator hasn't run, the drawer's return reason chip must degrade gracefully (show return_rate_pct from core.skus[i] without the breakdown link).

11. **Free-rider ratio is higher in apparel.** Grocery free-rider 30–45 %; apparel 30–50 % (VIPs especially — 64–72 %). Calibration of the AI Suggestions cards' "pause" recommendations must use apparel thresholds (>55 % = pause candidate); the grocery threshold of 50 % is too aggressive for apparel.

12. **Competitive index sign convention.** 100 = parity. >100 = we are priced ABOVE competitor (premium); <100 = we are BELOW. Make sure tooltip copy and competitive_index gauge in the SKU drawer get this right — easy to flip during reskin.

13. **Confidence bars (pricing_analyst persona).** The PromoAISuggestions component renders progress bars showing `confidence` (0..1 float). Make sure the apparel suggestions carry valid confidence values; if a generator skips one, bars render at 0 → looks like an error.

---

## 12. Effort estimate

| Phase | Work | Hours |
|---|---|---|
| **A. Constants + dimensions** | Create `scripts/lib/apparel-price-intel-constants.ts` (5 cadence steps, 9 promo mechanics, 10 competitors, 6 pricing strategies, 8 margin floor rows, elasticity bands, US event calendar with depths); extend `dimensions-apparel.json` per §5.3. | 6 |
| **B. Palette + tokens** | Extend `palette-apparel.ts` with `APPAREL_MARKDOWN_STEP_COLORS`, `APPAREL_PROMO_MECHANIC_COLORS`, `APPAREL_COMPETITOR_COLORS`. | 2 |
| **C. Generator** | Build `scripts/gen-apparel-price-intel.ts` emitting 15 mirror files + 2 NEW caches + 200 sku_detail shards per §2 + §3. Reuses mulberry32 seeded RNG from prior generators. | 32 |
| **D. Cache-loader REGISTRY + sku_detail route** | Pair every new file; add `/api/sku-detail/[id]` route that reads from `cache/apparel/price_intel/sku_detail/` lazily. | 4 |
| **E. RESKIN sweep (8 charts × 0.5h)** | Per `/tmp/apparel-plan-demand-price.md`: currency/brand swaps on KPI, Insights, Live Activity, Promo ROI Trend, AI Suggestions, Segment Lift, Sell-Through Trend Line, Confidence Bars. | 4 |
| **F. REFRAMED sweep (12 charts × ~2.5h avg)** | Reshape Action Queue (add style_id + size_color_dim), Margin Waterfall (7 bars + apparel_leak), Channel Chart (4 apparel channels + conversion), Mechanic ROI (9 mechanics), Campaigns Table (markdown_overlap_flag), Sell-Through Heatmap (16 L2 + 60-75 targets), Markdown Queue (style/color/size + step chips + stuck badge), Inventory Aging (apparel buckets), Forecast Chart (US events + RAGM line), Scenario Planner (mechanic enum + markdown_step param), Event Calendar (US 52-week + holiday tiers), Aging Scatter (weeks_on_floor + apparel colors). | 30 |
| **G. NEW charts (4 components)** | Build `MarkdownCadenceLadder.tsx` (§3.1, 6h), `SizeColorPriceGrid.tsx` (§3.2, 7h), `ReturnsMarginToggle.tsx` + `ReturnsMarginContext.tsx` (§3.3, 5h), `BrandVsPLMarginGap.tsx` (§3.4, 5h). | 23 |
| **H. SKU drawer rework** | §7 — brand badge, lifecycle banner, RAGM display, competitive positioning with US competitors, size_color_breakdown table, recent_promo_history, returns block. | 8 |
| **I. Chat agent prompt** | §6 — write `APPAREL_PRICE_INTEL_SYSTEM_PROMPT`, branch logic in `chat/route.ts` and `widget-ai/route.ts`, 4 few-shot examples. | 4 |
| **J. Hardcoded label sweep** | §8 table — ~30 files × `rg`-driven swaps; date format MM/DD; persona defaults wiring. | 12 |
| **K. Lint + sanity validators** | Extend `lint-apparel-schema.ts` with §9.3 whitelist; build `lint-apparel-price-intel-sanity.ts`; CI hook. | 6 |
| **L. E2E tests** | 15 Playwright tests per §9.5. | 10 |
| **M. AI Agents deferred notice** | §4.3 — add 1-line banner in `AgentsTab.tsx` guarded by tenant. | 0.5 |
| **N. QA + chart-sanity sweep** | Visual QA on every page in both tenants (Overview, Promo, Markdown, Forecasting, 4 deep-dives × 3-5 tabs each, 4 chart-expansion routes, SKU drawer, chat widget); capture screenshots; fix layout regressions. | 12 |
| **Total** | | **~153 hours (~4 engineering weeks for one developer)** |

Phase G includes the design + implementation budget for the 4 net-new apparel-essential charts, which dominate the demo's apparel narrative. Phase F is mostly mechanical but volume-heavy. Phase J is the largest single risk for hidden regressions — schedule it before Phase L so the linters catch any stragglers.

---

**END OF SPEC** — v1.0, locked design for the Price Intelligence apparel pivot. Phase C generator may begin against this contract.
