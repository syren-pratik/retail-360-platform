# Feature Engineering Review

Generated: 2026-05-20  
Scope: All notebooks in `databricks_export/notebooks/` that produce features

---

## a. Pipeline Architecture

**Pattern:** Linear notebook sequence writing plain Delta tables. Not a feature store.

The pipeline follows this sequence:
```
04b → 07 → 08 → 09 → 10 → 11 (train)
              ↘ 14 (churn train)
```

There is no shared feature registry, no point-in-time correct feature service, and no feature catalog. The Databricks Feature Store registration attempt in notebook 10 is wrapped in `try/except ImportError` and silently fails in this workspace (legacy Hive metastore). The `retail_ml.demand_features_validated` table is a plain Delta table that any notebook can read and overwrite.

**Architecture classification: Notebook sequence with ad-hoc SQL transforms and PySpark windowing.**

There are no SQL views, no DLT pipelines, and no stream-based feature computation. All features are recomputed from scratch on every pipeline run. There is no incremental processing.

**Maturity rating: 2 / 10**

| Dimension | Score | Reason |
|-----------|-------|--------|
| Point-in-time correctness | 0/10 | VPO/outlet features use full history including test period; no time-travel semantics |
| Reusability | 1/10 | Zero features shared between demand and churn models; no feature catalog |
| Testing | 1/10 | One leakage check (lag_7d only); no unit tests; no DLT expectations |
| Operationalization | 2/10 | No serving infrastructure; must re-run full pipeline to get inference features |
| Documentation | 3/10 | Notebooks have comments; no schema registry; no data dictionary |
| Reproducibility | 1/10 | `maturity_encoded` uses `current_date()` at job time; VPO NTILE changes with new data |

**The pipeline will fail "can you operate this in production?" questions on at least five dimensions.**

---

## b. Reusability

### Features shared between demand and churn models
**Zero.** The models share no features.

The demand model draws from `retail_ml.demand_features_validated` (product×store×date grain). The churn model draws directly from `retail_gold.gold_customer_360_v2` (customer grain). Despite the fact that `gold_customer_360` is a downstream product of `gold_demand_daily_sku_store`, no feature is formally shared or re-used between the two training pipelines.

### Features that should be shared but aren't

| Feature family | Demand model | Churn model | Gap |
|---------------|--------------|-------------|-----|
| Price sensitivity / discount depth | `discount_depth`, `price_to_mrp_ratio`, `promo_frequency_90d` | Nothing | Churn model has no price sensitivity signal despite `gold_customer_price_sens` existing in gold layer |
| Product lifecycle / ABC class | `abc_class_encoded`, `lifecycle_encoded` | Nothing | High-value (A-class) customer behavior differs; churn model is blind to this |
| Festival/event sensitivity | 8 calendar features | Nothing | Customer churn risk spikes after festival periods end; signal discarded |
| Weather correlation | 5 weather features | Nothing | Correct exclusion for customer-level model |
| Store outlet classification | 6 outlet features | Nothing | Store throughput tier affects customer retention; discarded |

### Duplicated logic across notebooks

- **`days_since_purchase`** is computed differently in `07_gold_layer.py` (`DATEDIFF(CURRENT_DATE(), ld.full_date)` in `gold_customer_360`) and re-derived from `last_purchase_date` in notebook 14 (using `pd.Timestamp('2025-12-31')` as hardcoded ref_date). These will diverge.
- **`abc_class` ordinal encoding** (A=3, B=2, C=1) is defined in `08_feature_engineering.py` and not shared with any other notebook. If churn model ever needs ABC class, it will redefine it.
- **Rolling window logic** (avg/std over N-day window) is defined ad-hoc in `08_feature_engineering.py` with no shared utility function. Any new model needing rolling windows must re-implement.

---

## c. Correctness Risks

### 1. Point-in-time correctness: FAILING

**Inventory features (`closing_stock`, `days_of_stock`, `is_stockout`) are end-of-day values joined on the same date as the demand target.**

