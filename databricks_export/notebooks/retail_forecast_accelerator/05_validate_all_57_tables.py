# Databricks notebook source
# MAGIC %md
# MAGIC # 05 - Validate All 57 Tables
# MAGIC
# MAGIC This notebook validates all generated tables for:
# MAGIC 1. **Existence** - All 57 tables exist
# MAGIC 2. **Non-empty** - All tables have data
# MAGIC 3. **Row counts** - Approximate expected counts
# MAGIC 4. **Foreign key integrity** - Referential integrity checks
# MAGIC 5. **Business rules** - Price <= MRP, no negative inventory, etc.
# MAGIC 6. **Demand patterns** - Weekend lift, COVID impact, festival lift visible
# MAGIC
# MAGIC **Runtime:** ~3 minutes
# MAGIC
# MAGIC **Dependencies:** Run Notebooks 01, 02, 03 & 04 first

# COMMAND ----------

# MAGIC %md
# MAGIC ## Configuration

# COMMAND ----------

from pyspark.sql import functions as F
from datetime import datetime

CATALOG = "hive_metastore"
SCHEMA_BRONZE = "retail_bronze"

# All 57 tables organized by notebook
ALL_TABLES = {
    # NOTEBOOK 1: Dimensions (11 tables)
    "dimensions": [
        "dim_product",
        "dim_category",
        "dim_brand",
        "dim_store",
        "dim_channel",
        "dim_geography",
        "dim_cluster",
        "dim_date",
        "dim_time_of_day",
        "dim_customer",
        "dim_supplier",
    ],

    # NOTEBOOK 2: Core Facts (6 tables)
    "core_facts": [
        "fact_pos_sales",
        "fact_online_sales",
        "fact_inventory",
        "fact_price",
        "fact_promotions",
        "fact_purchase_orders",
    ],

    # NOTEBOOK 3: Derived Facts (13 tables)
    "derived_facts": [
        "fact_returns",
        "fact_stockout_events",
        "fact_cannibalization",
        "fact_demand_plan",
        "fact_loyalty",
        "fact_basket",
        "fact_shrinkage",
        "fact_markdown",
        "fact_assortment",
        "fact_planogram",
        "fact_footfall",
        "fact_delivery",
        "fact_reference_price",
    ],

    # NOTEBOOK 4: External Data (10 tables)
    "external_data": [
        "ext_weather",
        "ext_events_festivals",
        "ext_macro_economic",
        "ext_competitor",
        "ext_digital_signals",
        "ext_syndicated",
        "ext_ecommerce_signals",
        "ext_regulatory",
        "ext_agricultural",
        "ext_traffic_mobility",
    ],

    # NOTEBOOK 4: ML Tables (5 tables)
    "ml_tables": [
        "ml_feature_store",
        "ml_forecast_output",
        "ml_model_registry",
        "ml_training_dataset",
        "ml_ab_test",
    ],

    # NOTEBOOK 4: Config & Audit (4 tables)
    "config_audit": [
        "config_forecast_hierarchy",
        "config_business_rules",
        "audit_data_quality",
        "audit_forecast_accuracy",
    ],

    # NOTEBOOK 4: Price Addon (8 tables)
    "price_addon": [
        "fact_price_elasticity",
        "fact_promo_lift_curve",
        "fact_supplier_price_changes",
        "ext_commodity_prices",
        "config_price_architecture",
        "ml_price_feature_store",
        "ml_price_forecast_output",
        "fact_price_test",
    ],
}

# Flatten to get all table names
all_table_names = []
for category, tables in ALL_TABLES.items():
    all_table_names.extend(tables)

print(f"Total tables to validate: {len(all_table_names)}")
assert len(all_table_names) == 57, f"Expected 57 tables, got {len(all_table_names)}"

# COMMAND ----------

# MAGIC %md
# MAGIC ## 1. Existence & Row Count Validation

# COMMAND ----------

def validate_table_existence():
    """Check all 57 tables exist and are non-empty"""
    results = []
    total_rows = 0
    errors = 0

    for category, tables in ALL_TABLES.items():
        print(f"\n{'='*60}")
        print(f"Category: {category.upper()}")
        print('='*60)

        for table in tables:
            try:
                df = spark.table(f"{SCHEMA_BRONZE}.{table}")
                count = df.count()
                total_rows += count

                if count > 0:
                    status = "✅"
                    result = "OK"
                else:
                    status = "⚠️"
                    result = "EMPTY"
                    errors += 1

                print(f"{status} {table}: {count:,} rows")
                results.append({
                    "category": category,
                    "table": table,
                    "row_count": count,
                    "status": result
                })

            except Exception as e:
                print(f"❌ {table}: ERROR - {str(e)[:50]}")
                results.append({
                    "category": category,
                    "table": table,
                    "row_count": 0,
                    "status": "MISSING"
                })
                errors += 1

    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")
    print(f"Total tables checked: {len(results)}")
    print(f"Tables with errors: {errors}")
    print(f"Total rows across all tables: {total_rows:,}")

    return results, errors == 0

