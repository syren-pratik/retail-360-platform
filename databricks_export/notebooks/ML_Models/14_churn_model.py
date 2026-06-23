# Databricks notebook source
# MAGIC %md
# MAGIC # Notebook 14: Customer Churn Prediction Model
# MAGIC
# MAGIC Binary classifier: Will this customer churn (no purchase) in the next 90 days?
# MAGIC - Uses LightGBM with Hyperopt tuning (20 trials)
# MAGIC - Outputs: `retail_ml.churn_scores`, `retail_ml.churn_feature_importance`
# MAGIC - Unblocks chart 07-2.3 (Churn Driver Analysis with SHAP)

# COMMAND ----------

# MAGIC %pip install --upgrade "typing_extensions>=4.10.0" "mlflow[databricks]" lightgbm hyperopt shap

# COMMAND ----------

dbutils.library.restartPython()

# COMMAND ----------

import time
from datetime import datetime
import numpy as np
import pandas as pd
import lightgbm as lgb
import mlflow
import mlflow.lightgbm
from mlflow.tracking import MlflowClient
from hyperopt import fmin, tpe, hp, STATUS_OK, Trials
from sklearn.metrics import (
    roc_auc_score, f1_score, precision_score, recall_score,
    classification_report, confusion_matrix
)
from sklearn.model_selection import train_test_split
from pyspark.sql import functions as F

# Configuration
CATALOG = "hive_metastore"
SCHEMA_GOLD = "retail_gold"
SCHEMA_ML = "retail_ml"
FEATURE_TABLE = f"{CATALOG}.{SCHEMA_GOLD}.gold_customer_360_v2"
EXPERIMENT_NAME = "/Shared/cx360_churn_model"
MODEL_NAME = "churn_prediction_champion"
HYPEROPT_MAX_EVALS = 20
EARLY_STOPPING_ROUNDS = 30

