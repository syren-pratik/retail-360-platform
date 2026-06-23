# Databricks notebook source
# MAGIC %md
# MAGIC # 08: Feature Engineering for Demand Forecasting
# MAGIC
# MAGIC **Purpose:** Compute 52+ demand features from `retail_gold.gold_demand_daily_sku_store`
# MAGIC
# MAGIC **Output:** `retail_ml.demand_features` — the training dataset for LightGBM
# MAGIC
# MAGIC **Features:**
# MAGIC - Lag features (5): 1d, 7d, 14d, 28d, 364d
# MAGIC - Rolling windows (12): 7d/28d/90d averages, std, min, max, median
# MAGIC - Growth rates (4): WoW, MoM, YoY, trend slope
# MAGIC - Cyclical encodings (6): sin/cos for day_of_week, month, week_of_year
# MAGIC - Calendar features (8): festivals, salary week, IPL, monsoon
# MAGIC - Weather features (5): temp, rainfall, humidity, AQI
# MAGIC - Price/promo features (5): discount depth, promo frequency
# MAGIC - Inventory features (3): stock, DOS, stockout flag
# MAGIC - Product attributes (4): ABC class, perishable, essential, lifecycle
# MAGIC - Store attributes (3): store type, tier, dark store
# MAGIC
# MAGIC **CRITICAL:** NO DATA LEAKAGE — all features use only past data (rowsBetween(-N, -1))

# COMMAND ----------

# MAGIC %md
# MAGIC ## Configuration

# COMMAND ----------

import math
import time
from datetime import datetime
from pyspark.sql import functions as F
from pyspark.sql.window import Window
from pyspark.sql.types import IntegerType, DoubleType, StringType

# Configuration
CATALOG = "hive_metastore"
SCHEMA_GOLD = "retail_gold"
SCHEMA_ML = "retail_ml"

SOURCE_TABLE = f"{CATALOG}.{SCHEMA_GOLD}.gold_demand_daily_sku_store"
TARGET_TABLE = f"{CATALOG}.{SCHEMA_ML}.demand_features"

# Feature computation settings
BATCH_YEARS = None  # Set to [2023, 2024, 2025] to process year by year, None for all at once

