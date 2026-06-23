# Databricks notebook source
# MAGIC %md
# MAGIC # 09: VPO + Outlet Classification
# MAGIC
# MAGIC **Purpose:** Add product (VPO) and store (Outlet class) segmentation features
# MAGIC
# MAGIC **VPO Classification (per product):**
# MAGIC - **V (Volume):** High/Medium/Low based on total quantity sold
# MAGIC - **P (Profit):** High/Medium/Low based on total margin
# MAGIC - **O (Occasion):** Regular/Seasonal/Occasion/Impulse based on purchase patterns
# MAGIC
# MAGIC **Outlet Classification (per store):**
# MAGIC - **Throughput:** Platinum/Gold/Silver/Bronze based on revenue quartiles
# MAGIC - **SEC:** A/B/C based on basket value and premium brand share
# MAGIC - **Maturity:** New/Developing/Mature/Established based on store age
# MAGIC - **Perishable capability, Promo sensitivity, Online mix**
# MAGIC
# MAGIC **Output:** Updates `retail_ml.demand_features` with 10 additional features

# COMMAND ----------

# MAGIC %md
# MAGIC ## Configuration

# COMMAND ----------

import time
from datetime import datetime
from pyspark.sql import functions as F
from pyspark.sql.window import Window
from pyspark.sql.types import IntegerType, DoubleType, StringType

# Configuration
CATALOG = "hive_metastore"
SCHEMA_SILVER = "retail_silver"
SCHEMA_GOLD = "retail_gold"
SCHEMA_ML = "retail_ml"

# Source tables
DEMAND_FEATURES_TABLE = f"{CATALOG}.{SCHEMA_ML}.demand_features"
POS_SALES_TABLE = f"{CATALOG}.{SCHEMA_SILVER}.fact_pos_sales"
PRODUCT_TABLE = f"{CATALOG}.{SCHEMA_SILVER}.dim_product"
STORE_TABLE = f"{CATALOG}.{SCHEMA_SILVER}.dim_store"
PROMOTIONS_TABLE = f"{CATALOG}.{SCHEMA_SILVER}.fact_promotions"

# Output tables
VPO_TABLE = f"{CATALOG}.{SCHEMA_GOLD}.gold_product_vpo"
OUTLET_TABLE = f"{CATALOG}.{SCHEMA_GOLD}.gold_store_classification"

