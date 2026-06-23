# Databricks notebook source
# MAGIC %md
# MAGIC # 16 - Price Optimization Model
# MAGIC
# MAGIC This notebook creates price optimization recommendations using:
# MAGIC - Price elasticity analysis by product category
# MAGIC - Analytical markup rules based on department performance
# MAGIC - Revenue and margin optimization
# MAGIC
# MAGIC **Outputs:**
# MAGIC - `retail_ml.price_recommendations` - Optimal price recommendations per product
# MAGIC - `retail_ml.price_elasticity_metrics` - Elasticity estimates by category

# COMMAND ----------

# MAGIC %md
# MAGIC ## 1. Setup & Imports

# COMMAND ----------

import pandas as pd
import numpy as np
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

import mlflow
from pyspark.sql import functions as F
from pyspark.sql.window import Window
from pyspark.sql.types import DoubleType, StringType

print("Libraries loaded successfully")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 2. Configuration

# COMMAND ----------

# Catalog and schema configuration
CATALOG = "hive_metastore"
SCHEMA_SILVER = "retail_silver"
SCHEMA_GOLD = "retail_gold"
SCHEMA_ML = "retail_ml"

# Price optimization parameters
MIN_TRANSACTIONS_FOR_ANALYSIS = 100  # Minimum transactions per product
PRICE_CHANGE_THRESHOLD = 0.05        # 5% price change to detect elasticity
TARGET_MARGIN_PCT = 0.30             # Target margin of 30%
MAX_PRICE_INCREASE_PCT = 0.15        # Maximum 15% price increase
MAX_PRICE_DECREASE_PCT = 0.10        # Maximum 10% price decrease

# MLflow experiment
EXPERIMENT_NAME = "/Shared/retail_price_optimization"
mlflow.set_experiment(EXPERIMENT_NAME)

print("Configuration loaded")

# COMMAND ----------