print(f"Source: {SOURCE_TABLE}")
print(f"Target: {TARGET_TABLE}")
print(f"Started at: {datetime.now()}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 1: Create ML Schema if not exists

# COMMAND ----------

spark.sql(f"CREATE DATABASE IF NOT EXISTS {CATALOG}.{SCHEMA_ML}")
print(f"Schema {CATALOG}.{SCHEMA_ML} ready")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 2: Load Source Data

# COMMAND ----------

start_time = time.time()

# Load the gold demand daily table
df = spark.table(SOURCE_TABLE)

# Get basic stats
total_rows = df.count()
date_range = df.agg(F.min("date_id"), F.max("date_id")).collect()[0]
n_products = df.select("product_id").distinct().count()
n_stores = df.select("store_id").distinct().count()

print(f"Loaded {total_rows:,} rows from {SOURCE_TABLE}")
print(f"Date range: {date_range[0]} to {date_range[1]}")
print(f"Products: {n_products:,}, Stores: {n_stores:,}")
print(f"Load time: {time.time() - start_time:.1f}s")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 3: Compute Lag Features
# MAGIC
# MAGIC **CRITICAL:** lag(N) means we look N rows BACK in time — NO future leakage

# COMMAND ----------

start_time = time.time()
print("Computing lag features...")

# Window partitioned by product+store, ordered by date
w = Window.partitionBy("product_id", "store_id").orderBy("date_id")

# Lag features - quantity sold
df = df.withColumn("sales_lag_1d", F.lag("quantity_sold", 1).over(w))
df = df.withColumn("sales_lag_7d", F.lag("quantity_sold", 7).over(w))
df = df.withColumn("sales_lag_14d", F.lag("quantity_sold", 14).over(w))
df = df.withColumn("sales_lag_28d", F.lag("quantity_sold", 28).over(w))
df = df.withColumn("sales_lag_364d", F.lag("quantity_sold", 364).over(w))  # 364 to align day-of-week

# Cache after lag computation (reused by rolling windows)
df = df.cache()
df.count()  # Force cache

print(f"Lag features computed in {time.time() - start_time:.1f}s")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 4: Compute Rolling Window Features
# MAGIC
# MAGIC **CRITICAL:** rowsBetween(-N, -1) excludes current row to prevent leakage

# COMMAND ----------

start_time = time.time()
print("Computing rolling window features...")

# Rolling windows - EXCLUDE current row (-N to -1, not -N to 0)
w7 = Window.partitionBy("product_id", "store_id").orderBy("date_id").rowsBetween(-7, -1)
w28 = Window.partitionBy("product_id", "store_id").orderBy("date_id").rowsBetween(-28, -1)
w90 = Window.partitionBy("product_id", "store_id").orderBy("date_id").rowsBetween(-90, -1)

# 7-day rolling features
df = df.withColumn("rolling_7d_avg", F.avg("quantity_sold").over(w7))
df = df.withColumn("rolling_7d_std", F.stddev("quantity_sold").over(w7))
df = df.withColumn("rolling_7d_min", F.min("quantity_sold").over(w7))
df = df.withColumn("rolling_7d_max", F.max("quantity_sold").over(w7))

# 28-day rolling features
df = df.withColumn("rolling_28d_avg", F.avg("quantity_sold").over(w28))
df = df.withColumn("rolling_28d_std", F.stddev("quantity_sold").over(w28))
df = df.withColumn("rolling_28d_median", F.percentile_approx("quantity_sold", 0.5).over(w28))

# 90-day rolling features
df = df.withColumn("rolling_90d_avg", F.avg("quantity_sold").over(w90))
df = df.withColumn("rolling_90d_std", F.stddev("quantity_sold").over(w90))

# Revenue and transaction rolling
df = df.withColumn("revenue_rolling_28d", F.avg("revenue").over(w28))
df = df.withColumn("txn_rolling_7d", F.avg("num_transactions").over(w7))
df = df.withColumn("txn_rolling_28d", F.avg("num_transactions").over(w28))

print(f"Rolling features computed in {time.time() - start_time:.1f}s")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 5: Compute Growth Rate Features

# COMMAND ----------

start_time = time.time()
print("Computing growth rate features...")

# Week-over-week growth: (lag_7d - lag_14d) / lag_14d
df = df.withColumn(
    "wow_growth",
    F.when(
        (F.col("sales_lag_14d").isNotNull()) & (F.col("sales_lag_14d") != 0),
        (F.col("sales_lag_7d") - F.col("sales_lag_14d")) / F.col("sales_lag_14d")
    ).otherwise(None)
)

# Month-over-month growth (approximate using rolling averages)
# Rolling 28d avg vs lagged 28d avg (shifted by 28 days)
w28_lagged = Window.partitionBy("product_id", "store_id").orderBy("date_id").rowsBetween(-56, -29)
df = df.withColumn("rolling_28d_avg_lagged", F.avg("quantity_sold").over(w28_lagged))
df = df.withColumn(
    "mom_growth",
    F.when(
        (F.col("rolling_28d_avg_lagged").isNotNull()) & (F.col("rolling_28d_avg_lagged") != 0),
        (F.col("rolling_28d_avg") - F.col("rolling_28d_avg_lagged")) / F.col("rolling_28d_avg_lagged")
    ).otherwise(None)
)
df = df.drop("rolling_28d_avg_lagged")

# Year-over-year growth
# FIXED: Use sales_lag_1d instead of quantity_sold to prevent data leakage during inference
# Compare yesterday vs same day last year — both known at prediction time
df = df.withColumn(
    "yoy_growth",
    F.when(
        (F.col("sales_lag_1d").isNotNull()) &
        (F.col("sales_lag_364d").isNotNull()) &
        (F.col("sales_lag_364d") != 0),
        (F.col("sales_lag_1d") - F.col("sales_lag_364d")) / F.col("sales_lag_364d")
    ).otherwise(None)
)

# Trend slope (7-day) - approximation: (avg of last 3 days - avg of prev 4 days) / 3.5
w_last3 = Window.partitionBy("product_id", "store_id").orderBy("date_id").rowsBetween(-3, -1)
w_prev4 = Window.partitionBy("product_id", "store_id").orderBy("date_id").rowsBetween(-7, -4)
df = df.withColumn("avg_last3", F.avg("quantity_sold").over(w_last3))
df = df.withColumn("avg_prev4", F.avg("quantity_sold").over(w_prev4))
df = df.withColumn(
    "trend_slope_7d",
    (F.col("avg_last3") - F.col("avg_prev4")) / F.lit(3.5)
)
df = df.drop("avg_last3", "avg_prev4")

print(f"Growth features computed in {time.time() - start_time:.1f}s")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 6: Compute Cyclical Encodings
# MAGIC
# MAGIC Sin/cos encoding tells the model that Monday is close to Sunday, December is close to January

# COMMAND ----------

start_time = time.time()
print("Computing cyclical encodings...")

PI = math.pi

# Day of week sin/cos (1-7 -> 0-2pi)
df = df.withColumn("dow_sin", F.sin(F.col("day_of_week") * 2 * PI / 7))
df = df.withColumn("dow_cos", F.cos(F.col("day_of_week") * 2 * PI / 7))

# Month sin/cos (1-12 -> 0-2pi)
df = df.withColumn("month_sin", F.sin(F.col("month_num") * 2 * PI / 12))
df = df.withColumn("month_cos", F.cos(F.col("month_num") * 2 * PI / 12))

# Week of year - need to compute if not present
# Extract from date_id (YYYYMMDD format)
df = df.withColumn(
    "date_parsed",
    F.to_date(F.col("date_id").cast("string"), "yyyyMMdd")
)
df = df.withColumn("week_of_year", F.weekofyear(F.col("date_parsed")))
df = df.withColumn("week_of_year_sin", F.sin(F.col("week_of_year") * 2 * PI / 52))
df = df.withColumn("week_of_year_cos", F.cos(F.col("week_of_year") * 2 * PI / 52))
df = df.drop("date_parsed")

print(f"Cyclical encodings computed in {time.time() - start_time:.1f}s")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 7: Encode Calendar Features (Cast Booleans to INT)

# COMMAND ----------

start_time = time.time()
print("Encoding calendar features...")

# Boolean columns to cast to INT for LightGBM
bool_to_int_cols = [
    "is_weekend", "is_festival_period", "is_salary_week", "is_ipl_season",
    "is_monsoon_active", "is_lockdown", "is_public_holiday", "is_wedding_season",
    "is_exam_season", "is_harvest_season", "is_ramadan", "is_navratri_fast"
]

for col in bool_to_int_cols:
    if col in df.columns:
        df = df.withColumn(col, F.col(col).cast(IntegerType()))

# Festival intensity encoding: Peak=4, High=3, Medium=2, Low=1, None=0
df = df.withColumn(
    "festival_intensity_encoded",
    F.when(F.col("festival_intensity") == "Peak", 4)
    .when(F.col("festival_intensity") == "High", 3)
    .when(F.col("festival_intensity") == "Medium", 2)
    .when(F.col("festival_intensity") == "Low", 1)
    .otherwise(0)
)

# Days to festival - ensure numeric (should already be, but cast to be safe)
if "days_to_festival" in df.columns:
    df = df.withColumn("days_to_festival", F.col("days_to_festival").cast(IntegerType()))

print(f"Calendar features encoded in {time.time() - start_time:.1f}s")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 8: Encode Weather Features

# COMMAND ----------

start_time = time.time()
print("Processing weather features...")

# Weather columns - ensure they're numeric
weather_cols = ["temp_max_c", "temp_min_c", "temp_avg_c", "humidity_pct", "rainfall_mm", "aqi"]
for col in weather_cols:
    if col in df.columns:
        df = df.withColumn(col, F.col(col).cast(DoubleType()))

# is_heavy_rain - cast to INT
if "is_heavy_rain" in df.columns:
    df = df.withColumn("is_heavy_rain", F.col("is_heavy_rain").cast(IntegerType()))

print(f"Weather features processed in {time.time() - start_time:.1f}s")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 9: Compute Price and Promotion Features

# COMMAND ----------

start_time = time.time()
print("Computing price and promotion features...")

# Price to MRP ratio - should exist, cast to double
if "price_to_mrp_ratio" in df.columns:
    df = df.withColumn("price_to_mrp_ratio", F.col("price_to_mrp_ratio").cast(DoubleType()))

# is_on_promo - cast to INT
if "is_on_promo" in df.columns:
    df = df.withColumn("is_on_promo", F.col("is_on_promo").cast(IntegerType()))

# Discount depth = 1 - price_to_mrp_ratio (0 = full price, 0.2 = 20% off)
df = df.withColumn(
    "discount_depth",
    F.lit(1.0) - F.coalesce(F.col("price_to_mrp_ratio"), F.lit(1.0))
)

# Days since last promo - window function counting days since last is_on_promo=1
# Create a marker for promo dates, then use cumulative logic
w_promo = Window.partitionBy("product_id", "store_id").orderBy("date_id")

# Mark cumulative promo count to identify promo "groups"
df = df.withColumn(
    "promo_group",
    F.sum(F.col("is_on_promo")).over(w_promo)
)

# Get the last promo date within each group
df = df.withColumn(
    "last_promo_date",
    F.when(
        F.col("is_on_promo") == 1,
        F.col("date_id")
    ).otherwise(None)
)
df = df.withColumn(
    "last_promo_date",
    F.last("last_promo_date", ignorenulls=True).over(w_promo)
)

# Compute days since last promo
df = df.withColumn(
    "date_as_date",
    F.to_date(F.col("date_id").cast("string"), "yyyyMMdd")
)
df = df.withColumn(
    "last_promo_as_date",
    F.to_date(F.col("last_promo_date").cast("string"), "yyyyMMdd")
)
df = df.withColumn(
    "days_since_last_promo",
    F.datediff(F.col("date_as_date"), F.col("last_promo_as_date"))
)
df = df.drop("promo_group", "last_promo_date", "date_as_date", "last_promo_as_date")

# Fill nulls (no previous promo) with a large number
df = df.withColumn(
    "days_since_last_promo",
    F.coalesce(F.col("days_since_last_promo"), F.lit(999))
)

# Promo frequency in last 90 days
w90_promo = Window.partitionBy("product_id", "store_id").orderBy("date_id").rowsBetween(-90, -1)
df = df.withColumn(
    "promo_frequency_90d",
    F.sum(F.col("is_on_promo")).over(w90_promo) / F.lit(90.0)
)

print(f"Price/promo features computed in {time.time() - start_time:.1f}s")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 10: Encode Inventory Features

# COMMAND ----------

start_time = time.time()
print("Processing inventory features...")

# Inventory columns - ensure numeric
inventory_cols = ["closing_stock", "opening_stock", "days_of_stock", "received_qty"]
for col in inventory_cols:
    if col in df.columns:
        df = df.withColumn(col, F.col(col).cast(DoubleType()))

# is_stockout - cast to INT
if "is_stockout" in df.columns:
    df = df.withColumn("is_stockout", F.col("is_stockout").cast(IntegerType()))

print(f"Inventory features processed in {time.time() - start_time:.1f}s")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 11: Encode Product Attributes

# COMMAND ----------

start_time = time.time()
print("Encoding product attributes...")

# ABC class encoding: A=3, B=2, C=1
df = df.withColumn(
    "abc_class_encoded",
    F.when(F.col("abc_class") == "A", 3)
    .when(F.col("abc_class") == "B", 2)
    .when(F.col("abc_class") == "C", 1)
    .otherwise(2)  # Default to B if unknown
)

# XYZ class encoding: X=3, Y=2, Z=1
if "xyz_class" in df.columns:
    df = df.withColumn(
        "xyz_class_encoded",
        F.when(F.col("xyz_class") == "X", 3)
        .when(F.col("xyz_class") == "Y", 2)
        .when(F.col("xyz_class") == "Z", 1)
        .otherwise(2)
    )

# is_perishable - cast to INT
if "is_perishable" in df.columns:
    df = df.withColumn("is_perishable", F.col("is_perishable").cast(IntegerType()))

# is_essential_commodity - cast to INT
if "is_essential_commodity" in df.columns:
    df = df.withColumn("is_essential", F.col("is_essential_commodity").cast(IntegerType()))
else:
    df = df.withColumn("is_essential", F.lit(0))

# Lifecycle stage encoding: New=1, Growth=2, Mature=3, Decline=4
if "lifecycle_stage" in df.columns:
    df = df.withColumn(
        "lifecycle_encoded",
        F.when(F.col("lifecycle_stage") == "New", 1)
        .when(F.col("lifecycle_stage") == "Growth", 2)
        .when(F.col("lifecycle_stage") == "Mature", 3)
        .when(F.col("lifecycle_stage") == "Decline", 4)
        .otherwise(3)  # Default to Mature
    )
else:
    df = df.withColumn("lifecycle_encoded", F.lit(3))

print(f"Product attributes encoded in {time.time() - start_time:.1f}s")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 12: Encode Store Attributes

# COMMAND ----------

start_time = time.time()
print("Encoding store attributes...")

# Store type encoding: Hypermarket=4, Supermarket=3, Express=2, Dark Store=1
# Note: Kirana doesn't exist in this dataset
df = df.withColumn(
    "store_type_encoded",
    F.when(F.col("store_type") == "Hypermarket", 4)
    .when(F.col("store_type") == "Supermarket", 3)
    .when(F.col("store_type") == "Express", 2)
    .when(F.col("store_type") == "Dark Store", 1)
    .otherwise(3)  # Default to Supermarket
)

# Tier city encoding: Derive from city name
# Tier 1 cities: Mumbai, Delhi NCR, Bangalore, Chennai, Hyderabad, Kolkata
# Tier 2 cities: Pune, Ahmedabad, Jaipur, Lucknow
TIER1_CITIES = ["Mumbai", "Delhi NCR", "Delhi", "Bangalore", "Bengaluru", "Chennai", "Hyderabad", "Kolkata"]

df = df.withColumn(
    "tier_city_encoded",
    F.when(F.col("city").isin(TIER1_CITIES), 2).otherwise(1)
)

# Dark store flag
df = df.withColumn(
    "is_dark_store",
    F.when(F.col("store_type") == "Dark Store", 1).otherwise(0)
)

# Note: Kirana stores don't exist in this dataset (only Hypermarket, Supermarket, Express, Dark Store)
# is_kirana feature removed since it would always be 0

print(f"Store attributes encoded in {time.time() - start_time:.1f}s")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 13: Add Metadata and Select Final Columns

# COMMAND ----------

start_time = time.time()
print("Selecting final columns...")

# Add feature computation timestamp
df = df.withColumn("feature_computed_at", F.current_timestamp())

# Extract year for partitioning
df = df.withColumn("year", F.col("date_id").cast("string").substr(1, 4).cast(IntegerType()))

# Define all feature columns (66 total when combined with VPO in notebook 09)
FEATURE_COLS = [
    # Keys (for joining, not features)
    "date_id", "product_id", "store_id", "year", "month_num",

    # Target
    "quantity_sold",

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

    # Calendar features (8+)
    "is_weekend", "is_festival_period", "festival_intensity_encoded", "days_to_festival",
    "is_salary_week", "is_ipl_season", "is_monsoon_active", "is_lockdown",

    # Weather features (5)
    "temp_avg_c", "rainfall_mm", "humidity_pct", "is_heavy_rain", "aqi",

    # Price/promo features (5)
    "price_to_mrp_ratio", "is_on_promo", "discount_depth",
    "days_since_last_promo", "promo_frequency_90d",

    # Inventory features (3)
    "closing_stock", "days_of_stock", "is_stockout",

    # Margin feature (1) - needed for VPO profit classification
    "total_margin",

    # Product attributes (4)
    "abc_class_encoded", "is_perishable", "is_essential", "lifecycle_encoded",

    # Store attributes (3) - Note: is_kirana removed as Kirana stores don't exist
    "store_type_encoded", "tier_city_encoded", "is_dark_store",

    # Metadata
    "feature_computed_at",

    # Keep original categorical columns for analysis (not used in training)
    "department", "category_l1", "brand_id", "store_type", "city", "abc_class"
]

# Select columns that exist
existing_cols = [c for c in FEATURE_COLS if c in df.columns]
missing_cols = [c for c in FEATURE_COLS if c not in df.columns]

if missing_cols:
    print(f"Warning: Missing columns (will be added as NULL): {missing_cols[:10]}...")

# Add missing columns as NULL
for col in missing_cols:
    df = df.withColumn(col, F.lit(None))

df_final = df.select(FEATURE_COLS)

print(f"Selected {len(FEATURE_COLS)} columns in {time.time() - start_time:.1f}s")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 14: Write to retail_ml.demand_features

# COMMAND ----------

start_time = time.time()
print(f"Writing to {TARGET_TABLE}...")

# Write partitioned by year, month_num for efficient querying
df_final.write \
    .format("delta") \
    .mode("overwrite") \
    .partitionBy("year", "month_num") \
    .option("overwriteSchema", "true") \
    .saveAsTable(TARGET_TABLE)

elapsed = time.time() - start_time
print(f"Write completed in {elapsed:.1f}s")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 15: Verify Output

# COMMAND ----------

# Verify the output
result_df = spark.table(TARGET_TABLE)
result_count = result_df.count()

print(f"\n{'='*80}")
print(f"FEATURE ENGINEERING COMPLETE")
print(f"{'='*80}")
print(f"Output table: {TARGET_TABLE}")
print(f"Total rows: {result_count:,}")
print(f"Total columns: {len(result_df.columns)}")

# Show sample
print("\nSample data:")
result_df.select(
    "date_id", "product_id", "store_id", "quantity_sold",
    "sales_lag_7d", "rolling_28d_avg", "is_festival_period"
).show(5, truncate=False)

# Feature completeness check
print("\nFeature completeness (NULL rates):")
null_rates = result_df.select([
    (F.sum(F.when(F.col(c).isNull(), 1).otherwise(0)) / F.count("*") * 100).alias(c)
    for c in ["sales_lag_7d", "rolling_28d_avg", "wow_growth", "yoy_growth"]
]).collect()[0]

for i, col in enumerate(["sales_lag_7d", "rolling_28d_avg", "wow_growth", "yoy_growth"]):
    print(f"  {col}: {null_rates[i]:.1f}% NULL")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Summary
# MAGIC
# MAGIC **Features computed:** 56 features
# MAGIC - Lag features (5): sales_lag_1d, 7d, 14d, 28d, 364d
# MAGIC - Rolling features (12): 7d/28d/90d averages, std, min, max, median
# MAGIC - Growth features (4): wow_growth, mom_growth, yoy_growth, trend_slope_7d
# MAGIC - Cyclical encodings (6): sin/cos for day_of_week, month, week_of_year
# MAGIC - Calendar features (8): is_weekend, is_festival_period, etc.
# MAGIC - Weather features (5): temp, rainfall, humidity, AQI
# MAGIC - Price/promo features (5): discount_depth, promo_frequency, days_since_last_promo
# MAGIC - Inventory features (3): closing_stock, days_of_stock, is_stockout
# MAGIC - Product attributes (4): abc_class_encoded, is_perishable, is_essential, lifecycle_encoded
# MAGIC - Store attributes (3): store_type_encoded, tier_city_encoded, is_dark_store
# MAGIC
# MAGIC **Next notebook:** 09_vpo_outlet_classification.py — adds 10 more features (VPO + Outlet class)