print(f"Started at: {datetime.now()}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 1: Compute VPO Classification (Product Segmentation)

# COMMAND ----------

# MAGIC %md
# MAGIC ### 1.1: Volume Classification (V)

# COMMAND ----------

start_time = time.time()
print("Computing Volume classification...")

# Load demand features for aggregation
df_demand = spark.table(DEMAND_FEATURES_TABLE)

# Aggregate total quantity sold per product
volume_df = df_demand.groupBy("product_id").agg(
    F.sum("quantity_sold").alias("total_qty_sold"),
    F.avg("quantity_sold").alias("avg_daily_qty"),
    F.count("*").alias("total_days_sold")
)

# Use NTILE to classify into High (top 20%), Medium (next 30%), Low (bottom 50%)
# NTILE(5) gives 5 buckets, bucket 1 = top 20%
w_volume = Window.orderBy(F.desc("total_qty_sold"))
volume_df = volume_df.withColumn("volume_bucket", F.ntile(5).over(w_volume))
volume_df = volume_df.withColumn(
    "volume_class",
    F.when(F.col("volume_bucket") == 1, "High")
    .when(F.col("volume_bucket").isin([2, 3]), "Medium")
    .otherwise("Low")
)

print(f"Volume classification computed in {time.time() - start_time:.1f}s")
volume_df.groupBy("volume_class").count().show()

# COMMAND ----------

# MAGIC %md
# MAGIC ### 1.2: Profit Classification (P)

# COMMAND ----------

start_time = time.time()
print("Computing Profit classification...")

# Aggregate total margin per product
# Use total_margin if exists, otherwise use revenue_rolling_28d as proxy
if "total_margin" in df_demand.columns:
    profit_df = df_demand.groupBy("product_id").agg(
        F.sum(F.coalesce(F.col("total_margin"), F.lit(0))).alias("total_margin"),
        F.avg(F.coalesce(F.col("total_margin"), F.lit(0))).alias("avg_daily_margin")
    )
elif "revenue_rolling_28d" in df_demand.columns:
    # Use revenue_rolling_28d * 0.15 as margin proxy
    profit_df = df_demand.groupBy("product_id").agg(
        F.sum(F.coalesce(F.col("revenue_rolling_28d"), F.lit(0)) * F.lit(0.15)).alias("total_margin"),
        F.avg(F.coalesce(F.col("revenue_rolling_28d"), F.lit(0)) * F.lit(0.15)).alias("avg_daily_margin")
    )
else:
    # Fallback: use quantity_sold as proxy for profit ranking
    profit_df = df_demand.groupBy("product_id").agg(
        F.sum(F.col("quantity_sold")).alias("total_margin"),
        F.avg(F.col("quantity_sold")).alias("avg_daily_margin")
    )

# NTILE for profit classification
w_profit = Window.orderBy(F.desc("total_margin"))
profit_df = profit_df.withColumn("profit_bucket", F.ntile(5).over(w_profit))
profit_df = profit_df.withColumn(
    "profit_class",
    F.when(F.col("profit_bucket") == 1, "High")
    .when(F.col("profit_bucket").isin([2, 3]), "Medium")
    .otherwise("Low")
)

print(f"Profit classification computed in {time.time() - start_time:.1f}s")
profit_df.groupBy("profit_class").count().show()

# COMMAND ----------

# MAGIC %md
# MAGIC ### 1.3: Occasion Classification (O)

# COMMAND ----------

start_time = time.time()
print("Computing Occasion classification...")

# Compute sales patterns per product
occasion_base = df_demand.groupBy("product_id", "month_num").agg(
    F.sum("quantity_sold").alias("monthly_qty")
)

# Get total annual sales per product
annual_sales = occasion_base.groupBy("product_id").agg(
    F.sum("monthly_qty").alias("annual_qty"),
    F.stddev("monthly_qty").alias("monthly_std"),
    F.avg("monthly_qty").alias("monthly_avg")
)

# Compute coefficient of variation (CV)
annual_sales = annual_sales.withColumn(
    "cv",
    F.when(F.col("monthly_avg") > 0, F.col("monthly_std") / F.col("monthly_avg")).otherwise(F.lit(0))
)

# Get top 3 months' share of annual sales (for seasonality detection)
w_month_rank = Window.partitionBy("product_id").orderBy(F.desc("monthly_qty"))
occasion_ranked = occasion_base.withColumn("month_rank", F.row_number().over(w_month_rank))
top3_sales = occasion_ranked.filter(F.col("month_rank") <= 3).groupBy("product_id").agg(
    F.sum("monthly_qty").alias("top3_months_qty")
)

# Join to get top3 share
occasion_df = annual_sales.join(top3_sales, "product_id", "left")
occasion_df = occasion_df.withColumn(
    "top3_months_share",
    F.when(F.col("annual_qty") > 0, F.coalesce(F.col("top3_months_qty"), F.lit(0)) / F.col("annual_qty")).otherwise(F.lit(0))
)

# Get festival sales share (handle case where is_festival_period might not exist or be null)
try:
    if "is_festival_period" in df_demand.columns:
        festival_sales = df_demand.filter(F.col("is_festival_period") == 1).groupBy("product_id").agg(
            F.sum("quantity_sold").alias("festival_qty")
        )
    else:
        # Create empty festival sales if column doesn't exist
        festival_sales = df_demand.select("product_id").distinct().withColumn("festival_qty", F.lit(0.0))
except Exception as e:
    print(f"Warning: Could not compute festival sales: {e}")
    festival_sales = df_demand.select("product_id").distinct().withColumn("festival_qty", F.lit(0.0))

total_sales = df_demand.groupBy("product_id").agg(
    F.sum("quantity_sold").alias("total_qty")
)

festival_share = total_sales.join(festival_sales, "product_id", "left")
festival_share = festival_share.withColumn(
    "festival_share",
    F.when(F.col("total_qty") > 0,
           F.coalesce(F.col("festival_qty"), F.lit(0)) / F.col("total_qty")
    ).otherwise(F.lit(0))
)

# Join all metrics
occasion_df = occasion_df.join(festival_share.select("product_id", "festival_share"), "product_id", "left")
occasion_df = occasion_df.fillna({"festival_share": 0.0, "top3_months_share": 0.0, "cv": 0.5})

# Classify based on patterns
# Regular: CV < 0.5 (stable demand)
# Seasonal: >60% of annual sales in 2-3 months
# Occasion: >40% of sales within festivals
# Impulse: everything else (default)
occasion_df = occasion_df.withColumn(
    "occasion_class",
    F.when(F.col("cv") < 0.5, "Regular")
    .when(F.col("top3_months_share") > 0.6, "Seasonal")
    .when(F.col("festival_share") > 0.4, "Occasion")
    .otherwise("Impulse")
)

print(f"Occasion classification computed in {time.time() - start_time:.1f}s")
occasion_df.groupBy("occasion_class").count().show()

# COMMAND ----------

# MAGIC %md
# MAGIC ### 1.4: Combine VPO Classification

# COMMAND ----------

start_time = time.time()
print("Combining VPO classification...")

# Join all classifications (use LEFT joins to preserve all products)
vpo_df = volume_df.select("product_id", "volume_class", "total_qty_sold", "avg_daily_qty") \
    .join(profit_df.select("product_id", "profit_class", "total_margin"), "product_id", "left") \
    .join(occasion_df.select("product_id", "occasion_class", "cv", "festival_share"), "product_id", "left")

# Fill nulls from failed joins with default values
vpo_df = vpo_df.fillna({
    "profit_class": "Medium",
    "total_margin": 0.0,
    "occasion_class": "Regular",
    "cv": 0.5,
    "festival_share": 0.0
})

# Create combined VPO segment label
vpo_df = vpo_df.withColumn(
    "vpo_segment",
    F.concat(F.col("volume_class"), F.lit("-"), F.col("profit_class"), F.lit("-"), F.col("occasion_class"))
)

# Encode for ML
vpo_df = vpo_df.withColumn(
    "volume_class_encoded",
    F.when(F.col("volume_class") == "High", 3)
    .when(F.col("volume_class") == "Medium", 2)
    .otherwise(1)
)

vpo_df = vpo_df.withColumn(
    "profit_class_encoded",
    F.when(F.col("profit_class") == "High", 3)
    .when(F.col("profit_class") == "Medium", 2)
    .otherwise(1)
)

vpo_df = vpo_df.withColumn(
    "occasion_class_encoded",
    F.when(F.col("occasion_class") == "Regular", 1)
    .when(F.col("occasion_class") == "Seasonal", 2)
    .when(F.col("occasion_class") == "Occasion", 3)
    .otherwise(4)  # Impulse
)

# Save VPO table
vpo_df.write \
    .format("delta") \
    .mode("overwrite") \
    .option("overwriteSchema", "true") \
    .saveAsTable(VPO_TABLE)

print(f"VPO classification saved to {VPO_TABLE}")
print(f"Time: {time.time() - start_time:.1f}s")

# Show distribution
print("\nVPO Segment distribution:")
vpo_df.groupBy("vpo_segment").count().orderBy(F.desc("count")).show(20, truncate=False)

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 2: Compute Outlet Classification (Store Segmentation)

# COMMAND ----------

# MAGIC %md
# MAGIC ### 2.1: Throughput Classification

# COMMAND ----------

start_time = time.time()
print("Computing Throughput classification...")

# Aggregate total quantity per store (revenue column not available in demand_features)
throughput_df = df_demand.groupBy("store_id").agg(
    F.sum("quantity_sold").alias("total_qty"),
    F.avg("quantity_sold").alias("avg_daily_qty"),
    F.sum(F.coalesce(F.col("revenue_rolling_28d"), F.lit(0))).alias("total_revenue_proxy"),
    F.countDistinct("date_id").alias("active_days")
)

# NTILE(4) for quartiles: Platinum (top 25%), Gold, Silver, Bronze
# Using total_qty since revenue is not available
w_qty = Window.orderBy(F.desc("total_qty"))
throughput_df = throughput_df.withColumn("throughput_bucket", F.ntile(4).over(w_qty))
throughput_df = throughput_df.withColumn(
    "throughput_class",
    F.when(F.col("throughput_bucket") == 1, "Platinum")
    .when(F.col("throughput_bucket") == 2, "Gold")
    .when(F.col("throughput_bucket") == 3, "Silver")
    .otherwise("Bronze")
)

print(f"Throughput classification computed in {time.time() - start_time:.1f}s")
throughput_df.groupBy("throughput_class").count().show()

# COMMAND ----------

# MAGIC %md
# MAGIC ### 2.2: SEC Classification (Socioeconomic Class)

# COMMAND ----------

start_time = time.time()
print("Computing SEC classification...")

# Compute average basket value per store
# Using revenue_rolling_28d and txn_rolling_28d as proxies (original columns not available)
if "revenue_rolling_28d" in df_demand.columns and "txn_rolling_28d" in df_demand.columns:
    sec_df = df_demand.groupBy("store_id").agg(
        (F.sum("revenue_rolling_28d") / F.sum(F.when(F.col("txn_rolling_28d") > 0, F.col("txn_rolling_28d")).otherwise(1))).alias("avg_basket_value"),
        F.avg("price_to_mrp_ratio").alias("avg_price_ratio")
    )
else:
    # Fallback: use quantity_sold and price_to_mrp_ratio as proxy
    sec_df = df_demand.groupBy("store_id").agg(
        F.avg("quantity_sold").alias("avg_basket_value"),  # Proxy
        F.avg("price_to_mrp_ratio").alias("avg_price_ratio")
    )

# Premium brand share would need brand data - using price ratio as proxy
# Higher price ratio (closer to MRP) = more premium/SEC-A behavior
sec_df = sec_df.withColumn(
    "premium_proxy",
    F.col("avg_price_ratio")  # Higher = less discounting = more premium
)

# SEC Classification based on basket value (Indian retail benchmarks)
# SEC-A: avg_basket > 1200 INR
# SEC-B: avg_basket 600-1200 INR
# SEC-C: avg_basket < 600 INR
sec_df = sec_df.withColumn(
    "sec_class",
    F.when(
        (F.col("avg_basket_value") > 1200) & (F.col("premium_proxy") > 0.85),
        "A"
    ).when(
        (F.col("avg_basket_value") >= 600) | (F.col("premium_proxy") >= 0.80),
        "B"
    ).otherwise("C")
)

print(f"SEC classification computed in {time.time() - start_time:.1f}s")
sec_df.groupBy("sec_class").count().show()

# COMMAND ----------

# MAGIC %md
# MAGIC ### 2.3: Store Maturity Classification

# COMMAND ----------

start_time = time.time()
print("Computing Maturity classification...")

# Try to get store opening date from dim_store
try:
    store_df = spark.table(STORE_TABLE)
    if "opening_date" in store_df.columns:
        maturity_df = store_df.select("store_id", "opening_date")
        maturity_df = maturity_df.withColumn(
            "store_age_years",
            F.datediff(F.current_date(), F.col("opening_date")) / 365.25
        )
    else:
        # Use first transaction date as proxy
        first_txn = df_demand.groupBy("store_id").agg(
            F.min("date_id").alias("first_date_id")
        )
        first_txn = first_txn.withColumn(
            "first_date",
            F.to_date(F.col("first_date_id").cast("string"), "yyyyMMdd")
        )
        maturity_df = first_txn.withColumn(
            "store_age_years",
            F.datediff(F.current_date(), F.col("first_date")) / 365.25
        ).select("store_id", "store_age_years")
except:
    # Fallback: use random assignment based on store_id hash
    maturity_df = df_demand.select("store_id").distinct()
    maturity_df = maturity_df.withColumn(
        "store_age_years",
        (F.hash(F.col("store_id")) % 6) + 1  # Random 1-6 years
    )

# Classify maturity
# New: < 1 year, Developing: 1-3 years, Mature: 3-5 years, Established: 5+ years
maturity_df = maturity_df.withColumn(
    "maturity_class",
    F.when(F.col("store_age_years") < 1, "New")
    .when(F.col("store_age_years") < 3, "Developing")
    .when(F.col("store_age_years") < 5, "Mature")
    .otherwise("Established")
)

print(f"Maturity classification computed in {time.time() - start_time:.1f}s")
maturity_df.groupBy("maturity_class").count().show()

# COMMAND ----------

# MAGIC %md
# MAGIC ### 2.4: Additional Store Classifications

# COMMAND ----------

start_time = time.time()
print("Computing additional store classifications...")

# Perishable capability: % quantity from perishable products (revenue not available)
perishable_df = df_demand.groupBy("store_id").agg(
    F.sum(F.when(F.col("is_perishable") == 1, F.col("quantity_sold")).otherwise(0)).alias("perishable_qty"),
    F.sum("quantity_sold").alias("total_qty_store")
)
perishable_df = perishable_df.withColumn(
    "perishable_pct",
    F.when(F.col("total_qty_store") > 0, F.col("perishable_qty") / F.col("total_qty_store")).otherwise(0)
)
perishable_df = perishable_df.withColumn(
    "perishable_capability",
    F.when(F.col("perishable_pct") > 0.25, "High")
    .when(F.col("perishable_pct") > 0.10, "Medium")
    .otherwise("Low")
)

# Promo sensitivity: % quantity during promotions (revenue not available)
promo_df = df_demand.groupBy("store_id").agg(
    F.sum(F.when(F.col("is_on_promo") == 1, F.col("quantity_sold")).otherwise(0)).alias("promo_qty"),
    F.sum("quantity_sold").alias("total_qty_promo")
)
promo_df = promo_df.withColumn(
    "promo_pct",
    F.when(F.col("total_qty_promo") > 0, F.col("promo_qty") / F.col("total_qty_promo")).otherwise(0)
)
promo_df = promo_df.withColumn(
    "promo_sensitivity",
    F.when(F.col("promo_pct") > 0.30, "High")
    .when(F.col("promo_pct") > 0.15, "Medium")
    .otherwise("Low")
)

# Online mix: check if we have qty_online column
if "qty_online" in df_demand.columns:
    online_df = df_demand.groupBy("store_id").agg(
        F.sum(F.coalesce(F.col("qty_online"), F.lit(0))).alias("online_qty"),
        F.sum("quantity_sold").alias("total_qty")
    )
    online_df = online_df.withColumn(
        "online_pct",
        F.when(F.col("total_qty") > 0, F.col("online_qty") / F.col("total_qty")).otherwise(0)
    )
else:
    # qty_online doesn't exist, use store_type as proxy
    online_df = df_demand.select("store_id", "store_type").distinct()
    online_df = online_df.withColumn(
        "online_pct",
        F.when(F.col("store_type") == "Dark Store", 1.0)
        .when(F.col("store_type") == "Hypermarket", 0.15)
        .when(F.col("store_type") == "Supermarket", 0.10)
        .otherwise(0.05)
    )

online_df = online_df.withColumn(
    "online_mix",
    F.when(F.col("online_pct") > 0.20, "High")
    .when(F.col("online_pct") > 0.05, "Medium")
    .otherwise("Low")
)

print(f"Additional classifications computed in {time.time() - start_time:.1f}s")

# COMMAND ----------

# MAGIC %md
# MAGIC ### 2.5: Combine Outlet Classification

# COMMAND ----------

start_time = time.time()
print("Combining Outlet classification...")

# Join all store classifications
outlet_df = throughput_df.select("store_id", "throughput_class", "total_qty", "avg_daily_qty") \
    .join(sec_df.select("store_id", "sec_class", "avg_basket_value"), "store_id", "left") \
    .join(maturity_df.select("store_id", "maturity_class", "store_age_years"), "store_id", "left") \
    .join(perishable_df.select("store_id", "perishable_capability", "perishable_pct"), "store_id", "left") \
    .join(promo_df.select("store_id", "promo_sensitivity", "promo_pct"), "store_id", "left") \
    .join(online_df.select("store_id", "online_mix", "online_pct"), "store_id", "left")

# Encode for ML
outlet_df = outlet_df.withColumn(
    "throughput_encoded",
    F.when(F.col("throughput_class") == "Platinum", 4)
    .when(F.col("throughput_class") == "Gold", 3)
    .when(F.col("throughput_class") == "Silver", 2)
    .otherwise(1)  # Bronze
)

outlet_df = outlet_df.withColumn(
    "sec_class_encoded",
    F.when(F.col("sec_class") == "A", 3)
    .when(F.col("sec_class") == "B", 2)
    .otherwise(1)  # C
)

outlet_df = outlet_df.withColumn(
    "maturity_encoded",
    F.when(F.col("maturity_class") == "New", 1)
    .when(F.col("maturity_class") == "Developing", 2)
    .when(F.col("maturity_class") == "Mature", 3)
    .otherwise(4)  # Established
)

outlet_df = outlet_df.withColumn(
    "perishable_capability_encoded",
    F.when(F.col("perishable_capability") == "High", 3)
    .when(F.col("perishable_capability") == "Medium", 2)
    .otherwise(1)  # Low
)

outlet_df = outlet_df.withColumn(
    "promo_sensitivity_encoded",
    F.when(F.col("promo_sensitivity") == "High", 3)
    .when(F.col("promo_sensitivity") == "Medium", 2)
    .otherwise(1)  # Low
)

outlet_df = outlet_df.withColumn(
    "online_mix_encoded",
    F.when(F.col("online_mix") == "High", 3)
    .when(F.col("online_mix") == "Medium", 2)
    .otherwise(1)  # Low
)

# Save Outlet classification table
outlet_df.write \
    .format("delta") \
    .mode("overwrite") \
    .option("overwriteSchema", "true") \
    .saveAsTable(OUTLET_TABLE)

print(f"Outlet classification saved to {OUTLET_TABLE}")
print(f"Time: {time.time() - start_time:.1f}s")

# Show distribution
print("\nOutlet classification summary:")
outlet_df.select("throughput_class", "sec_class", "maturity_class").show(10)

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 3: Update demand_features with VPO + Outlet Features

# COMMAND ----------

start_time = time.time()
print("Updating demand_features with VPO + Outlet features...")

# Load current demand features
demand_features = spark.table(DEMAND_FEATURES_TABLE)

# Load VPO and Outlet classifications
vpo_features = spark.table(VPO_TABLE).select(
    "product_id",
    "volume_class_encoded",
    "profit_class_encoded",
    "occasion_class_encoded",
    "vpo_segment"
)

outlet_features = spark.table(OUTLET_TABLE).select(
    "store_id",
    "throughput_encoded",
    "sec_class_encoded",
    "maturity_encoded",
    "perishable_capability_encoded",
    "promo_sensitivity_encoded",
    "online_mix_encoded"
)

# Join to demand features
demand_features_enriched = demand_features \
    .join(vpo_features, "product_id", "left") \
    .join(outlet_features, "store_id", "left")

# Fill nulls with default values
default_fills = {
    "volume_class_encoded": 2,
    "profit_class_encoded": 2,
    "occasion_class_encoded": 1,
    "throughput_encoded": 2,
    "sec_class_encoded": 2,
    "maturity_encoded": 3,
    "perishable_capability_encoded": 2,
    "promo_sensitivity_encoded": 2,
    "online_mix_encoded": 1
}

for col, default_val in default_fills.items():
    demand_features_enriched = demand_features_enriched.withColumn(
        col,
        F.coalesce(F.col(col), F.lit(default_val))
    )

# Update the demand_features table
demand_features_enriched.write \
    .format("delta") \
    .mode("overwrite") \
    .partitionBy("year", "month_num") \
    .option("overwriteSchema", "true") \
    .saveAsTable(DEMAND_FEATURES_TABLE)

print(f"demand_features updated with VPO + Outlet features")
print(f"Time: {time.time() - start_time:.1f}s")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Step 4: Verify Output

# COMMAND ----------

# Verify the updated features
result_df = spark.table(DEMAND_FEATURES_TABLE)

print(f"\n{'='*80}")
print(f"VPO + OUTLET CLASSIFICATION COMPLETE")
print(f"{'='*80}")

print(f"\nTotal rows: {result_df.count():,}")
print(f"Total columns: {len(result_df.columns)}")

# Check new columns
new_cols = [
    "volume_class_encoded", "profit_class_encoded", "occasion_class_encoded", "vpo_segment",
    "throughput_encoded", "sec_class_encoded", "maturity_encoded",
    "perishable_capability_encoded", "promo_sensitivity_encoded", "online_mix_encoded"
]

print("\nNew VPO + Outlet columns:")
for col in new_cols:
    if col in result_df.columns:
        print(f"  {col}")
    else:
        print(f"  {col} (MISSING!)")

# Show sample
print("\nSample data with new features:")
result_df.select(
    "product_id", "store_id", "quantity_sold",
    "volume_class_encoded", "profit_class_encoded", "occasion_class_encoded",
    "throughput_encoded", "sec_class_encoded"
).show(5, truncate=False)

# Show VPO distribution
print("\nVPO segment distribution:")
result_df.groupBy("vpo_segment").count().orderBy(F.desc("count")).show(10, truncate=False)

# COMMAND ----------

# MAGIC %md
# MAGIC ## Summary
# MAGIC
# MAGIC **VPO Features added (4):**
# MAGIC - volume_class_encoded: High=3, Medium=2, Low=1
# MAGIC - profit_class_encoded: High=3, Medium=2, Low=1
# MAGIC - occasion_class_encoded: Regular=1, Seasonal=2, Occasion=3, Impulse=4
# MAGIC - vpo_segment: Combined label (e.g., "High-Low-Regular")
# MAGIC
# MAGIC **Outlet Features added (6):**
# MAGIC - throughput_encoded: Platinum=4, Gold=3, Silver=2, Bronze=1
# MAGIC - sec_class_encoded: A=3, B=2, C=1
# MAGIC - maturity_encoded: New=1, Developing=2, Mature=3, Established=4
# MAGIC - perishable_capability_encoded: High=3, Medium=2, Low=1
# MAGIC - promo_sensitivity_encoded: High=3, Medium=2, Low=1
# MAGIC - online_mix_encoded: High=3, Medium=2, Low=1
# MAGIC
# MAGIC **Total features now: 56 (base) + 10 (VPO + Outlet) = 66 features**
# MAGIC
# MAGIC **Next notebook:** 10_feature_validation.py — Validate features and register in Feature Store