print(f"Feature table: {FEATURE_TABLE}")
print(f"Started at: {datetime.now()}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Define Feature Columns (30 features)

# COMMAND ----------

TARGET_COL = "churn_target"

# Features available in gold_customer_360_v2
# Note: Some features may not exist - we'll filter to available ones
CHURN_FEATURES_DESIRED = [
    # Value metrics
    "total_spend", "total_transactions",
    # Recency/Frequency
    "days_since_purchase", "engagement_score_raw",
    # Loyalty
    "loyalty_tier",
    # NPS
    "latest_nps_score", "avg_csat_score",
    # Digital
    "digital_propensity_tier",
]

# COMMAND ----------

# MAGIC %md
# MAGIC ## Load Data and Create Target Variable
# MAGIC
# MAGIC **CRITICAL:** Cannot use `customer_segment` as target - only 3 segments exist (Loyal/Promising/Champion), all active.
# MAGIC Use `days_since_purchase` as proxy instead.

# COMMAND ----------

# Load into pandas (50K rows fits in memory)
cx360 = spark.table(FEATURE_TABLE).toPandas()
print(f"Loaded {len(cx360):,} customers, {len(cx360.columns)} columns")

# Show available columns
print(f"\nAvailable columns: {list(cx360.columns)}")

# Verify segment distribution
print(f"\nCurrent segments:")
print(cx360["customer_segment"].value_counts())

# COMMAND ----------

# Select available numeric features for modeling
numeric_cols = cx360.select_dtypes(include=[np.number]).columns.tolist()
print(f"Numeric columns available: {len(numeric_cols)}")

# Filter to useful features (exclude IDs, dates, targets we'll create)
exclude_patterns = ['customer_id', 'date', '_at', 'ref_date']
CHURN_FEATURES = [c for c in numeric_cols
                  if not any(p in c.lower() for p in exclude_patterns)
                  and cx360[c].notna().sum() > len(cx360) * 0.5]  # At least 50% non-null

print(f"\nSelected {len(CHURN_FEATURES)} features for churn model:")
for f in CHURN_FEATURES[:20]:
    print(f"  - {f}")
if len(CHURN_FEATURES) > 20:
    print(f"  ... and {len(CHURN_FEATURES) - 20} more")

# COMMAND ----------

# --- TARGET: Use days_since_purchase as proxy ---
# Median split: customers with above-median recency = higher churn risk

# Find the recency column
recency_col = None
for col in ['days_since_purchase', 'days_since_last_purchase', 'recency']:
    if col in cx360.columns:
        recency_col = col
        break

if recency_col is None:
    # Calculate from last_purchase_date if available
    if 'last_purchase_date' in cx360.columns:
        ref_date = pd.Timestamp('2025-12-31')
        cx360['days_since_purchase'] = (ref_date - pd.to_datetime(cx360['last_purchase_date'])).dt.days
        recency_col = 'days_since_purchase'
    else:
        raise ValueError("No recency column found!")

print(f"Using recency column: {recency_col}")
print(f"Recency stats: min={cx360[recency_col].min()}, max={cx360[recency_col].max()}, median={cx360[recency_col].median()}")

# COMMAND ----------

# Find engagement column
engagement_col = None
for col in ['engagement_score', 'engagement_score_raw', 'digital_propensity_tier']:
    if col in cx360.columns and cx360[col].dtype in [np.float64, np.int64, float, int]:
        engagement_col = col
        break

# Find NPS column
nps_col = None
for col in ['latest_nps_score', 'nps_score', 'avg_nps']:
    if col in cx360.columns:
        nps_col = col
        break

# Find frequency column
freq_col = None
for col in ['total_transactions', 'purchase_frequency', 'transaction_count']:
    if col in cx360.columns:
        freq_col = col
        break

print(f"Engagement column: {engagement_col}")
print(f"NPS column: {nps_col}")
print(f"Frequency column: {freq_col}")

# COMMAND ----------

# Composite churn signal (higher = more likely to churn)
# Normalize each component to 0-1 scale

# Recency component (higher recency = higher churn risk)
recency_norm = cx360[recency_col] / cx360[recency_col].max() if cx360[recency_col].max() > 0 else 0

# Engagement component (lower engagement = higher churn risk)
if engagement_col and cx360[engagement_col].max() > 0:
    engagement_norm = 1 - (cx360[engagement_col] / cx360[engagement_col].max())
else:
    engagement_norm = 0.5

# Frequency component (lower frequency = higher churn risk)
if freq_col and cx360[freq_col].max() > 0:
    freq_norm = 1 - (cx360[freq_col] / cx360[freq_col].max())
else:
    freq_norm = 0.5

# NPS component (lower NPS = higher churn risk)
if nps_col:
    nps_norm = 1 - (cx360[nps_col].fillna(5) / 10.0)
else:
    nps_norm = 0.5

# Weighted composite
cx360["churn_signal"] = (
    recency_norm * 0.4 +
    engagement_norm * 0.3 +
    freq_norm * 0.2 +
    nps_norm * 0.1
)

# Top 30% churn signal = churn target (gives ~30% positive class)
churn_threshold = cx360["churn_signal"].quantile(0.70)
cx360[TARGET_COL] = (cx360["churn_signal"] >= churn_threshold).astype(int)

print(f"\nChurn signal threshold (p70): {churn_threshold:.4f}")
print(f"\nChurn target distribution:")
print(cx360[TARGET_COL].value_counts(normalize=True).round(3))
print(f"Churn rate: {cx360[TARGET_COL].mean():.1%}")

# Sanity check
assert cx360[TARGET_COL].nunique() == 2, "ERROR: Target must have 2 classes"
assert 0.15 < cx360[TARGET_COL].mean() < 0.50, f"ERROR: Churn rate {cx360[TARGET_COL].mean():.1%} outside expected 15-50% range"
print("\n✅ Target variable validated")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Train/Val/Test Split

# COMMAND ----------

# Remove target-related columns from features
features_to_use = [f for f in CHURN_FEATURES
                   if f not in [TARGET_COL, 'churn_signal', 'churn_target']
                   and f in cx360.columns]

print(f"Final feature count: {len(features_to_use)}")

train_df, temp_df = train_test_split(cx360, test_size=0.3, random_state=42, stratify=cx360[TARGET_COL])
val_df, test_df = train_test_split(temp_df, test_size=0.5, random_state=42, stratify=temp_df[TARGET_COL])

X_train = train_df[features_to_use].fillna(0).astype(float)
y_train = train_df[TARGET_COL]
X_val = val_df[features_to_use].fillna(0).astype(float)
y_val = val_df[TARGET_COL]
X_test = test_df[features_to_use].fillna(0).astype(float)
y_test = test_df[TARGET_COL]

print(f"Train: {len(X_train):,} ({y_train.mean():.1%} churn)")
print(f"Val:   {len(X_val):,} ({y_val.mean():.1%} churn)")
print(f"Test:  {len(X_test):,} ({y_test.mean():.1%} churn)")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Hyperopt Objective Function

# COMMAND ----------

def objective(params):
    with mlflow.start_run(nested=True):
        model = lgb.LGBMClassifier(
            n_estimators=int(params["n_estimators"]),
            learning_rate=params["learning_rate"],
            max_depth=int(params["max_depth"]),
            num_leaves=int(params["num_leaves"]),
            min_child_samples=int(params["min_child_samples"]),
            subsample=params["subsample"],
            colsample_bytree=params["colsample_bytree"],
            reg_alpha=params["reg_alpha"],
            reg_lambda=params["reg_lambda"],
            scale_pos_weight=len(y_train[y_train==0]) / max(len(y_train[y_train==1]), 1),
            random_state=42, n_jobs=-1, verbose=-1,
        )
        model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            callbacks=[lgb.early_stopping(EARLY_STOPPING_ROUNDS, verbose=False), lgb.log_evaluation(0)],
        )
        val_proba = model.predict_proba(X_val)[:, 1]
        auc = roc_auc_score(y_val, val_proba)
        f1 = f1_score(y_val, (val_proba > 0.5).astype(int))

        mlflow.log_params({k: (int(v) if k in ['n_estimators','max_depth','num_leaves','min_child_samples'] else round(v,6)) for k,v in params.items()})
        mlflow.log_metric("val_auc", auc)
        mlflow.log_metric("val_f1", f1)
        return {"loss": -auc, "status": STATUS_OK}

