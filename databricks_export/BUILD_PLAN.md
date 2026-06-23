# CX360 Build Plan — Demand & Churn Model Remediation
**Prepared:** 2026-05-20  
**Scope source:** MODEL_QUALITY_REPORT.md § 5 (3-week remediation table)  
**Notebook verification:** All 6 affected notebooks read in full  
**Mode:** Sizing only — no implementation started

---

## 0. Scope Verification: Wrinkles Found

Before estimates, material corrections and additions from reading the actual notebooks:

| # | Wrinkle | Original assumption | Corrected scope |
|---|---------|---------------------|-----------------|
| Wr-1 | `gold_customer_360_v2` is a **point-in-time snapshot**, not a time-series. `last_purchase_date` is a scalar per customer, not a purchase event log. Building a temporal churn label requires going back to `retail_silver.fact_pos_sales`. | "Build label from gold_customer_360_v2" | Requires silver-layer query + new label construction notebook |
| Wr-2 | wMAPE formula bug is in **three notebooks**, not one: `compute_metrics()` appears identically in nb11 (train), nb12 (inference), and nb13 (accuracy tracking). | "Fix in nb11 only" | All three notebooks must be updated in sync |
| Wr-3 | Removing leaky inventory features from FEATURE_COLS requires **three** synchronized edits: nb11 line 113–114 (training), nb12 lines 138–140 (inference), nb10 line 90 (validation dict). If nb12 is not updated, the model at inference will attempt to use features excluded at training time → schema mismatch error at serving. | "Edit training notebook" | Three notebooks, all must ship atomically |
| Wr-4 | VPO/Outlet NTILE fix is **not just adding a date filter**. Occasion class uses CV (coefficient of variation) and top3-months-share computed over all history via `df_demand.groupBy("product_id","month_num")` — this is an aggregation, not a window function. The fix requires parameterizing nb09 with a `TRAIN_CUTOFF_DATE` and filtering `df_demand` at the top of the notebook before ANY aggregation. All three VPO classifiers (volume, profit, occasion) and all six outlet classifiers use `df_demand` as input — all are affected. | "Fix NTILE window function" | Full parameterization of nb09 with date cutoff; cascades through nb10 → nb11 |
| Wr-5 | MAPE by lead time **cannot be logged from nb11 alone**. The training notebook evaluates the model on static test rows (no simulated horizon). Getting per-horizon MAPE requires running the inference pipeline (nb12) in historical simulation mode on dated test rows, then joining to actuals (nb13 pattern). This is a new evaluation harness, not a metric-logging addition. | "Log MAPE by lead time in nb11" | New evaluation script (~150 lines) that replays nb12 on historical forecast dates |
| Wr-6 | Feature Store fix (MVA.6) is **not a code change** — it is a workspace infrastructure task. Unity Catalog enablement requires workspace admin + external metastore configuration. The `try/except ImportError` in nb10 will only activate once UC is provisioned. The code is already written; the blocker is admin action. | "≤2 hours to add" | 0 dev hours; ~1–2 days admin/platform task |
| Wr-7 | nb12 (batch inference) **already implements P10/P90 intervals** via Step 4: residual std is computed from October 2025 val data per product-store, then intervals are constructed as point estimate ± 1.28σ (80%) at inference time. The implementation exists but is: (a) Gaussian assumption (not conformal), (b) uses the leaky model's residuals, (c) will need re-validation after leaky features are removed. | "P10/P90 not implemented, ≤1 day to add" | Intervals exist; validation after model fix is the work (~4 hours) |
| Wr-8 | The **final model early stopping bug (F-09)** was a MAJOR finding in MODEL_QUALITY_REPORT.md but was omitted from the 3-week table. Fix is 5 lines in nb11 (add `eval_set` and `callbacks` to `final_model.fit()`). Estimate: 1 hour. Should be added to Week 2. | Not scoped | Add to W2 block |
| Wr-9 | Five Below feature replacement is **ETL work, not training notebook changes**. India-specific features (`is_ipl_season`, `is_monsoon_active`, `is_lockdown`) originate from bronze-layer event tables (not in scope of this export). Replacing them with US equivalents (hurricane windows, US holidays) requires: new bronze ingest pipelines (NHC REST API, US holiday calendar API), changes to nb08 (feature engineering), changes to nb10 (validation), and then nb11/nb12 updates. The 5-day estimate in MODEL_QUALITY_REPORT covers only the training notebook changes — the ETL upstream is the majority of the work. | "5 days, training notebook changes" | Split into two tracks: ETL (40–60 hrs) and training integration (8 hrs). ETL is independent and can begin in parallel with W1/W2. |

