# Feature Pipeline Map

Generated: 2026-05-20

---

## Notebooks That Produce Features

Five notebooks generate or transform features destined for ML training. Listed in execution order.

---

### 1. `07_gold_layer.py`

| Property | Value |
|----------|-------|
| **Notebook path** | `retail_forecast_accelerator/07_gold_layer.py` |
| **Primary output table** | `retail_gold.gold_demand_daily_sku_store` |
| **Secondary outputs** | `retail_gold.gold_customer_360`, `retail_gold.gold_promo_effectiveness`, `retail_gold.gold_price_elasticity_matrix`, `retail_gold.gold_inventory_health`, `retail_gold.gold_supplier_scorecard`, `retail_gold.gold_weather_impact`, `retail_gold.gold_unconstrained_demand`, and 29 others (38 total) |
| **Input tables** | `retail_silver.fact_pos_sales`, `retail_silver.fact_online_sales`, `retail_silver.fact_inventory`, `retail_silver.dim_product`, `retail_silver.dim_store`, `retail_silver.dim_date`, `retail_silver.ext_weather` (geo_id JOIN), `retail_silver.fact_promotions`, `retail_silver.fact_price`, `retail_silver.fact_stockout_events` |
| **Feature count** | ~50 raw columns in `gold_demand_daily_sku_store` (pre-ML); these are dimension pass-throughs and daily aggregations, not windowed ML features |
| **Computational cost signals** | UNION ALL of POS + online sales (~416M rows combined); 4-table JOIN (product, store, date, inventory + weather LEFT JOIN); CHUNK_MODE date-range processing required for foundation table; autoBroadcastJoinThreshold=100MB; Z-ORDER on (product_id, store_id) **skipped** (SKIP_ZORDER=True); no rolling windows at this layer |
| **Critical note** | This is the single largest job in the pipeline. Foundation table must be built in date-range chunks then switched to FINAL mode for dependent tables. Any schema change here cascades to all 37 downstream gold tables. |

---

### 2. `04b_generate_cx360_engagement.py`

| Property | Value |
|----------|-------|
| **Notebook path** | `retail_forecast_accelerator/04b_generate_cx360_engagement.py` |
| **Output table** | `retail_gold.gold_customer_360_v2` |
| **Input tables** | `retail_bronze.fact_customer_engagement`, `retail_bronze.fact_campaign_response`, `retail_bronze.fact_customer_feedback`, `retail_bronze.fact_support_tickets`, `retail_bronze.dim_campaign`, `retail_silver.fact_pos_sales`, `retail_silver.fact_loyalty`, `retail_silver.dim_customer` |
| **Feature count** | 67 columns (source for all churn model features) |
| **Computational cost signals** | Multi-join aggregations over 50K customers × multiple fact tables; window functions for tier progression and tenure calculation; no broadcast hints; moderate cost (~5–10 min on 10-core cluster) |
| **Critical note** | Sole feature source for churn model. Contains composite columns (e.g., `churn_signal` is not pre-built here — it is built at training time in notebook 14). Many columns are pre-aggregated lifetime metrics with no point-in-time guarantee. |

---

### 3. `08_feature_engineering.py`

| Property | Value |
|----------|-------|
| **Notebook path** | `retail_forecast_accelerator/08_feature_engineering.py` |
| **Output table** | `retail_ml.demand_features` |
| **Input tables** | `retail_gold.gold_demand_daily_sku_store` |
| **Feature count** | 56 ML features (5 lag + 12 rolling + 4 growth + 6 cyclical + 8 calendar + 5 weather + 5 price/promo + 3 inventory + 4 product + 3 store) |
| **Computational cost signals** | Window: `partitionBy("product_id","store_id").orderBy("date_id")` — must buffer full history per partition; lag(364) requires 13+ months of history in each partition's sort; rowsBetween(-90,-1) rolling windows on 2.5M+ row dataset; 5 separate window passes (w, w7, w28, w90, w28_lagged=rowsBetween(-56,-29)); `df.cache()` after lag features; no incremental processing — full recompute every run; write partitioned by year, month_num |
| **Critical note** | Most expensive notebook in the ML pipeline. The 90-day rolling window (`rowsBetween(-90,-1)`) on a dataset with ~2,000 SKUs × 275 stores × 5 years = ~1.5B potential rows is the primary bottleneck. No Z-ORDER on output table. |

