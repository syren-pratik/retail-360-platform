# Databricks notebook source
# Verify gold_demand_daily_sku_store data after chunk loading

import json

result = {}

try:
    df = spark.table("retail_gold.gold_demand_daily_sku_store")

    # Row count
    row_count = df.count()
    result["total_rows"] = row_count

    # Date range
    date_stats = df.selectExpr(
        "MIN(date_id) as min_date",
        "MAX(date_id) as max_date",
        "COUNT(DISTINCT date_id) as unique_dates",
        "COUNT(DISTINCT year) as unique_years"
    ).collect()[0]

    result["min_date"] = str(date_stats['min_date'])
    result["max_date"] = str(date_stats['max_date'])
    result["unique_dates"] = date_stats['unique_dates']
    result["unique_years"] = date_stats['unique_years']

    # Rows by year
    year_counts = df.groupBy("year").count().orderBy("year").collect()
    result["rows_by_year"] = {str(row['year']): row['count'] for row in year_counts}

    result["status"] = "SUCCESS"

except Exception as e:
    result["status"] = "ERROR"
    result["error"] = str(e)

# Return as JSON string
dbutils.notebook.exit(json.dumps(result))
