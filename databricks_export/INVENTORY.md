# Databricks Workspace Inventory

> Generated: 2026-05-20 04:36 UTC  
> Workspace: `adb-3361736940380124.4.azuredatabricks.net`  
> Read-only inventory. No modifications made.

---

## 1. Notebooks

### retail_forecast_accelerator — 16 notebooks

| # | Notebook | Last Modified | Description |
|---|---|---|---|
| | `01_generate_dimensions` | 2026-03-21 | generate synthetic dimensions for all 57 tables |
| | `02_generate_core_facts` | 2026-03-21 | POS sales, inventory, promotions, etc. |
| | `03_generate_derived_facts` | 2026-03-21 | basket, returns, loyalty, delivery... |
| | `04_generate_external_ml_config` | 2026-03-21 | weather, macro, competitor ext signals |
| | `04b_generate_cx360_engagement` | 2026-04-30 | CX360 engagement data — added later |
| | `05_validate_all_57_tables` | 2026-03-23 | DQ validation across all bronze tables |
| | `06_silver_layer` | 2026-03-21 | bronze → silver cleansing & conforming |
| | `07_gold_layer` | 2026-03-21 | silver → gold business-ready tables |
| | `08_feature_engineering` | 2026-04-30 | ML feature engineering from gold layer |
| | `09_vpo_outlet_classification` | 2026-03-22 | VPO outlet classification logic |
| | `10_feature_validation` | 2026-03-22 | validate demand_features table |
| | `11_train_lightgbm` | 2026-03-25 | LightGBM demand forecast model training |
| | `12_batch_inference` | 2026-03-25 | batch inference → forecast_output |
| | `13_forecast_accuracy` | 2026-03-25 | accuracy reporting post-inference |
| | `validate_gold_sql` | 2026-03-21 | ad-hoc SQL validation notebook |
| | `verify_gold_chunks` | 2026-03-21 | ad-hoc chunk verification notebook |

**Notes:**
- `validate_gold_sql` and `verify_gold_chunks` are ad-hoc utility notebooks with no numbered sequence — not part of the main pipeline.
- `04b_generate_cx360_engagement` was added ~6 weeks after the rest of the pipeline (last modified 2026-04-30 vs 2026-03-21), suggesting a later scope addition.
- `08_feature_engineering` was also last modified 2026-04-30 — likely updated to incorporate the new CX360 engagement data.
- Notebooks 01–13 form a clear sequential pipeline. Gaps: no `04a` exists (only `04` and `04b`).

### ML_Models — 4 notebooks

| # | Notebook | Last Modified | Description |
|---|---|---|---|
| | `14_churn_model` | 2026-04-30 | LightGBM churn classifier — Production v2 |
| | `15_clv_model` | 2026-04-30 | CLV model (registered, no production version) |
| | `16_price_optimization` | 2026-04-30 | price optimization model |
| | `17_rebuild_cx360_with_ml` | 2026-05-05 | rebuilds CX360 tables from ML outputs |

**Notes:**
- `15_clv_model` and `16_price_optimization` are registered in MLflow experiments (`/Shared/retail_clv_model`, `/Shared/retail_price_optimization`) but have **no registered model versions** in the MLflow registry — trained but never promoted.
- `17_rebuild_cx360_with_ml` is the most recently modified notebook (2026-05-05) and rewrites CX360 tables from ML outputs. No corresponding registered model.

---

## 2. MLflow Model Registry

### Registered Models (Legacy Hive Metastore Registry)

| Model | Version | Stage | Run Name | Run Status | Metrics | Notebook |
|---|---|---|---|---|---|---|
| `churn_prediction_champion` | v1 | **None** | churn_champion | FINISHED | AUC=0.9343 | `14_churn_model` |
| `churn_prediction_champion` | v2 | **Production** | churn_champion | FINISHED | AUC=0.9333 | `14_churn_model` |
| `demand_forecast_champion` | v1 | **Production** | champion_model | FINISHED | MAPE=0.1591 | `11_train_lightgbm` |
| `demand_forecast_champion` | v2 | **None** | trusting-seal-873 | FINISHED | — | `11_train_lightgbm` |

### MLflow Experiments (7 total)

