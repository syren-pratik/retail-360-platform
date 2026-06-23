# Databricks notebook source
# MAGIC %md
# MAGIC # 02 - Generate Core Fact Tables (City-by-City Processing)
# MAGIC
# MAGIC This notebook generates the 6 core fact tables using **city-by-city batching** to fit within memory limits:
# MAGIC
# MAGIC 1. fact_pos_sales (~376M rows)
# MAGIC 2. fact_online_sales (~40M rows)
# MAGIC 3. fact_inventory (~578M rows)
# MAGIC 4. fact_price (~200K rows)
# MAGIC 5. fact_promotions (~600 rows)
# MAGIC 6. fact_purchase_orders (~5M rows)
# MAGIC
# MAGIC **Strategy:** Process one city at a time (10 cities, 15-40 stores each) to stay within 10-core cluster memory.
# MAGIC Each city batch processes 30-80M rows, which fits comfortably in ~20GB executor memory.
# MAGIC
# MAGIC **Runtime:** ~3-4 hours on 10-core cluster (full production scale)
# MAGIC
# MAGIC **Dependencies:** Run Notebook 01 (dimensions) first

# COMMAND ----------

# MAGIC %md
# MAGIC ## Configuration & Setup

# COMMAND ----------

from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import *
from pyspark.sql.window import Window
import random
from datetime import datetime, timedelta

# Configuration - Using hive_metastore
CATALOG = "hive_metastore"
SCHEMA_BRONZE = "retail_bronze"

# FULL PRODUCTION SCALE - 275 stores, 2000 SKUs, 6 years
NUM_PRODUCTS = 2000
NUM_STORES = 275
NUM_DAYS = 2192
DATE_START = "2020-01-01"
DATE_END = "2025-12-31"

# Cities to process (one at a time)
CITIES = [
    "Mumbai", "Delhi NCR", "Bangalore", "Chennai", "Hyderabad",
    "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow"
]

print(f"Configuration: {NUM_PRODUCTS} products x {NUM_STORES} stores x {NUM_DAYS} days")
print(f"Processing {len(CITIES)} cities one at a time to fit in memory")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Load Dimension Tables

# COMMAND ----------

# Load all dimension tables
dim_product = spark.table(f"{SCHEMA_BRONZE}.dim_product")
dim_store = spark.table(f"{SCHEMA_BRONZE}.dim_store")
dim_date = spark.table(f"{SCHEMA_BRONZE}.dim_date")
dim_channel = spark.table(f"{SCHEMA_BRONZE}.dim_channel")
dim_customer = spark.table(f"{SCHEMA_BRONZE}.dim_customer")
dim_category = spark.table(f"{SCHEMA_BRONZE}.dim_category")
dim_brand = spark.table(f"{SCHEMA_BRONZE}.dim_brand")
dim_supplier = spark.table(f"{SCHEMA_BRONZE}.dim_supplier")

print(f"Loaded dimensions:")
print(f"   dim_product: {dim_product.count():,} rows")
print(f"   dim_store: {dim_store.count():,} rows")
print(f"   dim_date: {dim_date.count():,} rows")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Reference Data: Demand Model Parameters

# COMMAND ----------

# MRP inflation by year
MRP_INFLATION = {2020: 1.00, 2021: 1.04, 2022: 1.10, 2023: 1.16, 2024: 1.22, 2025: 1.28}

print("Demand model parameters loaded")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate fact_promotions (~600 rows)

# COMMAND ----------

