# CX360 Model Quality Report
**Audit Date:** 2026-05-20  
**Auditor:** Claude (automated audit from MLflow inventory, notebook source code, table DDLs)  
**Models audited:** demand_forecast_champion v1 · churn_prediction_champion v2  
**Data access:** MLflow run JSON, notebook source (14 notebooks read), table_inventory.csv, feature lineage CSVs  
**Note:** No live Databricks query access. All derived metrics are flagged with their assumptions.

---

## Table of Contents
1. [Ranked Findings — All Models](#1-ranked-findings--all-models)
2. [Demand Forecast Audit](#2-demand-forecast-audit)
3. [Churn Prediction Audit](#3-churn-prediction-audit)
4. [Pitch-Readiness Verdicts](#4-pitch-readiness-verdicts)
5. [Recommended Remediation Sequence](#5-recommended-remediation-sequence)

---

## 1. Ranked Findings — All Models

| # | Severity | Model | Finding | Impact |
|---|----------|-------|---------|--------|
| F-01 | **CRITICAL** | Churn | Circular label construction: 4 of 7 features are direct algebraic inputs to the target variable | AUC 0.933 is an artifact; model has no genuine predictive signal |
| F-02 | **CRITICAL** | Churn | 30d/60d churn probabilities are fabricated: `all_proba × 0.75` / `× 0.50` (hardcoded multipliers, no model) | Any time-horizon probability shown in the UI is invented |
| F-03 | **CRITICAL** | Demand | Leaky features in top-5: `days_of_stock` (#1, importance 1609) and `closing_stock` (#5, importance 1470) are end-of-day inventory values incorporating same-day sales | Inference-time degradation guaranteed; combined leaky importance = 12.8% of top-20 |
| F-04 | **MAJOR** | Demand | Look-ahead bias: 7 VPO/Outlet classification features (`volume_class`, `profit_class`, `occasion_class`, `throughput`, `sec_class`, `perishable_capability`, `promo_sensitivity`) computed via NTILE over full history including test period | Classification boundaries shift when future data arrives; live ranks ≠ training ranks |
| F-05 | **MAJOR** | Demand | Training used random sample (3.8% of full train set, ~2.5M of ~52M rows). Random sampling of time-series data breaks temporal autocorrelation structure | Model trained on non-IID rows; rolling features computed on gappy sequences |
| F-06 | **MAJOR** | Demand | wMAPE formula is non-standard: `weights = y_true/sum(y_true)` then `wmape = sum(|e|×w)/sum(w×y_safe)` = volume²-weighted error. Reported 14.39% is not comparable to any industry benchmark | Metric is meaningless for external communication |
| F-07 | **MAJOR** | Churn | Global normalization before train/test split: `.max()` values for all 4 churn_signal components computed on full 50K dataset before split. Test labels constructed using test-row statistics | Canonical data leakage; model sees test distribution during label construction |
| F-08 | **MAJOR** | Churn | Version selection not statistically robust: v2 (champion) AUC 0.93328 vs v1 AUC 0.93430. Delta = -0.00102 in v2's disfavor. Champion selected despite lower AUC | Selection criterion is unclear; v2 wins only on parameter efficiency, not accuracy |
| F-09 | **MAJOR** | Demand | Final model trained without early stopping. Champion run: `final_model.fit(X_train_val, y_train_val)` — `early_stopping_rounds=30` param logged but not applied to final fit | Model may be over-fitted; stopping round from validation fold not re-used |
| F-10 | **MAJOR** | Both | Weather features at train time use actuals; at inference time they require weather forecasts. No forecast-vs-actual error propagation modeled | Train/serve skew; live MAPE will exceed test MAPE by weather forecast error margin |
| F-11 | **MINOR** | Demand | Festival MAPE lift: 0.14pp (festival=0.1599 vs non-festival=0.1585). Model effectively cannot distinguish festival from non-festival demand despite 8 dedicated festival features | Festival features provide no measurable value; wasted complexity |
| F-12 | **MINOR** | Demand | Null imputation fills all lag/rolling NULLs with 0. For new SKU-stores, 0 is a real sales value, not a missing-history sentinel | New SKU cold-start error will be inflated |
| F-13 | **MINOR** | Demand | Temporal gap in test period: train ends 2025-09-30, val 2025-10-01–10-31, test starts 2025-11-01. October gap leaves a 1-month hole between val and test, making val MAPE not predictive of test MAPE | Evaluation protocol inconsistency |
| F-14 | **MINOR** | Churn | CHURN_FEATURES_DESIRED (lines 60–71 of 14_churn_model.py) is dead code. Actual features selected dynamically from numeric columns. Feature set is non-deterministic across runs | Cannot reproduce feature set without re-running on identical table state |
| F-15 | **MINOR** | Both | No unit tests on any feature transformation. Leakage validation in notebook 10 checks only `sales_lag_7d`; does not check inventory, VPO, or weather features | Regressions in feature logic are undetectable |
| F-16 | **INFO** | Demand | ABC class MAPE spread: A=0.1381, B=0.1489, C=0.1772. Class C is 28% worse than Class A. Class C SKUs are low-volume, hardest to forecast — expected but unmitigated | May need separate model or ensemble for Class C |
| F-17 | **INFO** | Demand | Bias = -0.01293 (slight under-forecast). Small and acceptable if constant; not decomposed by store type, SKU class, or time period | Need bias decomposition before production use |
| F-18 | **INFO** | Both | MLflow in legacy Hive metastore registry with `transition_model_version_stage()`. No Unity Catalog, no model aliases, no lineage tracking | Technical debt; blocks future governance requirements |

---

## 2. Demand Forecast Audit

### 2.1 Run Identification

| Field | Value |
|-------|-------|
| Model name | demand_forecast_champion |
| Champion version | v1 (only version) |
| Run ID | `2672062543394885bca519298f0adce6` |
| Run name | champion_model |
| Trained by | pratik.m@syrencloud.com |
| Training date | 2026-03-29 |
| Algorithm | LightGBM LGBMRegressor |
| Source notebook | `/retail_forecast_accelerator/11_train_lightgbm` |

### 2.2 Primary Metric Verification

| Metric | MLflow logged | Verification | Notes |
|--------|--------------|--------------|-------|
| test_mape | **0.15908** (15.91%) | ✓ Consistent with feature set and data provenance | Plausible for mixed-ABC retail at 2-month horizon |
| test_wmape | **0.14389** (14.39%) | ⚠ Non-standard formula | Not comparable to industry; see F-06 |
| test_mae | **1.1429** units | Consistent with a dataset where median sales ≈ 5–8 units/day | Plausible |
| test_rmse | **2.1696** units | RMSE/MAE ratio = 1.898 — moderately heavy tail | Acceptable |
| test_bias | **-0.01293** | Slight systematic under-forecast | Needs decomposition |

**MAPE by store type:**

| Store Type | MAPE |
|------------|------|
| Dark Store | 15.11% |
| Express | 15.70% |
| Hypermarket | 16.03% |
| Supermarket | 16.23% |

Spread of 1.12pp. Dark Stores have best accuracy — likely because they have fewer SKUs and more stable demand patterns.

**MAPE by ABC class:**

| Class | MAPE | vs. Class A |
|-------|------|-------------|
| A (high volume) | 13.81% | baseline |
| B (medium volume) | 14.89% | +1.08pp |
| C (low volume) | 17.72% | +3.91pp (+28%) |

Class C degradation is significant. Class C SKUs typically drive the long tail of inventory decisions; 17.7% MAPE on them has disproportionate impact on stockouts and overstock.

**Festival vs. non-festival:**

| Period | MAPE |
|--------|------|
| Non-festival | 15.849% |
| Festival | 15.987% |
| Delta | **+0.138pp** |

Finding F-11: The model barely differentiates festival demand. With 8 festival-related features (`is_festival_period`, `festival_intensity_encoded`, `days_to_festival`, `days_after_festival`, `is_eid`, `is_ramadan`, `is_navratri_fast`, `is_ipl_season`), a 0.14pp MAPE difference implies these features contribute near-zero marginal value for festival lift prediction.

### 2.3 Missing Metrics (Not Logged)

The following metrics were requested in the audit task but were not logged to MLflow. They cannot be computed without live Databricks access:

| Metric | Why Missing | Risk |
|--------|-------------|------|
| MAPE by lead time (1d / 7d / 14d / 28d) | Model does not have a lead_time column; single horizon per row | Cannot assess forecast degradation over horizon |
| MAPE for intermittent demand SKUs | Not segmented; would require CV>1.5 filter on gold table | Cannot quantify cold-start and sparse-demand risk |
| MAPE for new SKUs (<90 days history) | Not logged; `sku_age_days` feature not in model | Cannot assess new product launch accuracy |
| P10/P90 prediction interval coverage | Point forecast only; no quantile regression | Inventory planners have no uncertainty signal |
| Forecast bias by month | Single bias scalar logged | Cannot detect seasonal bias patterns |
| MAPE by forecast horizon month | Test = Nov–Dec 2025 only | Nov vs. Dec breakdown not available |

### 2.4 Feature Leakage Analysis

**Confirmed leaky features in top-20 by importance:**

| Feature | Importance | Rank | Leakage Type |
|---------|-----------|------|-------------|
| `days_of_stock` | 1609 | #1 (tied) | **Definitional**: `closing_stock / avg_daily_sales` uses same-day closing inventory |
| `closing_stock` | 1470 | #5 | **Definitional**: end-of-day inventory = opening + receipts - same-day sales |
| `is_stockout` | — | not in top-20 logged | **Definitional**: derived from closing_stock |

**Leakage quantification:**

- Top-20 features total importance: 24,103
- `days_of_stock` importance: 1,609
- `closing_stock` importance: 1,470
- Combined leaky importance: **3,079 / 24,103 = 12.8%**

At inference time, `closing_stock` and `days_of_stock` will not be available at their end-of-day values when generating next-day forecasts (they require closing the books for the current day). This means 12.8% of the model's decision weight relies on information that does not exist when forecasts are generated.

**Look-ahead bias features (7 features, lower leakage risk but present):**

These features use NTILE classifications computed over the full dataset timeline including the test period:
- `volume_class_encoded`, `profit_class_encoded`, `occasion_class_encoded` (notebook 09, VPO)
- `throughput_encoded`, `sec_class_encoded`, `perishable_capability_encoded`, `promo_sensitivity_encoded` (notebook 09, Outlet)

The classification thresholds (NTILE boundaries) are computed using `Window.orderBy(desc("total_qty_sold"))` with no date partition. Any new data changes all NTILE assignments retroactively.

### 2.5 Training Data Issues

**Random temporal sampling (F-05):**

```python
# notebook 11, lines ~175-182
if train_count > MAX_TRAIN_ROWS:
    sample_fraction = MAX_TRAIN_ROWS / train_count
    train_df = train_df.sample(fraction=sample_fraction, seed=42)
```

- Full training set: ~52M rows (estimated from date range 2020-09-30, ~29K SKU-stores)
- After sampling: 2,499,420 rows
- Sampling fraction: **~4.8% (≈1/21 of training data retained)**

Consequence: for any given SKU-store, the training sequence has large random gaps. A rolling 7-day window computed on gap-filled data may span actual date ranges of 4–12 weeks. The lag and rolling features were computed on the full dataset in notebooks 08–09, so the feature values are correct — but the model trains on sparse slices of the time series, which breaks the autocorrelation structure that makes lag features informative.

**Final model trained without early stopping (F-09):**

```python
# notebook 11, line ~434
final_model = LGBMRegressor(**best_params)
final_model.fit(X_train_val, y_train_val)  # No eval_set, no callbacks
```

The `early_stopping_rounds=30` in logged params was used during Hyperopt validation folds. The final production model trains to `n_estimators=250` without any stopping criterion. If the optimal stopping point from validation is, say, round 180, the production model adds 70 potentially over-fitted trees.

### 2.6 wMAPE Formula Error (F-06)

**Logged formula (notebook 11, lines 284–285):**
```python
weights = y_true / y_true.sum()
wmape = np.sum(np.abs(y_true - y_pred) * weights) / np.sum(weights * y_true_safe)
```

Expanding: `wmape = sum(|e| × (y/Σy)) / sum((y/Σy) × y) = sum(|e| × y) / sum(y²/Σy) = Σy × sum(|e| × y) / sum(y²)`

This is a volume²-weighted metric, not standard wMAPE.

**Standard wMAPE:** `sum(|y - ŷ|) / sum(y)`

The reported 14.39% wMAPE cannot be compared to any published benchmark or competitor claim. For a Five Below pitch, using this number without disclosure is misleading.

---

## 3. Churn Prediction Audit

### 3.1 Run Identification

| Field | Value |
|-------|-------|
| Model name | churn_prediction_champion |
| Champion version | v2 |
| Run ID | `4ef5276f1c6b4f888d789d3338d4e2a7` |
| Run name | churn_champion |
| Trained by | pratik.m@syrencloud.com |
| Algorithm | LightGBM LGBMClassifier |
| Source notebook | `/ML_Models/14_churn_model` |

### 3.2 Primary Metric Verification

| Metric | MLflow logged | Assessment |
|--------|--------------|-----------|
| test_auc | **0.93328** | ⛔ Invalid — circular construction (see §3.3) |
| test_f1 | **0.86628** | ⛔ Invalid — same reason |
| test_precision | **0.83769** | ⛔ Invalid |
| test_recall | **0.89689** | ⛔ Invalid |

**Derived confusion matrix** (assumptions: churn_rate=0.30008, test_size=7500):

| | Predicted Churn | Predicted Non-Churn |
|-|----------------|---------------------|
| **Actual Churn** | TP ≈ 2,018 | FN ≈ 232 |
| **Actual Non-Churn** | FP ≈ 392 | TN ≈ 4,858 |

- Approx accuracy: 91.7%
- Approx false positive rate: **7.47%**
- Approx specificity: 92.5%

A 7.5% FPR on a 30% base-rate problem with only 7 features is anomalously low. For a genuinely predictive model on customer data with this feature set, FPR of 15–25% would be typical. The suppressed FPR is consistent with the model having near-perfect information (it is predicting a deterministic function of its own features).

### 3.3 Circular Label Construction — Quantitative Analysis

**The fundamental problem:**

The churn target is not an observed outcome. It is a computed score:

```
churn_signal = recency_norm × 0.4
             + (1 - engagement_norm) × 0.3
             + (1 - freq_norm) × 0.2
             + (1 - nps_norm) × 0.1

label = 1 if churn_signal >= p70(churn_signal) else 0
```

Where:
- `recency_norm = days_since_purchase / max(days_since_purchase)` ← **Feature #1 in model**
- `engagement_norm = 1 - engagement_score_raw / max(engagement_score_raw)` ← **Feature #3 in model**
- `freq_norm = 1 - total_transactions / max(total_transactions)` ← **Feature #2 in model**
- `nps_norm = 1 - latest_nps_score.fillna(5) / 10.0` ← **Feature #4 in model**

**Circularity ratio: 4/7 features = 57% of features are direct algebraic inputs to the target.**

The model is learning the approximate inverse of the formula used to construct the target. With slight noise from the remaining 3 features (`total_spend`, `loyalty_points_balance`, `avg_csat_score`) and from the quantile thresholding, AUC of 0.933 is the expected performance of a near-deterministic reconstruction.

**Global normalization leakage:**

`.max()` is computed on the full 50K customer dataset before train/test split. This means:
- The test set label for customer X depends on the maximum value of `days_since_purchase` across all 50K customers, including other test customers
- Removing any single test customer would change the `.max()` denominator and therefore change all other customers' normalized values and therefore their labels
- This is canonical data leakage per Kaufman et al. (2012)

**What the AUC 0.933 actually measures:**

The model reconstructs a noisy approximation of the formula `f(days_since_purchase, engagement_score_raw, total_transactions, latest_nps_score)`. The remaining 3 features are correlated with the circular features, providing additional signal. The 0.067 gap from perfect AUC=1.0 represents the noise from:
1. Quantile thresholding (top 30% → binary converts continuous signal to discrete label)
2. Random train/test split separating some correlated feature relationships
3. Marginal independent information from `total_spend`, `loyalty_points_balance`, `avg_csat_score`

### 3.4 Fabricated Time-Horizon Probabilities (F-02)

```python
# notebook 14_churn_model.py, lines 419–421
churn_scores['churn_prob_30d'] = all_proba * 0.75
churn_scores['churn_prob_60d'] = all_proba * 0.50
churn_scores['churn_prob_90d'] = all_proba  # base model output
```

There is no 30-day or 60-day model. These are the 90-day probability multiplied by hardcoded constants (0.75, 0.50). The implication:
- A customer with `churn_prob_90d = 0.80` will show `churn_prob_30d = 0.60` — arithmetically derived, not model-predicted
- The monotonic relationship (30d < 60d < 90d) is guaranteed by construction, not by data
- These numbers are presented in the CX360 UI as model outputs

This is the most directly user-visible validity issue: if a customer success team acts on the 30-day probability, they are acting on a fabricated number.

### 3.5 Missing Metrics (Not Logged)

| Metric | Why Missing | Risk |
|--------|-------------|------|
| Calibration curve | Not computed | Cannot assess probability reliability (critical for action threshold setting) |
| Lift at top 10% / 20% | Not computed | Cannot quantify value of model prioritization vs. random |
| Precision/Recall at multiple thresholds | Not logged | Only one operating point visible |
| Segment stability (by loyalty_tier, geography, channel) | Not logged | Cannot detect demographic bias or segment-level failures |
| KS statistic | Not logged | Cannot assess score separation quality |
| Population Stability Index over time | Not computed | Cannot detect distribution shift on scoring runs |

### 3.6 Champion Version Selection (F-08)

| Version | AUC | F1 | n_estimators | max_depth | num_leaves |
|---------|-----|----|-------------|-----------|-----------|
| v1 | 0.93430 | 0.86622 | 350 | 7 | 20 |
| v2 (champion) | 0.93328 | 0.86628 | 100 | 5 | 75 |
| Delta (v2–v1) | **-0.00102** | **+0.00006** | -250 | -2 | +55 |

v2 is the champion despite having a lower AUC by 0.00102. The delta is within the noise range for a 7500-row test set (1/√(7500×0.30×0.70) ≈ standard error of 0.005 in recall). The selection rationale documented in run.json acknowledges this: "The marginal AUC gain is within noise; the 'champion' selection is not statistically robust."

Given that both models are invalid due to circular construction, this comparison is moot — but it illustrates that the selection process lacks statistical rigor.

---

## 4. Pitch-Readiness Verdicts

### 4.1 Demand Forecast Model

**Verdict: NEEDS MAJOR WORK**

**Blocker issues (must fix before any external claim):**
1. **Remove leaky features** (F-03): `closing_stock`, `days_of_stock`, `is_stockout` must be excluded. Expect MAPE to increase. Re-benchmark after removal.
2. **Fix look-ahead bias in VPO/Outlet** (F-04): Recompute NTILE classifications using only history available as of each SKU-store's training cutoff date.
3. **Fix wMAPE formula** (F-06): Replace with `sum(|y-ŷ|)/sum(y)`. The 14.39% figure cannot be stated externally.
4. **Replace random temporal sampling** (F-05): Use time-aware sampling (e.g., stratified by recency bucket) or train on the full dataset with chunked Spark reads.

**Secondary issues (should fix before Five Below pilot):**
5. **Re-train final model with early stopping applied** (F-09)
6. **Add quantile regression or conformal prediction intervals** — inventory planners need P10/P90
7. **Log MAPE by lead time** — demand for D+1 vs. D+7 vs. D+28 forecasts are very different accuracy regimes
8. **Replace India-specific festival features** with US equivalents for Five Below: hurricane event windows, major US retail holidays (Black Friday, back-to-school, Super Bowl)

**What is genuine:** The temporal validation design (train pre-Sep 2025, test Nov–Dec 2025) is methodologically sound. The LightGBM architecture with Hyperopt tuning is appropriate. The ABC-class MAPE decomposition and store-type breakdown show reasonable variation patterns.

**Realistic post-fix MAPE estimate:** Removing leaky features and fixing sampling will likely increase MAPE to 17–22% range. This is still competitive for a 64-feature retail forecast model.

---

### 4.2 Churn Prediction Model

**Verdict: NOT PITCH-READY — FUNDAMENTAL VALIDITY ISSUE**

**The model cannot be used in its current form for any external claim.**

**Critical blocker (F-01 + F-07):**

The churn target is a deterministic function of 4 of the 7 input features. The model has no genuine predictive signal about customer behavior. It is learning to reconstruct its own target formula. AUC 0.933 is an artifact of circular construction, not a measure of predictive accuracy.

**This is not a tuning problem.** Re-training with different hyperparameters will not fix it. The fix requires:

1. **Define churn as an observed business outcome.** Options:
   - No purchase in the next N days (30/60/90) — requires a future-looking label cutoff
   - Account cancellation, subscription lapse, or loyalty card deactivation
   - Combination: no transactions + no engagement for 90 days

2. **Rebuild with proper temporal train/test split:**
   - Label observation window: e.g., purchases in Jan–Dec 2025
   - Prediction window: churn label = no purchase in Jan–Mar 2026
   - Features: computed as of Dec 31, 2025 (no look-ahead)

3. **Recompute normalization after split** — `.max()` should be computed on train set only, applied to test set

4. **Replace fabricated 30d/60d probabilities** (F-02) with actual 30d and 60d horizon models trained on appropriate label windows

**What is salvageable:** The feature engineering infrastructure (`gold_customer_360_v2`), the LightGBM + Hyperopt framework, and the scoring/output pipeline are sound. The rebuild is a labeling and split correction, not an architecture replacement.

**Timeline estimate for rebuild:** 2–3 weeks (label redefinition, data extraction with temporal split, retraining, evaluation).

---

## 5. Recommended Remediation Sequence

### Week 1 — Churn Label Rebuild (highest priority; blocks all churn claims)

| Day | Task |
|-----|------|
| 1–2 | Define business churn definition with stakeholders. Recommend: no purchase for 90 days after observation date. |
| 3–4 | Build temporal label: observation cutoff = 2025-09-30, churn window = Oct–Dec 2025 |
| 5 | Train/test split by time: features as of Sep 30, labels from Oct–Dec |

### Week 2 — Demand Feature Cleanup

| Day | Task |
|-----|------|
| 1 | Exclude `closing_stock`, `days_of_stock`, `is_stockout` from feature list |
| 2–3 | Fix VPO/Outlet NTILE to use date-bounded history (train period only) |
| 4 | Fix wMAPE formula; re-log standard wMAPE |
| 5 | Replace random temporal sampling with time-stratified sampling |

### Week 3 — Re-evaluation and Five Below Adaptation

| Day | Task |
|-----|------|
| 1–2 | Retrain demand model; log MAPE by lead time (D+1, D+7, D+14, D+28) |
| 3 | Retrain churn model on corrected labels; compute calibration, lift at 10%/20% |
| 4–5 | Begin Five Below feature gap: hurricane event windows + US holiday calendar replacement for India-specific features |

### Minimum Viable Audit Additions (apply to both models before any demo)

- [ ] Log P10/P90 coverage for demand (conformal prediction, ≤1 day to add)
- [ ] Log calibration curve for churn (sklearn `calibration_curve`, ≤2 hours)
- [ ] Log lift at top 10%/20% for churn (≤2 hours)
- [ ] Log MAPE by lead time for demand (requires horizon column in test data)
- [ ] Add unit tests for at least the 3 definitionally leaky features
- [ ] Fix Feature Store registration (resolve `try/except ImportError` — requires Unity Catalog enablement)

---

*Report generated from: mlflow_inventory.json · table_inventory.csv · 14 notebook source files · churn_feature_lineage.csv · demand_feature_lineage.csv · model_audit/*/run.json*  
*Live Databricks queries not available; derived metrics are marked where assumptions apply.*