| Experiment | ID | Notes |
|---|---|---|
| `/Shared/cx360_churn_model` | `3794874940434799` | linked to model |
| `/Shared/retail_price_optimization` | `3794874940434798` | **no registered model** |
| `/Shared/retail_clv_model` | `3794874940434800` | **no registered model** |
| `/Shared/pbix_assessor_accelerator/powerbi_to_lakeview_accelerator` | `2907493534041089` | **no registered model** |
| `/Users/pratik.m@syrencloud.com/retail_forecast_accelerator/13_forecast_accuracy` | `2397887877868398` | **no registered model** |
| `/Users/pratik.m@syrencloud.com/retail_forecast_accelerator/11_train_lightgbm` | `2397887877868396` | **no registered model** |
| `/Users/pratik.m@syrencloud.com/cx360_churn` | `437248641210709` | **no registered model** |

**Notes:**
- `demand_forecast_champion` v1 is Production but its `run_id` is **not stored in the model registry versions** — the run reference is broken. The model artifact still exists at DBFS path. Version was likely registered from a logged model directly (not a run).
- `demand_forecast_champion` v2 is stage=None — a candidate challenger run (50 total runs in the experiment, only 1 named `champion_model`, rest are Optuna/hyperparameter trials with auto-generated names).
- `churn_prediction_champion` v1 (stage=None) and v2 (Production) both have valid run linkage.
- 3 experiments have no registered model: `pbix_assessor_accelerator`, `cx360_churn`, `13_forecast_accuracy` — orphaned experiments or deprecated pipelines.

---

## 3. Table Inventory

### Summary

| Schema | Tables | Zero-Row Tables | Error Tables | Largest Table |
|---|---|---|---|---|
| `retail_gold` | 49 | 10 | 1 | `gold_inventory_health` (182,167,633 rows) |
| `retail_ml` | 8 | 0 | 0 | `demand_features` (140,537,885 rows) |
| `cx_genome` | 27 | 0 | 0 | `core_purchases` (918,270 rows) |

**Total: 84 tables across 3 schemas**

### Zero-Row Tables (flagged)

| Schema | Table | Last Modified | Note |
|---|---|---|---|
| `retail_gold` | `demand_plan_override` | 2026-04-05 12:54:56 UTC | Created but never populated |
| `retail_gold` | `gold_feature_drift` | 2026-03-24 23:46:49 UTC | Created but never populated |
| `retail_gold` | `gold_forecast_accuracy` | 2026-03-29 17:01:02 UTC | Created but never populated |
| `retail_gold` | `gold_model_comparison` | 2026-03-24 23:46:47 UTC | Created but never populated |
| `retail_gold` | `gold_new_product_forecast` | 2026-03-25 05:45:24 UTC | Created but never populated |
| `retail_gold` | `gold_promo_calendar` | 2026-03-25 11:27:14 UTC | Created but never populated |
| `retail_gold` | `po_audit_log` | 2026-04-05 12:55:10 UTC | Created but never populated |
| `retail_gold` | `price_change_approval` | 2026-04-05 12:55:23 UTC | Created but never populated |
| `retail_gold` | `price_scenario` | 2026-04-05 12:55:16 UTC | Created but never populated |
| `retail_gold` | `s_op_minutes` | 2026-04-05 12:55:03 UTC | Created but never populated |

### Tables with Errors

| Schema | Table | Error |
|---|---|---|
| `retail_gold` | `schema_documentation` | `ERROR: [TABLE_OR_VIEW_NOT_FOUND] The table or v` |

### Large Tables (>100M rows)

| Schema | Table | Rows | Last Modified |
|---|---|---|---|
| `retail_gold` | `gold_basket_analysis` | 156,984,229 | 2026-03-25 05:35:30 UTC |
| `retail_gold` | `gold_demand_daily_sku_store` | 140,537,885 | 2026-03-25 05:08:53 UTC |
| `retail_gold` | `gold_inventory_health` | 182,167,633 | 2026-03-25 05:34:41 UTC |
| `retail_gold` | `gold_replenishment_signal` | 140,537,885 | 2026-03-25 05:38:47 UTC |
| `retail_gold` | `gold_unconstrained_demand` | 140,537,885 | 2026-03-25 05:38:09 UTC |
| `retail_ml` | `demand_features` | 140,537,885 | 2026-03-26 19:52:44 UTC |
| `retail_ml` | `demand_features_validated` | 140,537,885 | 2026-03-26 20:18:15 UTC |

---

## 4. Source Table DDL Summary