# Ensure ML schema exists
spark.sql(f"CREATE SCHEMA IF NOT EXISTS {CATALOG}.{SCHEMA_ML}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 3. Load Product Sales Data

# COMMAND ----------

# Get product-level sales data with price variations
product_sales_df = spark.sql(f"""
    WITH daily_product_sales AS (
        SELECT
            s.product_id,
            p.product_name,
            p.department,
            p.category_l1 AS category,
            p.category_l2 AS subcategory,
            TO_DATE(CAST(s.date_id AS STRING), 'yyyyMMdd') AS sale_date,
            AVG(s.unit_mrp) AS avg_unit_price,
            AVG(s.unit_cost_price) AS unit_cost,
            SUM(s.quantity_sold) AS total_quantity,
            SUM(s.net_amount) AS total_revenue,
            COUNT(DISTINCT s.txn_id) AS transaction_count
        FROM {CATALOG}.{SCHEMA_SILVER}.fact_pos_sales s
        JOIN {CATALOG}.{SCHEMA_SILVER}.dim_product p ON s.product_id = p.product_id
        WHERE s.unit_mrp > 0 AND s.quantity_sold > 0
        GROUP BY s.product_id, p.product_name, p.department, p.category_l1,
                 p.category_l2, TO_DATE(CAST(s.date_id AS STRING), 'yyyyMMdd')
    )
    SELECT
        product_id,
        product_name,
        department,
        category,
        subcategory,
        unit_cost,
        sale_date,
        avg_unit_price,
        total_quantity,
        total_revenue,
        transaction_count,
        -- Calculate margin
        ROUND((avg_unit_price - unit_cost) / avg_unit_price, 4) AS margin_pct
    FROM daily_product_sales
    ORDER BY product_id, sale_date
""")

print(f"Loaded {product_sales_df.count():,} product-day records")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 4. Calculate Price Elasticity by Category

# COMMAND ----------

# Aggregate to calculate price elasticity at category level
# Using price-quantity relationship

category_elasticity_df = spark.sql(f"""
    WITH category_daily AS (
        SELECT
            p.department,
            p.category_l1 AS category,
            TO_DATE(CAST(s.date_id AS STRING), 'yyyyMMdd') AS sale_date,
            AVG(s.unit_mrp) AS avg_price,
            SUM(s.quantity_sold) AS total_quantity,
            COUNT(DISTINCT s.txn_id) AS transactions
        FROM {CATALOG}.{SCHEMA_SILVER}.fact_pos_sales s
        JOIN {CATALOG}.{SCHEMA_SILVER}.dim_product p ON s.product_id = p.product_id
        WHERE s.unit_mrp > 0 AND s.quantity_sold > 0
        GROUP BY p.department, p.category_l1, TO_DATE(CAST(s.date_id AS STRING), 'yyyyMMdd')
    ),

    category_stats AS (
        SELECT
            department,
            category,
            AVG(avg_price) AS mean_price,
            STDDEV(avg_price) AS std_price,
            AVG(total_quantity) AS mean_quantity,
            STDDEV(total_quantity) AS std_quantity,
            COUNT(*) AS days_with_sales,
            -- Calculate coefficient of variation for price
            STDDEV(avg_price) / AVG(avg_price) AS price_cv,
            -- Correlation proxy using covariance
            COVAR_SAMP(avg_price, total_quantity) AS price_qty_cov
        FROM category_daily
        GROUP BY department, category
        HAVING COUNT(*) >= 30  -- At least 30 days of data
    )

    SELECT
        department,
        category,
        mean_price,
        std_price,
        mean_quantity,
        std_quantity,
        days_with_sales,
        price_cv,
        price_qty_cov,
        -- Estimate elasticity: negative cov suggests elastic (price up, qty down)
        -- Normalize by variance for elasticity estimate
        CASE
            WHEN std_price > 0 AND std_quantity > 0
            THEN ROUND(price_qty_cov / (std_price * std_quantity), 3)
            ELSE 0
        END AS elasticity_estimate
    FROM category_stats
    ORDER BY department, category
""")

print(f"Calculated elasticity for {category_elasticity_df.count()} categories")
display(category_elasticity_df)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 5. Product-Level Analysis

# COMMAND ----------

# Get product-level metrics for price optimization
product_metrics_df = spark.sql(f"""
    WITH product_stats AS (
        SELECT
            s.product_id,
            p.product_name,
            p.department,
            p.category_l1 AS category,
            AVG(s.unit_cost_price) AS unit_cost,
            COUNT(*) AS total_transactions,
            SUM(s.quantity_sold) AS total_units_sold,
            SUM(s.net_amount) AS total_revenue,
            AVG(s.unit_mrp) AS avg_selling_price,
            MIN(s.unit_mrp) AS min_price,
            MAX(s.unit_mrp) AS max_price,
            STDDEV(s.unit_mrp) AS price_std,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.unit_mrp) AS median_price
        FROM {CATALOG}.{SCHEMA_SILVER}.fact_pos_sales s
        JOIN {CATALOG}.{SCHEMA_SILVER}.dim_product p ON s.product_id = p.product_id
        WHERE s.unit_mrp > 0 AND s.quantity_sold > 0
        GROUP BY s.product_id, p.product_name, p.department, p.category_l1
        HAVING COUNT(*) >= {MIN_TRANSACTIONS_FOR_ANALYSIS}
    )

    SELECT
        product_id,
        product_name,
        department,
        category,
        unit_cost,
        total_transactions,
        total_units_sold,
        total_revenue,
        avg_selling_price,
        min_price,
        max_price,
        price_std,
        median_price,
        -- Calculate current margin
        ROUND((avg_selling_price - unit_cost) / avg_selling_price, 4) AS current_margin,
        -- Price range indicator
        ROUND((max_price - min_price) / avg_selling_price, 4) AS price_range_pct
    FROM product_stats
    ORDER BY total_revenue DESC
""")

print(f"Analyzed {product_metrics_df.count():,} products")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 6. Generate Price Recommendations

# COMMAND ----------

# Convert to pandas for optimization logic
product_pdf = product_metrics_df.toPandas()
elasticity_pdf = category_elasticity_df.toPandas()

# Merge elasticity estimates
product_pdf = product_pdf.merge(
    elasticity_pdf[['department', 'category', 'elasticity_estimate']],
    on=['department', 'category'],
    how='left'
)
product_pdf['elasticity_estimate'] = product_pdf['elasticity_estimate'].fillna(-0.5)  # Default elasticity

def calculate_optimal_price(row):
    """
    Calculate optimal price based on:
    1. Current margin vs target margin
    2. Price elasticity
    3. Constraints on price changes
    """
    current_price = row['avg_selling_price']
    cost = row['unit_cost']
    current_margin = row['current_margin']
    elasticity = row['elasticity_estimate']

    # Target price based on margin
    target_margin_price = cost / (1 - TARGET_MARGIN_PCT) if TARGET_MARGIN_PCT < 1 else cost * 2

    # Calculate price change needed
    price_change_pct = (target_margin_price - current_price) / current_price

    # Adjust based on elasticity
    # High elasticity (more negative) = be more conservative with increases
    # Low elasticity (less negative) = can be more aggressive
    elasticity_factor = 1.0
    if elasticity < -0.7:  # Elastic
        elasticity_factor = 0.5  # More conservative
    elif elasticity > -0.3:  # Inelastic
        elasticity_factor = 1.2  # Can be more aggressive

    adjusted_change_pct = price_change_pct * elasticity_factor

    # Apply constraints
    if adjusted_change_pct > MAX_PRICE_INCREASE_PCT:
        adjusted_change_pct = MAX_PRICE_INCREASE_PCT
    elif adjusted_change_pct < -MAX_PRICE_DECREASE_PCT:
        adjusted_change_pct = -MAX_PRICE_DECREASE_PCT

    optimal_price = current_price * (1 + adjusted_change_pct)

    return optimal_price, adjusted_change_pct

# Apply optimization
results = product_pdf.apply(calculate_optimal_price, axis=1, result_type='expand')
product_pdf['recommended_price'] = results[0]
product_pdf['price_change_pct'] = results[1]

# Calculate projected metrics
product_pdf['projected_margin'] = (product_pdf['recommended_price'] - product_pdf['unit_cost']) / product_pdf['recommended_price']

# Estimate revenue impact (simplified: assume elasticity relationship)
product_pdf['projected_qty_change'] = product_pdf['price_change_pct'] * product_pdf['elasticity_estimate']
product_pdf['projected_revenue'] = product_pdf['total_revenue'] * (1 + product_pdf['price_change_pct']) * (1 + product_pdf['projected_qty_change'])
product_pdf['revenue_impact'] = product_pdf['projected_revenue'] - product_pdf['total_revenue']

# Assign recommendation priority
def assign_priority(row):
    margin_gap = TARGET_MARGIN_PCT - row['current_margin']
    revenue_impact = row['revenue_impact']

    if margin_gap > 0.1 and revenue_impact > 0:
        return 'High'
    elif margin_gap > 0.05 or revenue_impact > 1000:
        return 'Medium'
    else:
        return 'Low'

product_pdf['recommendation_priority'] = product_pdf.apply(assign_priority, axis=1)

print(f"Generated recommendations for {len(product_pdf):,} products")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 7. Save Price Recommendations

# COMMAND ----------

with mlflow.start_run(run_name="price_optimization") as run:

    # Log parameters
    mlflow.log_params({
        "min_transactions": MIN_TRANSACTIONS_FOR_ANALYSIS,
        "target_margin_pct": TARGET_MARGIN_PCT,
        "max_price_increase_pct": MAX_PRICE_INCREASE_PCT,
        "max_price_decrease_pct": MAX_PRICE_DECREASE_PCT,
        "products_analyzed": len(product_pdf)
    })

    # Log metrics
    mlflow.log_metrics({
        "avg_current_margin": product_pdf['current_margin'].mean(),
        "avg_projected_margin": product_pdf['projected_margin'].mean(),
        "total_revenue_impact": product_pdf['revenue_impact'].sum(),
        "products_with_increase": (product_pdf['price_change_pct'] > 0).sum(),
        "products_with_decrease": (product_pdf['price_change_pct'] < 0).sum()
    })

    run_id = run.info.run_id

    print(f"MLflow Run ID: {run_id}")
    print(f"\nOptimization Summary:")
    print(f"  Average current margin: {product_pdf['current_margin'].mean():.1%}")
    print(f"  Average projected margin: {product_pdf['projected_margin'].mean():.1%}")
    print(f"  Total projected revenue impact: ${product_pdf['revenue_impact'].sum():,.2f}")

# COMMAND ----------

# Prepare final output
recommendations_pdf = product_pdf[[
    'product_id', 'product_name', 'department', 'category',
    'unit_cost', 'avg_selling_price', 'recommended_price', 'price_change_pct',
    'current_margin', 'projected_margin', 'elasticity_estimate',
    'total_transactions', 'total_revenue', 'projected_revenue', 'revenue_impact',
    'recommendation_priority'
]].copy()

# Convert to Spark DataFrame
recommendations_spark_df = spark.createDataFrame(recommendations_pdf)
recommendations_spark_df = recommendations_spark_df \
    .withColumn("model_run_id", F.lit(run_id)) \
    .withColumn("created_at", F.current_timestamp())

# Rename columns for clarity
recommendations_spark_df = recommendations_spark_df.select(
    F.col("product_id"),
    F.col("product_name"),
    F.col("department"),
    F.col("category"),
    F.col("unit_cost"),
    F.col("avg_selling_price").alias("current_price"),
    F.col("recommended_price"),
    F.round(F.col("price_change_pct") * 100, 2).alias("price_change_pct"),
    F.round(F.col("current_margin") * 100, 2).alias("current_margin_pct"),
    F.round(F.col("projected_margin") * 100, 2).alias("projected_margin_pct"),
    F.col("elasticity_estimate"),
    F.col("total_transactions"),
    F.round(F.col("total_revenue"), 2).alias("current_revenue"),
    F.round(F.col("projected_revenue"), 2).alias("projected_revenue"),
    F.round(F.col("revenue_impact"), 2).alias("revenue_impact"),
    F.col("recommendation_priority"),
    F.col("model_run_id"),
    F.col("created_at")
)

# Write to Delta table
recommendations_spark_df.write.format("delta") \
    .mode("overwrite") \
    .option("overwriteSchema", "true") \
    .saveAsTable(f"{CATALOG}.{SCHEMA_ML}.price_recommendations")

print(f"Saved {recommendations_spark_df.count():,} price recommendations to {CATALOG}.{SCHEMA_ML}.price_recommendations")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 8. Save Elasticity Metrics

# COMMAND ----------

# Save elasticity metrics
elasticity_spark_df = spark.createDataFrame(elasticity_pdf)
elasticity_spark_df = elasticity_spark_df \
    .withColumn("model_run_id", F.lit(run_id)) \
    .withColumn("created_at", F.current_timestamp())

elasticity_spark_df.write.format("delta") \
    .mode("overwrite") \
    .option("overwriteSchema", "true") \
    .saveAsTable(f"{CATALOG}.{SCHEMA_ML}.price_elasticity_metrics")

print(f"Saved elasticity metrics to {CATALOG}.{SCHEMA_ML}.price_elasticity_metrics")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 9. Summary & Recommendations

# COMMAND ----------

# High priority recommendations
print("HIGH PRIORITY RECOMMENDATIONS (Top 10):")
display(spark.sql(f"""
    SELECT
        product_name,
        department,
        category,
        ROUND(current_price, 2) as current_price,
        ROUND(recommended_price, 2) as recommended_price,
        price_change_pct,
        current_margin_pct,
        projected_margin_pct,
        ROUND(revenue_impact, 2) as revenue_impact
    FROM {CATALOG}.{SCHEMA_ML}.price_recommendations
    WHERE recommendation_priority = 'High'
    ORDER BY revenue_impact DESC
    LIMIT 10
"""))

# COMMAND ----------

# Summary by department
print("SUMMARY BY DEPARTMENT:")
display(spark.sql(f"""
    SELECT
        department,
        COUNT(*) as products,
        ROUND(AVG(current_margin_pct), 1) as avg_current_margin,
        ROUND(AVG(projected_margin_pct), 1) as avg_projected_margin,
        SUM(CASE WHEN price_change_pct > 0 THEN 1 ELSE 0 END) as price_increases,
        SUM(CASE WHEN price_change_pct < 0 THEN 1 ELSE 0 END) as price_decreases,
        ROUND(SUM(revenue_impact), 2) as total_revenue_impact
    FROM {CATALOG}.{SCHEMA_ML}.price_recommendations
    GROUP BY department
    ORDER BY total_revenue_impact DESC
"""))

# COMMAND ----------

# MAGIC %md
# MAGIC ## Summary
# MAGIC
# MAGIC **Analysis Performed:**
# MAGIC - Price elasticity estimation by product category
# MAGIC - Margin analysis for all products
# MAGIC - Optimal price calculation with constraints
# MAGIC
# MAGIC **Outputs Created:**
# MAGIC - `retail_ml.price_recommendations` - Price optimization recommendations per product
# MAGIC - `retail_ml.price_elasticity_metrics` - Category-level elasticity estimates
# MAGIC
# MAGIC **Key Considerations:**
# MAGIC - Target margin: 30%
# MAGIC - Max price increase: 15%
# MAGIC - Max price decrease: 10%
# MAGIC - Elasticity-adjusted recommendations
# MAGIC
# MAGIC **Next Steps:**
# MAGIC - Review high-priority recommendations
# MAGIC - Validate with business stakeholders before implementation
# MAGIC - Consider A/B testing for price changes
