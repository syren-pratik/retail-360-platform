# Apparel Cold-Start — Canonical Design Specification

**Version:** v1.0
**Last updated:** 2026-07-02
**Status:** DRAFT — awaiting sign-off
**Owners:** Product (user), Engineering, AI/Chat

**Purpose:** Lock the design of the US-apparel skin of the Cold-Start module so the data-generator, chart-reskins, and 2-3 net-new chart implementations become mechanical execution against a frozen contract.

**Hard scope statement.** This spec covers the Cold-Start module dashboard at `/merchandise/cold-start`, the 18 components under `src/app/merchandise/cold-start/components/`, and the associated cache file `cache/apparel/coldstart.json`. Store-Opening (`/merchandise/cold-start/store-opening`) has its own spec.

**No AI agents in scope** for this sprint.

---

## 1. Domain dictionary

### 1.1 Target market

Apparel Cold-Start models a NEW store launch or NEW brand introduction into an existing US metro. The grocery skin models festival-driven demand cold-start in India cities.

- **Target city:** `Austin` (fastest-growing metro; no existing store)
- **Analog cities:** existing stores in `Dallas`, `Houston`, `Atlanta`, `Phoenix`, `Denver` — matched on demographics, climate, and shopping behavior
- **Launch window:** BTS 2026 (Aug 1 – Sep 5) — largest apparel demand event; ideal for a new-store ramp

### 1.2 Departments (mirrors merch-demand)

Mens, Womens, Kids, Footwear, Accessories.

### 1.3 Cold-start method

Cold-start forecast = lookalike-borrowed from top-3 analog cities + attribute-based prior. Model variants:
- **Baseline (naive average):** MAPE 42%
- **Analog-weighted (top-3):** MAPE 24%
- **Attribute + analog blend:** MAPE 18% (winner)
- **Deep-learning (transformer):** MAPE 21% (rejected — over-fits to Dallas patterns)

### 1.4 External signals

Weather, competitor density, mall foot-traffic index (Placer.ai), local BTS calendar, social-listening apparel demand index.

### 1.5 Festival calendar (repurposed as apparel event calendar)

BTS 2026 (Aug 1 – Sep 5), Labor Day, Halloween ramp-up, BFCM, Holiday. Each event carries a `expected_lift_pct` and `pattern` (early-peak, sustained, late-peak).

### 1.6 Currency

All numerics in USD; grocery field name `_inr` retained for schema parity.

---

## 2. Cache file spec — `cache/apparel/coldstart.json`

Mirrors grocery `cache/coldstart.json` top-level keys:

- `generated_at`
- `target_city: 'Austin'`
- `model_variants[]`: 4 variants above; each has `variant_name, mape_pct, description, selected: boolean`
- `analog_cities[]`: 5 cities; each has `city, weight_pct, similarity_score, key_drivers[]`
- `mape_over_time[]`: 90-day rolling
- `time_buckets[]`, `bucket_metrics[]`: pre/post launch buckets
- `heatmap_cells[]`: dept × sku × MAPE grid
- `sku_holdouts[]`: 25 SKUs for holdout testing
- `festival_uplifts[]`: apparel events with lift %
- `festival_day_pattern[]`: day-by-day pattern within event window
- `kpis`: forecast_accuracy, mape, sku_count, days_to_launch, revenue_at_stake
- `hero_skus[]`: top-6 SKUs to drill on
- `prediction_decomposition[]`: SHAP-like feature attribution
- `sku_drill_series[]`: daily series per hero SKU
- `adaptation_curve[]`: MAPE improvement over first 60 days post-launch
- `festival_category_patterns[]`, `methodology`, `cost_of_mape`, `external_signals`

Apparel-additive fields:
- `brand`, `brand_tier`, `season_tag` on SKUs
- `weather_sensitivity`, `returns_rate_pct` on SKUs
- `analog_cities[].climate_similarity_pct`, `.demo_similarity_pct`, `.competitor_density_similarity_pct`

---

## 3. Net-new apparel-native charts

### 3.1 `ColdstartAnalogCitySimilarity.tsx`

Radar/spider chart per analog city showing similarity across 4 dimensions (climate, demographics, competitor density, apparel spend index). Highlights which cities are strongest analogs for which SKU archetype.

### 3.2 `ColdstartSizeCurveBorrow.tsx`

Shows how size-curve share is borrowed from analog cities per top-5 hero SKUs. Bar chart showing forecast size distribution from each analog contribution.

### 3.3 `ColdstartBrandPenetrationRamp.tsx`

Line chart showing predicted brand vs private-label penetration during first 90 days post-launch. Compares to Dallas cohort baseline.

---

## 4. Chart sweep (Phase D)

18 components — mechanical `₹` / `en-IN` sweep. Route flip `/api/coldstart/payload` from `fs.readFile` to `loadCache`. Text labels like "festival ramp" → "event ramp" for apparel copy alignment.

---

## 5. Phase order + effort

- B (this doc): 4h
- C (generator + lint): 8h
- D (sweep): 6h
- E (2-3 new charts): 8h
- F-slim (E2E + commit): 3h
- **Total: 29h**

---

## 6. Out of scope

- Live weather integration
- Store-Opening (separate module + spec)
- AI agents (future sprint)

**End of spec.**