### `retail_gold.gold_demand_daily_sku_store`
- **87 columns**, 140,537,885 rows
- Last modified: 2026-03-25 05:08:53 UTC
- Training source for `demand_forecast_champion`
- DDL file: `source_table_ddl/retail_gold_gold_demand_daily_sku_store.sql`

### `retail_gold.gold_customer_360_v2`
- **43 columns** (30 from Delta schema + extended metadata), 50,000 rows
- Last modified: 2026-04-06 18:42:34 UTC
- Training source for `churn_prediction_champion`
- DDL file: `source_table_ddl/retail_gold_gold_customer_360_v2.sql`

---

## 5. Observations (Inventory Only — No Quality Assessment Yet)

### Structural flags

| # | Observation | Location | Severity |
|---|---|---|---|
| 1 | 10 zero-row tables in `retail_gold` | `demand_plan_override`, `po_audit_log`, `price_change_approval`, `price_scenario`, `s_op_minutes`, `gold_feature_drift`, `gold_forecast_accuracy`, `gold_model_comparison`, `gold_new_product_forecast`, `gold_promo_calendar` | Flag |
| 2 | `schema_documentation` in `retail_gold` exists on DBFS but is not queryable via SQL | `retail_gold.schema_documentation` | Flag |
| 3 | `demand_forecast_champion` v1 (Production) has no `run_id` in the registry — run linkage broken | MLflow registry | Flag |
| 4 | `15_clv_model` and `16_price_optimization` trained but never registered | ML_Models notebooks | Flag |
| 5 | 3 orphaned MLflow experiments with no registered model | `/Shared/retail_clv_model`, `/Shared/retail_price_optimization`, `/Users/.../cx360_churn` | Flag |
| 6 | `cx_genome` tables last modified 2026-03-11 to 2026-03-13 — ~10 weeks stale | All `core_*`, `genome_*`, `ai_*` tables | Flag |
| 7 | `04b_generate_cx360_engagement` inserted into pipeline sequence out of order (not `04a`) | `retail_forecast_accelerator` | Flag |
| 8 | `gold_demand_hourly_test` (363K rows) appears to be a test artifact alongside `gold_demand_hourly` (5M rows) | `retail_gold` | Flag |
| 9 | 50 total runs in demand experiment — only 1 named run (`champion_model`), 49 are unnamed Optuna trials | MLflow experiment `2397887877868396` | Info |
| 10 | `demand_features` and `demand_features_validated` both have 140,537,885 rows — identical count suggests validated = full copy | `retail_ml` | Info |

---

## 6. File Inventory

```
databricks_export/
├── INVENTORY.md                          ← this file
├── mlflow_inventory.json                 ← all models, versions, runs, metrics, params, artifacts
├── table_inventory.csv                   ← 84 tables with row counts + last-modified timestamps
├── notebooks/
│   ├── retail_forecast_accelerator/      ← 16 notebooks (.py source)
│   │   ├── 01_generate_dimensions.py     (76K)
│   │   ├── 02_generate_core_facts.py     (31K)
│   │   ├── 03_generate_derived_facts.py  (34K)
│   │   ├── 04_generate_external_ml_config.py (61K)
│   │   ├── 04b_generate_cx360_engagement.py  (64K)
│   │   ├── 05_validate_all_57_tables.py  (17K)
│   │   ├── 06_silver_layer.py            (24K)
│   │   ├── 07_gold_layer.py              (61K)
│   │   ├── 08_feature_engineering.py     (21K)
│   │   ├── 09_vpo_outlet_classification.py (23K)
│   │   ├── 10_feature_validation.py      (24K)
│   │   ├── 11_train_lightgbm.py          (21K)
│   │   ├── 12_batch_inference.py         (20K)
│   │   ├── 13_forecast_accuracy.py       (22K)
│   │   ├── validate_gold_sql.py          (5.6K)
│   │   └── verify_gold_chunks.py         (1.1K)
│   └── ML_Models/                        ← 4 notebooks (.py source)
│       ├── 14_churn_model.py             (16K)
│       ├── 15_clv_model.py               (15K)
│       ├── 16_price_optimization.py      (16K)
│       └── 17_rebuild_cx360_with_ml.py   (12K)
└── source_table_ddl/
    ├── retail_gold_gold_demand_daily_sku_store.sql  (87 columns)
    └── retail_gold_gold_customer_360_v2.sql          (43 columns)
```
