# Databricks notebook source
# Comprehensive validation of gold layer SQL against actual silver schemas

import re

# Get all silver tables and their schemas
silver_tables = {}
tables = spark.sql("SHOW TABLES IN retail_silver").collect()
print(f"Loading schemas for {len(tables)} silver tables...")

for t in tables:
    table_name = t.tableName
    try:
        cols = spark.table(f"retail_silver.{table_name}").columns
        silver_tables[table_name] = set(cols)
    except:
        pass

print(f"Loaded schemas for {len(silver_tables)} tables\n")

# Print all tables
print("SILVER TABLES AVAILABLE:")
for name in sorted(silver_tables.keys()):
    print(f"  - {name} ({len(silver_tables[name])} columns)")

# COMMAND ----------

# Check specific tables and columns that gold layer needs

required_tables = {
    "fact_pos_sales": ["date_id", "product_id", "store_id", "txn_id", "customer_id", "quantity_sold",
                       "unit_mrp", "unit_selling_price", "unit_cost_price", "gross_amount",
                       "discount_amount", "net_amount", "tax_amount", "promo_id", "is_on_promo",
                       "payment_method", "time_slot_id"],
    "fact_online_sales": ["date_id", "product_id", "store_id", "order_id", "customer_id",
                          "quantity_sold", "unit_mrp", "unit_selling_price", "unit_cost_price",
                          "gross_amount", "discount_amount", "net_amount", "tax_amount",
                          "payment_method", "delivery_charge_inr"],
    "fact_inventory": ["date_id", "product_id", "store_id", "opening_stock_qty", "closing_stock_qty",
                       "received_qty", "days_of_stock", "is_stockout", "damaged_qty", "expired_qty"],
    "dim_product": ["product_id", "department", "category_l1", "category_l2", "brand_id",
                    "abc_class", "xyz_class", "current_mrp", "is_perishable", "is_essential_commodity",
                    "lifecycle_stage", "pack_size", "pack_uom", "shelf_life_days", "supplier_id"],
    "dim_store": ["store_id", "city", "state", "region", "store_type", "cluster_id", "geo_id"],
    "dim_date": ["date_id", "full_date", "day_of_week", "day_name", "is_weekend", "month_num",
                 "month_name", "quarter", "year", "fiscal_year", "fiscal_quarter", "indian_season",
                 "is_public_holiday", "is_festival_period", "festival_name", "festival_intensity",
                 "days_to_festival", "is_wedding_season", "is_ipl_season", "is_exam_season",
                 "is_monsoon_active", "is_salary_week", "is_harvest_season", "is_ramadan",
                 "is_navratri_fast", "is_lockdown", "is_covid_period", "covid_demand_multiplier",
                 "week_of_year"],
    "ext_weather": ["date_id", "geo_id", "temp_avg_c", "temp_min_c", "temp_max_c", "humidity_pct",
                    "rainfall_mm", "is_extreme_weather", "aqi"],
    "fact_delivery": ["date_id", "fulfillment_store_id", "delivery_partner", "actual_time_mins",
                      "promised_time_mins", "sla_met", "delay_mins", "delivery_attempt",
                      "delivery_rating", "order_id"],
    "dim_customer": ["customer_id", "loyalty_tier", "age_bracket", "gender", "city",
                     "income_segment", "registration_date"],
    "fact_basket": ["basket_id", "txn_id", "date_id", "store_id", "customer_id", "total_items",
                    "unique_products", "total_quantity", "gross_value", "total_discount",
                    "net_value", "total_tax", "avg_item_price", "discount_pct", "basket_type",
                    "basket_category", "payment_method", "time_in_store_mins", "has_promo_item"],
}

# Optional tables (gold layer should handle missing gracefully)
optional_tables = [
    "fact_footfall",
    "fact_loyalty",
    "fact_shrinkage",
    "fact_price",
    "fact_promotions",
    "fact_price_elasticity",
    "fact_reference_price",
    "fact_stockout_events",
    "fact_cannibalization",
    "fact_assortment",
    "fact_purchase_orders",
    "fact_markdown",
    "fact_planogram",
    "fact_supplier_price_changes",
    "dim_supplier",
    "dim_cluster",
    "dim_geography",
    "ext_competitor",
    "ext_ecommerce_signals",
    "ext_macro_economic",
    "ext_digital_signals",
    "ext_regulatory",
]

print("\n" + "="*70)
print("VALIDATING REQUIRED TABLES AND COLUMNS")
print("="*70)

all_valid = True
for table, required_cols in required_tables.items():
    if table not in silver_tables:
        print(f"\n MISSING TABLE: {table}")
        all_valid = False
    else:
        missing = set(required_cols) - silver_tables[table]
        if missing:
            print(f"\n TABLE {table}:")
            print(f"   MISSING COLUMNS: {missing}")
            print(f"   AVAILABLE: {sorted(silver_tables[table])}")
            all_valid = False
        else:
            print(f" {table}: OK")

print("\n" + "="*70)
print("CHECKING OPTIONAL TABLES")
print("="*70)
for table in optional_tables:
    if table in silver_tables:
        print(f" {table}: EXISTS ({len(silver_tables[table])} columns)")
    else:
        print(f" {table}: NOT FOUND (gold layer should handle)")

print("\n" + "="*70)
if all_valid:
    print(" ALL REQUIRED VALIDATIONS PASSED!")
else:
    print(" VALIDATION FAILED - FIX ISSUES BEFORE RUNNING GOLD LAYER")
print("="*70)

# COMMAND ----------

# Print detailed schema for key tables
print("\n" + "="*70)
print("DETAILED SCHEMAS FOR KEY TABLES")
print("="*70)

key_tables = ["dim_product", "dim_store", "fact_pos_sales", "fact_online_sales", "fact_inventory", "dim_date", "ext_weather", "dim_customer", "fact_delivery", "fact_basket"]

for t in key_tables:
    if t in silver_tables:
        print(f"\n{t}:")
        for col in sorted(silver_tables[t]):
            print(f"  - {col}")