In `07_gold_layer.py`:
```sql
LEFT JOIN retail_silver.fact_inventory i
    ON i.product_id = da.product_id
    AND i.store_id = da.store_id
    AND i.date_id = da.date_id   -- <-- same day
```

`closing_stock_qty = opening_stock - sold_qty + received_qty`. Knowing closing_stock at prediction time means knowing `sold_qty` (the target). This is definitional leakage for 1-day ahead forecasts and worse for 7/14/28-day horizons where intermediate inventory positions are never observable at forecast time.

The model can achieve good training metrics partly by using the stockout flag to "explain" zero-demand days — but at inference, the stockout flag is not available.

**VPO and outlet features are computed over the full dataset including test dates.**

Notebook 09 runs `NTILE(5).over(Window.orderBy(desc("total_qty_sold")))` over the complete `demand_features` table, which includes test period rows (Oct–Dec 2025). A product that performs strongly in the test period gets a higher `volume_class_encoded` in the training features. This is subtle but meaningful: NTILE bucket assignment changes as new data arrives, so the classification at training time ≠ classification at serving time.

### 2. Look-ahead bias: YES in 4 of 64 demand features

Features `volume_class_encoded`, `profit_class_encoded`, `occasion_class_encoded`, and `throughput_encoded` all use full historical aggregations that span the test period. See `demand_feature_lineage.csv` for details.

**Churn model: catastrophic look-ahead.** The target variable `churn_target` is constructed using `recency.max()`, `engagement.max()`, `freq.max()` computed on the FULL dataset before the train/test split. The model learns to invert a normalization formula whose denominators incorporate test set statistics.

### 3. Train/serve skew: GUARANTEED for weather features

Training uses `ext_weather.temp_avg_c`, `rainfall_mm`, `humidity_pct`, `aqi`, `is_heavy_rain` — all actual observed values. At inference time (forecasting 7–28 days ahead), actual weather is unavailable. You must use a weather API forecast, which:
- Introduces systematic error for long horizons (>5 days)
- Changes the feature distribution (forecast data is smoother than actual)
- Has never been tested against the model's implicit calibration

There is no code, no documentation, and no infrastructure for connecting the inference pipeline to a weather forecast API. Notebook 12 (`batch_inference.py`) simply loads features from the demand_features table without clarifying whether those features are actual or forecast weather.

Additional skew: `price_to_mrp_ratio` uses same-day transaction-weighted average selling price. At inference, you would use the planned/listed price — not a realized average that reflects promotions that haven't happened yet.

### 4. Null handling: INCORRECT for lag features

Notebook 10 imputes lag features with 0:
```python
for col in FEATURE_COLS.get("lag", []):
    df_imputed = df_imputed.withColumn(col, F.coalesce(F.col(col), F.lit(0.0)))
```

A `sales_lag_7d = NULL` means "no history 7 days ago" (new product, new store). A `sales_lag_7d = 0.0` means "sold nothing 7 days ago." These are completely different signals and the model cannot distinguish them. The warm-up period produces a large slab of fake zeros that teach the model incorrect lag-to-demand relationships for new products.

The correct approach: flag nulls separately (e.g., `has_lag_7d: bool`) and let the model learn from the absence-of-history pattern.

### 5. Timezone handling: NOT ADDRESSED

`ext_weather` dates join via `date_id` (integer YYYYMMDD). There is no timezone specification in any notebook. If the weather data source is UTC and the sales data is IST (UTC+5:30), date misalignment of 1 day affects stores with late-night trading. No timezone normalization is present.

---

## d. Performance

### Critical bottlenecks

**1. 90-day rolling window in notebook 08 — highest cost.**

```python
w90 = Window.partitionBy("product_id","store_id").orderBy("date_id").rowsBetween(-90,-1)
df = df.withColumn("rolling_90d_avg", F.avg("quantity_sold").over(w90))
df = df.withColumn("rolling_90d_std", F.stddev("quantity_sold").over(w90))
```

