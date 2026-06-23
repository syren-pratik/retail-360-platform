# Databricks notebook source
# MAGIC %md
# MAGIC # 11: Model Training — LightGBM + Hyperopt + MLflow
# MAGIC
# MAGIC **Purpose:** Train a LightGBM demand forecasting model with hyperparameter tuning
# MAGIC
# MAGIC **Key Steps:**
# MAGIC 1. Time-based train/val/test split (NEVER random split for time series)
# MAGIC 2. Define 64 feature columns
# MAGIC 3. Hyperopt hyperparameter tuning (50 trials)
# MAGIC 4. Final model training on train+val
# MAGIC 5. Test evaluation with segmented metrics
# MAGIC 6. Register champion model in MLflow Model Registry
# MAGIC
# MAGIC **Output:** Registered model `demand_forecast_champion` in MLflow

# COMMAND ----------

# MAGIC %pip install --upgrade "typing_extensions>=4.10.0" "mlflow[databricks]" lightgbm hyperopt

# COMMAND ----------

dbutils.library.restartPython()

# COMMAND ----------

# MAGIC %md
# MAGIC ## Configuration

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
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error, mean_squared_error
from pyspark.sql import functions as F

# Configuration
CATALOG = "hive_metastore"
SCHEMA_ML = "retail_ml"

FEATURE_TABLE = f"{CATALOG}.{SCHEMA_ML}.demand_features_validated"

# MLflow experiment
EXPERIMENT_NAME = "/Shared/demand_forecast_accelerator"

# Model registry name
MODEL_NAME = "demand_forecast_champion"

# Time-based split dates
TRAIN_END = "20250930"    # Train: everything up to Sep 2025
VAL_START = "20251001"    # Validation: Oct 2025
VAL_END = "20251031"
TEST_START = "20251101"   # Test: Nov-Dec 2025
TEST_END = "20251231"

# Training settings - reduced for memory constraints
MAX_TRAIN_ROWS = 2_000_000  # Sample if training data > 2M rows
MAX_VAL_ROWS = 500_000      # Sample validation data
MAX_TEST_ROWS = 1_000_000   # Sample test data
HYPEROPT_MAX_EVALS = 20     # Number of hyperparameter trials (reduced for speed)
EARLY_STOPPING_ROUNDS = 30

