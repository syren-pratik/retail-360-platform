# Code Review: `11_train_lightgbm.py`
## Demand Forecast Model — LightGBM

> Reviewer: Claude Code  
> Date: 2026-05-20  
> Source: `databricks_export/notebooks/retail_forecast_accelerator/11_train_lightgbm.py`  
> Production model: `demand_forecast_champion` v1 (Production stage)

---

## 1. What the Notebook Does

| Lines | Block | What executes |
|---|---|---|
| 19 | `%pip install` | Installs typing_extensions, mlflow[databricks], lightgbm, hyperopt |
| 23 | Restart | `dbutils.library.restartPython()` — full kernel restart |
| 32–73 | Config | Sets CATALOG/SCHEMA, feature table path, split dates (TRAIN_END=20250930, VAL=Oct25, TEST=Nov–Dec25), row caps (2M train / 500K val / 1M test), HYPEROPT_MAX_EVALS=20, EARLY_STOPPING_ROUNDS=30 |
| 86–134 | Feature manifest | Declares 64 named FEATURE_COLS across 11 groups (lags, rolling, growth, cyclical, calendar, weather, price/promo, inventory, product, store, VPO/outlet) and EXCLUDE_COLS |
| 150–167 | Load + split | Reads `demand_features_validated` via `spark.table()`, casts `date_id` to int, creates 3 Spark DataFrames via date filter — no row count validation beyond print |
| 179–217 | Pandas convert | Selects needed columns, randomly samples each split if over row cap, calls `.toPandas()` |
| 226–248 | Matrix prep | Filters features to those actually present in DataFrame, builds X/y numpy/pandas, fills all NaN with 0 |
| 262 | MLflow setup | `mlflow.set_experiment("/Shared/demand_forecast_accelerator")` |
| 272–302 | Metric function | Defines `compute_metrics()`: MAPE, wMAPE (non-standard formula — see §5), MAE, RMSE, Bias |
| 305–356 | Hyperopt objective | `objective()`: trains LGBMRegressor with early stopping on val, returns `val_mape` as loss, logs params + 5 val metrics per nested run |
| 369–399 | Hyperopt search | Defines 9-param search space, runs `fmin()` with 20 trials (TPE), logs best params to parent run |
| 411–436 | Final model train | Concatenates train+val, trains LGBMRegressor with best params — **no eval_set, no early stopping** |
| 449–462 | Test evaluation | Predicts on test, clips negatives, calls `compute_metrics()`, prints overall results |
| 471–493 | Segmented eval | Loops over `abc_class`, `store_type`, `is_festival_period`; computes MAPE per segment value where n>100 |
| 502–521 | Feature importance | Extracts LightGBM split-count importances; checks if lag_7d or rolling in top 5 |
| 533–577 | MLflow logging | Logs params, test metrics, segmented MAPE, feature importance CSV artifact, top-20 importances as metrics; calls `mlflow.lightgbm.log_model()` with `input_example` |
| 586–616 | Registration | Gets latest version, tries `set_registered_model_alias()`, falls back to `transition_model_version_stage("Production")`, adds description |
| 624–664 | Summary + appendix | Prints final summary; markdown appendix showing how to load the model |

---

## 2. Data Inputs

**Table read:** `hive_metastore.retail_ml.demand_features_validated` (140,537,885 rows, 80 columns)

**Split logic:**
```python
# Lines 156-158
train_df = df.filter(F.col("date_id") <= int("20250930"))   # ~2.5M rows
val_df   = df.filter(F.col("date_id") >= 20251001) & <=20251031  # ~1 month
test_df  = df.filter(F.col("date_id") >= 20251101) & <=20251231  # 2 months
```
Split is time-based. This is correct for time-series. No gap between train end (Sep 30) and val start (Oct 1) — no buffer period to account for lag feature contamination (see §5).