For 2,000 products × 275 stores × 5 years = 1,006,250 partition keys, each requiring buffering 90 rows. On 10-core cluster with default shuffle partitions, this forces a full sort+sort-merge join per partition. No `rangeBetween` optimization (uses `rowsBetween`, which relies on row ordering — correct but expensive). Estimated runtime: 20–40 minutes.

**2. lag(364) requires full 13-month history in memory per partition.**

The `rowsBetween`-equivalent for `lag(364)` needs the last 364 rows per partition to be sorted and buffered. For a 5-year dataset, this means most of 2019–2020 history must remain in the sort buffer for 2021–2024 rows. Memory pressure is high.

**3. NTILE in notebook 09 uses global ordering.**

```python
w_volume = Window.orderBy(F.desc("total_qty_sold"))  # no partitionBy
```

Global ordering forces a full shuffle to a single executor before ranking. On a dataset with 2,000 distinct product_ids, this is manageable, but it serializes what could be a parallelizable operation.

**4. demand_features table is written twice.**

Notebook 08 writes `retail_ml.demand_features`, then notebook 09 reads it entirely, joins VPO/outlet data, and overwrites it. Two full Delta table writes of a ~1.5B-row dataset. If notebook 09 fails mid-write, the table is in an inconsistent state. No Delta table versioning or savepoints are used as recovery checkpoints.

**5. Z-ORDER skipped on all gold tables.**

`SKIP_ZORDER = True` in `07_gold_layer.py`. `gold_demand_daily_sku_store` has no Z-ORDER on `product_id, store_id`, which are the primary join keys in notebook 08. Full table scans on reads from notebook 08 instead of Z-ORDER optimized reads.

**6. No incremental processing anywhere.**

Every pipeline run recomputes all features from the full historical dataset. For a 5-year backfill, this is justifiable once. For daily production runs, it is unacceptable. A daily incremental feature compute should only process the latest N+lag days and append to the feature table.

---

## e. Testability

### What exists

| Check | Notebook | Coverage | Quality |
|-------|----------|----------|---------|
| DQ validation rules | 06_silver_layer.py | Silver layer only; 33 tables with DQ rules | Reasonable — catches obvious PK/FK violations |
| NULL rate check | 10_feature_validation.py | Only 4 "critical" features post-warm-up | Too narrow |
| Data leakage check | 10_feature_validation.py | **Only `sales_lag_7d`** | Does not check inventory, VPO, weather, or growth features |
| Distribution check | 10_feature_validation.py | Uses range/std heuristic, not actual outlier count | Heuristic is unreliable |
| Correlation check | 10_feature_validation.py | Samples 50K rows; checks correlation with target | Not a substitute for proper feature selection |
| Temporal consistency | 10_feature_validation.py | Checks 4 hardcoded features for variance > 0 | Minimal |

### What does not exist

- **No unit tests.** Not a single `pytest` or `unittest` function in any notebook.
- **No Great Expectations data quality suite.** No expectations in code or registered suites.
- **No DLT pipeline.** No streaming data quality constraints.
- **No schema enforcement.** `overwriteSchema=True` on all Delta writes means schema drift is silent.
- **No feature store integration.** The Feature Store try/except block silently skips registration.
- **No automated regression testing.** No check that features computed today match a golden dataset from last week.
- **The leakage check is inadequate.** It verifies `sales_lag_7d` is correct but does not check `closing_stock` (definitionally leaky), VPO features (look-ahead), weather (train/serve skew), or the churn target construction.

### Gold layer: no DQ at all

Notebook 07 produces 38 gold tables. There are no DQ checks between silver ingestion and gold table creation. An upstream schema change in `fact_inventory` could silently produce NULLs in `closing_stock` throughout the feature table, and the system would not detect this until model performance degrades.

---

## f. Top 10 Demand Features — Pipeline Audit

The model logs `importance_{feature}` metrics to MLflow. Based on MLflow inventory and LightGBM's behavior for demand forecasting, the expected top 10 by feature importance are:

| Rank | Feature | Pipeline Source | Key Risk |
|------|---------|----------------|----------|
| 1 | `rolling_28d_avg` | 08_feature_engineering.py | Clean. rowsBetween(-28,-1) correctly excludes current row. Most reliable signal. |
| 2 | `sales_lag_7d` | 08_feature_engineering.py | Clean. Lag(7) is correct. Leakage-checked by notebook 10. |
| 3 | `rolling_7d_avg` | 08_feature_engineering.py | Clean. Same pattern as rolling_28d_avg. |
| 4 | `sales_lag_1d` | 08_feature_engineering.py | Clean. But at 7/14/28d horizon inference, this is yesterday's sales — available. |
| 5 | `rolling_90d_avg` | 08_feature_engineering.py | Clean logic; expensive computation (see §d). High NULL rate during warm-up, imputed to 0. |
| 6 | `closing_stock` | 07_gold_layer.py (inventory JOIN) | **Leaky.** End-of-day stock incorporates same-day sales. If this feature is truly top-6, model accuracy at inference will degrade significantly versus test metrics. |
| 7 | `days_to_festival` | 07_gold_layer.py (dim_date) | Clean. Known in advance. Indian retail has a well-defined festival calendar. |
| 8 | `sales_lag_364d` | 08_feature_engineering.py | Clean. But high NULL rate for products with <1 year of history (imputed to 0 — incorrect for new products). |
| 9 | `is_festival_period` | 07_gold_layer.py (dim_date) | Clean. Known in advance. |
| 10 | `rolling_28d_median` | 08_feature_engineering.py | Clean. `percentile_approx(0.5)` is approximate — acceptable for LightGBM. |

**Critical finding on feature #6 (`closing_stock`):**  
If closing_stock is in the top 10 by importance, the model has learned to use same-day inventory depletion as a demand signal. At inference time — forecasting 7, 14, or 28 days ahead — closing_stock is completely unavailable. The inference pipeline (notebook 12) must substitute opening_stock, which has a different distribution and different relationship to demand. This is not a marginal error; it will systematically inflate forecast accuracy on the test set relative to live performance.

**Recommendation for high-stakes features:**  
Replace `closing_stock`, `days_of_stock`, `is_stockout` with the equivalent lagged values: `lag(closing_stock_qty, 1)` for yesterday's inventory, which is knowable at forecast time. This would reduce apparent accuracy but give honest estimates.

---

## g. Five Below PR Pitch — Feature Family Gaps

Context: Five Below is a value-price US discount retailer with stores concentrated in suburban markets, coastal Southeast, and Puerto Rico. Key demand drivers differ substantially from the Indian grocery context of this pipeline.

---

### Hurricane Event Windows

**Analog available:** `is_heavy_rain` (binary) and `rainfall_mm` — both exist in `ext_weather`.

**Assessment: We have an analog, needs adaptation.**

The current weather features are daily point-in-time observations for generic "heavy rain." A hurricane demand pattern has a distinct multi-week shape:
- T-14 to T-7: stockpiling surge (batteries, water, shelf-stable food)
- T-7 to T-0: secondary surge, panic buying
- T+1 to T+7: post-storm recovery demand
- T+7 to T+30: extended suppression (displacement, closed stores)

None of this temporal structure is captured by a single-day `rainfall_mm`. Adding it requires:
1. Named storm tracking (NHC/NOAA feed) → new bronze table
2. Storm cone probability per store geo_id → new join table
3. New features: `days_to_storm_landfall`, `storm_category`, `cone_probability`, `is_post_storm` window flags

**Estimated effort: ~10 person-days** (ETL for NHC feed: 3 days; feature engineering for storm windows: 4 days; backfill + validation: 3 days)

---

### FEMA Flood-Zone Proximity

**Analog available:** `geo_id` in `dim_store` and `dim_geography` — city-level only.

**Assessment: Net-new. Current geography is too coarse.**

`dim_geography` has 25 geo_ids (city-level). FEMA flood zone data (Special Flood Hazard Areas, SFHA) requires parcel or block-group level. The pipeline has no street address for stores, no Census TIGER files, and no FEMA NFIP data ingested. A store in Zone AE (high flood risk) vs. Zone X (minimal risk) will have fundamentally different demand patterns for preparedness categories.

