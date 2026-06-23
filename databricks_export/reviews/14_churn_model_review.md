# Code Review: `14_churn_model.py`
## Customer Churn Prediction Model — LightGBM

> Reviewer: Claude Code  
> Date: 2026-05-20  
> Source: `databricks_export/notebooks/ML_Models/14_churn_model.py`  
> Production model: `churn_prediction_champion` v2 (Production stage)

---

## 1. What the Notebook Does

| Lines | Block | What executes |
|---|---|---|
| 12 | `%pip install` | Installs typing_extensions, mlflow[databricks], lightgbm, hyperopt, shap |
| 16 | Restart | `dbutils.library.restartPython()` |
| 20–47 | Config | Sets CATALOG, SCHEMA_GOLD/SCHEMA_ML, FEATURE_TABLE=`gold_customer_360_v2`, EXPERIMENT_NAME, MODEL_NAME, HYPEROPT_MAX_EVALS=20, EARLY_STOPPING_ROUNDS=30 |
| 56–71 | Feature list (partial) | Declares `CHURN_FEATURES_DESIRED` (8 named columns) — **this list is never actually used** |
| 84–85 | Load data | `spark.table(FEATURE_TABLE).toPandas()` — loads all 50K rows into driver RAM |
| 97–110 | Dynamic feature selection | Selects ALL numeric columns, excludes patterns matching 'customer_id', 'date', '_at', 'ref_date', keeps columns >50% non-null |
| 118–134 | Recency column detection | Searches for `days_since_purchase`, `days_since_last_purchase`, `recency`; falls back to computing from `last_purchase_date` |
| 138–161 | Engagement/NPS/freq detection | Searches for engagement, NPS, and frequency columns by name patterns |
| 165–203 | **Target construction** | Builds composite churn signal from 4 normalized components (recency 40%, engagement 30%, frequency 20%, NPS 10%); labels top 30% (p70 threshold) as churn=1 |
| 207–209 | Target validation | Asserts binary target, asserts churn rate in [15%, 50%] |
| 218–237 | Train/val/test split | **Random stratified split**: 70% train, 15% val, 15% test; fills NaN with 0 |
| 246–285 | Hyperopt objective | `objective()`: trains LGBMClassifier with `scale_pos_weight`, early stopping; returns `-auc` as loss; logs val AUC + F1 |
| 275–285 | Search space | 9-param search space, same structure as demand model |
| 294–303 | Run Hyperopt | 20 trials, TPE; logs best params to parent run |
| 315–333 | Final model | Combines train+val, trains LGBMClassifier — **no early stopping**, same issue as demand model |
| 343–358 | Test evaluation | Computes AUC, F1, precision, recall; prints classification report |
| 367–386 | SHAP | `shap.TreeExplainer` on test set; computes mean absolute SHAP per feature; labels direction |
| 396–406 | Save SHAP table | Writes feature importance to `retail_ml.churn_feature_importance` with hardcoded `model_version="1"` |
| 415–428 | Score all customers | Predicts on all 50K rows; **fabricates 30d and 60d probabilities as linear rescalings** |
| 434–441 | Save scores | Writes `customer_id` + 3 probability columns + risk tier to `retail_ml.churn_scores` |
| 450–473 | MLflow logging + registration | Logs params/metrics; `log_model` without input_example or signature; registers and immediately transitions to Production |
| 482–494 | Summary | Print statement |

---

## 2. Data Inputs

**Table read:** `hive_metastore.retail_gold.gold_customer_360_v2` (50,000 rows, 30 columns, last modified 2026-04-06)

**Columns read:** All columns via `spark.table().toPandas()` — no column projection. Schema not pinned.

**Features used at runtime:** Dynamic selection from numeric columns (lines 97–104):
```python
numeric_cols = cx360.select_dtypes(include=[np.number]).columns.tolist()
CHURN_FEATURES = [c for c in numeric_cols
                  if not any(p in c.lower() for p in exclude_patterns)
                  and cx360[c].notna().sum() > len(cx360) * 0.5]
```
The `CHURN_FEATURES_DESIRED` list defined at lines 60–71 (8 columns) is **never used**. The features that actually train the model are determined at runtime by what's numeric and non-null in `gold_customer_360_v2`. MLflow logs `n_features=7` but not the feature names.

