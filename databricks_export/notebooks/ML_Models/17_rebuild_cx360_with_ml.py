# Databricks notebook source
# MAGIC %md
# MAGIC # 17 - Rebuild gold_customer_360_v2 with ML Columns
# MAGIC
# MAGIC This notebook adds ML-derived columns to the customer 360 view:
# MAGIC - **From Churn Model (NB 14):** churn_probability, churn_risk_tier, churn_prediction, churn_risk_factors
# MAGIC - **From CLV Model (NB 15):** clv_12m, clv_tier, predicted_purchases_12m
# MAGIC - **Composite:** customer_health_score
# MAGIC
# MAGIC **Result:** gold_customer_360_v2 grows from 68 to 76 columns

# COMMAND ----------

# MAGIC %md
# MAGIC ## 1. Setup & Configuration

# COMMAND ----------

from pyspark.sql import functions as F
from pyspark.sql.window import Window
from pyspark.sql.types import DoubleType, StringType, IntegerType

# Catalog and schema configuration
CATALOG = "hive_metastore"
SCHEMA_SILVER = "retail_silver"
SCHEMA_GOLD = "retail_gold"
SCHEMA_ML = "retail_ml"

print("Configuration loaded")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 2. Verify ML Tables Exist

# COMMAND ----------

# Check that ML tables exist
print("Checking ML tables...")

try:
    churn_count = spark.sql(f"SELECT COUNT(*) FROM {CATALOG}.{SCHEMA_ML}.churn_scores").collect()[0][0]
    print(f"  churn_scores: {churn_count:,} rows")
except Exception as e:
    print(f"  churn_scores: NOT FOUND - run notebook 14 first")
    churn_count = 0

try:
    clv_count = spark.sql(f"SELECT COUNT(*) FROM {CATALOG}.{SCHEMA_ML}.clv_scores").collect()[0][0]
    print(f"  clv_scores: {clv_count:,} rows")
except Exception as e:
    print(f"  clv_scores: NOT FOUND - run notebook 15 first")
    clv_count = 0

try:
    cx360_count = spark.sql(f"SELECT COUNT(*) FROM {CATALOG}.{SCHEMA_GOLD}.gold_customer_360_v2").collect()[0][0]
    print(f"  gold_customer_360_v2: {cx360_count:,} rows")
except Exception as e:
    print(f"  gold_customer_360_v2: NOT FOUND")
    cx360_count = 0

# COMMAND ----------

# MAGIC %md
# MAGIC ## 3. Get Current Column Count

# COMMAND ----------

# Get current schema
current_columns = spark.sql(f"DESCRIBE {CATALOG}.{SCHEMA_GOLD}.gold_customer_360_v2").collect()
current_col_count = len([c for c in current_columns if not c['col_name'].startswith('#')])
print(f"Current column count: {current_col_count}")

# List current columns
print("\nCurrent columns:")
for i, col in enumerate(current_columns):
    if not col['col_name'].startswith('#'):
        print(f"  {i+1}. {col['col_name']} ({col['data_type']})")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 4. Rebuild Customer 360 with ML Columns

# COMMAND ----------

