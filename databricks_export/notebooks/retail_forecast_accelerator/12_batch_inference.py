# Databricks notebook source
# MAGIC %md
# MAGIC # 12: Batch Inference — Score All SKU x Store for 7/14/28 Days
# MAGIC
# MAGIC **Purpose:** Load champion LightGBM model from MLflow, score ALL active product × store
# MAGIC combinations for the next 7, 14, and 28 days with prediction intervals and SHAP explanations.
# MAGIC
# MAGIC **Output:** `retail_ml.forecast_output` — forecasts with confidence intervals
# MAGIC
# MAGIC **Key Steps:**
# MAGIC 1. Load champion model from MLflow Model Registry
# MAGIC 2. Get latest features for each product-store combination
# MAGIC 3. For each horizon, update date-dependent features (calendar, cyclical)
# MAGIC 4. Score using pandas_udf for parallel execution
# MAGIC 5. Compute prediction intervals (80% and 95%)
# MAGIC 6. SHAP explanations for top 10K forecasts (sample)
# MAGIC 7. Write to forecast_output partitioned by horizon_days

# COMMAND ----------

# MAGIC %pip install --upgrade "typing_extensions>=4.10.0" mlflow shap lightgbm

# COMMAND ----------

dbutils.library.restartPython()

# COMMAND ----------

# MAGIC %md
# MAGIC ## Configuration

# COMMAND ----------

import math
import time
import json
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
import mlflow
from pyspark.sql import functions as F
from pyspark.sql.window import Window
from pyspark.sql.types import StructType, StructField, StringType, IntegerType, DoubleType, TimestampType, LongType

# Configuration
CATALOG = "hive_metastore"
SCHEMA_ML = "retail_ml"
SCHEMA_GOLD = "retail_gold"

FEATURE_TABLE = f"{CATALOG}.{SCHEMA_ML}.demand_features_validated"
DIM_DATE_TABLE = f"{CATALOG}.{SCHEMA_GOLD}.dim_date"
OUTPUT_TABLE = f"{CATALOG}.{SCHEMA_ML}.forecast_output"

# Model
MODEL_NAME = "demand_forecast_champion"
MODEL_URI = f"models:/{MODEL_NAME}@Champion"

# Forecast horizons
HORIZONS = [7, 14, 28]

# SHAP settings
SHAP_SAMPLE_SIZE = 10000  # Only compute SHAP for top N forecasts (expensive)