print(f"Feature table: {FEATURE_TABLE}")
print(f"MLflow experiment: {EXPERIMENT_NAME}")
print(f"Train end: {TRAIN_END}, Val: {VAL_START}-{VAL_END}, Test: {TEST_START}-{TEST_END}")
print(f"Started at: {datetime.now()}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 1: Define Feature Columns

# COMMAND ----------

# Target column
TARGET_COL = "quantity_sold"

# Feature columns (64 total) — these are what the model sees
FEATURE_COLS = [
    # Lag features (5)
    "sales_lag_1d", "sales_lag_7d", "sales_lag_14d", "sales_lag_28d", "sales_lag_364d",

    # Rolling features (12)
    "rolling_7d_avg", "rolling_7d_std", "rolling_7d_min", "rolling_7d_max",
    "rolling_28d_avg", "rolling_28d_std", "rolling_28d_median",
    "rolling_90d_avg", "rolling_90d_std",
    "revenue_rolling_28d", "txn_rolling_7d", "txn_rolling_28d",

    # Growth features (4)
    "wow_growth", "mom_growth", "yoy_growth", "trend_slope_7d",

    # Cyclical features (6)
    "dow_sin", "dow_cos", "month_sin", "month_cos", "week_of_year_sin", "week_of_year_cos",

    # Calendar features (8)
    "is_weekend", "is_festival_period", "festival_intensity_encoded", "days_to_festival",
    "is_salary_week", "is_ipl_season", "is_monsoon_active", "is_lockdown",

    # Weather features (5)
    "temp_avg_c", "rainfall_mm", "humidity_pct", "is_heavy_rain", "aqi",

    # Price/promo features (5)
    "price_to_mrp_ratio", "is_on_promo", "discount_depth",
    "days_since_last_promo", "promo_frequency_90d",

    # Inventory features (3)
    "closing_stock", "days_of_stock", "is_stockout",

    # Product attributes (4)
    "abc_class_encoded", "is_perishable", "is_essential", "lifecycle_encoded",

    # Store attributes (3) - Note: is_kirana removed (Kirana stores don't exist)
    "store_type_encoded", "tier_city_encoded", "is_dark_store",

    # VPO features (3)
    "volume_class_encoded", "profit_class_encoded", "occasion_class_encoded",

    # Outlet features (6)
    "throughput_encoded", "sec_class_encoded", "maturity_encoded",
    "perishable_capability_encoded", "promo_sensitivity_encoded", "online_mix_encoded",
]

# Columns to exclude from training (keys, metadata, target)
EXCLUDE_COLS = ["date_id", "product_id", "store_id", "year", "month_num",
                "quantity_sold", "revenue", "feature_computed_at", "validated_at",
                "vpo_segment", "department", "category_l1", "brand_id", "store_type",
                "city", "abc_class"]

print(f"Target: {TARGET_COL}")
print(f"Features defined: {len(FEATURE_COLS)}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 2: Load Data and Time-Based Split

# COMMAND ----------

start_time = time.time()
print("Loading feature data...")

# Load validated features
df = spark.table(FEATURE_TABLE)

# Convert date_id to integer for comparison
df = df.withColumn("date_id", F.col("date_id").cast("int"))

# Time-based split — CRITICAL: never use random split for time series
train_df = df.filter(F.col("date_id") <= int(TRAIN_END))
val_df = df.filter((F.col("date_id") >= int(VAL_START)) & (F.col("date_id") <= int(VAL_END)))
test_df = df.filter((F.col("date_id") >= int(TEST_START)) & (F.col("date_id") <= int(TEST_END)))

train_count = train_df.count()
val_count = val_df.count()
test_count = test_df.count()

print(f"Train rows: {train_count:,} (up to {TRAIN_END})")
print(f"Val rows: {val_count:,} ({VAL_START} to {VAL_END})")
print(f"Test rows: {test_count:,} ({TEST_START} to {TEST_END})")
print(f"Load time: {time.time() - start_time:.1f}s")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 3: Convert to Pandas (Sample if Necessary)

# COMMAND ----------

start_time = time.time()
print("Converting to pandas...")

# Filter to only columns we need (features + target + metadata for evaluation)
select_cols = FEATURE_COLS + [TARGET_COL, "date_id", "product_id", "store_id"]

# Add optional columns for segmented evaluation if they exist
optional_cols = ["department", "store_type", "abc_class", "is_festival_period"]
for col in optional_cols:
    if col in df.columns and col not in select_cols:
        select_cols.append(col)

# Filter columns that exist
select_cols = [c for c in select_cols if c in df.columns]

# Sample training data if too large
if train_count > MAX_TRAIN_ROWS:
    print(f"Sampling training data from {train_count:,} to {MAX_TRAIN_ROWS:,} rows...")
    sample_fraction = MAX_TRAIN_ROWS / train_count
    train_pd = train_df.select(select_cols).sample(fraction=sample_fraction, seed=42).toPandas()
else:
    train_pd = train_df.select(select_cols).toPandas()

# Sample val/test if too large to avoid OOM
if val_count > MAX_VAL_ROWS:
    print(f"Sampling validation data from {val_count:,} to {MAX_VAL_ROWS:,} rows...")
    sample_fraction = MAX_VAL_ROWS / val_count
    val_pd = val_df.select(select_cols).sample(fraction=sample_fraction, seed=42).toPandas()
else:
    val_pd = val_df.select(select_cols).toPandas()

if test_count > MAX_TEST_ROWS:
    print(f"Sampling test data from {test_count:,} to {MAX_TEST_ROWS:,} rows...")
    sample_fraction = MAX_TEST_ROWS / test_count
    test_pd = test_df.select(select_cols).sample(fraction=sample_fraction, seed=42).toPandas()
else:
    test_pd = test_df.select(select_cols).toPandas()

print(f"Train pandas shape: {train_pd.shape}")
print(f"Val pandas shape: {val_pd.shape}")
print(f"Test pandas shape: {test_pd.shape}")
print(f"Conversion time: {time.time() - start_time:.1f}s")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 4: Prepare Feature Matrices

# COMMAND ----------

# Filter to features that exist in the dataframe
available_features = [f for f in FEATURE_COLS if f in train_pd.columns]
print(f"Available features: {len(available_features)}/{len(FEATURE_COLS)}")

missing_features = [f for f in FEATURE_COLS if f not in train_pd.columns]
if missing_features:
    print(f"Missing features: {missing_features}")

# Prepare X and y
X_train = train_pd[available_features].astype(float)
y_train = train_pd[TARGET_COL].astype(float)

X_val = val_pd[available_features].astype(float)
y_val = val_pd[TARGET_COL].astype(float)

X_test = test_pd[available_features].astype(float)
y_test = test_pd[TARGET_COL].astype(float)

# Fill any remaining NaNs with 0
X_train = X_train.fillna(0)
X_val = X_val.fillna(0)
X_test = X_test.fillna(0)

print(f"\nX_train shape: {X_train.shape}")
print(f"y_train shape: {y_train.shape}")
print(f"X_val shape: {X_val.shape}")
print(f"X_test shape: {X_test.shape}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 5: Set Up MLflow Experiment

# COMMAND ----------

# Set MLflow experiment
mlflow.set_experiment(EXPERIMENT_NAME)
print(f"MLflow experiment: {EXPERIMENT_NAME}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 6: Define Hyperopt Objective Function

# COMMAND ----------

def compute_metrics(y_true, y_pred):
    """Compute MAPE, wMAPE, MAE, RMSE, and Bias."""
    # Clip negative predictions to 0
    y_pred = np.maximum(y_pred, 0)

    # Avoid division by zero
    y_true_safe = np.maximum(y_true, 0.1)

    # MAPE
    mape = np.mean(np.abs(y_true - y_pred) / y_true_safe)

    # Weighted MAPE (volume-weighted)
    weights = y_true / y_true.sum()
    wmape = np.sum(np.abs(y_true - y_pred) * weights) / np.sum(weights * y_true_safe)

    # MAE
    mae = mean_absolute_error(y_true, y_pred)

    # RMSE
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))

    # Bias (positive = over-predict, negative = under-predict)
    bias = (y_pred.sum() - y_true.sum()) / y_true.sum()

    return {
        "mape": mape,
        "wmape": wmape,
        "mae": mae,
        "rmse": rmse,
        "bias": bias
    }


def objective(params):
    """Hyperopt objective function — trains LightGBM and returns validation MAPE."""
    with mlflow.start_run(nested=True):
        # Build model with sampled hyperparameters
        model = lgb.LGBMRegressor(
            n_estimators=int(params["n_estimators"]),
            learning_rate=params["learning_rate"],
            max_depth=int(params["max_depth"]),
            num_leaves=int(params["num_leaves"]),
            min_child_samples=int(params["min_child_samples"]),
            subsample=params["subsample"],
            colsample_bytree=params["colsample_bytree"],
            reg_alpha=params["reg_alpha"],
            reg_lambda=params["reg_lambda"],
            random_state=42,
            n_jobs=-1,
            verbose=-1,
        )

        # Train with early stopping
        model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            callbacks=[
                lgb.early_stopping(EARLY_STOPPING_ROUNDS, verbose=False),
                lgb.log_evaluation(0)
            ],
        )

        # Predict on validation
        val_pred = model.predict(X_val)
        metrics = compute_metrics(y_val.values, val_pred)

        # Log to MLflow
        mlflow.log_params({
            "n_estimators": int(params["n_estimators"]),
            "learning_rate": params["learning_rate"],
            "max_depth": int(params["max_depth"]),
            "num_leaves": int(params["num_leaves"]),
            "min_child_samples": int(params["min_child_samples"]),
            "subsample": params["subsample"],
            "colsample_bytree": params["colsample_bytree"],
            "reg_alpha": params["reg_alpha"],
            "reg_lambda": params["reg_lambda"],
        })
        mlflow.log_metric("val_mape", metrics["mape"])
        mlflow.log_metric("val_wmape", metrics["wmape"])
        mlflow.log_metric("val_mae", metrics["mae"])
        mlflow.log_metric("val_rmse", metrics["rmse"])
        mlflow.log_metric("val_bias", metrics["bias"])

        return {"loss": metrics["mape"], "status": STATUS_OK}

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 7: Run Hyperopt Hyperparameter Tuning

# COMMAND ----------

start_time = time.time()
print(f"Starting Hyperopt tuning with {HYPEROPT_MAX_EVALS} trials...")

# Hyperparameter search space
search_space = {
    "n_estimators": hp.quniform("n_estimators", 200, 1500, 50),
    "learning_rate": hp.loguniform("learning_rate", np.log(0.005), np.log(0.3)),
    "max_depth": hp.quniform("max_depth", 4, 12, 1),
    "num_leaves": hp.quniform("num_leaves", 15, 255, 5),
    "min_child_samples": hp.quniform("min_child_samples", 10, 200, 10),
    "subsample": hp.uniform("subsample", 0.5, 1.0),
    "colsample_bytree": hp.uniform("colsample_bytree", 0.5, 1.0),
    "reg_alpha": hp.loguniform("reg_alpha", np.log(1e-8), np.log(10.0)),
    "reg_lambda": hp.loguniform("reg_lambda", np.log(1e-8), np.log(10.0)),
}

# Run Hyperopt
with mlflow.start_run(run_name="hyperopt_demand_forecast") as parent_run:
    trials = Trials()
    best = fmin(
        fn=objective,
        space=search_space,
        algo=tpe.suggest,
        max_evals=HYPEROPT_MAX_EVALS,
        trials=trials,
    )

    # Log best params to parent run
    mlflow.log_params({f"best_{k}": v for k, v in best.items()})

    parent_run_id = parent_run.info.run_id

print(f"\nHyperopt completed in {time.time() - start_time:.1f}s")
print(f"Best parameters: {best}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 8: Train Final Model on Train+Val

# COMMAND ----------

start_time = time.time()
print("Training final model on train+val combined...")

# Best hyperparameters
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
    "random_state": 42,
    "n_jobs": -1,
    "verbose": -1,
}

# Combine train and validation data
X_train_val = pd.concat([X_train, X_val], ignore_index=True)
y_train_val = pd.concat([y_train, y_val], ignore_index=True)

print(f"Combined train+val shape: {X_train_val.shape}")

# Train final model
final_model = lgb.LGBMRegressor(**best_params)
final_model.fit(X_train_val, y_train_val)

print(f"Final model trained in {time.time() - start_time:.1f}s")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 9: Evaluate on Test Set

# COMMAND ----------

start_time = time.time()
print("Evaluating on test set...")

# Predict on test set
test_pred = final_model.predict(X_test)
test_pred = np.maximum(test_pred, 0)  # Clip negatives

# Compute overall metrics
test_metrics = compute_metrics(y_test.values, test_pred)

print(f"\n{'='*60}")
print("TEST SET METRICS (Overall)")
print(f"{'='*60}")
print(f"MAPE:  {test_metrics['mape']*100:.2f}%")
print(f"wMAPE: {test_metrics['wmape']*100:.2f}%")
print(f"MAE:   {test_metrics['mae']:.2f}")
print(f"RMSE:  {test_metrics['rmse']:.2f}")
print(f"Bias:  {test_metrics['bias']*100:+.2f}%")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 10: Segmented Evaluation

# COMMAND ----------

print("\nSEGMENTED METRICS")
print("="*60)

# Add predictions to test dataframe
test_pd_with_pred = test_pd.copy()
test_pd_with_pred["prediction"] = test_pred

# Segment columns to evaluate
segment_cols = ["abc_class", "store_type", "is_festival_period"]

segmented_metrics = {}

for seg_col in segment_cols:
    if seg_col in test_pd_with_pred.columns:
        print(f"\n--- By {seg_col} ---")
        for val in test_pd_with_pred[seg_col].dropna().unique():
            mask = test_pd_with_pred[seg_col] == val
            if mask.sum() > 100:  # Only compute if enough samples
                y_seg = test_pd_with_pred.loc[mask, TARGET_COL].values
                pred_seg = test_pd_with_pred.loc[mask, "prediction"].values
                seg_metrics = compute_metrics(y_seg, pred_seg)
                print(f"  {seg_col}={val}: MAPE={seg_metrics['mape']*100:.2f}%, n={mask.sum():,}")
                segmented_metrics[f"{seg_col}_{val}"] = seg_metrics["mape"]

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 11: Feature Importance

# COMMAND ----------

# Get feature importance
importance = pd.DataFrame({
    "feature": available_features,
    "importance": final_model.feature_importances_
}).sort_values("importance", ascending=False)

print("\nTOP 20 FEATURE IMPORTANCES")
print("="*60)
for i, row in importance.head(20).iterrows():
    print(f"  {row['feature']:35} {row['importance']:8.0f}")

# Sanity check: lag_7d and rolling_28d should be in top 5
top_5_features = importance.head(5)["feature"].tolist()
expected_top = ["sales_lag_7d", "rolling_28d_avg", "rolling_7d_avg"]
top_5_check = any(f in top_5_features for f in expected_top)

if top_5_check:
    print("\n SANITY CHECK PASS: Expected features (lag_7d, rolling) are in top 5")
else:
    print("\n SANITY CHECK WARN: Expected lag/rolling features not in top 5 — review feature engineering")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 12: Log Final Model to MLflow

# COMMAND ----------

start_time = time.time()
print("Logging final model to MLflow...")

with mlflow.start_run(run_name="champion_model") as run:
    # Log parameters
    mlflow.log_params(best_params)
    mlflow.log_param("train_rows", len(X_train_val))
    mlflow.log_param("test_rows", len(X_test))
    mlflow.log_param("n_features", len(available_features))
    mlflow.log_param("train_end_date", TRAIN_END)
    mlflow.log_param("test_start_date", TEST_START)

    # Log overall test metrics
    mlflow.log_metric("test_mape", test_metrics["mape"])
    mlflow.log_metric("test_wmape", test_metrics["wmape"])
    mlflow.log_metric("test_mae", test_metrics["mae"])
    mlflow.log_metric("test_rmse", test_metrics["rmse"])
    mlflow.log_metric("test_bias", test_metrics["bias"])

    # Log segmented metrics
    for seg_name, seg_mape in segmented_metrics.items():
        mlflow.log_metric(f"mape_{seg_name}", seg_mape)

    # Log feature importance as artifact
    importance.to_csv("/tmp/feature_importance.csv", index=False)
    mlflow.log_artifact("/tmp/feature_importance.csv")

    # Log top 20 feature importances as metrics
    for i, row in importance.head(20).iterrows():
        # Sanitize feature name for metric key
        feat_name = row["feature"].replace("-", "_")
        mlflow.log_metric(f"importance_{feat_name}", row["importance"])

    # Use legacy Workspace Model Registry (not Unity Catalog)
    mlflow.set_registry_uri("databricks")

    # Log the model
    mlflow.lightgbm.log_model(
        final_model,
        "champion_model",
        registered_model_name=MODEL_NAME,
        input_example=X_test.head(5),
    )

    champion_run_id = run.info.run_id

print(f"Model logged in {time.time() - start_time:.1f}s")
print(f"Run ID: {champion_run_id}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 13: Register Champion Model with Alias

# COMMAND ----------

client = MlflowClient()

# Get the latest version
latest_versions = client.get_latest_versions(MODEL_NAME)
if latest_versions:
    latest_version = latest_versions[0].version
    print(f"Latest model version: {latest_version}")

    # Try to set alias (Unity Catalog) or fall back to stage transition (legacy)
    try:
        client.set_registered_model_alias(MODEL_NAME, "Champion", latest_version)
        print(f"Set alias 'Champion' to version {latest_version}")
    except Exception as e:
        print(f"Alias not supported (legacy registry), using stage transition instead: {e}")
        try:
            client.transition_model_version_stage(MODEL_NAME, latest_version, "Production")
            print(f"Transitioned version {latest_version} to 'Production' stage")
        except Exception as e2:
            print(f"Stage transition also failed (may already be in Production): {e2}")

    # Add description
    try:
        client.update_model_version(
            name=MODEL_NAME,
            version=latest_version,
            description=f"Demand forecast model trained on {len(X_train_val):,} rows. "
                        f"Test MAPE: {test_metrics['mape']*100:.2f}%. "
                        f"Trained on {datetime.now().strftime('%Y-%m-%d')}."
        )
    except Exception as e:
        print(f"Could not update description: {e}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Summary

# COMMAND ----------

print(f"\n{'='*80}")
print("MODEL TRAINING COMPLETE")
print(f"{'='*80}")

print(f"\nModel: {MODEL_NAME}")
print(f"MLflow Experiment: {EXPERIMENT_NAME}")
print(f"Champion Run ID: {champion_run_id}")

print(f"\nTraining Data:")
print(f"  Train+Val rows: {len(X_train_val):,}")
print(f"  Test rows: {len(X_test):,}")
print(f"  Features: {len(available_features)}")

print(f"\nTest Metrics:")
print(f"  MAPE:  {test_metrics['mape']*100:.2f}%")
print(f"  wMAPE: {test_metrics['wmape']*100:.2f}%")
print(f"  MAE:   {test_metrics['mae']:.2f}")
print(f"  Bias:  {test_metrics['bias']*100:+.2f}%")

print(f"\nTop 5 Features:")
for i, row in importance.head(5).iterrows():
    print(f"  {i+1}. {row['feature']} ({row['importance']:.0f})")

print(f"\nModel registered as: models:/{MODEL_NAME}@Champion")
print(f"\nNext notebook: 12_batch_inference.py — Score all SKU×Store for 7/14/28 day horizons")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Appendix: How to Load the Trained Model
# MAGIC
# MAGIC ```python
# MAGIC import mlflow
# MAGIC
# MAGIC # Load the champion model
# MAGIC model = mlflow.pyfunc.load_model(f"models:/{MODEL_NAME}@Champion")
# MAGIC
# MAGIC # Predict
# MAGIC predictions = model.predict(X_new)
# MAGIC ```