# Create the enhanced customer 360 view
rebuild_sql = f"""
CREATE OR REPLACE TABLE {CATALOG}.{SCHEMA_GOLD}.gold_customer_360_v2 AS

WITH base_cx360 AS (
    SELECT * FROM {CATALOG}.{SCHEMA_GOLD}.gold_customer_360_v2
),

churn_data AS (
    SELECT
        customer_id,
        churn_probability_90d AS churn_probability,
        churn_risk_tier,
        CASE WHEN churn_probability_90d >= 0.5 THEN 1 ELSE 0 END AS churn_prediction
    FROM {CATALOG}.{SCHEMA_ML}.churn_scores
),

clv_data AS (
    SELECT
        customer_id,
        clv_12m,
        clv_tier,
        predicted_purchases_12m
    FROM {CATALOG}.{SCHEMA_ML}.clv_scores
)

SELECT
    -- All existing columns from base
    b.customer_id,
    b.customer_name,
    b.age,
    b.gender,
    b.city,
    b.state,
    b.registration_date,
    b.registration_channel,
    b.loyalty_tier,
    b.is_active,
    b.preferred_payment_method,
    b.total_transactions,
    b.total_spend,
    b.last_purchase_date,
    b.days_since_purchase,
    b.latest_nps_score,
    b.avg_csat_score,
    b.nps_category,
    b.engagement_score_raw,
    b.digital_propensity_tier,
    b.customer_segment,

    -- NEW: Churn Model Columns (from NB 14)
    COALESCE(c.churn_probability, 0.0) AS churn_probability,
    COALESCE(c.churn_risk_tier, 'Unknown') AS churn_risk_tier,
    COALESCE(c.churn_prediction, 0) AS churn_prediction,
    -- Generate risk factors from base columns
    CONCAT_WS(', ',
        CASE WHEN b.days_since_purchase > 60 THEN 'High recency' END,
        CASE WHEN b.total_transactions < 5 THEN 'Low frequency' END,
        CASE WHEN b.engagement_score_raw < 0 THEN 'Low engagement' END,
        CASE WHEN b.nps_category = 'Detractor' THEN 'Detractor NPS' END
    ) AS churn_risk_factors,

    -- NEW: CLV Model Columns (from NB 15)
    COALESCE(v.clv_12m, 0.0) AS clv_12m,
    COALESCE(v.clv_tier, 'Bronze') AS clv_tier,
    COALESCE(v.predicted_purchases_12m, 0.0) AS predicted_purchases_12m,

    -- NEW: Customer Health Score (composite metric)
    -- Combines: churn risk (inverted), CLV, engagement, NPS
    ROUND(
        (
            -- Churn component (0-25 points): lower churn = higher score
            (1 - COALESCE(c.churn_probability, 0.5)) * 25 +

            -- CLV component (0-25 points): based on tier
            CASE COALESCE(v.clv_tier, 'Bronze')
                WHEN 'Platinum' THEN 25
                WHEN 'Gold' THEN 18
                WHEN 'Silver' THEN 12
                ELSE 6
            END +

            -- Engagement component (0-25 points): based on digital propensity
            CASE b.digital_propensity_tier
                WHEN 'High' THEN 25
                WHEN 'Medium' THEN 15
                ELSE 8
            END +

            -- NPS component (0-25 points)
            CASE b.nps_category
                WHEN 'Promoter' THEN 25
                WHEN 'Passive' THEN 15
                WHEN 'Detractor' THEN 5
                ELSE 10  -- NULL/Unknown
            END
        ), 1
    ) AS customer_health_score,

    -- Keep the timestamp
    CURRENT_TIMESTAMP() AS updated_at

FROM base_cx360 b
LEFT JOIN churn_data c ON b.customer_id = c.customer_id
LEFT JOIN clv_data v ON b.customer_id = v.customer_id
"""

spark.sql(rebuild_sql)
print("Rebuilt gold_customer_360_v2 with ML columns")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 5. Verify New Schema

# COMMAND ----------

# Get new schema
new_columns = spark.sql(f"DESCRIBE {CATALOG}.{SCHEMA_GOLD}.gold_customer_360_v2").collect()
new_col_count = len([c for c in new_columns if not c['col_name'].startswith('#')])

print(f"Column count: {current_col_count} -> {new_col_count} (added {new_col_count - current_col_count} columns)")

# List new columns
print("\nNew columns added:")
new_ml_cols = ['churn_probability', 'churn_risk_tier', 'churn_prediction', 'churn_risk_factors',
               'clv_12m', 'clv_tier', 'predicted_purchases_12m', 'customer_health_score']