Required additions:
1. Geocode store addresses to latitude/longitude → `dim_store` enrichment
2. Ingest FEMA NFIP flood zone shapefile → new `ext_fema_flood_zone` table
3. Spatial join: store lat/lon → NFIP zone → new `dim_store.fema_zone` column
4. New feature: `store_fema_zone` (categorical), `is_high_flood_risk` (binary)

**Estimated effort: ~5 person-days** (geocoding: 1 day; FEMA shapefile ingest + spatial join: 3 days; feature engineering: 1 day)

---

### Jones Act Lead-Time Variance

**Analog available:** `dim_supplier.payment_terms_days` used as lead time proxy in `gold_safety_stock` and `gold_replenishment_signal`.

**Assessment: Net-new. payment_terms_days is not lead time.**

The pipeline uses `COALESCE(s.payment_terms_days, 7)` as a proxy for supplier lead time — this is a static payment contract term, not a transport schedule. For Five Below's Puerto Rico stores, Jones Act compliance means all merchandise must route on US-flagged vessels, adding 5–21 days of variability versus mainland stores. This affects:
- Safety stock calculations (current formula uses static 7-day lead time default)
- Replenishment order timing
- Feature `days_of_stock` adequacy (a 7-day DOS is safe in Chicago; catastrophic in San Juan with a 3-week vessel schedule)

Required additions:
1. Add `store.is_jones_act_store` flag to `dim_store`
2. Ingest actual carrier/vessel schedule data → `ext_vessel_schedule` table
3. New features: `lead_time_days` (actual, per supplier-to-store-route), `lead_time_variance`, `jones_act_flag`
4. Update safety stock formula: replace static 7-day default with route-specific lead time

**Estimated effort: ~10 person-days** (carrier data ETL: 4 days; store flagging: 1 day; formula updates to gold_safety_stock/gold_replenishment_signal: 3 days; validation: 2 days)

---

### Census ACS Demographic Joins

**Analog available:** `dim_geography.city` and `dim_store.cluster_id` imply some demographic segmentation, but at city grain.

**Assessment: Net-new. Requires parcel/tract-level geocoding.**

`dim_geography` has 25 entries (city-level). US Census ACS data is available at block-group (~220K nationwide) and tract (~85K) levels. Five Below's customer demographics (median household income, age 18–25 concentration, student population) are critical demand drivers — the same item has very different velocity in an affluent suburb vs. a lower-income exurb, even in the same metro.

Required additions:
1. Geocode all store locations to Census FIPS tract (needs store address → lat/lon first)
2. Ingest Census ACS 5-year estimates: median income, age bands, household size, student population → `ext_census_acs` table
3. Join to `dim_store` via FIPS tract → new demographic columns
4. New features: `store_median_income_bucket`, `store_youth_population_pct`, `store_student_pop_pct`

**Estimated effort: ~7 person-days** (geocoding: 1 day; ACS API ingest + table: 2 days; spatial join: 2 days; feature engineering + backfill: 2 days)

**Dependency:** FEMA flood-zone work (above) also requires geocoding — these should share the geocoding effort.

---

### Tourism Index Seasonality

**Analog available:** `google_trends_score` in `ext_digital_signals`, `is_ipl_season` (cricket — irrelevant for US), `is_festival_period` (Indian calendar — irrelevant for US).

**Assessment: We have a partial analog (google_trends_score), needs adaptation.**

The current festival/event calendar is entirely India-specific. Five Below stores near beach resorts, national parks, and college towns have tourism-driven seasonality that is not captured. `google_trends_score` captures product-level search interest, which partially correlates with tourism-driven demand spikes, but it is not a store-location tourism signal.

