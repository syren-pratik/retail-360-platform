# Databricks notebook source
# MAGIC %md
# MAGIC # 13: Forecast Accuracy Tracking
# MAGIC
# MAGIC **Purpose:** Daily comparison of forecasts vs actuals for accuracy monitoring and alerting.
# MAGIC
# MAGIC **Schedule:** Run daily after sales data is available (e.g., 6:00 AM)
# MAGIC
# MAGIC **Key Steps:**
# MAGIC 1. Get forecasts made H days ago for today's date
# MAGIC 2. Get actual sales for today
# MAGIC 3. Compute error metrics (MAPE, wMAPE, MAE, Bias)
# MAGIC 4. Segment accuracy by department, store_type, ABC class, festival
# MAGIC 5. Check for degradation and trigger alerts
# MAGIC 6. APPEND results to `retail_gold.gold_forecast_accuracy` (never overwrite history)
# MAGIC
# MAGIC **Alerts:**
# MAGIC - WARNING: MAPE > 25% for any horizon
# MAGIC - CRITICAL: MAPE > 25% for 3 consecutive days → trigger retraining

# COMMAND ----------

# MAGIC %pip install --upgrade "typing_extensions>=4.10.0" mlflow

# COMMAND ----------

dbutils.library.restartPython()

# COMMAND ----------

# MAGIC %md
# MAGIC ## Configuration

# COMMAND ----------

import time
from datetime import datetime, timedelta
from functools import reduce
import numpy as np
import pandas as pd
from pyspark.sql import functions as F
from pyspark.sql.types import StructType, StructField, StringType, IntegerType, DoubleType, TimestampType, BooleanType, DateType

# Configuration
CATALOG = "hive_metastore"
SCHEMA_ML = "retail_ml"
SCHEMA_GOLD = "retail_gold"

FORECAST_TABLE = f"{CATALOG}.{SCHEMA_ML}.forecast_output"
ACTUALS_TABLE = f"{CATALOG}.{SCHEMA_GOLD}.gold_demand_daily_sku_store"
ACCURACY_TABLE = f"{CATALOG}.{SCHEMA_GOLD}.gold_forecast_accuracy"

HORIZONS = [7, 14, 28]

# Alert thresholds
MAPE_WARNING = 0.25       # 25% MAPE warning threshold
MAPE_CRITICAL = 0.35      # 35% MAPE critical threshold
BIAS_WARNING = 0.10       # 10% systematic bias warning
DEGRADATION_DAYS = 3      # Alert if above threshold for N consecutive days

# Evaluation date (today by default)
EVAL_DATE = datetime.now().date()
EVAL_DATE_ID = int(EVAL_DATE.strftime("%Y%m%d"))