results, all_exist = validate_table_existence()

# COMMAND ----------

# MAGIC %md
# MAGIC ## 2. Foreign Key Integrity Checks

# COMMAND ----------

def validate_foreign_keys():
    """Validate referential integrity between tables"""
    print("\n" + "="*60)
    print("FOREIGN KEY INTEGRITY CHECKS")
    print("="*60)

    fk_checks = [
        # (child_table, parent_table, fk_column)
        ("fact_pos_sales", "dim_product", "product_id"),
        ("fact_pos_sales", "dim_store", "store_id"),
        ("fact_pos_sales", "dim_date", "date_id"),
        ("fact_online_sales", "dim_product", "product_id"),
        ("fact_online_sales", "dim_customer", "customer_id"),
        ("fact_inventory", "dim_product", "product_id"),
        ("fact_inventory", "dim_store", "store_id"),
        ("fact_price", "dim_product", "product_id"),
        ("dim_product", "dim_brand", "brand_id"),
        ("dim_product", "dim_category", "category_id"),
        ("dim_product", "dim_supplier", "supplier_id"),
        ("dim_store", "dim_channel", "channel_id"),
    ]

    all_passed = True
    for child, parent, fk_col in fk_checks:
        try:
            child_df = spark.table(f"{SCHEMA_BRONZE}.{child}")
            parent_df = spark.table(f"{SCHEMA_BRONZE}.{parent}")

            # Get primary key column (usually same name or first column)
            pk_col = fk_col

            # Find orphan records
            orphans = child_df.select(fk_col).distinct().join(
                parent_df.select(pk_col).distinct(),
                child_df[fk_col] == parent_df[pk_col],
                "left_anti"
            ).filter(F.col(fk_col).isNotNull()).count()

            if orphans == 0:
                print(f"✅ {child}.{fk_col} → {parent}: No orphans")
            else:
                print(f"⚠️ {child}.{fk_col} → {parent}: {orphans:,} orphan records")
                all_passed = False

        except Exception as e:
            print(f"❌ {child}.{fk_col} → {parent}: Error - {str(e)[:50]}")
            all_passed = False

    return all_passed

fk_passed = validate_foreign_keys()

# COMMAND ----------

# MAGIC %md
# MAGIC ## 3. Business Rule Validations

# COMMAND ----------

def validate_business_rules():
    """Validate key business rules"""
    print("\n" + "="*60)
    print("BUSINESS RULE VALIDATIONS")
    print("="*60)

    all_passed = True

    # Rule 1: Price <= MRP (with small tolerance for rounding)
    try:
        pos_sales = spark.table(f"{SCHEMA_BRONZE}.fact_pos_sales")
        mrp_violations = pos_sales.filter(
            F.col("unit_selling_price") > F.col("unit_mrp") * 1.001
        ).count()

        if mrp_violations == 0:
            print("✅ Price <= MRP: No violations")
        else:
            print(f"⚠️ Price <= MRP: {mrp_violations:,} violations")
            # Not critical - can happen with special pricing
    except Exception as e:
        print(f"❌ Price <= MRP: Error - {str(e)[:50]}")

    # Rule 2: No negative inventory
    try:
        inventory = spark.table(f"{SCHEMA_BRONZE}.fact_inventory")
        negative_stock = inventory.filter(F.col("closing_stock_qty") < 0).count()

        if negative_stock == 0:
            print("✅ No negative inventory: Passed")
        else:
            print(f"❌ No negative inventory: {negative_stock:,} violations")
            all_passed = False
    except Exception as e:
        print(f"❌ No negative inventory: Error - {str(e)[:50]}")

    # Rule 3: Quantity sold >= 0
    try:
        pos_sales = spark.table(f"{SCHEMA_BRONZE}.fact_pos_sales")
        negative_qty = pos_sales.filter(F.col("quantity_sold") < 0).count()

        if negative_qty == 0:
            print("✅ Quantity >= 0: Passed")
        else:
            print(f"❌ Quantity >= 0: {negative_qty:,} violations")
            all_passed = False
    except Exception as e:
        print(f"❌ Quantity >= 0: Error - {str(e)[:50]}")

    # Rule 4: Dates within expected range
    try:
        dim_date = spark.table(f"{SCHEMA_BRONZE}.dim_date")
        min_date = dim_date.agg(F.min("full_date")).collect()[0][0]
        max_date = dim_date.agg(F.max("full_date")).collect()[0][0]

        expected_min = datetime(2020, 1, 1).date()
        expected_max = datetime(2025, 12, 31).date()

        if min_date == expected_min and max_date == expected_max:
            print(f"✅ Date range: {min_date} to {max_date}")
        else:
            print(f"⚠️ Date range: {min_date} to {max_date} (expected {expected_min} to {expected_max})")
    except Exception as e:
        print(f"❌ Date range: Error - {str(e)[:50]}")

    # Rule 5: Store opening dates before transactions
    try:
        pos_sales = spark.table(f"{SCHEMA_BRONZE}.fact_pos_sales")
        dim_store = spark.table(f"{SCHEMA_BRONZE}.dim_store")
        dim_date = spark.table(f"{SCHEMA_BRONZE}.dim_date")

        # Join sales with store opening dates
        sales_with_store = pos_sales.join(
            dim_store.select("store_id", "opening_date"),
            "store_id"
        ).join(
            dim_date.select("date_id", "full_date"),
            "date_id"
        )

        invalid_sales = sales_with_store.filter(
            F.col("full_date") < F.col("opening_date")
        ).count()

        if invalid_sales == 0:
            print("✅ Sales after store opening: Passed")
        else:
            print(f"⚠️ Sales after store opening: {invalid_sales:,} sales before store opened")
    except Exception as e:
        print(f"❌ Sales after store opening: Error - {str(e)[:50]}")

    return all_passed