**Filters applied:** None. All 50,000 customers are included regardless of data quality, account status, or record age.

**Target construction:** Not from observed behavior. The target is engineered inside this notebook from four in-table columns:
- `days_since_purchase` (recency, weight 0.40)
- `engagement_score` or equivalent (weight 0.30)
- `total_transactions` (frequency, weight 0.20)
- `latest_nps_score` (weight 0.10)

Top 30% composite score → churn=1. No ground-truth churn label exists.

**Train/test split logic:** Random stratified split (lines 225–226):
```python
train_df, temp_df = train_test_split(cx360, test_size=0.3, random_state=42, stratify=cx360[TARGET_COL])
val_df, test_df   = train_test_split(temp_df, test_size=0.5, random_state=42, stratify=temp_df[TARGET_COL])
```
No time dimension. All 50K customers come from the same snapshot (gold_customer_360_v2, 2026-04-06). Train and test are drawn from the same point in time.

**Leakage checks done:** None. The notebook's comment at line 78 explicitly acknowledges the label problem ("Cannot use `customer_segment` as target - only 3 segments exist") but the chosen workaround (composite signal) is itself a leakage problem — see §7.

---

## 3. Feature Engineering Inline

**The target variable is entirely engineered inline in this notebook.** This is the notebook's most significant structural problem and is not a style concern — it is the mechanism by which leakage occurs.

Inline engineering in this notebook:

**Lines 165–199 — Composite churn signal construction:**
```python
recency_norm    = cx360[recency_col] / cx360[recency_col].max()
engagement_norm = 1 - (cx360[engagement_col] / cx360[engagement_col].max())
freq_norm       = 1 - (cx360[freq_col] / cx360[freq_col].max())
nps_norm        = 1 - (cx360[nps_col].fillna(5) / 10.0)
cx360["churn_signal"] = recency_norm*0.4 + engagement_norm*0.3 + freq_norm*0.2 + nps_norm*0.1
cx360["churn_target"] = (cx360["churn_signal"] >= cx360["churn_signal"].quantile(0.70)).astype(int)
```
This computation is global — it uses `cx360[col].max()` computed across all 50K rows before any split. If the max of a feature column falls in the test set, then normalization of training data uses information from the future. For example, if the highest-recency customer is in the test set, all training rows are normalized relative to that test-set observation.

**Lines 415–421 — Multi-horizon probabilities:**
```python
cx360["churn_probability_90d"] = np.round(all_proba, 4)
cx360["churn_probability_60d"] = np.round(all_proba * 0.75, 4)
cx360["churn_probability_30d"] = np.round(all_proba * 0.50, 4)
```
Three output columns presented as distinct model outputs. Two are arithmetic derivations with no empirical basis.

---

## 4. Model Training

**Algorithm:** LightGBM Classifier (`lgb.LGBMClassifier`)

**Hyperparameter search space (lines 275–285):** Same 9-parameter space as demand model (slightly tighter ranges: learning_rate [0.01, 0.3], max_depth [3, 8], num_leaves [15, 127]).

**CV strategy:** None. Single train/val split, 20 TPE trials.

**Early stopping (Hyperopt):** 30 rounds on validation AUC (lines 263–264). Correctly used during Hyperopt.

**Early stopping (final model):** **Absent.** Line 333:
```python
final_model.fit(X_train_val, y_train_val)
```
Same defect as demand model — see C1 in demand review. `n_estimators` from Hyperopt is the ceiling, not the actual tree count.

