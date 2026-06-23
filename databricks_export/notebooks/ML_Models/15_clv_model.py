# Databricks notebook source
# MAGIC %md
# MAGIC # 15 - Customer Lifetime Value Model (BG/NBD + Gamma-Gamma)
# MAGIC
# MAGIC This notebook predicts Customer Lifetime Value using probabilistic models:
# MAGIC - **BG/NBD**: Predicts future purchase frequency
# MAGIC - **Gamma-Gamma**: Predicts average transaction value
# MAGIC - **CLV**: Frequency × Monetary Value over prediction horizon
# MAGIC
# MAGIC **Outputs:**
# MAGIC - `retail_ml.clv_scores` - CLV predictions per customer
# MAGIC - `retail_ml.clv_model_metrics` - Model validation metrics

# COMMAND ----------

# MAGIC %pip install lifetimes mlflow

# COMMAND ----------

dbutils.library.restartPython()

# COMMAND ----------

# MAGIC %md
# MAGIC ## 1. Setup & Imports

# COMMAND ----------

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

from lifetimes import BetaGeoFitter, GammaGammaFitter
from lifetimes.utils import summary_data_from_transaction_data, calibration_and_holdout_data

import mlflow
import mlflow.pyfunc
from pyspark.sql import functions as F
from pyspark.sql.types import DoubleType, IntegerType

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

# Model parameters
PREDICTION_HORIZON_MONTHS = 12  # Predict CLV for next 12 months
CALIBRATION_PERIOD_END = 180   # Days for calibration (train)
HOLDOUT_PERIOD_END = 90        # Days for holdout (validation)

# MLflow experiment
EXPERIMENT_NAME = "/Shared/retail_clv_model"
mlflow.set_experiment(EXPERIMENT_NAME)

print(f"Prediction horizon: {PREDICTION_HORIZON_MONTHS} months")

# COMMAND ----------