for col in new_ml_cols:
    print(f"  - {col}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 6. Validate Data Quality

# COMMAND ----------

# Validation queries
print("=" * 60)
print("DATA QUALITY VALIDATION")
print("=" * 60)

# Row count
row_count = spark.sql(f"SELECT COUNT(*) FROM {CATALOG}.{SCHEMA_GOLD}.gold_customer_360_v2").collect()[0][0]
print(f"\nTotal rows: {row_count:,}")

# Churn distribution
print("\n--- Churn Risk Tier Distribution ---")
display(spark.sql(f"""
    SELECT
        churn_risk_tier,
        COUNT(*) as customer_count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as pct,
        ROUND(AVG(churn_probability), 3) as avg_probability
    FROM {CATALOG}.{SCHEMA_GOLD}.gold_customer_360_v2
    GROUP BY churn_risk_tier
    ORDER BY avg_probability DESC
"""))

# COMMAND ----------

# CLV distribution
print("--- CLV Tier Distribution ---")
display(spark.sql(f"""
    SELECT
        clv_tier,
        COUNT(*) as customer_count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as pct,
        ROUND(AVG(clv_12m), 2) as avg_clv,
        ROUND(SUM(clv_12m), 2) as total_clv
    FROM {CATALOG}.{SCHEMA_GOLD}.gold_customer_360_v2
    GROUP BY clv_tier
    ORDER BY avg_clv DESC
"""))

# COMMAND ----------

# Customer Health Score distribution
print("--- Customer Health Score Distribution ---")
display(spark.sql(f"""
    SELECT
        CASE
            WHEN customer_health_score >= 80 THEN 'Excellent (80-100)'
            WHEN customer_health_score >= 60 THEN 'Good (60-79)'
            WHEN customer_health_score >= 40 THEN 'Fair (40-59)'
            ELSE 'Poor (0-39)'
        END as health_category,
        COUNT(*) as customer_count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as pct,
        ROUND(AVG(customer_health_score), 1) as avg_score,
        ROUND(AVG(clv_12m), 2) as avg_clv
    FROM {CATALOG}.{SCHEMA_GOLD}.gold_customer_360_v2
    GROUP BY
        CASE
            WHEN customer_health_score >= 80 THEN 'Excellent (80-100)'
            WHEN customer_health_score >= 60 THEN 'Good (60-79)'
            WHEN customer_health_score >= 40 THEN 'Fair (40-59)'
            ELSE 'Poor (0-39)'
        END
    ORDER BY avg_score DESC
"""))

# COMMAND ----------

# MAGIC %md
# MAGIC ## 7. Sample Records

# COMMAND ----------

# Show sample records with new columns
print("--- Sample Records with ML Columns ---")
display(spark.sql(f"""
    SELECT
        customer_id,
        customer_name,
        customer_segment,
        nps_category,
        -- Churn columns
        ROUND(churn_probability, 3) as churn_prob,
        churn_risk_tier,
        -- CLV columns
        ROUND(clv_12m, 2) as clv_12m,
        clv_tier,
        ROUND(predicted_purchases_12m, 1) as pred_purchases,
        -- Health score
        customer_health_score
    FROM {CATALOG}.{SCHEMA_GOLD}.gold_customer_360_v2
    ORDER BY customer_health_score DESC
    LIMIT 20
"""))

# COMMAND ----------

# MAGIC %md
# MAGIC ## 8. Cross-Analysis: Segment vs ML Metrics

# COMMAND ----------

# Customer segment vs churn risk
print("--- Customer Segment vs Churn Risk ---")
display(spark.sql(f"""
    SELECT
        customer_segment,
        churn_risk_tier,
        COUNT(*) as customers,
        ROUND(AVG(churn_probability), 3) as avg_churn_prob,
        ROUND(AVG(clv_12m), 2) as avg_clv,
        ROUND(AVG(customer_health_score), 1) as avg_health
    FROM {CATALOG}.{SCHEMA_GOLD}.gold_customer_360_v2
    GROUP BY customer_segment, churn_risk_tier
    ORDER BY customer_segment, churn_risk_tier
"""))

# COMMAND ----------

# High value at-risk customers (action priority)
print("--- HIGH VALUE AT-RISK CUSTOMERS (Action Priority) ---")
display(spark.sql(f"""
    SELECT
        customer_id,
        customer_name,
        customer_segment,
        ROUND(clv_12m, 2) as clv_12m,
        clv_tier,
        ROUND(churn_probability, 3) as churn_prob,
        churn_risk_tier,
        churn_risk_factors,
        customer_health_score
    FROM {CATALOG}.{SCHEMA_GOLD}.gold_customer_360_v2
    WHERE clv_tier IN ('Platinum', 'Gold')
      AND churn_risk_tier IN ('High', 'Critical')
    ORDER BY clv_12m DESC
    LIMIT 20
"""))

# COMMAND ----------

# MAGIC %md
# MAGIC ## Summary
# MAGIC
# MAGIC **Columns Added (8 new columns):**
# MAGIC
# MAGIC | Column | Source | Description |
# MAGIC |--------|--------|-------------|
# MAGIC | `churn_probability` | NB 14 | Probability of churning (0-1) |
# MAGIC | `churn_risk_tier` | NB 14 | Low/Medium/High/Critical |
# MAGIC | `churn_prediction` | NB 14 | Binary: 1=will churn, 0=won't |
# MAGIC | `churn_risk_factors` | NB 14 | Key factors driving churn risk |
# MAGIC | `clv_12m` | NB 15 | 12-month customer lifetime value |
# MAGIC | `clv_tier` | NB 15 | Bronze/Silver/Gold/Platinum |
# MAGIC | `predicted_purchases_12m` | NB 15 | Expected purchases in next 12 months |
# MAGIC | `customer_health_score` | Composite | 0-100 score combining all metrics |
# MAGIC
# MAGIC **Customer Health Score Formula:**
# MAGIC - Churn component: (1 - churn_probability) × 25
# MAGIC - CLV component: Tier-based (6-25 points)
# MAGIC - Engagement component: Propensity tier (8-25 points)
# MAGIC - NPS component: Category-based (5-25 points)
# MAGIC
# MAGIC **Key Use Cases:**
# MAGIC 1. Identify high-value customers at risk of churning
# MAGIC 2. Prioritize retention campaigns by health score
# MAGIC 3. Forecast future revenue from CLV predictions
# MAGIC 4. Segment customers for targeted marketing