Required additions:
1. Source tourism flow data: STR hotel occupancy rates by market, domestic flight volumes (FAA/BTS), or state tourism bureau indices → `ext_tourism_index` table
2. Join to `dim_store` via geo_id (after upgrading geo_id to DMA or county level)
3. New features: `store_tourism_index`, `local_hotel_occupancy_pct`, `tourist_season_flag`
4. Replace Indian-specific calendar features (is_ipl_season, is_navratri_fast, is_monsoon_active) with US equivalents: `is_summer_travel_season`, `is_spring_break`, `is_fall_leaf_season`

**Estimated effort: ~5 person-days** (tourism data ETL: 2 days; geo join: 1 day; calendar replacement: 1 day; validation: 1 day)

---

### Price-Point Elasticity

**Analog available:** `gold_price_elasticity_matrix` (own-price and cross-price elasticity at SKU level), `price_to_mrp_ratio` and `discount_depth` in demand features.

**Assessment: We have an analog, reusable as-is — but with important caveats.**

The price elasticity infrastructure (`fact_price_elasticity`, `gold_price_elasticity_matrix`, `16_price_optimization.py`) is already built. `price_to_mrp_ratio` is in the demand model's top features and `discount_depth` is a direct derivative.

What is missing for Five Below specifically:
- **Cross-elasticity as a training feature:** `gold_price_elasticity_matrix` has `cross_elasticity` computed, but this column is NOT included in `FEATURE_COLS` in notebook 11. Substitute effects (buying $3 item when $5 item is unavailable) are a core Five Below demand pattern.
- **Price-point sensitivity at $1/$3/$5 thresholds:** Five Below's value proposition is discrete price-point psychology. Elasticity calculated as continuous percentage changes misses the cliff effect at the $5 ceiling.

Required additions:
1. Add `cross_price_elasticity` from `gold_price_elasticity_matrix` to `FEATURE_COLS` in notebook 11 (~2 person-days)
2. Add price-point bucket feature: `price_point_tier` ($1, $3, $5, over $5) — new column in `dim_product` (~1 person-day)
3. Elasticity is computed on Indian retail transaction data — needs recalibration on US retail data before use

**Estimated effort: ~2 person-days** for the cross-elasticity feature addition (assuming data source is already US retail); **~3 additional person-days** for price-point tier feature and US elasticity recalibration.

---

## Summary Scorecard

| Feature Family | Status | Effort |
|---------------|--------|--------|
| Hurricane event windows | We have an analog, needs adaptation | ~10 person-days |
| FEMA flood-zone proximity | Net-new | ~5 person-days |
| Jones Act lead-time variance | Net-new | ~10 person-days |
| Census ACS demographic joins | Net-new (shares geocoding with FEMA) | ~5 person-days (7 standalone) |
| Tourism index seasonality | We have an analog, needs adaptation | ~5 person-days |
| Price-point elasticity | We have an analog, reusable as-is (needs cross-elasticity feature add) | ~2 person-days |

**Total net-new engineering effort: ~35–37 person-days** (with geocoding shared between FEMA and Census).

---

## Bottom Line

The feature pipeline, as built, would not survive a production readiness review:

1. **Three inventory features are definitionally leaky at inference** — if any are top-10 by importance, model performance will degrade substantially in production compared to test set metrics.
2. **VPO/outlet features have look-ahead bias** — NTILE computed over full history. At serving time, these rankings will differ from training-time rankings for any product with growing demand.
3. **Weather features have guaranteed train/serve skew** — no infrastructure exists to replace actual weather with weather forecasts at inference time.
4. **No Databricks Feature Store** — feature registration fails silently. No point-in-time lookup semantics. No versioning.
5. **Churn model features are 4/7 circular** — the target is a deterministic function of the input features. AUC 0.933 measures the model's ability to invert its own construction formula.
6. **No incremental compute** — daily production inference requires re-running a 20–40 minute notebook that recomputes 5 years of features from scratch.

For the Five Below pitch specifically: the Indian-context features (is_ipl_season, is_navratri_fast, is_monsoon_active, is_ramadan, is_harvest_season) are in the demand model's feature set and will either contribute noise or need to be stripped and replaced with US equivalents before any meaningful demo.
