# Databricks notebook source
# MAGIC %md
# MAGIC # 04b: Generate CX360 Engagement Data + Expanded Gold Layer
# MAGIC
# MAGIC This notebook creates 5 new bronze engagement tables for Customer 360, promotes them through silver layer,
# MAGIC and builds `gold_customer_360_v2` — a 64-column expanded customer 360 joining ALL existing + new tables.
# MAGIC
# MAGIC **New Tables Created:**
# MAGIC 1. `fact_customer_engagement` (~2.5M rows) - Digital engagement by customer × month × channel
# MAGIC 2. `fact_campaign_response` (~1.5M rows) - Marketing campaign responses
# MAGIC 3. `fact_customer_feedback` (~250K rows) - NPS/CSAT feedback events
# MAGIC 4. `fact_support_tickets` (~150K rows) - Customer support tickets
# MAGIC 5. `dim_campaign` (~105 rows) - Campaign master/lookup table
# MAGIC
# MAGIC **Gold Layer:**
# MAGIC - `gold_customer_360_v2` - 64-column comprehensive customer view

# COMMAND ----------

# MAGIC %md
# MAGIC ## Configuration & Setup

# COMMAND ----------

import time
from datetime import datetime, timedelta, date
from dateutil.relativedelta import relativedelta
import random
import hashlib

from pyspark.sql import functions as F
from pyspark.sql.types import (
    StructType, StructField, StringType, IntegerType, LongType,
    DoubleType, BooleanType, DateType, TimestampType
)
from pyspark.sql.window import Window

# Performance optimization
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")
spark.conf.set("spark.sql.shuffle.partitions", "200")

# Schema configuration
CATALOG = "hive_metastore"
SCHEMA_BRONZE = "retail_bronze"
SCHEMA_SILVER = "retail_silver"
SCHEMA_GOLD = "retail_gold"

# Date ranges
ENGAGEMENT_START_DATE = date(2022, 7, 1)  # Aligned with online_sales start
ENGAGEMENT_END_DATE = date(2025, 12, 31)
CAMPAIGN_START_DATE = date(2022, 7, 1)
CAMPAIGN_END_DATE = date(2025, 12, 31)

