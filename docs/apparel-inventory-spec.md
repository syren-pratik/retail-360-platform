# Apparel Inventory + Supply — Canonical Design Specification

**Version:** v1.0
**Last updated:** 2026-06-29
**Status:** DRAFT — awaiting sign-off
**Owners:** Product (user), Engineering (generator author), AI/Chat (system-prompt author)

**Purpose:** Lock the design of the US-apparel skin of the Inventory + Supply module so the data-generator, chart-reskins, and 7 net-new chart implementations become mechanical execution against a frozen contract.

**Hard scope statement:** This spec covers the **Inventory + Supply module ONLY** — the main dashboard at `/inventory`, the five deep-dives (`/inventory/deep/{stock-health, demand-forecast, supply-chain, allocation, scenarios}`), the supplier detail page (`/inventory/supplier/[id]`), and the Scenario Simulator (which is the one surface in this module that runs against live Databricks). **CX360, Merch Demand, Cold-Start, Store-Opening, and Price-Intel modules are out of scope** — CX360 has its own spec at `docs/apparel-cx360-spec.md`; the rest remain Indian grocery. ~71 existing charts + 7 net-new apparel-native charts are covered.

---

## Table of contents

1. Domain dictionary — apparel inventory constants source of truth
2. Per-cache-file JSON specs (26 files)
3. Seven NEW apparel-native chart specs
4. Scenario Simulator prompt sweep
5. Settings + tenant integration
6. Chat agent skinning for inventory module
7. Supplier detail page
8. Hardcoded label / formatter sweep (file-by-file table)
9. Migration runbook + validation rules
10. Performance considerations
11. Risks + gotchas
12. Effort estimate

---

## 1. Domain dictionary — apparel inventory constants

All constants below live in `scripts/lib/apparel-inventory-constants.ts` (created by the generator author). Where a concept is already defined in `docs/apparel-cx360-spec.md` (brands, stores, US holidays, customer segments, color palette, return reasons, AOV ranges), this spec **references** that source — it does not redefine. Inventory-specific extensions are spelled out below.

### 1.1 Carry-overs from CX360 spec (do not redefine)