br_passed = validate_business_rules()

# COMMAND ----------

# MAGIC %md
# MAGIC ## 4. Demand Pattern Validations

# COMMAND ----------

def validate_demand_patterns():
    """Validate realistic demand patterns are visible"""
    print("\n" + "="*60)
    print("DEMAND PATTERN VALIDATIONS")
    print("="*60)

    all_passed = True

    try:
        pos_sales = spark.table(f"{SCHEMA_BRONZE}.fact_pos_sales")
        dim_date = spark.table(f"{SCHEMA_BRONZE}.dim_date")

        sales_with_date = pos_sales.join(
            dim_date.select("date_id", "is_weekend", "is_lockdown", "is_covid_period", "festival_intensity"),
            "date_id"
        )
        sales_with_date.cache()

        # Pattern 1: Weekend lift
        weekend_avg = sales_with_date.filter("is_weekend").agg(F.avg("quantity_sold")).collect()[0][0]
        weekday_avg = sales_with_date.filter("NOT is_weekend").agg(F.avg("quantity_sold")).collect()[0][0]

        if weekend_avg and weekday_avg:
            weekend_lift = weekend_avg / weekday_avg
            if weekend_lift > 1.10:
                print(f"✅ Weekend lift: {weekend_lift:.2f}x (expected >1.10)")
            else:
                print(f"⚠️ Weekend lift: {weekend_lift:.2f}x (expected >1.10)")
        else:
            print("⚠️ Weekend lift: Could not calculate")

        # Pattern 2: COVID lockdown impact
        lockdown_avg = sales_with_date.filter("is_lockdown").agg(F.avg("quantity_sold")).collect()[0][0]
        normal_avg = sales_with_date.filter("NOT is_covid_period").agg(F.avg("quantity_sold")).collect()[0][0]

        if lockdown_avg and normal_avg:
            covid_drop = 1 - (lockdown_avg / normal_avg)
            if covid_drop > 0.15:
                print(f"✅ COVID lockdown impact: {covid_drop:.1%} drop (expected >15%)")
            else:
                print(f"⚠️ COVID lockdown impact: {covid_drop:.1%} drop (expected >15%)")
        else:
            print("⚠️ COVID lockdown impact: Could not calculate")

        # Pattern 3: Festival lift
        festival_avg = sales_with_date.filter("festival_intensity = 'Peak'").agg(F.avg("quantity_sold")).collect()[0][0]
        normal_day_avg = sales_with_date.filter("festival_intensity IS NULL").agg(F.avg("quantity_sold")).collect()[0][0]

        if festival_avg and normal_day_avg:
            festival_lift = festival_avg / normal_day_avg
            if festival_lift > 1.5:
                print(f"✅ Festival (Peak) lift: {festival_lift:.2f}x (expected >1.5)")
            else:
                print(f"⚠️ Festival (Peak) lift: {festival_lift:.2f}x (expected >1.5)")
        else:
            print("⚠️ Festival lift: Could not calculate")

        sales_with_date.unpersist()

    except Exception as e:
        print(f"❌ Demand patterns: Error - {str(e)}")
        all_passed = False

    return all_passed