# Print configuration
print("=" * 60)
print("CX360 ENGAGEMENT DATA GENERATION")
print("=" * 60)
print(f"Bronze Schema: {CATALOG}.{SCHEMA_BRONZE}")
print(f"Silver Schema: {CATALOG}.{SCHEMA_SILVER}")
print(f"Gold Schema: {CATALOG}.{SCHEMA_GOLD}")
print(f"Engagement Period: {ENGAGEMENT_START_DATE} to {ENGAGEMENT_END_DATE}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Load Customer Base & Compute Digital Propensity

# COMMAND ----------

# Load customer dimension
customers_df = spark.table(f"{CATALOG}.{SCHEMA_SILVER}.dim_customer")

print(f"Total customers: {customers_df.count():,}")

# Show tier distribution
print("\nLoyalty Tier Distribution:")
customers_df.groupBy("loyalty_tier").count().orderBy("count", ascending=False).show()

# COMMAND ----------

# Compute digital_propensity score for each customer
# This drives ALL engagement intensity since spend is flat across tiers

# Define metro cities for digital propensity calculation
metro_tier1 = ['Bangalore', 'Delhi NCR', 'Mumbai']
metro_tier2 = ['Hyderabad', 'Pune', 'Chennai']

# Calculate digital propensity using the formula provided
# Note: dim_customer doesn't have email column, so we use registration_channel as proxy for digital affinity
customers_with_propensity = customers_df.withColumn(
    "reg_channel_score",
    F.when(F.col("registration_channel") == "App", 1.0)
     .when(F.col("registration_channel") == "Website", 0.5)
     .otherwise(0.2)
).withColumn(
    "loyalty_score",
    F.when(F.col("loyalty_tier") == "Platinum", 1.0)
     .when(F.col("loyalty_tier") == "Gold", 0.8)
     .when(F.col("loyalty_tier") == "Silver", 0.5)
     .when(F.col("loyalty_tier") == "Bronze", 0.3)
     .otherwise(0.15)  # Non-Member
).withColumn(
    "age_score",
    F.when(F.col("age") < 30, 1.0)
     .when(F.col("age") < 40, 0.7)
     .when(F.col("age") < 50, 0.4)
     .otherwise(0.2)
).withColumn(
    "city_score",
    F.when(F.col("city").isin(metro_tier1), 1.0)
     .when(F.col("city").isin(metro_tier2), 0.6)
     .otherwise(0.3)
).withColumn(
    "noise",
    F.rand() * 0.5 + 0.5  # uniform(0.5, 1.0)
).withColumn(
    "digital_propensity",
    F.round(
        0.30 * F.col("reg_channel_score") +
        0.25 * F.col("loyalty_score") +
        0.20 * F.col("age_score") +
        0.15 * F.col("city_score") +
        0.10 * F.col("noise"),
        4
    )
).drop("reg_channel_score", "loyalty_score", "age_score", "city_score", "noise")

# Cache for reuse
customers_with_propensity.cache()

print("Digital propensity statistics:")
customers_with_propensity.select(
    F.min("digital_propensity").alias("min"),
    F.avg("digital_propensity").alias("avg"),
    F.max("digital_propensity").alias("max"),
    F.percentile_approx("digital_propensity", 0.5).alias("median")
).show()

# Check propensity by loyalty tier
print("Digital propensity by loyalty tier:")
customers_with_propensity.groupBy("loyalty_tier").agg(
    F.round(F.avg("digital_propensity"), 3).alias("avg_propensity")
).orderBy("avg_propensity", ascending=False).show()

# COMMAND ----------

# MAGIC %md
# MAGIC ## Table 1: fact_customer_engagement (~2.5M rows)
# MAGIC
# MAGIC **Grain:** One row per customer × month × channel (App / Web / Store)

# COMMAND ----------

start_time = time.time()
print("Generating fact_customer_engagement...")

# Generate month range
months = []
current = ENGAGEMENT_START_DATE
while current <= ENGAGEMENT_END_DATE:
    months.append(current)
    current = current + relativedelta(months=1)

months_df = spark.createDataFrame([(m,) for m in months], ["month_start"])
months_df = months_df.withColumn("year_month", F.date_format("month_start", "yyyy-MM"))
months_df = months_df.withColumn("date_id", F.date_format("month_start", "yyyyMMdd").cast("bigint"))
months_df = months_df.withColumn("year", F.year("month_start").cast("bigint"))
months_df = months_df.withColumn("month_num", F.month("month_start").cast("bigint"))

# Add seasonality multiplier
# Diwali: Oct/Nov = 1.3x, Other festivals (Holi-Mar, Ganesh-Sep, Onam-Aug) = 1.2x, Monsoon (Jul-Aug) = 0.8x
months_df = months_df.withColumn(
    "seasonality_multiplier",
    F.when(F.col("month_num").isin([10, 11]), 1.3)  # Diwali
     .when(F.col("month_num").isin([3, 9]), 1.2)    # Holi, Ganesh Chaturthi
     .when(F.col("month_num").isin([7, 8]), 0.85)   # Monsoon (slightly reduced)
     .otherwise(1.0)
)

print(f"Months to generate: {len(months)} (from {ENGAGEMENT_START_DATE} to {ENGAGEMENT_END_DATE})")

# COMMAND ----------

# Create channels dataframe
channels = ['App', 'Web', 'Store']
channels_df = spark.createDataFrame([(c,) for c in channels], ["channel"])

# Cross join customers × months × channels
base_engagement = customers_with_propensity.crossJoin(months_df).crossJoin(channels_df)

# Filter channels based on eligibility rules:
# - App: only for customers with registration_channel IN ('App', 'Website') OR is_loyalty_member = TRUE (~85%)
# - Web: only for customers with digital propensity > 0.3 OR registration via App/Website (~70%)
# - Store: ALL active customers

engagement_filtered = base_engagement.filter(
    # App channel eligibility
    (
        (F.col("channel") == "App") &
        (
            F.col("registration_channel").isin(["App", "Website"]) |
            (F.col("is_loyalty_member") == True)
        )
    ) |
    # Web channel eligibility (using digital propensity as proxy since no email column)
    (
        (F.col("channel") == "Web") &
        (
            (F.col("digital_propensity") > 0.3) |
            F.col("registration_channel").isin(["App", "Website"])
        )
    ) |
    # Store channel - all active customers
    (F.col("channel") == "Store")
)

print(f"Base engagement rows before metrics: {engagement_filtered.count():,}")

# COMMAND ----------

# Generate engagement metrics
engagement_with_metrics = engagement_filtered.withColumn(
    "base_sessions",
    F.when(F.col("is_active") == False, 0)  # Inactive customers get 0
     .when(
         F.col("channel") == "App",
         F.greatest(
             F.lit(0),
             F.round(
                 F.col("digital_propensity") * 25 *
                 F.col("seasonality_multiplier") *
                 (1 + 0.3 * F.randn())
             )
         )
     )
     .when(
         F.col("channel") == "Web",
         F.greatest(
             F.lit(0),
             F.round(
                 F.col("digital_propensity") * 25 * 0.7 *  # 70% of App
                 F.col("seasonality_multiplier") *
                 (1 + 0.3 * F.randn())
             )
         )
     )
     .otherwise(  # Store
         F.greatest(
             F.lit(1),
             F.round(4 * F.col("seasonality_multiplier") * (0.8 + 0.4 * F.rand()))  # avg 4 visits/month
         )
     )
).withColumn(
    "sessions", F.col("base_sessions").cast("int")
).withColumn(
    "page_views",
    F.when(F.col("channel") == "Store", F.lit(0))  # No page views in store
     .otherwise((F.col("sessions") * (3 + F.rand() * 9)).cast("int"))
).withColumn(
    "time_spent_mins",
    F.when(F.col("channel") == "Store", F.col("sessions") * (15 + F.rand() * 30))  # 15-45 mins in store
     .otherwise(F.round(F.col("sessions") * (2.5 + F.rand() * 5.5), 1))
).withColumn(
    "searches",
    F.when(F.col("channel") == "Store", F.lit(0))
     .otherwise(F.round(F.col("sessions") * (0.3 + F.rand() * 0.5)).cast("int"))
).withColumn(
    "products_viewed",
    F.round(F.col("sessions") * (1.5 + F.rand() * 2.5)).cast("int")
).withColumn(
    "add_to_cart",
    F.when(F.col("channel") == "Store", F.lit(0))
     .otherwise(F.round(F.col("products_viewed") * (0.15 + F.rand() * 0.2)).cast("int"))
).withColumn(
    "cart_abandonment",
    F.when(F.col("channel") == "Store", F.lit(0))
     .otherwise(
         F.greatest(
             F.lit(0),
             F.col("add_to_cart") - F.round(F.col("add_to_cart") * (0.4 + F.rand() * 0.3)).cast("int")
         )
     )
).withColumn(
    "wishlist_adds",
    F.when(F.col("channel") == "Store", F.lit(0))
     .otherwise(F.round(F.col("products_viewed") * (0.05 + F.rand() * 0.1)).cast("int"))
).withColumn(
    "app_crashes",
    F.when(F.col("channel") != "App", F.lit(0))
     .otherwise(
         F.greatest(
             F.lit(0),
             F.round(F.col("sessions") * 0.02 * F.randn() + 0.5).cast("int")
         )
     )
)

# COMMAND ----------

# Build final engagement table
fact_customer_engagement = engagement_with_metrics.withColumn(
    "engagement_id",
    F.concat(
        F.lit("ENG-"),
        F.col("customer_id"),
        F.lit("-"),
        F.regexp_replace(F.col("year_month"), "-", ""),
        F.lit("-"),
        F.col("channel")
    )
).select(
    "engagement_id",
    "customer_id",
    "year_month",
    "date_id",
    "channel",
    "sessions",
    "page_views",
    "time_spent_mins",
    "searches",
    "products_viewed",
    "add_to_cart",
    "cart_abandonment",
    "wishlist_adds",
    "app_crashes",
    "year",
    "month_num",
    F.current_timestamp().alias("created_at")
)

# Filter out rows with 0 sessions (except for a sample to show inactivity)
# Keep ~10% of zero-session rows to show pattern
fact_customer_engagement_filtered = fact_customer_engagement.filter(
    (F.col("sessions") > 0) | (F.rand() < 0.1)
)

# Write to bronze
fact_customer_engagement_filtered.write.format("delta") \
    .mode("overwrite") \
    .partitionBy("year", "month_num") \
    .saveAsTable(f"{CATALOG}.{SCHEMA_BRONZE}.fact_customer_engagement")

engagement_count = spark.table(f"{CATALOG}.{SCHEMA_BRONZE}.fact_customer_engagement").count()
elapsed = time.time() - start_time
print(f"fact_customer_engagement created: {engagement_count:,} rows in {elapsed:.1f}s")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Table 2: fact_campaign_response (~1.5M rows)
# MAGIC
# MAGIC **Grain:** One row per customer × campaign

# COMMAND ----------

start_time = time.time()
print("Generating campaigns and responses...")

# Campaign configuration
campaign_types = {
    'Email': {'weight': 0.35, 'avg_open_rate': 0.22, 'avg_click_rate': 0.035, 'delivery_rate': 0.88},
    'SMS': {'weight': 0.25, 'avg_open_rate': 0.90, 'avg_click_rate': 0.08, 'delivery_rate': 0.95},
    'Push_Notification': {'weight': 0.20, 'avg_open_rate': 0.45, 'avg_click_rate': 0.06, 'delivery_rate': 0.92},
    'WhatsApp': {'weight': 0.15, 'avg_open_rate': 0.75, 'avg_click_rate': 0.12, 'delivery_rate': 0.95},
    'In_App': {'weight': 0.05, 'avg_open_rate': 0.60, 'avg_click_rate': 0.10, 'delivery_rate': 0.92},
}

campaign_objectives = [
    'Diwali Sale', 'Weekend Offer', 'New Arrival', 'Loyalty Reward', 'Cart Recovery',
    'Reactivation', 'Birthday Offer', 'Category Push', 'Flash Sale', 'Festival Special'
]

target_segments = ['All', 'Loyalty_Only', 'Lapsed', 'High_Value', 'New_Customers']

# Generate ~30 campaigns per year × 3.5 years = ~105 campaigns
campaigns_data = []
campaign_seq = 1

current_date = CAMPAIGN_START_DATE
while current_date <= CAMPAIGN_END_DATE:
    # Generate 2-3 campaigns per month
    num_campaigns = random.randint(2, 3)
    for _ in range(num_campaigns):
        # Select campaign type based on weights
        ctype = random.choices(
            list(campaign_types.keys()),
            weights=[v['weight'] for v in campaign_types.values()]
        )[0]

        objective = random.choice(campaign_objectives)
        segment = random.choice(target_segments)

        # Override segment for certain objectives
        if objective == 'Loyalty Reward':
            segment = 'Loyalty_Only'
        elif objective == 'Reactivation':
            segment = 'Lapsed'
        elif objective == 'Cart Recovery':
            segment = 'All'  # Target recent cart abandoners

        campaign_date = current_date + timedelta(days=random.randint(0, 25))
        if campaign_date > CAMPAIGN_END_DATE:
            campaign_date = CAMPAIGN_END_DATE

        duration = random.randint(1, 14)
        end_date = campaign_date + timedelta(days=duration)

        # Target audience size: 20-60% of 50K customers
        target_size = random.randint(10000, 30000)
        budget = random.uniform(50000, 500000)

        campaign_id = f"CMP-{campaign_date.year}-{campaign_seq:04d}"
        month_name = campaign_date.strftime("%B")
        campaign_name = f"{objective} - {month_name} {campaign_date.year}"

        campaigns_data.append({
            'campaign_id': campaign_id,
            'campaign_name': campaign_name,
            'campaign_type': ctype,
            'campaign_objective': objective,
            'start_date': campaign_date,
            'end_date': end_date,
            'target_segment': segment,
            'target_audience_size': target_size,
            'budget_inr': round(budget, 2),
            'channel': ctype,
            'is_active': end_date > date.today(),
            'avg_open_rate': campaign_types[ctype]['avg_open_rate'],
            'avg_click_rate': campaign_types[ctype]['avg_click_rate'],
            'delivery_rate': campaign_types[ctype]['delivery_rate'],
        })
        campaign_seq += 1

    current_date = current_date + relativedelta(months=1)

print(f"Generated {len(campaigns_data)} campaigns")

# COMMAND ----------

# Create dim_campaign table
campaign_schema = StructType([
    StructField("campaign_id", StringType(), False),
    StructField("campaign_name", StringType(), True),
    StructField("campaign_type", StringType(), True),
    StructField("campaign_objective", StringType(), True),
    StructField("start_date", DateType(), True),
    StructField("end_date", DateType(), True),
    StructField("target_segment", StringType(), True),
    StructField("target_audience_size", IntegerType(), True),
    StructField("budget_inr", DoubleType(), True),
    StructField("channel", StringType(), True),
    StructField("is_active", BooleanType(), True),
    StructField("avg_open_rate", DoubleType(), True),
    StructField("avg_click_rate", DoubleType(), True),
    StructField("delivery_rate", DoubleType(), True),
])

campaigns_df = spark.createDataFrame(campaigns_data, schema=campaign_schema)

# Write dim_campaign to bronze (without internal rate columns)
dim_campaign = campaigns_df.select(
    "campaign_id", "campaign_name", "campaign_type", "campaign_objective",
    "start_date", "end_date", "target_segment", "target_audience_size",
    "budget_inr", "channel", "is_active",
    F.current_timestamp().alias("created_at")
)

dim_campaign.write.format("delta").mode("overwrite").saveAsTable(f"{CATALOG}.{SCHEMA_BRONZE}.dim_campaign")
print(f"dim_campaign created: {dim_campaign.count()} rows")

# COMMAND ----------

# Generate campaign responses
# Cross join campaigns with eligible customers based on targeting rules

# Add campaign metadata to customers
customers_for_campaigns = customers_with_propensity.select(
    "customer_id", "loyalty_tier", "is_loyalty_member",
    "is_active", "digital_propensity", "registration_channel"
)

# Broadcast campaigns for efficiency
campaigns_broadcast = F.broadcast(campaigns_df)

# Cross join and filter by eligibility
campaign_responses_base = customers_for_campaigns.crossJoin(campaigns_broadcast)

# Apply targeting rules (removed email requirement since no email column exists)
campaign_responses_filtered = campaign_responses_base.filter(
    # Email campaigns: target customers with App/Website registration (proxy for digital presence)
    ~((F.col("campaign_type") == "Email") & ~F.col("registration_channel").isin(["App", "Website"])) &
    # Loyalty campaigns require membership
    ~((F.col("target_segment") == "Loyalty_Only") & (F.col("is_loyalty_member") == False)) &
    # Push/In_App require digital propensity > 0.3
    ~((F.col("campaign_type").isin(["Push_Notification", "In_App"])) & (F.col("digital_propensity") < 0.3)) &
    # Lapsed segment targets inactive customers
    ~((F.col("target_segment") == "Lapsed") & (F.col("is_active") == True))
)

# Sample to get target audience size per campaign (20-60% coverage)
campaign_responses_sampled = campaign_responses_filtered.withColumn(
    "include_flag",
    F.rand() < (F.col("target_audience_size") / 50000.0)
).filter(F.col("include_flag") == True).drop("include_flag")

print(f"Campaign response base rows: {campaign_responses_sampled.count():,}")

# COMMAND ----------

# Generate response metrics
fact_campaign_response = campaign_responses_sampled.withColumn(
    "response_id",
    F.concat(F.lit("RESP-"), F.monotonically_increasing_id())
).withColumn(
    "send_date", F.col("start_date")
).withColumn(
    "date_id", F.date_format("start_date", "yyyyMMdd").cast("bigint")
).withColumn(
    "is_delivered",
    F.rand() < F.col("delivery_rate")
).withColumn(
    "open_threshold",
    F.col("avg_open_rate") * (0.7 + F.col("digital_propensity") * 0.6)
).withColumn(
    "is_opened",
    F.col("is_delivered") & (F.rand() < F.col("open_threshold"))
).withColumn(
    "click_threshold",
    F.col("avg_click_rate") * (0.5 + F.col("digital_propensity") * 1.0)
).withColumn(
    "is_clicked",
    F.col("is_opened") & (F.rand() < F.col("click_threshold"))
).withColumn(
    "is_converted",
    F.col("is_clicked") & (F.rand() < 0.15)
).withColumn(
    "conversion_multiplier",
    F.when(F.col("loyalty_tier").isin(["Platinum", "Gold"]), 2.0).otherwise(1.0)
).withColumn(
    "conversion_value_inr",
    F.when(F.col("is_converted"),
           F.round((150 + F.rand() * 2850) * F.col("conversion_multiplier"), 2))
     .otherwise(F.lit(None).cast("double"))
).withColumn(
    "is_unsubscribed",
    F.col("is_delivered") & ~F.col("is_opened") & (F.rand() < 0.005)
).withColumn(
    "year", F.year("start_date").cast("bigint")
).withColumn(
    "month_num", F.month("start_date").cast("bigint")
).select(
    "response_id",
    "campaign_id",
    "campaign_name",
    "campaign_type",
    "campaign_objective",
    "customer_id",
    "send_date",
    "date_id",
    "is_delivered",
    "is_opened",
    "is_clicked",
    "is_converted",
    "conversion_value_inr",
    "is_unsubscribed",
    F.col("campaign_type").alias("channel"),
    "year",
    "month_num",
    F.current_timestamp().alias("created_at")
)

# Write to bronze
fact_campaign_response.write.format("delta") \
    .mode("overwrite") \
    .partitionBy("year", "month_num") \
    .saveAsTable(f"{CATALOG}.{SCHEMA_BRONZE}.fact_campaign_response")

response_count = spark.table(f"{CATALOG}.{SCHEMA_BRONZE}.fact_campaign_response").count()
elapsed = time.time() - start_time
print(f"fact_campaign_response created: {response_count:,} rows in {elapsed:.1f}s")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Table 3: fact_customer_feedback (~250K rows)
# MAGIC
# MAGIC **Grain:** One row per feedback event (NPS survey, CSAT post-delivery, store feedback)

# COMMAND ----------

start_time = time.time()
print("Generating fact_customer_feedback...")

# Comment templates
positive_comments = [
    "Delivery was very fast, received within 2 hours",
    "Good quality products, will order again",
    "App is easy to use, found what I needed quickly",
    "Store staff was very helpful",
    "Great prices compared to other stores",
    "Festival offers were excellent this Diwali",
    "Fresh vegetables, good packaging",
    "Loyalty points redemption was smooth",
    "Quick checkout process",
    "Wide variety of products available"
]

negative_comments = [
    "Delivery delayed by 3 days, very disappointing",
    "Product quality not matching the description",
    "App keeps crashing during payment",
    "Store was very crowded, long billing queue",
    "Prices higher than competitors",
    "Received damaged products",
    "Customer care not responsive, waited 30 mins",
    "Missing items in my order",
    "Wrong product delivered",
    "Refund process too slow"
]

neutral_comments = [
    "Average experience, nothing special",
    "Products were okay",
    "Delivery was on time",
    "Normal shopping experience",
    "Could be better",
]

# COMMAND ----------

# Select ~40% of customers for feedback, weighted by loyalty
feedback_customers = customers_with_propensity.withColumn(
    "feedback_probability",
    F.when(F.col("is_loyalty_member") == True, 0.55)
     .otherwise(0.30)
).filter(F.rand() < F.col("feedback_probability"))

print(f"Customers selected for feedback: {feedback_customers.count():,}")

# Generate multiple feedback events per customer over the period
feedback_events = feedback_customers.withColumn(
    "num_feedback_events",
    F.when(F.col("is_loyalty_member") == True,
           F.round(2 + F.rand() * 3).cast("int"))
     .otherwise(
           F.round(1 + F.rand() * 2).cast("int"))
)

# Explode to create multiple rows per customer
feedback_exploded = feedback_events.withColumn(
    "feedback_seq",
    F.explode(F.sequence(F.lit(1), F.col("num_feedback_events")))
)

print(f"Total feedback events to generate: {feedback_exploded.count():,}")

# COMMAND ----------

# Load delivery data to correlate CSAT with delivery experience
delivery_stats = spark.table(f"{CATALOG}.{SCHEMA_SILVER}.fact_delivery").groupBy("customer_id").agg(
    F.avg("delivery_rating").alias("avg_delivery_rating"),
    F.avg(F.when(F.col("sla_met") == True, 1).otherwise(0)).alias("sla_met_rate")
)

# Join delivery stats
feedback_with_delivery = feedback_exploded.join(
    delivery_stats, "customer_id", "left"
).fillna({"avg_delivery_rating": 3.5, "sla_met_rate": 0.6})

# Generate feedback metrics
fact_customer_feedback = feedback_with_delivery.withColumn(
    "feedback_id",
    F.concat(F.lit("FB-"), F.monotonically_increasing_id())
).withColumn(
    "days_offset",
    F.round(F.rand() * 1279).cast("int")  # ~3.5 years in days
).withColumn(
    "feedback_date",
    F.date_add(F.lit(ENGAGEMENT_START_DATE), F.col("days_offset"))
).withColumn(
    "date_id",
    F.date_format("feedback_date", "yyyyMMdd").cast("bigint")
).withColumn(
    "feedback_type_rand", F.rand()
).withColumn(
    "feedback_type",
    F.when(F.col("feedback_type_rand") < 0.40, "NPS_Survey")
     .when(F.col("feedback_type_rand") < 0.75, "Post_Delivery_CSAT")
     .when(F.col("feedback_type_rand") < 0.90, "Store_Feedback")
     .otherwise("App_Review")
).withColumn(
    "survey_channel",
    F.when(F.col("feedback_type") == "Store_Feedback", "In_Store")
     .when(F.col("feedback_type") == "App_Review", "In_App")
     .when(F.col("registration_channel").isin(["App", "Website"]),
           F.when(F.rand() < 0.6, "Email").otherwise("SMS"))
     .otherwise("SMS")
).withColumn(
    # FIXED: Use weighted NPS distribution instead of uniform 0-10
    # Uniform gave ~64% detractors; realistic retail NPS is ~25% detractor, 35% passive, 40% promoter
    "nps_rand", F.rand()
).withColumn(
    "nps_base",
    F.when(F.col("nps_rand") < 0.25, F.round(F.rand() * 6).cast("int"))         # 25% detractor (0-6)
     .when(F.col("nps_rand") < 0.60, F.round(7 + F.rand()).cast("int"))          # 35% passive (7-8)
     .otherwise(F.round(9 + F.rand()).cast("int"))                               # 40% promoter (9-10)
).withColumn(
    "nps_tier_shift",
    F.when(F.col("loyalty_tier").isin(["Platinum", "Gold"]), 1)
     .otherwise(0)
).withColumn(
    "nps_delivery_shift",
    F.when(F.col("avg_delivery_rating") < 3, -1)
     .otherwise(0)
).withColumn(
    "nps_score",
    F.greatest(F.lit(0), F.least(F.lit(10),
        F.col("nps_base") + F.col("nps_tier_shift") + F.col("nps_delivery_shift")))
).withColumn(
    "nps_category",
    F.when(F.col("nps_score") <= 6, "Detractor")
     .when(F.col("nps_score") <= 8, "Passive")
     .otherwise("Promoter")
).withColumn(
    "csat_base",
    F.when(F.col("sla_met_rate") > 0.7, 4.0 + F.randn() * 0.7)
     .otherwise(2.8 + F.randn() * 0.9)
).withColumn(
    "csat_score",
    F.greatest(F.lit(1), F.least(F.lit(5), F.round(F.col("csat_base")))).cast("int")
).withColumn(
    "topic_rand", F.rand()
).withColumn(
    "topic_category",
    F.when(F.col("topic_rand") < 0.30, "Delivery")
     .when(F.col("topic_rand") < 0.50, "Product_Quality")
     .when(F.col("topic_rand") < 0.65, "Price_Value")
     .when(F.col("topic_rand") < 0.80, "Store_Experience")
     .when(F.col("topic_rand") < 0.90, "App_Experience")
     .otherwise("Customer_Service")
).withColumn(
    "sentiment",
    F.when((F.col("csat_score") >= 4) | (F.col("nps_score") >= 9), "Positive")
     .when((F.col("csat_score") == 3) | (F.col("nps_score").between(7, 8)), "Neutral")
     .otherwise("Negative")
).withColumn(
    "has_comment", F.rand() < 0.40
).withColumn(
    "comment_idx",
    F.round(F.rand() * 9).cast("int")
).withColumn(
    "comment_text",
    F.when(~F.col("has_comment"), F.lit(None))
     .when(F.col("sentiment") == "Positive",
           F.element_at(F.array(*[F.lit(c) for c in positive_comments]), F.col("comment_idx") + 1))
     .when(F.col("sentiment") == "Negative",
           F.element_at(F.array(*[F.lit(c) for c in negative_comments]), F.col("comment_idx") + 1))
     .otherwise(
           F.element_at(F.array(*[F.lit(c) for c in neutral_comments]), (F.col("comment_idx") % 5) + 1))
).withColumn(
    "is_resolved",
    F.when(F.col("sentiment") == "Negative", F.rand() < 0.70)
     .otherwise(F.lit(None).cast("boolean"))
).withColumn(
    "resolution_days",
    F.when(F.col("is_resolved") == True,
           F.when(F.col("is_loyalty_member") == True, F.round(1 + F.rand() * 6).cast("int"))
            .otherwise(F.round(2 + F.rand() * 12).cast("int")))
     .otherwise(F.lit(None).cast("int"))
).withColumn(
    "year", F.year("feedback_date").cast("bigint")
).withColumn(
    "month_num", F.month("feedback_date").cast("bigint")
)

# Select final columns
fact_customer_feedback_final = fact_customer_feedback.select(
    "feedback_id",
    "customer_id",
    "date_id",
    "feedback_date",
    "feedback_type",
    "survey_channel",
    "nps_score",
    "nps_category",
    "csat_score",
    "comment_text",
    "topic_category",
    "sentiment",
    F.lit(None).cast("string").alias("store_id"),
    F.lit(None).cast("string").alias("order_id"),
    "is_resolved",
    "resolution_days",
    "year",
    "month_num",
    F.current_timestamp().alias("created_at")
)

# Write to bronze
fact_customer_feedback_final.write.format("delta") \
    .mode("overwrite") \
    .partitionBy("year", "month_num") \
    .saveAsTable(f"{CATALOG}.{SCHEMA_BRONZE}.fact_customer_feedback")

feedback_count = spark.table(f"{CATALOG}.{SCHEMA_BRONZE}.fact_customer_feedback").count()
elapsed = time.time() - start_time
print(f"fact_customer_feedback created: {feedback_count:,} rows in {elapsed:.1f}s")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Table 4: fact_support_tickets (~150K rows)
# MAGIC
# MAGIC **Grain:** One row per support ticket

# COMMAND ----------

start_time = time.time()
print("Generating fact_support_tickets...")

# Ticket configuration
ticket_categories = {
    'Order_Issue': {'weight': 0.30, 'subcats': ['Missing items', 'Wrong product', 'Not delivered', 'Partial delivery']},
    'Delivery_Problem': {'weight': 0.25, 'subcats': ['Delayed delivery', 'Damaged package', 'Wrong address', 'Delivery slot missed']},
    'Refund_Request': {'weight': 0.15, 'subcats': ['Refund not received', 'Partial refund', 'Refund delay', 'Refund rejected']},
    'Product_Complaint': {'weight': 0.10, 'subcats': ['Quality issue', 'Expired product', 'Wrong description', 'Defective item']},
    'App_Technical': {'weight': 0.08, 'subcats': ['Payment failed', 'App crash', 'Login issue', 'Cart not updating']},
    'Loyalty_Points': {'weight': 0.07, 'subcats': ['Points not credited', 'Points expired', 'Redemption failed', 'Wrong balance']},
    'General_Inquiry': {'weight': 0.05, 'subcats': ['Store hours', 'Product availability', 'Return policy', 'Membership info']},
}

# Select customers for tickets
ticket_customers = customers_with_propensity.withColumn(
    "ticket_frequency",
    F.when(F.rand() < 0.10, "high")
     .when(F.rand() < 0.30, "medium")
     .otherwise("none")
).filter(F.col("ticket_frequency") != "none")

ticket_customers_with_count = ticket_customers.withColumn(
    "num_tickets",
    F.when(F.col("ticket_frequency") == "high",
           F.round(8 + F.rand() * 6).cast("int"))
     .otherwise(
           F.round(2 + F.rand() * 4).cast("int"))
)

# Explode to create ticket rows
tickets_exploded = ticket_customers_with_count.withColumn(
    "ticket_seq",
    F.explode(F.sequence(F.lit(1), F.col("num_tickets")))
)

print(f"Total tickets to generate: {tickets_exploded.count():,}")

# COMMAND ----------

# Generate ticket details
fact_support_tickets = tickets_exploded.withColumn(
    "ticket_id",
    F.concat(F.lit("TKT-"), F.monotonically_increasing_id())
).withColumn(
    "days_offset",
    F.round(F.rand() * 1279).cast("int")
).withColumn(
    "created_date",
    F.date_add(F.lit(ENGAGEMENT_START_DATE), F.col("days_offset"))
).withColumn(
    "date_id",
    F.date_format("created_date", "yyyyMMdd").cast("bigint")
).withColumn(
    "cat_rand", F.rand()
).withColumn(
    "ticket_category",
    F.when(F.col("cat_rand") < 0.30, "Order_Issue")
     .when(F.col("cat_rand") < 0.55, "Delivery_Problem")
     .when(F.col("cat_rand") < 0.70, "Refund_Request")
     .when(F.col("cat_rand") < 0.80, "Product_Complaint")
     .when(F.col("cat_rand") < 0.88, "App_Technical")
     .when(F.col("cat_rand") < 0.95, "Loyalty_Points")
     .otherwise("General_Inquiry")
).withColumn(
    "subcat_idx", F.round(F.rand() * 3).cast("int")
).withColumn(
    "ticket_subcategory",
    F.when(F.col("ticket_category") == "Order_Issue",
           F.element_at(F.array(*[F.lit(s) for s in ticket_categories['Order_Issue']['subcats']]), F.col("subcat_idx") + 1))
     .when(F.col("ticket_category") == "Delivery_Problem",
           F.element_at(F.array(*[F.lit(s) for s in ticket_categories['Delivery_Problem']['subcats']]), F.col("subcat_idx") + 1))
     .when(F.col("ticket_category") == "Refund_Request",
           F.element_at(F.array(*[F.lit(s) for s in ticket_categories['Refund_Request']['subcats']]), F.col("subcat_idx") + 1))
     .when(F.col("ticket_category") == "Product_Complaint",
           F.element_at(F.array(*[F.lit(s) for s in ticket_categories['Product_Complaint']['subcats']]), F.col("subcat_idx") + 1))
     .when(F.col("ticket_category") == "App_Technical",
           F.element_at(F.array(*[F.lit(s) for s in ticket_categories['App_Technical']['subcats']]), F.col("subcat_idx") + 1))
     .when(F.col("ticket_category") == "Loyalty_Points",
           F.element_at(F.array(*[F.lit(s) for s in ticket_categories['Loyalty_Points']['subcats']]), F.col("subcat_idx") + 1))
     .otherwise(
           F.element_at(F.array(*[F.lit(s) for s in ticket_categories['General_Inquiry']['subcats']]), F.col("subcat_idx") + 1))
).withColumn(
    "priority_rand", F.rand()
).withColumn(
    "priority",
    F.when(F.col("priority_rand") < 0.15, "High")
     .when(F.col("priority_rand") < 0.65, "Medium")
     .otherwise("Low")
).withColumn(
    "channel_rand", F.rand()
).withColumn(
    "channel",
    F.when(F.col("channel_rand") < 0.35, "App_Chat")
     .when(F.col("channel_rand") < 0.65, "Phone")
     .when(F.col("channel_rand") < 0.85, "Email")
     .when(F.col("channel_rand") < 0.95, "WhatsApp")
     .otherwise("Store")
).withColumn(
    "status_rand", F.rand()
).withColumn(
    "status",
    F.when(F.col("status_rand") < 0.75, "Resolved")
     .when(F.col("status_rand") < 0.90, "Closed")
     .when(F.col("status_rand") < 0.97, "Pending")
     .otherwise("Escalated")
).withColumn(
    "resolution_rand", F.rand()
).withColumn(
    "resolution_type",
    F.when(F.col("status").isin(["Pending"]), F.lit(None))
     .when(F.col("resolution_rand") < 0.30, "Refund")
     .when(F.col("resolution_rand") < 0.50, "Replacement")
     .when(F.col("resolution_rand") < 0.75, "Information")
     .when(F.col("resolution_rand") < 0.90, "Coupon")
     .otherwise("Escalated")
).withColumn(
    "first_response_hours",
    F.when(F.col("is_loyalty_member") == True,
           F.round(0.5 + F.rand() * 3.5, 1))
     .otherwise(
           F.round(2 + F.rand() * 22, 1))
).withColumn(
    "resolution_hours",
    F.when(F.col("status") == "Pending", F.lit(None).cast("double"))
     .otherwise(F.round(F.col("first_response_hours") * (1.5 + F.rand() * 8.5), 1))
).withColumn(
    "resolved_date",
    F.when(F.col("status").isin(["Resolved", "Closed"]),
           F.date_add(F.col("created_date"), F.ceil(F.col("resolution_hours") / 24).cast("int")))
     .otherwise(F.lit(None).cast("date"))
).withColumn(
    "csat_post_resolution",
    F.when(F.col("status") == "Pending", F.lit(None).cast("int"))
     .when(F.col("resolution_hours") < 4, F.round(3.5 + F.rand() * 1.5).cast("int"))
     .when(F.col("resolution_hours") > 24, F.round(2 + F.rand() * 1.5).cast("int"))
     .otherwise(F.round(3 + F.rand() * 2).cast("int"))
).withColumn(
    "csat_post_resolution",
    F.greatest(F.lit(1), F.least(F.lit(5), F.col("csat_post_resolution")))
).withColumn(
    "agent_id",
    F.concat(F.lit("AGT-"), F.lpad((F.round(F.rand() * 49) + 1).cast("string"), 4, "0"))
).withColumn(
    "year", F.year("created_date").cast("bigint")
).withColumn(
    "month_num", F.month("created_date").cast("bigint")
)

# Select final columns
fact_support_tickets_final = fact_support_tickets.select(
    "ticket_id",
    "customer_id",
    "date_id",
    "created_date",
    "resolved_date",
    "ticket_category",
    "ticket_subcategory",
    "priority",
    "channel",
    "status",
    "resolution_type",
    "first_response_hours",
    "resolution_hours",
    "csat_post_resolution",
    "agent_id",
    F.lit(None).cast("string").alias("order_id"),
    F.lit(None).cast("string").alias("store_id"),
    "year",
    "month_num",
    F.current_timestamp().alias("created_at")
)

# Write to bronze
fact_support_tickets_final.write.format("delta") \
    .mode("overwrite") \
    .partitionBy("year", "month_num") \
    .saveAsTable(f"{CATALOG}.{SCHEMA_BRONZE}.fact_support_tickets")

tickets_count = spark.table(f"{CATALOG}.{SCHEMA_BRONZE}.fact_support_tickets").count()
elapsed = time.time() - start_time
print(f"fact_support_tickets created: {tickets_count:,} rows in {elapsed:.1f}s")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Silver Layer Promotion
# MAGIC
# MAGIC Promote all 5 new bronze tables to silver with validation

# COMMAND ----------

start_time = time.time()
print("=" * 60)
print("SILVER LAYER PROMOTION")
print("=" * 60)

bronze_tables = [
    ("fact_customer_engagement", "engagement_id"),
    ("fact_campaign_response", "response_id"),
    ("fact_customer_feedback", "feedback_id"),
    ("fact_support_tickets", "ticket_id"),
    ("dim_campaign", "campaign_id"),
]

for table_name, pk_col in bronze_tables:
    print(f"\nPromoting {table_name} to silver...")

    # Read from bronze
    bronze_df = spark.table(f"{CATALOG}.{SCHEMA_BRONZE}.{table_name}")

    # Add silver_loaded_at timestamp
    silver_df = bronze_df.withColumn("silver_loaded_at", F.current_timestamp())

    # Drop rows with NULL customer_id (except for dim_campaign which doesn't have it)
    if "customer_id" in silver_df.columns:
        silver_df = silver_df.filter(F.col("customer_id").isNotNull())

    # Drop duplicates on primary key
    silver_df = silver_df.dropDuplicates([pk_col])

    # Write to silver
    if "year" in silver_df.columns and "month_num" in silver_df.columns:
        silver_df.write.format("delta") \
            .mode("overwrite") \
            .partitionBy("year", "month_num") \
            .saveAsTable(f"{CATALOG}.{SCHEMA_SILVER}.{table_name}")
    else:
        silver_df.write.format("delta") \
            .mode("overwrite") \
            .saveAsTable(f"{CATALOG}.{SCHEMA_SILVER}.{table_name}")

    row_count = spark.table(f"{CATALOG}.{SCHEMA_SILVER}.{table_name}").count()
    print(f"  {SCHEMA_SILVER}.{table_name}: {row_count:,} rows")

elapsed = time.time() - start_time
print(f"\nSilver promotion completed in {elapsed:.1f}s")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Gold Layer: gold_customer_360_v2
# MAGIC
# MAGIC Build the comprehensive 64-column customer 360 view joining all existing + new tables
# MAGIC
# MAGIC **Fixed issues:**
# MAGIC - Corrected column names: `txn_id`, `quantity_sold`, `unit_cost_price`, `net_amount`, `sla_met`, `delay_mins`, `total_items`, `points_earned`, `points_redeemed`
# MAGIC - Replaced MODE() with subquery for preferred_shopping_day
# MAGIC - Fixed feedback CTE to use proper aggregation for latest NPS
# MAGIC - Fixed top_return_reason to use frequency-based selection
# MAGIC - Fixed department_concentration_pct to show top category spend ratio
# MAGIC - Added support metrics columns

# COMMAND ----------

start_time = time.time()
print("=" * 60)
print("BUILDING gold_customer_360_v2")
print("=" * 60)

# COMMAND ----------

# Build gold_customer_360_v2 using SQL CTEs for clarity and performance
gold_customer_360_sql = """
WITH
-- REFERENCE DATE: Use max date from sales data instead of CURRENT_DATE()
-- This prevents segment misclassification when data ends before current date
max_dates AS (
    SELECT
        GREATEST(
            COALESCE(MAX(pos_date), DATE('2025-12-31')),
            COALESCE(MAX(online_date), DATE('2025-12-31'))
        ) AS ref_date
    FROM (
        SELECT MAX(TO_DATE(CAST(date_id AS STRING), 'yyyyMMdd')) AS pos_date, NULL AS online_date
        FROM hive_metastore.retail_silver.fact_pos_sales
        UNION ALL
        SELECT NULL AS pos_date, MAX(TO_DATE(CAST(date_id AS STRING), 'yyyyMMdd')) AS online_date
        FROM hive_metastore.retail_silver.fact_online_sales
    )
),

-- A. Base customer identity
customer_base AS (
    SELECT
        customer_id,
        loyalty_tier,
        CASE
            WHEN age < 25 THEN '18-24'
            WHEN age < 35 THEN '25-34'
            WHEN age < 45 THEN '35-44'
            WHEN age < 55 THEN '45-54'
            ELSE '55+'
        END AS age_band,
        gender,
        city,
        registration_channel,
        registration_date,
        is_loyalty_member,
        is_active
    FROM hive_metastore.retail_silver.dim_customer
),

-- B. POS Sales metrics (FIXED: txn_id, quantity_sold, unit_cost_price, net_amount)
pos_metrics AS (
    SELECT
        customer_id,
        SUM(net_amount) AS total_spend_pos,
        COUNT(DISTINCT txn_id) AS total_transactions_pos,
        AVG(net_amount) AS avg_basket_value_pos,
        SUM(net_amount - (quantity_sold * unit_cost_price)) AS contribution_margin_pos,
        MAX(TO_DATE(CAST(date_id AS STRING), 'yyyyMMdd')) AS last_pos_date,
        SUM(CASE WHEN discount_amount > 0 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) AS discount_txn_rate_pos,
        AVG(CASE WHEN discount_amount > 0 THEN discount_amount ELSE 0 END) AS avg_discount_pos,
        AVG(unit_selling_price / NULLIF(unit_mrp, 0)) AS avg_price_to_mrp_ratio
    FROM hive_metastore.retail_silver.fact_pos_sales
    WHERE customer_id IS NOT NULL
    GROUP BY customer_id
),

-- C. Online Sales metrics (FIXED: is_cancelled boolean)
online_metrics AS (
    SELECT
        customer_id,
        SUM(net_amount) AS total_spend_online,
        COUNT(DISTINCT order_id) AS total_orders_online,
        AVG(net_amount) AS avg_basket_value_online,
        SUM(net_amount - (quantity_sold * unit_cost_price)) AS contribution_margin_online,
        MAX(TO_DATE(CAST(date_id AS STRING), 'yyyyMMdd')) AS last_online_date,
        SUM(CASE WHEN is_cancelled = TRUE THEN 1 ELSE 0 END) AS cancellation_count
    FROM hive_metastore.retail_silver.fact_online_sales
    WHERE customer_id IS NOT NULL
    GROUP BY customer_id
),

-- D. Delivery metrics (FIXED: sla_met boolean, delay_mins)
delivery_metrics AS (
    SELECT
        customer_id,
        AVG(CASE WHEN sla_met = TRUE THEN 1.0 ELSE 0.0 END) * 100 AS avg_delivery_sla_met_pct,
        AVG(delivery_rating) AS avg_delivery_rating,
        AVG(CASE WHEN delay_mins > 0 THEN delay_mins ELSE 0 END) AS avg_delivery_delay_mins
    FROM hive_metastore.retail_silver.fact_delivery
    GROUP BY customer_id
),

-- E. Returns metrics (FIXED: frequency-based top_return_reason)
returns_base AS (
    SELECT
        customer_id,
        COUNT(*) AS total_returns_count,
        SUM(refund_amount) AS total_refund_amount
    FROM hive_metastore.retail_silver.fact_returns
    GROUP BY customer_id
),

-- Get most frequent return reason per customer
return_reason_ranked AS (
    SELECT
        customer_id,
        return_reason,
        COUNT(*) AS reason_count,
        ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY COUNT(*) DESC) AS rn
    FROM hive_metastore.retail_silver.fact_returns
    GROUP BY customer_id, return_reason
),

returns_metrics AS (
    SELECT
        rb.customer_id,
        rb.total_returns_count,
        rb.total_refund_amount,
        rr.return_reason AS top_return_reason
    FROM returns_base rb
    LEFT JOIN return_reason_ranked rr ON rb.customer_id = rr.customer_id AND rr.rn = 1
),

-- F. Loyalty metrics (FIXED: points_earned/points_redeemed are columns, not transaction_type)
loyalty_metrics AS (
    SELECT
        customer_id,
        SUM(points_earned) AS total_points_earned,
        SUM(points_redeemed) AS total_points_redeemed,
        MAX(tier_at_txn) AS loyalty_tier_current
    FROM hive_metastore.retail_silver.fact_loyalty
    GROUP BY customer_id
),

-- G. Basket metrics (FIXED: total_items instead of basket_size)
basket_metrics AS (
    SELECT
        customer_id,
        AVG(total_items) AS avg_basket_items,
        -- Get most common basket_type using aggregation
        FIRST(basket_type) AS dominant_basket_type,
        AVG(time_in_store_mins) AS avg_time_in_store_mins,
        SUM(CASE WHEN total_items >= 15 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS large_basket_pct
    FROM hive_metastore.retail_silver.fact_basket
    GROUP BY customer_id
),

-- H. Category affinity with proper concentration calculation
category_spend AS (
    SELECT
        p.customer_id,
        pr.category_l1,
        SUM(p.net_amount) AS category_spend
    FROM hive_metastore.retail_silver.fact_pos_sales p
    JOIN hive_metastore.retail_silver.dim_product pr ON p.product_id = pr.product_id
    WHERE p.customer_id IS NOT NULL
    GROUP BY p.customer_id, pr.category_l1
),

category_ranked AS (
    SELECT
        customer_id,
        category_l1,
        category_spend,
        ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY category_spend DESC) AS rn,
        SUM(category_spend) OVER (PARTITION BY customer_id) AS total_category_spend
    FROM category_spend
),

category_metrics AS (
    SELECT
        p.customer_id,
        cr.category_l1 AS top_category_l1,
        COUNT(DISTINCT pr.category_l1) AS category_breadth,
        COUNT(DISTINCT pr.product_id) AS unique_products_bought,
        SUM(CASE WHEN pr.is_private_label = TRUE THEN p.net_amount ELSE 0 END) * 100.0 /
            NULLIF(SUM(p.net_amount), 0) AS private_label_share_pct,
        -- FIXED: department_concentration = top category spend / total spend
        MAX(CASE WHEN cr.rn = 1 THEN cr.category_spend * 100.0 / NULLIF(cr.total_category_spend, 0) ELSE 0 END) AS department_concentration_pct
    FROM hive_metastore.retail_silver.fact_pos_sales p
    JOIN hive_metastore.retail_silver.dim_product pr ON p.product_id = pr.product_id
    LEFT JOIN category_ranked cr ON p.customer_id = cr.customer_id AND cr.rn = 1
    WHERE p.customer_id IS NOT NULL
    GROUP BY p.customer_id, cr.category_l1
),

-- I. Temporal patterns (FIXED: replaced MODE() with subquery)
day_counts AS (
    SELECT
        p.customer_id,
        d.day_name,
        COUNT(*) AS day_count,
        ROW_NUMBER() OVER (PARTITION BY p.customer_id ORDER BY COUNT(*) DESC) AS rn
    FROM hive_metastore.retail_silver.fact_pos_sales p
    JOIN hive_metastore.retail_silver.dim_date d ON p.date_id = d.date_id
    WHERE p.customer_id IS NOT NULL
    GROUP BY p.customer_id, d.day_name
),

temporal_patterns AS (
    SELECT
        p.customer_id,
        dc.day_name AS preferred_shopping_day,
        SUM(CASE WHEN d.is_weekend = TRUE THEN 1 ELSE 0 END) * 1.0 / COUNT(*) > 0.5 AS is_weekend_shopper,
        SUM(CASE WHEN d.day_of_month BETWEEN 1 AND 7 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) > 0.3 AS is_salary_week_shopper
    FROM hive_metastore.retail_silver.fact_pos_sales p
    JOIN hive_metastore.retail_silver.dim_date d ON p.date_id = d.date_id
    LEFT JOIN day_counts dc ON p.customer_id = dc.customer_id AND dc.rn = 1
    WHERE p.customer_id IS NOT NULL
    GROUP BY p.customer_id, dc.day_name
),

-- J. Digital engagement metrics (NEW)
engagement_metrics AS (
    SELECT
        customer_id,
        AVG(CASE WHEN channel = 'App' THEN sessions ELSE NULL END) AS avg_monthly_app_sessions,
        AVG(CASE WHEN channel = 'Web' THEN sessions ELSE NULL END) AS avg_monthly_web_sessions,
        SUM(cart_abandonment) AS total_cart_abandonments,
        (AVG(sessions) * 2 + AVG(page_views) * 0.5 + AVG(time_spent_mins) * 1.5) AS engagement_score_raw
    FROM hive_metastore.retail_silver.fact_customer_engagement
    GROUP BY customer_id
),

-- K. Campaign response metrics (NEW)
campaign_metrics AS (
    SELECT
        customer_id,
        SUM(CASE WHEN is_clicked THEN 1 ELSE 0 END) * 1.0 / NULLIF(COUNT(*), 0) AS campaign_response_rate,
        SUM(CASE WHEN campaign_type = 'Email' AND is_opened THEN 1 ELSE 0 END) * 1.0 /
            NULLIF(SUM(CASE WHEN campaign_type = 'Email' THEN 1 ELSE 0 END), 0) AS avg_email_open_rate,
        SUM(CASE WHEN is_clicked THEN 1 ELSE 0 END) * 1.0 /
            NULLIF(SUM(CASE WHEN is_opened THEN 1 ELSE 0 END), 0) AS avg_click_rate,
        SUM(CASE WHEN is_converted THEN 1 ELSE 0 END) AS total_conversions
    FROM hive_metastore.retail_silver.fact_campaign_response
    GROUP BY customer_id
),

-- L. Feedback/sentiment metrics (FIXED: proper aggregation for latest NPS)
latest_feedback AS (
    SELECT
        customer_id,
        nps_score,
        nps_category,
        csat_score,
        ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY feedback_date DESC, date_id DESC) AS rn
    FROM hive_metastore.retail_silver.fact_customer_feedback
),

feedback_agg AS (
    SELECT
        lf.customer_id,
        lf.nps_score AS latest_nps_score,
        lf.nps_category,
        AVG(f.csat_score) AS avg_csat_score
    FROM latest_feedback lf
    JOIN hive_metastore.retail_silver.fact_customer_feedback f ON lf.customer_id = f.customer_id
    WHERE lf.rn = 1
    GROUP BY lf.customer_id, lf.nps_score, lf.nps_category
),

-- M. Support metrics (NEW - now included in output)
support_metrics AS (
    SELECT
        customer_id,
        COUNT(*) AS total_tickets,
        AVG(first_response_hours) AS avg_first_response_hours,
        AVG(resolution_hours) AS avg_resolution_hours
    FROM hive_metastore.retail_silver.fact_support_tickets
    GROUP BY customer_id
),

-- Compute median spend for segment threshold
spend_percentiles AS (
    SELECT
        PERCENTILE_APPROX(total_spend_pos + COALESCE(total_spend_online, 0), 0.5) AS median_spend
    FROM (
        SELECT pm.customer_id, pm.total_spend_pos, om.total_spend_online
        FROM pos_metrics pm
        LEFT JOIN online_metrics om ON pm.customer_id = om.customer_id
    )
),

-- Compute engagement score percentiles for proper tier thresholds
-- Actual scores range ~160-205, so fixed thresholds don't work
engagement_percentiles AS (
    SELECT
        PERCENTILE_APPROX(engagement_score_raw, 0.33) AS p33_engagement,
        PERCENTILE_APPROX(engagement_score_raw, 0.66) AS p66_engagement
    FROM engagement_metrics
    WHERE engagement_score_raw > 0
)

-- FINAL SELECT: Join all CTEs
SELECT
    -- A. IDENTITY (7 columns)
    cb.customer_id,
    cb.loyalty_tier,
    cb.age_band,
    cb.gender,
    cb.city,
    cb.registration_channel,
    cb.registration_date,

    -- B. VALUE (8 columns)
    COALESCE(pm.total_spend_pos, 0) AS total_spend_pos,
    COALESCE(om.total_spend_online, 0) AS total_spend_online,
    COALESCE(pm.total_spend_pos, 0) + COALESCE(om.total_spend_online, 0) AS total_spend_combined,
    COALESCE(
        (COALESCE(pm.total_spend_pos, 0) + COALESCE(om.total_spend_online, 0)) /
        NULLIF(COALESCE(pm.total_transactions_pos, 0) + COALESCE(om.total_orders_online, 0), 0),
        0
    ) AS avg_basket_value,
    COALESCE(pm.contribution_margin_pos, 0) + COALESCE(om.contribution_margin_online, 0) AS contribution_margin,
    COALESCE(pm.total_transactions_pos, 0) AS total_transactions_pos,
    COALESCE(om.total_orders_online, 0) AS total_orders_online,
    NTILE(100) OVER (ORDER BY COALESCE(pm.total_spend_pos, 0) + COALESCE(om.total_spend_online, 0) DESC) AS revenue_percentile,

    -- C. RETENTION & LOYALTY (8 columns)
    -- FIXED: Using ref_date from max_dates instead of CURRENT_DATE() to avoid segment misclassification
    DATEDIFF(md.ref_date,
        GREATEST(COALESCE(pm.last_pos_date, DATE('2020-01-01')),
                 COALESCE(om.last_online_date, DATE('2020-01-01')))) AS days_since_last_purchase,
    DATEDIFF(md.ref_date, cb.registration_date) AS customer_tenure_days,
    CASE
        WHEN COALESCE(pm.total_transactions_pos, 0) + COALESCE(om.total_orders_online, 0) > 1 THEN
            (COALESCE(pm.total_transactions_pos, 0) + COALESCE(om.total_orders_online, 0) - 1.0) /
            NULLIF(COALESCE(pm.total_transactions_pos, 0) + COALESCE(om.total_orders_online, 0), 0)
        ELSE 0
    END AS repeat_purchase_rate,
    (COALESCE(pm.total_transactions_pos, 0) + COALESCE(om.total_orders_online, 0)) /
        NULLIF(DATEDIFF(md.ref_date, cb.registration_date) / 30.0, 0) AS purchase_frequency_monthly,
    DATEDIFF(md.ref_date, cb.registration_date) /
        NULLIF(COALESCE(pm.total_transactions_pos, 0) + COALESCE(om.total_orders_online, 0), 0) AS inter_purchase_interval_avg,
    COALESCE(lm.total_points_earned, 0) AS total_points_earned,
    COALESCE(lm.total_points_redeemed, 0) AS total_points_redeemed,
    COALESCE(lm.loyalty_tier_current, cb.loyalty_tier) AS loyalty_tier_current,

    -- D. OMNICHANNEL (7 columns)
    CASE
        WHEN COALESCE(pm.total_spend_pos, 0) + COALESCE(om.total_spend_online, 0) > 0 THEN
            COALESCE(om.total_spend_online, 0) * 100.0 /
            (COALESCE(pm.total_spend_pos, 0) + COALESCE(om.total_spend_online, 0))
        ELSE 0
    END AS online_spend_share_pct,
    CASE
        WHEN COALESCE(om.total_spend_online, 0) > COALESCE(pm.total_spend_pos, 0) THEN 'Online'
        ELSE 'Store'
    END AS preferred_channel,
    TRUE AS is_omnichannel_buyer,
    COALESCE(dm.avg_delivery_sla_met_pct, 0) AS avg_delivery_sla_met_pct,
    COALESCE(dm.avg_delivery_rating, 0) AS avg_delivery_rating,
    COALESCE(dm.avg_delivery_delay_mins, 0) AS avg_delivery_delay_mins,
    COALESCE(om.cancellation_count, 0) AS cancellation_count,

    -- E. RETURNS & RISK (5 columns)
    COALESCE(rm.total_returns_count, 0) AS total_returns_count,
    CASE
        WHEN COALESCE(pm.total_transactions_pos, 0) + COALESCE(om.total_orders_online, 0) > 0 THEN
            COALESCE(rm.total_returns_count, 0) * 100.0 /
            (COALESCE(pm.total_transactions_pos, 0) + COALESCE(om.total_orders_online, 0))
        ELSE 0
    END AS return_rate_pct,
    COALESCE(rm.total_refund_amount, 0) AS total_refund_amount,
    rm.top_return_reason,
    COALESCE(pm.total_spend_pos, 0) + COALESCE(om.total_spend_online, 0) - COALESCE(rm.total_refund_amount, 0) AS net_revenue_after_returns,

    -- F. PROMO & PRICE SENSITIVITY (5 columns)
    COALESCE(pm.discount_txn_rate_pos, 0) * 100 AS discount_dependency_rate_pct,
    (1 - COALESCE(pm.discount_txn_rate_pos, 0)) * 100 AS full_price_purchase_rate_pct,
    COALESCE(pm.avg_discount_pos, 0) AS avg_discount_captured_inr,
    CASE WHEN COALESCE(pm.discount_txn_rate_pos, 0) > 0.8 THEN TRUE ELSE FALSE END AS promo_only_buyer_flag,
    COALESCE(pm.avg_price_to_mrp_ratio, 1.0) AS avg_price_to_mrp_ratio,

    -- G. CATEGORY AFFINITY (5 columns)
    cm.top_category_l1,
    COALESCE(cm.category_breadth, 0) AS category_breadth,
    COALESCE(cm.department_concentration_pct, 100) AS department_concentration_pct,
    COALESCE(cm.private_label_share_pct, 0) AS private_label_share_pct,
    COALESCE(cm.unique_products_bought, 0) AS unique_products_bought,

    -- H. BASKET BEHAVIOUR (4 columns)
    COALESCE(bm.avg_basket_items, 0) AS avg_basket_items,
    bm.dominant_basket_type,
    COALESCE(bm.avg_time_in_store_mins, 0) AS avg_time_in_store_mins,
    COALESCE(bm.large_basket_pct, 0) AS large_basket_pct,

    -- I. TEMPORAL PATTERNS (3 columns)
    tp.preferred_shopping_day,
    COALESCE(tp.is_weekend_shopper, FALSE) AS is_weekend_shopper,
    COALESCE(tp.is_salary_week_shopper, FALSE) AS is_salary_week_shopper,

    -- J. DIGITAL ENGAGEMENT (5 columns) - NEW
    COALESCE(em.avg_monthly_app_sessions, 0) AS avg_monthly_app_sessions,
    COALESCE(em.avg_monthly_web_sessions, 0) AS avg_monthly_web_sessions,
    COALESCE(em.total_cart_abandonments, 0) AS total_cart_abandonments,
    COALESCE(em.engagement_score_raw, 0) AS engagement_score,
    -- FIXED: Using percentile-based thresholds instead of fixed values
    -- Actual scores range 160-205, so fixed 50/20 thresholds made everyone "High"
    CASE
        WHEN COALESCE(em.engagement_score_raw, 0) = 0 THEN 'Inactive'
        WHEN COALESCE(em.engagement_score_raw, 0) > ep.p66_engagement THEN 'High'
        WHEN COALESCE(em.engagement_score_raw, 0) > ep.p33_engagement THEN 'Medium'
        ELSE 'Low'
    END AS digital_propensity_tier,

    -- K. MARKETING RESPONSIVENESS (4 columns) - NEW
    COALESCE(cpm.campaign_response_rate, 0) AS campaign_response_rate,
    COALESCE(cpm.avg_email_open_rate, 0) AS avg_email_open_rate,
    COALESCE(cpm.avg_click_rate, 0) AS avg_click_rate,
    COALESCE(cpm.total_conversions, 0) AS total_conversions,

    -- L. SENTIMENT (3 columns) - NEW
    fa.latest_nps_score,
    COALESCE(fa.avg_csat_score, 0) AS avg_csat_score,
    fa.nps_category,

    -- M. SUPPORT (3 columns) - NEW (was missing)
    COALESCE(sm.total_tickets, 0) AS total_support_tickets,
    COALESCE(sm.avg_first_response_hours, 0) AS avg_support_first_response_hours,
    COALESCE(sm.avg_resolution_hours, 0) AS avg_support_resolution_hours,

    -- N. SEGMENT (1 column - derived using median from spend_percentiles)
    -- FIXED: Using ref_date instead of CURRENT_DATE() to avoid all customers being "At Risk"
    -- FIXED: Using percentile-based engagement thresholds
    CASE
        WHEN COALESCE(pm.total_spend_pos, 0) + COALESCE(om.total_spend_online, 0) = 0 THEN 'Inactive'
        WHEN DATEDIFF(md.ref_date,
            GREATEST(COALESCE(pm.last_pos_date, DATE('2020-01-01')),
                     COALESCE(om.last_online_date, DATE('2020-01-01')))) > 180 THEN 'Lapsed'
        WHEN DATEDIFF(md.ref_date,
            GREATEST(COALESCE(pm.last_pos_date, DATE('2020-01-01')),
                     COALESCE(om.last_online_date, DATE('2020-01-01')))) > 90 THEN 'At Risk'
        WHEN COALESCE(em.engagement_score_raw, 0) > ep.p66_engagement
             AND COALESCE(pm.total_spend_pos, 0) + COALESCE(om.total_spend_online, 0) > sp.median_spend THEN 'Champion'
        WHEN COALESCE(em.engagement_score_raw, 0) > ep.p33_engagement
             AND COALESCE(cpm.campaign_response_rate, 0) > 0.1 THEN 'Loyal'
        WHEN DATEDIFF(md.ref_date,
            GREATEST(COALESCE(pm.last_pos_date, DATE('2020-01-01')),
                     COALESCE(om.last_online_date, DATE('2020-01-01')))) < 30
             AND COALESCE(pm.total_transactions_pos, 0) > 50 THEN 'Frequent'
        WHEN COALESCE(om.total_spend_online, 0) * 100.0 /
             NULLIF(COALESCE(pm.total_spend_pos, 0) + COALESCE(om.total_spend_online, 0), 0) > 50 THEN 'Digital First'
        WHEN COALESCE(pm.discount_txn_rate_pos, 0) > 0.7 THEN 'Deal Seeker'
        ELSE 'Regular'
    END AS customer_segment

FROM customer_base cb
CROSS JOIN max_dates md
CROSS JOIN spend_percentiles sp
CROSS JOIN engagement_percentiles ep
LEFT JOIN pos_metrics pm ON cb.customer_id = pm.customer_id
LEFT JOIN online_metrics om ON cb.customer_id = om.customer_id
LEFT JOIN delivery_metrics dm ON cb.customer_id = dm.customer_id
LEFT JOIN returns_metrics rm ON cb.customer_id = rm.customer_id
LEFT JOIN loyalty_metrics lm ON cb.customer_id = lm.customer_id
LEFT JOIN basket_metrics bm ON cb.customer_id = bm.customer_id
LEFT JOIN category_metrics cm ON cb.customer_id = cm.customer_id
LEFT JOIN temporal_patterns tp ON cb.customer_id = tp.customer_id
LEFT JOIN engagement_metrics em ON cb.customer_id = em.customer_id
LEFT JOIN campaign_metrics cpm ON cb.customer_id = cpm.customer_id
LEFT JOIN feedback_agg fa ON cb.customer_id = fa.customer_id
LEFT JOIN support_metrics sm ON cb.customer_id = sm.customer_id
"""

# Execute the query
print("Executing gold_customer_360_v2 query...")
gold_df = spark.sql(gold_customer_360_sql)

# Check column count
print(f"Column count: {len(gold_df.columns)}")
print(f"Columns: {gold_df.columns}")

# COMMAND ----------

# Write to gold layer
gold_df.write.format("delta") \
    .mode("overwrite") \
    .saveAsTable(f"{CATALOG}.{SCHEMA_GOLD}.gold_customer_360_v2")

# Run OPTIMIZE with ZORDER
spark.sql(f"OPTIMIZE {CATALOG}.{SCHEMA_GOLD}.gold_customer_360_v2 ZORDER BY (customer_id)")

# Add table comment
spark.sql(f"""
    COMMENT ON TABLE {CATALOG}.{SCHEMA_GOLD}.gold_customer_360_v2
    IS 'Comprehensive 67-column Customer 360 view joining all transaction, engagement, campaign, feedback, and support data. Generated {datetime.now().strftime("%Y-%m-%d %H:%M")}'
""")

elapsed = time.time() - start_time
row_count = spark.table(f"{CATALOG}.{SCHEMA_GOLD}.gold_customer_360_v2").count()
print(f"\ngold_customer_360_v2 created: {row_count:,} rows, {len(gold_df.columns)} columns in {elapsed:.1f}s")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Validation Queries

# COMMAND ----------

print("=" * 60)
print("VALIDATION RESULTS")
print("=" * 60)

# Row counts
print("\n1. ROW COUNT VERIFICATION")
spark.sql(f"""
    SELECT COUNT(*) as rows, COUNT(DISTINCT customer_id) as customers
    FROM {CATALOG}.{SCHEMA_GOLD}.gold_customer_360_v2
""").show()

# COMMAND ----------

# Segment distribution
print("2. CUSTOMER SEGMENT DISTRIBUTION")
spark.sql(f"""
    SELECT customer_segment, COUNT(*) as cnt, ROUND(COUNT(*)*100.0/50000, 1) as pct
    FROM {CATALOG}.{SCHEMA_GOLD}.gold_customer_360_v2
    GROUP BY customer_segment
    ORDER BY cnt DESC
""").show()

# COMMAND ----------

# NPS distribution
print("3. NPS CATEGORY DISTRIBUTION")
spark.sql(f"""
    SELECT nps_category, COUNT(*) as cnt, ROUND(COUNT(*)*100.0/50000, 1) as pct
    FROM {CATALOG}.{SCHEMA_GOLD}.gold_customer_360_v2
    GROUP BY nps_category
    ORDER BY cnt DESC
""").show()

# COMMAND ----------

# Digital engagement tiers
print("4. DIGITAL PROPENSITY TIER DISTRIBUTION")
spark.sql(f"""
    SELECT digital_propensity_tier, COUNT(*) as cnt, ROUND(COUNT(*)*100.0/50000, 1) as pct
    FROM {CATALOG}.{SCHEMA_GOLD}.gold_customer_360_v2
    GROUP BY digital_propensity_tier
    ORDER BY cnt DESC
""").show()

# COMMAND ----------

# Engagement by loyalty tier (should correlate!)
print("5. ENGAGEMENT BY LOYALTY TIER (Should show correlation)")
spark.sql(f"""
    SELECT loyalty_tier,
           ROUND(AVG(avg_monthly_app_sessions), 1) as avg_app_sessions,
           ROUND(AVG(engagement_score), 1) as avg_engagement_score,
           ROUND(AVG(campaign_response_rate)*100, 1) as response_rate_pct
    FROM {CATALOG}.{SCHEMA_GOLD}.gold_customer_360_v2
    GROUP BY loyalty_tier
    ORDER BY avg_engagement_score DESC
""").show()

# COMMAND ----------

# Support metrics by tier
print("6. SUPPORT METRICS BY LOYALTY TIER")
spark.sql(f"""
    SELECT loyalty_tier,
           ROUND(AVG(total_support_tickets), 1) as avg_tickets,
           ROUND(AVG(avg_support_first_response_hours), 1) as avg_response_hrs,
           ROUND(AVG(avg_support_resolution_hours), 1) as avg_resolution_hrs
    FROM {CATALOG}.{SCHEMA_GOLD}.gold_customer_360_v2
    GROUP BY loyalty_tier
    ORDER BY avg_tickets DESC
""").show()

# COMMAND ----------

# MAGIC %md
# MAGIC ## Summary

# COMMAND ----------

print("=" * 60)
print("GENERATION SUMMARY")
print("=" * 60)

# Bronze tables
print("\nBRONZE TABLES:")
for table in ["fact_customer_engagement", "fact_campaign_response", "fact_customer_feedback",
              "fact_support_tickets", "dim_campaign"]:
    count = spark.table(f"{CATALOG}.{SCHEMA_BRONZE}.{table}").count()
    cols = len(spark.table(f"{CATALOG}.{SCHEMA_BRONZE}.{table}").columns)
    print(f"  {SCHEMA_BRONZE}.{table}: {count:,} rows, {cols} columns")

# Silver tables
print("\nSILVER TABLES:")
for table in ["fact_customer_engagement", "fact_campaign_response", "fact_customer_feedback",
              "fact_support_tickets", "dim_campaign"]:
    count = spark.table(f"{CATALOG}.{SCHEMA_SILVER}.{table}").count()
    cols = len(spark.table(f"{CATALOG}.{SCHEMA_SILVER}.{table}").columns)
    print(f"  {SCHEMA_SILVER}.{table}: {count:,} rows, {cols} columns")

# Gold table
print("\nGOLD TABLE:")
gold_count = spark.table(f"{CATALOG}.{SCHEMA_GOLD}.gold_customer_360_v2").count()
gold_cols = len(spark.table(f"{CATALOG}.{SCHEMA_GOLD}.gold_customer_360_v2").columns)
print(f"  {SCHEMA_GOLD}.gold_customer_360_v2: {gold_count:,} rows, {gold_cols} columns")

print("\n" + "=" * 60)
print("CX360 ENGAGEMENT DATA GENERATION COMPLETE")
print("=" * 60)

# COMMAND ----------

# MAGIC %md
# MAGIC ## Column Reference for gold_customer_360_v2 (67 columns)
# MAGIC
# MAGIC | Group | Columns | Count |
# MAGIC |-------|---------|-------|
# MAGIC | A. Identity | customer_id, loyalty_tier, age_band, gender, city, registration_channel, registration_date | 7 |
# MAGIC | B. Value | total_spend_pos, total_spend_online, total_spend_combined, avg_basket_value, contribution_margin, total_transactions_pos, total_orders_online, revenue_percentile | 8 |
# MAGIC | C. Retention & Loyalty | days_since_last_purchase, customer_tenure_days, repeat_purchase_rate, purchase_frequency_monthly, inter_purchase_interval_avg, total_points_earned, total_points_redeemed, loyalty_tier_current | 8 |
# MAGIC | D. Omnichannel | online_spend_share_pct, preferred_channel, is_omnichannel_buyer, avg_delivery_sla_met_pct, avg_delivery_rating, avg_delivery_delay_mins, cancellation_count | 7 |
# MAGIC | E. Returns & Risk | total_returns_count, return_rate_pct, total_refund_amount, top_return_reason, net_revenue_after_returns | 5 |
# MAGIC | F. Promo & Price | discount_dependency_rate_pct, full_price_purchase_rate_pct, avg_discount_captured_inr, promo_only_buyer_flag, avg_price_to_mrp_ratio | 5 |
# MAGIC | G. Category Affinity | top_category_l1, category_breadth, department_concentration_pct, private_label_share_pct, unique_products_bought | 5 |
# MAGIC | H. Basket Behaviour | avg_basket_items, dominant_basket_type, avg_time_in_store_mins, large_basket_pct | 4 |
# MAGIC | I. Temporal Patterns | preferred_shopping_day, is_weekend_shopper, is_salary_week_shopper | 3 |
# MAGIC | J. Digital Engagement | avg_monthly_app_sessions, avg_monthly_web_sessions, total_cart_abandonments, engagement_score, digital_propensity_tier | 5 |
# MAGIC | K. Marketing Response | campaign_response_rate, avg_email_open_rate, avg_click_rate, total_conversions | 4 |
# MAGIC | L. Sentiment | latest_nps_score, avg_csat_score, nps_category | 3 |
# MAGIC | M. Support | total_support_tickets, avg_support_first_response_hours, avg_support_resolution_hours | 3 |
# MAGIC | N. Segment | customer_segment | 1 |
# MAGIC | **TOTAL** | | **68** |