def generate_promotions():
    """Generate promotion records - ~100 per year"""
    promotions = []
    promo_id = 1

    promo_types = ["BOGO", "Percentage Off", "Flat Off", "Combo Deal", "Cashback"]
    categories = dim_category.select("category_id", "category_l2_name").distinct().collect()

    for year in range(2020, 2026):
        for _ in range(100):
            start_month = random.randint(1, 12)
            start_day = random.randint(1, 28)
            start_date = datetime(year, start_month, start_day)
            duration = random.randint(3, 14)
            end_date = start_date + timedelta(days=duration)
            cat = random.choice(categories)
            promo_type = random.choice(promo_types)

            if promo_type == "BOGO":
                discount_pct = 50.0
            elif promo_type == "Percentage Off":
                discount_pct = float(random.choice([10, 15, 20, 25, 30]))
            else:
                discount_pct = float(random.randint(5, 20))

            store_coverage = random.choice(["All Stores", "Hypermarket Only", "Select Stores", "Online Only"])

            promotions.append({
                "promo_id": f"PRM-{promo_id:06d}",
                "promo_code": f"PROMO{year}{promo_id:04d}",
                "promo_name": f"{cat['category_l2_name']} {promo_type} {year}",
                "promo_description": f"{promo_type} offer on {cat['category_l2_name']}",
                "promo_type": promo_type,
                "discount_type": "Percentage" if promo_type in ["Percentage Off", "BOGO"] else "Flat",
                "discount_value": discount_pct,
                "discount_pct": discount_pct,
                "min_purchase_qty": random.choice([1, 2, 3]),
                "min_purchase_value": float(random.choice([0, 100, 200, 500])),
                "max_discount_value": float(random.choice([0, 100, 200, 500])),
                "start_date": start_date.date(),
                "end_date": end_date.date(),
                "start_time": "00:00:00",
                "end_time": "23:59:59",
                "category_id": cat["category_id"],
                "brand_id": None,
                "product_id": None,
                "store_coverage": store_coverage,
                "store_ids": None,
                "channel_ids": "CHN-OFFLINE,CHN-ONLINE" if store_coverage != "Online Only" else "CHN-ONLINE",
                "is_stackable": random.choice([True, False]),
                "priority_rank": random.randint(1, 5),
                "budget_allocated_inr": float(random.randint(100000, 5000000)),
                "is_active": True,
            })
            promo_id += 1

    return promotions

promo_data = generate_promotions()
promo_schema = StructType([
    StructField("promo_id", StringType(), False),
    StructField("promo_code", StringType(), False),
    StructField("promo_name", StringType(), True),
    StructField("promo_description", StringType(), True),
    StructField("promo_type", StringType(), True),
    StructField("discount_type", StringType(), True),
    StructField("discount_value", DoubleType(), True),
    StructField("discount_pct", DoubleType(), True),
    StructField("min_purchase_qty", IntegerType(), True),
    StructField("min_purchase_value", DoubleType(), True),
    StructField("max_discount_value", DoubleType(), True),
    StructField("start_date", DateType(), True),
    StructField("end_date", DateType(), True),
    StructField("start_time", StringType(), True),
    StructField("end_time", StringType(), True),
    StructField("category_id", StringType(), True),
    StructField("brand_id", StringType(), True),
    StructField("product_id", StringType(), True),
    StructField("store_coverage", StringType(), True),
    StructField("store_ids", StringType(), True),
    StructField("channel_ids", StringType(), True),
    StructField("is_stackable", BooleanType(), True),
    StructField("priority_rank", IntegerType(), True),
    StructField("budget_allocated_inr", DoubleType(), True),
    StructField("is_active", BooleanType(), True),
])