print(f"Forecast table: {FORECAST_TABLE}")
print(f"Actuals table: {ACTUALS_TABLE}")
print(f"Accuracy table: {ACCURACY_TABLE}")
print(f"Evaluation date: {EVAL_DATE} (date_id: {EVAL_DATE_ID})")
print(f"Horizons to evaluate: {HORIZONS}")
print(f"Started at: {datetime.now()}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 1: Get Actual Sales for Evaluation Date

# COMMAND ----------

start_time = time.time()
print(f"Getting actual sales for date_id = {EVAL_DATE_ID}...")

# Load actuals
actuals_df = spark.table(ACTUALS_TABLE)

# Filter to evaluation date
actuals_today = actuals_df.filter(F.col("date_id") == EVAL_DATE_ID)

# Select relevant columns
actuals_today = actuals_today.select(
    "product_id",
    "store_id",
    "date_id",
    F.col("quantity_sold").alias("actual_qty"),
    "department",
    "category_l1",
    "store_type",
    "city",
    "abc_class",
    "is_festival_period",
    "is_weekend",
    "is_on_promo",
    "is_monsoon_active"
)

actual_count = actuals_today.count()
print(f"Actual sales records for {EVAL_DATE_ID}: {actual_count:,}")

# Handle case where today's data isn't available yet
if actual_count == 0:
    print(f"WARNING: No actual sales data found for {EVAL_DATE_ID}")
    print("Checking latest available date...")
    latest_actual = actuals_df.agg(F.max("date_id")).collect()[0][0]
    print(f"Latest available date: {latest_actual}")

    if latest_actual:
        EVAL_DATE_ID = latest_actual
        EVAL_DATE = datetime.strptime(str(latest_actual), "%Y%m%d").date()
        actuals_today = actuals_df.filter(F.col("date_id") == EVAL_DATE_ID).select(
            "product_id", "store_id", "date_id",
            F.col("quantity_sold").alias("actual_qty"),
            "department", "category_l1", "store_type", "city",
            "abc_class", "is_festival_period", "is_weekend", "is_on_promo", "is_monsoon_active"
        )
        actual_count = actuals_today.count()
        print(f"Using date_id = {EVAL_DATE_ID}, records: {actual_count:,}")
    else:
        raise Exception("No actual sales data available!")

print(f"Actuals loaded in {time.time() - start_time:.1f}s")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 2: Get Forecasts for Each Horizon

# COMMAND ----------

start_time = time.time()
print("Getting forecasts for evaluation date...")

# Load forecasts
forecasts_df = spark.table(FORECAST_TABLE)

# For each horizon, get forecasts that were targeting today's date
all_horizon_forecasts = []

for horizon in HORIZONS:
    # Calculate when the forecast was made (H days before eval date)
    forecast_made_date = EVAL_DATE - timedelta(days=horizon)
    forecast_made_str = forecast_made_date.strftime("%Y-%m-%d")

    # Get forecasts with matching target_date_id and horizon
    forecasts_horizon = forecasts_df.filter(
        (F.col("target_date_id") == EVAL_DATE_ID) &
        (F.col("horizon_days") == horizon)
    ).select(
        "product_id",
        "store_id",
        "horizon_days",
        "forecast_qty",
        "lower_80",
        "upper_80",
        "confidence_score",
        "model_version"
    )

    forecast_count = forecasts_horizon.count()
    print(f"  Horizon {horizon}d: {forecast_count:,} forecasts targeting date {EVAL_DATE_ID}")

    if forecast_count > 0:
        all_horizon_forecasts.append(forecasts_horizon)

# Union all horizons
if all_horizon_forecasts:
    all_forecasts = reduce(lambda a, b: a.unionByName(b, allowMissingColumns=True), all_horizon_forecasts)
    total_forecasts = all_forecasts.count()
    print(f"\nTotal forecasts to evaluate: {total_forecasts:,}")
else:
    print("WARNING: No forecasts found for the evaluation date")
    # Create empty dataframe
    schema = StructType([
        StructField("product_id", StringType(), True),
        StructField("store_id", StringType(), True),
        StructField("horizon_days", IntegerType(), True),
        StructField("forecast_qty", DoubleType(), True),
        StructField("lower_80", DoubleType(), True),
        StructField("upper_80", DoubleType(), True),
        StructField("confidence_score", DoubleType(), True),
        StructField("model_version", StringType(), True),
    ])
    all_forecasts = spark.createDataFrame([], schema)

print(f"Forecasts loaded in {time.time() - start_time:.1f}s")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 3: Join Forecasts with Actuals

# COMMAND ----------

start_time = time.time()
print("Joining forecasts with actuals...")

# Join forecasts with actuals
accuracy_df = all_forecasts.join(
    actuals_today,
    ["product_id", "store_id"],
    "inner"
)

# Compute error metrics
accuracy_df = accuracy_df.withColumn(
    "absolute_error",
    F.abs(F.col("forecast_qty") - F.col("actual_qty"))
)

accuracy_df = accuracy_df.withColumn(
    "pct_error",
    F.when(F.col("actual_qty") > 0,
           F.col("absolute_error") / F.col("actual_qty")
    ).otherwise(F.lit(1.0))  # 100% error if actual is 0 but forecast > 0
)

accuracy_df = accuracy_df.withColumn(
    "signed_error",
    F.col("forecast_qty") - F.col("actual_qty")
)

accuracy_df = accuracy_df.withColumn(
    "bias_pct",
    F.when(F.col("actual_qty") > 0,
           F.col("signed_error") / F.col("actual_qty")
    ).otherwise(F.lit(0.0))
)

# Check if actual was within prediction interval
accuracy_df = accuracy_df.withColumn(
    "is_within_80",
    F.when(
        (F.col("actual_qty") >= F.col("lower_80")) &
        (F.col("actual_qty") <= F.col("upper_80")),
        F.lit(1)
    ).otherwise(F.lit(0))
)

# Add metadata
accuracy_df = accuracy_df.withColumn("accuracy_date", F.lit(EVAL_DATE.strftime("%Y-%m-%d")).cast("date"))
accuracy_df = accuracy_df.withColumn("computed_at", F.current_timestamp())

joined_count = accuracy_df.count()
print(f"Joined records: {joined_count:,}")
print(f"Join completed in {time.time() - start_time:.1f}s")

# Cache for reuse
accuracy_df = accuracy_df.cache()
accuracy_df.count()

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 4: Compute Overall Metrics

# COMMAND ----------

print(f"\n{'='*70}")
print(f"OVERALL ACCURACY METRICS")
print(f"{'='*70}")

# Overall metrics per horizon
horizon_metrics = {}

for h in HORIZONS:
    h_df = accuracy_df.filter(F.col("horizon_days") == h)
    h_count = h_df.count()

    if h_count == 0:
        print(f"\n  Horizon {h}d: No data")
        continue

    metrics = h_df.agg(
        F.count("*").alias("n_forecasts"),
        F.avg("pct_error").alias("mape"),
        F.avg("absolute_error").alias("mae"),
        F.avg("bias_pct").alias("avg_bias_pct"),
        F.sum("absolute_error").alias("total_abs_error"),
        F.sum("actual_qty").alias("total_actual"),
        F.avg(F.col("is_within_80").cast("double")).alias("coverage_80")
    ).collect()[0]

    # Compute weighted MAPE
    wmape = float(metrics["total_abs_error"]) / max(float(metrics["total_actual"]), 1)

    horizon_metrics[h] = {
        "n_forecasts": int(metrics["n_forecasts"]),
        "mape": float(metrics["mape"]),
        "wmape": wmape,
        "mae": float(metrics["mae"]),
        "bias": float(metrics["avg_bias_pct"]),
        "coverage_80": float(metrics["coverage_80"])
    }

    print(f"\n  Horizon {h}d:")
    print(f"    Forecasts:    {metrics['n_forecasts']:,}")
    print(f"    MAPE:         {metrics['mape']*100:.1f}%")
    print(f"    wMAPE:        {wmape*100:.1f}%")
    print(f"    MAE:          {metrics['mae']:.1f} units")
    print(f"    Bias:         {metrics['avg_bias_pct']*100:+.1f}%")
    print(f"    80% Coverage: {metrics['coverage_80']*100:.0f}%")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 5: Segmented Accuracy Metrics

# COMMAND ----------

print(f"\n{'='*70}")
print(f"SEGMENTED ACCURACY METRICS")
print(f"{'='*70}")

# Define segments to analyze
segments = [
    ("horizon_days", "Horizon"),
    ("department", "Department"),
    ("store_type", "Store Type"),
    ("abc_class", "ABC Class"),
    ("is_festival_period", "Festival Period"),
    ("is_weekend", "Weekend"),
    ("is_on_promo", "On Promo")
]

segmented_results = []

for seg_col, seg_name in segments:
    if seg_col not in accuracy_df.columns:
        continue

    print(f"\n--- By {seg_name} ---")

    seg_metrics = accuracy_df.groupBy(seg_col).agg(
        F.count("*").alias("n_forecasts"),
        F.avg("pct_error").alias("mape"),
        F.avg("absolute_error").alias("mae"),
        F.avg("bias_pct").alias("bias"),
        F.avg(F.col("is_within_80").cast("double")).alias("interval_coverage")
    ).orderBy(seg_col)

    seg_metrics_collected = seg_metrics.collect()

    for row in seg_metrics_collected:
        if row["n_forecasts"] >= 10:  # Only show if enough samples
            seg_val = str(row[seg_col])
            print(f"  {seg_col}={seg_val}: MAPE={row['mape']*100:.1f}%, "
                  f"Bias={row['bias']*100:+.1f}%, n={row['n_forecasts']:,}")

            # Store for accuracy table
            segmented_results.append({
                "segment_type": seg_col,
                "segment_value": seg_val,
                "mape": float(row["mape"]),
                "mae": float(row["mae"]),
                "bias": float(row["bias"]),
                "n_forecasts": int(row["n_forecasts"]),
                "interval_coverage_80": float(row["interval_coverage"])
            })

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 6: Check for Alerts and Degradation

# COMMAND ----------

print(f"\n{'='*70}")
print(f"ALERT CHECK")
print(f"{'='*70}")

alerts = []
alert_triggered = False

# Check each horizon for threshold violations
for h, metrics in horizon_metrics.items():
    # MAPE threshold check
    if metrics["mape"] > MAPE_CRITICAL:
        alert_msg = f"Horizon {h}d: MAPE at {metrics['mape']*100:.1f}% exceeds CRITICAL threshold ({MAPE_CRITICAL*100:.0f}%)"
        alerts.append(("CRITICAL", f"Horizon {h}d MAPE", alert_msg))
        print(f"\n  CRITICAL: {alert_msg}")
        alert_triggered = True
    elif metrics["mape"] > MAPE_WARNING:
        alert_msg = f"Horizon {h}d: MAPE at {metrics['mape']*100:.1f}% exceeds WARNING threshold ({MAPE_WARNING*100:.0f}%)"
        alerts.append(("WARNING", f"Horizon {h}d MAPE", alert_msg))
        print(f"\n  WARNING: {alert_msg}")
        alert_triggered = True

    # Bias threshold check
    if abs(metrics["bias"]) > BIAS_WARNING:
        direction = "over-forecasting" if metrics["bias"] > 0 else "under-forecasting"
        alert_msg = f"Horizon {h}d: Model is {direction} by {abs(metrics['bias'])*100:.1f}%"
        alerts.append(("WARNING", f"Horizon {h}d Bias", alert_msg))
        print(f"\n  WARNING: {alert_msg}")
        alert_triggered = True

    # Interval coverage check (should be ~80%)
    if metrics["coverage_80"] < 0.70:
        alert_msg = f"Horizon {h}d: 80% prediction interval coverage is only {metrics['coverage_80']*100:.0f}%"
        alerts.append(("WARNING", f"Horizon {h}d Coverage", alert_msg))
        print(f"\n  WARNING: {alert_msg}")

# Check segment-specific alerts
for result in segmented_results:
    if result["mape"] > MAPE_WARNING * 1.5:  # 1.5x threshold for segments
        alert_msg = f"{result['segment_type']}={result['segment_value']}: MAPE at {result['mape']*100:.1f}%"
        alerts.append(("WARNING", f"Segment Alert", alert_msg))
        print(f"\n  WARNING: High MAPE in segment - {alert_msg}")

# Check for consecutive degradation
try:
    # Try to read historical accuracy table
    historical_accuracy = spark.table(ACCURACY_TABLE)

    # Get recent daily MAPE for 7d horizon
    cutoff_date = (EVAL_DATE - timedelta(days=DEGRADATION_DAYS)).strftime("%Y-%m-%d")
    recent_accuracy = historical_accuracy \
        .filter(F.col("accuracy_date") >= cutoff_date) \
        .filter(F.col("horizon_days") == 7) \
        .groupBy("accuracy_date") \
        .agg(F.avg("pct_error").alias("daily_mape")) \
        .orderBy("accuracy_date")

    days_above_threshold = recent_accuracy \
        .filter(F.col("daily_mape") > MAPE_WARNING) \
        .count()

    if days_above_threshold >= DEGRADATION_DAYS:
        alert_msg = f"MAPE above {MAPE_WARNING*100:.0f}% for {days_above_threshold} consecutive days"
        alerts.append(("CRITICAL", "Consecutive Degradation", alert_msg))
        print(f"\n  CRITICAL: {alert_msg}")
        print(f"   RECOMMENDATION: Trigger model retraining (notebook 11)")
        alert_triggered = True
    elif days_above_threshold > 0:
        print(f"\n  INFO: MAPE above threshold for {days_above_threshold}/{DEGRADATION_DAYS} recent days")

except Exception as e:
    print(f"\n  INFO: Could not check historical degradation (first run or table missing)")

if not alerts:
    print(f"\n  All metrics within acceptable thresholds")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 7: Write to Accuracy Table (APPEND — Never Overwrite History)

# COMMAND ----------

start_time = time.time()
print(f"\nWriting accuracy results to {ACCURACY_TABLE}...")

# Select final columns for accuracy table
accuracy_output = accuracy_df.select(
    "accuracy_date",
    "product_id",
    "store_id",
    "horizon_days",
    "forecast_qty",
    F.col("actual_qty").alias("quantity_sold"),
    "absolute_error",
    "pct_error",
    F.col("signed_error").alias("bias"),
    "bias_pct",
    "is_within_80",
    "confidence_score",
    "department",
    "store_type",
    "abc_class",
    F.col("is_festival_period").cast("boolean"),
    F.col("is_weekend").cast("boolean"),
    F.col("is_monsoon_active").cast("boolean"),
    "model_version",
    "computed_at"
)

output_count = accuracy_output.count()

# Create or append to accuracy table
try:
    # Check if table exists and has matching schema
    existing_df = spark.table(ACCURACY_TABLE)
    existing_cols = set(existing_df.columns)
    new_cols = set(accuracy_output.columns)

    if existing_cols == new_cols:
        # Schema matches — APPEND
        accuracy_output.write \
            .format("delta") \
            .mode("append") \
            .saveAsTable(ACCURACY_TABLE)
        print(f"  APPENDED {output_count:,} accuracy records")
    else:
        # Schema mismatch — DROP and RECREATE
        print(f"  Schema mismatch detected. Recreating table...")
        spark.sql(f"DROP TABLE IF EXISTS {ACCURACY_TABLE}")
        accuracy_output.write \
            .format("delta") \
            .mode("overwrite") \
            .partitionBy("accuracy_date") \
            .saveAsTable(ACCURACY_TABLE)
        print(f"  RECREATED table with {output_count:,} records")

except Exception as e:
    # Table doesn't exist — CREATE
    print(f"  Creating new accuracy table...")
    accuracy_output.write \
        .format("delta") \
        .mode("overwrite") \
        .partitionBy("accuracy_date") \
        .saveAsTable(ACCURACY_TABLE)
    print(f"  CREATED table with {output_count:,} records")

print(f"Write completed in {time.time() - start_time:.1f}s")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 8: Log to MLflow (Optional)

# COMMAND ----------

try:
    import mlflow

    # Log accuracy metrics to MLflow for tracking over time
    mlflow.set_experiment("/Shared/demand_forecast_accelerator")

    with mlflow.start_run(run_name=f"accuracy_check_{EVAL_DATE_ID}"):
        # Log overall metrics for each horizon
        for h, metrics in horizon_metrics.items():
            mlflow.log_metric(f"accuracy_mape_{h}d", metrics["mape"])
            mlflow.log_metric(f"accuracy_wmape_{h}d", metrics["wmape"])
            mlflow.log_metric(f"accuracy_mae_{h}d", metrics["mae"])
            mlflow.log_metric(f"accuracy_bias_{h}d", metrics["bias"])
            mlflow.log_metric(f"accuracy_coverage_{h}d", metrics["coverage_80"])
            mlflow.log_metric(f"n_forecasts_{h}d", metrics["n_forecasts"])

        # Log segmented metrics (sample)
        for result in segmented_results[:20]:  # Top 20 segments
            metric_name = f"mape_{result['segment_type']}_{result['segment_value']}"
            metric_name = metric_name.replace(" ", "_").replace("-", "_")[:250]
            try:
                mlflow.log_metric(metric_name, result["mape"])
            except:
                pass

        mlflow.log_param("evaluation_date", str(EVAL_DATE_ID))
        mlflow.log_param("alerts_triggered", len(alerts))
        mlflow.log_param("alert_triggered", alert_triggered)

    print("\nAccuracy metrics logged to MLflow")

except Exception as e:
    print(f"\nMLflow logging skipped: {str(e)[:100]}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 9: Daily Report Summary

# COMMAND ----------

print(f"\n{'='*70}")
print(f"DAILY FORECAST ACCURACY REPORT — {EVAL_DATE}")
print(f"{'='*70}")

print(f"\nEvaluation Date: {EVAL_DATE_ID}")
print(f"Total Forecasts Evaluated: {joined_count:,}")

print(f"\n--- Overall Accuracy by Horizon ---")
for h, metrics in horizon_metrics.items():
    print(f"\n  Horizon {h}d:")
    print(f"    MAPE:         {metrics['mape']*100:.1f}%")
    print(f"    wMAPE:        {metrics['wmape']*100:.1f}%")
    print(f"    MAE:          {metrics['mae']:.1f} units")
    print(f"    Bias:         {metrics['bias']*100:+.1f}%")
    print(f"    80% Coverage: {metrics['coverage_80']*100:.0f}%")
    print(f"    N Forecasts:  {metrics['n_forecasts']:,}")

print(f"\n--- Alerts ({len(alerts)}) ---")
if alerts:
    for severity, category, msg in alerts:
        print(f"  [{severity}] {category}: {msg}")
else:
    print("  No alerts triggered")

print(f"\n--- By Department (7d horizon) ---")
dept_results = [r for r in segmented_results if r["segment_type"] == "department"]
for r in sorted(dept_results, key=lambda x: x["mape"])[:10]:
    print(f"  {r['segment_value']:25s} MAPE: {r['mape']*100:.1f}%  (n={r['n_forecasts']:,})")

print(f"\n--- By Store Type (7d horizon) ---")
store_results = [r for r in segmented_results if r["segment_type"] == "store_type"]
for r in sorted(store_results, key=lambda x: x["mape"]):
    print(f"  {r['segment_value']:25s} MAPE: {r['mape']*100:.1f}%  (n={r['n_forecasts']:,})")

print(f"\n--- By ABC Class (7d horizon) ---")
abc_results = [r for r in segmented_results if r["segment_type"] == "abc_class"]
for r in sorted(abc_results, key=lambda x: x["segment_value"]):
    print(f"  {r['segment_value']:25s} MAPE: {r['mape']*100:.1f}%  (n={r['n_forecasts']:,})")

print(f"\n{'='*70}")
print(f"Results saved to: {ACCURACY_TABLE}")
print(f"Alert thresholds: WARNING > {MAPE_WARNING*100:.0f}%, CRITICAL > {MAPE_CRITICAL*100:.0f}%")
print(f"{'='*70}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Summary
# MAGIC
# MAGIC **Forecast Accuracy Tracking Completed:**
# MAGIC - Compared forecasts with actuals for the evaluation date
# MAGIC - Computed MAPE, wMAPE, MAE, Bias, and prediction interval coverage
# MAGIC - Segmented analysis by horizon, department, store type, ABC class, etc.
# MAGIC - Alert system for degraded accuracy
# MAGIC - Results APPENDED to `retail_gold.gold_forecast_accuracy` (history preserved)
# MAGIC
# MAGIC **Recommended Schedule:**
# MAGIC - Run daily at 6:00 AM (after sales data is available)
# MAGIC - Set up alerts via Slack/Email for CRITICAL alerts
# MAGIC - Weekly review of accuracy trends
# MAGIC
# MAGIC **Retraining Triggers:**
# MAGIC - MAPE > 25% for 3 consecutive days
# MAGIC - Bias > 10% (systematic over/under-forecasting)
# MAGIC - 80% interval coverage < 70%
# MAGIC
# MAGIC **Accuracy Trend Query:**
# MAGIC ```sql
# MAGIC SELECT
# MAGIC   accuracy_date,
# MAGIC   horizon_days,
# MAGIC   COUNT(*) as n_forecasts,
# MAGIC   AVG(pct_error) as mape,
# MAGIC   AVG(bias_pct) as bias,
# MAGIC   AVG(is_within_80) as interval_coverage
# MAGIC FROM retail_gold.gold_forecast_accuracy
# MAGIC GROUP BY accuracy_date, horizon_days
# MAGIC ORDER BY accuracy_date DESC, horizon_days
# MAGIC LIMIT 30
# MAGIC ```
# MAGIC
# MAGIC **Complete ML Pipeline:**
# MAGIC - 08: Feature Engineering (56 base features + yoy_growth fix)
# MAGIC - 09: VPO + Outlet Classification (+10 features = 66 total)
# MAGIC - 10: Feature Validation + Registration
# MAGIC - 11: LightGBM Training + Hyperopt + MLflow
# MAGIC - 12: Batch Inference (7/14/28 day horizons with SHAP)
# MAGIC - 13: Forecast Accuracy Tracking (this notebook)