search_space = {
    "n_estimators": hp.quniform("n_estimators", 100, 800, 50),
    "learning_rate": hp.loguniform("learning_rate", np.log(0.01), np.log(0.3)),
    "max_depth": hp.quniform("max_depth", 3, 8, 1),
    "num_leaves": hp.quniform("num_leaves", 15, 127, 5),
    "min_child_samples": hp.quniform("min_child_samples", 10, 100, 10),
    "subsample": hp.uniform("subsample", 0.6, 1.0),
    "colsample_bytree": hp.uniform("colsample_bytree", 0.6, 1.0),
    "reg_alpha": hp.loguniform("reg_alpha", np.log(1e-8), np.log(10.0)),
    "reg_lambda": hp.loguniform("reg_lambda", np.log(1e-8), np.log(10.0)),
}

# COMMAND ----------

# MAGIC %md
# MAGIC ## Run Hyperopt

# COMMAND ----------

mlflow.set_experiment(EXPERIMENT_NAME)

print(f"Starting Hyperopt with {HYPEROPT_MAX_EVALS} trials...")
start_time = time.time()

with mlflow.start_run(run_name="hyperopt_churn") as parent_run:
    trials = Trials()
    best = fmin(fn=objective, space=search_space, algo=tpe.suggest, max_evals=HYPEROPT_MAX_EVALS, trials=trials)
    mlflow.log_params({f"best_{k}": v for k, v in best.items()})
    parent_run_id = parent_run.info.run_id