| Carry-over | Source | Used by |
|---|---|---|
| 25 apparel brands with category market-share splits | `apparel-cx360-spec.md §1.3` | category-health colour keying, supplier↔brand cross-reference |
| 50-store retail network with metros | `apparel-cx360-spec.md §1.12` | Store Health Scores, Inbound shipments, Allocation, Stock-Health-by-Store, Supplier Store-Impact |
| 24 US holiday calendar with uplift multipliers | `apparel-cx360-spec.md §1.11` | Forecast event annotations, Delayed Impact `event_window_missed`, Scenario Simulator |
| 12 standard apparel colours (Black/White/Navy/…) | `apparel-cx360-spec.md §1.5` | Size-Curve matrix colour cells, Colour Performance heatmap |
| 6 return reasons (Fit / Style / Quality / Wrong Item / Damaged / Changed Mind) | `apparel-cx360-spec.md §1.13` | (returns data is CX360-owned; inventory does NOT regenerate it but DOES surface it via shared cache) |
| 8 apparel departments (Women's Tops/…/Accessories) | `apparel-cx360-spec.md §1.1` | dim filter, Category Health, Overstock, Forecast Accuracy |
| 32 L2 categories | `apparel-cx360-spec.md §1.2` | Lead Times table, Reorder Point sample SKUs, Allocation by category |
| 4-tenant palette tokens (`APPAREL_DEPT_COLORS`, `APPAREL_RETURN_REASON_COLORS`) | `palette-apparel.ts` | every chart in this module |
| Customer-name pool (used by Allocation transfer urgencies tied to top customers) | `apparel-cx360-spec.md §1.15` | optional supplier-detail "top customer" callouts |

### 1.2 Apparel size vectors (already in CX360 §1.4, repeated here because inventory consumes them at chart-cell granularity)

| Size-set id | Values | Median (demand peak) |
|---|---|---|
| `TOPS_ADULT` | XS, S, M, L, XL, XXL | M |
| `JEANS_M` | 28×30, 30×30, 30×32, 32×30, 32×32, 32×34, 34×32, 34×34, 36×32, 38×32, 40×32 | 32×32 |
| `JEANS_W` | 24, 25, 26, 27, 28, 29, 30, 31, 32 | 28 |
| `DRESSES_W` | XS, S, M, L, XL | M |
| `KIDS` | 2T, 3T, 4T, 5, 6, 7, 8, 10, 12, 14 | 6 |
| `SHOES_M` | 7, 8, 8.5, 9, 9.5, 10, 10.5, 11, 12, 13 | 9.5 |
| `SHOES_W` | 5, 6, 7, 7.5, 8, 8.5, 9, 10, 11 | 8 |
| `OS` | OS | OS |

Demand within a vector follows a bell centred on the median (σ ≈ 1.4 sizes).

### 1.3 Style lifecycle stages (apparel-only — no grocery analog)

Used by `style_state` field on SKU table, by Style Velocity chart §3, and by Markdown Recommendation table.

| stage | weeks-on-floor band | sell-through target | next stage trigger |
|---|---|---|---|
| `Intro` | 0–3 weeks | ≥ 12 % per week | Hit 25 % cumulative ST or week 4 |
| `Core` | 4–12 weeks | ≥ 6 % per week | Hit 60 % cumulative ST or week 13 |
| `Markdown-1` | 13–16 weeks | -25 % off | week 17 elapses |
| `Markdown-2` | 17–20 weeks | -40 % off | week 21 elapses |
| `Markdown-3` | 21–24 weeks | -60 % off | week 25 elapses |
| `Clearance` | 25+ weeks | -80 % / liquidate | sell-through ≥ 92 % |
| `Discontinued` | (post-clearance) | n/a | aged out |

Population in steady state across all active SKUs: Intro 8 % / Core 48 % / Markdown-1 14 % / Markdown-2 11 % / Markdown-3 8 % / Clearance 9 % / Discontinued 2 %.

### 1.4 Season tags

Three rolling seasons present in any given snapshot:

| season_tag | window | sell-through target by season end | aging tolerance |
|---|---|---|---|
| `SS25` | Spring/Summer 2025 (Feb–Jul 2025) | 88 % | aged if still on floor after 2025-10-31 |
| `FW25` | Fall/Winter 2025 (Aug 2025–Jan 2026) | 84 % | aged if still on floor after 2026-04-30 |
| `SS26` | Spring/Summer 2026 (Feb–Jul 2026) | 78 % current sell-through | active |
| `FW26` | Fall/Winter 2026 (Aug 2026–Jan 2027) | pre-order / pipeline | pre-arrival |
| `Resort27` | Resort 2027 capsule (Nov 2026–Jan 2027) | pipeline | pre-arrival |

Aged-Inventory matrix (§3.5) shows residual $ value per season × department.

### 1.5 Apparel-realistic DoS targets (much lower than grocery)

Fashion cannot carry 60-day stock without aging. Targets:

| segment | min DoS | target DoS | max DoS | over-target = |
|---|---|---|---|---|
| Fashion (dresses, trend tops) | 8 | 18 | 28 | risk of markdown |
| Core basics (Levi's 501 indigo, Nike crew tee) | 21 | 35 | 56 | acceptable buffer |
| Carryover / clearance | 14 | n/a (liquidate) | n/a | already aged |
| Footwear staples | 28 | 45 | 70 | size-curve buffer |
| Accessories | 30 | 60 | 120 | seasonless basics OK |

Network avg DoS target: ~42 d (grocery target was 18 d).

### 1.6 SKU velocity (ABCD) classes

| class | revenue share | SKU count share | typical apparel example | service-level target |
|---|---|---|---|---|
| A | top 60 % rev | 8 % of SKUs | Levi's 501 indigo 32×32, Nike crew M black | 98 % |
| B | 60–85 % rev | 18 % | core seasonal staples | 95 % |
| C | 85–96 % rev | 34 % | colour variations, peripheral sizes | 90 % |
| D | 96–100 % rev | 40 % | fashion/trend, slow movers, markdown candidates | 80 % (apparel accepts more stockouts on D) |

(Grocery had A/B/C only — apparel adds D for fashion/trend tail.)

### 1.7 Receiving / inbound concepts (apparel-only structural fields)

| concept | typical value | used by |
|---|---|---|
| `container_count` | 1–20 containers per PO from import suppliers | Shipments Gantt, Open POs, Container Load chart §3.7 |
| `cube_utilization_pct` | 62–96 % per container | Container Load chart |
| `port_of_origin` | Ho Chi Minh / Yantian / Chittagong / Jebel Ali / Long Beach (domestic inland) | Shipments Gantt, Delay Reasons |
| `pre_ticketed` | bool | Receiving Capacity (pre-ticketed bypasses ticketing line) |
| `asn_received` | bool | Replenishment Funnel stage |
| `customs_status` | Cleared / Hold / Examining / Bonded | Delay Reasons taxonomy |
| `season_tag` | `SS26` / `FW26` / `Resort27` | Open POs table, Inbound Gantt |

### 1.8 Supplier types

| supplier_type | margin band | OTIF band | lead time | example suppliers |
|---|---|---|---|---|
| `Branded Direct` | 38–48 % | 84–96 % | 4–8 weeks (domestic), 10–14 (imports) | Nike, Levi Strauss, Lululemon, Adidas, Under Armour, New Balance, Coach |
| `Private Label Vendor` | 52–62 % | 76–88 % | 12–18 weeks | Hansae America, Premier Apparel Group, Li & Fung Americas, MAS Holdings USA, Esquel Group |
| `Import Wholesaler` | 28–38 % | 68–82 % | 10–16 weeks | Tristate Apparel, Eastex Group, One Step Up, Sky Industries |
| `Off-Price Reseller` | 18–28 % | 86–94 % (opportunistic) | 2–4 weeks | TJX-style closeout vendors (anon-coded `OPR-001..005`) |

### 1.9 US suppliers (30) — full list

Used in Supplier League Table, Lead Times, Supplier Detail page, Scenario Simulator dropdowns.

| supplier_id | name | type | HQ city | country_of_origin (sourcing) | departments served |
|---|---|---|---|---|---|
| SUP-A001 | Nike Inc | Branded Direct | Beaverton OR | Vietnam, Indonesia, China | M Tops, W Tops, Footwear, Kids' |
| SUP-A002 | Levi Strauss & Co | Branded Direct | San Francisco CA | Mexico, Vietnam, Pakistan | M Bottoms, W Bottoms |
| SUP-A003 | Lululemon Athletica | Branded Direct | Vancouver BC | Vietnam, Sri Lanka, Bangladesh | W Tops, W Bottoms, M Tops |
| SUP-A004 | VF Corporation | Branded Direct | Denver CO | Vietnam, China | Footwear (Vans/Timberland), Outerwear (North Face) |
| SUP-A005 | PVH Corp | Branded Direct | New York NY | Bangladesh, Vietnam, India | M Tops (Calvin Klein, Tommy Hilfiger), W Tops |
| SUP-A006 | Tapestry Inc | Branded Direct | New York NY | Italy, Vietnam, China | Accessories (Coach, Kate Spade) |
| SUP-A007 | Under Armour Inc | Branded Direct | Baltimore MD | Jordan, Vietnam, Indonesia | M Tops, W Tops, Footwear |
| SUP-A008 | Adidas America Inc | Branded Direct | Portland OR | Vietnam, Indonesia | M Tops, W Tops, Footwear |
| SUP-A009 | Hanesbrands Inc | Branded Direct | Winston-Salem NC | Honduras, Dominican Republic | M Tops basics, Kids' |
| SUP-A010 | Carter's Inc | Branded Direct | Atlanta GA | Cambodia, Vietnam | Kids' |
| SUP-A011 | New Balance Inc | Branded Direct | Boston MA | Vietnam, Indonesia, USA (made-in-USA line) | Footwear |
| SUP-A012 | Kontoor Brands | Branded Direct | Greensboro NC | Mexico, Bangladesh | M Bottoms (Wrangler, Lee) |
| SUP-A013 | Gap Inc Sourcing | Branded Direct | San Francisco CA | Vietnam, Bangladesh, India | Kids', M Bottoms, W Bottoms, M Tops |
| SUP-A014 | J.Crew Group | Branded Direct | New York NY | China, Vietnam | M Tops, W Tops, W Bottoms |
| SUP-A015 | Hansae America Inc | Private Label Vendor | New York NY | Vietnam, Indonesia | W Dresses, W Tops, W Outerwear |
| SUP-A016 | Premier Apparel Group | Private Label Vendor | Los Angeles CA | China, Vietnam | W Tops, W Bottoms |
| SUP-A017 | Li & Fung Americas | Private Label Vendor | New York NY | China, Vietnam, Bangladesh | All departments (multi-cat agent) |
| SUP-A018 | MAS Holdings USA | Private Label Vendor | New York NY | Sri Lanka | W Bottoms (leggings), W Tops |
| SUP-A019 | Esquel Group USA | Private Label Vendor | New York NY | China, Vietnam | M Tops (shirting) |
| SUP-A020 | Centric Brands | Private Label Vendor | New York NY | China, Vietnam | Kids', Accessories |
| SUP-A021 | Tristate Apparel | Import Wholesaler | Edison NJ | India, China | W Tops, W Dresses (value tier) |
| SUP-A022 | Eastex Products | Import Wholesaler | Atlanta GA | Bangladesh, China | M Tops, Kids' |
| SUP-A023 | One Step Up Ltd | Import Wholesaler | New York NY | China, Vietnam | W Tops, Accessories |
| SUP-A024 | Sky Industries USA | Import Wholesaler | Los Angeles CA | China, Pakistan | M Bottoms, M Tops |
| SUP-A025 | Cherokee Global Brands | Import Wholesaler | Sherman Oaks CA | China, India | Kids', W Tops |
| SUP-A026 | Closeout Brokers Intl | Off-Price Reseller | Secaucus NJ | (opportunistic mix) | All depts (closeout) |
| SUP-A027 | Wholesale Liquidators | Off-Price Reseller | Long Island City NY | (opportunistic) | Accessories, Footwear |
| SUP-A028 | Apparel Recovery Group | Off-Price Reseller | Charlotte NC | (opportunistic) | All depts |
| SUP-A029 | Fashion Returns Network | Off-Price Reseller | Memphis TN | (returns liquidation) | All depts |
| SUP-A030 | Bargain Bay Sourcing | Off-Price Reseller | Houston TX | (off-price) | Kids', Footwear |

### 1.10 OTIF benchmarks by supplier type (apparel-realistic)

| supplier_type | OTIF range | avg delay | fill rate | typical delay reason mix |
|---|---|---|---|---|
| Branded Direct (domestic) | 84–96 % | 4–9 days | 88–96 % | Production Capacity 35 %, Sample Approval 18 %, Logistics 22 %, QC Fail 12 %, Customs 8 %, Fabric Shortage 5 % |
| Branded Direct (import) | 78–88 % | 8–18 days | 82–92 % | Port Congestion 30 %, Production Capacity 22 %, Fabric Shortage 18 %, Customs Hold 14 %, QC 10 %, Sample Approval 6 % |
| Private Label Vendor | 72–86 % | 12–28 days (in weeks effectively) | 76–88 % | Fabric Shortage 28 %, Production Capacity 24 %, Sample Approval 18 %, Port Congestion 14 %, QC 10 %, Customs 6 % |
| Import Wholesaler | 64–78 % | 14–35 days | 70–82 % | Port Congestion 34 %, Customs Hold 22 %, Production Capacity 18 %, Fabric Shortage 12 %, QC 10 %, Sample Approval 4 % |
| Off-Price Reseller | 86–96 % (opportunistic — high when active) | 2–7 days | 92–98 % | Logistics 60 %, QC 24 %, Customs 16 % |

Network avg OTIF target: ~82 % (vs grocery 93 %).

### 1.11 Lead times (apparel realism)

| supplier_type | lead time band | unit shown in UI |
|---|---|---|
| Branded Direct domestic | 4–8 weeks | **weeks** |
| Branded Direct import | 10–14 weeks | **weeks** |
| Private Label Vendor | 12–18 weeks | **weeks** |
| Import Wholesaler | 10–16 weeks | **weeks** |
| Off-Price Reseller | 2–4 weeks | **weeks** |
| DC → store replenishment (domestic) | 1–5 days | **days** |

Charts show *weeks* on supplier-facing pages, *days* on DC-to-store replenishment.

### 1.12 Distribution centres (4 US apparel DCs)

| dc_id | name | city | state | serves region | apparel capacity (pallets/day) |
|---|---|---|---|---|---|
| DC-A01 | Reno DC | Reno | NV | West (CA, NV, AZ, OR, WA) | 4,200 |
| DC-A02 | Memphis DC | Memphis | TN | Central (TX, MO, IL, OH, MI, MN, IN) | 5,800 |
| DC-A03 | Allentown DC | Allentown | PA | East (NY, NJ, PA, MA, CT, MD) | 4,800 |
| DC-A04 | Atlanta DC | Atlanta | GA | Southeast (GA, FL, NC, SC, TN-east) | 3,600 |

(Replaces Indian DC names Mumbai DC / Delhi DC / Manesar / Bhiwandi / Hosur from grocery.)

### 1.13 Replenishment statuses (5 tiers — apparel adds 5th)

| status | meaning | colour token |
|---|---|---|
| Reorder Now | below reorder point, must trigger PO | `#EF4444` |
| Watch | within 1 lead-time of reorder point | `#F59E0B` |
| Healthy | well-stocked, in target DoS band | `#10B981` |
| Overstock | above max DoS band but still sellable | `#6366F1` |
| Aged | season carryover, candidate for markdown / liquidation (apparel-only 5th tier) | `#94A3B8` |

### 1.14 Apparel return rate

| dimension | range |
|---|---|
| Network average return rate | 18–22 % of gross sales (vs grocery <1 %) |
| Web/App return rate | 24–32 % |
| In-store return rate | 9–14 % |
| Top return reason (overall) | Fit (38 % of returns) |
| Bottoms return rate | 26–32 % (highest) |
| Dresses return rate | 22–28 % |
| Footwear return rate | 16–22 % |
| Accessories return rate | 4–8 % (lowest) |

This is *consumed* by inventory module (Returns donut tile §3.3 reads `cache/apparel/cx360_returns_by_reason.json` from the CX360 spec) but **not regenerated** here.

### 1.15 Delay-reason taxonomy (6 apparel reasons)

Replaces grocery's 5 (Manufacturing / Logistics / Quality / Documentation / No Reason).

| reason | typical % share | description |
|---|---|---|
| Fabric Shortage | 18 % | Yarn / fabric not arrived at cut-make-trim factory |
| Port Congestion | 24 % | Long Beach / Newark / Savannah port dwell |
| Production Capacity | 22 % | Factory line over-booked |
| QC Fail | 12 % | Failed inspection at FOB or DC |
| Customs Hold | 14 % | CBP exam, doc issue, or anti-dumping flag |
| Sample Approval Delay | 10 % | Pre-production sample not approved on time |

---

## 2. Per-cache-file JSON specs (26 files)

All apparel cache files live in `cache/apparel/` and mirror existing `cache/` filenames 1:1 where a grocery analog exists. The cache-loader registry (`src/app/lib/cache-loader.ts`) is the indirection — see §5. Field names match grocery exactly so transform layers don't change shape; only values and *additive* fields differ.

Cross-file invariants:
- `supplier_id` values drawn from §1.9 (SUP-A001..A030) consistently across `supply_supplier_otif`, `supply_supplier_profiles`, `supply_inbound`, `supply_replenishment`.
- `store_id` / `store_name` / `city` consistent with `apparel-cx360-spec.md §1.12` (STR-A001..A050).
- `dc_id` ∈ {DC-A01..DC-A04} per §1.12.
- `product_id` follows convention `APR-<DEPT>-<NNNN>` (e.g. `APR-WB-0001` for Women's Bottoms #1).

### 2.1 `cache/apparel/supply_kpis.json`

- **Cardinality:** 1 object with 6 nested KPI blocks (+ 2 apparel-additive blocks).
- **Shape:**

```ts
{
  revenue_at_risk: { value: number; prior: number; unit: 'M'; label: string; stores_affected: number; skus_affected: number; sparkline: number[7] };
  inventory_value: { value: number; prior: number; unit: 'M'; label: string; overstock_value: number; aging_45plus: number; seasonal_carryover_value: number /* NEW apparel */; sparkline: number[7] };
  osa: { value: number; prior: number; unit: '%'; label: string; target: number; daily_impact_usd_k: number; style_osa_pct: number /* NEW */; size_color_osa_pct: number /* NEW */; sparkline: number[7] };
  avg_dos: { value: number; prior: number; unit: 'days'; label: string; target_min: number; target_max: number; below_7_days_pct: number; dos_by_lifecycle: { Intro: number; Core: number; Markdown: number; Clearance: number } /* NEW */; sparkline: number[7] };
  stockout_count: { value: number; prior: number; unit: ''; label: string; rev_impact_today_usd_k: number; stores_affected: number; sparkline: number[7] };
  supplier_otif: { value: number; prior: number; unit: '%'; label: string; suppliers_below_threshold: number; delayed_pos: number; avg_delay_weeks: number /* NEW (vs grocery days) */; sparkline: number[7] };
  // Apparel-additive 7th KPI surfaced as a new tile per Chart 58 in plan:
  return_rate: { value: number; prior: number; unit: '%'; label: 'Return Rate'; top_reason: 'Fit'; sparkline: number[7] };
}
```

- **Generation rules:**
  - `revenue_at_risk.value`: gaussian(μ=3.2, σ=0.4) USD millions. Range 1.8–4.6.
  - `inventory_value.value`: gaussian(μ=318, σ=12) USD millions. `seasonal_carryover_value`: 16–28 % of total.
  - `osa.value`: gaussian(μ=92.4, σ=0.6) %. `style_osa_pct` = `osa.value + uniform(4, 6)` (capped 99). `size_color_osa_pct` = `osa.value` itself (the lower number).
  - `avg_dos.value`: gaussian(μ=42, σ=4) days. `dos_by_lifecycle`: Intro 14 d, Core 38 d, Markdown 86 d, Clearance 174 d.
  - `stockout_count.value`: gaussian(μ=1,420, σ=180) — measured at size×color SKU. `rev_impact_today_usd_k` ≈ value × $0.6 K.
  - `supplier_otif.value`: gaussian(μ=82.4, σ=1.2). `avg_delay_weeks`: 1.6–3.2.
  - `return_rate.value`: 18–22 %. Mirrors CX360 return cache.

- **Sample:**

```json
{
  "revenue_at_risk": { "value": 3.4, "prior": 3.1, "unit": "M", "label": "Revenue at Risk", "stores_affected": 18, "skus_affected": 1640, "sparkline": [2.6, 2.8, 3.1, 3.3, 3.2, 3.3, 3.4] },
  "inventory_value": { "value": 318, "prior": 304, "unit": "M", "label": "Working Capital", "overstock_value": 78, "aging_45plus": 42, "seasonal_carryover_value": 56, "sparkline": [290, 296, 304, 308, 312, 315, 318] },
  "osa": { "value": 92.4, "prior": 93.6, "unit": "%", "label": "On-Shelf Availability (size×color)", "target": 95, "daily_impact_usd_k": 184, "style_osa_pct": 97.8, "size_color_osa_pct": 92.4, "sparkline": [94.1, 93.8, 93.6, 93.0, 92.7, 92.5, 92.4] },
  "avg_dos": { "value": 42, "prior": 38, "unit": "days", "label": "Avg Days of Supply", "target_min": 28, "target_max": 56, "below_7_days_pct": 6.2, "dos_by_lifecycle": { "Intro": 14, "Core": 38, "Markdown": 86, "Clearance": 174 }, "sparkline": [38, 39, 40, 41, 41, 42, 42] },
  "stockout_count": { "value": 1480, "prior": 1320, "unit": "", "label": "Active Size-Color Stockouts", "rev_impact_today_usd_k": 888, "stores_affected": 36, "sparkline": [1280, 1320, 1340, 1380, 1420, 1450, 1480] },
  "supplier_otif": { "value": 82.4, "prior": 84.1, "unit": "%", "label": "Supplier OTIF", "suppliers_below_threshold": 7, "delayed_pos": 42, "avg_delay_weeks": 2.4, "sparkline": [85.2, 84.4, 84.1, 83.6, 83.0, 82.6, 82.4] },
  "return_rate": { "value": 19.4, "prior": 18.6, "unit": "%", "label": "Return Rate", "top_reason": "Fit", "sparkline": [18.2, 18.4, 18.6, 18.8, 19.0, 19.2, 19.4] }
}
```

### 2.2 `cache/apparel/supply_category_health.json`

- **Cardinality:** `summary{}` + `categories[8]` + `store_category_matrix[400]` + `health_trend_12m[12]`.
- **Shape (categories row — preserves grocery shape + apparel-additive fields):**

```ts
{
  name: 'Women\'s Tops' | 'Women\'s Bottoms' | ... (8 apparel L1);
  status: 'critical' | 'at_risk' | 'healthy' | 'overstock';
  rev_at_risk_usd_k: number;             // renamed from rev_at_risk_cr
  osa_pct: number;
  avg_dos: number;
  stockout_skus: number;                 // counted at size×color
  overstock_value_usd_k: number;
  turn_rate: number;
  size_curve_completeness_pct: number;   // NEW apparel — % of stores with full S-XXL run on top 20 styles
  markdown_pressure_pct: number;         // NEW — % of category in any Markdown stage
  season_carryover_pct: number;          // NEW — % of inventory $ in last season's stock
}
```

- **Generation:** for each of 8 L1 categories, derive from `cache/apparel/inventory_sku_table.json` rollup. Status thresholds: `rev_at_risk_usd_k > 500` → critical; > 200 → at_risk; overstock if `overstock_value_usd_k > rev_at_risk_usd_k × 4`; else healthy.
- **Sample categories row:**

```json
{
  "name": "Women's Bottoms",
  "status": "critical",
  "rev_at_risk_usd_k": 640,
  "osa_pct": 88.4,
  "avg_dos": 38,
  "stockout_skus": 284,
  "overstock_value_usd_k": 2840,
  "turn_rate": 5.2,
  "size_curve_completeness_pct": 72,
  "markdown_pressure_pct": 34,
  "season_carryover_pct": 18
}
```

- **summary block:** `{ critical, at_risk, healthy, overstock, total_rev_at_risk_usd_k }`. Distribution target: 2 critical / 3 at_risk / 1 healthy / 2 overstock (apparel skews more overstock than grocery).
- **store_category_matrix:** 50 stores × 8 categories = 400 rows; preserved grocery shape with USD units.
- **health_trend_12m:** stacked-pct row per month; overstock_pct climbs Sep→Jan (post-season).

### 2.3 `cache/apparel/supply_overstock.json`

- **Cardinality:** `summary{}` + `by_category[8]` + `markdown_waterfall[7]` + `trend_vs_purchasing[18]` + `markdown_recommendations[16]`.
- **Shape (by_category row, apparel-additive `season_carryover_usd_k`):**

```ts
{ category: string; slow_moving_usd_k: number; dead_stock_usd_k: number; season_carryover_usd_k: number /* NEW */; total_usd_k: number; markdown_risk_skus: number }
```

- **markdown_waterfall stages (apparel cadence, replaces grocery's generic stages):**
  1. `{ stage: "Total Overstock", value_usd_k: 78000, type: "total" }`
  2. `{ stage: "Sells at Full Price", value_usd_k: -8000, type: "positive" }`
  3. `{ stage: "Markdown -25% (Week 13)", value_usd_k: -18000, type: "negative" }`
  4. `{ stage: "Markdown -40% (Week 17)", value_usd_k: -22000, type: "negative" }`
  5. `{ stage: "Markdown -60% (Week 21)", value_usd_k: -16000, type: "negative" }`
  6. `{ stage: "Clearance (Week 25+)", value_usd_k: -9000, type: "negative" }`
  7. `{ stage: "Net Recovered Value", value_usd_k: 5000, type: "result" }`

- **trend_vs_purchasing:** 18 months (vs grocery 12) to capture two seasons. `{ month, overstock_usd_k, purchase_volume_usd_k, season_band: 'SS25'|'FW25'|'SS26'|'FW26' }`.
- **markdown_recommendations row:** `{ category, style_id, style_name, weeks_on_floor, lifecycle_stage, current_markdown_pct, recommended_markdown_pct, urgency: 'critical'|'high'|'medium', revenue_recovery_usd_k, next_markdown_date }`.

### 2.4 `cache/apparel/supply_replenishment.json`

- **Cardinality:** `summary{}` + `store_health_scores[50]` + `lead_time_by_supplier_category[40]` + `safety_stock_by_abc[4]` + `replenishment_funnel[5]`.
- **Shape (lead_time row — units swap days→weeks):**

```ts
{
  supplier: string;                  // §1.9 names
  category: string;                  // L1 or L2
  avg_lead_weeks: number;            // renamed from avg_lead_days
  committed_weeks: number;
  status: 'on_target' | 'slight_slip' | 'over_target';
  country_of_origin: 'Vietnam'|'Bangladesh'|'China'|'India'|'USA'|'Mexico'|'Indonesia'|'Sri Lanka'|'Pakistan'|'Cambodia'|'Honduras'|'Dominican Republic'|'Jordan'|'Italy'; // NEW apparel
}
```

- **safety_stock_by_abc:** 4 rows (ABCD per §1.6), not 3. `service_level` targets 98/95/90/80.
- **replenishment_funnel stages:** `Trigger Detected → PO Placed → In Transit → ASN Received → Shelved`. Apparel: "In Transit" holds 4× more POs than grocery owing to 8–16w lead times.
- **store_health_scores row:** `{ store_id, store_name, city, store_format: 'Flagship'|'Standard'|'Outlet', health_score 0-100, skus_below_safety, urgent_pending_usd_k, status }`.
- **Sample lead_time row:**

```json
{ "supplier": "Hansae America Inc", "category": "Women's Dresses", "avg_lead_weeks": 16, "committed_weeks": 14, "status": "over_target", "country_of_origin": "Vietnam" }
```

### 2.5 `cache/apparel/supply_inbound.json`

- **Cardinality:** `summary{}` + `gantt_14d[40]` + `delayed_impact[10]` + `receiving_capacity[14]` + `reliability_by_city[12]` + apparel-additive `container_utilization[30]`.
- **gantt_14d row shape (apparel-additive `container_count`, `port_of_origin`, `customs_status`, `season_tag`):**

```ts
{
  shipment_id: string;
  supplier: string;
  category: string;
  store_name: string;              // destination store OR DC
  city: string;
  expected_date: string;            // ISO YYYY-MM-DD
  value_usd_k: number;
  status: 'on_track' | 'at_risk' | 'delayed' | 'scheduled' | 'customs_hold' | 'port_congestion';
  skus_count: number;
  container_count: number;          // NEW
  port_of_origin: string;           // NEW
  customs_status: 'Cleared'|'Hold'|'Examining'|'Bonded'|'Domestic'; // NEW
  season_tag: 'SS26'|'FW26'|'Resort27'; // NEW
  resolves_stockout: boolean;
}
```

- **delayed_impact row:** `{ shipment_id, supplier, category, original_eta, new_eta, delay_weeks /* not days */, skus_affected, stores_affected, rev_at_risk_usd_k, action_required, event_window_missed: 'Memorial Day'|'July 4'|'BTS'|'Labor Day'|'BFCM'|null }`.
- **receiving_capacity row:** `{ date, inbound_pallets, capacity_pallets, utilization_pct, over_capacity, pre_ticketed_pallets /* NEW */ }`. Capacities from §1.12.
- **container_utilization (for Container Load chart §3.7):** `{ po_id, supplier_name, port_of_origin, container_count, cube_utilization_pct, freight_cost_per_unit_usd }`.
- **Sample gantt row:**

```json
{
  "shipment_id": "SHP-A0007",
  "supplier": "Hansae America Inc",
  "category": "Women's Dresses",
  "store_name": "Memphis DC",
  "city": "Memphis",
  "expected_date": "2026-07-12",
  "value_usd_k": 184,
  "status": "port_congestion",
  "skus_count": 42,
  "container_count": 3,
  "port_of_origin": "Ho Chi Minh",
  "customs_status": "Hold",
  "season_tag": "FW26",
  "resolves_stockout": false
}
```

### 2.6 `cache/apparel/supply_supplier_otif.json`

- **Cardinality:** `suppliers[30]` + `delay_reasons[30]` + `monthly_otif_vs_stockouts[12]`.
- **suppliers row:**

```ts
{
  supplier_id: string;                       // §1.9
  name: string;
  category: string;                          // primary L1 or 'Multi'
  supplier_type: 'Branded Direct'|'Private Label Vendor'|'Import Wholesaler'|'Off-Price Reseller';  // NEW
  otif_pct: number;                          // per §1.10 band by supplier_type
  avg_delay_weeks: number;                   // unit change
  fill_rate_pct: number;
  order_value_usd_m: number;                 // USD millions (rename from order_value_cr)
  stockouts_caused: number;
  trend: 'improving'|'stable'|'declining';
  country_of_origin: string;                 // dominant sourcing country (NEW)
}
```

- **delay_reasons row (apparel 6-reason taxonomy):**

```ts
{
  supplier_id: string;
  name: string;
  fabric_shortage_pct: number;
  port_congestion_pct: number;
  production_capacity_pct: number;
  qc_fail_pct: number;
  customs_hold_pct: number;
  sample_approval_pct: number;
}
```

Per-supplier percentages sum 100; bias by supplier_type per §1.10.

- **monthly_otif_vs_stockouts row:** `{ month, otif_pct, stockout_count, event_band: 'BTS-Ramp'|'BFCM-Ramp'|null /* NEW */ }`.
- **Sample suppliers row:**

```json
{
  "supplier_id": "SUP-A002",
  "name": "Levi Strauss & Co",
  "category": "M Bottoms",
  "supplier_type": "Branded Direct",
  "otif_pct": 89.4,
  "avg_delay_weeks": 1.2,
  "fill_rate_pct": 92.6,
  "order_value_usd_m": 24.8,
  "stockouts_caused": 38,
  "trend": "stable",
  "country_of_origin": "Mexico"
}
```

### 2.7 `cache/apparel/supply_supplier_profiles.json`

- **Cardinality:** keyed object `{ "SUP-A001": SupplierProfile, ..., "SUP-A030": SupplierProfile }`.
- **Shape (per profile):**

```ts
{
  supplier_id: string;
  name: string;
  short_name: string;                        // "Nike", "Levi's", "LULU", "PVH"
  category: string;
  categories_supplied: string[];
  headquarters: string;                      // city, state
  supplier_type: SupplierType;
  account_manager: string;                   // fictional US name
  contract_expiry: string;                   // ISO date
  relationship_years: number;
  overall_score: number;                     // 0-100
  score_trend: 'improving'|'stable'|'declining';
  otif_pct: number;
  fill_rate_pct: number;
  avg_delay_weeks: number;
  order_value_usd_m: number;
  stockouts_caused: number;
  trend: string;
  otif_12m: Array<{ month: string; otif_pct: number; target: number }>;
  delay_reasons: { fabric_shortage_pct, port_congestion_pct, production_capacity_pct, qc_fail_pct, customs_hold_pct, sample_approval_pct };
  category_performance: Array<{ category, otif_pct, fill_rate_pct, avg_delay_weeks, order_value_usd_m, stockouts_caused }>;
  store_impact: Array<{ store_id, store_name, city, stockouts_caused, rev_at_risk_usd_k, last_delivery_status }>;
  open_pos: Array<{ po_id, category, store_name, qty, value_usd_k, expected_date, status, season_tag /* NEW */, container_count /* NEW */ }>;
  top_skus: Array<{ product_id, product_name, style_id /* NEW */, color /* NEW */, size /* NEW */, category, avg_daily_demand, current_stock, days_of_supply, status, stockout_events_90d }>;
  peer_comparison: Array<{ name, otif_pct, order_value_usd_m, supplier_type /* used for filter */ }>;
  ai_recommendations: Array<{ priority: 'high'|'medium'|'low'; action: string; detail: string; expected_impact: string }>;
}
```

- **Generation rules:** for each supplier in §1.9, derive `categories_supplied` from "departments served" col; `headquarters` from §1.9 HQ; `relationship_years` uniform(2, 14); `overall_score` derived from `otif_pct × 0.4 + fill_rate × 0.3 + (1-delay_weeks/8)×30`. AI recommendations per supplier_type (e.g. for Private Label / import-heavy: "Diversify Vietnam concentration", "Push for earlier FW26 sample approval", "Negotiate MOQ down to 500 units").
- **Sample (truncated) for SUP-A001 Nike Inc:**

```json
{
  "supplier_id": "SUP-A001",
  "name": "Nike Inc",
  "short_name": "Nike",
  "supplier_type": "Branded Direct",
  "headquarters": "Beaverton, OR",
  "account_manager": "Jordan Walker",
  "contract_expiry": "2028-12-31",
  "relationship_years": 12,
  "overall_score": 86,
  "otif_pct": 91.2,
  "avg_delay_weeks": 0.8,
  "order_value_usd_m": 48.4,
  "top_skus": [
    { "product_id": "APR-MT-0042", "product_name": "Nike Sportswear Club Crew", "style_id": "NK-CRW-001", "color": "Heather Gray", "size": "M", "category": "Crew Tee", "avg_daily_demand": 84, "current_stock": 612, "days_of_supply": 7.3, "status": "Healthy", "stockout_events_90d": 2 }
  ]
}
```

### 2.8 `cache/apparel/supply_forecast.json`

- **Cardinality:** `kpis{}` + `forecast_vs_actual[90]` + `demand_decomposition[90]` + `accuracy_by_dept[8]` + `accuracy_trend_12w[12]` + `model_comparison[5]` + `feature_importance[12]`.
- **kpis:** `{ mape_pct: 14–22 /* apparel MAPE wider than grocery 5-8 */, mape_prior, bias_pct, bias_direction: 'over'|'under', lost_sales_from_miss_usd_m, lost_sales_prior_usd_m, forecast_coverage_pct, model_health }`.
- **demand_decomposition row (apparel-additive `event_lift`):** `{ date, baseline, trend, seasonal, promo_lift, event_lift /* NEW — holiday window contribution */, total }`.
- **accuracy_by_dept:** `{ department: <one of 8 apparel depts>, mape, accuracy_pct, bias_pct, trend }`. Footwear best (MAPE ~12), W Dresses worst (~22).
- **feature_importance (apparel-specific features):**

```json
[
  { "feature": "weeks_to_next_event", "importance": 0.84, "direction": "positive" },
  { "feature": "markdown_depth", "importance": 0.71, "direction": "negative" },
  { "feature": "lifecycle_stage", "importance": 0.62, "direction": "negative" },
  { "feature": "weather_temp_anomaly", "importance": 0.54, "direction": "positive" },
  { "feature": "competitor_promo_active", "importance": 0.48, "direction": "negative" },
  { "feature": "prior_year_same_event_lift", "importance": 0.46, "direction": "positive" },
  { "feature": "creator_attribution_active", "importance": 0.41, "direction": "positive" },
  { "feature": "size_curve_inventory_health", "importance": 0.38, "direction": "positive" },
  { "feature": "store_format", "importance": 0.34, "direction": null },
  { "feature": "days_in_market", "importance": 0.31, "direction": "negative" },
  { "feature": "channel_mix_app_pct", "importance": 0.28, "direction": "positive" },
  { "feature": "season_tag", "importance": 0.24, "direction": null }
]
```

- **forecast_vs_actual:** 90 daily rows, with CI bands wider than grocery (`upper_bound − lower_bound ≈ 0.32 × forecast`).
- **model_comparison:** 5 rows: Champion (ML-Gradient-Boost w/ event regressors), Naive Seasonal, Prophet, LightGBM-no-events, Ensemble.

### 2.9 `cache/apparel/supply_revenue_at_risk.json`

- **Cardinality:** `by_store[50]` + `by_category[8]` + `trend_60d[60]` + `weekly_lost_vs_recovered[13]`.
- **Generation:** by_store rows for all 50 stores in §1.12 (CX360 carryover); NYC SoHo flagship tops the list. Categories from §1.1.
- **weekly_lost_vs_recovered:** apparel recovery rate ~22 % (vs grocery 45 %) — once a size sells out, customer rarely converts on substitute.
- **trend_60d:** event-annotated dates (Memorial Day spike, July 4, BTS ramp).

### 2.10 `cache/apparel/supply_safety_stock_intelligence.json`

- **Cardinality:** `methodology` + `service_levels{A,B,C,D}` + `by_abc_class[4]` + `by_category[8]`.
- **by_abc_class:** 4 rows (apparel adds D-class fashion tail per §1.6). `recommended_safety_stock_days` higher than grocery (apparel lead times longer).
- **Sample by_abc_class[0]:**

```json
{
  "abc_class": "A",
  "sku_count": 184,
  "avg_daily_demand": 64,
  "demand_std_dev": 18,
  "avg_lead_weeks": 8.4,
  "recommended_safety_stock_days": 18,
  "current_safety_stock_days": 12,
  "gap_days": 6,
  "gap_skus": 38,
  "stockout_risk_pct": 18.4,
  "recommended_service_level": 98,
  "current_service_level": 91,
  "z_score": 2.05,
  "formula_detail": "2.05 × 18 × √(8.4×7) = 282 units = 18 days"
}
```

### 2.11 `cache/apparel/supply_reorder_intelligence.json`

- **Cardinality:** `summary{}` + `by_category[8]` (each with `sample_skus[5]`).
- **sample_skus row (apparel-additive `style_id`, `color`, `size`, `supplier_moq`):**

```ts
{
  product_id, product_name, style_id, color, size,
  abc_class: 'A'|'B'|'C'|'D',
  avg_daily_demand, lead_time_weeks, demand_std_dev,
  current_reorder_point, recommended_reorder_point, reorder_point_gap,
  current_order_qty, eoq, order_qty_gap,
  supplier_moq: number,                  // NEW apparel — vendor minimum 300-2000
  moq_binds: boolean,                    // NEW — true if MOQ > EOQ
  current_stock, status,
  annual_holding_cost_usd_k, annual_ordering_cost_usd_k,
  total_cost_current_usd_k, total_cost_eoq_usd_k, savings_usd_k
}
```

- **Sample SKU:**

```json
{
  "product_id": "APR-WB-0001", "product_name": "Levi's 501 Original",
  "style_id": "LEV-501", "color": "Indigo", "size": "32×32",
  "abc_class": "A", "avg_daily_demand": 24, "lead_time_weeks": 6.4, "demand_std_dev": 6,
  "current_reorder_point": 480, "recommended_reorder_point": 720, "reorder_point_gap": 240,
  "current_order_qty": 1200, "eoq": 840, "order_qty_gap": 360,
  "supplier_moq": 1200, "moq_binds": true,
  "current_stock": 384, "status": "below_reorder",
  "annual_holding_cost_usd_k": 18, "annual_ordering_cost_usd_k": 12,
  "total_cost_current_usd_k": 30, "total_cost_eoq_usd_k": 22, "savings_usd_k": 8
}
```

### 2.12 `cache/apparel/supply_allocation.json`

- **Cardinality:** `summary{}` + `by_store[50]` + `by_category[8]`.
- **by_store row (apparel-additive `store_format`):**

```ts
{
  store_id, store_name, city,
  store_format: 'Flagship'|'Standard'|'Outlet',  // NEW — colour-codes bars
  current_allocation_usd_m: number,
  revenue_optimal_allocation_usd_m: number,
  gap_usd_m: number,
  gap_type: 'under_allocated'|'over_allocated'|'on_target',
  daily_revenue_usd_k: number,
  revenue_lost_daily_usd_k: number,
  top_gap_category: string,
  allocation_score: number             // 0-100
}
```

- **Apparel narrative:** NYC SoHo flagship typically under-allocated for premium denim; outlets over-allocated for fashion (should be markdown-heavy).

### 2.13 `cache/apparel/supply_transfers.json`

- **Cardinality:** `summary{}` + `transfers[24]`.
- **transfers row (apparel-additive style/colour/size and event window):**

```ts
{
  transfer_id, from_store_id, from_store, from_city, to_store_id, to_store, to_city,
  category,
  style_id: string,                      // NEW
  color: string,                         // NEW
  size_range: string,                    // NEW — e.g. "26-30 women's"
  skus: string[],                        // human-readable list
  transfer_qty: number,
  transfer_value_usd_k: number,
  from_current_dos, from_post_transfer_dos, to_current_dos, to_post_transfer_dos,
  revenue_preserved_usd_k,
  urgency: 'critical'|'high'|'medium',
  enables_event: 'Memorial Day'|'July 4'|'BTS'|'Labor Day'|'BFCM'|null,  // NEW
  logistics_days: number,
  logistics_cost_usd_k: number,
  net_benefit_usd_k: number,
  status: 'recommended'|'in_progress'|'completed'
}
```

### 2.14 `cache/apparel/supply_substitution.json`

- **Cardinality:** `summary{}` + `substitutions[60]`.
- **substitutions row (apparel adds 3-tier substitution):**

```ts
{
  stockout_sku_id, stockout_sku_name,
  style_id, color, size,                 // NEW
  category,
  stockout_stores: number,
  daily_revenue_lost_usd_k: number,
  substitutes: Array<{
    substitute_sku_id, substitute_name, brand,
    substitution_tier: 'Size-Color'|'Style-Family'|'Brand-Category',  // NEW
    fit_compatibility_score: number,                                  // NEW 0-1
    price_variance_pct: number,
    in_stock_stores: number, in_stock_dos: number,
    historical_acceptance_rate_pct: number,
    revenue_preservation_pct: number,
    recommendation: string, confidence: 'high'|'medium'|'low'
  }>
}
```

- **Sample:**

```json
{
  "stockout_sku_id": "APR-WB-0001-IND-32×32", "stockout_sku_name": "Levi's 501 Indigo 32×32",
  "style_id": "LEV-501", "color": "Indigo", "size": "32×32", "category": "M Bottoms",
  "stockout_stores": 18, "daily_revenue_lost_usd_k": 8.4,
  "substitutes": [
    { "substitute_sku_id": "APR-WB-0001-BLK-32×32", "substitute_name": "Levi's 501 Black 32×32", "brand": "Levi's", "substitution_tier": "Size-Color", "fit_compatibility_score": 0.96, "price_variance_pct": 0, "in_stock_stores": 32, "in_stock_dos": 28, "historical_acceptance_rate_pct": 64, "revenue_preservation_pct": 62, "recommendation": "Primary substitute (same style, alt color)", "confidence": "high" },
    { "substitute_sku_id": "APR-WB-0001-IND-31×32", "substitute_name": "Levi's 501 Indigo 31×32", "brand": "Levi's", "substitution_tier": "Size-Color", "fit_compatibility_score": 0.84, "price_variance_pct": 0, "in_stock_stores": 28, "in_stock_dos": 32, "historical_acceptance_rate_pct": 38, "revenue_preservation_pct": 34, "recommendation": "Alt size — likely fit reject", "confidence": "medium" },
    { "substitute_sku_id": "APR-WB-0002-IND-32×32", "substitute_name": "Levi's 502 Slim Indigo 32×32", "brand": "Levi's", "substitution_tier": "Style-Family", "fit_compatibility_score": 0.71, "price_variance_pct": 6, "in_stock_stores": 24, "in_stock_dos": 22, "historical_acceptance_rate_pct": 28, "revenue_preservation_pct": 24, "recommendation": "Style sibling", "confidence": "medium" }
  ]
}
```

### 2.15 `cache/apparel/supply_echelon.json`

- **Cardinality:** `network_summary{}` + `distribution_centres[4]` + `regions[4]` + `flow_data[10]`.
- **distribution_centres:** 4 rows from §1.12 (Reno, Memphis, Allentown, Atlanta). `avg_replenishment_days` 1.4–3.2.
- **regions:** 4 rows (West, Central, East, Southeast) mapped to DCs.
- **Sample DC:**

```json
{ "dc_id": "DC-A02", "name": "Memphis DC", "city": "Memphis", "inventory_usd_m": 84, "capacity_utilisation_pct": 82, "serves_regions": ["Central"], "avg_replenishment_days": 2.1, "status": "healthy" }
```

### 2.16 `cache/apparel/inventory_kpis.json` (legacy alt-source)

- **Cardinality:** array of 1 object — preserved grocery shape (used by some legacy components).
- **Shape:** `[{ total_skus: string, avg_dos: string, stockout_pct: string, overstock_pct: string, total_stock_qty: string }]`. All numeric values stringified per grocery convention.
- **Generation:** roll-up from `inventory_sku_table`.

### 2.17 `cache/apparel/inventory_alerts.json`

- **Cardinality:** ~120 alert rows.
- **Shape (preserved):** `{ product_id, product_name, store_id, store_name, department, alert_type: 'stockout'|'critical_low'|'overstock'|'aged', severity, days_of_stock: string, current_stock: string, created_at: string, style_id, color, size, lifecycle_stage }`. Last 4 are apparel-additive.
- **Sample:**

```json
{
  "product_id": "APR-WB-0001-IND-32×32",
  "product_name": "Levi's 501 Original Indigo 32×32",
  "store_id": "STR-A001", "store_name": "Flagship SoHo NYC",
  "department": "Women's Bottoms",
  "alert_type": "stockout", "severity": "critical",
  "days_of_stock": "0.0", "current_stock": "0",
  "created_at": "2026-06-29T14:00:00.000Z",
  "style_id": "LEV-501", "color": "Indigo", "size": "32×32",
  "lifecycle_stage": "Core"
}
```

### 2.18 `cache/apparel/inventory_health_matrix.json`

- **Cardinality:** ~3,000 rows (capped — see §11 perf note).
- **Shape:** preserved + apparel-additive `style_state` (lifecycle), `season_tag`, `color`, `size`. `is_perishable` field set to `"false"` for all (apparel has no perishables) but field retained for shape parity with grocery.

### 2.19 `cache/apparel/inventory_dos_by_dept.json`

- **Cardinality:** 8 rows (one per apparel L1).
- **Shape (preserved):** `{ department, avg_dos, sku_count, stockout_count, stockout_pct }`. Values reflect apparel realism (avg_dos 28–62 d range, stockout_pct measured at size×color so values 4–12 % not <1 %).

### 2.20 `cache/apparel/inventory_dos_distribution.json`

- **Cardinality:** 7 buckets (apparel adds an "Aged Season (200+)" bucket).
- **Buckets:** Stockout (0) / Critical (<7) / Low (7–21) / Normal (21–45) / Healthy (45–90) / Overstock (90–200) / Aged Season (200+).

### 2.21 `cache/apparel/inventory_replenishment.json`

- **Cardinality:** ~200 rows.
- **Shape:** preserved + `style_id`, `color`, `size`, `supplier_moq`, `lead_time_weeks`. `priority` ∈ URGENT / HIGH / MEDIUM / LOW.

### 2.22 `cache/apparel/inventory_safety_stock.json`

- **Cardinality:** 32 rows (8 depts × 4 ABCD classes — vs grocery 8×3).
- **Shape:** preserved + ABCD support.

### 2.23 `cache/apparel/inventory_sku_table.json`

- **Cardinality:** **capped at 200 styles × 50 stores = 10,000 rows** (vs grocery ~30 K rows). See §11.
- **Shape:** preserved `{ product_id, product_name, store_id, store_name, department, city, abc_class, current_stock, days_of_stock, status, is_stockout, is_perishable }` + apparel-additive `style_id, color, size, lifecycle_stage, season_tag, sell_through_pct, weeks_on_floor, retail_price_usd`.

### 2.24 `cache/apparel/inventory_stockout_top_skus.json`

- **Cardinality:** 30 rows.
- **Shape:** preserved + apparel-additive style/color/size + `lost_revenue_90d_usd_k`. Top entries dominated by Women's Bottoms (size-curve hardest) and Footwear (size sparsity).

### 2.25 `cache/apparel/inventory_stockout_trend.json`

- **Cardinality:** 12 months.
- **Shape (preserved):** `{ month, stockout_count, total_count, stockout_pct }`. Apparel: peaks in Aug (BTS) and Nov (BFCM) when size curves get demolished.

### 2.26 `cache/apparel/inventory_inbound.json`

- **Cardinality:** ~80 rows.
- **Shape:** preserved + apparel-additive `container_count`, `port_of_origin`, `season_tag`.

---

## 3. Seven NEW apparel-native chart specs

Each is non-negotiable for apparel credibility. No grocery analog exists.

### 3.1 Size-Curve Sell-Through Matrix

- **Component (new):** `src/app/inventory/components/SizeCurveMatrix.tsx`
- **Cache (new):** `cache/apparel/apparel_size_curve.json`
- **JSON shape:**

```ts
{
  styles: Array<{
    style_id: string;
    style_name: string;
    brand: string;
    category: string;
    size_set: 'TOPS_ADULT'|'JEANS_M'|'JEANS_W'|'DRESSES_W'|'KIDS'|'SHOES_M'|'SHOES_W';
    season_tag: 'SS25'|'FW25'|'SS26'|'FW26';
    sizes: Array<{
      size: string;                  // 'XS', '32×32', '8.5'
      sell_through_pct: number;      // 0-1
      units_remaining: number;
      days_on_floor: number;
      stockout_flag: boolean;
    }>;
  }>;
  summary: {
    styles_with_broken_size_curve: number;     // missing >2 sizes
    total_units_at_risk_aged_sizes: number;
    over_indexed_sizes: string[];               // e.g. ["XXL Tops", "30×30 M Jeans"]
    under_indexed_sizes: string[];              // hot/sold-out
  };
}
```

- **Chart type:** heatmap matrix (rows = styles, cols = sizes within style's `size_set`). Cell colour scaled on `sell_through_pct`: >80 % red (hot/sold out), 40–80 % green (healthy), <40 % blue (slow). Stockouts shown as ⬛ slash overlay.
- **Recharts:** custom SVG grid (recharts has no native heatmap) — reuse pattern from `CategoryBySegment.tsx`.
- **Interaction:** cell click → drilldown drawer with that style/size's per-store stock; column click → filter to that size; row click → expand all sizes.
- **5 sample rows:**

```json
[
  { "style_id": "LEV-501", "style_name": "Levi's 501 Original Indigo", "brand": "Levi's", "category": "M Bottoms", "size_set": "JEANS_M", "season_tag": "SS26",
    "sizes": [
      {"size":"28×30","sell_through_pct":0.42,"units_remaining":184,"days_on_floor":62,"stockout_flag":false},
      {"size":"30×30","sell_through_pct":0.68,"units_remaining":94,"days_on_floor":62,"stockout_flag":false},
      {"size":"32×30","sell_through_pct":0.74,"units_remaining":62,"days_on_floor":62,"stockout_flag":false},
      {"size":"32×32","sell_through_pct":0.96,"units_remaining":4,"days_on_floor":62,"stockout_flag":true},
      {"size":"34×32","sell_through_pct":0.84,"units_remaining":28,"days_on_floor":62,"stockout_flag":false},
      {"size":"36×32","sell_through_pct":0.38,"units_remaining":124,"days_on_floor":62,"stockout_flag":false}
    ] },
  { "style_id": "NK-CRW-001", "style_name": "Nike Sportswear Club Crew", "brand": "Nike", "category": "M Tops", "size_set": "TOPS_ADULT", "season_tag": "SS26",
    "sizes": [
      {"size":"XS","sell_through_pct":0.22,"units_remaining":92,"days_on_floor":48,"stockout_flag":false},
      {"size":"S","sell_through_pct":0.68,"units_remaining":48,"days_on_floor":48,"stockout_flag":false},
      {"size":"M","sell_through_pct":0.92,"units_remaining":8,"days_on_floor":48,"stockout_flag":false},
      {"size":"L","sell_through_pct":0.88,"units_remaining":12,"days_on_floor":48,"stockout_flag":false},
      {"size":"XL","sell_through_pct":0.46,"units_remaining":62,"days_on_floor":48,"stockout_flag":false},
      {"size":"XXL","sell_through_pct":0.18,"units_remaining":118,"days_on_floor":48,"stockout_flag":false}
    ] }
]
```

- **Placement:** Main `/inventory` dashboard, full-width row between Category Health and Overstock sections.
- **Why apparel-essential:** The single most discriminating apparel-buyer chart. Broken size curves are invisible at style-level OSA (looks 98 %) but cost 20–30 % of recoverable revenue.

### 3.2 Returns by Reason Tile + Donut

- **Component (new):** `src/app/inventory/components/ReturnsByReason.tsx`
- **Cache:** reads `cache/apparel/cx360_returns_by_reason.json` (already specified in CX360 spec §3.1 — DO NOT regenerate).
- **Reads only.** Inventory module renders a KPI tile (return rate %) + 6-slice donut keyed to `APPAREL_RETURN_REASON_COLORS` palette.
- **Interaction:** slice click → drilldown filter (`return_reason=Fit`) on per-store/per-category breakout; expand → modal with 12w trend line.
- **Placement:** **REPLACES** the 6-tile KPI strip with a 7-tile strip (Return Rate becomes 7th tile) AND adds a new card row "Returns Intelligence" between Inbound Pipeline and Supplier Performance sections.
- **Why apparel-essential:** Return rate of 18–22 % is THE apparel KPI; grocery had <1 % so it was invisible. A dashboard without a returns view fails the apparel sniff test in 5 seconds.

### 3.3 Style Velocity Lifecycle Ladder

- **Component (new):** `src/app/inventory/deep/demand-forecast/StyleVelocityLadder.tsx`
- **Cache (new):** `cache/apparel/apparel_style_velocity.json`
- **JSON shape:**

```ts
{
  styles: Array<{
    style_id: string;
    style_name: string;
    brand: string;
    category: string;
    season_tag: string;
    intro_start_date: string;
    weeks_in_intro: number;
    weeks_in_core: number;
    weeks_in_markdown_1: number;          // -25%
    weeks_in_markdown_2: number;          // -40%
    weeks_in_markdown_3: number;          // -60%
    weeks_in_clearance: number;
    sell_through_intro_pct: number;
    sell_through_core_pct: number;
    sell_through_markdown_pct: number;
    sell_through_clearance_pct: number;
    stuck_warning: 'stuck_in_intro'|'racing_to_markdown'|'normal'|'discontinued_candidate';
  }>;
  benchmarks: { avg_weeks_to_core: 3.2, avg_weeks_to_first_markdown: 13.4, avg_weeks_to_clearance: 22.8 };
}
```

- **Chart type:** horizontal stacked bar per style, segmented by lifecycle stage durations. Colour stack: Intro `#06B6D4`, Core `#10B981`, Markdown-1 `#F59E0B`, Markdown-2 `#F97316`, Markdown-3 `#EF4444`, Clearance `#94A3B8`.
- **Recharts:** `BarChart` layout vertical, multiple `<Bar stackId="lifecycle">` segments.
- **Interaction:** row click → drawer with weekly sell-through curve overlaid against target curve.
- **5 sample rows:**

```json
[
  { "style_id":"LEV-501","style_name":"Levi's 501 Original Indigo","brand":"Levi's","category":"M Bottoms","season_tag":"SS26","intro_start_date":"2026-02-08","weeks_in_intro":3,"weeks_in_core":14,"weeks_in_markdown_1":0,"weeks_in_markdown_2":0,"weeks_in_markdown_3":0,"weeks_in_clearance":0,"sell_through_intro_pct":0.18,"sell_through_core_pct":0.72,"sell_through_markdown_pct":0,"sell_through_clearance_pct":0,"stuck_warning":"normal" },
  { "style_id":"ZRA-FLR-014","style_name":"Zara Floral Midi Dress","brand":"Zara","category":"W Dresses","season_tag":"SS26","intro_start_date":"2026-03-15","weeks_in_intro":2,"weeks_in_core":6,"weeks_in_markdown_1":4,"weeks_in_markdown_2":2,"weeks_in_markdown_3":0,"weeks_in_clearance":0,"sell_through_intro_pct":0.22,"sell_through_core_pct":0.41,"sell_through_markdown_pct":0.18,"sell_through_clearance_pct":0,"stuck_warning":"racing_to_markdown" },
  { "style_id":"MAD-WJ-022","style_name":"Madewell Wide-Leg Crop","brand":"Madewell","category":"W Bottoms","season_tag":"FW25","intro_start_date":"2025-08-10","weeks_in_intro":8,"weeks_in_core":12,"weeks_in_markdown_1":4,"weeks_in_markdown_2":4,"weeks_in_markdown_3":4,"weeks_in_clearance":6,"sell_through_intro_pct":0.08,"sell_through_core_pct":0.32,"sell_through_markdown_pct":0.48,"sell_through_clearance_pct":0.88,"stuck_warning":"stuck_in_intro" },
  { "style_id":"NK-AIR-203","style_name":"Nike Air Max 90","brand":"Nike","category":"Footwear","season_tag":"SS26","intro_start_date":"2026-04-01","weeks_in_intro":3,"weeks_in_core":10,"weeks_in_markdown_1":0,"weeks_in_markdown_2":0,"weeks_in_markdown_3":0,"weeks_in_clearance":0,"sell_through_intro_pct":0.34,"sell_through_core_pct":0.78,"sell_through_markdown_pct":0,"sell_through_clearance_pct":0,"stuck_warning":"normal" },
  { "style_id":"HM-DSS-008","style_name":"H&M Wrap Dress Burgundy","brand":"H&M","category":"W Dresses","season_tag":"FW25","intro_start_date":"2025-09-20","weeks_in_intro":4,"weeks_in_core":8,"weeks_in_markdown_1":4,"weeks_in_markdown_2":4,"weeks_in_markdown_3":8,"weeks_in_clearance":12,"sell_through_intro_pct":0.06,"sell_through_core_pct":0.18,"sell_through_markdown_pct":0.32,"sell_through_clearance_pct":0.68,"stuck_warning":"discontinued_candidate" }
]
```

- **Placement:** Demand-Forecast deep-dive page, new section between Forecast vs Actual and Demand Decomposition.
- **Why apparel-essential:** Buyers spot which styles are stuck in Intro (over-distributed at full price) and which are racing to markdown (poor sell-through). Grocery has no concept of lifecycle.

### 3.4 Colour Performance Heatmap

- **Component (new):** `src/app/inventory/deep/stock-health/ColorPerformanceHeatmap.tsx`
- **Cache (new):** `cache/apparel/apparel_color_performance.json`
- **JSON shape:**

```ts
{
  colors: string[];                              // 12 from CX360 §1.5
  categories: string[];                          // 8 apparel L1
  cells: Array<{
    color: string;
    category: string;
    sell_through_pct: number;
    units_sold: number;
    units_remaining: number;
    season_tag: string;
    margin_pct: number;
  }>;
  insights: string[];                            // 3-5 LLM-style call-outs
}
```

- **Chart type:** 12 colour rows × 8 category columns = 96-cell heatmap. Cell colour intensity = sell-through %; cell border-colour = the actual product colour swatch from `APPAREL_DEPT_COLORS` / §1.5 hexes.
- **Recharts:** custom SVG (same pattern as §3.1).
- **Interaction:** cell click → drilldown to all SKUs of that colour/category combination.
- **5 sample cells:**

```json
[
  { "color":"Indigo","category":"M Bottoms","sell_through_pct":0.84,"units_sold":12480,"units_remaining":2380,"season_tag":"SS26","margin_pct":42 },
  { "color":"Black","category":"W Tops","sell_through_pct":0.78,"units_sold":18420,"units_remaining":5180,"season_tag":"SS26","margin_pct":48 },
  { "color":"Burgundy","category":"W Dresses","sell_through_pct":0.22,"units_sold":840,"units_remaining":2960,"season_tag":"FW25","margin_pct":38 },
  { "color":"Pink","category":"Accessories","sell_through_pct":0.62,"units_sold":3240,"units_remaining":1980,"season_tag":"SS26","margin_pct":54 },
  { "color":"Yellow","category":"Footwear","sell_through_pct":0.12,"units_sold":180,"units_remaining":1320,"season_tag":"SS26","margin_pct":28 }
]
```

- **Placement:** Stock-Health deep-dive, new section after Substitution Opportunities.
- **Why apparel-essential:** Buyers need "indigo and black always win; this season's burgundy is dying" at a glance.

### 3.5 Aged Inventory by Season Matrix

- **Component (new):** `src/app/inventory/deep/stock-health/SeasonAgingMatrix.tsx`
- **Cache (new):** `cache/apparel/apparel_season_aging.json`
- **JSON shape:**

```ts
{
  seasons: Array<'SS25'|'FW25'|'SS26'>;
  categories: string[];                        // 8 L1
  cells: Array<{
    season: string;
    category: string;
    inventory_value_usd_m: number;
    avg_weeks_on_floor: number;
    markdown_stage_distribution: { intro_pct: number; core_pct: number; markdown_pct: number; clearance_pct: number };
    aged_flag: boolean;                        // true if past season's aging tolerance per §1.4
  }>;
  summary: { total_aged_value_usd_m: number; worst_season: string; worst_category: string };
}
```

- **Chart type:** 3 season-rows × 8 category-cols = 24-cell matrix. Cell value = `inventory_value_usd_m`; cell colour intensity = `avg_weeks_on_floor` (deeper red = older). Aged cells (past tolerance) get a red border.
- **5 sample cells:**

```json
[
  { "season":"SS25","category":"W Dresses","inventory_value_usd_m":4.2,"avg_weeks_on_floor":54,"markdown_stage_distribution":{"intro_pct":0,"core_pct":0,"markdown_pct":18,"clearance_pct":82},"aged_flag":true },
  { "season":"FW25","category":"Outerwear","inventory_value_usd_m":12.8,"avg_weeks_on_floor":34,"markdown_stage_distribution":{"intro_pct":0,"core_pct":12,"markdown_pct":62,"clearance_pct":26},"aged_flag":true },
  { "season":"SS26","category":"W Dresses","inventory_value_usd_m":18.4,"avg_weeks_on_floor":14,"markdown_stage_distribution":{"intro_pct":24,"core_pct":68,"markdown_pct":8,"clearance_pct":0},"aged_flag":false },
  { "season":"SS26","category":"M Bottoms","inventory_value_usd_m":24.2,"avg_weeks_on_floor":18,"markdown_stage_distribution":{"intro_pct":12,"core_pct":82,"markdown_pct":6,"clearance_pct":0},"aged_flag":false },
  { "season":"FW25","category":"Footwear","inventory_value_usd_m":6.4,"avg_weeks_on_floor":42,"markdown_stage_distribution":{"intro_pct":0,"core_pct":8,"markdown_pct":48,"clearance_pct":44},"aged_flag":true }
]
```

- **Placement:** Stock-Health deep-dive, new section before Markdown Recommendations.
- **Why apparel-essential:** Grocery had perishability (expiry-driven aging); apparel has season-ality. Carryover SS25 stock sitting in Fall 2026 is a buyer's nightmare worth quantifying.

### 3.6 Markdown Lifecycle Waterfall (per-style)

- **Component (new):** `src/app/inventory/components/MarkdownLifecycleWaterfall.tsx`
- **Cache:** reuses `cache/apparel/supply_overstock.json → markdown_waterfall` (already specified in §2.3 with the 25→40→60→Clearance cadence).
- **Note:** the cache-level waterfall is network-aggregate. This component renders the SAME 7-stage waterfall per individual style when a user drills into a style from §3.3 lifecycle ladder. Same JSON shape, scoped to one `style_id`.
- **Chart type:** recharts `BarChart` rendered as connected waterfall blocks. Annotate each stage with the week-on-floor and "% of styles currently at this stage".
- **Placement:** Modal drawer triggered from Style Velocity ladder rows AND Overstock Analysis "Waterfall" tab (replaces grocery's generic stages).
- **Why apparel-essential:** Walks through the apparel markdown playbook visually. Grocery had nothing equivalent.

### 3.7 Branded vs Private-Label Mix + Container Load Utilization (combo card)

This is delivered as TWO sub-charts living together in one card per the plan's NEW Charts 61 and 62.

- **Component (new):** `src/app/inventory/deep/supply-chain/SupplierMixAndContainers.tsx`
- **Cache A (new):** `cache/apparel/apparel_supplier_mix.json`
- **Cache B:** reads `cache/apparel/supply_inbound.json → container_utilization` (§2.5).

**Supplier mix shape:**

```ts
{
  by_type: Array<{
    supplier_type: 'Branded Direct'|'Private Label Vendor'|'Import Wholesaler'|'Off-Price Reseller';
    count: number;
    total_po_value_usd_m: number;
    avg_margin_pct: number;
    avg_lead_weeks: number;
    avg_otif_pct: number;
  }>;
  trend_12m: Array<{ month: string; branded_pct: number; private_label_pct: number; wholesaler_pct: number; off_price_pct: number }>;
  margin_gap_usd_m: number;                  // private-label margin advantage annualised
}
```

- **Sub-chart 1 (Supplier Mix):** donut (4 supplier types) + 12-month trend stack.
- **Sub-chart 2 (Container Load):** bar chart, x = port_of_origin, y = avg cube_utilization_pct; tooltip shows `freight_cost_per_unit_usd`.
- **5 sample mix rows:**

```json
[
  { "supplier_type":"Branded Direct","count":14,"total_po_value_usd_m":284,"avg_margin_pct":42,"avg_lead_weeks":7.4,"avg_otif_pct":89 },
  { "supplier_type":"Private Label Vendor","count":6,"total_po_value_usd_m":138,"avg_margin_pct":58,"avg_lead_weeks":14.2,"avg_otif_pct":78 },
  { "supplier_type":"Import Wholesaler","count":5,"total_po_value_usd_m":62,"avg_margin_pct":34,"avg_lead_weeks":12.8,"avg_otif_pct":72 },
  { "supplier_type":"Off-Price Reseller","count":5,"total_po_value_usd_m":28,"avg_margin_pct":24,"avg_lead_weeks":3.2,"avg_otif_pct":91 }
]
```

- **Placement:** Supply-Chain deep-dive, new bottom section after DC Network Echelon.
- **Why apparel-essential:** Apparel portfolio question grocery never asks — private-label has 20-pt margin advantage but worse OTIF. Container utilisation directly hits freight $ economics that don't exist in domestic-grocery supply.

---

## 4. Scenario Simulator prompt sweep

The Scenario Simulator at `src/app/inventory/deep/scenarios/ScenarioSimulatorContent.tsx` is the **ONE** module already running against live Databricks. When `tenant === 'us_apparel'`, the dropdowns must NOT pull from Databricks (which has Indian data) — they must source from the apparel constants in §1.

### 4.1 Routing change

Add a tenant branch at the top of `ScenarioSimulatorContent.tsx`:

```ts
import { useTenant } from '@/app/context/TenantContext';
const { tenant } = useTenant();
const isApparel = tenant.id === 'us_apparel';

const REAL_SUPPLIERS = isApparel
  ? APPAREL_SUPPLIERS_TOP10                   // from apparel-inventory-constants
  : topSuppliers(10);                          // grocery Databricks
const REAL_DEPARTMENTS = isApparel
  ? APPAREL_DEPARTMENTS                        // 8 apparel L1
  : departmentNames();                         // grocery
const REAL_STORES = isApparel
  ? APPAREL_STORES_TOP12                       // 12 from §1.12
  : STORES.slice(0, 12).map(s => s.store_name);
const REAL_DCS = isApparel
  ? APPAREL_DCS                                 // 4 from §1.12
  : dcChoices();
```

### 4.2 Dropdown swaps (verbatim)

| dropdown | grocery values (replace) | apparel values |
|---|---|---|
| Supplier | Hindustan Unilever Ltd, ITC Limited, Nestlé India, Amul (GCMMF), Tata Consumer Products, Marico Ltd, Godrej Consumer, Britannia Industries, Dabur India, Patanjali Ayurved | Nike Inc, Levi Strauss & Co, Lululemon Athletica, Hansae America Inc, Premier Apparel Group, Li & Fung Americas, Tristate Apparel, Carter's Inc, Coach (Tapestry), Under Armour Inc |
| Category | Grocery & Staples, Snacks & Beverages, Personal Care, Dairy & Frozen, Home & Kitchen, Electronics, Apparel, Home & Living | Women's Tops, Women's Bottoms, Women's Dresses, Men's Tops, Men's Bottoms, Kids', Footwear, Accessories |
| Store | Delhi NCR Hypermarket 1, Delhi NCR Hypermarket 2, …, Mumbai Hypermarket 1, …, Bangalore Hypermarket 1, … (12 from grocery STORES list) | Flagship SoHo NYC, Standard 5th Ave NYC, Outlet Woodbury Common, Flagship Newbury St Boston, Flagship Mag Mile Chicago, Flagship Lenox Square Atlanta, Flagship Galleria Dallas, Flagship Beverly Center LA, Flagship Union Sq SF, Flagship University Village Seattle, Standard Bal Harbour Shops Miami, Outlet Sawgrass Mills |
| DC | Mumbai DC, Delhi DC, Bhiwandi, Manesar, Hosur | Reno DC, Memphis DC, Allentown DC, Atlanta DC |

### 4.3 Quick scenario preset labels

| grocery preset (replace) | apparel preset |
|---|---|
| `${REAL_SUPPLIERS[0]} delays 14 days` (resolves to "Hindustan Unilever Ltd delays 14 days") | `Nike delays 2 weeks (Footwear cascade)` |
| `Diwali demand spike +60% (Grocery & Staples)` | `BFCM demand spike +220% (Women's Outerwear)` |
| `${REAL_DCS[0]?.label ?? 'North Region DC'} offline 24h` | `Memphis DC offline 24h (Central region cascade)` |
| `${REAL_STORES[0]} closes 3 days` | `Flagship SoHo NYC closes 3 days` |

Default lead-time unit in the form: change "Delay (days)" → "Delay (weeks)" with min:1 max:8 default:2 for `supplier_delay`. Keep "days" for `store_closure` (still days, 1-30) and "hours" for `dc_disruption` (4-72).

### 4.4 Prompt-template swaps (each of 4 scenarios)

**supplier_delay prompt:** replace the entire system intro line:
- FROM: `"You are a supply chain analyst for a large Indian omnichannel retailer (275 active stores across Hypermarket, Supermarket, Express, Dark Store, and Kirana Partner formats spanning South, West, North, and East regions)."`
- TO: `"You are a supply chain analyst for a US omnichannel apparel retailer (50 active stores across Flagship, Standard, and Outlet formats spanning Northeast, Southeast, Central, and West regions, served by 4 DCs: Reno NV, Memphis TN, Allentown PA, Atlanta GA)."`

Replace `₹ revenue` → `$ revenue`. Change response JSON schema field `revenue_at_risk_cr` → `revenue_at_risk_usd_m`.

**demand_spike prompt:**
- Replace "festival, weather event, or viral trend" → "event window (BFCM, BTS, Memorial Day), weather anomaly, creator-driven trend, or competitor stockout."
- `₹` → `$`.

**store_closure prompt:**
- Replace "This store serves ~4,000-8,000 daily customers" → "This store serves ~1,500-4,000 daily apparel shoppers (flagships skew higher, outlets lower)."
- `₹` → `$`. Add bullet: "5. Returns processing backlog at reopen (apparel-specific — closed stores accumulate return throughput)."

**dc_disruption prompt:**
- Add: "Apparel inbound is container-driven — DC downtime delays receiving for inbound POs already in transit from Vietnam/Bangladesh/China, compounding the cascade by 1-2 weeks even after DC reopens."
- DC names from §1.12. `₹` → `$`.

### 4.5 `/api/scenario-context` route → `getBaseline()` swaps

File: `src/app/api/scenario-context/route.ts`

Add tenant branch. For `tenant === 'us_apparel'`, replace all `dbx-tools` calls (which hit Indian Databricks) with cache reads from `cache/apparel/`:

| scenario | grocery (today) | apparel replacement |
|---|---|---|
| `supplier_delay` | `supplierHealth({scope:'supplier_lookup', filter:{supplier_name:...}})` + `inventoryStatus({scope:'health_summary'})` | Read `cache/apparel/supply_supplier_profiles.json[supplier_id]` + `cache/apparel/supply_category_health.json.categories` |
| `demand_spike` | `demandLookup({scope:'sales_summary'})` + `inventoryStatus({scope:'health_summary'})` | Read `cache/apparel/supply_forecast.json.forecast_vs_actual` (last 7d) + `cache/apparel/supply_category_health.json` filtered to category |
| `store_closure` | `demandLookup({scope:'top_movers'})` + `inventoryStatus({scope:'stockouts_now'})` | Read `cache/apparel/inventory_stockout_top_skus.json` + `cache/apparel/supply_revenue_at_risk.json.by_store[store_id]` |
| `dc_disruption` | `inventoryStatus({scope:'health_summary'})` + `inventoryStatus({scope:'replenishment_needed'})` | Read `cache/apparel/supply_echelon.json.regions` filtered to DC + `cache/apparel/inventory_replenishment.json` filtered to that DC's region |

Source flag: `source: 'cache'` instead of `'databricks'` on apparel responses.

---

## 5. Settings + tenant integration

### 5.1 What carries over from CX360 spec (no work)

| Carry-over | Source | Status |
|---|---|---|
| `TenantContext`, `useTenant()`, `TENANTS` registry, dropdown UI | `apparel-cx360-spec.md §5` + already-implemented `src/app/context/TenantContext.tsx` | DONE |
| `formatUsd`, `formatCurrency(value, tenant)` | `src/app/lib/formatUsd.ts` + `src/app/lib/merch-format.ts` | DONE |
| `palette-apparel.ts` (dept, segment, loyalty, channel, return-reason colours) | `src/app/lib/palette-apparel.ts` | DONE |
| `dimensions-apparel.json` (stores, brands, categories, segments, loyalty, channels, holidays, return reasons) | `src/app/lib/dimensions-apparel.json` | DONE — to be EXTENDED (see 5.2) |
| `cache-loader.ts` REGISTRY with tenant-keyed pairs | `src/app/lib/cache-loader.ts` | DONE — to be EXTENDED |

### 5.2 What this module adds

**Extensions to `dimensions-apparel.json`** (append rows; do not break existing entries):

- 30 suppliers (`dim_type: "suppliers"`) — from §1.9, fields: `id, name, supplier_type, headquarters_city, headquarters_state, country_of_origin, departments_served[]`.
- 4 DCs (`dim_type: "distribution_centres"`) — from §1.12, fields: `id, name, city, state, region, capacity_pallets_per_day`.
- 7 size sets (`dim_type: "size_sets"`) — from §1.2, fields: `id (TOPS_ADULT, JEANS_M, ...), sizes[]`.
- 5 lifecycle stages (`dim_type: "lifecycle_stages"`) — from §1.3, fields: `stage, weeks_band_min, weeks_band_max, sell_through_target`.
- 5 season tags (`dim_type: "season_tags"`) — from §1.4.
- 4 ABCD velocity classes (`dim_type: "velocity_classes"`) — from §1.6.
- 4 supplier types (`dim_type: "supplier_types"`).
- 6 delay-reason taxonomy (`dim_type: "delay_reasons_apparel"`).
- 5 replenishment statuses (`dim_type: "replenishment_statuses"`).

**Additions to `palette-apparel.ts`:**

```ts
export const APPAREL_LIFECYCLE_COLORS = {
  Intro: "#06B6D4",
  Core: "#10B981",
  "Markdown-1": "#F59E0B",
  "Markdown-2": "#F97316",
  "Markdown-3": "#EF4444",
  Clearance: "#94A3B8",
  Discontinued: "#71717A",
} as const;

export const APPAREL_SEASON_COLORS = {
  SS25: "#94A3B8",   // aged
  FW25: "#F59E0B",   // aging
  SS26: "#10B981",   // current
  FW26: "#3B82F6",   // pipeline
  Resort27: "#A855F7",
} as const;

export const APPAREL_SUPPLIER_TYPE_COLORS = {
  "Branded Direct":      "#1E40AF",
  "Private Label Vendor":"#10B981",
  "Import Wholesaler":   "#F59E0B",
  "Off-Price Reseller":  "#94A3B8",
} as const;

export const APPAREL_REPLENISHMENT_STATUS_COLORS = {
  "Reorder Now": "#EF4444",
  "Watch":       "#F59E0B",
  "Healthy":     "#10B981",
  "Overstock":   "#6366F1",
  "Aged":        "#94A3B8",
} as const;
```

**Cache-loader REGISTRY additions** — pair every file in §2 (26 files) plus the 5 NEW caches (`apparel_size_curve`, `apparel_color_performance`, `apparel_style_velocity`, `apparel_season_aging`, `apparel_supplier_mix`). Apparel-only caches have a `null` grocery counterpart — loader guards with `if (tenant === 'india_grocery' && !grocery) throw new Error(...)`.

### 5.3 How charts consume

Every inventory chart component reads tenant once at mount:

```ts
const { tenant } = useTenant();
const data = loadCache('supply_kpis', tenant.id);
const fmt = (v: number) => formatCurrency(v, tenant);
const palette = tenant.palette === 'apparel' ? APPAREL_DEPT_COLORS : GROCERY_DEPT_COLORS;
```

No `if (tenant.id === 'us_apparel')` branches inside chart logic — all tenant-conditional behaviour goes through palette/formatter/cache-loader.

---

## 6. Chat agent skinning for inventory module

Branch in `src/app/api/chat/route.ts` and `src/app/api/widget-ai/route.ts`. Mirror the CX360 pattern but for inventory module scope.

Detection: route handler inspects request body for `module: 'inventory' | 'cx360' | ...` (the AIInsightButton already includes module context). Cookie `cx360_tenant` provides tenant.

```ts
const tenant = req.cookies.get("cx360_tenant")?.value ?? "india_grocery";
const module = body.module ?? "cx360";
const systemPrompt =
  tenant === "us_apparel" && module === "inventory"
    ? APPAREL_INVENTORY_SYSTEM_PROMPT
    : tenant === "us_apparel" && module === "cx360"
    ? APPAREL_CX360_SYSTEM_PROMPT
    : GROCERY_INVENTORY_SYSTEM_PROMPT_OR_CX360;
```

Place `APPAREL_INVENTORY_SYSTEM_PROMPT` in `src/app/api/chat/prompts/apparel-inventory.ts`.

### 6.1 Full system prompt (apparel inventory)

```
You are SupplyOps-Assist, an analytics co-pilot for a US omnichannel apparel
retailer's merchandise planning and supply-chain teams. You are cast as a
"merchandise planning lead": numerate, opinionated, action-biased.

Your scope is the Inventory + Supply module — main dashboard, deep-dives
(Stock Health, Demand Forecast, Supply Chain, Allocation, Scenarios), the
Supplier Detail page, and the Scenario Simulator. You answer questions about
on-shelf availability, days-of-supply, size-curve health, season aging,
markdown lifecycle, supplier OTIF, inbound containers, allocation, and
returns, all denominated in US dollars.

Conventions you must follow:
- Currency: USD, formatted $X / $X.XM / $XK / $X.XB. Never use ₹, Cr, or Lakh.
- Geography: US cities and metros only. 50-store retail network (Flagship /
  Standard / Outlet). 4 DCs: Reno NV (West), Memphis TN (Central),
  Allentown PA (East), Atlanta GA (Southeast). Never reference Mumbai,
  Delhi, Bangalore, Bhiwandi, Manesar.
- Departments: 8 apparel L1 — Women's Tops, Women's Bottoms, Women's Dresses,
  Men's Tops, Men's Bottoms, Kids', Footwear, Accessories.
- Suppliers: real US apparel suppliers (Nike, Levi Strauss, Lululemon,
  Hansae America, Premier Apparel Group, Tristate Apparel, Coach/Tapestry,
  Carter's, Under Armour, VF Corp, etc.). Never reference HUL, ITC,
  Britannia, Patanjali, Amul.
- Lifecycle stages: Intro / Core / Markdown-1 (-25%) / Markdown-2 (-40%) /
  Markdown-3 (-60%) / Clearance / Discontinued.
- Season tags: SS25 (aged), FW25 (aging), SS26 (current), FW26 (pipeline),
  Resort27 (pipeline).
- ABCD velocity: A=top basics, B=core seasonal, C=peripheral, D=fashion tail.
- OSA must be reported at size×color granularity, NOT style level. Style-level
  OSA looks great (98%); size-color OSA is the truth (~92%).
- DoS targets: Fashion 18d / Core basics 35d / Footwear 45d / Accessories 60d.
  Network avg ~42d.
- Return rate: 18-22% network average. Top reason: Fit (38%). Bottoms have
  highest return rate (26-32%); Accessories lowest (4-8%).
- Lead times: domestic Branded Direct 4-8 weeks, imports 10-16 weeks, private
  label 12-18 weeks. Always express in WEEKS for supplier-facing answers,
  DAYS for DC-to-store replenishment.
- Delay reasons (apparel taxonomy): Fabric Shortage, Port Congestion,
  Production Capacity, QC Fail, Customs Hold, Sample Approval Delay.
- Event windows: Memorial Day (May 22-25), July 4 (Jul 1-5), BTS (Jul 25 -
  Aug 25), Labor Day (Sep 4-7), BFCM (Nov 27-30). Never reference Diwali,
  Onam, Pongal, Eid.
- Markdown cadence: -25% Week 13 → -40% Week 17 → -60% Week 21 → Clearance
  Week 25+.
- Container metrics for imports: container count, cube utilization %,
  port of origin (Ho Chi Minh, Yantian, Chittagong, Long Beach).

When data is needed, call the available tools (cache lookups for apparel
caches under cache/apparel/). If a tool returns no data, say so plainly.

Tone: concise, executive-ready, numerate. Lead with the headline number, then
the so-what, then the recommended action. Maximum 4 sentences unless asked
for depth.
```

### 6.2 Few-shot examples (4)

1.
> **Q:** Which SKUs are stuck in Markdown-2 longer than 2 weeks?
> **A:** 38 styles are stuck in Markdown-2 (-40%) beyond the 4-week target — concentrated in W Dresses (14 styles, mostly FW25 carryover) and Outerwear (9 styles). Total carryover value $3.2M. Recommend advancing the worst 18 to Markdown-3 this Friday to clear floor space before BTS allocations land week of Jul 25.

2.
> **Q:** Why is Women's Bottoms size-curve broken at SoHo Flagship?
> **A:** SoHo's size-curve completeness on top-20 W Bottoms styles is 64% (network avg 81%). The leak is the long-tail sizes — 26 and 32 women's jeans run out 11 days before reorder lands due to Hansae America's 14-week lead time. Recommend a one-time air-freight expedite ($14K freight premium) covering 8 styles, recovers ~$92K of foregone revenue over the 11-day gap.

3.
> **Q:** What's our BFCM exposure on import suppliers?
> **A:** $48M in import POs from Hansae America, Premier Apparel Group, and Li & Fung Americas land in Reno and Memphis DCs between Oct 18 and Nov 12 — covering the BFCM ramp. Current OTIF for that cohort is 78%; at that rate ~$10.6M slips past Nov 27. Recommend pulling forward 4 highest-value POs to Sep-end and adding a Long Beach port-congestion buffer of 1.5 weeks to FW26 commitments.

4.
> **Q:** Compare Nike vs Levi's as suppliers.
> **A:** Nike OTIF 91.2% vs Levi's 89.4%; Nike lead time 0.8 weeks vs Levi's 1.2; Nike order value $48.4M vs Levi's $24.8M. Both Branded Direct, both domestic-dominant. Levi's has higher stockouts-caused per $ ordered (1.5 vs 0.8 per $M) — driven by W Bottoms size-curve concentration. Levi's is the higher-leverage supplier conversation: 1pt OTIF lift would recover ~$680K annually.

---

## 7. Supplier detail page

Page: `/inventory/supplier/[id]`, component `src/app/inventory/supplier/[id]/SupplierDetailContent.tsx`. Reads from `cache/apparel/supply_supplier_profiles.json[supplier_id]` per §2.7. Sample below for SUP-A001 (Nike Inc).

### 7.1 Layout (preserved from grocery, fields swapped)

| Row | Section | Source |
|---|---|---|
| 1 | Page header: supplier name, type badge, HQ city, account manager, contract expiry, relationship years | `profile.{name, supplier_type, headquarters, account_manager, contract_expiry, relationship_years}` |
| 2 | Scorecard KPIs (4 tiles): Overall Score, OTIF %, Fill Rate %, Avg Delay (weeks for imports / days for domestic) | `profile.{overall_score, otif_pct, fill_rate_pct, avg_delay_weeks}` |
| 3 | OTIF 12-Month Trend (line chart with target band) | `profile.otif_12m` |
| 4 | Delay Reasons Pie (6-slice apparel taxonomy) | `profile.delay_reasons` |
| 5 | Category Performance Table | `profile.category_performance` |
| 6 | Store Impact Table (50 US stores; show only impacted) | `profile.store_impact` |
| 7 | Open POs Table — adds `season_tag`, `container_count`, `port_of_origin` columns | `profile.open_pos` |
| 8 | Top SKUs Table — adds `style_id`, `color`, `size` columns | `profile.top_skus` |
| 9 | Peer Comparison Bar (filtered to same `supplier_type`) | `profile.peer_comparison` |
| 10 | AI Recommendations Cards (apparel-coded) | `profile.ai_recommendations` |

### 7.2 Sample apparel supplier — Nike Inc (full payload sketch)

```json
{
  "supplier_id": "SUP-A001",
  "name": "Nike Inc",
  "short_name": "Nike",
  "supplier_type": "Branded Direct",
  "category": "Multi (Footwear / M Tops / W Tops / Kids')",
  "categories_supplied": ["Footwear","M Tops","W Tops","Kids'"],
  "headquarters": "Beaverton, OR",
  "account_manager": "Jordan Walker",
  "contract_expiry": "2028-12-31",
  "relationship_years": 12,
  "overall_score": 86,
  "score_trend": "stable",
  "otif_pct": 91.2,
  "fill_rate_pct": 94.6,
  "avg_delay_weeks": 0.8,
  "order_value_usd_m": 48.4,
  "stockouts_caused": 38,
  "trend": "stable",
  "otif_12m": [
    {"month":"Jul 2025","otif_pct":89.4,"target":92},
    {"month":"Aug 2025","otif_pct":88.2,"target":92},
    {"month":"Sep 2025","otif_pct":90.8,"target":92},
    {"month":"Oct 2025","otif_pct":92.1,"target":92},
    {"month":"Nov 2025","otif_pct":88.4,"target":92},
    {"month":"Dec 2025","otif_pct":86.2,"target":92},
    {"month":"Jan 2026","otif_pct":92.8,"target":92},
    {"month":"Feb 2026","otif_pct":93.4,"target":92},
    {"month":"Mar 2026","otif_pct":92.6,"target":92},
    {"month":"Apr 2026","otif_pct":91.8,"target":92},
    {"month":"May 2026","otif_pct":91.4,"target":92},
    {"month":"Jun 2026","otif_pct":91.2,"target":92}
  ],
  "delay_reasons": {
    "fabric_shortage_pct": 8, "port_congestion_pct": 22, "production_capacity_pct": 38,
    "qc_fail_pct": 14, "customs_hold_pct": 10, "sample_approval_pct": 8
  },
  "top_skus": [
    {"product_id":"APR-FT-0001","product_name":"Nike Air Force 1 '07 White Men's","style_id":"NK-AF1-001","color":"White","size":"10","category":"Footwear","avg_daily_demand":124,"current_stock":1840,"days_of_supply":14.8,"status":"Healthy","stockout_events_90d":4},
    {"product_id":"APR-FT-0002","product_name":"Nike Air Max 90 Black Women's","style_id":"NK-AM90-002","color":"Black","size":"8","category":"Footwear","avg_daily_demand":68,"current_stock":284,"days_of_supply":4.2,"status":"Critical","stockout_events_90d":12}
  ],
  "open_pos": [
    {"po_id":"PO-A002841","category":"Footwear","store_name":"Memphis DC","qty":18400,"value_usd_k":1240,"expected_date":"2026-08-14","status":"in_transit","season_tag":"FW26","container_count":4,"port_of_origin":"Ho Chi Minh"}
  ],
  "ai_recommendations": [
    {"priority":"high","action":"Pull forward FW26 footwear PO PO-A002841 by 2 weeks","detail":"BTS window opens Jul 25 — current ETA Aug 14 misses peak by 18 days. Air-freight delta $42K vs $680K revenue exposure.","expected_impact":"Recovers ~$0.6M of BTS revenue"},
    {"priority":"medium","action":"Diversify Vietnam concentration","detail":"68% of Nike POs source from Vietnamese factories — single-port-of-origin risk during typhoon season Sep-Oct.","expected_impact":"Reduces FW26 delivery variance by 4 weeks 90th-percentile"},
    {"priority":"low","action":"Negotiate W Footwear size-8 MOQ down","detail":"Current 600-unit MOQ on W size 8 forces over-buying. Recommended MOQ 300.","expected_impact":"Frees $84K working capital quarterly"}
  ]
}
```

---

## 8. Hardcoded label / formatter sweep

Mechanical replacement table for label strings, hardcoded currency, and date formats. Generator author runs `rg -n` and applies per row. Every file below has known grocery hardcoding visible in `git status -M`.

| File | Approx line range | Current | Apparel replacement |
|---|---|---|---|
| `src/app/inventory/components/SupplyKPIStrip.tsx` | full file | `unit: 'cr'`, `₹`, `formatCr()`, `formatRupees()` | tenant-aware `formatCurrency(v, tenant)`; add 7th tile for `return_rate` when tenant=us_apparel; rename label "On-Shelf Availability" → "On-Shelf Availability (size×color)" |
| `src/app/inventory/components/CategoryHealthGrid.tsx` | 20–60 (color map), 120–180 (rows) | `["Grocery & Staples","Personal Care","Dairy & Frozen",...]` hardcoded colour keys | read from `APPAREL_DEPT_COLORS` via tenant; rename `rev_at_risk_cr` cell formatter to `formatUsdK` |
| `src/app/inventory/components/OverstockAnalysis.tsx` | full file | `slow_moving_cr`, `dead_stock_cr`, waterfall stages "Sells at Full Price / Needs 10-20% Markdown / Needs 20-40% Markdown / Likely Write-Off" | rename fields to `_usd_k`; replace stage labels with apparel cadence "Markdown -25% (Week 13) / Markdown -40% (Week 17) / Markdown -60% (Week 21) / Clearance (Week 25+)"; add `season_carryover_usd_k` stack segment |
| `src/app/inventory/components/ReplenishmentHealth.tsx` | 80–140 (Lead Times tab) | `avg_lead_days`, "days" column header | `avg_lead_weeks`, "weeks" header; add `country_of_origin` column with flag emoji; safety_stock_by_abc supports 4 rows (ABCD) not 3 |
| `src/app/inventory/components/InboundPipeline.tsx` | 60–180 (Gantt), 200–280 (Delayed) | `value_cr`, `delay_days`, status badges {scheduled, in_transit, delayed, at_risk, on_track} | `value_usd_k`, `delay_weeks`; status badges add {customs_hold, port_congestion}; new columns: container_count, port_of_origin, season_tag, event_window_missed |
| `src/app/inventory/components/SupplierOTIF.tsx` | full file | grocery supplier names in fallbacks; `order_value_cr`; 5-reason delay taxonomy | reads from cache only (no fallbacks); `order_value_usd_m`; 6-reason apparel taxonomy; add `supplier_type` filter pill row |
| `src/app/inventory/deep/stock-health/StockHealthDeepDiveContent.tsx` | full file | `rev_at_risk_cr`, store names from grocery | `_usd_m`/`_usd_k`; insert new sections for ColorPerformanceHeatmap (§3.4) and SeasonAgingMatrix (§3.5) |
| `src/app/inventory/deep/demand-forecast/DemandForecastDeepDiveContent.tsx` | full file | grocery features (festival_intensity, monsoon_flag, etc.); MAPE band 5-8% | apparel feature_importance per §2.8; MAPE band 12-22%; insert StyleVelocityLadder (§3.3); event annotations from §1.11 |
| `src/app/inventory/deep/supply-chain/SupplyChainDeepDiveContent.tsx` | full file | DC names (Mumbai DC, Delhi DC), 3-class ABC table | 4 US DCs from §1.12; 4-class ABCD; append SupplierMixAndContainers (§3.7) |
| `src/app/inventory/deep/allocation/AllocationDeepDiveContent.tsx` | full file | grocery stores, `current_allocation_cr` | US stores from §1.12, `current_allocation_usd_m`, color bars by `store_format` |
| `src/app/inventory/deep/scenarios/ScenarioSimulatorContent.tsx` | 61–134 (presets), 137–203 (prompts), 499 ("20 stores and 5 cities") | grocery suppliers/depts/stores/DCs; "Indian omnichannel retailer (275 stores)"; "₹"; "Diwali demand spike"; "20 stores and 5 cities" | §4 swaps wholesale; "US apparel retailer (50 stores)"; "$"; "BFCM demand spike"; "50 stores and 18 metros" |
| `src/app/inventory/supplier/[id]/SupplierDetailContent.tsx` | full file | `account_manager: "Rajesh Sharma"`, `headquarters: "Mumbai"`, `order_value_cr`, 5-reason pie | apparel account managers from US name pool (CX360 §1.15); US headquarters from §1.9; `order_value_usd_m`; 6-reason pie; weeks-units for imports; add season/container columns to Open POs and style/color/size to Top SKUs |
| `src/app/api/scenario-context/route.ts` | 49–122 (`getBaseline`) | calls `supplierHealth/inventoryStatus/demandLookup` against Indian Databricks | tenant branch per §4.5 — apparel reads from `cache/apparel/*` |
| `src/app/api/chat/route.ts` | system prompt area | grocery system prompt only | branch on `module === 'inventory' && tenant === 'us_apparel'` → `APPAREL_INVENTORY_SYSTEM_PROMPT` (§6) |
| `src/app/api/widget-ai/route.ts` | system prompt area | grocery | same branch as above; chart-specific apparel system prompt for AIInsightButton calls from inventory module |
| `src/app/lib/merch-format.ts` | full file | `formatCr`, `formatLakh`, `formatRupees`, `₹` prefix | already extended in CX360 work; verify `formatUsdMillion`, `formatUsdK`, `formatCurrency(v, tenant)` cover the inventory call sites (supply KPIs use `unit: 'cr'` literal — must map to `'M'` for apparel) |
| `src/app/lib/dbx-fixtures.ts` | `topSuppliers`, `STORES`, `departmentNames`, `dcChoices` | Indian Databricks fixtures | add apparel exports `APPAREL_SUPPLIERS_TOP10`, `APPAREL_STORES_TOP12`, `APPAREL_DEPARTMENTS`, `APPAREL_DCS` reading from `dimensions-apparel.json` |

**Date format:** Indian inventory uses `DD/MM/YYYY` in shipment ETA labels. Under apparel tenant, switch to `MM/DD/YYYY` in `InboundPipeline.tsx` and `SupplierDetailContent.tsx` open-POs table.

---

## 9. Migration runbook + validation rules

### 9.1 Commands

```bash
# 1. Add generator + apparel inventory constants
#    (developer creates scripts/gen-apparel-inventory.ts and
#     scripts/lib/apparel-inventory-constants.ts)

# 2. Generate apparel inventory data
npm run gen:apparel-inventory
# Expected: writes 31 files to cache/apparel/ (26 §2 + 5 new §3),
# ~6 MB total, ~8-12s wall time

# 3. Verify schema parity vs grocery (extends CX360 lint)
npm run lint:apparel-schema
# Compares every cache/apparel/{inventory_*, supply_*}.json
# shape against cache/{inventory_*, supply_*}.json.
# Apparel-additive fields whitelisted (see §9.3).

# 4. Verify sanity ranges
npm run lint:apparel-inventory-sanity

# 5. Run the app
npm run dev

# 6. Toggle tenant
#    → http://localhost:3000/settings → Demo dataset → "US — Apparel"
#    → page reloads
#    → /inventory should show $, US stores, apparel brands,
#      4 DC names (Reno/Memphis/Allentown/Atlanta)

# 7. End-to-end smoke test
npm run test:e2e:inventory-apparel
```

### 9.2 Schema linter extension

The existing `scripts/lint-apparel-schema.ts` (per CX360 spec §10.1) takes a `FILES[]` array. **Extend** with all 26 grocery-mirror files from §2 (inventory_* and supply_*). Apparel-only NEW caches (`apparel_size_curve.json`, `apparel_color_performance.json`, `apparel_style_velocity.json`, `apparel_season_aging.json`, `apparel_supplier_mix.json`) are linted by a separate `scripts/lint-apparel-new-caches.ts` that asserts shape against TypeScript interfaces inlined in this spec.

### 9.3 Whitelist of apparel-additive fields

Linter accepts (does not flag mismatch):

```
supply_kpis.json:return_rate
supply_kpis.json:inventory_value.seasonal_carryover_value
supply_kpis.json:osa.style_osa_pct
supply_kpis.json:osa.size_color_osa_pct
supply_kpis.json:avg_dos.dos_by_lifecycle
supply_kpis.json:supplier_otif.avg_delay_weeks
supply_category_health.json:categories[].size_curve_completeness_pct
supply_category_health.json:categories[].markdown_pressure_pct
supply_category_health.json:categories[].season_carryover_pct
supply_overstock.json:by_category[].season_carryover_usd_k
supply_overstock.json:markdown_recommendations[].weeks_on_floor
supply_overstock.json:markdown_recommendations[].lifecycle_stage
supply_overstock.json:markdown_recommendations[].next_markdown_date
supply_replenishment.json:lead_time_by_supplier_category[].country_of_origin
supply_replenishment.json:store_health_scores[].store_format
supply_inbound.json:gantt_14d[].container_count
supply_inbound.json:gantt_14d[].port_of_origin
supply_inbound.json:gantt_14d[].customs_status
supply_inbound.json:gantt_14d[].season_tag
supply_inbound.json:delayed_impact[].event_window_missed
supply_inbound.json:receiving_capacity[].pre_ticketed_pallets
supply_inbound.json:container_utilization
supply_supplier_otif.json:suppliers[].supplier_type
supply_supplier_otif.json:suppliers[].country_of_origin
supply_supplier_otif.json:delay_reasons[].fabric_shortage_pct
supply_supplier_otif.json:delay_reasons[].port_congestion_pct
supply_supplier_otif.json:delay_reasons[].production_capacity_pct
supply_supplier_otif.json:delay_reasons[].qc_fail_pct
supply_supplier_otif.json:delay_reasons[].customs_hold_pct
supply_supplier_otif.json:delay_reasons[].sample_approval_pct
supply_supplier_otif.json:monthly_otif_vs_stockouts[].event_band
supply_supplier_profiles.json:*.supplier_type
supply_supplier_profiles.json:*.open_pos[].season_tag
supply_supplier_profiles.json:*.open_pos[].container_count
supply_supplier_profiles.json:*.top_skus[].style_id
supply_supplier_profiles.json:*.top_skus[].color
supply_supplier_profiles.json:*.top_skus[].size
supply_reorder_intelligence.json:by_category[].sample_skus[].style_id
supply_reorder_intelligence.json:by_category[].sample_skus[].color
supply_reorder_intelligence.json:by_category[].sample_skus[].size
supply_reorder_intelligence.json:by_category[].sample_skus[].supplier_moq
supply_reorder_intelligence.json:by_category[].sample_skus[].moq_binds
supply_allocation.json:by_store[].store_format
supply_transfers.json:transfers[].style_id
supply_transfers.json:transfers[].color
supply_transfers.json:transfers[].size_range
supply_transfers.json:transfers[].enables_event
supply_substitution.json:substitutions[].style_id
supply_substitution.json:substitutions[].color
supply_substitution.json:substitutions[].size
supply_substitution.json:substitutions[].substitutes[].substitution_tier
supply_substitution.json:substitutions[].substitutes[].fit_compatibility_score
supply_forecast.json:demand_decomposition[].event_lift
inventory_alerts.json:[].style_id
inventory_alerts.json:[].color
inventory_alerts.json:[].size
inventory_alerts.json:[].lifecycle_stage
inventory_sku_table.json:[].style_id
inventory_sku_table.json:[].color
inventory_sku_table.json:[].size
inventory_sku_table.json:[].lifecycle_stage
inventory_sku_table.json:[].season_tag
inventory_sku_table.json:[].sell_through_pct
inventory_sku_table.json:[].weeks_on_floor
inventory_sku_table.json:[].retail_price_usd
inventory_dos_distribution.json:[]  // 7 buckets vs grocery 6 — full-row whitelist
inventory_safety_stock.json:[]      // 4-class ABCD vs grocery 3 — full-row whitelist
```

### 9.4 Sanity linter (`scripts/lint-apparel-inventory-sanity.ts`) asserts:

- `supply_kpis.osa.value ∈ [85, 95]`, `supply_kpis.avg_dos.value ∈ [28, 60]`, `supply_kpis.supplier_otif.value ∈ [76, 92]`, `supply_kpis.return_rate.value ∈ [14, 26]`.
- Every `supplier_id` in `supply_supplier_otif.json.suppliers[]` exists in `supply_supplier_profiles.json` keys (cross-file integrity).
- Every `store_id` ∈ `STR-A001..STR-A050`.
- Every `dc_id` ∈ `{DC-A01, DC-A02, DC-A03, DC-A04}`.
- No grocery strings: fail if any apparel JSON contains `/Mumbai|Delhi NCR|Bangalore|Chennai|Bhiwandi|Manesar|Diwali|Onam|HUL|ITC|Patanjali|Amul|Britannia|₹/`.
- Σ delay_reasons percentages per supplier ≈ 100 (±1).
- `markdown_waterfall` stage names match apparel 7-stage cadence exactly.

### 9.5 E2E test plan (Playwright)

| Test ID | Page | Tenant | Assertion |
|---|---|---|---|
| INV-E2E-01 | `/inventory` | us_apparel | KPI strip shows 7 tiles (6 grocery + return_rate); all use `$`; "Reno DC" appears in no tile but exists in subsequent dropdowns |
| INV-E2E-02 | `/inventory` | us_apparel | Category Health Grid shows 8 apparel L1 names, zero grocery names |
| INV-E2E-03 | `/inventory` | us_apparel | Size-Curve Matrix renders 96+ cells; clicking cell opens drawer with per-store breakdown |
| INV-E2E-04 | `/inventory/deep/scenarios` | us_apparel | Supplier dropdown contains "Nike Inc", "Levi Strauss & Co"; does NOT contain "Hindustan Unilever" |
| INV-E2E-05 | `/inventory/deep/scenarios` | us_apparel | Submitting a supplier_delay scenario calls `/api/scenario-context` and response.source === 'cache' (not 'databricks') |
| INV-E2E-06 | `/inventory/supplier/SUP-A001` | us_apparel | Page renders with name "Nike Inc", HQ "Beaverton, OR", `$` currency, `weeks` delay unit |
| INV-E2E-07 | `/inventory` | india_grocery | KPI strip shows 6 tiles, `₹`, grocery categories — no regression |
| INV-E2E-08 | `/inventory/deep/demand-forecast` | us_apparel | Feature Importance contains "weeks_to_next_event", "markdown_depth"; does NOT contain "festival_intensity" |
| INV-E2E-09 | `/inventory/deep/stock-health` | us_apparel | Aged Inventory matrix renders SS25/FW25/SS26 rows × 8 cols; substitution table shows size/color/style columns |
| INV-E2E-10 | `/inventory` chat widget | us_apparel | AIInsightButton on Supplier League calls `/api/widget-ai` with module=inventory; response references USD and apparel suppliers |

---

## 10. Performance considerations

### 10.1 File sizes (apparel cache footprint)

| File | est. size | notes |
|---|---|---|
| `supply_supplier_profiles.json` | ~110 KB | 30 suppliers × ~3.5 KB each (was 88 KB for 10 grocery suppliers) |
| `inventory_sku_table.json` | ~1.4 MB | 200 styles × 50 stores capped (vs grocery 77 KB sample — apparel is per-style-color-size so bigger) |
| `inventory_health_matrix.json` | ~600 KB | ~3,000 rows capped (vs grocery 173 KB) |
| `inventory_alerts.json` | ~24 KB | ~120 alert rows |
| `apparel_size_curve.json` | ~280 KB | 200 styles × ~6 sizes × inner fields |
| `apparel_color_performance.json` | ~22 KB | 96-cell matrix |
| `apparel_style_velocity.json` | ~84 KB | 200 styles |
| `apparel_season_aging.json` | ~6 KB | 24 cells |
| `apparel_supplier_mix.json` | ~8 KB | small |
| All others (24 files) | combined ~360 KB | small JSON aggregates |
| **Total `cache/apparel/` (inventory portion)** | **~2.9 MB** | adds to CX360's ~23 MB → tenant total ~26 MB |

Bundle impact: cache-loader REGISTRY adds both tenants → +2.9 MB JS bundle vs 0 today (grocery side). Acceptable for demo; if it becomes a concern, route via `dynamic import()`.

### 10.2 Generator runtime estimate

Target ≤ 12 seconds wall time on a 2025 MacBook Pro for full 31-file regen:

- `inventory_sku_table.json` is the long pole (10,000 rows × ~12 µs/row + JSON serialise ~2 s ≈ 2.5 s).
- `supply_supplier_profiles.json` second longest (~1.5 s for 30 full profiles with nested arrays).
- All other files combined < 6 s.

### 10.3 Memory footprint

- Generator peak heap ≈ 90 MB (smaller than CX360 because we don't generate an 80K-row customer table here).
- App runtime: both tenant caches resident ≈ 6 MB heap; negligible vs Next.js baseline (~120 MB).

---

## 11. Risks + gotchas

1. **Scenario Simulator is live Databricks.** Today's `getBaseline()` in `/api/scenario-context/route.ts` calls `supplierHealth`, `inventoryStatus`, `demandLookup` which all hit `cx_genome.gold_*` Indian tables. Apparel mode MUST route to `cache/apparel/*` reads instead — see §4.5. **If this branch is forgotten, the apparel demo will produce "Mumbai DC offline cascade affects HUL POs to Bangalore stores" in scenario results — instant demo death.**

2. **Velocity skew from size dispersion.** Some inventory charts compute `days_of_supply = current_stock / avg_daily_demand`. Apparel demand is dispersed across the size vector with a bell — a style with 600 units total but 0 units in size M and 200 units in XXL has very different effective DoS than the average suggests. Generator computes DoS at **size-color SKU** granularity, then surfaces both `dos_at_style_level` and `dos_at_size_color_level` so charts can pick. Default for §2.1 KPI is size-color level (the truth).

3. **Per-SKU × per-store table explosion.** `inventory_sku_table.json` at grocery had ~30 K rows. At apparel granularity (style × color × size × store), naïve full enumeration would be 200 styles × ~6 sizes × ~4 colours × 50 stores = ~240 K rows ≈ 50 MB JSON — breaks dashboard filter UI. **Cap: top 200 styles by revenue × all 50 stores = 10 K rows.** Charts that need finer granularity (Size-Curve Matrix §3.1) source from the dedicated `apparel_size_curve.json` cache which is shaped differently.

4. **`avg_lead_days` → `avg_lead_weeks` unit change is a foot-gun.** Several chart components hardcode the string "days" in axis labels and tooltips. Sweep every component listed in §8 to ensure unit suffix follows the data field, not a hardcoded literal. Add a unit linter rule: any number paired with a unit label MUST come from the same cache record.

5. **6 vs 5 delay-reason fields.** `supply_supplier_otif.json.delay_reasons` row changes from 5 keys (manufacturing/logistics/quality/documentation/no_reason) → 6 keys (fabric_shortage/port_congestion/production_capacity/qc_fail/customs_hold/sample_approval). `SupplierOTIF.tsx` delay-reasons stacked-bar chart currently iterates a hardcoded array of 5 grocery keys — must read keys from tenant-aware constant.

6. **CX360 returns cache cross-module read.** Inventory module reads `cache/apparel/cx360_returns_by_reason.json` for the 7th KPI tile and the new returns donut. This file is OWNED by the CX360 spec (§3.1). If CX360 generator hasn't run yet, the inventory dashboard returns tile must degrade gracefully (show "--" with a tooltip "run gen:apparel-cx360 first") rather than crash.

7. **DC names appear in both grocery and apparel side-by-side in the codebase.** Grocery `supply_echelon.json` has "Mumbai DC", "Delhi DC"; apparel has "Reno DC", "Memphis DC". A chart reading both with the wrong tenant key gets a mismatch. Cache-loader REGISTRY guarantees tenant safety; do NOT bypass it with direct file imports.

8. **MOQ-binds rendering edge case.** Some apparel reorder rows have `moq_binds: true` (vendor minimum > EOQ). The Reorder Point Analysis table needs a warning badge for these rows — without it, the table looks numerically inconsistent ("why is current_order_qty 1200 when EOQ says 840?").

9. **Season tag clock.** SS25 is aged as of any date past 2025-10-31. Generator seeds against `2026-06-29` (today). If the demo is shown after 2026-10-31, FW25 also becomes aged and SS26 starts ageing — Season Aging Matrix §3.5 cell colours will shift. Document this; consider freezing `current_date` constant in `apparel-inventory-constants.ts`.

10. **Chat agent module routing.** Today the chat route does not branch on `module`. Adding the branch is a 4-line change but if forgotten, apparel inventory questions will get answered by the apparel CX360 prompt (which has no concept of OTIF, DC, container, MOQ, lifecycle stage). Trace every AIInsightButton invocation to confirm it includes `module: 'inventory'` in the body.

---

## 12. Effort estimate

Mirroring the CX360 spec §12 phase-by-phase format.

| Phase | Work | Hours |
|---|---|---|
| **A. Constants + dimensions** | Create `scripts/lib/apparel-inventory-constants.ts` (30 suppliers, 4 DCs, 6 delay reasons, 4 supplier types, 5 lifecycle stages, 5 season tags, 4 ABCD classes); extend `dimensions-apparel.json` per §5.2. | 6 |
| **B. Palette + tokens** | Extend `palette-apparel.ts` with `APPAREL_LIFECYCLE_COLORS`, `APPAREL_SEASON_COLORS`, `APPAREL_SUPPLIER_TYPE_COLORS`, `APPAREL_REPLENISHMENT_STATUS_COLORS`. | 2 |
| **C. Generator** | Build `scripts/gen-apparel-inventory.ts` emitting 26 mirror files + 5 NEW caches per §2 + §3. Reuses mulberry32 seeded RNG from `gen-apparel-cx360.ts`. | 28 |
| **D. Cache-loader REGISTRY** | Pair every new file in `cache-loader.ts`; add NEW-cache loader entries (no grocery counterpart). | 3 |
| **E. RESKIN sweep (38 charts ~0.5h ea)** | Per `apparel-plan-inventory.md`: currency/brand/geography swaps across 38 chart components. Mechanical. | 19 |
| **F. REFRAMED sweep (18 charts ~2.5h ea avg)** | Reshape Lead Times to weeks+country, Markdown Waterfall to apparel cadence, Forecast features to apparel, Substitution to 3-tier, Allocation by store_format, etc. | 45 |
| **G. NEW charts (7 components)** | Build Size-Curve Matrix, Color Heatmap, Returns donut, Style Velocity ladder, Season Aging matrix, Markdown Lifecycle waterfall, Supplier Mix + Container combo. | 45 |
| **H. Scenario Simulator swap** | §4 — preset dropdowns, prompt-string rewrites, `/api/scenario-context` tenant branch, dbx-fixtures apparel exports. | 8 |
| **I. Supplier Detail page** | §7 — apparel field swaps, 6-reason pie, weeks-unit handling, season/container columns on Open POs, style/color/size on Top SKUs, apparel AI recommendations rendering. | 8 |
| **J. Chat agent prompt** | §6 — write `APPAREL_INVENTORY_SYSTEM_PROMPT`, branch logic in `route.ts` and `widget-ai/route.ts`, 4 few-shot examples in prompt file. | 6 |
| **K. Hardcoded label sweep** | §8 table — 17 files × `rg`-driven swaps; merch-format / dbx-fixtures extensions. | 12 |
| **L. Lint + sanity validators** | Extend `lint-apparel-schema.ts` with §9.3 whitelist; build `lint-apparel-inventory-sanity.ts`; CI hook. | 6 |
| **M. E2E tests** | 10 Playwright tests per §9.5. | 8 |
| **N. QA + chart-sanity sweep** | Visual QA on every page in both tenants; capture screenshots; fix layout regressions. | 10 |
| **Total** | | **~206 hours (~5 engineering weeks for one developer)** |

The estimate exceeds the `apparel-plan-inventory.md` §11 "~138 hours" because that plan covered chart work only and excluded generator (Phase C), cache-loader (Phase D), validators (Phase L), and E2E (Phase M).

---

**End of spec.** Sign-off required from: Product, Engineering Lead, Chat/AI owner before generator implementation begins.