**Class weighting:** `scale_pos_weight` = ratio of negative to positive class (lines 258, 325). This is correct treatment for class imbalance. However:
- During Hyperopt (line 258): computed from `y_train` only.
- For final model (line 325): computed from `y_train` only, even though final model trains on `y_train_val` (train+val combined). If the val set has different class balance (it's stratified so should be the same), this is fine — but it's not verified.

**Scoring metric for tuning:** Negative AUC (line 273: `return {"loss": -auc, "status": STATUS_OK}`). 

**Decision threshold:** Hardcoded 0.5 (line 268, 344). No threshold optimization, no Youden's J, no cost-sensitive threshold tuning.

---

## 5. Evaluation

**Metrics computed:** AUC, F1, Precision, Recall (overall); full `classification_report` (lines 346–358); SHAP per feature (lines 367–392).

**What's specifically good:**
- SHAP-based feature importance (not split-count) gives directional signal — correct.
- `classification_report` prints per-class precision/recall — useful for the minority class.
- AUC is the correct primary metric for an imbalanced binary problem.

**Issues:**

**No holdout discipline — test set contaminated by global normalization (lines 165–173):**
The min/max normalization at lines 169, 173, 178 uses the entire 50K-row dataset before the train/test split at line 225. The test set's feature values are normalized using statistics derived from the full population, including test rows. This is a preprocessing leakage that inflates AUC modestly (affects normalization constants, not the target label itself).

**No time-based split — cannot measure future generalization (lines 225–226):**
All customers are from the same snapshot. The 70/15/15 random split means test performance measures how well the model reconstructs the composite score on held-out customers from the same time period — not whether it predicts actual churn in the future. AUC of 0.933 cannot be interpreted as "this model predicts future churn with 0.933 AUC."

**No segment-level evaluation:**
The demand model evaluates by abc_class, store_type, and festival period. The churn model evaluates only overall metrics. For a CX360 application, the questions that matter are:
- Does the model work equally well for Loyal vs. Promising vs. Champion segments?
- Does it work for high-value (top decile by spend) vs. low-value customers?
- Does it generalize across geographies or store channels?
None of these are measured.

**No calibration check:**
The model outputs `churn_probability_90d` which is presented as a probability. There is no calibration plot, Brier score, or reliability diagram. LightGBM classifiers are not natively calibrated and tend to push probabilities toward 0 and 1. An AUC of 0.933 is consistent with good ranking but poor probability calibration.

**Prediction interval:** Not applicable for a classifier, but risk tier boundaries (lines 421–425) are hardcoded thresholds with no empirical basis:
```python
bins=[-0.01, 0.30, 0.70, 1.01]   # Low / Medium / High
```
No analysis of what these thresholds mean in terms of actual customer behavior.

**Missing:**
- Calibration curve / Brier score
- Segment-level AUC (by customer_segment, loyalty_tier)
- Lift/gain chart (most important for CRM targeting)
- K-S statistic
- Temporal validation (model trained on snapshot T, evaluated on snapshot T+30d)

---

## 6. MLflow Logging

**What is logged (lines 453–465):**
| Item | Logged | Notes |
|---|---|---|
| Hyperparams (9) | ✓ | Via `mlflow.log_params(best_params)` |
| n_features, train_size, test_size | ✓ | As params |
| churn_rate | ✓ | As param — the synthetic churn rate, not real churn |
| target_method | ✓ | "composite_signal_p70" — documents the construction method |
| test_auc, f1, precision, recall | ✓ | |
| LightGBM model artifact | ✓ | `mlflow.lightgbm.log_model(final_model, "churn_model")` |

**What is missing:**
| Item | Missing | Impact |
|---|---|---|
| Model signature | ✗ | No `signature=` or `input_example=` passed to `log_model` — model schema is completely unrecorded |
| Input example | ✗ | Unlike demand model which logs `X_test.head(5)`, churn model logs nothing |
| Feature names | ✗ | `n_features=7` logged but not which 7 — features are selected dynamically at runtime |
| val_auc (champion run) | ✗ | Val metrics only in nested Hyperopt runs; champion run has no val_auc |
| SHAP artifact | ✗ | SHAP values computed but saved to a Delta table (`retail_ml.churn_feature_importance`), not logged to MLflow as artifact |
| feature table version | ✗ | `gold_customer_360_v2` Delta version not recorded |
| composite signal weights | ✗ | The 0.4/0.3/0.2/0.1 weighting is not logged anywhere — target construction is not reproducible from MLflow metadata alone |
| Threshold used for binary prediction | ✗ | Hardcoded 0.5 not logged |
| Python/library versions | ✗ | Same gap as demand model |

---

## 7. Quality Issues

### Critical

**C1 — Target leakage: model predicts its own construction inputs (lines 97–199)**
The target `churn_target` is a function of `days_since_purchase`, `engagement_score`, `total_transactions`, and `nps_score`. The feature selection at lines 97–104 selects ALL numeric columns except those matching exclusion patterns. `days_since_purchase`, `total_transactions`, `latest_nps_score`, and engagement score are numeric and do not match any exclusion pattern — they remain in `CHURN_FEATURES`. The model is trained to predict a label that is a direct deterministic function of its input features.

This explains the AUC of 0.933 completely. The model has learned to reconstruct the composite formula, not to predict actual customer behavior. To verify: if you compute `churn_signal` for the test set and rank by it, the AUC of that ranking against `churn_target` would be ~1.0 by construction.

**Consequence:** `retail_ml.churn_scores` is populated with probabilities that measure "distance from the 70th percentile composite score," not "likelihood of no purchase in 90 days." Any action taken on this score (retention campaigns, CRM segments) is based on a circular definition.

**C2 — 30d and 60d probabilities are fabricated constants (lines 419–421)**
```python
cx360["churn_probability_60d"] = np.round(all_proba * 0.75, 4)
cx360["churn_probability_30d"] = np.round(all_proba * 0.50, 4)
```
These are not predictions. There is no model trained on 30- or 60-day outcomes. The multipliers (0.75, 0.50) have no empirical derivation — they are placeholders. These values are written to `retail_ml.churn_scores` and presumably surfaced in the CX360 UI as distinct predictions. A user acting on the 30-day churn probability is acting on (90d_score × 0.5) with no validity.

**C3 — Global normalization before split leaks test statistics into training (lines 169–178)**
```python
recency_norm = cx360[recency_col] / cx360[recency_col].max()
```
`cx360[recency_col].max()` is computed over all 50,000 rows before `train_test_split` at line 225. If the customer with maximum recency (the most churned-looking customer) is in the test set, every training row's normalized recency is relative to that test-set observation. Correct approach: fit normalization on train only, transform val/test using train statistics.

**C4 — Final model trained without early stopping (line 333)**
```python
final_model.fit(X_train_val, y_train_val)   # no callbacks, no eval_set
```
Same defect as demand model. See demand review C1.

**C5 — `model_version` hardcoded as "1" in the feature importance table (line 397)**
```python
feature_importance["model_version"] = "1"
```
After v2 is registered as Production (which is the current state), the `retail_ml.churn_feature_importance` table still says version "1". Any downstream query joining on model version is wrong.

### Major

**M1 — `CHURN_FEATURES_DESIRED` list is dead code (lines 60–71)**
Eight columns are carefully named in a list with inline comments. This list is never referenced after line 71. The actual features come from the dynamic selector at lines 97–104. The dead list misleads anyone reading the notebook about what features the model uses.

**M2 — Feature set is non-reproducible and schema-dependent (lines 97–104)**
Adding a numeric column to `gold_customer_360_v2` automatically adds it to the next training run's feature set. Renaming a column silently removes it. The feature set is not pinned. Since feature names are not logged to MLflow, you cannot reconstruct the exact model from metadata alone.

**M3 — `scale_pos_weight` computed from `y_train` only for final model on `y_train_val` (lines 325–333)**
```python
"scale_pos_weight": len(y_train[y_train==0]) / max(len(y_train[y_train==1]), 1),
```
`y_train_val = pd.concat([y_train, y_val])` is used for fitting, but `scale_pos_weight` is based on `y_train`. With stratified splits the proportions are identical, so impact is minimal — but it's incorrect and would be wrong if splits were not stratified.

**M4 — No segment-level evaluation at all**
A CRM model without per-segment metrics is incomplete. High-value customers with low predicted churn risk drive the most revenue — if the model is miscalibrated for that segment, it's the most damaging place to be wrong. This is not measured anywhere.

**M5 — No model signature or input example in `log_model` (line 464)**
```python
mlflow.lightgbm.log_model(final_model, "churn_model")
```
No `signature`, no `input_example`. Compared to the demand model which at least passes `input_example=X_test.head(5)`, the churn model logs nothing about its expected input schema. Serving this model with a renamed or missing column will fail at inference with an unhelpful error (or worse, produce wrong predictions silently if LGBM fills missing columns as 0).

**M6 — Immediate Production promotion with no gate (lines 471–472)**
```python
result = mlflow.register_model(model_uri, MODEL_NAME)
client.transition_model_version_stage(MODEL_NAME, result.version, "Production")
```
Every successful notebook execution creates a new Production version. No comparison to the previous champion's test metrics. No human approval step. A rerun with a bug that produces 0.6 AUC would immediately become Production.

### Minor

**m1 — SHAP computed on test set, but test set has leakage (line 370)**
The SHAP explanation inherits the circular problem — the most important SHAP features will be the components of the composite signal, making the explanation a tautology.

**m2 — Risk tier bins are arbitrary constants (lines 421–425)**
`bins=[-0.01, 0.30, 0.70, 1.01]` — Low/Medium/High. No validation that these thresholds correspond to meaningfully different behavior. This should be data-driven (e.g., top decile, top quartile).

**m3 — Comment embeds product UI reference (line 8)**
```python
# Unblocks chart 07-2.3 (Churn Driver Analysis with SHAP)
```
This is a product management reference, not code documentation. If the UI chart is renumbered, this comment becomes misleading.

**m4 — `assert 0.15 < cx360[TARGET_COL].mean() < 0.50` is a tautology (line 208)**
The threshold was computed as p70 of the signal — by design, exactly 30% of rows get label=1. The assertion always passes because the threshold was chosen to make it pass.

**m5 — NPS fillna(5) is undocumented domain assumption (line 185)**
```python
nps_norm = 1 - (cx360[nps_col].fillna(5) / 10.0)
```
Missing NPS → imputed as 5 (neutral) → normalized to 0.5 → risk contribution of 0.05 (neutral). This is a reasonable assumption but is not documented, not logged, and not tested for sensitivity.

---

## 8. What's Missing for an Enterprise-Grade Pitch

| Gap | Specific issue |
|---|---|
| **Real churn ground truth** | The most fundamental gap: there is no `churn_label` column derived from observed behavior (e.g., "customer made no purchase in the 90 days following observation date T"). The entire model predicts a synthetic composite score. An enterprise deployment needs: a labeled training set where `churn_label = 1` if the customer was inactive for N days *after* the observation date. |
| **Temporal train/test discipline** | Churn models must be evaluated on future behavior: train on customers observed at T, test on whether they actually churned by T+90d. The current snapshot-only approach cannot measure this. |
| **Calibration** | `churn_probability_90d` is presented as a probability but LightGBM classifiers are not calibrated. A `CalibratedClassifierCV` wrapper or isotonic regression post-hoc calibration is needed before this can be used in expected-value business calculations. |
| **Multi-horizon models** | Three probability horizons (30d, 60d, 90d) require three separate models, trained on three separate labeled datasets. Scaling probabilities by constant multipliers is not a valid substitute. |
| **Drift detection hook** | No baseline feature distribution logged. No monitoring of score distribution shifts over time (which is especially important here since the target is synthetic — score drift is the only signal of degradation). |
| **Retraining cadence** | No scheduled job. `gold_customer_360_v2` was last updated 2026-04-06 — the model has been Production for ~6 weeks on a static snapshot. |
| **Champion/challenger gate** | New version is promoted to Production unconditionally. No AUC comparison to current champion, no A/B test framework. |
| **Feature store registration** | Features are read directly from a gold table. No Databricks Feature Store registration means no point-in-time lookup, no online serving path, no feature freshness SLA. |
| **SHAP artifact in MLflow** | SHAP values are written to a Delta table but not logged as an MLflow artifact. You cannot retrieve the SHAP explanation from the model registry — it lives only in the table, which will be overwritten on the next run. |
| **Feedback loop** | No mechanism to record which customers actually churned post-scoring, which means the model can never be retrained on ground truth even if a labeling process is eventually built. |

---

## Quality Score: **2 / 10**

The AUC of 0.933 is not a model quality signal — it is a symptom of the model learning to reconstruct its own target's construction formula. The three critical defects (circular target, fabricated multi-horizon probabilities, global-before-split normalization) mean the Production model's output cannot be used as-is for any business decision. The 30d and 60d churn columns in `retail_ml.churn_scores` are arithmetic transformations of the 90d score, not model predictions — this is a data integrity problem for any downstream consumer. The only salvageable elements are the SHAP analysis structure and the Hyperopt tuning framework; both would need to be rebuilt on a properly labeled dataset.