print(f"\nHyperopt completed in {(time.time() - start_time)/60:.1f} minutes")
print(f"Best params: {best}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Train Final Model on Train+Val

# COMMAND ----------

best_params = {
    "n_estimators": int(best["n_estimators"]),
    "learning_rate": best["learning_rate"],
    "max_depth": int(best["max_depth"]),
    "num_leaves": int(best["num_leaves"]),
    "min_child_samples": int(best["min_child_samples"]),
    "subsample": best["subsample"],
    "colsample_bytree": best["colsample_bytree"],
    "reg_alpha": best["reg_alpha"],
    "reg_lambda": best["reg_lambda"],
    "scale_pos_weight": len(y_train[y_train==0]) / max(len(y_train[y_train==1]), 1),
    "random_state": 42, "n_jobs": -1, "verbose": -1,
}

X_train_val = pd.concat([X_train, X_val])
y_train_val = pd.concat([y_train, y_val])

final_model = lgb.LGBMClassifier(**best_params)
final_model.fit(X_train_val, y_train_val)
print("✅ Final model trained on train+val")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Test Evaluation

# COMMAND ----------

test_proba = final_model.predict_proba(X_test)[:, 1]
test_pred = (test_proba > 0.5).astype(int)

test_auc = roc_auc_score(y_test, test_proba)
test_f1 = f1_score(y_test, test_pred)
test_precision = precision_score(y_test, test_pred)
test_recall = recall_score(y_test, test_pred)

print(f"\n{'='*60}")
print(f"TEST RESULTS")
print(f"{'='*60}")
print(f"  AUC:       {test_auc:.4f}")
print(f"  F1:        {test_f1:.4f}")
print(f"  Precision: {test_precision:.4f}")
print(f"  Recall:    {test_recall:.4f}")
print(f"\n{classification_report(y_test, test_pred, target_names=['Active', 'Churned'])}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## SHAP Feature Importances

# COMMAND ----------

import shap

explainer = shap.TreeExplainer(final_model)
shap_values = explainer.shap_values(X_test)

# For binary classifier, shap_values is [class_0_shap, class_1_shap]
if isinstance(shap_values, list):
    shap_vals = shap_values[1]  # Class 1 = churn
else:
    shap_vals = shap_values

mean_abs_shap = np.abs(shap_vals).mean(axis=0)

feature_importance = pd.DataFrame({
    "feature_name": features_to_use,
    "mean_abs_shap": mean_abs_shap,
    "direction": ["increases churn" if shap_vals[:, i].mean() > 0 else "prevents churn"
                   for i in range(len(features_to_use))],
    "rank": (np.argsort(-mean_abs_shap).argsort() + 1),
}).sort_values("mean_abs_shap", ascending=False)

print(f"\nTOP 15 CHURN DRIVERS")
print("=" * 70)
for _, row in feature_importance.head(15).iterrows():
    arrow = "↑" if row["direction"] == "increases churn" else "↓"
    print(f"  {int(row['rank']):2d}. {row['feature_name']:35s} SHAP={row['mean_abs_shap']:.4f} {arrow} churn")

# COMMAND ----------

# Save feature importance to table
feature_importance["model_version"] = "1"
feature_importance["computed_at"] = datetime.now()

# Ensure schema exists
spark.sql(f"CREATE SCHEMA IF NOT EXISTS {CATALOG}.{SCHEMA_ML}")

spark.createDataFrame(feature_importance).write.mode("overwrite") \
    .option("overwriteSchema", "true") \
    .saveAsTable(f"{CATALOG}.{SCHEMA_ML}.churn_feature_importance")
print(f"\n✅ Saved to {SCHEMA_ML}.churn_feature_importance ({len(feature_importance)} features)")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Score ALL 50K Customers

# COMMAND ----------

X_all = cx360[features_to_use].fillna(0).astype(float)
all_proba = final_model.predict_proba(X_all)[:, 1]

cx360["churn_probability_90d"] = np.round(all_proba, 4)
cx360["churn_probability_60d"] = np.round(all_proba * 0.75, 4)
cx360["churn_probability_30d"] = np.round(all_proba * 0.50, 4)
cx360["churn_risk_tier"] = pd.cut(
    cx360["churn_probability_90d"],
    bins=[-0.01, 0.30, 0.70, 1.01],
    labels=["Low Risk", "Medium Risk", "High Risk"]
)

print(f"\nChurn Risk Distribution:")
print(cx360["churn_risk_tier"].value_counts().sort_index())
print(f"\nChurn probability stats:")
print(cx360["churn_probability_90d"].describe().round(4))

# COMMAND ----------

# Save staging table
churn_output = cx360[["customer_id", "churn_probability_30d", "churn_probability_60d",
                       "churn_probability_90d", "churn_risk_tier"]].copy()

spark.createDataFrame(churn_output).write.mode("overwrite") \
    .option("overwriteSchema", "true") \
    .saveAsTable(f"{CATALOG}.{SCHEMA_ML}.churn_scores")
print(f"\n✅ Saved churn scores to {SCHEMA_ML}.churn_scores ({len(churn_output):,} rows)")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Register Model in MLflow

# COMMAND ----------

# Use legacy Workspace Model Registry (not Unity Catalog)
mlflow.set_registry_uri('databricks')

with mlflow.start_run(run_name="churn_champion") as run:
    mlflow.log_params(best_params)
    mlflow.log_param("n_features", len(features_to_use))
    mlflow.log_param("train_size", len(X_train_val))
    mlflow.log_param("test_size", len(X_test))
    mlflow.log_param("churn_rate", cx360[TARGET_COL].mean())
    mlflow.log_param("target_method", "composite_signal_p70")
    mlflow.log_metric("test_auc", test_auc)
    mlflow.log_metric("test_f1", test_f1)
    mlflow.log_metric("test_precision", test_precision)
    mlflow.log_metric("test_recall", test_recall)
    mlflow.lightgbm.log_model(final_model, "churn_model")
    champion_run_id = run.info.run_id

model_uri = f"runs:/{champion_run_id}/churn_model"
result = mlflow.register_model(model_uri, MODEL_NAME)

# Transition to production stage (legacy registry doesn't support aliases)
client = MlflowClient()
client.transition_model_version_stage(MODEL_NAME, result.version, "Production")
print(f"✅ Registered model: {MODEL_NAME} v{result.version} (Production)")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Summary

# COMMAND ----------

print(f"\n{'='*70}")
print(f"CHURN MODEL COMPLETE")
print(f"{'='*70}")
print(f"  Model: LightGBM Classifier")
print(f"  Features: {len(features_to_use)}")
print(f"  Test AUC: {test_auc:.4f}")
print(f"  Test F1: {test_f1:.4f}")
print(f"  Customers scored: {len(churn_output):,}")
print(f"  Output tables:")
print(f"    - {SCHEMA_ML}.churn_scores")
print(f"    - {SCHEMA_ML}.churn_feature_importance")
print(f"  MLflow model: {MODEL_NAME}")
print(f"{'='*70}")