spark_promo = spark.createDataFrame(promo_data, schema=promo_schema)
spark_promo.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.fact_promotions")
print(f"fact_promotions: {spark_promo.count():,} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate fact_price (~200K rows)

# COMMAND ----------

# Get distinct products
products_for_price = dim_product.select(
    "product_id", "mrp", "gst_rate", "category_id"
).distinct()

# Create yearly price records
years_df = spark.createDataFrame(
    [(y, MRP_INFLATION[y]) for y in range(2020, 2026)],
    ["year", "inflation_mult"]
)

# Cross join products with years
price_base = products_for_price.crossJoin(years_df)

# Add price variations - 2-3 price changes per year
price_events = price_base.withColumn(
    "price_event_num",
    F.explode(F.array(F.lit(1), F.lit(2), F.when(F.rand() > 0.5, F.lit(3))))
).filter(F.col("price_event_num").isNotNull())

# Generate price records
fact_price = price_events.withColumn(
    "price_id", F.concat(F.col("product_id"), F.lit("-"), F.col("year"), F.lit("-"), F.col("price_event_num"))
).withColumn(
    "effective_date",
    F.when(F.col("price_event_num") == 1, F.concat(F.col("year"), F.lit("-01-01")).cast("date"))
     .when(F.col("price_event_num") == 2, F.concat(F.col("year"), F.lit("-06-01")).cast("date"))
     .otherwise(F.concat(F.col("year"), F.lit("-10-01")).cast("date"))
).withColumn(
    "end_date",
    F.lead("effective_date").over(Window.partitionBy("product_id").orderBy("effective_date"))
).withColumn(
    "base_mrp", F.col("mrp")
).withColumn(
    "current_mrp", F.round(F.col("mrp") * F.col("inflation_mult") * (1 + (F.rand() - 0.5) * 0.02), 2)
).withColumn(
    "selling_price", F.round(F.col("current_mrp") * (0.90 + F.rand() * 0.09), 2)
).withColumn(
    "cost_price", F.round(F.col("selling_price") * (0.65 + F.rand() * 0.15), 2)
).withColumn(
    "margin_pct", F.round((F.col("selling_price") - F.col("cost_price")) / F.col("selling_price") * 100, 2)
).withColumn(
    "gst_amount", F.round(F.col("selling_price") * F.col("gst_rate") / 100, 2)
).withColumn(
    "price_change_reason",
    F.when(F.col("price_event_num") == 1, "Annual Revision")
     .when(F.col("price_event_num") == 2, "Cost Increase")
     .otherwise("Promotional Reset")
).withColumn(
    "is_current", F.col("end_date").isNull()
).withColumn(
    "created_at", F.current_timestamp()
).withColumn(
    "updated_at", F.current_timestamp()
)

fact_price_final = fact_price.select(
    "price_id", "product_id", "effective_date", "end_date",
    "base_mrp", "current_mrp", "selling_price", "cost_price",
    "margin_pct", "gst_rate", "gst_amount", "price_change_reason",
    "is_current", "created_at", "updated_at"
)

fact_price_final.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.fact_price")
price_count = spark.table(f"{SCHEMA_BRONZE}.fact_price").count()
print(f"fact_price: {price_count:,} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Prepare Base Data for City Loop

# COMMAND ----------

# Get active products with their attributes
products = dim_product.select(
    F.col("product_id"),
    F.col("department"),
    F.col("category_l1"),
    F.col("category_l2"),
    F.col("abc_class"),
    F.col("mrp"),
    F.col("gst_rate"),
    F.col("is_perishable"),
    F.col("is_seasonal"),
    F.col("seasonality_type"),
    F.col("launch_date"),
    F.col("discontinuation_date"),
    F.col("is_active")
).filter(F.col("is_active") == True)

# Get dates with all calendar attributes
dates = dim_date.select(
    F.col("date_id"),
    F.col("full_date"),
    F.col("year"),
    F.col("month_num"),
    F.col("day_of_week"),
    F.col("is_weekend"),
    F.col("indian_season"),
    F.col("is_festival_period"),
    F.col("festival_intensity"),
    F.col("is_salary_week"),
    F.col("is_ipl_season"),
    F.col("is_monsoon_active"),
    F.col("is_lockdown"),
    F.col("is_covid_period"),
    F.col("covid_demand_multiplier")
)

# Get price data for joining
prices = spark.table(f"{SCHEMA_BRONZE}.fact_price").filter(
    F.col("is_current") == True
).select(
    "product_id", "current_mrp", "selling_price", "cost_price",
    F.col("gst_rate").alias("price_gst_rate")
).dropDuplicates(["product_id"])

# Broadcast smaller tables for efficiency
products_bc = F.broadcast(products)
dates_bc = F.broadcast(dates)
prices_bc = F.broadcast(prices)

print(f"Base data prepared:")
print(f"   Products: {products.count():,}")
print(f"   Dates: {dates.count():,}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## City-by-City Processing Function

# COMMAND ----------

def apply_demand_multipliers(universe_filtered):
    """Apply all 13 demand multipliers to the universe"""

    # Base demand by ABC class
    df = universe_filtered.withColumn(
        "base_demand",
        F.when(F.col("abc_class") == "A", 15.0)
         .when(F.col("abc_class") == "B", 5.0)
         .otherwise(1.5)
    )

    # Store format multiplier
    df = df.withColumn(
        "store_mult",
        F.when(F.col("store_type") == "Hypermarket", 1.5)
         .when(F.col("store_type") == "Supermarket", 1.0)
         .when(F.col("store_type") == "Express", 0.7)
         .when(F.col("store_type") == "Dark Store", 0.5)
         .otherwise(0.3)
    )

    # Weekend multiplier
    df = df.withColumn(
        "weekend_mult",
        F.when(F.col("is_weekend"), 1.30).otherwise(1.0)
    )

    # Festival multiplier
    df = df.withColumn(
        "festival_mult",
        F.when(F.col("festival_intensity") == "Peak", 2.8)
         .when(F.col("festival_intensity") == "High", 1.7)
         .when(F.col("festival_intensity") == "Medium", 1.3)
         .otherwise(1.0)
    )

    # Salary week multiplier
    df = df.withColumn(
        "salary_mult",
        F.when(F.col("is_salary_week"), 1.12).otherwise(1.0)
    )

    # IPL multiplier
    df = df.withColumn(
        "ipl_mult",
        F.when(
            (F.col("is_ipl_season")) & (F.col("department").isin("Snacks & Biscuits", "Beverages")),
            1.20
        ).otherwise(1.0)
    )

    # Monsoon multiplier
    df = df.withColumn(
        "monsoon_mult",
        F.when(
            (F.col("is_monsoon_active")) & (F.col("store_type").isin("Hypermarket", "Supermarket", "Express")),
            0.85
        ).when(
            (F.col("is_monsoon_active")) & (F.col("store_type") == "Dark Store"),
            1.15
        ).otherwise(1.0)
    )

    # Seasonal multiplier
    df = df.withColumn(
        "seasonal_mult",
        F.when((F.col("department") == "Beverages") & (F.col("indian_season") == "Summer"), 1.8)
         .when((F.col("department") == "Beverages") & (F.col("indian_season") == "Winter"), 0.6)
         .when((F.col("department") == "Dairy & Frozen") & (F.col("indian_season") == "Summer"), 1.4)
         .when((F.col("department") == "Dairy & Frozen") & (F.col("indian_season") == "Winter"), 0.85)
         .when((F.col("department") == "Snacks & Biscuits") & (F.col("indian_season") == "Winter"), 1.2)
         .when((F.col("department") == "Personal Care") & (F.col("indian_season") == "Monsoon"), 1.15)
         .otherwise(1.0)
    )

    # COVID multiplier
    df = df.withColumn("covid_mult", F.col("covid_demand_multiplier"))

    # Q-commerce growth
    df = df.withColumn(
        "qcom_mult",
        F.when((F.col("store_type") == "Dark Store") & (F.col("year") == 2022), 0.3)
         .when((F.col("store_type") == "Dark Store") & (F.col("year") == 2023), 0.6)
         .when((F.col("store_type") == "Dark Store") & (F.col("year") == 2024), 0.9)
         .when((F.col("store_type") == "Dark Store") & (F.col("year") == 2025), 1.2)
         .otherwise(1.0)
    )

    # New store ramp-up
    df = df.withColumn(
        "days_since_opening",
        F.datediff(F.col("full_date"), F.col("opening_date"))
    ).withColumn(
        "ramp_mult",
        F.when(F.col("days_since_opening") < 30, 0.4)
         .when(F.col("days_since_opening") < 60, 0.6)
         .when(F.col("days_since_opening") < 90, 0.8)
         .otherwise(1.0)
    )

    # Product factor
    df = df.withColumn(
        "product_factor",
        0.5 + (F.abs(F.hash(F.col("product_id"))) % 100) / 100.0
    )

    # Kirana adjustments
    df = df.withColumn(
        "kirana_adj",
        F.when(
            (F.col("store_type") == "Kirana Partner") &
            (F.col("category_l1").isin("Salt", "Edible Oil", "Atta & Flour", "Dal & Pulses", "Rice")),
            2.0
        ).when(F.col("store_type") == "Kirana Partner", 0.5)
        .otherwise(1.0)
    )

    # Calculate final expected demand
    df = df.withColumn(
        "expected_demand",
        F.col("base_demand") *
        F.col("product_factor") *
        F.col("store_mult") *
        F.col("weekend_mult") *
        F.col("festival_mult") *
        F.col("salary_mult") *
        F.col("ipl_mult") *
        F.col("monsoon_mult") *
        F.col("seasonal_mult") *
        F.col("covid_mult") *
        F.col("qcom_mult") *
        F.col("ramp_mult") *
        F.col("kirana_adj")
    )

    # Apply random sampling
    df = df.withColumn(
        "random_factor",
        F.abs(F.randn()) * 0.3 + 0.85
    ).withColumn(
        "quantity_sold",
        F.greatest(
            F.lit(0),
            F.round(F.col("expected_demand") * F.col("random_factor")).cast("int")
        )
    )

    return df

# COMMAND ----------

# MAGIC %md
# MAGIC ## Process Each City - Generate fact_pos_sales, fact_online_sales, fact_inventory

# COMMAND ----------

print("="*60)
print("STARTING CITY-BY-CITY PROCESSING")
print("="*60)

total_pos_rows = 0
total_online_rows = 0
total_inventory_rows = 0

for i, city in enumerate(CITIES):
    print(f"\n[{i+1}/{len(CITIES)}] Processing {city}...")

    # Get stores for this city
    city_stores = dim_store.filter(F.col("city") == city).select(
        F.col("store_id"),
        F.col("store_type"),
        F.col("channel_id"),
        F.col("city"),
        F.col("opening_date"),
        F.col("has_cold_storage"),
        F.col("area_sqft")
    )

    store_count = city_stores.count()
    print(f"   Stores in {city}: {store_count}")

    if store_count == 0:
        print(f"   Skipping {city} - no stores found")
        continue

    # Cross join: products x city_stores x dates
    universe = products_bc.crossJoin(city_stores).crossJoin(dates_bc)

    # Filter to valid combinations
    universe_filtered = universe.filter(
        (F.col("full_date") >= F.col("opening_date")) &
        (F.col("full_date") >= F.col("launch_date")) &
        ((F.col("discontinuation_date").isNull()) | (F.col("full_date") <= F.col("discontinuation_date"))) &
        ((F.col("is_perishable") == False) | (F.col("has_cold_storage") == True))
    )

    # Apply all demand multipliers
    demand_df = apply_demand_multipliers(universe_filtered)

    # Filter to rows with sales > 0
    sales_rows = demand_df.filter(F.col("quantity_sold") > 0)

    # Write mode: overwrite for first city, append for rest
    write_mode = "overwrite" if i == 0 else "append"

    # ========== fact_pos_sales ==========
    pos_sales_base = sales_rows.filter(
        F.col("channel_id") == "CHN-OFFLINE"
    ).join(prices_bc, "product_id", "left")

    pos_sales = pos_sales_base.withColumn(
        "txn_id",
        F.concat(F.col("store_id"), F.lit("-"), F.date_format(F.col("full_date"), "yyyyMMdd"), F.lit("-"), F.monotonically_increasing_id())
    ).withColumn("line_id", F.lit(1)
    ).withColumn("time_id", F.concat(F.lit("T"), F.lpad((F.abs(F.hash(F.col("txn_id"))) % 14 + 8).cast("string"), 2, "0"))
    ).withColumn("customer_id", F.when(F.rand() > 0.6, F.concat(F.lit("CUS-"), F.lpad((F.abs(F.hash(F.col("txn_id"))) % 50000 + 1).cast("string"), 8, "0"))).otherwise(None)
    ).withColumn("unit_mrp", F.coalesce(F.col("current_mrp"), F.col("mrp"))
    ).withColumn("unit_selling_price", F.round(F.coalesce(F.col("selling_price"), F.col("mrp") * 0.95), 2)
    ).withColumn("unit_cost_price", F.round(F.coalesce(F.col("cost_price"), F.col("mrp") * 0.70), 2)
    ).withColumn("gross_amount", F.round(F.col("unit_mrp") * F.col("quantity_sold"), 2)
    ).withColumn("discount_amount", F.round((F.col("unit_mrp") - F.col("unit_selling_price")) * F.col("quantity_sold"), 2)
    ).withColumn("net_amount", F.round(F.col("unit_selling_price") * F.col("quantity_sold"), 2)
    ).withColumn("tax_amount", F.round(F.col("net_amount") * F.coalesce(F.col("price_gst_rate"), F.col("gst_rate"), F.lit(5.0)) / (100 + F.coalesce(F.col("price_gst_rate"), F.col("gst_rate"), F.lit(5.0))), 2)
    ).withColumn("promo_id", F.when(F.rand() > 0.9, F.concat(F.lit("PRM-"), F.lpad((F.abs(F.hash(F.col("txn_id"))) % 600 + 1).cast("string"), 6, "0"))).otherwise(None)
    ).withColumn("is_on_promo", F.col("promo_id").isNotNull()
    ).withColumn("payment_method",
        F.when(F.col("year") <= 2021, F.when(F.rand() < 0.45, "Cash").when(F.rand() < 0.70, "UPI").when(F.rand() < 0.90, "Card").otherwise("Wallet"))
         .when(F.col("year") <= 2023, F.when(F.rand() < 0.30, "Cash").when(F.rand() < 0.70, "UPI").when(F.rand() < 0.90, "Card").otherwise("Wallet"))
         .otherwise(F.when(F.rand() < 0.20, "Cash").when(F.rand() < 0.70, "UPI").when(F.rand() < 0.90, "Card").otherwise("Wallet"))
    ).withColumn("is_return", F.lit(False)
    ).withColumn("return_reason", F.lit(None).cast("string")
    ).withColumn("created_at", F.current_timestamp())

    fact_pos_sales = pos_sales.select(
        "txn_id", "line_id", "date_id", "time_id", "store_id", "product_id", "customer_id",
        "quantity_sold", "unit_mrp", "unit_selling_price", "unit_cost_price",
        "gross_amount", "discount_amount", "net_amount", "tax_amount",
        "promo_id", "is_on_promo", "payment_method", "is_return", "return_reason",
        F.col("year"), F.col("month_num"), "created_at"
    )

    fact_pos_sales.write.mode(write_mode).partitionBy("year", "month_num").saveAsTable(f"{SCHEMA_BRONZE}.fact_pos_sales")
    city_pos_count = fact_pos_sales.count()
    total_pos_rows += city_pos_count

    # ========== fact_online_sales ==========
    online_sales_base = sales_rows.filter(
        F.col("channel_id").isin("CHN-QCOMMERCE", "CHN-ONLINE")
    ).join(prices_bc, "product_id", "left")

    online_sales = online_sales_base.withColumn(
        "order_id", F.concat(F.lit("ORD-"), F.date_format(F.col("full_date"), "yyyyMMdd"), F.lit("-"), F.monotonically_increasing_id())
    ).withColumn("line_id", F.lit(1)
    ).withColumn("customer_id", F.concat(F.lit("CUS-"), F.lpad((F.abs(F.hash(F.col("order_id"))) % 50000 + 1).cast("string"), 8, "0"))
    ).withColumn("channel_id", F.when(F.col("store_type") == "Dark Store", "CHN-QCOMMERCE").otherwise("CHN-ONLINE")
    ).withColumn("fulfillment_store_id", F.col("store_id")
    ).withColumn("unit_mrp", F.coalesce(F.col("current_mrp"), F.col("mrp"))
    ).withColumn("unit_selling_price", F.round(F.coalesce(F.col("selling_price"), F.col("mrp") * 0.95), 2)
    ).withColumn("unit_cost_price", F.round(F.coalesce(F.col("cost_price"), F.col("mrp") * 0.70), 2)
    ).withColumn("gross_amount", F.round(F.col("unit_mrp") * F.col("quantity_sold"), 2)
    ).withColumn("discount_amount", F.round((F.col("unit_mrp") - F.col("unit_selling_price")) * F.col("quantity_sold"), 2)
    ).withColumn("delivery_charges", F.when(F.col("channel_id") == "CHN-QCOMMERCE", F.lit(0.0)).when(F.rand() > 0.7, F.lit(0.0)).otherwise(F.round(F.rand() * 40 + 20, 2))
    ).withColumn("net_amount", F.round(F.col("unit_selling_price") * F.col("quantity_sold") + F.col("delivery_charges"), 2)
    ).withColumn("tax_amount", F.round(F.col("net_amount") * F.coalesce(F.col("price_gst_rate"), F.col("gst_rate"), F.lit(5.0)) / (100 + F.coalesce(F.col("price_gst_rate"), F.col("gst_rate"), F.lit(5.0))), 2)
    ).withColumn("promo_code", F.when(F.rand() > 0.8, F.concat(F.lit("PROMO"), F.col("year"), F.lpad((F.rand() * 100).cast("int").cast("string"), 4, "0"))).otherwise(None)
    ).withColumn("payment_method", F.when(F.rand() < 0.60, "UPI").when(F.rand() < 0.85, "Card").otherwise("Wallet")
    ).withColumn("order_status", F.lit("Delivered")
    ).withColumn("order_placed_at", F.concat(F.col("full_date").cast("string"), F.lit(" "), F.lpad((F.rand() * 24).cast("int").cast("string"), 2, "0"), F.lit(":"), F.lpad((F.rand() * 60).cast("int").cast("string"), 2, "0"), F.lit(":00"))
    ).withColumn("promised_delivery_time", F.when(F.col("channel_id") == "CHN-QCOMMERCE", "30 mins").otherwise("2-3 days")
    ).withColumn("actual_delivery_time", F.when(F.col("channel_id") == "CHN-QCOMMERCE", F.concat((F.rand() * 30 + 10).cast("int").cast("string"), F.lit(" mins"))).otherwise(F.concat((F.rand() * 2 + 1).cast("int").cast("string"), F.lit(" days")))
    ).withColumn("delivery_partner", F.when(F.col("channel_id") == "CHN-QCOMMERCE", F.when(F.rand() < 0.5, "In-house").otherwise("Shadowfax")).otherwise(F.when(F.rand() < 0.4, "Delhivery").when(F.rand() < 0.7, "BlueDart").otherwise("Ecom Express"))
    ).withColumn("delivery_pincode", F.concat(F.lit("4"), F.lpad((F.rand() * 100000).cast("int").cast("string"), 5, "0"))
    ).withColumn("is_cancelled", F.lit(False)
    ).withColumn("cancellation_reason", F.lit(None).cast("string")
    ).withColumn("created_at", F.current_timestamp())

    fact_online_sales = online_sales.select(
        "order_id", "line_id", "date_id", "customer_id", "channel_id", "fulfillment_store_id",
        "product_id", "quantity_sold", "unit_mrp", "unit_selling_price", "unit_cost_price",
        "gross_amount", "discount_amount", "delivery_charges", "net_amount", "tax_amount",
        "promo_code", "payment_method", "order_status", "order_placed_at",
        "promised_delivery_time", "actual_delivery_time", "delivery_partner", "delivery_pincode",
        "is_cancelled", "cancellation_reason", F.col("year"), F.col("month_num"), "created_at"
    )

    fact_online_sales.write.mode(write_mode).partitionBy("year", "month_num").saveAsTable(f"{SCHEMA_BRONZE}.fact_online_sales")
    city_online_count = fact_online_sales.count()
    total_online_rows += city_online_count

    # ========== fact_inventory ==========
    inventory_base = demand_df.join(prices_bc.select("product_id", "cost_price"), "product_id", "left")

    fact_inventory = inventory_base.withColumn(
        "inventory_id", F.concat(F.col("product_id"), F.lit("-"), F.col("store_id"), F.lit("-"), F.col("date_id"))
    ).withColumn("sold_qty", F.greatest(F.lit(0), F.round(F.col("expected_demand") * (F.abs(F.randn()) * 0.3 + 0.85)).cast("int"))
    ).withColumn("opening_stock_qty",
        F.when(F.col("abc_class") == "A", F.round(50 + F.rand() * 100).cast("int"))
         .when(F.col("abc_class") == "B", F.round(30 + F.rand() * 50).cast("int"))
         .otherwise(F.round(15 + F.rand() * 30).cast("int"))
    ).withColumn("received_qty",
        F.when(F.rand() > 0.7,
               F.when(F.col("abc_class") == "A", F.round(30 + F.rand() * 50).cast("int"))
                .when(F.col("abc_class") == "B", F.round(20 + F.rand() * 30).cast("int"))
                .otherwise(F.round(10 + F.rand() * 20).cast("int")))
         .otherwise(0)
    ).withColumn("closing_stock_qty", F.greatest(F.lit(0), F.col("opening_stock_qty") + F.col("received_qty") - F.col("sold_qty"))
    ).withColumn("damaged_qty", F.when(F.rand() > 0.98, F.round(F.rand() * 3).cast("int")).otherwise(0)
    ).withColumn("expired_qty", F.when((F.col("is_perishable") == True) & (F.rand() > 0.95), F.round(F.rand() * 5).cast("int")).otherwise(0)
    ).withColumn("stock_value_at_cost", F.round(F.col("closing_stock_qty") * F.coalesce(F.col("cost_price"), F.col("mrp") * 0.7), 2)
    ).withColumn("stock_value_at_mrp", F.round(F.col("closing_stock_qty") * F.col("mrp"), 2)
    ).withColumn("days_of_stock", F.when(F.col("sold_qty") > 0, F.round(F.col("closing_stock_qty") / F.col("sold_qty"), 1)).otherwise(F.when(F.col("closing_stock_qty") > 0, F.lit(99.0)).otherwise(F.lit(0.0)))
    ).withColumn("safety_stock_level", F.when(F.col("abc_class") == "A", 15).when(F.col("abc_class") == "B", 10).otherwise(5)
    ).withColumn("reorder_point", F.col("safety_stock_level") * 2
    ).withColumn("is_below_safety_stock", F.col("closing_stock_qty") < F.col("safety_stock_level")
    ).withColumn("is_stockout", F.col("closing_stock_qty") == 0
    ).withColumn("created_at", F.current_timestamp()
    ).withColumn("updated_at", F.current_timestamp())

    fact_inventory_final = fact_inventory.select(
        "inventory_id", "date_id", "product_id", "store_id",
        "opening_stock_qty", "received_qty", "sold_qty", "damaged_qty", "expired_qty", "closing_stock_qty",
        "stock_value_at_cost", "stock_value_at_mrp", "days_of_stock",
        "safety_stock_level", "reorder_point", "is_below_safety_stock", "is_stockout",
        F.col("year"), F.col("month_num"), "created_at", "updated_at"
    )

    fact_inventory_final.write.mode(write_mode).partitionBy("year", "month_num").saveAsTable(f"{SCHEMA_BRONZE}.fact_inventory")
    city_inventory_count = fact_inventory_final.count()
    total_inventory_rows += city_inventory_count

    print(f"   {city} complete: POS={city_pos_count:,}, Online={city_online_count:,}, Inventory={city_inventory_count:,}")

print("\n" + "="*60)
print(f"ALL CITIES PROCESSED")
print(f"Total fact_pos_sales: {total_pos_rows:,}")
print(f"Total fact_online_sales: {total_online_rows:,}")
print(f"Total fact_inventory: {total_inventory_rows:,}")
print("="*60)

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate fact_purchase_orders

# COMMAND ----------

# Purchase orders based on inventory received_qty > 0
fact_inv = spark.table(f"{SCHEMA_BRONZE}.fact_inventory")

po_base = fact_inv.filter(F.col("received_qty") > 0).select(
    "date_id", "product_id", "store_id", "received_qty", F.col("year"), F.col("month_num")
)

po_with_supplier = po_base.join(
    dim_product.select("product_id", "supplier_id", "mrp"),
    "product_id"
)

fact_purchase_orders = po_with_supplier.withColumn(
    "po_id", F.concat(F.lit("PO-"), F.col("store_id"), F.lit("-"), F.col("date_id"), F.lit("-"), F.monotonically_increasing_id())
).withColumn("po_line_id", F.lit(1)
).withColumn("order_date", F.date_sub(F.col("date_id").cast("string").cast("date"), 3)
).withColumn("expected_delivery_date", F.col("date_id").cast("string").cast("date")
).withColumn("actual_delivery_date", F.col("date_id").cast("string").cast("date")
).withColumn("order_qty", F.col("received_qty")
).withColumn("received_qty_final", F.col("received_qty")
).withColumn("rejected_qty", F.when(F.rand() > 0.98, F.round(F.col("received_qty") * F.rand() * 0.05).cast("int")).otherwise(0)
).withColumn("unit_cost", F.round(F.col("mrp") * (0.65 + F.rand() * 0.10), 2)
).withColumn("total_cost", F.round(F.col("unit_cost") * F.col("order_qty"), 2)
).withColumn("po_status", F.lit("Delivered")
).withColumn("grn_number", F.concat(F.lit("GRN-"), F.col("store_id"), F.lit("-"), F.col("date_id"))
).withColumn("grn_date", F.col("actual_delivery_date")
).withColumn("invoice_number", F.concat(F.lit("INV-"), F.col("supplier_id"), F.lit("-"), F.monotonically_increasing_id())
).withColumn("invoice_date", F.col("order_date")
).withColumn("payment_due_date", F.date_add(F.col("invoice_date"), 30)
).withColumn("payment_status", F.when(F.rand() > 0.05, "Paid").otherwise("Pending")
).withColumn("created_at", F.current_timestamp()
).withColumn("updated_at", F.current_timestamp())

fact_purchase_orders_final = fact_purchase_orders.select(
    "po_id", "po_line_id", "supplier_id", "store_id", "product_id",
    "order_date", "expected_delivery_date", "actual_delivery_date",
    "order_qty", "received_qty_final", "rejected_qty", "unit_cost", "total_cost",
    "po_status", "grn_number", "grn_date", "invoice_number", "invoice_date",
    "payment_due_date", "payment_status", F.col("year"), F.col("month_num"),
    "created_at", "updated_at"
)

fact_purchase_orders_final.write.mode("overwrite").partitionBy("year", "month_num").saveAsTable(f"{SCHEMA_BRONZE}.fact_purchase_orders")
po_count = spark.table(f"{SCHEMA_BRONZE}.fact_purchase_orders").count()
print(f"fact_purchase_orders: {po_count:,} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Summary & Validation

# COMMAND ----------

core_fact_tables = [
    "fact_pos_sales", "fact_online_sales", "fact_inventory",
    "fact_price", "fact_promotions", "fact_purchase_orders"
]

print("\n" + "="*60)
print("CORE FACT TABLES SUMMARY")
print("="*60)

total_rows = 0
for table in core_fact_tables:
    try:
        count = spark.table(f"{SCHEMA_BRONZE}.{table}").count()
        total_rows += count
        print(f"{table}: {count:,} rows")
    except Exception as e:
        print(f"{table}: ERROR - {str(e)}")

print("="*60)
print(f"Total: {total_rows:,} rows across {len(core_fact_tables)} tables")
print("="*60)

print("\nNotebook 02 completed successfully!")
