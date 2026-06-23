# Databricks notebook source
# MAGIC %md
# MAGIC # 07 - Gold Layer: Analytical Datasets
# MAGIC
# MAGIC This notebook creates **38 gold analytical datasets** from silver tables.
# MAGIC Gold = joined, aggregated, feature-rich datasets optimized for analytics and ML.
# MAGIC
# MAGIC **Build Order (4 Tiers):**
# MAGIC - **Tier 1:** Foundation tables (no gold dependencies)
# MAGIC - **Tier 2:** Tables that depend on Tier 1
# MAGIC - **Tier 3:** Tables that depend on Tier 2
# MAGIC - **Tier 4:** ML Ops placeholders
# MAGIC
# MAGIC **Runtime:** ~30-45 minutes on 10-core cluster

# COMMAND ----------

# MAGIC %md
# MAGIC ## Configuration & Setup

# COMMAND ----------

from pyspark.sql import functions as F
from pyspark.sql.window import Window
from pyspark.sql.types import *
from datetime import datetime
import time

# Schema configuration
SCHEMA_SILVER = "retail_silver"
SCHEMA_GOLD = "retail_gold"

# =============================================================================
# CHUNK PROCESSING CONFIGURATION
# =============================================================================
# Set these parameters for chunked processing:
# CHUNK_MODE: "first" = CREATE tables, "append" = INSERT INTO existing, "final" = build dependent tables
# DATE_START/DATE_END: Filter the foundation table by date range (format: YYYYMMDD as integer)

CHUNK_MODE = "final"  # Options: "first", "append", "final"
DATE_START = 20220101  # Not used in final mode
DATE_END = 20261231    # Not used in final mode
SKIP_ZORDER = True     # Skip Z-ORDER for faster processing (run separately later)

print(f"CHUNK MODE: {CHUNK_MODE}")
print(f"DATE RANGE: {DATE_START} to {DATE_END}")
# =============================================================================

# Create gold schema if not exists
spark.sql(f"CREATE SCHEMA IF NOT EXISTS {SCHEMA_GOLD}")

# Performance settings
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")
spark.conf.set("spark.sql.autoBroadcastJoinThreshold", "100MB")  # Broadcast small dims

# Track processing stats
gold_stats = []