---

### 4. `09_vpo_outlet_classification.py`

| Property | Value |
|----------|-------|
| **Notebook path** | `retail_forecast_accelerator/09_vpo_outlet_classification.py` |
| **Output tables** | `retail_ml.demand_features` (updated, full overwrite), `retail_gold.gold_product_vpo`, `retail_gold.gold_store_classification` |
| **Input tables** | `retail_ml.demand_features`, `retail_silver.dim_store`, `retail_silver.fact_promotions` |
| **Feature count** | 10 additional features (4 VPO: volume_class_encoded, profit_class_encoded, occasion_class_encoded, vpo_segment; 6 outlet: throughput_encoded, sec_class_encoded, maturity_encoded, perishable_capability_encoded, promo_sensitivity_encoded, online_mix_encoded) → total 66 features |
| **Computational cost signals** | NTILE(5) and NTILE(4) with global `orderBy` (no partition) — forces full dataset sort; multiple groupBy aggregations over demand_features (~2.5M rows); full rewrite of demand_features table (second full overwrite in the pipeline); occasion classification requires groupBy(product_id, month_num) + window ranking + 3 separate joins; no broadcast hints |
| **Critical note** | VPO and outlet classifications use FULL HISTORICAL data including the test period. This introduces look-ahead bias: NTILE bucket assignments at training time use future demand, which won't match bucket assignments at serving time. The full rewrite of demand_features is also expensive and fragile — if this notebook fails mid-run, the table may be in an inconsistent state. |

---

### 5. `10_feature_validation.py`

| Property | Value |
|----------|-------|
| **Notebook path** | `retail_forecast_accelerator/10_feature_validation.py` |
| **Output table** | `retail_ml.demand_features_validated` (the actual training input) |
| **Input tables** | `retail_ml.demand_features` |
| **Feature count** | 66 features (same as input, plus validated_at timestamp) |
| **Computational cost signals** | Low — validation checks use single aggregations; correlation check samples 50K rows to pandas; leakage check samples 1000 rows; imputation uses coalesce() — efficient |
| **Critical note** | Databricks Feature Store registration is wrapped in try/except and will silently skip if `databricks.feature_engineering` is unavailable — **registration likely fails in this workspace** (legacy Hive metastore). The leakage check only verifies `sales_lag_7d`; it does not check VPO features, inventory features (closing_stock), or weather features for train/serve skew. Imputation fills lag/rolling NULLs with 0 — incorrect: 0 is a valid sales value, not a missing-history marker. |

---

## Pipeline Topology

```
Bronze (01-04b)
    └─► Silver (06)
         ├─► Gold: gold_demand_daily_sku_store (07) ─────────────────┐
         └─► Gold: gold_customer_360_v2 (04b)                        │
                    │                                                  ▼
                    │                              demand_features (08)
                    │                                    │
                    │                              demand_features + VPO/Outlet (09)
                    │                                    │
                    │                              demand_features_validated (10)
                    │                                    │
                    │                              LightGBM training (11)
                    │
                    └─────────────────────────────► Churn training (14)
```

## What Is NOT a Feature Store

Despite `ml_feature_store` appearing in `retail_bronze` and the Feature Store registration attempt in notebook 10, **this pipeline does not use Databricks Feature Store**:
- No `FeatureStoreClient.write_table()` calls succeed (import fails silently)
- No point-in-time correct feature lookups (`FeatureLookup`)
- No feature lineage tracked through Feature Store UI
- The `retail_ml.demand_features_validated` table is a plain Delta table, not a Feature Store table

The pipeline is a **linear notebook sequence** writing plain Delta tables.