# Ensure ML schema exists
spark.sql(f"CREATE SCHEMA IF NOT EXISTS {CATALOG}.{SCHEMA_ML}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 3. Prepare RFM Transaction Data

# COMMAND ----------

# Get transaction data from POS and Online sales
transactions_df = spark.sql(f"""
    WITH all_transactions AS (
        -- POS Sales
        SELECT
            customer_id,
            TO_DATE(CAST(date_id AS STRING), 'yyyyMMdd') AS transaction_date,
            net_amount AS monetary_value
        FROM {CATALOG}.{SCHEMA_SILVER}.fact_pos_sales
        WHERE customer_id IS NOT NULL AND net_amount > 0

        UNION ALL

        -- Online Sales (non-cancelled)
        SELECT
            customer_id,
            TO_DATE(CAST(date_id AS STRING), 'yyyyMMdd') AS transaction_date,
            net_amount AS monetary_value
        FROM {CATALOG}.{SCHEMA_SILVER}.fact_online_sales
        WHERE customer_id IS NOT NULL AND is_cancelled = FALSE AND net_amount > 0
    )
    SELECT
        customer_id,
        transaction_date,
        SUM(monetary_value) AS monetary_value
    FROM all_transactions
    GROUP BY customer_id, transaction_date
    ORDER BY customer_id, transaction_date
""")

# Convert to pandas for lifetimes library
txn_pdf = transactions_df.toPandas()
txn_pdf['transaction_date'] = pd.to_datetime(txn_pdf['transaction_date'])

print(f"Total transactions: {len(txn_pdf):,}")
print(f"Unique customers: {txn_pdf['customer_id'].nunique():,}")
print(f"Date range: {txn_pdf['transaction_date'].min()} to {txn_pdf['transaction_date'].max()}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 4. Create RFM Summary Data

# COMMAND ----------

# Define observation period end date
observation_period_end = txn_pdf['transaction_date'].max()
print(f"Observation period end: {observation_period_end}")

# Create RFM summary using lifetimes
rfm_summary = summary_data_from_transaction_data(
    txn_pdf,
    customer_id_col='customer_id',
    datetime_col='transaction_date',
    monetary_value_col='monetary_value',
    observation_period_end=observation_period_end,
    freq='D'  # Daily frequency
)

# Filter customers with at least 2 transactions (required for Gamma-Gamma)
rfm_summary_filtered = rfm_summary[rfm_summary['frequency'] > 0].copy()

print(f"\nRFM Summary Statistics:")
print(f"  Total customers: {len(rfm_summary):,}")
print(f"  Customers with repeat purchases: {len(rfm_summary_filtered):,}")
print(f"\nRFM Metrics:")
print(rfm_summary_filtered[['frequency', 'recency', 'T', 'monetary_value']].describe())

# COMMAND ----------

# MAGIC %md
# MAGIC ## 5. Train BG/NBD Model (Purchase Frequency)

# COMMAND ----------

with mlflow.start_run(run_name="clv_bgnbd_model") as run:

    # Initialize and fit BG/NBD model
    bgf = BetaGeoFitter(penalizer_coef=0.01)
    bgf.fit(
        rfm_summary_filtered['frequency'],
        rfm_summary_filtered['recency'],
        rfm_summary_filtered['T']
    )

    # Log model parameters
    mlflow.log_params({
        "model_type": "BG/NBD",
        "penalizer_coef": 0.01,
        "n_customers": len(rfm_summary_filtered),
        "prediction_horizon_months": PREDICTION_HORIZON_MONTHS
    })

    # Log fitted parameters
    mlflow.log_params({
        "bgf_r": round(bgf.params_['r'], 4),
        "bgf_alpha": round(bgf.params_['alpha'], 4),
        "bgf_a": round(bgf.params_['a'], 4),
        "bgf_b": round(bgf.params_['b'], 4)
    })

    print("BG/NBD Model Parameters:")
    print(f"  r (shape of gamma for lambda): {bgf.params_['r']:.4f}")
    print(f"  alpha (scale of gamma for lambda): {bgf.params_['alpha']:.4f}")
    print(f"  a (shape of beta for p): {bgf.params_['a']:.4f}")
    print(f"  b (shape of beta for p): {bgf.params_['b']:.4f}")

    # Predict expected purchases in next N months
    prediction_days = PREDICTION_HORIZON_MONTHS * 30
    rfm_summary_filtered['predicted_purchases'] = bgf.conditional_expected_number_of_purchases_up_to_time(
        prediction_days,
        rfm_summary_filtered['frequency'],
        rfm_summary_filtered['recency'],
        rfm_summary_filtered['T']
    )

    # Predict probability of being alive
    rfm_summary_filtered['prob_alive'] = bgf.conditional_probability_alive(
        rfm_summary_filtered['frequency'],
        rfm_summary_filtered['recency'],
        rfm_summary_filtered['T']
    )

    bgnbd_run_id = run.info.run_id
    print(f"\nBG/NBD Run ID: {bgnbd_run_id}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 6. Train Gamma-Gamma Model (Monetary Value)

# COMMAND ----------

with mlflow.start_run(run_name="clv_gamma_gamma_model") as run:

    # Gamma-Gamma requires customers with frequency > 0
    # and positive monetary value
    gg_data = rfm_summary_filtered[rfm_summary_filtered['monetary_value'] > 0].copy()

    # Check correlation (should be low for Gamma-Gamma assumption)
    correlation = gg_data['frequency'].corr(gg_data['monetary_value'])
    print(f"Frequency-Monetary correlation: {correlation:.4f}")
    print("(Gamma-Gamma assumes this is close to 0)")

    # Initialize and fit Gamma-Gamma model
    ggf = GammaGammaFitter(penalizer_coef=0.01)
    ggf.fit(
        gg_data['frequency'],
        gg_data['monetary_value']
    )

    # Log model parameters
    mlflow.log_params({
        "model_type": "Gamma-Gamma",
        "penalizer_coef": 0.01,
        "n_customers": len(gg_data),
        "freq_monetary_correlation": round(correlation, 4)
    })

    # Log fitted parameters
    mlflow.log_params({
        "gg_p": round(ggf.params_['p'], 4),
        "gg_q": round(ggf.params_['q'], 4),
        "gg_v": round(ggf.params_['v'], 4)
    })

    print("\nGamma-Gamma Model Parameters:")
    print(f"  p: {ggf.params_['p']:.4f}")
    print(f"  q: {ggf.params_['q']:.4f}")
    print(f"  v: {ggf.params_['v']:.4f}")

    # Predict expected average transaction value
    gg_data['expected_avg_value'] = ggf.conditional_expected_average_profit(
        gg_data['frequency'],
        gg_data['monetary_value']
    )

    gg_run_id = run.info.run_id
    print(f"\nGamma-Gamma Run ID: {gg_run_id}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 7. Calculate Customer Lifetime Value

# COMMAND ----------

with mlflow.start_run(run_name="clv_combined_model") as run:

    # Calculate CLV using both models
    # CLV = Expected Purchases × Expected Average Value

    # Merge predictions
    clv_data = rfm_summary_filtered.copy()
    clv_data = clv_data.merge(
        gg_data[['expected_avg_value']],
        left_index=True,
        right_index=True,
        how='left'
    )

    # For customers without Gamma-Gamma prediction, use mean monetary value
    mean_monetary = clv_data['monetary_value'].mean()
    clv_data['expected_avg_value'] = clv_data['expected_avg_value'].fillna(mean_monetary)

    # Calculate CLV
    clv_data['clv'] = clv_data['predicted_purchases'] * clv_data['expected_avg_value']

    # Apply discount rate for present value (optional, using 10% annual)
    monthly_discount_rate = 0.10 / 12
    discount_factor = sum([1 / (1 + monthly_discount_rate) ** i for i in range(1, PREDICTION_HORIZON_MONTHS + 1)])
    clv_data['clv_discounted'] = clv_data['clv'] * (discount_factor / PREDICTION_HORIZON_MONTHS)

    # Create CLV tiers
    clv_percentiles = clv_data['clv'].quantile([0.25, 0.5, 0.75])

    def assign_clv_tier(clv):
        if clv >= clv_percentiles[0.75]:
            return 'Platinum'
        elif clv >= clv_percentiles[0.5]:
            return 'Gold'
        elif clv >= clv_percentiles[0.25]:
            return 'Silver'
        else:
            return 'Bronze'

    clv_data['clv_tier'] = clv_data['clv'].apply(assign_clv_tier)

    # Log metrics
    mlflow.log_metrics({
        "mean_clv": clv_data['clv'].mean(),
        "median_clv": clv_data['clv'].median(),
        "total_clv": clv_data['clv'].sum(),
        "mean_predicted_purchases": clv_data['predicted_purchases'].mean(),
        "mean_prob_alive": clv_data['prob_alive'].mean()
    })

    print(f"\nCLV Statistics:")
    print(f"  Mean CLV: ${clv_data['clv'].mean():,.2f}")
    print(f"  Median CLV: ${clv_data['clv'].median():,.2f}")
    print(f"  Total CLV: ${clv_data['clv'].sum():,.2f}")
    print(f"\nCLV Tier Distribution:")
    print(clv_data['clv_tier'].value_counts())

    combined_run_id = run.info.run_id

# COMMAND ----------

# MAGIC %md
# MAGIC ## 8. Save CLV Scores to Delta Table

# COMMAND ----------

# Prepare final dataframe
clv_output = clv_data.reset_index()[['customer_id', 'frequency', 'recency', 'T',
                                      'monetary_value', 'predicted_purchases',
                                      'prob_alive', 'expected_avg_value',
                                      'clv', 'clv_discounted', 'clv_tier']]

# Convert to Spark DataFrame
clv_spark_df = spark.createDataFrame(clv_output)

# Add metadata columns
clv_spark_df = clv_spark_df.withColumn("prediction_horizon_months", F.lit(PREDICTION_HORIZON_MONTHS)) \
                           .withColumn("model_run_id", F.lit(combined_run_id)) \
                           .withColumn("scored_at", F.current_timestamp())

# Rename columns for clarity
clv_spark_df = clv_spark_df.select(
    F.col("customer_id"),
    F.col("frequency").alias("purchase_frequency"),
    F.col("recency").alias("recency_days"),
    F.col("T").alias("customer_age_days"),
    F.col("monetary_value").alias("avg_transaction_value"),
    F.col("predicted_purchases").alias("predicted_purchases_12m"),
    F.col("prob_alive").alias("probability_alive"),
    F.col("expected_avg_value").alias("expected_avg_transaction"),
    F.col("clv").alias("clv_12m"),
    F.col("clv_discounted").alias("clv_12m_discounted"),
    F.col("clv_tier"),
    F.col("prediction_horizon_months"),
    F.col("model_run_id"),
    F.col("scored_at")
)

# Write to Delta table
clv_spark_df.write.format("delta") \
    .mode("overwrite") \
    .option("overwriteSchema", "true") \
    .saveAsTable(f"{CATALOG}.{SCHEMA_ML}.clv_scores")

print(f"Saved {clv_spark_df.count():,} CLV scores to {CATALOG}.{SCHEMA_ML}.clv_scores")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 9. Save Model Metrics

# COMMAND ----------

# Create metrics summary
metrics_data = {
    'metric_name': [
        'total_customers_scored',
        'mean_clv_12m',
        'median_clv_12m',
        'total_clv_12m',
        'mean_predicted_purchases',
        'mean_probability_alive',
        'platinum_customers',
        'gold_customers',
        'silver_customers',
        'bronze_customers',
        'bgf_r', 'bgf_alpha', 'bgf_a', 'bgf_b',
        'gg_p', 'gg_q', 'gg_v'
    ],
    'metric_value': [
        len(clv_data),
        clv_data['clv'].mean(),
        clv_data['clv'].median(),
        clv_data['clv'].sum(),
        clv_data['predicted_purchases'].mean(),
        clv_data['prob_alive'].mean(),
        (clv_data['clv_tier'] == 'Platinum').sum(),
        (clv_data['clv_tier'] == 'Gold').sum(),
        (clv_data['clv_tier'] == 'Silver').sum(),
        (clv_data['clv_tier'] == 'Bronze').sum(),
        bgf.params_['r'], bgf.params_['alpha'], bgf.params_['a'], bgf.params_['b'],
        ggf.params_['p'], ggf.params_['q'], ggf.params_['v']
    ]
}

metrics_pdf = pd.DataFrame(metrics_data)
metrics_spark_df = spark.createDataFrame(metrics_pdf)
metrics_spark_df = metrics_spark_df.withColumn("model_run_id", F.lit(combined_run_id)) \
                                   .withColumn("created_at", F.current_timestamp())

metrics_spark_df.write.format("delta") \
    .mode("overwrite") \
    .option("overwriteSchema", "true") \
    .saveAsTable(f"{CATALOG}.{SCHEMA_ML}.clv_model_metrics")

print(f"Saved model metrics to {CATALOG}.{SCHEMA_ML}.clv_model_metrics")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 10. Validation & Summary

# COMMAND ----------

# Display CLV distribution by tier
display(spark.sql(f"""
    SELECT
        clv_tier,
        COUNT(*) as customer_count,
        ROUND(AVG(clv_12m), 2) as avg_clv,
        ROUND(MIN(clv_12m), 2) as min_clv,
        ROUND(MAX(clv_12m), 2) as max_clv,
        ROUND(SUM(clv_12m), 2) as total_clv
    FROM {CATALOG}.{SCHEMA_ML}.clv_scores
    GROUP BY clv_tier
    ORDER BY avg_clv DESC
"""))

# COMMAND ----------

# Top 10 highest CLV customers
display(spark.sql(f"""
    SELECT
        c.customer_id,
        cx.customer_name,
        cx.customer_segment,
        ROUND(c.clv_12m, 2) as clv_12m,
        c.clv_tier,
        ROUND(c.predicted_purchases_12m, 1) as predicted_purchases,
        ROUND(c.probability_alive, 3) as prob_alive
    FROM {CATALOG}.{SCHEMA_ML}.clv_scores c
    LEFT JOIN {CATALOG}.{SCHEMA_GOLD}.gold_customer_360_v2 cx ON c.customer_id = cx.customer_id
    ORDER BY c.clv_12m DESC
    LIMIT 10
"""))

# COMMAND ----------

# MAGIC %md
# MAGIC ## Summary
# MAGIC
# MAGIC **Models Trained:**
# MAGIC - BG/NBD model for purchase frequency prediction
# MAGIC - Gamma-Gamma model for monetary value prediction
# MAGIC
# MAGIC **Outputs Created:**
# MAGIC - `retail_ml.clv_scores` - CLV predictions for all repeat customers
# MAGIC - `retail_ml.clv_model_metrics` - Model parameters and validation metrics
# MAGIC
# MAGIC **Key Metrics:**
# MAGIC - 12-month CLV predictions
# MAGIC - Probability of being "alive" (active customer)
# MAGIC - CLV Tiers: Platinum, Gold, Silver, Bronze
# MAGIC
# MAGIC **Next Steps:**
# MAGIC - Run notebook 17 to add CLV columns to gold_customer_360_v2