**Feature columns used:** 64 declared in FEATURE_COLS (lines 86–128). Actual features used filtered to those present in the DataFrame (line 227). Which features were actually dropped is printed but **not logged to MLflow**.

**Target:** `quantity_sold` (lines 83).

**Filters applied:** None beyond date range. Zero-sales rows, stockout rows, and negative-stock rows are not filtered — the model trains on all of them.

**Leakage checks done:** None explicitly. The notebook includes a comment on line 155 ("CRITICAL: never use random split for time series") but performs no check that lag features respect the split boundary. Specifically:
- `sales_lag_1d` (line 88) for the first day of the val set (Oct 1) would reference Sep 30 actuals — this is correct.
- `closing_stock`, `days_of_stock` (lines 114–115) — if these are end-of-day inventory and include same-day sales deductions, they are partially target-derived. **Not checked.**
- `revenue_rolling_28d` (line 96) — rolling revenue window that spans the split boundary during the first 28 days of validation. Not verified to be computed from lagged data only.

---

## 3. Feature Engineering Inline

**None.** All 64 features are read pre-computed from `demand_features_validated`. Feature engineering is upstream in `08_feature_engineering.py`. This is good practice — the training notebook is not a feature pipeline.

The only transforms applied inline are:
- `date_id` cast to int (line 153) — data cleaning, not feature engineering
- `fillna(0)` (lines 245–247) — imputation strategy, undocumented, not logged

---

## 4. Model Training

**Algorithm:** LightGBM Regressor (`lgb.LGBMRegressor`)

**Hyperparameter search space (lines 369–379):**
| Parameter | Range | Distribution |
|---|---|---|
| n_estimators | [200, 1500] step 50 | quniform |
| learning_rate | [0.005, 0.3] | log-uniform |
| max_depth | [4, 12] step 1 | quniform |
| num_leaves | [15, 255] step 5 | quniform |
| min_child_samples | [10, 200] step 10 | quniform |
| subsample | [0.5, 1.0] | uniform |
| colsample_bytree | [0.5, 1.0] | uniform |
| reg_alpha | [1e-8, 10.0] | log-uniform |
| reg_lambda | [1e-8, 10.0] | log-uniform |

**CV strategy:** None. Single train/val split used for Hyperopt — not cross-validation. 20 TPE trials.

**Early stopping (Hyperopt phase):** 30 rounds on validation MAPE (lines 328–332). Correctly used during Hyperopt.

**Early stopping (final model):** **Absent.** Line 434:
```python
final_model.fit(X_train_val, y_train_val)
```
No `eval_set`, no `callbacks`. The final model trains for exactly `best_params["n_estimators"]` trees on the combined train+val set. But `n_estimators` was selected assuming early stopping would halt the Hyperopt trial before that value was reached. The actual number of trees used in the champion run was determined by early stopping — the saved `n_estimators` is the *ceiling*, not the optimal tree count.

**Class weighting:** Not applicable (regression). No sample weighting by SKU velocity or store tier.

**Scoring metric for tuning:** Validation MAPE (line 356: `return {"loss": metrics["mape"], "status": STATUS_OK}`).

**Objective function:** Default LGBM regression objective (L2 / mean squared error). No custom objective despite optimizing for MAPE.

---

## 5. Evaluation

**Metrics computed:** MAPE, wMAPE, MAE, RMSE, Bias (overall); MAPE per segment (abc_class, store_type, is_festival_period).

**What's specifically good:** Bias is measured and logged (line 547). Time-based test set (Nov–Dec 2025) correctly held out. Segmented evaluation is implemented and logged to MLflow.

**Issues:**