print(f"Silver schema: {SCHEMA_SILVER}")
print(f"Gold schema: {SCHEMA_GOLD}")
print(f"Started at: {datetime.now()}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Helper Functions

# COMMAND ----------

def create_gold_table(table_name, sql_query, partition_cols=None, zorder_cols=None, comment=None, mode="create"):
    """Create a gold table from SQL query with optional optimization.

    Args:
        mode: "create" = CREATE OR REPLACE, "append" = INSERT INTO existing table
    """
    global gold_stats
    start_time = time.time()

    print(f"\n{'='*70}")
    print(f"Building: {SCHEMA_GOLD}.{table_name} (mode={mode})")

    try:
        # Create or append based on mode
        if mode == "append":
            full_sql = f"INSERT INTO {SCHEMA_GOLD}.{table_name} {sql_query}"
        else:
            full_sql = f"CREATE OR REPLACE TABLE {SCHEMA_GOLD}.{table_name} AS {sql_query}"

        spark.sql(full_sql)

        count = spark.table(f"{SCHEMA_GOLD}.{table_name}").count()
        print(f"  Rows: {count:,}")

        # Z-ORDER for large tables (skip if SKIP_ZORDER is True)
        if zorder_cols and count > 100000 and not SKIP_ZORDER:
            try:
                spark.sql(f"OPTIMIZE {SCHEMA_GOLD}.{table_name} ZORDER BY ({', '.join(zorder_cols)})")
                print(f"  Z-ORDERed by: {zorder_cols}")
            except Exception as e:
                print(f"  Z-ORDER skipped: {str(e)[:50]}")
        elif SKIP_ZORDER:
            print(f"  Z-ORDER skipped (SKIP_ZORDER=True)")

        # Add table comment
        if comment and mode != "append":
            try:
                spark.sql(f"COMMENT ON TABLE {SCHEMA_GOLD}.{table_name} IS '{comment}'")
            except:
                pass

        elapsed = time.time() - start_time
        print(f"  Completed in {elapsed:.1f}s")

        gold_stats.append({
            "table_name": table_name,
            "rows": count,
            "elapsed_seconds": round(elapsed, 1)
        })

        return count

    except Exception as e:
        elapsed = time.time() - start_time
        print(f"  ERROR: {str(e)[:200]}")
        gold_stats.append({
            "table_name": table_name,
            "rows": 0,
            "elapsed_seconds": round(elapsed, 1),
            "error": str(e)[:300]
        })
        return 0


def create_empty_gold_table(table_name, schema_ddl, comment=None):
    """Create an empty placeholder gold table with specified schema."""
    global gold_stats
    start_time = time.time()

    print(f"\n{'='*70}")
    print(f"Creating placeholder: {SCHEMA_GOLD}.{table_name}")

    try:
        spark.sql(f"CREATE TABLE IF NOT EXISTS {SCHEMA_GOLD}.{table_name} {schema_ddl} USING DELTA")

        if comment:
            try:
                spark.sql(f"COMMENT ON TABLE {SCHEMA_GOLD}.{table_name} IS '{comment}'")
            except:
                pass

        elapsed = time.time() - start_time
        print(f"  Placeholder created in {elapsed:.1f}s")

        gold_stats.append({
            "table_name": table_name,
            "rows": 0,
            "elapsed_seconds": round(elapsed, 1),
            "is_placeholder": True
        })

    except Exception as e:
        elapsed = time.time() - start_time
        print(f"  ERROR: {str(e)[:100]}")
        gold_stats.append({
            "table_name": table_name,
            "rows": 0,
            "elapsed_seconds": round(elapsed, 1),
            "error": str(e)[:200]
        })

# COMMAND ----------

# MAGIC %md
# MAGIC ## Check Silver Tables Availability

# COMMAND ----------

# Verify key silver tables exist before proceeding
key_tables = ["fact_pos_sales", "fact_online_sales", "fact_inventory", "dim_product", "dim_store", "dim_date"]
for t in key_tables:
    try:
        cnt = spark.table(f"{SCHEMA_SILVER}.{t}").count()
        print(f" {t}: {cnt:,} rows")
    except Exception as e:
        print(f" {t}: NOT FOUND - {str(e)[:50]}")

# COMMAND ----------

# MAGIC %md
# MAGIC ---
# MAGIC # TIER 1: Foundation Tables (No Gold Dependencies)
# MAGIC ---

# COMMAND ----------

# MAGIC %md
# MAGIC ## 1. gold_demand_daily_sku_store (THE Star Table)

# COMMAND ----------

# This is the MOST IMPORTANT table - daily demand at SKU x Store grain
# Combines POS + Online sales with inventory, weather, and date features

# First, check what columns exist in our silver tables
print("Checking silver table schemas...")
pos_cols = spark.table(f"{SCHEMA_SILVER}.fact_pos_sales").columns
inv_cols = spark.table(f"{SCHEMA_SILVER}.fact_inventory").columns
prod_cols = spark.table(f"{SCHEMA_SILVER}.dim_product").columns
store_cols = spark.table(f"{SCHEMA_SILVER}.dim_store").columns
date_cols = spark.table(f"{SCHEMA_SILVER}.dim_date").columns

print(f"POS columns: {len(pos_cols)}")
print(f"Inventory columns: {len(inv_cols)}")

# COMMAND ----------

# Build gold_demand_daily_sku_store
# Combining POS + Online with UNION ALL and channel indicator

# Skip foundation table building in "final" mode (assumes it was already built via chunks)
if CHUNK_MODE == "final":
    print("\n" + "="*70)
    print("FINAL MODE: Skipping foundation table (already built via chunks)")
    foundation_count = spark.table(f"{SCHEMA_GOLD}.gold_demand_daily_sku_store").count()
    print(f"Foundation table has {foundation_count:,} rows")
    print("Building all dependent tables...")
    print("="*70)
else:
    # Build foundation table with date filter
    sql_demand_daily = f"""
    WITH combined_sales AS (
        -- POS Sales
        SELECT
            date_id,
            product_id,
            store_id,
            'OFFLINE' as demand_channel,
            txn_id,
            customer_id,
            quantity_sold,
            unit_mrp,
            unit_selling_price,
            unit_cost_price,
            gross_amount,
            discount_amount,
            net_amount,
            tax_amount,
            promo_id,
            COALESCE(is_on_promo, FALSE) as is_on_promo,
            payment_method
        FROM {SCHEMA_SILVER}.fact_pos_sales
        WHERE quantity_sold > 0
          AND date_id BETWEEN {DATE_START} AND {DATE_END}

        UNION ALL

        -- Online Sales (store_id already standardized in silver)
        SELECT
            date_id,
            product_id,
            store_id,
            'ONLINE' as demand_channel,
            order_id as txn_id,
            customer_id,
            quantity_sold,
            unit_mrp,
            unit_selling_price,
            unit_cost_price,
            gross_amount,
            discount_amount,
            net_amount,
            tax_amount,
            CAST(NULL AS STRING) as promo_id,
            FALSE as is_on_promo,
            payment_method
        FROM {SCHEMA_SILVER}.fact_online_sales
        WHERE quantity_sold > 0
          AND date_id BETWEEN {DATE_START} AND {DATE_END}
    ),

    -- Aggregate to daily grain
    daily_agg AS (
        SELECT
            s.date_id,
            s.product_id,
            s.store_id,

            -- Sales Aggregation
            SUM(s.quantity_sold) AS quantity_sold,
            SUM(s.net_amount) AS revenue,
            SUM(s.gross_amount) AS gross_revenue,
            SUM(s.discount_amount) AS total_discount,
            AVG(s.unit_selling_price) AS avg_selling_price,
            AVG(s.unit_cost_price) AS avg_cost_price,
            SUM(s.net_amount) - SUM(COALESCE(s.unit_cost_price, 0) * s.quantity_sold) AS total_margin,
            COUNT(DISTINCT s.txn_id) AS num_transactions,
            COUNT(DISTINCT s.customer_id) AS unique_customers,

            -- Channel breakdown
            SUM(CASE WHEN s.demand_channel = 'OFFLINE' THEN s.quantity_sold ELSE 0 END) AS qty_offline,
            SUM(CASE WHEN s.demand_channel = 'ONLINE' THEN s.quantity_sold ELSE 0 END) AS qty_online,

            -- Promo flag
            MAX(CAST(s.is_on_promo AS INT)) AS is_on_promo,
            MAX(s.promo_id) AS promo_id

        FROM combined_sales s
        GROUP BY s.date_id, s.product_id, s.store_id
    )

    SELECT
        -- Keys
        da.date_id,
        da.product_id,
        da.store_id,

        -- Product Attributes
        p.department,
        p.category_l1,
        p.category_l2,
        p.brand_id,
        p.abc_class,
        COALESCE(p.xyz_class, 'X') as xyz_class,
        p.current_mrp,
        COALESCE(p.is_perishable, FALSE) as is_perishable,
        COALESCE(p.is_essential_commodity, FALSE) as is_essential_commodity,
        p.lifecycle_stage,
        p.pack_size,
        p.pack_uom,

        -- Store Attributes
        st.city,
        st.state,
        st.region,
        st.store_type,
        st.cluster_id,
        st.geo_id,

        -- Sales Metrics
        da.quantity_sold,
        da.revenue,
        da.gross_revenue,
        da.total_discount,
        da.avg_selling_price,
        da.avg_cost_price,
        da.total_margin,
        da.num_transactions,
        da.unique_customers,
        da.qty_offline,
        da.qty_online,

        -- Inventory Position (same day)
        COALESCE(i.opening_stock_qty, 0) AS opening_stock,
        COALESCE(i.closing_stock_qty, 0) AS closing_stock,
        COALESCE(i.received_qty, 0) AS received_qty,
        COALESCE(i.days_of_stock, 0) AS days_of_stock,
        COALESCE(CAST(i.is_stockout AS INT), 0) AS is_stockout,

        -- Price Context
        da.avg_selling_price / NULLIF(p.current_mrp, 0) AS price_to_mrp_ratio,
        da.is_on_promo,
        da.promo_id,

        -- Date Features
        d.day_of_week,
        d.day_name,
        d.is_weekend,
        d.month_num,
        d.month_name,
        d.quarter,
        d.year,
        d.fiscal_year,
        d.fiscal_quarter,
        d.indian_season,
        d.is_public_holiday,
        d.is_festival_period,
        d.festival_name,
        COALESCE(d.festival_intensity, 'None') as festival_intensity,
        COALESCE(d.days_to_festival, 999) as days_to_festival,
        COALESCE(d.is_wedding_season, FALSE) as is_wedding_season,
        COALESCE(d.is_ipl_season, FALSE) as is_ipl_season,
        COALESCE(d.is_exam_season, FALSE) as is_exam_season,
        COALESCE(d.is_monsoon_active, FALSE) as is_monsoon_active,
        COALESCE(d.is_salary_week, FALSE) as is_salary_week,
        COALESCE(d.is_harvest_season, FALSE) as is_harvest_season,
        COALESCE(d.is_ramadan, FALSE) as is_ramadan,
        COALESCE(d.is_navratri_fast, FALSE) as is_navratri_fast,
        COALESCE(d.is_lockdown, FALSE) as is_lockdown,
        COALESCE(d.is_covid_period, FALSE) as is_covid_period,
        COALESCE(d.covid_demand_multiplier, 1.0) as covid_demand_multiplier,

        -- Weather (join via geo_id or city)
        w.temp_max_c,
        w.temp_min_c,
        w.temp_avg_c,
        w.humidity_pct,
        w.rainfall_mm,
        COALESCE(w.is_extreme_weather, FALSE) as is_heavy_rain,
        w.aqi

    FROM daily_agg da

    JOIN {SCHEMA_SILVER}.dim_product p
        ON da.product_id = p.product_id

    JOIN {SCHEMA_SILVER}.dim_store st
        ON da.store_id = st.store_id

    JOIN {SCHEMA_SILVER}.dim_date d
        ON da.date_id = d.date_id

    LEFT JOIN {SCHEMA_SILVER}.fact_inventory i
        ON i.product_id = da.product_id
        AND i.store_id = da.store_id
        AND i.date_id = da.date_id

    LEFT JOIN {SCHEMA_SILVER}.ext_weather w
        ON w.geo_id = st.geo_id
        AND w.date_id = da.date_id
    """

    # Use mode based on CHUNK_MODE setting
    foundation_mode = "append" if CHUNK_MODE == "append" else "create"
    create_gold_table(
        "gold_demand_daily_sku_store",
        sql_demand_daily,
        zorder_cols=["product_id", "store_id"],
        comment="Daily demand at SKU x Store grain - THE foundation table for forecasting",
        mode=foundation_mode
    )

    # If not in final mode, skip building dependent tables
    print("\n" + "="*70)
    print(f"CHUNK MODE = {CHUNK_MODE}: Foundation table chunk completed")
    print("Run with CHUNK_MODE='final' after all chunks are loaded")
    print("="*70)
    dbutils.notebook.exit(f"Chunk {DATE_START}-{DATE_END} completed")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 2. gold_demand_hourly

# COMMAND ----------

sql_demand_hourly = f"""
SELECT
    s.date_id,
    s.time_slot_id,
    HOUR(s.time_slot_id) as hour_of_day,
    s.store_id,
    st.city,
    st.store_type,

    COUNT(DISTINCT s.txn_id) AS num_transactions,
    SUM(s.quantity_sold) AS total_qty,
    SUM(s.net_amount) AS total_revenue,
    COUNT(DISTINCT s.customer_id) AS unique_customers,

    -- Footfall context
    COALESCE(ff.footfall_count, 0) as footfall_count,
    CASE WHEN COALESCE(ff.footfall_count, 0) > 0
         THEN COUNT(DISTINCT s.txn_id) * 100.0 / ff.footfall_count
         ELSE 0 END as conversion_rate_pct,

    d.is_weekend,
    d.is_festival_period,
    d.year,
    d.month_num

FROM {SCHEMA_SILVER}.fact_pos_sales s

JOIN {SCHEMA_SILVER}.dim_store st ON s.store_id = st.store_id
JOIN {SCHEMA_SILVER}.dim_date d ON s.date_id = d.date_id

LEFT JOIN {SCHEMA_SILVER}.fact_footfall ff
    ON ff.store_id = s.store_id
    AND ff.date_id = s.date_id
    AND ff.hour_of_day = HOUR(s.time_slot_id)

GROUP BY
    s.date_id, s.time_slot_id, HOUR(s.time_slot_id),
    s.store_id, st.city, st.store_type,
    ff.footfall_count, d.is_weekend, d.is_festival_period, d.year, d.month_num
"""

create_gold_table(
    "gold_demand_hourly",
    sql_demand_hourly,
    comment="Hourly demand patterns for staffing and Q-commerce capacity planning"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 3. gold_inventory_health

# COMMAND ----------

sql_inventory_health = f"""
SELECT
    i.product_id,
    i.store_id,
    i.date_id,

    p.department,
    p.category_l1,
    p.abc_class,
    COALESCE(p.is_perishable, FALSE) as is_perishable,
    COALESCE(p.shelf_life_days, 365) as shelf_life_days,

    st.city,
    st.store_type,

    i.opening_stock_qty,
    i.closing_stock_qty,
    i.days_of_stock,
    COALESCE(i.is_stockout, FALSE) as is_stockout,

    -- Health classification
    CASE
        WHEN i.closing_stock_qty = 0 OR i.is_stockout THEN 'Stockout'
        WHEN i.days_of_stock < 3 THEN 'Critical'
        WHEN i.days_of_stock < 7 THEN 'Low'
        WHEN i.days_of_stock < 30 THEN 'Healthy'
        WHEN i.days_of_stock < 90 THEN 'Overstock'
        ELSE 'Dead Stock'
    END AS inventory_health_status,

    -- Shrinkage metrics
    COALESCE(i.damaged_qty, 0) + COALESCE(i.expired_qty, 0) as shrinkage_qty,
    COALESCE(sh.shrinkage_value_at_cost, 0) AS shrinkage_value,
    sh.shrinkage_type,

    -- Near expiry flag for perishables
    CASE WHEN COALESCE(p.is_perishable, FALSE)
              AND i.days_of_stock > 0
              AND i.days_of_stock < COALESCE(p.shelf_life_days, 365) * 0.2
         THEN TRUE ELSE FALSE
    END AS is_near_expiry,

    i.year,
    i.month_num

FROM {SCHEMA_SILVER}.fact_inventory i

JOIN {SCHEMA_SILVER}.dim_product p ON i.product_id = p.product_id
JOIN {SCHEMA_SILVER}.dim_store st ON i.store_id = st.store_id

LEFT JOIN {SCHEMA_SILVER}.fact_shrinkage sh
    ON sh.product_id = i.product_id
    AND sh.store_id = i.store_id
    AND sh.date_id = i.date_id
"""

create_gold_table(
    "gold_inventory_health",
    sql_inventory_health,
    zorder_cols=["product_id", "store_id"],
    comment="Inventory health scorecard with DOS, overstock, stockout, aging metrics"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 4. gold_competitive_index

# COMMAND ----------

sql_competitive_index = f"""
SELECT
    pr.product_id,
    pr.effective_date,

    p.product_name,
    p.category_l1,
    p.brand_id,

    pr.selling_price as our_price,
    COALESCE(pr.current_mrp, p.current_mrp) as our_mrp,
    pr.cost_price,

    -- Competitor prices (latest observation)
    c.competitor_price,
    c.competitor_name,
    c.source AS platform,

    -- Price indices
    pr.selling_price / NULLIF(c.competitor_price, 0) as competitive_index,
    pr.selling_price / NULLIF(COALESCE(pr.current_mrp, p.current_mrp), 0) as discount_from_mrp,

    -- Ecommerce signals (latest observation)
    ec.platform_price AS ecommerce_price,
    ec.platform AS ecommerce_platform,
    ec.discount_pct AS ecommerce_discount_pct,

    -- KVI flag (simplified)
    CASE WHEN p.abc_class = 'A' THEN TRUE ELSE FALSE END as is_kvi

FROM {SCHEMA_SILVER}.fact_price pr

JOIN {SCHEMA_SILVER}.dim_product p ON pr.product_id = p.product_id

LEFT JOIN {SCHEMA_SILVER}.ext_competitor c
    ON c.product_id = pr.product_id

LEFT JOIN {SCHEMA_SILVER}.ext_ecommerce_signals ec
    ON ec.product_id = pr.product_id

WHERE pr.is_current = TRUE
"""

create_gold_table(
    "gold_competitive_index",
    sql_competitive_index,
    comment="Price index vs competitors and KVI gap tracking"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 5. gold_customer_360

# COMMAND ----------

sql_customer_360 = f"""
WITH purchase_metrics AS (
    SELECT
        customer_id,
        COUNT(DISTINCT txn_id) AS total_transactions,
        SUM(net_amount) AS total_spend,
        AVG(net_amount) AS avg_basket_value,
        COUNT(DISTINCT date_id) AS active_days,
        MIN(date_id) AS first_purchase_date_id,
        MAX(date_id) AS last_purchase_date_id,
        COUNT(DISTINCT product_id) AS unique_products_bought
    FROM {SCHEMA_SILVER}.fact_pos_sales
    WHERE customer_id IS NOT NULL
    GROUP BY customer_id
),

loyalty_metrics AS (
    SELECT
        customer_id,
        SUM(points_earned) AS total_points_earned,
        SUM(points_redeemed) AS total_points_redeemed,
        MAX(tier_at_txn) AS current_tier
    FROM {SCHEMA_SILVER}.fact_loyalty
    GROUP BY customer_id
),

payment_prefs AS (
    SELECT
        customer_id,
        payment_method,
        ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY COUNT(*) DESC) as rn
    FROM {SCHEMA_SILVER}.fact_pos_sales
    WHERE customer_id IS NOT NULL
    GROUP BY customer_id, payment_method
),

last_dates AS (
    SELECT date_id, full_date FROM {SCHEMA_SILVER}.dim_date
)

SELECT
    c.customer_id,
    c.loyalty_tier,
    c.age_band,
    c.gender,
    c.city,
    c.customer_segment AS original_segment,
    c.registration_date,

    -- Purchase metrics
    COALESCE(pm.total_transactions, 0) AS total_transactions,
    COALESCE(pm.total_spend, 0) AS total_spend,
    COALESCE(pm.avg_basket_value, 0) AS avg_basket_value,
    COALESCE(pm.active_days, 0) AS active_days,
    pm.first_purchase_date_id,
    pm.last_purchase_date_id,
    COALESCE(pm.unique_products_bought, 0) AS unique_products_bought,

    -- Recency calculation (using join instead of correlated subquery)
    DATEDIFF(CURRENT_DATE(), ld.full_date) AS days_since_last_purchase,

    -- Frequency (transactions per month active)
    CASE WHEN pm.active_days > 0
         THEN pm.total_transactions * 30.0 / pm.active_days
         ELSE 0 END AS monthly_frequency,

    -- Preferred payment
    pp.payment_method AS preferred_payment,

    -- Loyalty metrics
    COALESCE(lm.total_points_earned, 0) AS total_points_earned,
    COALESCE(lm.total_points_redeemed, 0) AS total_points_redeemed,
    COALESCE(lm.current_tier, c.loyalty_tier) AS loyalty_tier_current,

    -- RFM Score (simplified)
    CASE
        WHEN COALESCE(pm.total_transactions, 0) = 0 THEN 'Inactive'
        WHEN DATEDIFF(CURRENT_DATE(), ld.full_date) > 90 THEN 'Lapsed'
        WHEN DATEDIFF(CURRENT_DATE(), ld.full_date) > 30 THEN 'At Risk'
        WHEN pm.total_transactions >= 10 THEN 'Loyal'
        ELSE 'Active'
    END AS customer_segment

FROM {SCHEMA_SILVER}.dim_customer c

LEFT JOIN purchase_metrics pm ON c.customer_id = pm.customer_id
LEFT JOIN loyalty_metrics lm ON c.customer_id = lm.customer_id
LEFT JOIN payment_prefs pp ON c.customer_id = pp.customer_id AND pp.rn = 1
LEFT JOIN last_dates ld ON pm.last_purchase_date_id = ld.date_id
"""

create_gold_table(
    "gold_customer_360",
    sql_customer_360,
    zorder_cols=["customer_id"],
    comment="Unified customer profile with RFM, spend, loyalty metrics"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 6. gold_supplier_scorecard

# COMMAND ----------

sql_supplier_scorecard = f"""
SELECT
    s.supplier_id,
    s.supplier_name,
    s.city as supplier_city,
    s.state as supplier_state,
    s.supplier_type,
    COALESCE(s.payment_terms_days, 7) AS lead_time_days,  -- Using payment_terms as proxy

    -- PO metrics
    COUNT(DISTINCT po.po_id) AS total_pos,
    SUM(po.order_qty) AS total_qty_ordered,
    SUM(po.total_cost) AS total_po_value,

    -- OTIF calculation
    AVG(CASE WHEN po.actual_delivery_date <= po.expected_delivery_date THEN 1.0 ELSE 0.0 END) * 100 AS on_time_pct,
    AVG(CASE WHEN po.received_qty_final >= po.order_qty * 0.95 THEN 1.0 ELSE 0.0 END) * 100 AS in_full_pct,

    -- Lead time actual vs expected
    AVG(DATEDIFF(po.actual_delivery_date, po.order_date)) AS avg_actual_lead_time,
    AVG(COALESCE(s.payment_terms_days, 7)) AS expected_lead_time,

    -- Price changes
    COUNT(DISTINCT spc.change_id) AS price_change_count,
    AVG(spc.change_pct) AS avg_price_change_pct

FROM {SCHEMA_SILVER}.dim_supplier s

LEFT JOIN {SCHEMA_SILVER}.fact_purchase_orders po ON s.supplier_id = po.supplier_id
LEFT JOIN {SCHEMA_SILVER}.fact_supplier_price_changes spc ON s.supplier_id = spc.supplier_id

GROUP BY
    s.supplier_id, s.supplier_name, s.city, s.state,
    s.supplier_type, s.payment_terms_days
"""

create_gold_table(
    "gold_supplier_scorecard",
    sql_supplier_scorecard,
    comment="Supplier OTIF, lead time, quality, cost performance"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 7. gold_delivery_perf

# COMMAND ----------

sql_delivery_perf = f"""
SELECT
    d.date_id,
    d.fulfillment_store_id as store_id,
    st.city,
    st.store_type,

    d.delivery_partner,

    COUNT(*) AS total_deliveries,
    AVG(d.actual_time_mins) AS avg_delivery_time_mins,
    AVG(d.promised_time_mins) AS avg_promised_time_mins,

    -- SLA metrics
    SUM(CAST(d.sla_met AS INT)) AS sla_met_count,
    SUM(CAST(d.sla_met AS INT)) * 100.0 / COUNT(*) AS sla_met_pct,

    AVG(CASE WHEN NOT d.sla_met THEN d.delay_mins ELSE 0 END) AS avg_delay_mins,

    -- Delivery attempt metrics
    SUM(CASE WHEN d.delivery_attempt > 1 THEN 1 ELSE 0 END) AS reattempt_count,

    -- Rating
    AVG(d.delivery_rating) AS avg_rating,

    -- Cost (if available)
    AVG(COALESCE(o.delivery_charge_inr, 0)) AS avg_delivery_cost,

    dt.year,
    dt.month_num

FROM {SCHEMA_SILVER}.fact_delivery d

JOIN {SCHEMA_SILVER}.dim_store st ON d.fulfillment_store_id = st.store_id
JOIN {SCHEMA_SILVER}.dim_date dt ON d.date_id = dt.date_id
LEFT JOIN {SCHEMA_SILVER}.fact_online_sales o ON d.order_id = o.order_id

GROUP BY
    d.date_id, d.fulfillment_store_id, st.city, st.store_type,
    d.delivery_partner, dt.year, dt.month_num
"""

create_gold_table(
    "gold_delivery_perf",
    sql_delivery_perf,
    comment="Last-mile delivery SLA, cost-to-serve, rider efficiency"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 8. gold_data_quality

# COMMAND ----------

sql_data_quality = f"""
SELECT
    table_name,
    rule as dq_rule,
    description,
    violations_count,
    violation_pct,
    total_rows,
    validated_at,
    CASE WHEN violation_pct = 0 THEN 'PASS'
         WHEN violation_pct < 1 THEN 'WARNING'
         ELSE 'FAIL' END AS dq_status
FROM {SCHEMA_SILVER}._dq_validation_results
"""

try:
    create_gold_table(
        "gold_data_quality",
        sql_data_quality,
        comment="Data quality metrics from silver layer validation"
    )
except Exception as e:
    print(f"  Skipped gold_data_quality - DQ results may not exist: {str(e)[:50]}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 9. gold_weather_impact

# COMMAND ----------

sql_weather_impact = f"""
SELECT
    p.category_l1,
    p.department,
    st.geo_id,
    g.city AS city_name,
    g.state AS state_name,

    -- Weather conditions
    CASE
        WHEN w.rainfall_mm > 50 THEN 'Heavy Rain'
        WHEN w.rainfall_mm > 10 THEN 'Light Rain'
        WHEN w.temp_avg_c > 40 THEN 'Extreme Heat'
        WHEN w.temp_avg_c < 15 THEN 'Cold'
        ELSE 'Normal'
    END AS weather_condition,

    -- Aggregated metrics
    COUNT(DISTINCT s.date_id) AS num_days,
    SUM(s.quantity_sold) AS total_qty,
    AVG(s.quantity_sold) AS avg_daily_qty,

    -- Weather stats
    AVG(w.temp_avg_c) AS avg_temp,
    AVG(w.rainfall_mm) AS avg_rainfall,
    AVG(w.humidity_pct) AS avg_humidity

FROM {SCHEMA_SILVER}.fact_pos_sales s

JOIN {SCHEMA_SILVER}.dim_product p ON s.product_id = p.product_id
JOIN {SCHEMA_SILVER}.dim_store st ON s.store_id = st.store_id
JOIN {SCHEMA_SILVER}.dim_geography g ON st.geo_id = g.geo_id
LEFT JOIN {SCHEMA_SILVER}.ext_weather w ON w.geo_id = st.geo_id AND w.date_id = s.date_id

GROUP BY
    p.category_l1, p.department, st.geo_id, g.city, g.state,
    CASE
        WHEN w.rainfall_mm > 50 THEN 'Heavy Rain'
        WHEN w.rainfall_mm > 10 THEN 'Light Rain'
        WHEN w.temp_avg_c > 40 THEN 'Extreme Heat'
        WHEN w.temp_avg_c < 15 THEN 'Cold'
        ELSE 'Normal'
    END
"""

create_gold_table(
    "gold_weather_impact",
    sql_weather_impact,
    comment="Weather impact coefficients by category x region"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 10. gold_osa_tracker

# COMMAND ----------

sql_osa_tracker = f"""
SELECT
    so.date_id,
    so.product_id,
    so.store_id,

    p.department,
    p.category_l1,
    p.abc_class,

    st.city,
    st.store_type,

    -- Stockout details
    so.stockout_start_date,
    so.stockout_end_date,
    so.duration_hours,
    so.root_cause,
    COALESCE(so.estimated_lost_sales_qty, 0) AS estimated_lost_qty,
    COALESCE(so.estimated_lost_revenue, 0) AS estimated_lost_revenue,
    so.is_resolved,

    -- Calculate OSA score (1 = on shelf, 0 = stockout)
    CASE WHEN so.stockout_id IS NOT NULL THEN 0 ELSE 1 END AS osa_score,

    d.year,
    d.month_num,
    d.is_festival_period

FROM {SCHEMA_SILVER}.fact_stockout_events so

JOIN {SCHEMA_SILVER}.dim_product p ON so.product_id = p.product_id
JOIN {SCHEMA_SILVER}.dim_store st ON so.store_id = st.store_id
JOIN {SCHEMA_SILVER}.dim_date d ON so.date_id = d.date_id
"""

create_gold_table(
    "gold_osa_tracker",
    sql_osa_tracker,
    comment="On-Shelf Availability tracking and lost sales estimation"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ---
# MAGIC # TIER 2: Tables Dependent on Tier 1
# MAGIC ---

# COMMAND ----------

# MAGIC %md
# MAGIC ## 11. gold_demand_weekly_cluster

# COMMAND ----------

sql_demand_weekly_cluster = f"""
SELECT
    gd.product_id,
    gd.cluster_id,
    gd.department,
    gd.category_l1,
    gd.brand_id,
    gd.abc_class,
    gd.year,
    WEEKOFYEAR(d.full_date) AS week_of_year,
    MIN(gd.date_id) AS week_start_date_id,

    SUM(gd.quantity_sold) AS weekly_qty,
    SUM(gd.revenue) AS weekly_revenue,
    AVG(gd.avg_selling_price) AS avg_price,
    AVG(gd.days_of_stock) AS avg_dos,
    MAX(gd.is_stockout) AS had_stockout,
    SUM(gd.num_transactions) AS total_transactions,
    SUM(gd.unique_customers) AS total_unique_customers

FROM {SCHEMA_GOLD}.gold_demand_daily_sku_store gd
JOIN {SCHEMA_SILVER}.dim_date d ON gd.date_id = d.date_id

GROUP BY
    gd.product_id, gd.cluster_id, gd.department, gd.category_l1, gd.brand_id, gd.abc_class,
    gd.year, WEEKOFYEAR(d.full_date)
"""

create_gold_table(
    "gold_demand_weekly_cluster",
    sql_demand_weekly_cluster,
    comment="Weekly demand at SKU x Cluster for S&OP planning"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 12. gold_demand_monthly_cat_geo

# COMMAND ----------

sql_demand_monthly_cat_geo = f"""
SELECT
    department,
    category_l1,
    geo_id,
    city,
    state,
    year,
    month_num,

    SUM(quantity_sold) AS monthly_qty,
    SUM(revenue) AS monthly_revenue,
    AVG(avg_selling_price) AS avg_price,
    COUNT(DISTINCT product_id) AS unique_skus,
    COUNT(DISTINCT store_id) AS unique_stores,
    SUM(num_transactions) AS total_transactions

FROM {SCHEMA_GOLD}.gold_demand_daily_sku_store

GROUP BY
    department, category_l1, geo_id, city, state, year, month_num
"""

create_gold_table(
    "gold_demand_monthly_cat_geo",
    sql_demand_monthly_cat_geo,
    comment="Monthly demand at Category x Geography for strategic planning"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 13. gold_unconstrained_demand

# COMMAND ----------

sql_unconstrained_demand = f"""
SELECT
    gd.date_id,
    gd.product_id,
    gd.store_id,

    gd.department,
    gd.category_l1,
    gd.abc_class,

    -- Actual sales
    gd.quantity_sold AS actual_qty,
    gd.revenue AS actual_revenue,

    -- Was there a stockout?
    gd.is_stockout,

    -- Estimated lost sales from stockout events
    COALESCE(so.estimated_lost_sales_qty, 0) AS lost_sales_qty,
    COALESCE(so.estimated_lost_revenue, 0) AS lost_sales_revenue,

    -- Unconstrained demand = actual + lost
    gd.quantity_sold + COALESCE(so.estimated_lost_sales_qty, 0) AS unconstrained_qty,
    gd.revenue + COALESCE(so.estimated_lost_revenue, 0) AS unconstrained_revenue,

    -- Cannibalization adjustment (using cross_price_elasticity column name)
    COALESCE(can.cross_price_elasticity, 0) AS cannib_elasticity,

    gd.year,
    gd.month_num

FROM {SCHEMA_GOLD}.gold_demand_daily_sku_store gd

LEFT JOIN {SCHEMA_SILVER}.fact_stockout_events so
    ON so.product_id = gd.product_id
    AND so.store_id = gd.store_id
    AND so.date_id = gd.date_id

LEFT JOIN {SCHEMA_SILVER}.fact_cannibalization can
    ON can.product_id = gd.product_id
"""

create_gold_table(
    "gold_unconstrained_demand",
    sql_unconstrained_demand,
    zorder_cols=["product_id", "store_id"],
    comment="True demand adjusted for stockouts and cannibalization"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 14. gold_festival_demand

# COMMAND ----------

sql_festival_demand = f"""
SELECT
    gd.department,
    gd.category_l1,
    gd.geo_id,
    gd.city,
    gd.state,
    gd.festival_name,
    gd.festival_intensity,

    -- Time context
    gd.year,

    -- Aggregated metrics
    COUNT(DISTINCT gd.date_id) AS festival_days,
    SUM(gd.quantity_sold) AS total_qty,
    AVG(gd.quantity_sold) AS avg_daily_qty,
    SUM(gd.revenue) AS total_revenue,

    -- Compare to non-festival baseline (simplified)
    SUM(gd.quantity_sold) / NULLIF(COUNT(DISTINCT gd.date_id), 0) AS festival_daily_avg,

    -- Festival multiplier estimate
    CASE gd.festival_intensity
        WHEN 'Peak' THEN 2.5
        WHEN 'High' THEN 1.6
        WHEN 'Medium' THEN 1.25
        ELSE 1.0
    END AS estimated_multiplier

FROM {SCHEMA_GOLD}.gold_demand_daily_sku_store gd

WHERE gd.is_festival_period = TRUE
  AND gd.festival_name IS NOT NULL

GROUP BY
    gd.department, gd.category_l1, gd.geo_id, gd.city, gd.state,
    gd.festival_name, gd.festival_intensity, gd.year
"""

create_gold_table(
    "gold_festival_demand",
    sql_festival_demand,
    comment="Festival demand multipliers by category x region x festival"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 15. gold_price_elasticity_matrix

# COMMAND ----------

sql_price_elasticity = f"""
SELECT
    pe.product_id,
    pe.category_l2 AS category_id,

    p.product_name,
    p.category_l1,
    p.brand_id,

    pe.own_price_elasticity AS elasticity_coefficient,
    pe.cross_price_elasticity AS cross_elasticity,
    CAST(NULL AS DOUBLE) AS price_range_min,
    CAST(NULL AS DOUBLE) AS price_range_max,
    pe.computation_date,
    pe.r_squared AS confidence_score,

    -- Current price context
    pr.selling_price AS current_price,
    COALESCE(pr.current_mrp, p.current_mrp) AS current_mrp

FROM {SCHEMA_SILVER}.fact_price_elasticity pe

JOIN {SCHEMA_SILVER}.dim_product p ON pe.product_id = p.product_id

LEFT JOIN {SCHEMA_SILVER}.fact_price pr
    ON pr.product_id = pe.product_id
    AND pr.is_current = TRUE
"""

create_gold_table(
    "gold_price_elasticity_matrix",
    sql_price_elasticity,
    comment="Own-price and cross-price elasticity at SKU x Store"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 16. gold_promo_effectiveness

# COMMAND ----------

sql_promo_effectiveness = f"""
WITH promo_sales AS (
    SELECT
        s.promo_id,
        s.product_id,
        s.store_id,
        p.promo_type,
        p.discount_pct,
        p.start_date,
        p.end_date,
        SUM(s.quantity_sold) AS promo_qty,
        SUM(s.net_amount) AS promo_revenue,
        COUNT(DISTINCT s.date_id) AS promo_days
    FROM {SCHEMA_SILVER}.fact_pos_sales s
    JOIN {SCHEMA_SILVER}.fact_promotions p ON s.promo_id = p.promo_id
    WHERE s.promo_id IS NOT NULL
    GROUP BY s.promo_id, s.product_id, s.store_id, p.promo_type, p.discount_pct, p.start_date, p.end_date
),

baseline AS (
    SELECT
        product_id,
        store_id,
        AVG(quantity_sold) AS baseline_daily_qty
    FROM {SCHEMA_SILVER}.fact_pos_sales
    WHERE promo_id IS NULL
    GROUP BY product_id, store_id
)

SELECT
    ps.promo_id,
    ps.product_id,
    ps.store_id,
    ps.promo_type,
    ps.discount_pct,
    ps.start_date,
    ps.end_date,
    ps.promo_qty,
    ps.promo_revenue,
    ps.promo_days,

    b.baseline_daily_qty,
    ps.promo_qty / NULLIF(ps.promo_days, 0) AS promo_daily_qty,

    -- Volume lift
    (ps.promo_qty / NULLIF(ps.promo_days, 0)) / NULLIF(b.baseline_daily_qty, 0) - 1 AS volume_lift_pct,

    -- ROI estimate (simplified)
    (ps.promo_revenue - (b.baseline_daily_qty * ps.promo_days * ps.discount_pct / 100)) / NULLIF(b.baseline_daily_qty * ps.promo_days * ps.discount_pct / 100, 0) AS roi_estimate

FROM promo_sales ps
LEFT JOIN baseline b ON ps.product_id = b.product_id AND ps.store_id = b.store_id
"""

create_gold_table(
    "gold_promo_effectiveness",
    sql_promo_effectiveness,
    comment="Promo ROI with lift curves, cannibalization, halo effects"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 17. gold_reference_price

# COMMAND ----------

sql_reference_price = f"""
WITH current_prices AS (
    SELECT product_id, selling_price, current_mrp
    FROM {SCHEMA_SILVER}.fact_price
    WHERE is_current = TRUE
)
SELECT
    rp.product_id,
    rp.store_id,
    rp.reference_date,

    p.product_name,
    p.category_l1,
    p.brand_id,

    rp.reference_price,
    rp.min_price_in_window,
    rp.max_price_in_window,
    rp.avg_price_in_window,
    rp.price_volatility,

    rp.competitor_ref_price,
    rp.price_gap_vs_competitor,
    rp.is_below_market,

    -- Current price
    pr.selling_price AS current_price,

    -- IRP erosion check
    CASE WHEN pr.selling_price < rp.reference_price * 0.9 THEN TRUE ELSE FALSE END AS irp_erosion_flag

FROM {SCHEMA_SILVER}.fact_reference_price rp

JOIN {SCHEMA_SILVER}.dim_product p ON rp.product_id = p.product_id

LEFT JOIN current_prices pr ON pr.product_id = rp.product_id
"""

create_gold_table(
    "gold_reference_price",
    sql_reference_price,
    comment="Customer reference price erosion monitoring"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 18. gold_basket_analysis

# COMMAND ----------

sql_basket_analysis = f"""
SELECT
    b.basket_id,
    b.txn_id,
    b.date_id,
    b.store_id,
    b.customer_id,

    b.total_items,
    b.unique_products,
    b.total_quantity,
    b.gross_value,
    b.total_discount,
    b.net_value,
    b.total_tax,

    b.avg_item_price,
    b.discount_pct,
    b.basket_type,
    b.basket_category,
    b.payment_method,
    b.time_in_store_mins,
    COALESCE(b.has_promo_item, FALSE) AS has_promo_item,

    -- Store context
    st.city,
    st.store_type,

    -- Date context
    d.is_weekend,
    d.is_festival_period,
    d.is_salary_week,

    b.year,
    b.month_num

FROM {SCHEMA_SILVER}.fact_basket b

JOIN {SCHEMA_SILVER}.dim_store st ON b.store_id = st.store_id
JOIN {SCHEMA_SILVER}.dim_date d ON b.date_id = d.date_id
"""

create_gold_table(
    "gold_basket_analysis",
    sql_basket_analysis,
    zorder_cols=["store_id", "date_id"],
    comment="Basket composition and cross-sell analysis"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 19. gold_safety_stock

# COMMAND ----------

sql_safety_stock = f"""
WITH demand_variability AS (
    SELECT
        product_id,
        store_id,
        AVG(quantity_sold) AS avg_daily_demand,
        STDDEV(quantity_sold) AS stddev_daily_demand,
        STDDEV(quantity_sold) / NULLIF(AVG(quantity_sold), 0) AS cv_demand
    FROM {SCHEMA_GOLD}.gold_demand_daily_sku_store
    WHERE quantity_sold > 0
    GROUP BY product_id, store_id
)

SELECT
    dv.product_id,
    dv.store_id,

    p.product_name,
    p.category_l1,
    p.abc_class,

    st.city,
    st.store_type,

    dv.avg_daily_demand,
    dv.stddev_daily_demand,
    dv.cv_demand,

    -- Lead time from supplier (using payment_terms_days as proxy)
    COALESCE(sup.payment_terms_days, 7) AS lead_time_days,

    -- Safety stock calculation: Z * sigma_demand * sqrt(lead_time)
    -- Using Z = 1.65 for 95% service level
    1.65 * dv.stddev_daily_demand * SQRT(COALESCE(sup.payment_terms_days, 7)) AS safety_stock_qty,

    -- Reorder point = (avg_demand * lead_time) + safety_stock
    (dv.avg_daily_demand * COALESCE(sup.payment_terms_days, 7)) +
    (1.65 * dv.stddev_daily_demand * SQRT(COALESCE(sup.payment_terms_days, 7))) AS reorder_point

FROM demand_variability dv

JOIN {SCHEMA_SILVER}.dim_product p ON dv.product_id = p.product_id
JOIN {SCHEMA_SILVER}.dim_store st ON dv.store_id = st.store_id
LEFT JOIN {SCHEMA_SILVER}.dim_supplier sup ON p.supplier_id = sup.supplier_id
"""

create_gold_table(
    "gold_safety_stock",
    sql_safety_stock,
    comment="Dynamic safety stock based on demand variability + lead time"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 20. gold_macro_sensitivity

# COMMAND ----------

sql_macro_sensitivity = f"""
SELECT
    gd.department,
    gd.category_l1,
    gd.year,
    gd.month_num,

    SUM(gd.monthly_qty) AS total_qty,
    SUM(gd.monthly_revenue) AS total_revenue,

    -- Macro indicators
    AVG(m.cpi_index) AS avg_cpi,
    AVG(m.petrol_price_inr) AS avg_fuel_price,
    AVG(m.unemployment_rate_pct) AS avg_unemployment,
    AVG(m.gdp_growth_yoy_pct) AS avg_gdp_growth

FROM {SCHEMA_GOLD}.gold_demand_monthly_cat_geo gd

LEFT JOIN {SCHEMA_SILVER}.ext_macro_economic m
    ON m.year = gd.year AND m.month = gd.month_num

GROUP BY gd.department, gd.category_l1, gd.year, gd.month_num
"""

create_gold_table(
    "gold_macro_sensitivity",
    sql_macro_sensitivity,
    comment="CPI/fuel/wages impact on category demand"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 21. gold_digital_signal

# COMMAND ----------

sql_digital_signal = f"""
SELECT
    ds.product_id,
    ds.date_id,

    p.product_name,
    p.category_l1,
    p.brand_id,

    ds.google_trends_score AS google_trends_index,
    (COALESCE(ds.twitter_mentions, 0) + COALESCE(ds.instagram_mentions, 0)) AS social_mentions,
    ds.sentiment_score,
    CAST(NULL AS BIGINT) AS search_volume,  -- Not available in source

    -- Demand from gold_demand_daily
    COALESCE(gd.quantity_sold, 0) AS actual_sales,
    COALESCE(gd.revenue, 0) AS actual_revenue,

    -- Signal lead indicator
    CASE WHEN ds.google_trends_score > 70 THEN TRUE ELSE FALSE END AS trending_flag

FROM {SCHEMA_SILVER}.ext_digital_signals ds

JOIN {SCHEMA_SILVER}.dim_product p ON ds.product_id = p.product_id

LEFT JOIN {SCHEMA_GOLD}.gold_demand_daily_sku_store gd
    ON gd.product_id = ds.product_id
    AND gd.date_id = ds.date_id
"""

create_gold_table(
    "gold_digital_signal",
    sql_digital_signal,
    comment="Early demand signals from search, social, app data"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 22. gold_planogram_perf

# COMMAND ----------

sql_planogram_perf = f"""
SELECT
    pl.product_id,
    pl.store_id,

    p.product_name,
    p.category_l1,
    p.abc_class,

    st.city,
    st.store_type,

    pl.aisle_number,
    pl.shelf_number,
    pl.position_on_shelf,
    pl.facings,
    pl.shelf_position,
    pl.width_cm,
    pl.height_cm,
    pl.is_end_cap,

    -- Sales performance
    COALESCE(SUM(gd.quantity_sold), 0) AS total_qty_sold,
    COALESCE(SUM(gd.revenue), 0) AS total_revenue,

    -- Revenue per linear cm
    COALESCE(SUM(gd.revenue), 0) / NULLIF(pl.width_cm * pl.facings, 0) AS revenue_per_linear_cm

FROM {SCHEMA_SILVER}.fact_planogram pl

JOIN {SCHEMA_SILVER}.dim_product p ON pl.product_id = p.product_id
JOIN {SCHEMA_SILVER}.dim_store st ON pl.store_id = st.store_id

LEFT JOIN {SCHEMA_GOLD}.gold_demand_daily_sku_store gd
    ON gd.product_id = pl.product_id
    AND gd.store_id = pl.store_id

GROUP BY
    pl.product_id, pl.store_id, p.product_name, p.category_l1, p.abc_class,
    st.city, st.store_type, pl.aisle_number, pl.shelf_number, pl.position_on_shelf,
    pl.facings, pl.shelf_position, pl.width_cm, pl.height_cm, pl.is_end_cap
"""

create_gold_table(
    "gold_planogram_perf",
    sql_planogram_perf,
    comment="Shelf productivity - revenue per cm, facings vs demand"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ---
# MAGIC # TIER 3: Tables Dependent on Tier 2
# MAGIC ---

# COMMAND ----------

# MAGIC %md
# MAGIC ## 23. gold_replenishment_signal

# COMMAND ----------

sql_replenishment_signal = f"""
SELECT
    gd.date_id,
    gd.product_id,
    gd.store_id,

    gd.department,
    gd.category_l1,
    gd.abc_class,
    gd.city,
    gd.store_type,

    -- Current inventory
    gd.closing_stock AS current_stock,
    gd.days_of_stock,
    gd.is_stockout,

    -- Safety stock and reorder point
    ss.safety_stock_qty,
    ss.reorder_point,
    ss.avg_daily_demand,

    -- Replenishment signal
    CASE
        WHEN gd.closing_stock <= 0 THEN 'URGENT'
        WHEN gd.closing_stock <= ss.safety_stock_qty THEN 'REORDER NOW'
        WHEN gd.closing_stock <= ss.reorder_point THEN 'REORDER SOON'
        ELSE 'OK'
    END AS replenishment_status,

    -- Suggested reorder qty (EOQ simplified)
    GREATEST(0, (ss.avg_daily_demand * 14) - gd.closing_stock) AS suggested_order_qty,

    gd.year,
    gd.month_num

FROM {SCHEMA_GOLD}.gold_demand_daily_sku_store gd

LEFT JOIN {SCHEMA_GOLD}.gold_safety_stock ss
    ON ss.product_id = gd.product_id
    AND ss.store_id = gd.store_id
"""

create_gold_table(
    "gold_replenishment_signal",
    sql_replenishment_signal,
    zorder_cols=["product_id", "store_id"],
    comment="Auto-reorder signals with qty, timing, safety stock"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 24. gold_promo_calendar

# COMMAND ----------

sql_promo_calendar = f"""
SELECT
    p.category_l1,
    d.year,
    d.week_of_year,
    d.month_num,

    pr.promo_type,
    AVG(pe.discount_pct) AS avg_discount_depth,

    -- Effectiveness from gold_promo_effectiveness
    AVG(pe.volume_lift_pct) AS avg_volume_lift,
    AVG(pe.roi_estimate) AS avg_roi,

    -- Events context
    MAX(d.is_festival_period) AS has_festival,
    MAX(d.festival_name) AS festival_name,

    COUNT(DISTINCT pe.promo_id) AS num_promos

FROM {SCHEMA_SILVER}.fact_promotions pr

JOIN {SCHEMA_SILVER}.dim_date d ON pr.start_date = d.full_date
JOIN {SCHEMA_SILVER}.dim_product p ON pr.product_id = p.product_id
LEFT JOIN {SCHEMA_GOLD}.gold_promo_effectiveness pe ON pr.promo_id = pe.promo_id

GROUP BY p.category_l1, d.year, d.week_of_year, d.month_num, pr.promo_type
"""

create_gold_table(
    "gold_promo_calendar",
    sql_promo_calendar,
    comment="Optimal promo calendar with timing and depth recommendations"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 25. gold_promo_cannib_map

# COMMAND ----------

sql_promo_cannib_map = f"""
SELECT
    c.cannibalization_id AS cannib_id,
    c.category_id,
    c.product_id AS source_product_id,
    c.target_product_id,

    c.cross_price_elasticity AS cross_elasticity,
    c.substitution_score,
    c.same_brand AS is_same_brand,
    c.confidence_score,

    -- Product details
    p1.product_name AS source_product_name,
    p1.brand_id AS source_brand,
    p2.product_name AS target_product_name,
    p2.brand_id AS target_brand,

    -- Promo context
    pe.promo_id,
    pe.volume_lift_pct

FROM {SCHEMA_SILVER}.fact_cannibalization c

LEFT JOIN {SCHEMA_SILVER}.dim_product p1 ON c.product_id = p1.product_id
LEFT JOIN {SCHEMA_SILVER}.dim_product p2 ON c.target_product_id = p2.product_id
LEFT JOIN {SCHEMA_GOLD}.gold_promo_effectiveness pe ON pe.product_id = c.product_id
"""

create_gold_table(
    "gold_promo_cannib_map",
    sql_promo_cannib_map,
    comment="Cannibalization matrix across promotions"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 26. gold_optimal_price

# COMMAND ----------

sql_optimal_price = f"""
SELECT
    pe.product_id,

    p.product_name,
    p.category_l1,
    p.brand_id,
    p.abc_class,

    -- Current price
    pr.selling_price AS current_price,
    COALESCE(pr.current_mrp, p.current_mrp) AS mrp,
    pr.cost_price,

    -- Elasticity
    pe.elasticity_coefficient,

    -- Optimal price calculation (simplified markup model)
    -- Optimal price = cost / (1 + 1/elasticity) for profit maximization
    CASE
        WHEN pe.elasticity_coefficient < -1 THEN
            pr.cost_price / (1 + 1/pe.elasticity_coefficient)
        ELSE pr.selling_price  -- Inelastic - keep current price
    END AS recommended_price,

    -- Price bounds
    pr.cost_price * 1.05 AS min_price,  -- 5% margin floor
    COALESCE(pr.current_mrp, p.current_mrp) AS max_price,  -- MRP ceiling (Indian law)

    -- Competitor context
    ci.competitor_price,
    ci.competitive_index

FROM {SCHEMA_GOLD}.gold_price_elasticity_matrix pe

JOIN {SCHEMA_SILVER}.dim_product p ON pe.product_id = p.product_id

LEFT JOIN {SCHEMA_SILVER}.fact_price pr
    ON pr.product_id = pe.product_id
    AND pr.is_current = TRUE

LEFT JOIN {SCHEMA_GOLD}.gold_competitive_index ci
    ON ci.product_id = pe.product_id
"""

create_gold_table(
    "gold_optimal_price",
    sql_optimal_price,
    comment="Recommended prices with revenue/margin/share objectives"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 27. gold_cost_passthrough

# COMMAND ----------

sql_cost_passthrough = f"""
SELECT
    spc.supplier_id,
    s.supplier_name,
    spc.effective_date,

    spc.change_type,
    spc.old_cost_inr AS old_cost,
    spc.new_cost_inr AS new_cost,
    spc.change_pct AS cost_change_pct,
    spc.change_reason AS reason,
    spc.affected_products_count,
    spc.total_impact_monthly_inr,

    -- Recommended passthrough (at supplier level since no product link)
    CASE
        WHEN spc.affected_products_count > 100 THEN spc.change_pct * 0.5  -- Large impact: pass 50%
        WHEN spc.affected_products_count > 10 THEN spc.change_pct * 0.75  -- Medium impact: pass 75%
        ELSE spc.change_pct  -- Small impact: full passthrough
    END AS recommended_passthrough_pct

FROM {SCHEMA_SILVER}.fact_supplier_price_changes spc

LEFT JOIN {SCHEMA_SILVER}.dim_supplier s ON spc.supplier_id = s.supplier_id
"""

create_gold_table(
    "gold_cost_passthrough",
    sql_cost_passthrough,
    comment="Commodity to shelf price pass-through modeling"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 28. gold_markdown_optimizer

# COMMAND ----------

sql_markdown_optimizer = f"""
SELECT
    md.markdown_id,
    md.date_id,
    md.product_id,
    md.store_id,

    p.product_name,
    p.category_l1,
    p.is_perishable,
    p.shelf_life_days,

    md.markdown_date,
    md.days_to_expiry,
    md.original_price,
    md.markdown_pct,
    md.markdown_price,
    md.markdown_qty,
    md.markdown_value_loss,
    md.sold_qty_at_markdown,
    md.remaining_qty,

    -- Sellthrough rate
    md.sold_qty_at_markdown * 100.0 / NULLIF(md.markdown_qty, 0) AS sellthrough_pct,

    -- Price elasticity for optimization
    pe.own_price_elasticity AS elasticity_coefficient,

    -- Recommended markdown based on days to expiry
    CASE
        WHEN md.days_to_expiry <= 1 THEN 60  -- 60% off
        WHEN md.days_to_expiry <= 3 THEN 40  -- 40% off
        WHEN md.days_to_expiry <= 7 THEN 25  -- 25% off
        ELSE 15
    END AS recommended_markdown_pct,

    md.year,
    md.month_num

FROM {SCHEMA_SILVER}.fact_markdown md

JOIN {SCHEMA_SILVER}.dim_product p ON md.product_id = p.product_id

LEFT JOIN {SCHEMA_GOLD}.gold_price_elasticity_matrix pe ON pe.product_id = md.product_id
"""

create_gold_table(
    "gold_markdown_optimizer",
    sql_markdown_optimizer,
    comment="Time-sensitive clearance for near-expiry/seasonal products"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 29. gold_customer_price_sens

# COMMAND ----------

sql_customer_price_sens = f"""
SELECT
    c.customer_id,
    c.loyalty_tier,
    c.customer_segment,
    c.city,

    p.category_l1,
    p.department,

    -- Price sensitivity indicators
    AVG(s.discount_amount / NULLIF(s.gross_amount, 0)) AS avg_discount_sought_pct,
    SUM(CASE WHEN s.promo_id IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS promo_purchase_pct,

    -- Price tier preference
    AVG(s.unit_selling_price / NULLIF(s.unit_mrp, 0)) AS avg_price_to_mrp_ratio,

    COUNT(*) AS total_purchases,
    SUM(s.net_amount) AS total_spend

FROM {SCHEMA_SILVER}.fact_pos_sales s

JOIN {SCHEMA_SILVER}.dim_customer c ON s.customer_id = c.customer_id
JOIN {SCHEMA_SILVER}.dim_product p ON s.product_id = p.product_id

WHERE s.customer_id IS NOT NULL

GROUP BY c.customer_id, c.loyalty_tier, c.customer_segment, c.city, p.category_l1, p.department
"""

create_gold_table(
    "gold_customer_price_sens",
    sql_customer_price_sens,
    comment="Price sensitivity by customer segment x category"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 30. gold_cohort_forecast

# COMMAND ----------

sql_cohort_forecast = f"""
SELECT
    c360.customer_segment AS cohort,
    gd.department,
    gd.category_l1,
    gd.year,
    gd.month_num,

    COUNT(DISTINCT c360.customer_id) AS cohort_size,
    SUM(gd.quantity_sold) AS total_qty,
    SUM(gd.revenue) AS total_revenue,
    AVG(gd.quantity_sold) AS avg_qty_per_customer

FROM {SCHEMA_GOLD}.gold_customer_360 c360

JOIN {SCHEMA_SILVER}.fact_pos_sales s ON c360.customer_id = s.customer_id

JOIN {SCHEMA_GOLD}.gold_demand_daily_sku_store gd
    ON gd.product_id = s.product_id
    AND gd.store_id = s.store_id
    AND gd.date_id = s.date_id

GROUP BY c360.customer_segment, gd.department, gd.category_l1, gd.year, gd.month_num
"""

create_gold_table(
    "gold_cohort_forecast",
    sql_cohort_forecast,
    comment="Demand by customer cohort (new/loyal/at-risk/lapsed)"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 31. gold_assortment_optimizer

# COMMAND ----------

sql_assortment_optimizer = f"""
SELECT
    a.assortment_id,
    a.product_id,
    a.store_id,

    p.product_name,
    p.category_l1,
    p.abc_class,
    p.department,

    st.city,
    st.store_type,
    st.cluster_id,

    a.listing_date,
    a.status,
    a.is_mandatory,

    -- Sales performance
    COALESCE(SUM(gd.quantity_sold), 0) AS total_qty_sold,
    COALESCE(SUM(gd.revenue), 0) AS total_revenue,
    COUNT(DISTINCT gd.date_id) AS selling_days,

    -- Delist score (low sales = higher score)
    CASE
        WHEN SUM(gd.quantity_sold) IS NULL OR SUM(gd.quantity_sold) = 0 THEN 100
        WHEN SUM(gd.quantity_sold) < 10 THEN 80
        WHEN SUM(gd.quantity_sold) < 50 THEN 50
        ELSE 0
    END AS delist_score,

    -- Recommendation
    CASE
        WHEN a.is_mandatory THEN 'Keep - Mandatory'
        WHEN SUM(gd.quantity_sold) IS NULL OR SUM(gd.quantity_sold) = 0 THEN 'Delist'
        WHEN SUM(gd.quantity_sold) < 10 THEN 'Review for Delist'
        ELSE 'Keep'
    END AS recommended_action

FROM {SCHEMA_SILVER}.fact_assortment a

JOIN {SCHEMA_SILVER}.dim_product p ON a.product_id = p.product_id
JOIN {SCHEMA_SILVER}.dim_store st ON a.store_id = st.store_id

LEFT JOIN {SCHEMA_GOLD}.gold_demand_daily_sku_store gd
    ON gd.product_id = a.product_id
    AND gd.store_id = a.store_id

GROUP BY
    a.assortment_id, a.product_id, a.store_id, p.product_name, p.category_l1,
    p.abc_class, p.department, st.city, st.store_type, st.cluster_id,
    a.listing_date, a.status, a.is_mandatory
"""

create_gold_table(
    "gold_assortment_optimizer",
    sql_assortment_optimizer,
    comment="List/delist decisions per store based on demand + space"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 32. gold_new_store_assort

# COMMAND ----------

sql_new_store_assort = f"""
WITH cluster_avg AS (
    SELECT
        cluster_id,
        product_id,
        AVG(quantity_sold) AS avg_cluster_qty,
        AVG(revenue) AS avg_cluster_revenue,
        COUNT(DISTINCT store_id) AS stores_carrying
    FROM {SCHEMA_GOLD}.gold_demand_daily_sku_store
    GROUP BY cluster_id, product_id
)

SELECT
    cl.cluster_id,
    cl.cluster_name,
    ca.product_id,

    p.product_name,
    p.category_l1,
    p.abc_class,

    ca.avg_cluster_qty,
    ca.avg_cluster_revenue,
    ca.stores_carrying,

    -- Assortment recommendation based on cluster performance
    CASE
        WHEN p.abc_class = 'A' THEN 'Must Stock'
        WHEN ca.stores_carrying > 5 AND ca.avg_cluster_qty > 10 THEN 'Recommended'
        WHEN ca.stores_carrying > 2 THEN 'Optional'
        ELSE 'Skip'
    END AS assortment_recommendation

FROM cluster_avg ca

JOIN {SCHEMA_SILVER}.dim_cluster cl ON ca.cluster_id = cl.cluster_id
JOIN {SCHEMA_SILVER}.dim_product p ON ca.product_id = p.product_id

WHERE ca.avg_cluster_qty > 0
"""

create_gold_table(
    "gold_new_store_assort",
    sql_new_store_assort,
    comment="Predicted assortment for new stores via cluster similarity"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 33. gold_inbound_forecast

# COMMAND ----------

sql_inbound_forecast = f"""
SELECT
    po.supplier_id,
    po.store_id,
    po.expected_delivery_date,

    s.supplier_name,
    st.city,
    st.store_type,

    COUNT(DISTINCT po.po_id) AS num_pos,
    SUM(po.order_qty) AS total_qty_expected,
    SUM(po.total_cost) AS total_value_expected,

    -- Lead time context
    AVG(COALESCE(s.payment_terms_days, 7)) AS avg_lead_time,

    -- Demand context for capacity planning
    AVG(gd.quantity_sold) AS avg_daily_demand

FROM {SCHEMA_SILVER}.fact_purchase_orders po

JOIN {SCHEMA_SILVER}.dim_supplier s ON po.supplier_id = s.supplier_id
JOIN {SCHEMA_SILVER}.dim_store st ON po.store_id = st.store_id

LEFT JOIN {SCHEMA_GOLD}.gold_demand_daily_sku_store gd
    ON gd.product_id = po.product_id
    AND gd.store_id = po.store_id

GROUP BY po.supplier_id, po.store_id, po.expected_delivery_date, s.supplier_name, st.city, st.store_type
"""

create_gold_table(
    "gold_inbound_forecast",
    sql_inbound_forecast,
    comment="Predicted inbound receipts for DC capacity planning"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 34. gold_regulatory_impact

# COMMAND ----------

sql_regulatory_impact = f"""
SELECT
    r.regulatory_id AS regulation_id,
    r.regulation_type,
    r.description,
    r.effective_date,
    r.affected_categories,

    -- Impact on demand (simplified - would need more complex analysis)
    AVG(gd.quantity_sold) AS avg_daily_demand_after,

    COUNT(DISTINCT gd.product_id) AS affected_products,
    COUNT(DISTINCT gd.store_id) AS affected_stores

FROM {SCHEMA_SILVER}.ext_regulatory r

LEFT JOIN {SCHEMA_GOLD}.gold_demand_daily_sku_store gd
    ON gd.date_id >= CAST(DATE_FORMAT(r.effective_date, 'yyyyMMdd') AS BIGINT)

GROUP BY r.regulatory_id, r.regulation_type, r.description, r.effective_date, r.affected_categories
"""

create_gold_table(
    "gold_regulatory_impact",
    sql_regulatory_impact,
    comment="GST/FSSAI/APMC change impact on price and demand"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 35. gold_new_product_forecast

# COMMAND ----------

sql_new_product_forecast = f"""
WITH similar_products AS (
    SELECT
        p1.product_id AS new_product_id,
        p2.product_id AS similar_product_id,
        p1.category_l1,
        p1.brand_id,
        p1.pack_size,
        AVG(gd.quantity_sold) AS avg_similar_qty,
        AVG(gd.revenue) AS avg_similar_revenue
    FROM {SCHEMA_SILVER}.dim_product p1
    JOIN {SCHEMA_SILVER}.dim_product p2
        ON p1.category_l1 = p2.category_l1
        AND p1.product_id != p2.product_id
    LEFT JOIN {SCHEMA_GOLD}.gold_demand_daily_sku_store gd
        ON gd.product_id = p2.product_id
    WHERE p1.lifecycle_stage = 'Launch' OR p1.lifecycle_stage = 'New'
    GROUP BY p1.product_id, p2.product_id, p1.category_l1, p1.brand_id, p1.pack_size
)

SELECT
    new_product_id AS product_id,
    category_l1,
    brand_id,
    pack_size,

    COUNT(DISTINCT similar_product_id) AS num_similar_products,
    AVG(avg_similar_qty) AS forecast_daily_qty,
    AVG(avg_similar_revenue) AS forecast_daily_revenue,

    -- Confidence based on number of similar products
    CASE
        WHEN COUNT(DISTINCT similar_product_id) >= 10 THEN 'High'
        WHEN COUNT(DISTINCT similar_product_id) >= 5 THEN 'Medium'
        ELSE 'Low'
    END AS forecast_confidence

FROM similar_products
GROUP BY new_product_id, category_l1, brand_id, pack_size
"""

create_gold_table(
    "gold_new_product_forecast",
    sql_new_product_forecast,
    comment="Cold-start forecast for new launches via attribute similarity"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ---
# MAGIC # TIER 4: ML Ops Placeholders
# MAGIC ---

# COMMAND ----------

# MAGIC %md
# MAGIC ## 36-38. ML Ops Tables (Placeholders)

# COMMAND ----------

# Create empty placeholder tables for ML Ops

# 36. gold_forecast_accuracy
create_empty_gold_table(
    "gold_forecast_accuracy",
    """(
        forecast_date DATE,
        product_id STRING,
        store_id STRING,
        horizon_days INT,
        forecast_qty DOUBLE,
        actual_qty DOUBLE,
        absolute_error DOUBLE,
        pct_error DOUBLE,
        model_version STRING,
        department STRING,
        store_type STRING,
        is_festival_period BOOLEAN,
        created_at TIMESTAMP
    )""",
    comment="PLACEHOLDER - Populated after inference pipeline runs"
)

# 37. gold_model_comparison
create_empty_gold_table(
    "gold_model_comparison",
    """(
        test_id STRING,
        test_name STRING,
        champion_model STRING,
        challenger_model STRING,
        champion_mape DOUBLE,
        challenger_mape DOUBLE,
        winner STRING,
        is_significant BOOLEAN,
        p_value DOUBLE,
        test_start_date DATE,
        test_end_date DATE,
        created_at TIMESTAMP
    )""",
    comment="PLACEHOLDER - Populated after A/B testing"
)

# 38. gold_feature_drift
create_empty_gold_table(
    "gold_feature_drift",
    """(
        feature_name STRING,
        date_id BIGINT,
        baseline_mean DOUBLE,
        current_mean DOUBLE,
        baseline_std DOUBLE,
        current_std DOUBLE,
        drift_score DOUBLE,
        is_drifted BOOLEAN,
        model_version STRING,
        created_at TIMESTAMP
    )""",
    comment="PLACEHOLDER - Populated after feature monitoring"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## Final Summary

# COMMAND ----------

print("\n" + "="*70)
print("GOLD LAYER PROCESSING COMPLETE")
print("="*70)

total_rows = sum(s.get("rows", 0) for s in gold_stats)
total_time = sum(s.get("elapsed_seconds", 0) for s in gold_stats)
errors = [s for s in gold_stats if "error" in s]
placeholders = [s for s in gold_stats if s.get("is_placeholder")]

print(f"\nTables Created: {len(gold_stats)}")
print(f"  - Data Tables: {len(gold_stats) - len(placeholders)}")
print(f"  - Placeholders: {len(placeholders)}")
print(f"Total Rows: {total_rows:,}")
print(f"Total Time: {total_time/60:.1f} minutes")
print(f"Errors: {len(errors)}")

print(f"\n{'TABLE':<40} {'ROWS':>15} {'TIME':>10}")
print("-"*65)
for stat in gold_stats:
    rows = stat.get('rows', 0)
    rows_str = f"{rows:,}" if rows > 0 else "placeholder"
    print(f"{stat['table_name']:<40} {rows_str:>15} {stat['elapsed_seconds']:>9.1f}s")

if errors:
    print(f"\n ERRORS:")
    for e in errors:
        print(f"  - {e['table_name']}: {e.get('error', 'Unknown')[:80]}")

print(f"\n Gold layer ready in: {SCHEMA_GOLD}")
print(f"Completed at: {datetime.now()}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Validation: Verify Key Tables

# COMMAND ----------

# Quick validation of key gold tables
key_gold_tables = [
    "gold_demand_daily_sku_store",
    "gold_inventory_health",
    "gold_customer_360",
    "gold_promo_effectiveness"
]

print("Validation of Key Gold Tables:")
print("-"*50)
for table in key_gold_tables:
    try:
        cnt = spark.table(f"{SCHEMA_GOLD}.{table}").count()
        sample = spark.table(f"{SCHEMA_GOLD}.{table}").limit(1).collect()
        cols = len(spark.table(f"{SCHEMA_GOLD}.{table}").columns)
        print(f" {table}: {cnt:,} rows, {cols} columns")
    except Exception as e:
        print(f" {table}: ERROR - {str(e)[:50]}")

print("\n Gold layer build complete!")