---

## 1. Work Items — Full Scoped List

### TRACK A — Churn Label Rebuild (blocks all churn validity claims)

---

#### A1 · Define business churn definition
**Notebook(s):** `14_churn_model.py` — TARGET_COL and churn_signal construction (lines 56–199)  
**What changes:** Replace composite_signal_p70 target with an observed behavioral outcome. Recommended definition: no purchase transaction in the 90-day window following the observation cutoff date.

**Wrinkles:**
- Must agree on the observation cutoff date (recommended: 2025-09-30) and churn window (2025-10-01 → 2025-12-31). This is a stakeholder decision, not an engineering one.
- The churn rate under the new definition will differ from the current 30.0%. If true churn rate is <5% (very common in retail), class imbalance will be severe; the existing `scale_pos_weight` logic already handles this but the Hyperopt search space may need adjusting.
- NPS as a feature (currently circular because it's a churn_signal component) becomes a legitimate predictor under a behavioral outcome definition.

**Effort:** 4 hrs (workshop + decision doc + parameter spec)  
**Dependency:** None — can start Day 1

---

#### A2 · Construct temporal churn label from silver layer
**Notebook(s):** New notebook (suggested: `14a_build_churn_labels.py`); touches `retail_silver.fact_pos_sales`  
**What changes:**  
1. Query `retail_silver.fact_pos_sales` for all customers with transactions through 2025-09-30 (observation window)  
2. Query same table for 2025-10-01 → 2025-12-31 (label window) — flag customer_ids with zero transactions as churned=1  
3. Write label table: `retail_ml.churn_labels_v2` with columns `(customer_id, observation_date, churn_label, days_since_purchase_at_cutoff)`  
4. Join to `gold_customer_360_v2` features (as-of 2025-09-30) for training

**Wrinkles:**
- `gold_customer_360_v2` is a snapshot (one row per customer, no history). The snapshot's `ref_date='2025-12-31'` means features like `days_since_purchase` reflect the Dec 31 view, not the Sep 30 cutoff. Either: (a) re-generate features with a Sep 30 cutoff by re-running nb04b with a different `ref_date`, or (b) accept the Dec 31 snapshot features and use only the new label — option (b) creates a mild future-leak in recency features (days_since_purchase as of Dec 31 embeds information from Oct–Dec). Option (a) is correct but adds ~4 hrs compute.
- `fact_pos_sales` must have `customer_id` and `txn_date` columns — confirmed in table_inventory.csv row for `retail_silver.fact_pos_sales` (6.1M rows, has `customer_id`). Data volume is manageable.
- If the label window (Oct–Dec 2025) has fewer than 90 days of data for some customers (e.g., new customers added in Nov), those customers should be excluded from the label set to avoid censoring bias.

**Effort:** 20 hrs (exploration + new notebook + label QA + join verification)  
**Dependency:** A1 (observation date must be agreed)

---

#### A3 · Temporal train/test split + normalization fix
**Notebook(s):** `14_churn_model.py` lines 169–199, 225–238  
**What changes:**  
1. Remove the composite_signal_p70 target construction block (lines 165–199)  
2. Replace `train_test_split(cx360, test_size=0.3, random_state=42, stratify=...)` (line 225) with a cohort-based split: customers observed in months 1–7 (Jan–Jul 2025) → train; months 8–9 (Aug–Sep 2025) → test. (Alternatively: random split is acceptable IF the new label is a true future outcome with no leakage — the label is already future-looking by construction. Document the choice.)  
3. Move `.max()` normalization to be computed on train set only, then applied to test set using train-computed statistics  
4. Remove the fabricated probability lines (419–421): `churn_prob_30d = all_proba * 0.75` and `churn_prob_60d = all_proba * 0.50`. Either train separate 30d/60d models with appropriate label windows (A2 would need to generate three label tables) or remove these columns from output and update downstream UI.

**Wrinkles:**
- Removing 30d/60d probabilities will break `retail_ml.churn_scores` schema and any CX360 UI component reading those columns. A migration is needed. Simplest safe option: keep columns but fill with `NULL` and add a schema comment noting they are pending separate model training.
- The cohort-based split requires the `observation_date` column from the A2 label table. If a pure snapshot approach is used (no per-customer observation date), a random split is defensible for the new label.

**Effort:** 8 hrs  
**Dependency:** A2

---

#### A4 · Add churn evaluation metrics (calibration + lift)
**Notebook(s):** `14_churn_model.py` test evaluation block (after line 346)  
**What changes:** Add to the MLflow run:
```python
from sklearn.calibration import calibration_curve
prob_true, prob_pred = calibration_curve(y_test, test_proba, n_bins=10)
# log as table artifact

# Lift at 10%/20%
sorted_idx = np.argsort(-test_proba)
top10_pct = sorted_idx[:len(sorted_idx)//10]
lift_10 = y_test.iloc[top10_pct].mean() / y_test.mean()
mlflow.log_metric("lift_top10pct", lift_10)
```

**Effort:** 3 hrs  
**Dependency:** A3 (needs valid labels before calibration is meaningful)

---

### TRACK B — Demand Feature Cleanup (blocks demand pitch claims)

---

#### B1 · Remove leaky inventory features (3 notebooks)
**Notebook(s):** `11_train_lightgbm.py` line 113–114, `12_batch_inference.py` lines 138–140, `10_feature_validation.py` line 90  
**What changes:**  
Remove `"closing_stock"`, `"days_of_stock"`, `"is_stockout"` from `FEATURE_COLS` in all three notebooks. In nb10, remove from `"inventory"` category in validation dict (or relabel as `"leaky_excluded"`).  

**Critical:** All three changes must ship in the same notebook run sequence or the inference notebook will hit a column mismatch against the retrained model (it will try to pass columns that don't exist in the model's feature schema).

**Effort:** 2 hrs (3 files, mechanical edits + smoke test)  
**Dependency:** None — can run in parallel with A-track

---

#### B2 · Fix VPO/Outlet look-ahead bias in notebook 09
**Notebook(s):** `09_vpo_outlet_classification.py` — entire notebook  
**What changes:**  
Add `TRAIN_CUTOFF_DATE = "20250930"` config at top. Filter `df_demand` immediately after load:
```python
df_demand = spark.table(DEMAND_FEATURES_TABLE)
df_demand = df_demand.filter(F.col("date_id") <= int(TRAIN_CUTOFF_DATE))
```
This one filter gates all downstream aggregations: volume_df, profit_df, occasion_df, annual_sales, and all outlet computations (throughput, SEC, maturity, perishable capability, promo sensitivity, online mix) — all use `df_demand` as their input.

**Wrinkles:**
- `maturity_encoded` is computed as `DATEDIFF(current_date(), store_open_date)` — this uses `current_date()`, not `TRAIN_CUTOFF_DATE`. Must be changed to `DATEDIFF(lit(TRAIN_CUTOFF_DATE), store_open_date)`.
- After fixing, nb09 must be re-run to regenerate `demand_features` (with new VPO assignments), then nb10 (validation) re-run, then nb11 (training) re-run. Compute cascade: nb09 (~30 min), nb10 (~20 min), nb11 (~15 min on the 2.5M sample). Total wall time: ~1.5 hours.
- The production inference pipeline (nb12) uses VPO features from the `demand_features_validated` table — after nb09 is re-run with the cutoff, the live VPO assignments will reflect train-period-only history. This is correct behavior. However, over time as new data accumulates, nb09 should be re-run without the cutoff to keep VPO classifications current. Consider making the cutoff optional via a parameter.
- Occasion classification (CV over full product history) and profit classification (proxy via `revenue_rolling_28d * 0.15`) both improve with the date filter — no additional code changes needed beyond the single `df_demand` filter.

**Effort:** 8 hrs (config change + wrinkle handling + cascade verification)  
**Dependency:** None in code; but logically should run after B1 to avoid re-running nb10/nb11 twice

---

#### B3 · Fix wMAPE formula (3 notebooks)
**Notebook(s):** `11_train_lightgbm.py` lines 284–285, `12_batch_inference.py` (same compute_metrics block), `13_forecast_accuracy.py` (same block)  
**What changes:** Replace:
```python
weights = y_true / y_true.sum()
wmape = np.sum(np.abs(y_true - y_pred) * weights) / np.sum(weights * y_true_safe)
```
With:
```python
wmape = np.sum(np.abs(y_true - y_pred)) / np.sum(y_true_safe)
```
Also rename the MLflow metric key from `test_wmape` to `test_wmape_standard` for the new run to distinguish from the old logged value.

**Effort:** 2 hrs (3 files + metric rename documentation)  
**Dependency:** None

---

#### B4 · Replace random temporal sampling with stratified temporal sampling
**Notebook(s):** `11_train_lightgbm.py` lines 192–196  
**What changes:** Replace `train_df.sample(fraction=sample_fraction, seed=42)` with:
```python
# Stratify by year+month to preserve temporal distribution
from pyspark.sql import functions as F
train_df = train_df.withColumn("ym_bucket", F.concat(F.col("year"), F.col("month_num").cast("string")))
train_df = train_df.sampleBy("ym_bucket", 
    fractions={k: sample_fraction for k in train_df.select("ym_bucket").distinct().rdd.flatMap(lambda x: x).collect()},
    seed=42)
```
This preserves the proportion of rows from each month so recent months are not over/under-represented in the 2.5M sample.

**Wrinkles:**
- `year` and `month_num` must be in `select_cols` for this to work — confirm they are listed in `EXCLUDE_COLS` (line 131) as metadata, so they must be added back temporarily before sampling then excluded from feature matrix.
- Alternative simpler fix: use a recent-bias sample: sample 80% of data from 2023-2025, 20% from 2020-2022. This more closely approximates what inference patterns will look like.
- This change alone will not fix the broken temporal structure for rows where lag features span the sampled gaps — the lag features were computed on the full table in nb08, so the feature values themselves are correct; only the training set composition changes.

**Effort:** 4 hrs  
**Dependency:** B1 (should run together with feature list changes to avoid two retraining cycles)

---

#### B5 · Fix final model early stopping (was F-09, omitted from original table)
**Notebook(s):** `11_train_lightgbm.py` lines 432–434  
**What changes:** Replace:
```python
final_model = lgb.LGBMRegressor(**best_params)
final_model.fit(X_train_val, y_train_val)
```
With:
```python
final_model = lgb.LGBMRegressor(**best_params)
final_model.fit(
    X_train_val, y_train_val,
    eval_set=[(X_val, y_val)],  # hold-out the val portion for early stopping
    callbacks=[lgb.early_stopping(EARLY_STOPPING_ROUNDS, verbose=False)]
)
```
Note: `X_val` and `y_val` must be re-declared as the val split of train+val (approximately last 15% by date) before this line, since the original code concatenates them at line 427.

**Effort:** 1 hr  
**Dependency:** B1 (batch all nb11 changes together)

---

#### B6 · Add MAPE by lead time (evaluation harness)
**Notebook(s):** New script `14_lead_time_evaluation.py` (~150 lines)  
**What changes:** Cannot be done inside nb11. Requires a new evaluation notebook that:
1. Loads the trained model from MLflow
2. For each evaluation date D in {Nov 1, Nov 7, Nov 14, Nov 28, Dec 1, Dec 7, Dec 14, Dec 28}:
   - Runs nb12-style inference using features as-of D-horizon
   - Joins to actuals from gold_demand_daily_sku_store
   - Computes MAPE for that specific horizon
3. Logs per-horizon MAPE to the MLflow run as `mape_h7`, `mape_h14`, `mape_h28`

**Wrinkles:**
- The test period features (Nov–Dec 2025) must be available as-of the forecast-generation date, not the as-of-latest date that nb12 currently uses. This requires time-traveling into the `demand_features_validated` Delta table using `VERSION AS OF` or `TIMESTAMP AS OF` — only possible if the table was not overwritten with `overwriteSchema=True` after the test period. Given that nb10 uses overwrite mode, historical feature snapshots may not exist. Mitigation: use `retail_ml.demand_features_validated` data filtered by `date_id <= H days before target_date` as a proxy.
- This is the most uncertain item in the build plan — it may require a data engineering pre-step to snapshot features at forecast dates.

**Effort:** 16 hrs  
**Dependency:** B1 + B2 + B3 + B4 + B5 (retrained model must exist first)

---

#### B7 · Validate existing P10/P90 interval coverage post-fix
**Notebook(s):** `12_batch_inference.py` Step 4 (lines 194–243)  
**What changes:** No code change needed — the interval mechanism exists (residual std from val period, Gaussian ±1.28σ). After B1–B5 are applied and the model is retrained:
1. Re-run nb12 to regenerate residual stats using the fixed model
2. Compute actual P10/P90 coverage on the test set: `coverage = mean((actual >= p10) & (actual <= p90))`
3. Log coverage to MLflow

**Wrinkles:**
- The Gaussian ±Nσ approach will understate true coverage for heavy-tailed or intermittent SKUs (Classes C and intermittent). The current approach is sufficient for a demo but should not be cited as "80-90% coverage" without measuring it.
- Residual std is computed per product-store from October 2025 val data — after removing leaky features, val residuals will be larger (MAPE will increase), so intervals will widen appropriately.

**Effort:** 4 hrs  
**Dependency:** B1–B5 (needs fixed model)

---

### TRACK C — Five Below Adaptation (ETL-heavy, independent track)

---

#### C1 · Replace India-specific calendar features with US equivalents (ETL)
**Notebook(s):** New bronze ingest notebook; `08_feature_engineering.py`; nb10; nb11; nb12  
**What changes:**  
Features to remove from FEATURE_COLS: `is_ipl_season`, `is_monsoon_active`, `is_lockdown`  
Features to add: `is_hurricane_season`, `hurricane_advisory_days_ahead`, `is_us_major_holiday`, `is_back_to_school_window`, `days_to_major_holiday`

**Scope breakdown:**
- **ETL (40 hrs):** New bronze tables for (a) NHC advisory cone data (REST API pull), (b) US federal + retail holiday calendar, (c) US back-to-school windows by state. New silver transformations joining these to store geography.
- **Feature engineering (8 hrs):** Add new columns to nb08 feature engineering window functions. Parallel to current `is_festival_period` pattern.
- **Training integration (4 hrs):** Update FEATURE_COLS in nb11 and nb12; update validation dict in nb10.

**Wrinkles:**
- ETL and training integration are independent — ETL can start immediately in parallel with A-track and B-track. Training integration is blocked only on ETL completion.
- Puerto Rico hurricane season (Jun 1 – Nov 30) needs municipality-level storm-track proximity, not just season flags. This requires NHC cone shapefile → store latitude/longitude join (stores must have coordinates in dim_store).

**Effort:** 52 hrs total (40 ETL + 8 feature engineering + 4 integration)  
**Dependency (for training integration only):** B1–B5 (batch all nb11 changes together)

---

## 2. Effort Summary

| ID | Work Item | Person-Hours | Track | Priority |
|----|-----------|-------------|-------|----------|
| A1 | Churn definition stakeholder alignment | 4 | Churn | Critical |
| A2 | Temporal churn label construction (new notebook) | 20 | Churn | Critical |
| A3 | Temporal split + normalization fix + remove fabricated probs | 8 | Churn | Critical |
| A4 | Churn evaluation metrics (calibration + lift) | 3 | Churn | Major |
| B1 | Remove leaky inventory features (3 notebooks) | 2 | Demand | Critical |
| B2 | VPO/Outlet NTILE cutoff fix + cascade | 8 | Demand | Major |
| B3 | wMAPE formula fix (3 notebooks) | 2 | Demand | Major |
| B4 | Stratified temporal sampling | 4 | Demand | Major |
| B5 | Final model early stopping fix | 1 | Demand | Major |
| B6 | MAPE by lead time evaluation harness | 16 | Demand | Minor |
| B7 | P10/P90 coverage validation post-fix | 4 | Demand | Minor |
| C1-ETL | US calendar features — bronze ETL pipelines | 40 | Five Below | Major |
| C1-int | US calendar features — training integration | 12 | Five Below | Major |
| MVA.2 | Calibration curve for churn | — | Churn | (included in A4) |
| MVA.5 | Unit tests for 3 leaky features | 4 | Demand | Minor |
| Infra | Feature Store / Unity Catalog enablement | 0 dev hrs | Platform | Admin |
| **TOTAL** | | **128 hrs** | | |

**Net engineering:** ~128 person-hours ≈ **3.2 weeks for one engineer**, or **1.6 weeks for two** working in parallel on A-track + B-track.

Note: C1-ETL (40 hrs) is the longest independent item and can run in parallel from Day 1, reducing the critical path significantly.

---

## 3. Dependency Graph

```
START
│
├─── A1 (4h) ──► A2 (20h) ──► A3 (8h) ──► A4 (3h) ──► CHURN RETRAIN
│                                                              ▲
│                                                    [A3 unblocks churn training run]
│
├─── B1 (2h) ──┐
├─── B2 (8h) ──┤
├─── B3 (2h) ──┼──► DEMAND RETRAIN (nb11) ──► B6 (16h)
├─── B4 (4h) ──┤                          └──► B7 (4h)
└─── B5 (1h) ──┘
     [B1–B5 can mostly run in parallel; B2 cascade adds wall time]

PARALLEL (independent from Day 1):
└─── C1-ETL (40h) ──────────────────────────────────► C1-int (12h)
     [C1-int blocked only on C1-ETL + B1 for nb11 batch edit]

Platform (admin, not dev):
└─── Feature Store / Unity Catalog enablement [no dev dependency; unblocks only future governance work]
```

**Critical path:** A1 → A2 → A3 → Churn retrain → A4 = **35 hrs on churn**  
**Critical path (demand):** B1+B2+B3+B4+B5 → Demand retrain → B7 = **17 hrs code + ~2 hrs compute**

The churn track is the longer critical path. B-track can be completed before A3 finishes.

---

## 4. Sequenced Schedule (Two-Engineer Parallel)

| Day | Eng-1 (Churn track) | Eng-2 (Demand track) |
|-----|--------------------|--------------------|
| 1–2 | A1: stakeholder alignment + definition doc | B1: remove leaky features (3 notebooks) |
| 3–4 | A1 cont.; A2: silver-layer exploration + label QA | B3: wMAPE fix; B5: early stopping fix |
| 5–7 | A2: new label notebook + label table write | B2: VPO/Outlet cutoff fix + cascade run |
| 8–9 | A3: split fix + normalization fix + remove fabricated probs | B4: stratified temporal sampling |
| 10–11 | A3 cont.; churn retrain | B2 cascade: nb10 + nb11 retrain |
| 12 | A4: calibration + lift metrics | B7: P10/P90 coverage validation |
| 13–16 | C1-int (if ETL ready); MVA.5: unit tests | B6: lead-time evaluation harness |

**Parallel from Day 1:** C1-ETL (assign to Eng-3 or split with Eng-2 in early days)

---

## 5. Items Scoped Wrong or Missed in Original Table

| Item | Original table | Correction |
|------|---------------|-----------|
| Churn gold table is a snapshot | Assumed temporal features available | New silver-layer query required (+8 hrs to A2) |
| wMAPE in 3 notebooks | "Fix nb11" | Also nb12 and nb13 (+1 hr) |
| Leaky feature removal in 3 notebooks | "Exclude from training" | Also nb12 inference and nb10 validation (+1 hr) |
| VPO occasion class is CV-based, not NTILE | "Fix NTILE window" | Single date filter on df_demand covers all VPO classifiers; no extra code needed but cascade is longer than estimated |
| MAPE by lead time is an evaluation harness | "Log in nb11" | New 150-line script; may be blocked by feature snapshot availability (+10 hrs) |
| P10/P90 intervals already implemented | "Not implemented, easy add" | Exists in nb12 Step 4; validation after model fix is the real work |
| Early stopping bug (F-09) not in the table | Missing | Add B5 (1 hr) to demand track |
| Feature Store fix is admin, not dev | "≤2 hours" | 0 dev hours; platform admin task |
| Five Below ETL is upstream of training changes | "5 days in training notebooks" | 40 hrs ETL + 12 hrs integration; ETL can begin Day 1 |
| 30d/60d churn probabilities removal breaks UI | Not flagged | Coordinate with frontend team; consider NULL-fill migration |