**wMAPE formula is incorrect (lines 284–285):**
```python
weights = y_true / y_true.sum()           # volume weights
wmape = np.sum(np.abs(y_true - y_pred) * weights) / np.sum(weights * y_true_safe)
```
Standard wMAPE = `sum(|actual - pred|) / sum(actual)`. The denominator here is `sum(weights × y_true_safe)` where `weights = y_true / sum(y_true)` — this equals `sum(y_true²) / (sum(y_true) × sum(y_true_safe))`, which differs from `1.0` only when `y_true_safe` differs from `y_true` (i.e., when `y_true < 0.1`). For near-zero items, the denominator is biased upward, making wMAPE look better than it is. The logged `test_wmape = 0.1439` is not the standard metric. Any external benchmark comparison using this number is wrong.

**No holdout gap (lag leakage risk):** Training ends Sep 30. Val starts Oct 1. The feature `sales_lag_1d` for Oct 1 uses Sep 30 actual sales — this is fine. But the 80-column feature table includes `rolling_28d_avg`. If this rolling average was computed at the time of the feature table generation (a single snapshot), it may include future data for rows near the split boundary. Whether `demand_features_validated` respects point-in-time correctness is not verified in this notebook.

**No time-based split for test sampling:** Lines 207–211 randomly sample the test set when >1M rows:
```python
sample_fraction = MAX_TEST_ROWS / test_count
test_pd = test_df.select(select_cols).sample(fraction=sample_fraction, seed=42).toPandas()
```
Random sampling within a time window is acceptable but means evaluation metrics are sensitive to `seed=42`. One bad seed that over-samples high-volatility weeks would shift MAPE meaningfully.

**Missing:**
- **Prediction interval coverage:** The model produces point forecasts only. No confidence interval, no quantile regression. `gold_demand_daily_sku_store` has `lower_95`, `upper_95` columns — these are never validated against empirical coverage.
- **Calibration:** No check that MAPE distribution is not driven by a small number of extreme observations.
- **Zero-sales SKU/store accuracy:** A dedicated metric for rows where `quantity_sold = 0` is absent. These rows would produce MAPE = (pred / 0.1) which inflates the metric artificially via the `y_true_safe` floor.
- **Department or category breakdown:** Only 3 segments evaluated. No department or category breakdown.
- **Residual autocorrelation:** No check for whether errors are correlated over time — expected for a demand model.

---

## 6. MLflow Logging

**What is logged:**
| Item | Logged | Notes |
|---|---|---|
| Hyperparams (9) | ✓ | Via `mlflow.log_params(best_params)` |
| train/test rows, n_features | ✓ | As params |
| train_end_date, test_start_date | ✓ | As string params |
| test_mape, wmape, mae, rmse, bias | ✓ | Top-level metrics |
| Segmented MAPE (abc, store_type, festival) | ✓ | Logged dynamically |
| Top-20 feature importances | ✓ | As metrics |
| Feature importance CSV | ✓ | As artifact |
| LightGBM model artifact | ✓ | Via `mlflow.lightgbm.log_model()` |
| Input example | ✓ | `X_test.head(5)` |

**What is missing:**
| Item | Missing | Impact |
|---|---|---|
| Model signature (explicit) | ✗ | Inferred from input_example — schema drift not caught on load |
| Which features were actually used vs. declared | ✗ | `n_features=64` logged but not which 64; `missing_features` printed, not logged |
| Python + library versions | ✗ | No `mlflow.log_dict({"lightgbm": lgb.__version__, ...}, "env.json")` |
| Feature table version (Delta version) | ✗ | `demand_features_validated` is Delta v2 — version not logged |
| Val metrics at champion time | ✗ | Only test metrics logged on the champion run; val MAPE only in nested Hyperopt runs |
| Actual n_estimators used (early-stopped) | ✗ | Logged `n_estimators` is the ceiling, not actual trees used |
| NaN imputation strategy | ✗ | `fillna(0)` applied but not documented in MLflow |
| Dataset hash or row count of feature table | ✗ | No traceability from model to exact data version |