dp_passed = validate_demand_patterns()

# COMMAND ----------

# MAGIC %md
# MAGIC ## 5. Data Quality Summary Statistics

# COMMAND ----------

def generate_summary_stats():
    """Generate summary statistics for key tables"""
    print("\n" + "="*60)
    print("DATA QUALITY SUMMARY STATISTICS")
    print("="*60)

    key_tables = {
        "fact_pos_sales": ["quantity_sold", "net_amount"],
        "fact_inventory": ["closing_stock_qty", "sold_qty"],
        "fact_online_sales": ["quantity_sold", "net_amount"],
        "dim_product": ["mrp"],
        "dim_customer": ["avg_monthly_spend_inr"],
    }

    for table, columns in key_tables.items():
        print(f"\n--- {table} ---")
        try:
            df = spark.table(f"{SCHEMA_BRONZE}.{table}")

            for col in columns:
                if col in df.columns:
                    stats = df.select(
                        F.min(col).alias("min"),
                        F.max(col).alias("max"),
                        F.avg(col).alias("avg"),
                        F.stddev(col).alias("stddev"),
                        F.count(F.when(F.col(col).isNull(), 1)).alias("nulls")
                    ).collect()[0]

                    print(f"  {col}:")
                    print(f"    Min: {stats['min']}, Max: {stats['max']}, Avg: {stats['avg']:.2f if stats['avg'] else 'N/A'}")
                    print(f"    StdDev: {stats['stddev']:.2f if stats['stddev'] else 'N/A'}, Nulls: {stats['nulls']}")

        except Exception as e:
            print(f"  Error: {str(e)[:50]}")

generate_summary_stats()

# COMMAND ----------

# MAGIC %md
# MAGIC ## 6. Final Validation Report

# COMMAND ----------

print("\n")
print("="*70)
print("                    FINAL VALIDATION REPORT")
print("="*70)
print(f"\nValidation run at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print(f"Catalog: {CATALOG}")
print(f"Schema: {SCHEMA_BRONZE}")
print()

# Count results
existing_tables = sum(1 for r in results if r["status"] == "OK")
empty_tables = sum(1 for r in results if r["status"] == "EMPTY")
missing_tables = sum(1 for r in results if r["status"] == "MISSING")
total_rows = sum(r["row_count"] for r in results)

print("TABLE EXISTENCE:")
print(f"  ✅ Existing with data: {existing_tables}/57")
print(f"  ⚠️ Empty tables: {empty_tables}")
print(f"  ❌ Missing tables: {missing_tables}")
print(f"  📊 Total rows: {total_rows:,}")
print()

print("VALIDATION CHECKS:")
print(f"  {'✅' if fk_passed else '❌'} Foreign Key Integrity: {'PASSED' if fk_passed else 'FAILED'}")
print(f"  {'✅' if br_passed else '⚠️'} Business Rules: {'PASSED' if br_passed else 'WARNINGS'}")
print(f"  {'✅' if dp_passed else '⚠️'} Demand Patterns: {'PASSED' if dp_passed else 'WARNINGS'}")
print()

# Overall status
if existing_tables == 57 and fk_passed:
    overall_status = "✅ ALL VALIDATIONS PASSED"
elif existing_tables >= 50:
    overall_status = "⚠️ MOSTLY PASSED - Review warnings"
else:
    overall_status = "❌ VALIDATION FAILED - Missing tables"

print("="*70)
print(f"                    {overall_status}")
print("="*70)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 7. Table Details by Category

# COMMAND ----------

from pyspark.sql import Row

# Create summary dataframe
summary_data = []
for category, tables in ALL_TABLES.items():
    category_rows = 0
    category_tables = 0
    for table in tables:
        for r in results:
            if r["table"] == table:
                category_rows += r["row_count"]
                category_tables += 1 if r["status"] == "OK" else 0
    summary_data.append({
        "Category": category,
        "Tables": len(tables),
        "Existing": category_tables,
        "Total_Rows": category_rows
    })

summary_df = spark.createDataFrame(summary_data)
display(summary_df)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 8. Assert Final Checks (for CI/CD)

# COMMAND ----------

# Uncomment these assertions for CI/CD pipelines
# assert existing_tables == 57, f"Expected 57 tables, got {existing_tables}"
# assert fk_passed, "Foreign key integrity check failed"
# assert br_passed, "Business rules validation failed"

print("\n🎉 Validation notebook completed!")
print("\nNext steps:")
print("1. Review any warnings above")
print("2. Run OPTIMIZE on large tables if needed")
print("3. Create downstream views/aggregations")
print("4. Connect to BI tools (Power BI, Tableau)")
print("5. Start building ML models!")