print(f"Feature table: {FEATURE_TABLE}")
print(f"Output table: {OUTPUT_TABLE}")
print(f"Model: {MODEL_URI}")
print(f"Horizons: {HORIZONS}")
print(f"Started at: {datetime.now()}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 1: Load Champion Model from MLflow

# COMMAND ----------

start_time = time.time()
print(f"Loading model from {MODEL_URI}...")

# Use legacy Workspace Model Registry
mlflow.set_registry_uri("databricks")

try:
    model = mlflow.pyfunc.load_model(MODEL_URI)
    print(f"Model loaded successfully in {time.time() - start_time:.1f}s")
except Exception as e:
    print(f"Error loading Champion model: {e}")
    print("Attempting to load latest version...")
    model = mlflow.pyfunc.load_model(f"models:/{MODEL_NAME}/latest")
    print(f"Loaded latest version in {time.time() - start_time:.1f}s")

# Get model version for tracking
try:
    from mlflow.tracking import MlflowClient
    client = MlflowClient()
    model_version = client.get_model_version_by_alias(MODEL_NAME, "Champion").version
    print(f"Model version: {model_version}")
except Exception as e:
    model_version = "unknown"
    print(f"Could not get model version: {e}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 2: Define Feature Columns (Must Match Training)

# COMMAND ----------

# Feature columns — MUST match training exactly (from notebook 11)
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

    # Store attributes (3)
    "store_type_encoded", "tier_city_encoded", "is_dark_store",

    # VPO features (3)
    "volume_class_encoded", "profit_class_encoded", "occasion_class_encoded",

    # Outlet features (6)
    "throughput_encoded", "sec_class_encoded", "maturity_encoded",
    "perishable_capability_encoded", "promo_sensitivity_encoded", "online_mix_encoded",
]

print(f"Feature columns: {len(FEATURE_COLS)}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 3: Get Latest Features for Each Product-Store

# COMMAND ----------

start_time = time.time()
print("Getting latest features for each product-store...")

# Load feature table
df_features = spark.table(FEATURE_TABLE)

# Get the latest date_id with complete data
max_date = df_features.agg(F.max("date_id")).collect()[0][0]
print(f"Latest date in features: {max_date}")

# Get the latest row for each product-store combination
# Using the most recent date with data
w = Window.partitionBy("product_id", "store_id").orderBy(F.desc("date_id"))

latest_features = df_features \
    .withColumn("row_num", F.row_number().over(w)) \
    .filter(F.col("row_num") == 1) \
    .drop("row_num")

# Count unique combinations
n_combinations = latest_features.count()
print(f"Active product-store combinations: {n_combinations:,}")
print(f"Latest features extracted in {time.time() - start_time:.1f}s")

# Cache for reuse across horizons
latest_features = latest_features.cache()
latest_features.count()  # Force cache

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 4: Compute Historical Residual Std for Prediction Intervals

# COMMAND ----------

start_time = time.time()
print("Computing residual statistics for prediction intervals...")

# Use October 2025 data as validation set for residual estimation
val_start = 20251001
val_end = 20251031

val_data = df_features.filter(
    (F.col("date_id") >= val_start) & (F.col("date_id") <= val_end)
)

# Convert to pandas for scoring (sample if too large)
val_count = val_data.count()
print(f"Validation set rows: {val_count:,}")

if val_count > 500000:
    val_sample = val_data.sample(fraction=500000/val_count, seed=42)
else:
    val_sample = val_data

# Score validation set
val_pd = val_sample.select(["product_id", "store_id", "quantity_sold"] + FEATURE_COLS).toPandas()
X_val = val_pd[FEATURE_COLS].fillna(0).astype(float)
val_preds = model.predict(X_val)
val_pd["pred"] = np.maximum(val_preds, 0)
val_pd["residual"] = val_pd["quantity_sold"] - val_pd["pred"]

# Compute residual stats per product-store
residual_stats = val_pd.groupby(["product_id", "store_id"]).agg({
    "residual": ["std", lambda x: np.mean(np.abs(x))]
}).reset_index()
residual_stats.columns = ["product_id", "store_id", "residual_std", "avg_abs_residual"]

# Fill NaN std with median
median_std = residual_stats["residual_std"].median()
if pd.isna(median_std) or median_std == 0:
    median_std = 5.0
residual_stats["residual_std"] = residual_stats["residual_std"].fillna(median_std)

# Convert to Spark DataFrame
residual_stats_df = spark.createDataFrame(residual_stats)

print(f"Residual stats computed for {len(residual_stats):,} product-store pairs")
print(f"Median residual std: {median_std:.2f}")
print(f"Time: {time.time() - start_time:.1f}s")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 5: Score Each Horizon with Updated Date Features

# COMMAND ----------

PI = math.pi
today = datetime.now().date()
today_str = today.strftime("%Y-%m-%d")

all_scored = []

for horizon in HORIZONS:
    start_time = time.time()
    print(f"\n{'='*60}")
    print(f"Processing horizon: {horizon} days")
    print(f"{'='*60}")

    # Calculate target date
    target_date = today + timedelta(days=horizon)
    target_date_id = int(target_date.strftime("%Y%m%d"))

    print(f"Target date: {target_date} (date_id: {target_date_id})")

    # Get date features from dim_date for the target date
    try:
        target_date_features = spark.table(DIM_DATE_TABLE) \
            .filter(F.col("date_id") == target_date_id) \
            .select(
                "day_of_week", "is_weekend", "month_num", "quarter", "year",
                "is_festival_period", "festival_intensity", "days_to_festival",
                "is_salary_week", "is_ipl_season", "is_monsoon_active",
                "is_ramadan", "is_navratri_fast", "is_harvest_season",
                "is_lockdown", "is_covid_period", "covid_demand_multiplier",
                "week_of_year"
            ).collect()

        if len(target_date_features) > 0:
            tdf = target_date_features[0]
            use_dim_date = True
        else:
            print(f"  Warning: No dim_date entry for {target_date_id}, using computed values")
            use_dim_date = False
    except Exception as e:
        print(f"  Warning: Could not read dim_date: {e}")
        use_dim_date = False

    # Start with latest features
    horizon_features = latest_features.withColumn("target_date_id", F.lit(target_date_id))
    horizon_features = horizon_features.withColumn("horizon_days", F.lit(horizon))

    # Update date-dependent features
    if use_dim_date:
        # Use dim_date values
        dow = int(tdf["day_of_week"]) if tdf["day_of_week"] else target_date.isoweekday()
        month = int(tdf["month_num"]) if tdf["month_num"] else target_date.month
        woy = int(tdf["week_of_year"]) if tdf["week_of_year"] else target_date.isocalendar()[1]
        is_wknd = 1 if (tdf["is_weekend"] or dow >= 6) else 0

        horizon_features = horizon_features \
            .withColumn("day_of_week", F.lit(dow)) \
            .withColumn("month_num", F.lit(month)) \
            .withColumn("is_weekend", F.lit(is_wknd)) \
            .withColumn("dow_sin", F.lit(math.sin(dow * 2 * PI / 7))) \
            .withColumn("dow_cos", F.lit(math.cos(dow * 2 * PI / 7))) \
            .withColumn("month_sin", F.lit(math.sin(month * 2 * PI / 12))) \
            .withColumn("month_cos", F.lit(math.cos(month * 2 * PI / 12))) \
            .withColumn("week_of_year_sin", F.lit(math.sin(woy * 2 * PI / 52))) \
            .withColumn("week_of_year_cos", F.lit(math.cos(woy * 2 * PI / 52))) \
            .withColumn("is_festival_period", F.lit(1 if tdf["is_festival_period"] else 0)) \
            .withColumn("festival_intensity_encoded", F.lit(
                4 if tdf["festival_intensity"] == "Peak"
                else 3 if tdf["festival_intensity"] == "High"
                else 2 if tdf["festival_intensity"] == "Medium"
                else 1 if tdf["festival_intensity"] == "Low"
                else 0
            )) \
            .withColumn("days_to_festival", F.lit(int(tdf["days_to_festival"]) if tdf["days_to_festival"] else 999)) \
            .withColumn("is_salary_week", F.lit(1 if tdf["is_salary_week"] else 0)) \
            .withColumn("is_ipl_season", F.lit(1 if tdf["is_ipl_season"] else 0)) \
            .withColumn("is_monsoon_active", F.lit(1 if tdf["is_monsoon_active"] else 0)) \
            .withColumn("is_lockdown", F.lit(1 if tdf["is_lockdown"] else 0))
    else:
        # Compute from target date
        dow = target_date.isoweekday()
        month = target_date.month
        woy = target_date.isocalendar()[1]
        is_wknd = 1 if dow >= 6 else 0

        horizon_features = horizon_features \
            .withColumn("day_of_week", F.lit(dow)) \
            .withColumn("month_num", F.lit(month)) \
            .withColumn("is_weekend", F.lit(is_wknd)) \
            .withColumn("dow_sin", F.lit(math.sin(dow * 2 * PI / 7))) \
            .withColumn("dow_cos", F.lit(math.cos(dow * 2 * PI / 7))) \
            .withColumn("month_sin", F.lit(math.sin(month * 2 * PI / 12))) \
            .withColumn("month_cos", F.lit(math.cos(month * 2 * PI / 12))) \
            .withColumn("week_of_year_sin", F.lit(math.sin(woy * 2 * PI / 52))) \
            .withColumn("week_of_year_cos", F.lit(math.cos(woy * 2 * PI / 52)))

    print(f"  Date features updated")

    # Score with model
    # Convert to pandas for scoring
    score_cols = ["product_id", "store_id", "target_date_id", "horizon_days",
                  "department", "store_type", "abc_class", "city", "year", "month_num"] + FEATURE_COLS

    # Filter to existing columns
    score_cols = [c for c in score_cols if c in horizon_features.columns]

    score_pd = horizon_features.select(score_cols).toPandas()
    print(f"  Rows to score: {len(score_pd):,}")

    # Prepare feature matrix
    available_features = [f for f in FEATURE_COLS if f in score_pd.columns]
    X_score = score_pd[available_features].fillna(0).astype(float)

    # Predict
    predictions = model.predict(X_score)
    score_pd["forecast_qty"] = np.maximum(predictions, 0)  # Never predict negative

    print(f"  Predictions generated")

    # Join residual stats for prediction intervals
    score_pd = score_pd.merge(
        residual_stats[["product_id", "store_id", "residual_std"]],
        on=["product_id", "store_id"],
        how="left"
    )
    score_pd["residual_std"] = score_pd["residual_std"].fillna(median_std)

    # Scale uncertainty by sqrt(horizon) — uncertainty grows with time
    score_pd["scaled_std"] = score_pd["residual_std"] * np.sqrt(horizon / 7)

    # Compute prediction intervals
    # 80% interval: z = 1.28
    # 95% interval: z = 1.96
    score_pd["lower_80"] = np.maximum(0, np.round(score_pd["forecast_qty"] - 1.28 * score_pd["scaled_std"], 1))
    score_pd["upper_80"] = np.round(score_pd["forecast_qty"] + 1.28 * score_pd["scaled_std"], 1)
    score_pd["lower_95"] = np.maximum(0, np.round(score_pd["forecast_qty"] - 1.96 * score_pd["scaled_std"], 1))
    score_pd["upper_95"] = np.round(score_pd["forecast_qty"] + 1.96 * score_pd["scaled_std"], 1)

    # Confidence score: high = narrow interval relative to forecast
    score_pd["confidence_score"] = np.clip(
        1.0 - score_pd["scaled_std"] / np.maximum(score_pd["forecast_qty"], 1.0),
        0.1, 0.99
    ).round(2)

    print(f"  Prediction intervals computed")

    all_scored.append(score_pd)
    print(f"  Horizon {horizon}d completed in {time.time() - start_time:.1f}s")

# Combine all horizons
all_forecasts_pd = pd.concat(all_scored, ignore_index=True)
print(f"\nTotal forecasts: {len(all_forecasts_pd):,}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 6: SHAP Explanations (Sample Only — Expensive)

# COMMAND ----------

start_time = time.time()
print(f"Computing SHAP explanations for top {SHAP_SAMPLE_SIZE:,} forecasts...")

# Initialize SHAP column
all_forecasts_pd["top3_features_json"] = None

try:
    import shap

    # Get top forecasts by quantity
    sample_idx = all_forecasts_pd.nlargest(SHAP_SAMPLE_SIZE, "forecast_qty").index
    sample_X = all_forecasts_pd.loc[sample_idx, available_features].fillna(0).astype(float)

    # Get underlying LightGBM model from MLflow pyfunc wrapper
    try:
        # Try different ways to access the raw model
        if hasattr(model, '_model_impl'):
            if hasattr(model._model_impl, 'lgb_model'):
                lgb_model = model._model_impl.lgb_model
            elif hasattr(model._model_impl, 'python_model'):
                lgb_model = model._model_impl.python_model
            else:
                lgb_model = model._model_impl
        else:
            lgb_model = model

        explainer = shap.TreeExplainer(lgb_model)
        shap_values = explainer.shap_values(sample_X)

        # For each prediction, get top 3 contributing features
        top3_list = []
        for i in range(len(sample_X)):
            abs_shap = np.abs(shap_values[i])
            top3_idx = np.argsort(abs_shap)[-3:][::-1]
            top3 = [[available_features[j], round(float(shap_values[i][j]), 2)] for j in top3_idx]
            top3_list.append(json.dumps(top3))

        # Assign to dataframe
        all_forecasts_pd.loc[sample_idx, "top3_features_json"] = top3_list

        print(f"  SHAP computed for {len(top3_list):,} forecasts in {time.time() - start_time:.1f}s")

    except Exception as e:
        print(f"  Could not extract LightGBM model for SHAP: {str(e)[:100]}")

except ImportError:
    print("  SHAP not installed — skipping explanations")
except Exception as e:
    print(f"  SHAP computation failed: {str(e)[:100]}")

# Fill NULL for non-sampled rows
all_forecasts_pd["top3_features_json"] = all_forecasts_pd["top3_features_json"].fillna("[]")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 7: Prepare Final Output and Write

# COMMAND ----------

start_time = time.time()
print("Preparing final output...")

# Round forecast quantity
all_forecasts_pd["forecast_qty"] = all_forecasts_pd["forecast_qty"].round(1)

# Add metadata
all_forecasts_pd["forecast_date"] = today_str
all_forecasts_pd["model_version"] = str(model_version)
all_forecasts_pd["generated_at"] = datetime.now()

# Select final columns
output_cols = [
    "product_id", "store_id", "horizon_days", "target_date_id",
    "forecast_qty", "lower_80", "upper_80", "lower_95", "upper_95",
    "confidence_score", "top3_features_json",
    "department", "store_type", "abc_class", "city",
    "forecast_date", "model_version", "generated_at",
    "year", "month_num"
]

# Keep only columns that exist
output_cols = [c for c in output_cols if c in all_forecasts_pd.columns]
output_pd = all_forecasts_pd[output_cols].copy()

print(f"Output shape: {output_pd.shape}")
print(f"Columns: {list(output_pd.columns)}")

# Convert to Spark DataFrame
output_df = spark.createDataFrame(output_pd)

# Write to Delta table
print(f"Writing to {OUTPUT_TABLE}...")

output_df.write \
    .format("delta") \
    .mode("overwrite") \
    .option("overwriteSchema", "true") \
    .partitionBy("horizon_days") \
    .saveAsTable(OUTPUT_TABLE)

print(f"Write completed in {time.time() - start_time:.1f}s")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 8: Verify Output

# COMMAND ----------

# Verify the output
result_df = spark.table(OUTPUT_TABLE)
total_count = result_df.count()

print(f"\n{'='*70}")
print(f"BATCH INFERENCE COMPLETE")
print(f"{'='*70}")

print(f"\nOutput table: {OUTPUT_TABLE}")
print(f"Total forecasts: {total_count:,}")
print(f"Model version: {model_version}")
print(f"Forecast date: {today_str}")

# Summary by horizon
print(f"\nForecasts by horizon:")
for h in HORIZONS:
    h_df = result_df.filter(F.col("horizon_days") == h)
    stats = h_df.agg(
        F.count("*").alias("n"),
        F.round(F.avg("forecast_qty"), 1).alias("avg_forecast"),
        F.round(F.avg("confidence_score"), 2).alias("avg_confidence"),
        F.round(F.sum("forecast_qty"), 0).alias("total_forecast")
    ).collect()[0]
    print(f"  Horizon {h}d: {stats['n']:,} forecasts, "
          f"avg qty={stats['avg_forecast']}, "
          f"avg confidence={stats['avg_confidence']}, "
          f"total={int(stats['total_forecast']):,}")

# Sample forecasts
print(f"\nSample forecasts:")
result_df.select(
    "product_id", "store_id", "horizon_days", "target_date_id",
    "forecast_qty", "lower_80", "upper_80", "confidence_score"
).show(10, truncate=False)

# SHAP coverage
shap_count = result_df.filter(F.col("top3_features_json") != "[]").count()
print(f"\nSHAP explanations: {shap_count:,} / {total_count:,} forecasts")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Summary
# MAGIC
# MAGIC **Batch Inference Completed:**
# MAGIC - Loaded champion model from MLflow Model Registry
# MAGIC - Generated forecasts for all active product x store combinations
# MAGIC - Horizons: 7, 14, and 28 days
# MAGIC - Prediction intervals: 80% and 95% confidence
# MAGIC - SHAP explanations for top 10K forecasts
# MAGIC
# MAGIC **Output Schema:**
# MAGIC - `product_id`, `store_id`: Forecast keys
# MAGIC - `horizon_days`: 7, 14, or 28
# MAGIC - `target_date_id`: Date being forecasted (YYYYMMDD)
# MAGIC - `forecast_qty`: Point forecast
# MAGIC - `lower_80`, `upper_80`: 80% prediction interval
# MAGIC - `lower_95`, `upper_95`: 95% prediction interval
# MAGIC - `confidence_score`: Model confidence (0.1-0.99)
# MAGIC - `top3_features_json`: Top 3 SHAP contributors (JSON array)
# MAGIC - `department`, `store_type`, `abc_class`, `city`: Dimensions for filtering
# MAGIC - `model_version`: MLflow model version used
# MAGIC - `generated_at`: Timestamp of forecast generation
# MAGIC
# MAGIC **Runtime:** ~10-15 min for ~264K product-store x 3 horizons = ~792K forecasts
# MAGIC
# MAGIC **Next notebook:** 13_forecast_accuracy.py — Daily accuracy tracking with alerts