**Experiment routing issue:** Config declares `EXPERIMENT_NAME = "/Shared/demand_forecast_accelerator"` (line 51), but the inventory confirms all runs landed in experiment `2397887877868396` = `/Users/pratik.m@syrencloud.com/retail_forecast_accelerator/11_train_lightgbm` (the notebook's auto-experiment). `mlflow.set_experiment()` either silently failed or was overridden by the Databricks notebook auto-experiment. The champion model is registered but its runs are in the wrong experiment — makes audit and comparison harder.

---

## 7. Quality Issues

### Critical

**C1 — Final model trains without early stopping (line 434)**
```python
final_model.fit(X_train_val, y_train_val)   # no eval_set, no callbacks
```
`best_params["n_estimators"]` was selected by Hyperopt with early stopping on a smaller training set. The actual tree count that the Hyperopt trial used was fewer than `n_estimators` — the early stopping callback halted it. The final model, trained on a larger dataset (train+val) with no early stopping, runs for the full `n_estimators` ceiling. This risks overfitting or at minimum uses an unvalidated tree count. Fix: record `model.best_iteration_` from the Hyperopt winner and use that as `n_estimators` for the final fit, or use early stopping on a held-out random sample.

**C2 — Random sampling of training data destroys temporal structure (lines 192–197)**
```python
sample_fraction = MAX_TRAIN_ROWS / train_count   # = 2M / 2.5M = 0.8
train_pd = train_df.select(select_cols).sample(fraction=sample_fraction, seed=42).toPandas()
```
At the time this ran, train_count ≈ 2.5M and sample_fraction ≈ 0.8 — so ~500K rows were dropped at random. For any individual SKU×store time series, dropping 20% of observations at random breaks the temporal ordering that lag and rolling features depend on. The correct approach is to sample entire series (e.g., subsample SKU×store combinations) or keep all rows for a random subset of series.

**C3 — wMAPE formula is wrong (lines 284–285)**
The metric logged to MLflow as `test_wmape` does not match the industry-standard wMAPE definition. Any external benchmark, SLA, or reporting that references this metric is comparing against a non-standard number. This is the primary accuracy metric used to describe the model in its description (`Test MAPE: 15.91%`). The wMAPE discrepancy may be small in practice but is a correctness bug in a logged, production metric.

**C4 — Inventory features may carry same-day sales signal (lines 113–115)**
`closing_stock` and `days_of_stock` are included as features. If `closing_stock` = opening stock − `quantity_sold` (which is the standard accounting identity), then `closing_stock` is a function of the target variable. The feature table notebook (`08_feature_engineering.py`) must be inspected to confirm these are lagged by one day. This notebook contains no check.

### Major

**M1 — HYPEROPT_MAX_EVALS discrepancy (line 6 vs. line 67)**
The notebook header markdown states "50 trials" (line 6). The config sets `HYPEROPT_MAX_EVALS = 20` with comment "reduced for speed" (line 67). The production model was tuned with 20 trials over 9 hyperparameters using TPE — that's a materially under-searched space. The description in the inventory shows "trained on 2,499,420 rows" but the header claim of "50 trials" is false.

**M2 — `available_features` mismatch not flagged as failure (lines 227–232)**
```python
available_features = [f for f in FEATURE_COLS if f in train_pd.columns]
missing_features = [f for f in FEATURE_COLS if f not in train_pd.columns]
if missing_features:
    print(f"Missing features: {missing_features}")
```
Missing features are printed but execution continues. If `demand_features_validated` is missing a column (schema drift, rename), training silently drops it. A missing lag or rolling feature would significantly degrade model quality with no alert.

**M3 — Val set randomly sampled (lines 199–205)**
Validation is used for early stopping during Hyperopt. Randomly sampling it (when >500K rows) means early stopping sees a different distribution each run if seed is changed. The seed is fixed at 42 but this is never documented as a reproducibility requirement.

**M4 — No objective alignment between tuning metric and business metric**
The model is tuned on MAPE (line 356) but trained with L2 loss (LGBM default). MAPE penalizes under-prediction on high-volume items less than over-prediction. Tuning MAPE with L2-trained predictions creates misalignment: the optimization objective during tree building doesn't match the selection objective during Hyperopt.

**M5 — Experiment name mismatch (lines 51 and 262)**
`mlflow.set_experiment("/Shared/demand_forecast_accelerator")` is called, but the champion run landed in the notebook's auto-experiment. The registered model's source run is in a different experiment than intended. This breaks any experiment-level comparison tooling.

### Minor

**m1 — Feature importance uses LightGBM split count, not SHAP (lines 503–506)**
Split-count importances are not robust — a feature used in many shallow splits ranks higher than a deeply important feature used rarely. SHAP would give more interpretable importance (as done correctly in the churn model). The sanity check (line 514) expects `sales_lag_7d` in top 5, but split-count importance can rank that differently than SHAP. The churn model uses SHAP; the demand model does not.

**m2 — Header markdown claims the code does things it doesn't (line 6)**
"50 trials" (wrong), no mention of random sampling caveats, no mention that final model skips early stopping. The markdown is aspirational, not descriptive.

**m3 — `np.sqrt(mean_squared_error(...))` at line 291**
In newer scikit-learn versions, `mean_squared_error` has a `squared=False` parameter. Using `np.sqrt(mse)` works but is a legacy pattern.

**m4 — `X_test.head(5)` as input_example (line 572)**
Head of test set is the last 5 rows of the DataFrame in memory order after random sampling. These may be edge cases. A stratified sample or mean vector would be a more representative input example.

---

## 8. What's Missing for an Enterprise-Grade Pitch

| Gap | Specific issue |
|---|---|
| **Drift detection hook** | No baseline logged. No `EvidentlyAI`, `whylogs`, or custom drift check registered. When `demand_features_validated` is refreshed, there is no mechanism to detect that the feature distribution shifted before re-serving predictions. |
| **Retraining cadence** | No Databricks Job schedule, no trigger logic. Retraining is ad hoc (manual notebook execution). The model's training end date is hardcoded as `"20250930"` — it will not update automatically. |
| **Champion/challenger logic** | The registration block (lines 586–616) blindly promotes the new version to Production without comparing against the current champion's held-out metrics. `client.get_latest_versions()` is called but only to get the version number — not to gate promotion. Any rerun creates a new Production model even if it's worse. |
| **Feature store registration** | Features are pre-computed in `demand_features_validated` but not registered in Databricks Feature Store. No `FeatureStoreClient.log_model()` — so there is no online serving path, no point-in-time lookup guarantee, and no feature lineage tracking. |
| **Model signature (explicit)** | `input_example=X_test.head(5)` is passed, which causes MLflow to infer the signature. Inferred signatures use object dtype for mixed-type columns. An explicit `mlflow.models.infer_signature(X_test, test_pred)` call should be used and the result passed as `signature=`. |
| **Input validation** | No `pyfunc` wrapper that validates column names, types, and ranges at inference time. A client passing a DataFrame with a renamed column gets a silent wrong prediction, not an error. |
| **Prediction interval output** | The model produces point estimates only. Downstream, `gold_demand_daily_sku_store` has `lower_95` / `upper_95` columns — but those are generated elsewhere. The model has no quantile regression head, and coverage is never validated. |
| **Data version traceability** | No Delta table version is logged. If `demand_features_validated` is overwritten, the model's training data cannot be reconstructed. `spark.sql("DESCRIBE HISTORY retail_ml.demand_features_validated")` should be called and the version logged. |

---

## Quality Score: **4 / 10**

The time-based split discipline and segmented evaluation are genuine positives. Everything else is a problem: the final model trains without early stopping (invalidating the hyperparameter search), the wMAPE formula is wrong, random sampling of training data breaks time-series integrity for individual series, the experiment routing is broken, and there is no path to safe production deployment (no drift detection, no champion/challenger gate, no feature store). The model reached Production via a try/except registration block that falls back silently. As written, a rerun that produces a worse model would silently replace the current champion.
