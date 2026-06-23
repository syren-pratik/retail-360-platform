# Databricks notebook source
# MAGIC %md
# MAGIC # 03 - Generate Derived Fact Tables
# MAGIC
# MAGIC This notebook generates 14 derived fact tables from core facts:
# MAGIC
# MAGIC 1. fact_returns (~7M rows)
# MAGIC 2. fact_stockout_events (~20M rows)
# MAGIC 3. fact_cannibalization (~5K rows)
# MAGIC 4. fact_demand_plan (~500K rows)
# MAGIC 5. fact_loyalty (~200M rows)
# MAGIC 6. fact_basket (~100M rows)
# MAGIC 7. fact_shrinkage (~2M rows)
# MAGIC 8. fact_markdown (~1M rows)
# MAGIC 9. fact_assortment (~150K rows)
# MAGIC 10. fact_planogram (~150K rows)
# MAGIC 11. fact_footfall (~25M rows)
# MAGIC 12. fact_delivery (~40M rows)
# MAGIC 13. fact_reference_price (~500K rows) - Price addon
# MAGIC 14. fact_lost_sales (derived from stockouts)
# MAGIC
# MAGIC **Runtime:** ~10-15 minutes
# MAGIC
# MAGIC **Dependencies:** Run Notebooks 01 & 02 first

# COMMAND ----------

# MAGIC %md
# MAGIC ## Configuration & Setup

# COMMAND ----------

from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import *
from pyspark.sql.window import Window
from datetime import datetime, timedelta
import random

# Configuration - Using hive_metastore
CATALOG = "hive_metastore"
SCHEMA_BRONZE = "retail_bronze"

# Note: Spark configs are pre-set in serverless/managed clusters
# spark.conf.set("spark.sql.adaptive.enabled", "true")
# spark.conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")

print("✅ Configuration loaded")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Load Source Tables

# COMMAND ----------

# Load core fact tables
fact_pos_sales = spark.table(f"{SCHEMA_BRONZE}.fact_pos_sales")
fact_online_sales = spark.table(f"{SCHEMA_BRONZE}.fact_online_sales")
fact_inventory = spark.table(f"{SCHEMA_BRONZE}.fact_inventory")
fact_price = spark.table(f"{SCHEMA_BRONZE}.fact_price")

# Load dimensions
dim_product = spark.table(f"{SCHEMA_BRONZE}.dim_product")
dim_store = spark.table(f"{SCHEMA_BRONZE}.dim_store")
dim_date = spark.table(f"{SCHEMA_BRONZE}.dim_date")
dim_customer = spark.table(f"{SCHEMA_BRONZE}.dim_customer")
dim_category = spark.table(f"{SCHEMA_BRONZE}.dim_category")

print("✅ Source tables loaded")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate fact_returns (~7M rows)

# COMMAND ----------

# Returns are approximately 2% of POS sales
returns_base = fact_pos_sales.sample(0.02)

fact_returns = returns_base.withColumn(
    "return_id",
    F.concat(F.lit("RTN-"), F.col("txn_id"), F.lit("-"), F.col("line_id"))
).withColumn(
    "original_txn_id", F.col("txn_id")
).withColumn(
    "return_date",
    F.date_add(F.col("date_id").cast("string").cast("date"), (F.rand() * 14 + 1).cast("int"))
).withColumn(
    "return_reason",
    F.when(F.rand() < 0.30, "Product Damaged")
     .when(F.rand() < 0.50, "Wrong Product")
     .when(F.rand() < 0.65, "Quality Issue")
     .when(F.rand() < 0.80, "Expired/Near Expiry")
     .when(F.rand() < 0.90, "Customer Changed Mind")
     .otherwise("Other")
).withColumn(
    "return_qty", F.col("quantity_sold")  # Full return
).withColumn(
    "refund_amount", F.col("net_amount")
).withColumn(
    "refund_method",
    F.when(F.col("payment_method") == "Cash", "Cash")
     .otherwise(F.when(F.rand() < 0.7, "Original Payment Method").otherwise("Store Credit"))
).withColumn(
    "product_condition",
    F.when(F.col("return_reason") == "Product Damaged", "Damaged")
     .when(F.col("return_reason") == "Expired/Near Expiry", "Expired")
     .otherwise(F.when(F.rand() > 0.8, "Opened").otherwise("Sealed"))
).withColumn(
    "restocking_fee", F.lit(0.0)
).withColumn(
    "is_refunded", F.lit(True)
).withColumn(
    "processed_by", F.concat(F.lit("EMP-"), F.lpad((F.rand() * 1000).cast("int").cast("string"), 4, "0"))
).withColumn(
    "created_at", F.current_timestamp()
)

fact_returns_final = fact_returns.select(
    "return_id",
    "original_txn_id",
    "date_id",
    "return_date",
    "store_id",
    "product_id",
    "customer_id",
    "return_reason",
    "return_qty",
    "refund_amount",
    "refund_method",
    "product_condition",
    "restocking_fee",
    "is_refunded",
    "processed_by",
    F.col("year"),
    F.col("month_num"),
    "created_at"
)

fact_returns_final.write.mode("overwrite").partitionBy("year", "month_num").saveAsTable(f"{SCHEMA_BRONZE}.fact_returns")
returns_count = spark.table(f"{SCHEMA_BRONZE}.fact_returns").count()
print(f"✅ fact_returns: {returns_count:,} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate fact_stockout_events

# COMMAND ----------

# Stockout events from inventory where closing_stock = 0
stockouts = fact_inventory.filter(F.col("is_stockout") == True)

fact_stockout_events = stockouts.withColumn(
    "stockout_id",
    F.concat(F.lit("SO-"), F.col("inventory_id"))
).withColumn(
    "stockout_start_date",
    F.col("date_id").cast("string").cast("date")
).withColumn(
    "stockout_end_date",
    F.date_add(F.col("stockout_start_date"), (F.rand() * 3).cast("int"))
).withColumn(
    "duration_hours",
    (F.rand() * 48 + 6).cast("int")  # 6-54 hours
).withColumn(
    "root_cause",
    F.when(F.rand() < 0.35, "Supply Delay")
     .when(F.rand() < 0.55, "Demand Spike")
     .when(F.rand() < 0.70, "Forecast Error")
     .when(F.rand() < 0.80, "PO Not Placed")
     .when(F.rand() < 0.90, "Supplier Stockout")
     .otherwise("Other")
).withColumn(
    "estimated_lost_sales_qty",
    F.when(F.col("sold_qty") > 0, F.col("sold_qty"))
     .otherwise((F.rand() * 10 + 1).cast("int"))
).withColumn(
    "estimated_lost_revenue",
    F.col("estimated_lost_sales_qty") * (F.rand() * 100 + 50)
).withColumn(
    "is_resolved", F.lit(True)
).withColumn(
    "resolution_action",
    F.when(F.col("root_cause") == "Supply Delay", "Emergency Order")
     .when(F.col("root_cause") == "Demand Spike", "Inter-store Transfer")
     .otherwise("Regular Replenishment")
).withColumn(
    "created_at", F.current_timestamp()
)

fact_stockout_final = fact_stockout_events.select(
    "stockout_id",
    "date_id",
    "product_id",
    "store_id",
    "stockout_start_date",
    "stockout_end_date",
    "duration_hours",
    "root_cause",
    "estimated_lost_sales_qty",
    "estimated_lost_revenue",
    "is_resolved",
    "resolution_action",
    F.col("year"),
    F.col("month_num"),
    "created_at"
)

fact_stockout_final.write.mode("overwrite").partitionBy("year", "month_num").saveAsTable(f"{SCHEMA_BRONZE}.fact_stockout_events")
stockout_count = spark.table(f"{SCHEMA_BRONZE}.fact_stockout_events").count()
print(f"✅ fact_stockout_events: {stockout_count:,} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate fact_cannibalization (~5K rows)

# COMMAND ----------

# Product pairs within same subcategory with cross-elasticity
categories = dim_category.select("category_id", "category_l2_name").distinct().collect()

cannib_data = []
for cat in categories:
    # Get products in this category
    products_in_cat = dim_product.filter(
        F.col("category_id") == cat["category_id"]
    ).select("product_id", "brand_id").limit(20).collect()

    # Create pairs
    for i, p1 in enumerate(products_in_cat):
        for p2 in products_in_cat[i+1:i+4]:  # Up to 3 pairs per product
            cannib_data.append({
                "cannib_id": f"CANN-{len(cannib_data)+1:06d}",
                "category_id": cat["category_id"],
                "product_id_source": p1["product_id"],
                "product_id_target": p2["product_id"],
                "cross_elasticity": round(random.uniform(0.1, 0.4), 3),
                "substitution_score": round(random.uniform(0.3, 0.9), 2),
                "is_same_brand": p1["brand_id"] == p2["brand_id"],
                "computation_date": datetime(2024, 12, 1).date(),
                "data_period_start": datetime(2024, 1, 1).date(),
                "data_period_end": datetime(2024, 11, 30).date(),
                "confidence_score": round(random.uniform(0.7, 0.95), 2),
                "is_active": True,
            })

cannib_schema = StructType([
    StructField("cannib_id", StringType(), False),
    StructField("category_id", StringType(), True),
    StructField("product_id_source", StringType(), True),
    StructField("product_id_target", StringType(), True),
    StructField("cross_elasticity", DoubleType(), True),
    StructField("substitution_score", DoubleType(), True),
    StructField("is_same_brand", BooleanType(), True),
    StructField("computation_date", DateType(), True),
    StructField("data_period_start", DateType(), True),
    StructField("data_period_end", DateType(), True),
    StructField("confidence_score", DoubleType(), True),
    StructField("is_active", BooleanType(), True),
])

fact_cannibalization = spark.createDataFrame(cannib_data, schema=cannib_schema)
fact_cannibalization.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.fact_cannibalization")
cannib_count = spark.table(f"{SCHEMA_BRONZE}.fact_cannibalization").count()
print(f"✅ fact_cannibalization: {cannib_count:,} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate fact_demand_plan (~500K rows)

# COMMAND ----------

# Weekly demand plan aggregation from sales
# Aggregate sales to week-product-store level
# Note: fact_pos_sales already has year column from notebook 02
weekly_sales = fact_pos_sales.join(
    dim_date.select("date_id", "week_of_year"),  # Don't include year - use from fact_pos_sales
    "date_id"
).groupBy(
    "product_id", "store_id", "year", "week_of_year"
).agg(
    F.sum("quantity_sold").alias("actual_sales_qty"),
    F.sum("net_amount").alias("actual_sales_value")
)

fact_demand_plan = weekly_sales.withColumn(
    "plan_id",
    F.concat(F.col("product_id"), F.lit("-"), F.col("store_id"), F.lit("-"), F.col("year"), F.lit("-W"), F.col("week_of_year"))
).withColumn(
    "plan_version", F.lit("V1.0")
).withColumn(
    "plan_date",
    F.date_sub(F.concat(F.col("year"), F.lit("-01-01")).cast("date"), 30)  # Plan created 30 days before year start
).withColumn(
    # Statistical forecast with some noise
    "statistical_forecast_qty",
    F.round(F.col("actual_sales_qty") * (0.85 + F.rand() * 0.30), 0).cast("int")  # ±15% accuracy
).withColumn(
    # Manual adjustment by planner
    "manual_adjustment_qty",
    F.round((F.rand() - 0.5) * F.col("statistical_forecast_qty") * 0.10, 0).cast("int")
).withColumn(
    "consensus_forecast_qty",
    F.col("statistical_forecast_qty") + F.col("manual_adjustment_qty")
).withColumn(
    "forecast_accuracy_pct",
    F.when(F.col("actual_sales_qty") > 0,
           F.round(100 - F.abs(F.col("consensus_forecast_qty") - F.col("actual_sales_qty")) / F.col("actual_sales_qty") * 100, 1))
     .otherwise(0.0)
).withColumn(
    "bias",
    F.col("consensus_forecast_qty") - F.col("actual_sales_qty")
).withColumn(
    "mape",
    F.when(F.col("actual_sales_qty") > 0,
           F.round(F.abs(F.col("consensus_forecast_qty") - F.col("actual_sales_qty")) / F.col("actual_sales_qty") * 100, 1))
     .otherwise(0.0)
).withColumn(
    "planner_id", F.concat(F.lit("PLN-"), F.lpad((F.hash(F.col("store_id")) % 50 + 1).cast("string"), 3, "0"))
).withColumn(
    "is_approved", F.lit(True)
).withColumn(
    "created_at", F.current_timestamp()
)

fact_demand_plan_final = fact_demand_plan.select(
    "plan_id",
    "plan_version",
    "plan_date",
    "product_id",
    "store_id",
    "year",
    "week_of_year",
    "statistical_forecast_qty",
    "manual_adjustment_qty",
    "consensus_forecast_qty",
    "actual_sales_qty",
    "forecast_accuracy_pct",
    "bias",
    "mape",
    "planner_id",
    "is_approved",
    "created_at"
)

fact_demand_plan_final.write.mode("overwrite").partitionBy("year").saveAsTable(f"{SCHEMA_BRONZE}.fact_demand_plan")
demand_plan_count = spark.table(f"{SCHEMA_BRONZE}.fact_demand_plan").count()
print(f"✅ fact_demand_plan: {demand_plan_count:,} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate fact_loyalty

# COMMAND ----------

# Loyalty transactions for customers with loyalty membership
loyalty_sales = fact_pos_sales.filter(F.col("customer_id").isNotNull())

fact_loyalty = loyalty_sales.withColumn(
    "loyalty_txn_id",
    F.concat(F.lit("LTY-"), F.col("txn_id"))
).withColumn(
    "points_earned",
    F.floor(F.col("net_amount") / 100).cast("int")  # 1 point per ₹100
).withColumn(
    "points_redeemed",
    F.when(F.rand() > 0.9, F.floor(F.col("net_amount") * 0.05).cast("int")).otherwise(0)  # 10% redeem
).withColumn(
    "points_balance",
    F.round(F.rand() * 5000).cast("int")
).withColumn(
    "tier_at_txn",
    F.when(F.rand() < 0.05, "Platinum")
     .when(F.rand() < 0.15, "Gold")
     .when(F.rand() < 0.35, "Silver")
     .otherwise("Bronze")
).withColumn(
    "points_value_inr",
    F.col("points_earned") * 0.25  # 1 point = ₹0.25
).withColumn(
    "is_tier_upgrade_txn", F.lit(False)
).withColumn(
    "created_at", F.current_timestamp()
)

fact_loyalty_final = fact_loyalty.select(
    "loyalty_txn_id",
    "txn_id",
    "date_id",
    "customer_id",
    "store_id",
    "net_amount",
    "points_earned",
    "points_redeemed",
    "points_balance",
    "tier_at_txn",
    "points_value_inr",
    "is_tier_upgrade_txn",
    F.col("year"),
    F.col("month_num"),
    "created_at"
)

fact_loyalty_final.write.mode("overwrite").partitionBy("year", "month_num").saveAsTable(f"{SCHEMA_BRONZE}.fact_loyalty")
loyalty_count = spark.table(f"{SCHEMA_BRONZE}.fact_loyalty").count()
print(f"✅ fact_loyalty: {loyalty_count:,} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate fact_basket

# COMMAND ----------

# Basket-level aggregation from POS sales
fact_basket = fact_pos_sales.groupBy(
    "txn_id", "date_id", "store_id", "customer_id", "payment_method", "year", "month_num"
).agg(
    F.count("line_id").alias("total_items"),
    F.countDistinct("product_id").alias("unique_products"),
    F.sum("quantity_sold").alias("total_quantity"),
    F.sum("gross_amount").alias("gross_value"),
    F.sum("discount_amount").alias("total_discount"),
    F.sum("net_amount").alias("net_value"),
    F.sum("tax_amount").alias("total_tax"),
    F.max("is_on_promo").alias("has_promo_item")
).withColumn(
    "basket_id", F.col("txn_id")
).withColumn(
    "avg_item_price", F.round(F.col("net_value") / F.col("total_items"), 2)
).withColumn(
    "discount_pct", F.round(F.col("total_discount") / F.col("gross_value") * 100, 2)
).withColumn(
    "basket_type",
    F.when(F.col("net_value") > 2000, "Large")
     .when(F.col("net_value") > 500, "Medium")
     .otherwise("Small")
).withColumn(
    "basket_category",
    F.when(F.col("total_items") > 20, "Stock-up")
     .when(F.col("total_items") > 10, "Regular")
     .when(F.col("total_items") > 3, "Top-up")
     .otherwise("Quick Buy")
).withColumn(
    "time_in_store_mins",
    F.round(5 + F.col("total_items") * 2 + F.rand() * 10, 0).cast("int")
).withColumn(
    "created_at", F.current_timestamp()
)

fact_basket_final = fact_basket.select(
    "basket_id",
    "txn_id",
    "date_id",
    "store_id",
    "customer_id",
    "total_items",
    "unique_products",
    "total_quantity",
    "gross_value",
    "total_discount",
    "net_value",
    "total_tax",
    "avg_item_price",
    "discount_pct",
    "basket_type",
    "basket_category",
    "payment_method",
    "time_in_store_mins",
    "has_promo_item",
    "year",
    "month_num",
    "created_at"
)

fact_basket_final.write.mode("overwrite").partitionBy("year", "month_num").saveAsTable(f"{SCHEMA_BRONZE}.fact_basket")
basket_count = spark.table(f"{SCHEMA_BRONZE}.fact_basket").count()
print(f"✅ fact_basket: {basket_count:,} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate fact_shrinkage

# COMMAND ----------

# Shrinkage from inventory where damaged_qty > 0 or expired_qty > 0
shrinkage_base = fact_inventory.filter(
    (F.col("damaged_qty") > 0) | (F.col("expired_qty") > 0)
)

fact_shrinkage = shrinkage_base.withColumn(
    "shrinkage_id",
    F.concat(F.lit("SHR-"), F.col("inventory_id"))
).withColumn(
    "shrinkage_type",
    F.when(F.col("expired_qty") > 0, "Expiry")
     .when(F.rand() < 0.4, "Damage")
     .when(F.rand() < 0.7, "Theft")
     .otherwise("Admin Error")
).withColumn(
    "shrinkage_qty",
    F.col("damaged_qty") + F.col("expired_qty")
).withColumn(
    "shrinkage_value_at_cost",
    F.round(F.col("shrinkage_qty") * (F.rand() * 50 + 20), 2)
).withColumn(
    "shrinkage_value_at_mrp",
    F.round(F.col("shrinkage_value_at_cost") * 1.35, 2)
).withColumn(
    "discovery_date",
    F.col("date_id").cast("string").cast("date")
).withColumn(
    "reported_by", F.concat(F.lit("EMP-"), F.lpad((F.rand() * 500).cast("int").cast("string"), 4, "0"))
).withColumn(
    "root_cause",
    F.when(F.col("shrinkage_type") == "Expiry", "Poor Rotation/FIFO")
     .when(F.col("shrinkage_type") == "Damage", "Handling Error")
     .when(F.col("shrinkage_type") == "Theft", "Internal/External Theft")
     .otherwise("Process Gap")
).withColumn(
    "is_recovered", F.when(F.col("shrinkage_type") == "Theft", F.rand() > 0.9).otherwise(False)
).withColumn(
    "created_at", F.current_timestamp()
)

fact_shrinkage_final = fact_shrinkage.select(
    "shrinkage_id",
    "date_id",
    "product_id",
    "store_id",
    "shrinkage_type",
    "shrinkage_qty",
    "shrinkage_value_at_cost",
    "shrinkage_value_at_mrp",
    "discovery_date",
    "reported_by",
    "root_cause",
    "is_recovered",
    F.col("year"),
    F.col("month_num"),
    "created_at"
)

fact_shrinkage_final.write.mode("overwrite").partitionBy("year", "month_num").saveAsTable(f"{SCHEMA_BRONZE}.fact_shrinkage")
shrinkage_count = spark.table(f"{SCHEMA_BRONZE}.fact_shrinkage").count()
print(f"✅ fact_shrinkage: {shrinkage_count:,} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate fact_markdown

# COMMAND ----------

# Markdowns for perishables nearing expiry
perishable_inventory = fact_inventory.join(
    dim_product.select("product_id", "is_perishable", "shelf_life_days", "mrp"),
    "product_id"
).filter(
    (F.col("is_perishable") == True) & (F.col("closing_stock_qty") > 0)
).sample(0.10)  # 10% of perishable inventory gets marked down

fact_markdown = perishable_inventory.withColumn(
    "markdown_id",
    F.concat(F.lit("MD-"), F.col("inventory_id"))
).withColumn(
    "markdown_date",
    F.col("date_id").cast("string").cast("date")
).withColumn(
    "days_to_expiry",
    F.round(F.rand() * 5 + 1).cast("int")  # 1-6 days to expiry
).withColumn(
    "original_price",
    F.col("mrp")
).withColumn(
    "markdown_pct",
    F.when(F.col("days_to_expiry") <= 2, F.round(40 + F.rand() * 20, 0))  # 40-60%
     .when(F.col("days_to_expiry") <= 4, F.round(25 + F.rand() * 15, 0))  # 25-40%
     .otherwise(F.round(15 + F.rand() * 10, 0))  # 15-25%
).withColumn(
    "markdown_price",
    F.round(F.col("original_price") * (1 - F.col("markdown_pct") / 100), 2)
).withColumn(
    "markdown_qty", F.col("closing_stock_qty")
).withColumn(
    "markdown_value_loss",
    F.round((F.col("original_price") - F.col("markdown_price")) * F.col("markdown_qty"), 2)
).withColumn(
    "sold_qty_at_markdown",
    F.round(F.col("markdown_qty") * (0.6 + F.rand() * 0.35)).cast("int")  # 60-95% sell through
).withColumn(
    "remaining_qty",
    F.col("markdown_qty") - F.col("sold_qty_at_markdown")
).withColumn(
    "markdown_reason", F.lit("Near Expiry")
).withColumn(
    "created_at", F.current_timestamp()
)

fact_markdown_final = fact_markdown.select(
    "markdown_id",
    "date_id",
    "product_id",
    "store_id",
    "markdown_date",
    "days_to_expiry",
    "original_price",
    "markdown_pct",
    "markdown_price",
    "markdown_qty",
    "markdown_value_loss",
    "sold_qty_at_markdown",
    "remaining_qty",
    "markdown_reason",
    F.col("year"),
    F.col("month_num"),
    "created_at"
)

fact_markdown_final.write.mode("overwrite").partitionBy("year", "month_num").saveAsTable(f"{SCHEMA_BRONZE}.fact_markdown")
markdown_count = spark.table(f"{SCHEMA_BRONZE}.fact_markdown").count()
print(f"✅ fact_markdown: {markdown_count:,} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate fact_assortment (~150K rows)

# COMMAND ----------

# Assortment = which products are listed in which stores
# ABC stocking rules: A=all stores, B=70%, C=30%
products_with_abc = dim_product.select("product_id", "abc_class", "category_id", "department")
stores_list = dim_store.select("store_id", "store_type").distinct()

# Cross join
assortment_base = products_with_abc.crossJoin(stores_list)

# Filter based on ABC class and random sampling
fact_assortment = assortment_base.withColumn(
    "rand_val", F.rand()
).filter(
    ((F.col("abc_class") == "A")) |
    ((F.col("abc_class") == "B") & (F.col("rand_val") < 0.70)) |
    ((F.col("abc_class") == "C") & (F.col("rand_val") < 0.30))
).withColumn(
    "assortment_id",
    F.concat(F.col("product_id"), F.lit("-"), F.col("store_id"))
).withColumn(
    "listing_date",
    F.date_sub(F.lit("2020-01-01").cast("date"), (F.rand() * 365).cast("int"))
).withColumn(
    "delisting_date", F.lit(None).cast("date")
).withColumn(
    "is_mandatory", F.col("abc_class") == "A"
).withColumn(
    "is_local_assortment", F.rand() > 0.9
).withColumn(
    "status", F.lit("Active")
).withColumn(
    "reason_code", F.lit(None).cast("string")
).withColumn(
    "approved_by", F.concat(F.lit("MGR-"), F.lpad((F.rand() * 100).cast("int").cast("string"), 3, "0"))
).withColumn(
    "created_at", F.current_timestamp()
)

fact_assortment_final = fact_assortment.select(
    "assortment_id",
    "product_id",
    "store_id",
    "category_id",
    "listing_date",
    "delisting_date",
    "is_mandatory",
    "is_local_assortment",
    "status",
    "reason_code",
    "approved_by",
    "created_at"
).dropDuplicates(["assortment_id"])

fact_assortment_final.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.fact_assortment")
assort_count = spark.table(f"{SCHEMA_BRONZE}.fact_assortment").count()
print(f"✅ fact_assortment: {assort_count:,} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate fact_planogram (~150K rows)

# COMMAND ----------

# Planogram = shelf placement for each assorted product
planogram_base = fact_assortment_final.join(
    dim_product.select("product_id", "abc_class", "department"),
    "product_id"
)

fact_planogram = planogram_base.withColumn(
    "planogram_id",
    F.concat(F.lit("PLN-"), F.col("assortment_id"))
).withColumn(
    "effective_date", F.col("listing_date")
).withColumn(
    "end_date", F.lit(None).cast("date")
).withColumn(
    "aisle_number",
    F.when(F.col("department") == "Grocery & Staples", F.lit("A1"))
     .when(F.col("department") == "Dairy & Frozen", F.lit("A2"))
     .when(F.col("department") == "Beverages", F.lit("A3"))
     .when(F.col("department") == "Snacks & Biscuits", F.lit("A4"))
     .otherwise(F.lit("A5"))
).withColumn(
    "shelf_number",
    F.when(F.col("abc_class") == "A", 2)  # Eye level
     .when(F.col("abc_class") == "B", 3)  # Middle
     .otherwise(4)  # Bottom
).withColumn(
    "position_on_shelf",
    F.round(F.rand() * 10 + 1).cast("int")
).withColumn(
    "facings",
    F.when(F.col("abc_class") == "A", 4)
     .when(F.col("abc_class") == "B", 2)
     .otherwise(1)
).withColumn(
    "shelf_position",
    F.when(F.col("abc_class") == "A", "Eye Level")
     .when(F.col("abc_class") == "B", "Middle")
     .otherwise("Bottom")
).withColumn(
    "depth", F.lit(2)
).withColumn(
    "width_cm", F.round(F.rand() * 10 + 5).cast("int")
).withColumn(
    "height_cm", F.round(F.rand() * 15 + 10).cast("int")
).withColumn(
    "is_end_cap", F.rand() > 0.95
).withColumn(
    "created_at", F.current_timestamp()
)

fact_planogram_final = fact_planogram.select(
    "planogram_id",
    "product_id",
    "store_id",
    "effective_date",
    "end_date",
    "aisle_number",
    "shelf_number",
    "position_on_shelf",
    "facings",
    "shelf_position",
    "depth",
    "width_cm",
    "height_cm",
    "is_end_cap",
    "created_at"
)

fact_planogram_final.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.fact_planogram")
plano_count = spark.table(f"{SCHEMA_BRONZE}.fact_planogram").count()
print(f"✅ fact_planogram: {plano_count:,} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate fact_footfall (~25M rows)

# COMMAND ----------

# Footfall = hourly traffic per store (excluding dark stores)
stores_with_footfall = dim_store.filter(
    F.col("store_type") != "Dark Store"
).select("store_id", "store_type", "area_sqft")

dates_df = dim_date.select("date_id", "full_date", "is_weekend", "festival_intensity", "year", "month_num")

# Hours 8 AM to 10 PM
hours_df = spark.createDataFrame([(h,) for h in range(8, 22)], ["hour_of_day"])

# Cross join
footfall_base = stores_with_footfall.crossJoin(dates_df).crossJoin(hours_df)

# Hourly pattern
hourly_pattern = {
    8: 0.3, 9: 0.5, 10: 0.8, 11: 1.0, 12: 0.9, 13: 0.7,
    14: 0.6, 15: 0.5, 16: 0.6, 17: 0.8, 18: 1.0, 19: 0.9, 20: 0.7, 21: 0.4
}

# Create hourly multiplier
hourly_df = spark.createDataFrame(
    [(h, m) for h, m in hourly_pattern.items()],
    ["hour", "hourly_mult"]
)

footfall_with_pattern = footfall_base.join(
    hourly_df,
    footfall_base.hour_of_day == hourly_df.hour,
    "left"
)

fact_footfall = footfall_with_pattern.withColumn(
    "footfall_id",
    F.concat(F.col("store_id"), F.lit("-"), F.col("date_id"), F.lit("-"), F.col("hour_of_day"))
).withColumn(
    "time_id", F.concat(F.lit("T"), F.lpad(F.col("hour_of_day").cast("string"), 2, "0"))
).withColumn(
    # Base footfall from store size
    "base_footfall",
    F.when(F.col("store_type") == "Hypermarket", F.round(F.col("area_sqft") / 10))
     .when(F.col("store_type") == "Supermarket", F.round(F.col("area_sqft") / 8))
     .when(F.col("store_type") == "Express", F.round(F.col("area_sqft") / 5))
     .otherwise(F.round(F.col("area_sqft") / 3))
).withColumn(
    "weekend_mult",
    F.when(F.col("is_weekend"), 1.35).otherwise(1.0)
).withColumn(
    "festival_mult",
    F.when(F.col("festival_intensity") == "Peak", 2.5)
     .when(F.col("festival_intensity") == "High", 1.6)
     .when(F.col("festival_intensity") == "Medium", 1.25)
     .otherwise(1.0)
).withColumn(
    "footfall_count",
    F.round(
        F.col("base_footfall") / 14 *  # Distribute across 14 hours
        F.coalesce(F.col("hourly_mult"), F.lit(0.5)) *
        F.col("weekend_mult") *
        F.col("festival_mult") *
        (0.8 + F.rand() * 0.4)  # Random variation
    ).cast("int")
).withColumn(
    # Conversion rate
    "txn_count",
    F.round(F.col("footfall_count") * (0.25 + F.rand() * 0.15)).cast("int")  # 25-40% conversion
).withColumn(
    "conversion_rate",
    F.when(F.col("footfall_count") > 0,
           F.round(F.col("txn_count") / F.col("footfall_count") * 100, 1))
     .otherwise(0.0)
).withColumn(
    "dwell_time_mins",
    F.round(15 + F.rand() * 30).cast("int")  # 15-45 minutes
).withColumn(
    "created_at", F.current_timestamp()
)

fact_footfall_final = fact_footfall.select(
    "footfall_id",
    "date_id",
    "time_id",
    "store_id",
    "hour_of_day",
    "footfall_count",
    "txn_count",
    "conversion_rate",
    "dwell_time_mins",
    "year",
    "month_num",
    "created_at"
)

fact_footfall_final.write.mode("overwrite").partitionBy("year", "month_num").saveAsTable(f"{SCHEMA_BRONZE}.fact_footfall")
footfall_count = spark.table(f"{SCHEMA_BRONZE}.fact_footfall").count()
print(f"✅ fact_footfall: {footfall_count:,} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate fact_delivery

# COMMAND ----------

# Delivery details for online orders
fact_delivery = fact_online_sales.withColumn(
    "delivery_id",
    F.concat(F.lit("DEL-"), F.col("order_id"))
).withColumn(
    "order_date", F.col("date_id").cast("string").cast("date")
).withColumn(
    "promised_time_mins",
    F.when(F.col("channel_id") == "CHN-QCOMMERCE", 30)
     .otherwise(2880)  # 48 hours
).withColumn(
    "actual_time_mins",
    F.when(F.col("channel_id") == "CHN-QCOMMERCE",
           F.round(F.rand() * 25 + 15).cast("int"))  # 15-40 mins
     .otherwise(F.round(F.rand() * 2000 + 1000).cast("int"))  # 16-50 hours
).withColumn(
    "pick_time_mins",
    F.when(F.col("channel_id") == "CHN-QCOMMERCE", F.round(F.rand() * 3 + 2).cast("int"))
     .otherwise(F.round(F.rand() * 60 + 30).cast("int"))
).withColumn(
    "pack_time_mins",
    F.when(F.col("channel_id") == "CHN-QCOMMERCE", F.round(F.rand() * 3 + 2).cast("int"))
     .otherwise(F.round(F.rand() * 30 + 15).cast("int"))
).withColumn(
    "dispatch_time_mins",
    F.when(F.col("channel_id") == "CHN-QCOMMERCE", F.round(F.rand() * 3 + 1).cast("int"))
     .otherwise(F.round(F.rand() * 120 + 60).cast("int"))
).withColumn(
    "transit_time_mins",
    F.col("actual_time_mins") - F.col("pick_time_mins") - F.col("pack_time_mins") - F.col("dispatch_time_mins")
).withColumn(
    "sla_met",
    F.col("actual_time_mins") <= F.col("promised_time_mins")
).withColumn(
    "delay_mins",
    F.greatest(F.lit(0), F.col("actual_time_mins") - F.col("promised_time_mins"))
).withColumn(
    "delivery_status", F.lit("Delivered")
).withColumn(
    "delivery_attempt", F.when(F.rand() > 0.9, 2).otherwise(1)
).withColumn(
    "recipient_name", F.concat(F.lit("Customer "), F.col("customer_id"))
).withColumn(
    "delivery_rating",
    F.when(F.col("sla_met") & (F.rand() > 0.3), F.round(F.rand() * 1.5 + 3.5).cast("int"))  # 4-5
     .when(F.col("sla_met"), F.round(F.rand() * 2 + 3).cast("int"))  # 3-5
     .otherwise(F.round(F.rand() * 3 + 1).cast("int"))  # 1-4
).withColumn(
    "delivery_feedback", F.lit(None).cast("string")
).withColumn(
    "created_at", F.current_timestamp()
)

fact_delivery_final = fact_delivery.select(
    "delivery_id",
    "order_id",
    "date_id",
    "customer_id",
    "fulfillment_store_id",
    "delivery_partner",
    "delivery_pincode",
    "order_date",
    "promised_time_mins",
    "actual_time_mins",
    "pick_time_mins",
    "pack_time_mins",
    "dispatch_time_mins",
    "transit_time_mins",
    "sla_met",
    "delay_mins",
    "delivery_status",
    "delivery_attempt",
    "recipient_name",
    "delivery_rating",
    "delivery_feedback",
    "year",
    "month_num",
    "created_at"
)

fact_delivery_final.write.mode("overwrite").partitionBy("year", "month_num").saveAsTable(f"{SCHEMA_BRONZE}.fact_delivery")
delivery_count = spark.table(f"{SCHEMA_BRONZE}.fact_delivery").count()
print(f"✅ fact_delivery: {delivery_count:,} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate fact_reference_price (~500K rows) - Price Addon

# COMMAND ----------

# Reference price = rolling 8-week EWA of selling price per product×store
# Simplified: latest price per product as reference

ref_price_base = fact_price.filter(F.col("is_current") == True).select(
    "product_id", "selling_price", "current_mrp", "effective_date"
)

# Cross with stores for product-store combinations
stores_for_ref = dim_store.select("store_id", "store_type")

ref_price_cross = ref_price_base.crossJoin(stores_for_ref.limit(100))  # Limit for performance

fact_reference_price = ref_price_cross.withColumn(
    "ref_price_id",
    F.concat(F.col("product_id"), F.lit("-"), F.col("store_id"))
).withColumn(
    "reference_date", F.current_date()
).withColumn(
    "window_weeks", F.lit(8)
).withColumn(
    "reference_price",
    F.round(F.col("selling_price") * (0.95 + F.rand() * 0.10), 2)  # Slight variation
).withColumn(
    "min_price_in_window",
    F.round(F.col("selling_price") * 0.85, 2)
).withColumn(
    "max_price_in_window",
    F.round(F.col("selling_price") * 1.05, 2)
).withColumn(
    "avg_price_in_window",
    F.col("selling_price")
).withColumn(
    "price_volatility",
    F.round(F.rand() * 10 + 2, 2)  # 2-12% volatility
).withColumn(
    "competitor_ref_price",
    F.round(F.col("selling_price") * (0.95 + F.rand() * 0.10), 2)
).withColumn(
    "price_gap_vs_competitor",
    F.round(F.col("reference_price") - F.col("competitor_ref_price"), 2)
).withColumn(
    "is_below_market", F.col("price_gap_vs_competitor") < 0
).withColumn(
    "created_at", F.current_timestamp()
)

fact_reference_price_final = fact_reference_price.select(
    "ref_price_id",
    "product_id",
    "store_id",
    "reference_date",
    "window_weeks",
    "reference_price",
    "min_price_in_window",
    "max_price_in_window",
    "avg_price_in_window",
    "price_volatility",
    "competitor_ref_price",
    "price_gap_vs_competitor",
    "is_below_market",
    "created_at"
).dropDuplicates(["ref_price_id"])

fact_reference_price_final.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.fact_reference_price")
ref_price_count = spark.table(f"{SCHEMA_BRONZE}.fact_reference_price").count()
print(f"✅ fact_reference_price: {ref_price_count:,} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Add Table Comments

# COMMAND ----------

table_comments = {
    "fact_returns": "Customer returns with reasons and refund details",
    "fact_stockout_events": "Stockout incidents with root cause and lost sales estimates",
    "fact_cannibalization": "Product substitution and cross-elasticity pairs",
    "fact_demand_plan": "Weekly S&OP demand plan with forecast vs actual",
    "fact_loyalty": "Loyalty program transactions and point tracking",
    "fact_basket": "Basket-level aggregation with type classification",
    "fact_shrinkage": "Theft, damage, and expiry write-offs",
    "fact_markdown": "Near-expiry clearance markdowns",
    "fact_assortment": "Store-SKU listing decisions",
    "fact_planogram": "Shelf placement and facings",
    "fact_footfall": "Hourly store traffic with conversion rates",
    "fact_delivery": "Last-mile delivery SLA and performance",
    "fact_reference_price": "Rolling reference prices for price optimization",
}

for table, comment in table_comments.items():
    try:
        spark.sql(f"COMMENT ON TABLE {SCHEMA_BRONZE}.{table} IS '{comment}'")
        print(f"✅ Added comment to {table}")
    except Exception as e:
        print(f"⚠️ Could not add comment to {table}: {str(e)}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Summary & Validation

# COMMAND ----------

derived_fact_tables = [
    "fact_returns", "fact_stockout_events", "fact_cannibalization", "fact_demand_plan",
    "fact_loyalty", "fact_basket", "fact_shrinkage", "fact_markdown",
    "fact_assortment", "fact_planogram", "fact_footfall", "fact_delivery",
    "fact_reference_price"
]

print("\n" + "="*60)
print("DERIVED FACT TABLES SUMMARY")
print("="*60)

total_rows = 0
for table in derived_fact_tables:
    try:
        count = spark.table(f"{SCHEMA_BRONZE}.{table}").count()
        total_rows += count
        print(f"✅ {table}: {count:,} rows")
    except Exception as e:
        print(f"❌ {table}: ERROR - {str(e)}")

print("="*60)
print(f"Total: {total_rows:,} rows across {len(derived_fact_tables)} tables")
print("="*60)

print("\n🎉 Notebook 03 completed successfully!")
