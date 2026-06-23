# Databricks notebook source
# MAGIC %md
# MAGIC # 04 - Generate External Data, ML Tables, Config & Price Addon
# MAGIC
# MAGIC This notebook generates 27 tables:
# MAGIC
# MAGIC **External Data (10 tables):**
# MAGIC 1. ext_weather (~22K rows)
# MAGIC 2. ext_events_festivals (~300 rows)
# MAGIC 3. ext_macro_economic (72 rows)
# MAGIC 4. ext_competitor (~150K rows)
# MAGIC 5. ext_digital_signals (~60K rows)
# MAGIC 6. ext_syndicated (~18K rows)
# MAGIC 7. ext_ecommerce_signals (~100K rows)
# MAGIC 8. ext_regulatory (30 rows)
# MAGIC 9. ext_agricultural (~40K rows)
# MAGIC 10. ext_traffic_mobility (~22K rows)
# MAGIC
# MAGIC **ML Tables (5 tables):**
# MAGIC 11. ml_feature_store (200 rows sample)
# MAGIC 12. ml_forecast_output (200 rows sample)
# MAGIC 13. ml_model_registry (5 rows)
# MAGIC 14. ml_training_dataset (3 rows)
# MAGIC 15. ml_ab_test (5 rows)
# MAGIC
# MAGIC **Config & Audit (4 tables):**
# MAGIC 16. config_forecast_hierarchy (8 rows)
# MAGIC 17. config_business_rules (50 rows)
# MAGIC 18. audit_data_quality (200 rows)
# MAGIC 19. audit_forecast_accuracy (200 rows)
# MAGIC
# MAGIC **Price Addon (8 tables):**
# MAGIC 20. fact_price_elasticity (~10K rows)
# MAGIC 21. fact_promo_lift_curve (~5K rows)
# MAGIC 22. fact_supplier_price_changes (~1K rows)
# MAGIC 23. ext_commodity_prices (~15K rows)
# MAGIC 24. config_price_architecture (80 rows)
# MAGIC 25. ml_price_feature_store (200 rows sample)
# MAGIC 26. ml_price_forecast_output (200 rows sample)
# MAGIC 27. fact_price_test (12 rows)
# MAGIC
# MAGIC **Runtime:** ~5 minutes
# MAGIC
# MAGIC **Dependencies:** Run Notebooks 01, 02 & 03 first

# COMMAND ----------

# MAGIC %md
# MAGIC ## Configuration & Setup

# COMMAND ----------

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pyspark.sql import SparkSession
from pyspark.sql.types import *
import pyspark.sql.functions as F
import random
import math

# Configuration - Using hive_metastore
CATALOG = "hive_metastore"
SCHEMA_BRONZE = "retail_bronze"

# Full production scale
DATE_START = datetime(2020, 1, 1)
DATE_END = datetime(2025, 12, 31)
NUM_DAYS = 2192

# Set random seed
np.random.seed(42)
random.seed(42)

# City climate data
CITY_CLIMATE = {
    "Mumbai":    {"base_temp": 28, "range": 8,  "monsoon": "SW", "monsoon_rain": 180, "aqi_base": 60},
    "Delhi NCR": {"base_temp": 25, "range": 20, "monsoon": "SW", "monsoon_rain": 120, "aqi_base": 150},
    "Bangalore": {"base_temp": 24, "range": 6,  "monsoon": "SW", "monsoon_rain": 100, "aqi_base": 50},
    "Chennai":   {"base_temp": 30, "range": 6,  "monsoon": "NE", "monsoon_rain": 150, "aqi_base": 55},
    "Hyderabad": {"base_temp": 27, "range": 12, "monsoon": "SW", "monsoon_rain": 100, "aqi_base": 55},
    "Kolkata":   {"base_temp": 27, "range": 14, "monsoon": "SW", "monsoon_rain": 160, "aqi_base": 80},
    "Pune":      {"base_temp": 25, "range": 10, "monsoon": "SW", "monsoon_rain": 120, "aqi_base": 55},
    "Ahmedabad": {"base_temp": 28, "range": 16, "monsoon": "SW", "monsoon_rain": 80,  "aqi_base": 70},
    "Jaipur":    {"base_temp": 26, "range": 22, "monsoon": "SW", "monsoon_rain": 60,  "aqi_base": 80},
    "Lucknow":   {"base_temp": 26, "range": 20, "monsoon": "SW", "monsoon_rain": 100, "aqi_base": 120},
}

print("✅ Configuration loaded")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Load Dimension Tables

# COMMAND ----------

dim_geography = spark.table(f"{SCHEMA_BRONZE}.dim_geography")
dim_product = spark.table(f"{SCHEMA_BRONZE}.dim_product")
dim_category = spark.table(f"{SCHEMA_BRONZE}.dim_category")
dim_store = spark.table(f"{SCHEMA_BRONZE}.dim_store")
dim_date = spark.table(f"{SCHEMA_BRONZE}.dim_date")
dim_supplier = spark.table(f"{SCHEMA_BRONZE}.dim_supplier")

print("✅ Dimension tables loaded")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate ext_weather (~22K rows)

# COMMAND ----------

def generate_weather():
    """Generate daily weather data for each city"""
    weather_data = []

    for day_num in range(NUM_DAYS):
        date = DATE_START + timedelta(days=day_num)
        day_of_year = date.timetuple().tm_yday

        for city, climate in CITY_CLIMATE.items():
            # Temperature model: sinusoidal with seasonal variation
            # Peak in May (day ~135), trough in Jan (day ~15)
            temp_base = climate["base_temp"]
            temp_range = climate["range"]
            # Sinusoidal: peaks around day 135 (mid-May)
            temp = temp_base + temp_range/2 * math.sin(2 * math.pi * (day_of_year - 105) / 365)
            temp += random.uniform(-3, 3)  # Daily variation

            # Rainfall
            rain = 0.0
            is_monsoon = False
            if climate["monsoon"] == "SW":
                # Southwest monsoon: June-September
                if date.month in [6, 7, 8, 9]:
                    is_monsoon = True
                    rain = random.uniform(0, climate["monsoon_rain"]) if random.random() > 0.3 else 0
            else:
                # Northeast monsoon (Chennai): October-December
                if date.month in [10, 11, 12]:
                    is_monsoon = True
                    rain = random.uniform(0, climate["monsoon_rain"]) if random.random() > 0.4 else 0

            # Humidity
            humidity = 40 + (rain > 0) * 30 + random.uniform(-10, 20)
            humidity = max(20, min(100, humidity))

            # AQI - worse in winter for North Indian cities
            aqi = climate["aqi_base"]
            if city in ["Delhi NCR", "Lucknow"] and date.month in [11, 12, 1]:
                aqi *= random.uniform(2.0, 3.5)  # Crop burning + winter inversion
            aqi += random.uniform(-20, 30)
            aqi = max(20, min(500, aqi))

            # Weather condition
            if rain > 50:
                condition = "Heavy Rain"
            elif rain > 10:
                condition = "Rain"
            elif rain > 0:
                condition = "Light Rain"
            elif aqi > 300:
                condition = "Smog"
            elif temp > 40:
                condition = "Extreme Heat"
            elif temp < 10:
                condition = "Cold"
            else:
                condition = random.choice(["Sunny", "Partly Cloudy", "Cloudy"])

            weather_data.append({
                "weather_id": f"WTH-{city[:3].upper()}-{date.strftime('%Y%m%d')}",
                "date_id": int(date.strftime("%Y%m%d")),
                "geo_id": f"GEO-{list(CITY_CLIMATE.keys()).index(city) + 15:04d}",  # City geo IDs start from 15
                "city": city,
                "temperature_c": round(temp, 1),
                "temperature_min_c": round(temp - random.uniform(3, 8), 1),
                "temperature_max_c": round(temp + random.uniform(3, 8), 1),
                "rainfall_mm": round(rain, 1),
                "humidity_pct": round(humidity, 0),
                "wind_speed_kmph": round(random.uniform(5, 30), 1),
                "aqi": int(aqi),
                "weather_condition": condition,
                "is_monsoon_day": is_monsoon and rain > 0,
                "is_extreme_weather": temp > 42 or rain > 100 or aqi > 300,
            })

    return pd.DataFrame(weather_data)

weather_df = generate_weather()
spark_weather = spark.createDataFrame(weather_df)
spark_weather.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.ext_weather")
print(f"✅ ext_weather: {spark_weather.count():,} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate ext_events_festivals (~300 rows)

# COMMAND ----------

def generate_events():
    """Generate events and festivals data"""
    events = []
    event_id = 1

    # IPL seasons
    ipl_periods = [
        (2020, "2020-09-19", "2020-11-10"),  # COVID-delayed
        (2021, "2021-04-09", "2021-05-30"),
        (2021, "2021-09-19", "2021-10-15"),  # Phase 2
        (2022, "2022-03-26", "2022-05-29"),
        (2023, "2023-03-31", "2023-05-28"),
        (2024, "2024-03-22", "2024-05-26"),
        (2025, "2025-03-21", "2025-05-25"),
    ]

    for year, start, end in ipl_periods:
        # ~70 matches per season
        match_dates = pd.date_range(start, end, periods=70)
        for match_date in match_dates:
            events.append({
                "event_id": f"EVT-{event_id:06d}",
                "event_date": match_date.date(),
                "event_name": f"IPL {year} Match",
                "event_type": "Sports",
                "event_category": "Cricket",
                "event_impact": "High",
                "affected_regions": "National",
                "affected_cities": "All",
                "affected_categories": "Snacks & Biscuits,Beverages",
                "demand_multiplier": 1.25,
                "start_date": datetime.strptime(start, "%Y-%m-%d").date(),
                "end_date": datetime.strptime(end, "%Y-%m-%d").date(),
                "is_recurring": True,
                "source": "BCCI Schedule",
                "confidence_score": 0.95,
                "created_at": datetime.now()
            })
            event_id += 1

    # Major elections
    elections = [
        ("2024-04-19", "2024-06-01", "Lok Sabha Elections 2024", "National"),
        ("2021-03-27", "2021-04-29", "West Bengal Assembly Elections", "West Bengal"),
        ("2022-02-10", "2022-03-07", "UP Assembly Elections", "Uttar Pradesh"),
    ]

    for start, end, name, region in elections:
        events.append({
            "event_id": f"EVT-{event_id:06d}",
            "event_date": datetime.strptime(start, "%Y-%m-%d").date(),
            "event_name": name,
            "event_type": "Political",
            "event_category": "Election",
            "event_impact": "Medium",
            "affected_regions": region,
            "affected_cities": "Multiple",
            "affected_categories": "All",
            "demand_multiplier": 0.95,  # Slight dip during elections
            "start_date": datetime.strptime(start, "%Y-%m-%d").date(),
            "end_date": datetime.strptime(end, "%Y-%m-%d").date(),
            "is_recurring": False,
            "source": "ECI",
            "confidence_score": 1.0,
            "created_at": datetime.now()
        })
        event_id += 1

    # School exams
    for year in range(2020, 2026):
        events.append({
            "event_id": f"EVT-{event_id:06d}",
            "event_date": datetime(year, 2, 15).date(),
            "event_name": f"Board Exams {year}",
            "event_type": "Academic",
            "event_category": "Exams",
            "event_impact": "Medium",
            "affected_regions": "National",
            "affected_cities": "All",
            "affected_categories": "Snacks & Biscuits,Beverages,Personal Care",
            "demand_multiplier": 1.10,
            "start_date": datetime(year, 2, 15).date(),
            "end_date": datetime(year, 4, 15).date(),
            "is_recurring": True,
            "source": "CBSE/State Boards",
            "confidence_score": 0.90,
            "created_at": datetime.now()
        })
        event_id += 1

    return pd.DataFrame(events)

events_df = generate_events()
spark_events = spark.createDataFrame(events_df)
spark_events.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.ext_events_festivals")
print(f"✅ ext_events_festivals: {spark_events.count():,} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate ext_macro_economic (72 rows)

# COMMAND ----------

def generate_macro_economic():
    """Generate monthly macroeconomic indicators"""
    macro = []

    # Base values
    cpi_base = 120.0
    diesel_base = 75.0
    gold_base = 45000.0
    usd_inr_base = 73.0
    repo_rate_base = 5.15
    rural_wage_base = 320.0

    for year in range(2020, 2026):
        for month in range(1, 13):
            month_idx = (year - 2020) * 12 + month

            # COVID impact on CPI (deflation in 2020)
            if year == 2020 and month in [4, 5, 6]:
                cpi_mult = 0.98
            else:
                cpi_mult = 1 + 0.005 * month_idx + random.uniform(-0.01, 0.02)

            # Diesel price surge in 2022
            if year == 2022:
                diesel_mult = 1.35
            elif year >= 2023:
                diesel_mult = 1.25
            else:
                diesel_mult = 1.0 + 0.02 * (year - 2020)

            # Gold trend
            gold_mult = 1 + 0.08 * (year - 2020) + random.uniform(-0.05, 0.10)

            # USD-INR depreciation
            usd_inr_mult = 1 + 0.03 * (year - 2020) + random.uniform(-0.02, 0.04)

            # Repo rate - cut in 2020, increased in 2022-2023
            if year == 2020:
                repo = repo_rate_base - 1.15  # COVID cuts
            elif year == 2022:
                repo = repo_rate_base + 1.0  # Inflation fighting
            elif year >= 2023:
                repo = repo_rate_base + 2.0
            else:
                repo = repo_rate_base

            macro.append({
                "macro_id": f"MAC-{year}{month:02d}",
                "year": year,
                "month": month,
                "period_date": datetime(year, month, 1).date(),
                "cpi_index": round(cpi_base * cpi_mult, 2),
                "cpi_yoy_change_pct": round((cpi_mult - 1) * 100 + random.uniform(-1, 3), 2),
                "wpi_index": round(115 * cpi_mult * 0.95, 2),
                "diesel_price_inr": round(diesel_base * diesel_mult + random.uniform(-5, 10), 2),
                "petrol_price_inr": round((diesel_base + 10) * diesel_mult + random.uniform(-5, 10), 2),
                "gold_price_inr_10g": round(gold_base * gold_mult, 0),
                "silver_price_inr_kg": round(45000 * gold_mult * 0.8, 0),
                "usd_inr_rate": round(usd_inr_base * usd_inr_mult, 2),
                "repo_rate_pct": round(repo + random.uniform(-0.1, 0.1), 2),
                "reverse_repo_rate_pct": round(repo - 0.25, 2),
                "gdp_growth_yoy_pct": round(random.uniform(-2 if year == 2020 else 4, 8), 1),
                "unemployment_rate_pct": round(random.uniform(5 if year == 2020 else 3, 8), 1),
                "rural_wage_index": round(rural_wage_base * (1 + 0.05 * (year - 2020)), 0),
                "consumer_confidence_index": round(90 + random.uniform(-20, 30), 1),
                "manufacturing_pmi": round(50 + random.uniform(-8, 15), 1),
                "services_pmi": round(52 + random.uniform(-10, 12), 1),
                "source": "RBI/MOSPI",
                "created_at": datetime.now()
            })

    return pd.DataFrame(macro)

macro_df = generate_macro_economic()
spark_macro = spark.createDataFrame(macro_df)
spark_macro.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.ext_macro_economic")
print(f"✅ ext_macro_economic: {spark_macro.count():,} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate ext_competitor (~150K rows)

# COMMAND ----------

# Weekly competitor prices for top 200 SKUs × 5 competitors × 6 years
# Simplified version

competitors = ["Reliance Fresh", "Big Bazaar", "Star Bazaar", "Spencer's", "More Supermarket"]
top_products = dim_product.select("product_id", "product_name", "mrp", "category_l1").limit(200).collect()

competitor_data = []
comp_id = 1

for year in range(2020, 2026):
    for week in range(1, 53):
        week_date = datetime(year, 1, 1) + timedelta(weeks=week-1)
        if week_date > DATE_END:
            break

        for product in top_products[:50]:  # Limit for performance
            for competitor in competitors:
                # Competitor price relative to our price
                price_ratio = random.uniform(0.92, 1.08)

                competitor_data.append({
                    "comp_price_id": f"CP-{comp_id:08d}",
                    "product_id": product["product_id"],
                    "competitor_name": competitor,
                    "year": year,
                    "week_of_year": week,
                    "observation_date": week_date.date(),
                    "competitor_price": round(product["mrp"] * price_ratio, 2),
                    "our_price": round(product["mrp"] * 0.95, 2),
                    "price_gap_pct": round((price_ratio - 1) * 100, 2),
                    "is_promo_price": random.random() > 0.85,
                    "promo_type": random.choice([None, "BOGO", "% Off", "Flat Off"]) if random.random() > 0.85 else None,
                    "stock_status": random.choice(["In Stock", "In Stock", "In Stock", "Low Stock", "Out of Stock"]),
                    "source": "Web Scrape",
                    "confidence_score": round(random.uniform(0.8, 0.98), 2),
                    "created_at": datetime.now()
                })
                comp_id += 1

comp_df = pd.DataFrame(competitor_data)
spark_comp = spark.createDataFrame(comp_df)
spark_comp.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.ext_competitor")
print(f"✅ ext_competitor: {spark_comp.count():,} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate ext_digital_signals (~60K rows)

# COMMAND ----------

# Weekly Google Trends and social signals for top 200 products
digital_data = []
dig_id = 1

top_products_names = [p["product_name"][:30] for p in top_products[:200]]

for year in range(2020, 2026):
    for week in range(1, 53):
        week_date = datetime(year, 1, 1) + timedelta(weeks=week-1)
        if week_date > DATE_END:
            break

        for i, prod_name in enumerate(top_products_names[:100]):
            # Google trends score (0-100)
            base_trend = 30 + random.uniform(0, 40)
            # Festival boost
            if week in [44, 45, 46]:  # Diwali season
                base_trend *= 1.5

            digital_data.append({
                "signal_id": f"DIG-{dig_id:08d}",
                "product_name": prod_name,
                "product_id": top_products[i]["product_id"] if i < len(top_products) else None,
                "year": year,
                "week_of_year": week,
                "observation_date": week_date.date(),
                "google_trends_score": min(100, int(base_trend)),
                "trends_yoy_change_pct": round(random.uniform(-30, 50), 1),
                "twitter_mentions": int(random.uniform(10, 500)),
                "instagram_mentions": int(random.uniform(50, 2000)),
                "youtube_searches": int(random.uniform(100, 5000)),
                "sentiment_score": round(random.uniform(0.3, 0.9), 2),
                "sentiment_label": random.choice(["Positive", "Positive", "Neutral", "Negative"]),
                "viral_score": round(random.uniform(0, 1), 2),
                "source": "Google Trends API",
                "created_at": datetime.now()
            })
            dig_id += 1

digital_df = pd.DataFrame(digital_data)
spark_digital = spark.createDataFrame(digital_df)
spark_digital.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.ext_digital_signals")
print(f"✅ ext_digital_signals: {spark_digital.count():,} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate ext_syndicated (~18K rows)

# COMMAND ----------

# Monthly NielsenIQ-style market share data per category × city
categories = dim_category.select("category_id", "category_l2_name", "department_name").distinct().collect()
cities = list(CITY_CLIMATE.keys())

syndicated_data = []
syn_id = 1

for year in range(2020, 2026):
    for month in range(1, 13):
        period_date = datetime(year, month, 1)
        if period_date > DATE_END:
            break

        for cat in categories[:30]:  # Limit for performance
            for city in cities:
                syndicated_data.append({
                    "syndicated_id": f"SYN-{syn_id:08d}",
                    "year": year,
                    "month": month,
                    "period_date": period_date.date(),
                    "category_id": cat["category_id"],
                    "category_name": cat["category_l2_name"],
                    "city": city,
                    "total_market_value_cr": round(random.uniform(10, 500), 2),
                    "our_market_share_pct": round(random.uniform(5, 25), 1),
                    "top_competitor_share_pct": round(random.uniform(15, 40), 1),
                    "private_label_share_pct": round(random.uniform(3, 15), 1),
                    "market_growth_yoy_pct": round(random.uniform(-5, 20), 1),
                    "penetration_pct": round(random.uniform(30, 90), 1),
                    "avg_price_index": round(random.uniform(95, 105), 1),
                    "promo_intensity_pct": round(random.uniform(10, 40), 1),
                    "source": "NielsenIQ",
                    "created_at": datetime.now()
                })
                syn_id += 1

syndicated_df = pd.DataFrame(syndicated_data)
spark_syndicated = spark.createDataFrame(syndicated_df)
spark_syndicated.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.ext_syndicated")
print(f"✅ ext_syndicated: {spark_syndicated.count():,} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate ext_ecommerce_signals (~100K rows)

# COMMAND ----------

# Daily e-commerce signals for top 50 products on Amazon/Flipkart/BigBasket
ecom_platforms = ["Amazon", "Flipkart", "BigBasket", "JioMart", "Blinkit"]

ecom_data = []
ecom_id = 1

for day_num in range(0, NUM_DAYS, 7):  # Weekly for performance
    date = DATE_START + timedelta(days=day_num)

    for i, product in enumerate(top_products[:50]):
        for platform in ecom_platforms:
            ecom_data.append({
                "ecom_signal_id": f"ECOM-{ecom_id:08d}",
                "product_id": product["product_id"],
                "product_name": product["product_name"][:50],
                "platform": platform,
                "observation_date": date.date(),
                "platform_price": round(product["mrp"] * random.uniform(0.88, 1.02), 2),
                "mrp": product["mrp"],
                "discount_pct": round(random.uniform(0, 15), 0),
                "rating": round(random.uniform(3.5, 4.8), 1),
                "review_count": int(random.uniform(100, 10000)),
                "best_seller_rank": int(random.uniform(1, 500)) if random.random() > 0.7 else None,
                "in_stock": random.random() > 0.1,
                "delivery_days": random.choice([1, 2, 3, 5, 7]) if platform != "Blinkit" else 0,
                "is_prime_eligible": platform == "Amazon" and random.random() > 0.3,
                "source": "E-com Scrape",
                "created_at": datetime.now()
            })
            ecom_id += 1

ecom_df = pd.DataFrame(ecom_data)
spark_ecom = spark.createDataFrame(ecom_df)
spark_ecom.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.ext_ecommerce_signals")
print(f"✅ ext_ecommerce_signals: {spark_ecom.count():,} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate ext_regulatory (30 rows)

# COMMAND ----------

regulatory_events = [
    # GST changes
    {"date": "2020-01-01", "type": "GST", "desc": "GST rate rationalization - essential commodities", "impact": "Low"},
    {"date": "2021-06-01", "type": "GST", "desc": "GST on COVID essentials reduced", "impact": "Medium"},
    {"date": "2022-07-18", "type": "GST", "desc": "GST on pre-packaged foods introduced", "impact": "High"},
    {"date": "2023-01-01", "type": "GST", "desc": "GST council rate revisions", "impact": "Medium"},

    # FSSAI
    {"date": "2020-04-01", "type": "FSSAI", "desc": "New labeling norms for packaged food", "impact": "Medium"},
    {"date": "2021-10-01", "type": "FSSAI", "desc": "Fortification standards updated", "impact": "Low"},
    {"date": "2022-07-01", "type": "FSSAI", "desc": "Front of pack nutrition labeling", "impact": "High"},
    {"date": "2023-01-01", "type": "FSSAI", "desc": "Health star rating system pilot", "impact": "Medium"},

    # Import duties
    {"date": "2020-02-01", "type": "Import Duty", "desc": "Palm oil import duty increased", "impact": "High"},
    {"date": "2021-02-01", "type": "Import Duty", "desc": "Agri import duty budget changes", "impact": "Medium"},
    {"date": "2022-05-15", "type": "Import Duty", "desc": "Wheat export ban", "impact": "High"},
    {"date": "2023-08-20", "type": "Import Duty", "desc": "Sugar export restrictions", "impact": "Medium"},

    # E-commerce regulations
    {"date": "2020-12-01", "type": "E-commerce", "desc": "Consumer Protection E-commerce Rules", "impact": "Medium"},
    {"date": "2021-06-21", "type": "E-commerce", "desc": "IT Rules 2021 for intermediaries", "impact": "Medium"},
    {"date": "2022-01-01", "type": "E-commerce", "desc": "Country of origin labeling mandatory", "impact": "Low"},

    # Plastic ban
    {"date": "2022-07-01", "type": "Environment", "desc": "Single-use plastic ban", "impact": "High"},
    {"date": "2023-01-01", "type": "Environment", "desc": "Extended producer responsibility rules", "impact": "Medium"},

    # Price controls
    {"date": "2020-03-25", "type": "Price Control", "desc": "Essential commodities price cap during COVID", "impact": "High"},
    {"date": "2021-01-01", "type": "Price Control", "desc": "Price cap lifted for most items", "impact": "Medium"},

    # Labor laws
    {"date": "2020-09-29", "type": "Labor", "desc": "New labor codes passed", "impact": "Medium"},
    {"date": "2022-04-01", "type": "Labor", "desc": "New wage code implementation", "impact": "Medium"},
]

reg_data = []
for i, reg in enumerate(regulatory_events, 1):
    reg_data.append({
        "regulatory_id": f"REG-{i:04d}",
        "effective_date": datetime.strptime(reg["date"], "%Y-%m-%d").date(),
        "regulation_type": reg["type"],
        "regulation_name": reg["desc"],
        "description": reg["desc"],
        "affected_categories": "All" if reg["impact"] == "High" else "Select",
        "impact_level": reg["impact"],
        "compliance_deadline": (datetime.strptime(reg["date"], "%Y-%m-%d") + timedelta(days=90)).date(),
        "compliance_status": "Compliant",
        "source": "Government Gazette",
        "url": f"https://regulatory.gov.in/{i}",
        "created_at": datetime.now()
    })

reg_df = pd.DataFrame(reg_data)
spark_reg = spark.createDataFrame(reg_df)
spark_reg.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.ext_regulatory")
print(f"✅ ext_regulatory: {spark_reg.count():,} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate ext_agricultural (~40K rows)

# COMMAND ----------

# Daily mandi prices for key commodities
commodities = ["Wheat", "Rice (Basmati)", "Rice (Non-Basmati)", "Sugar", "Toor Dal", "Moong Dal", "Mustard Oil"]
mandis = ["Azadpur (Delhi)", "Vashi (Mumbai)", "Yeshwanthpur (Bangalore)", "Koyambedu (Chennai)", "Ahmedabad APMC"]

agri_data = []
agri_id = 1

# Base prices per kg
base_prices = {
    "Wheat": 22, "Rice (Basmati)": 45, "Rice (Non-Basmati)": 25,
    "Sugar": 38, "Toor Dal": 95, "Moong Dal": 85, "Mustard Oil": 140
}

for day_num in range(0, NUM_DAYS, 7):  # Weekly
    date = DATE_START + timedelta(days=day_num)
    year = date.year

    for commodity in commodities:
        for mandi in mandis:
            base = base_prices[commodity]
            # Yearly inflation
            year_mult = 1 + 0.06 * (year - 2020)
            # Seasonal variation
            month = date.month
            if commodity in ["Wheat", "Rice (Non-Basmati)"] and month in [3, 4, 5]:  # Harvest
                seasonal_mult = 0.9
            elif commodity == "Sugar" and month in [11, 12, 1, 2]:  # Crushing season
                seasonal_mult = 0.92
            else:
                seasonal_mult = 1.0

            price = base * year_mult * seasonal_mult * random.uniform(0.92, 1.08)

            agri_data.append({
                "agri_price_id": f"AGR-{agri_id:08d}",
                "observation_date": date.date(),
                "commodity": commodity,
                "mandi_name": mandi,
                "min_price_per_kg": round(price * 0.9, 2),
                "max_price_per_kg": round(price * 1.1, 2),
                "modal_price_per_kg": round(price, 2),
                "arrivals_tonnes": int(random.uniform(100, 5000)),
                "traded_tonnes": int(random.uniform(50, 3000)),
                "price_change_wow_pct": round(random.uniform(-5, 5), 2),
                "msp_per_kg": round(base * 0.85, 2) if commodity in ["Wheat", "Rice (Non-Basmati)"] else None,
                "source": "Agmarknet",
                "created_at": datetime.now()
            })
            agri_id += 1

agri_df = pd.DataFrame(agri_data)
spark_agri = spark.createDataFrame(agri_df)
spark_agri.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.ext_agricultural")
print(f"✅ ext_agricultural: {spark_agri.count():,} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate ext_traffic_mobility (~22K rows)

# COMMAND ----------

# Daily mobility data per city
mobility_data = []
mob_id = 1

for day_num in range(NUM_DAYS):
    date = DATE_START + timedelta(days=day_num)

    for city in CITY_CLIMATE.keys():
        # COVID lockdown impact
        if date >= datetime(2020, 3, 25) and date <= datetime(2020, 5, 31):
            retail_mobility = -70 + random.uniform(-10, 10)
            transit_mobility = -80 + random.uniform(-10, 10)
            workplace_mobility = -60 + random.uniform(-10, 10)
        elif date >= datetime(2021, 4, 1) and date <= datetime(2021, 6, 30):
            retail_mobility = -50 + random.uniform(-15, 15)
            transit_mobility = -60 + random.uniform(-10, 10)
            workplace_mobility = -45 + random.uniform(-15, 15)
        else:
            retail_mobility = random.uniform(-15, 25)
            transit_mobility = random.uniform(-20, 20)
            workplace_mobility = random.uniform(-10, 15)

        mobility_data.append({
            "mobility_id": f"MOB-{mob_id:08d}",
            "date_id": int(date.strftime("%Y%m%d")),
            "observation_date": date.date(),
            "city": city,
            "retail_recreation_pct_change": round(retail_mobility, 1),
            "grocery_pharmacy_pct_change": round(retail_mobility * 0.7 + random.uniform(-5, 10), 1),
            "transit_stations_pct_change": round(transit_mobility, 1),
            "workplace_pct_change": round(workplace_mobility, 1),
            "residential_pct_change": round(-workplace_mobility * 0.5 + random.uniform(-5, 5), 1),
            "source": "Google Mobility Reports",
            "created_at": datetime.now()
        })
        mob_id += 1

mobility_df = pd.DataFrame(mobility_data)
spark_mobility = spark.createDataFrame(mobility_df)
spark_mobility.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.ext_traffic_mobility")
print(f"✅ ext_traffic_mobility: {spark_mobility.count():,} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate ML Tables

# COMMAND ----------

# ML Feature Store - sample structure
ml_features = []
for i in range(200):
    ml_features.append({
        "feature_id": f"FTR-{i+1:06d}",
        "product_id": f"PRD-{random.randint(1, 2000):06d}",
        "store_id": f"STR-{random.randint(1, 275):04d}",
        "date_id": 20241201 + i % 30,
        "feature_date": (datetime(2024, 12, 1) + timedelta(days=i % 30)).date(),
        "lag_sales_1d": random.randint(0, 50),
        "lag_sales_7d": random.randint(0, 300),
        "lag_sales_14d": random.randint(0, 600),
        "lag_sales_28d": random.randint(0, 1200),
        "rolling_mean_7d": round(random.uniform(5, 50), 2),
        "rolling_mean_14d": round(random.uniform(5, 50), 2),
        "rolling_mean_28d": round(random.uniform(5, 50), 2),
        "rolling_std_7d": round(random.uniform(1, 20), 2),
        "rolling_std_14d": round(random.uniform(1, 20), 2),
        "day_of_week": random.randint(1, 7),
        "week_of_year": random.randint(1, 52),
        "month": random.randint(1, 12),
        "is_weekend": random.choice([True, False]),
        "is_holiday": random.choice([True, False, False, False]),
        "is_festival_period": random.choice([True, False, False]),
        "days_to_festival": random.randint(0, 30) if random.random() > 0.7 else None,
        "price_current": round(random.uniform(20, 500), 2),
        "price_lag_7d": round(random.uniform(20, 500), 2),
        "price_change_pct": round(random.uniform(-10, 10), 2),
        "is_on_promo": random.choice([True, False, False, False]),
        "promo_discount_pct": random.uniform(0, 30) if random.random() > 0.7 else 0,
        "competitor_price": round(random.uniform(20, 500), 2),
        "price_gap_pct": round(random.uniform(-15, 15), 2),
        "stock_level": random.randint(0, 100),
        "days_of_stock": round(random.uniform(0, 30), 1),
        "is_low_stock": random.choice([True, False, False]),
        "temperature": round(random.uniform(15, 40), 1),
        "rainfall_mm": round(random.uniform(0, 50), 1),
        "is_monsoon": random.choice([True, False]),
        "aqi": random.randint(30, 200),
        "google_trends": random.randint(20, 100),
        "product_age_days": random.randint(30, 2000),
        "abc_class": random.choice(["A", "B", "C"]),
        "store_tier": random.choice(["Tier1", "Tier2"]),
        "store_format": random.choice(["Hypermarket", "Supermarket", "Express", "Dark Store"]),
        "created_at": datetime.now(),
    })

ml_features_df = pd.DataFrame(ml_features)
spark_ml_features = spark.createDataFrame(ml_features_df)
spark_ml_features.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.ml_feature_store")
print(f"✅ ml_feature_store: {spark_ml_features.count():,} rows written")

# COMMAND ----------

# ML Forecast Output - sample structure
ml_forecast = []
for i in range(200):
    ml_forecast.append({
        "forecast_id": f"FCT-{i+1:06d}",
        "model_id": f"MDL-00{random.randint(1,5)}",
        "product_id": f"PRD-{random.randint(1, 2000):06d}",
        "store_id": f"STR-{random.randint(1, 275):04d}",
        "forecast_date": (datetime(2024, 12, 1) + timedelta(days=i % 30)).date(),
        "horizon_days": random.choice([1, 7, 14, 28]),
        "predicted_qty": round(random.uniform(1, 100), 1),
        "predicted_qty_lower": round(random.uniform(0.5, 50), 1),
        "predicted_qty_upper": round(random.uniform(50, 150), 1),
        "confidence_level": 0.95,
        "actual_qty": random.randint(1, 100) if random.random() > 0.3 else None,
        "absolute_error": round(random.uniform(0, 30), 2),
        "percentage_error": round(random.uniform(0, 40), 2),
        "is_within_interval": random.choice([True, True, True, False]),
        "model_version": "v1.0",
        "feature_importance_top5": '{"lag_sales_7d": 0.25, "rolling_mean_14d": 0.18, "is_weekend": 0.12}',
        "created_at": datetime.now(),
    })

ml_forecast_df = pd.DataFrame(ml_forecast)
spark_ml_forecast = spark.createDataFrame(ml_forecast_df)
spark_ml_forecast.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.ml_forecast_output")
print(f"✅ ml_forecast_output: {spark_ml_forecast.count():,} rows written")

# COMMAND ----------

# ML Model Registry
ml_models = [
    {"model_id": "MDL-001", "model_name": "LightGBM Demand", "model_type": "Gradient Boosting", "framework": "LightGBM", "version": "1.0.0", "status": "Production"},
    {"model_id": "MDL-002", "model_name": "XGBoost Demand", "model_type": "Gradient Boosting", "framework": "XGBoost", "version": "1.0.0", "status": "Staging"},
    {"model_id": "MDL-003", "model_name": "Prophet Daily", "model_type": "Time Series", "framework": "Prophet", "version": "1.0.0", "status": "Archived"},
    {"model_id": "MDL-004", "model_name": "DeepAR Weekly", "model_type": "Deep Learning", "framework": "GluonTS", "version": "1.0.0", "status": "Development"},
    {"model_id": "MDL-005", "model_name": "Ensemble Demand", "model_type": "Ensemble", "framework": "Custom", "version": "1.0.0", "status": "Production"},
]

for m in ml_models:
    m.update({
        "description": f"Demand forecasting model using {m['framework']}",
        "created_by": "data_science_team",
        "created_at": datetime(2024, 1, 1),
        "updated_at": datetime(2024, 12, 1),
        "training_data_start": datetime(2020, 1, 1).date(),
        "training_data_end": datetime(2024, 9, 30).date(),
        "validation_mape": round(random.uniform(8, 18), 2),
        "validation_rmse": round(random.uniform(3, 12), 2),
        "features_count": random.randint(30, 60),
        "hyperparameters": '{"learning_rate": 0.05, "max_depth": 8, "num_leaves": 128}',
        "mlflow_run_id": f"run_{random.randint(10000, 99999)}",
    })

ml_models_df = pd.DataFrame(ml_models)
spark_ml_models = spark.createDataFrame(ml_models_df)
spark_ml_models.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.ml_model_registry")
print(f"✅ ml_model_registry: {spark_ml_models.count():,} rows written")

# COMMAND ----------

# ML Training Dataset
ml_training = [
    {"dataset_id": "DS-001", "dataset_name": "Training Set 2024", "version": "1.0", "rows": 50000000, "features": 52, "start_date": datetime(2020,1,1).date(), "end_date": datetime(2024,6,30).date()},
    {"dataset_id": "DS-002", "dataset_name": "Validation Set 2024", "version": "1.0", "rows": 10000000, "features": 52, "start_date": datetime(2024,7,1).date(), "end_date": datetime(2024,9,30).date()},
    {"dataset_id": "DS-003", "dataset_name": "Test Set 2024", "version": "1.0", "rows": 5000000, "features": 52, "start_date": datetime(2024,10,1).date(), "end_date": datetime(2024,11,30).date()},
]

for d in ml_training:
    d.update({
        "storage_path": f"/mnt/ml/datasets/{d['dataset_id']}",
        "file_format": "parquet",
        "created_by": "data_science_team",
        "created_at": datetime.now(),
    })

ml_training_df = pd.DataFrame(ml_training)
spark_ml_training = spark.createDataFrame(ml_training_df)
spark_ml_training.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.ml_training_dataset")
print(f"✅ ml_training_dataset: {spark_ml_training.count():,} rows written")

# COMMAND ----------

# ML A/B Test
ml_ab_tests = [
    {"test_id": "AB-001", "test_name": "LightGBM vs XGBoost Q4", "status": "Completed", "winner": "LightGBM"},
    {"test_id": "AB-002", "test_name": "Feature Engineering V2 Test", "status": "Completed", "winner": "V2"},
    {"test_id": "AB-003", "test_name": "Ensemble vs Single Model", "status": "Running", "winner": None},
    {"test_id": "AB-004", "test_name": "Daily vs Weekly Retrain", "status": "Planned", "winner": None},
    {"test_id": "AB-005", "test_name": "External Features Impact", "status": "Completed", "winner": "With External"},
]

for t in ml_ab_tests:
    t.update({
        "start_date": datetime(2024, random.randint(1, 10), 1).date(),
        "end_date": datetime(2024, random.randint(11, 12), 28).date() if t["status"] == "Completed" else None,
        "control_model_id": "MDL-001",
        "treatment_model_id": "MDL-002",
        "metric_primary": "MAPE",
        "metric_secondary": "Revenue Impact",
        "control_mape": round(random.uniform(10, 15), 2),
        "treatment_mape": round(random.uniform(8, 14), 2),
        "lift_pct": round(random.uniform(-5, 15), 2),
        "statistical_significance": round(random.uniform(0.90, 0.99), 2),
        "created_at": datetime.now(),
    })

ml_ab_df = pd.DataFrame(ml_ab_tests)
spark_ml_ab = spark.createDataFrame(ml_ab_df)
spark_ml_ab.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.ml_ab_test")
print(f"✅ ml_ab_test: {spark_ml_ab.count():,} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate Config & Audit Tables

# COMMAND ----------

# Config Forecast Hierarchy
config_hierarchy = [
    {"level_id": 1, "level_name": "Total Company", "level_code": "L0", "aggregation_method": "Sum", "parent_level": None},
    {"level_id": 2, "level_name": "Region", "level_code": "L1", "aggregation_method": "Sum", "parent_level": 1},
    {"level_id": 3, "level_name": "City", "level_code": "L2", "aggregation_method": "Sum", "parent_level": 2},
    {"level_id": 4, "level_name": "Store", "level_code": "L3", "aggregation_method": "Sum", "parent_level": 3},
    {"level_id": 5, "level_name": "Department", "level_code": "D1", "aggregation_method": "Sum", "parent_level": 1},
    {"level_id": 6, "level_name": "Category", "level_code": "D2", "aggregation_method": "Sum", "parent_level": 5},
    {"level_id": 7, "level_name": "Subcategory", "level_code": "D3", "aggregation_method": "Sum", "parent_level": 6},
    {"level_id": 8, "level_name": "SKU", "level_code": "D4", "aggregation_method": "Sum", "parent_level": 7},
]

for h in config_hierarchy:
    h.update({
        "reconciliation_method": "Top-Down" if h["level_id"] <= 4 else "Middle-Out",
        "forecast_frequency": "Daily",
        "is_active": True,
        "created_at": datetime.now(),
    })

hierarchy_df = pd.DataFrame(config_hierarchy)
spark_hierarchy = spark.createDataFrame(hierarchy_df)
spark_hierarchy.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.config_forecast_hierarchy")
print(f"✅ config_forecast_hierarchy: {spark_hierarchy.count():,} rows written")

# COMMAND ----------

# Config Business Rules
rules = []
rule_types = ["MOQ", "Safety Stock", "Shelf Life", "Replenishment", "Markdown", "Pricing", "Display"]

for i in range(50):
    rule_type = random.choice(rule_types)
    rules.append({
        "rule_id": f"RUL-{i+1:04d}",
        "rule_name": f"{rule_type} Rule {i+1}",
        "rule_type": rule_type,
        "rule_description": f"Business rule for {rule_type.lower()} management",
        "category_scope": random.choice(["All", "Grocery & Staples", "Dairy & Frozen", "Beverages"]),
        "store_scope": random.choice(["All", "Hypermarket", "Supermarket", "Express"]),
        "rule_logic": f"IF condition THEN action_{i}",
        "threshold_value": round(random.uniform(1, 100), 2),
        "threshold_unit": random.choice(["days", "units", "percent", "INR"]),
        "priority": random.randint(1, 5),
        "is_active": True,
        "effective_from": datetime(2020, 1, 1).date(),
        "effective_to": None,
        "created_at": datetime.now(),
    })

rules_df = pd.DataFrame(rules)
spark_rules = spark.createDataFrame(rules_df)
spark_rules.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.config_business_rules")
print(f"✅ config_business_rules: {spark_rules.count():,} rows written")

# COMMAND ----------

# Audit Data Quality
audit_dq = []
tables = ["fact_pos_sales", "fact_inventory", "dim_product", "dim_store", "fact_price"]
checks = ["Null Check", "Range Check", "Referential Integrity", "Uniqueness", "Freshness"]

for i in range(200):
    check_type = random.choice(checks)
    table = random.choice(tables)
    status = random.choices(["Passed", "Passed", "Passed", "Warning", "Failed"], weights=[0.7, 0.1, 0.1, 0.07, 0.03])[0]

    audit_dq.append({
        "audit_id": f"AUD-{i+1:06d}",
        "run_date": (datetime(2024, 12, 1) + timedelta(days=i % 30)).date(),
        "run_timestamp": datetime.now(),
        "table_name": table,
        "check_type": check_type,
        "check_name": f"{check_type} on {table}",
        "check_sql": f"SELECT COUNT(*) FROM {table} WHERE ...",
        "expected_value": 0 if check_type in ["Null Check", "Failed"] else 1,
        "actual_value": 0 if status == "Passed" else random.randint(1, 100),
        "status": status,
        "severity": "High" if status == "Failed" else "Medium" if status == "Warning" else "Low",
        "rows_affected": 0 if status == "Passed" else random.randint(1, 1000),
        "error_message": None if status == "Passed" else f"Found {random.randint(1, 100)} issues",
        "created_at": datetime.now(),
    })

audit_dq_df = pd.DataFrame(audit_dq)
spark_audit_dq = spark.createDataFrame(audit_dq_df)
spark_audit_dq.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.audit_data_quality")
print(f"✅ audit_data_quality: {spark_audit_dq.count():,} rows written")

# COMMAND ----------

# Audit Forecast Accuracy
audit_fc = []
for i in range(200):
    audit_fc.append({
        "accuracy_id": f"ACC-{i+1:06d}",
        "model_id": f"MDL-00{random.randint(1,5)}",
        "forecast_date": (datetime(2024, 11, 1) + timedelta(days=i % 30)).date(),
        "actual_date": (datetime(2024, 12, 1) + timedelta(days=i % 30)).date(),
        "granularity": random.choice(["SKU-Store-Day", "SKU-Store-Week", "Category-Region-Week"]),
        "total_forecasts": random.randint(10000, 100000),
        "mape": round(random.uniform(8, 20), 2),
        "rmse": round(random.uniform(3, 15), 2),
        "mae": round(random.uniform(2, 10), 2),
        "bias": round(random.uniform(-5, 5), 2),
        "coverage_95": round(random.uniform(0.90, 0.98), 2),
        "within_10pct_accuracy": round(random.uniform(0.50, 0.75), 2),
        "within_20pct_accuracy": round(random.uniform(0.70, 0.90), 2),
        "best_category": random.choice(["Salt", "Edible Oil", "Milk"]),
        "worst_category": random.choice(["Ice Cream", "Seasonal", "New Products"]),
        "created_at": datetime.now(),
    })

audit_fc_df = pd.DataFrame(audit_fc)
spark_audit_fc = spark.createDataFrame(audit_fc_df)
spark_audit_fc.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.audit_forecast_accuracy")
print(f"✅ audit_forecast_accuracy: {spark_audit_fc.count():,} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate Price Addon Tables

# COMMAND ----------

# fact_price_elasticity (~10K rows)
elasticity_data = []
products = dim_product.select("product_id", "category_l2", "abc_class").limit(500).collect()

for prod in products:
    for year in range(2020, 2026):
        elasticity_data.append({
            "elasticity_id": f"ELA-{len(elasticity_data)+1:06d}",
            "product_id": prod["product_id"],
            "category_l2": prod["category_l2"],
            "year": year,
            "computation_date": datetime(year, 12, 31).date(),
            "own_price_elasticity": round(random.uniform(-2.5, -0.3), 3),
            "cross_price_elasticity": round(random.uniform(0.1, 0.5), 3),
            "income_elasticity": round(random.uniform(0.2, 1.5), 3),
            "promo_elasticity": round(random.uniform(1.2, 2.5), 3),
            "sample_size": random.randint(1000, 50000),
            "r_squared": round(random.uniform(0.6, 0.95), 3),
            "p_value": round(random.uniform(0.001, 0.05), 4),
            "confidence_interval_lower": round(random.uniform(-3.0, -1.5), 3),
            "confidence_interval_upper": round(random.uniform(-0.5, 0.0), 3),
            "is_significant": random.random() > 0.1,
            "methodology": random.choice(["Log-Log Regression", "Constant Elasticity", "AIDS Model"]),
            "data_source": "POS Sales",
            "created_at": datetime.now(),
        })

elasticity_df = pd.DataFrame(elasticity_data)
spark_elasticity = spark.createDataFrame(elasticity_df)
spark_elasticity.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.fact_price_elasticity")
print(f"✅ fact_price_elasticity: {spark_elasticity.count():,} rows written")

# COMMAND ----------

# fact_promo_lift_curve (~5K rows)
promo_lift_data = []
categories = dim_category.select("category_id", "category_l2_name").distinct().limit(50).collect()

for cat in categories:
    for discount_pct in range(5, 55, 5):
        for store_format in ["Hypermarket", "Supermarket", "Express"]:
            promo_lift_data.append({
                "lift_id": f"LIFT-{len(promo_lift_data)+1:06d}",
                "category_id": cat["category_id"],
                "category_name": cat["category_l2_name"],
                "store_format": store_format,
                "discount_pct": discount_pct,
                "base_sales_qty": random.randint(100, 1000),
                "promo_sales_qty": random.randint(150, 2000),
                "lift_pct": round(random.uniform(20, 150) * (discount_pct / 30), 1),
                "roi": round(random.uniform(0.5, 3.0), 2),
                "incremental_margin": round(random.uniform(-1000, 5000), 2),
                "cannibalization_pct": round(random.uniform(5, 25), 1),
                "halo_effect_pct": round(random.uniform(0, 15), 1),
                "sample_promos": random.randint(10, 100),
                "confidence_score": round(random.uniform(0.7, 0.95), 2),
                "computation_date": datetime(2024, 12, 1).date(),
                "created_at": datetime.now(),
            })

promo_lift_df = pd.DataFrame(promo_lift_data)
spark_promo_lift = spark.createDataFrame(promo_lift_df)
spark_promo_lift.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.fact_promo_lift_curve")
print(f"✅ fact_promo_lift_curve: {spark_promo_lift.count():,} rows written")

# COMMAND ----------

# fact_supplier_price_changes (~1K rows)
supplier_changes = []
suppliers = dim_supplier.select("supplier_id", "supplier_name").distinct().collect()

for sup in suppliers:
    for year in range(2020, 2026):
        # 3-5 price change events per supplier per year
        num_changes = random.randint(3, 5)
        for _ in range(num_changes):
            supplier_changes.append({
                "change_id": f"SPC-{len(supplier_changes)+1:06d}",
                "supplier_id": sup["supplier_id"],
                "supplier_name": sup["supplier_name"],
                "change_date": datetime(year, random.randint(1, 12), random.randint(1, 28)).date(),
                "effective_date": datetime(year, random.randint(1, 12), random.randint(1, 28)).date(),
                "change_type": random.choice(["Cost Increase", "Cost Decrease", "Terms Change"]),
                "change_reason": random.choice(["Raw Material", "Logistics", "Currency", "Contract Renewal"]),
                "old_cost_inr": round(random.uniform(50, 500), 2),
                "new_cost_inr": round(random.uniform(50, 500) * random.uniform(0.95, 1.10), 2),
                "change_pct": round(random.uniform(-10, 15), 2),
                "affected_products_count": random.randint(5, 100),
                "total_impact_monthly_inr": round(random.uniform(10000, 500000), 2),
                "is_negotiated": random.random() > 0.5,
                "negotiation_outcome": random.choice(["Accepted", "Partial", "Rejected", None]),
                "created_at": datetime.now(),
            })

supplier_changes_df = pd.DataFrame(supplier_changes)
spark_supplier_changes = spark.createDataFrame(supplier_changes_df)
spark_supplier_changes.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.fact_supplier_price_changes")
print(f"✅ fact_supplier_price_changes: {spark_supplier_changes.count():,} rows written")

# COMMAND ----------

# ext_commodity_prices (~15K rows)
commodities_list = ["Palm Oil", "Sugar", "Wheat", "Milk", "Crude Oil", "Packaging Paper", "HDPE Plastic"]
commodity_prices = []

for day_num in range(NUM_DAYS):
    date = DATE_START + timedelta(days=day_num)

    for commodity in commodities_list:
        base_price = {"Palm Oil": 85, "Sugar": 35, "Wheat": 22, "Milk": 42, "Crude Oil": 75, "Packaging Paper": 55, "HDPE Plastic": 95}[commodity]

        # Price trend with volatility
        trend = 1 + 0.05 * (date.year - 2020)
        volatility = random.uniform(0.92, 1.08)

        # COVID and Russia-Ukraine impacts
        if commodity == "Crude Oil":
            if date.year == 2020 and date.month in [4, 5]:
                trend *= 0.5  # Crash
            elif date.year == 2022:
                trend *= 1.4  # Ukraine war

        if commodity in ["Wheat", "Sugar"] and date.year == 2022:
            trend *= 1.3

        commodity_prices.append({
            "commodity_price_id": f"COM-{len(commodity_prices)+1:08d}",
            "observation_date": date.date(),
            "commodity": commodity,
            "unit": "per kg" if commodity not in ["Crude Oil"] else "per barrel",
            "spot_price_inr": round(base_price * trend * volatility, 2),
            "futures_1m_price": round(base_price * trend * volatility * random.uniform(0.98, 1.03), 2),
            "futures_3m_price": round(base_price * trend * volatility * random.uniform(0.96, 1.06), 2),
            "price_change_dod_pct": round(random.uniform(-3, 3), 2),
            "price_change_wow_pct": round(random.uniform(-8, 8), 2),
            "price_change_mom_pct": round(random.uniform(-15, 15), 2),
            "price_change_yoy_pct": round(random.uniform(-20, 30), 2),
            "high_52w": round(base_price * trend * 1.2, 2),
            "low_52w": round(base_price * trend * 0.8, 2),
            "source": random.choice(["MCX", "NCDEX", "Bloomberg"]),
            "created_at": datetime.now(),
        })

commodity_prices_df = pd.DataFrame(commodity_prices)
spark_commodity = spark.createDataFrame(commodity_prices_df)
spark_commodity.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.ext_commodity_prices")
print(f"✅ ext_commodity_prices: {spark_commodity.count():,} rows written")

# COMMAND ----------

# config_price_architecture (80 rows)
price_rules = []
rule_types_pricing = ["KVI", "Price Ladder", "Min Margin", "Max Margin", "Price Ending", "Competitive", "Bundle"]

for i in range(80):
    rule_type = random.choice(rule_types_pricing)
    price_rules.append({
        "rule_id": f"PRC-{i+1:04d}",
        "rule_name": f"{rule_type} Rule {i+1}",
        "rule_type": rule_type,
        "description": f"Pricing rule for {rule_type.lower()} strategy",
        "category_scope": random.choice(["All", "Grocery & Staples", "Dairy & Frozen", "Beverages"]),
        "brand_scope": random.choice(["All", "National Brands", "Private Label"]),
        "store_scope": random.choice(["All", "Hypermarket", "Supermarket"]),
        "rule_logic": f"price = base_price * factor_{i}",
        "price_floor_pct": round(random.uniform(80, 95), 0),
        "price_ceiling_pct": round(random.uniform(100, 120), 0),
        "min_margin_pct": round(random.uniform(5, 15), 1),
        "max_margin_pct": round(random.uniform(25, 40), 1),
        "price_ending": random.choice(["9", "5", "0", "99"]),
        "competitive_index_target": round(random.uniform(95, 105), 1),
        "priority": random.randint(1, 10),
        "is_active": True,
        "effective_from": datetime(2020, 1, 1).date(),
        "created_at": datetime.now(),
    })

price_rules_df = pd.DataFrame(price_rules)
spark_price_rules = spark.createDataFrame(price_rules_df)
spark_price_rules.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.config_price_architecture")
print(f"✅ config_price_architecture: {spark_price_rules.count():,} rows written")

# COMMAND ----------

# ml_price_feature_store (200 rows sample)
ml_price_features = []
for i in range(200):
    ml_price_features.append({
        "feature_id": f"PFT-{i+1:06d}",
        "product_id": f"PRD-{random.randint(1, 2000):06d}",
        "store_id": f"STR-{random.randint(1, 275):04d}",
        "feature_date": (datetime(2024, 12, 1) + timedelta(days=i % 30)).date(),
        "current_price": round(random.uniform(20, 500), 2),
        "current_mrp": round(random.uniform(25, 550), 2),
        "current_margin_pct": round(random.uniform(10, 35), 2),
        "competitor_price_avg": round(random.uniform(20, 500), 2),
        "competitor_price_min": round(random.uniform(18, 450), 2),
        "competitor_price_max": round(random.uniform(25, 550), 2),
        "price_index_vs_market": round(random.uniform(90, 110), 1),
        "elasticity_estimate": round(random.uniform(-2.5, -0.5), 3),
        "promo_flag": random.choice([0, 0, 0, 1]),
        "promo_depth_pct": round(random.uniform(0, 30), 0),
        "days_since_last_price_change": random.randint(0, 180),
        "cost_price_trend": round(random.uniform(-5, 10), 2),
        "demand_forecast_7d": random.randint(10, 500),
        "inventory_weeks": round(random.uniform(1, 8), 1),
        "category_price_index": round(random.uniform(95, 105), 1),
        "brand_premium_index": round(random.uniform(80, 130), 1),
        "created_at": datetime.now(),
    })

ml_price_features_df = pd.DataFrame(ml_price_features)
spark_ml_price_features = spark.createDataFrame(ml_price_features_df)
spark_ml_price_features.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.ml_price_feature_store")
print(f"✅ ml_price_feature_store: {spark_ml_price_features.count():,} rows written")

# COMMAND ----------

# ml_price_forecast_output (200 rows sample)
ml_price_forecast = []
for i in range(200):
    ml_price_forecast.append({
        "forecast_id": f"PFC-{i+1:06d}",
        "model_id": "MDL-PRICE-001",
        "product_id": f"PRD-{random.randint(1, 2000):06d}",
        "store_id": f"STR-{random.randint(1, 275):04d}",
        "forecast_date": (datetime(2024, 12, 1) + timedelta(days=i % 30)).date(),
        "current_price": round(random.uniform(20, 500), 2),
        "recommended_price": round(random.uniform(20, 500), 2),
        "price_change_pct": round(random.uniform(-10, 15), 2),
        "expected_demand_current": random.randint(10, 200),
        "expected_demand_new": random.randint(10, 200),
        "expected_revenue_current": round(random.uniform(1000, 50000), 2),
        "expected_revenue_new": round(random.uniform(1000, 50000), 2),
        "expected_margin_current": round(random.uniform(100, 10000), 2),
        "expected_margin_new": round(random.uniform(100, 10000), 2),
        "revenue_lift_pct": round(random.uniform(-5, 20), 2),
        "margin_lift_pct": round(random.uniform(-10, 25), 2),
        "confidence_score": round(random.uniform(0.7, 0.95), 2),
        "constraints_applied": random.choice(["None", "Min Margin", "Price Ceiling", "Competitive"]),
        "recommendation_status": random.choice(["Approved", "Pending", "Rejected"]),
        "created_at": datetime.now(),
    })

ml_price_forecast_df = pd.DataFrame(ml_price_forecast)
spark_ml_price_forecast = spark.createDataFrame(ml_price_forecast_df)
spark_ml_price_forecast.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.ml_price_forecast_output")
print(f"✅ ml_price_forecast_output: {spark_ml_price_forecast.count():,} rows written")

# COMMAND ----------

# fact_price_test (12 rows)
price_tests = []
for i in range(12):
    price_tests.append({
        "test_id": f"PT-{i+1:04d}",
        "test_name": f"Price Test {i+1} - {random.choice(['Elasticity', 'Premium', 'Value', 'Competitive'])}",
        "test_type": random.choice(["A/B Test", "Multi-Armed Bandit", "Geo Test"]),
        "status": random.choice(["Completed", "Running", "Planned"]),
        "start_date": datetime(2024, random.randint(1, 10), 1).date(),
        "end_date": datetime(2024, random.randint(11, 12), 28).date() if i < 8 else None,
        "category_id": f"CAT-{random.randint(1, 50):04d}",
        "products_tested": random.randint(5, 50),
        "stores_control": random.randint(20, 100),
        "stores_treatment": random.randint(20, 100),
        "control_price": round(random.uniform(50, 200), 2),
        "treatment_price": round(random.uniform(50, 200), 2),
        "price_change_pct": round(random.uniform(-15, 20), 2),
        "control_sales_qty": random.randint(1000, 10000),
        "treatment_sales_qty": random.randint(1000, 10000),
        "lift_pct": round(random.uniform(-10, 30), 2),
        "revenue_impact_inr": round(random.uniform(-50000, 200000), 2),
        "statistical_significance": round(random.uniform(0.85, 0.99), 2) if i < 8 else None,
        "recommendation": random.choice(["Implement", "Do Not Implement", "Extend Test", None]),
        "created_at": datetime.now(),
    })

price_tests_df = pd.DataFrame(price_tests)
spark_price_tests = spark.createDataFrame(price_tests_df)
spark_price_tests.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.fact_price_test")
print(f"✅ fact_price_test: {spark_price_tests.count():,} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Add Table Comments

# COMMAND ----------

table_comments = {
    "ext_weather": "Daily weather data per city including temperature, rainfall, AQI",
    "ext_events_festivals": "Events, festivals, IPL matches, elections calendar",
    "ext_macro_economic": "Monthly macroeconomic indicators - CPI, fuel, forex, rates",
    "ext_competitor": "Weekly competitor pricing intelligence",
    "ext_digital_signals": "Google Trends and social media signals",
    "ext_syndicated": "NielsenIQ-style market share data",
    "ext_ecommerce_signals": "E-commerce platform pricing and availability",
    "ext_regulatory": "GST, FSSAI, import duty regulatory changes",
    "ext_agricultural": "Mandi prices for key agricultural commodities",
    "ext_traffic_mobility": "Google Mobility Reports style city movement data",
    "ml_feature_store": "Pre-computed ML features for demand forecasting",
    "ml_forecast_output": "Model predictions with confidence intervals",
    "ml_model_registry": "ML model metadata and versions",
    "ml_training_dataset": "Training data snapshot metadata",
    "ml_ab_test": "Model A/B testing results",
    "config_forecast_hierarchy": "Forecast aggregation hierarchy levels",
    "config_business_rules": "Business rules for inventory, pricing, display",
    "audit_data_quality": "Data quality check results",
    "audit_forecast_accuracy": "Forecast accuracy metrics by model and period",
    "fact_price_elasticity": "Price elasticity estimates by product",
    "fact_promo_lift_curve": "Promotional lift curves by category and discount",
    "fact_supplier_price_changes": "Supplier cost change events",
    "ext_commodity_prices": "Daily commodity prices - palm oil, sugar, etc.",
    "config_price_architecture": "Pricing rules - KVI, margins, ladders",
    "ml_price_feature_store": "Price optimization ML features",
    "ml_price_forecast_output": "Price recommendations from ML model",
    "fact_price_test": "Price A/B test results",
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

all_tables = list(table_comments.keys())

print("\n" + "="*60)
print("EXTERNAL, ML, CONFIG & PRICE ADDON TABLES SUMMARY")
print("="*60)

total_rows = 0
for table in all_tables:
    try:
        count = spark.table(f"{SCHEMA_BRONZE}.{table}").count()
        total_rows += count
        print(f"✅ {table}: {count:,} rows")
    except Exception as e:
        print(f"❌ {table}: ERROR - {str(e)}")

print("="*60)
print(f"Total: {total_rows:,} rows across {len(all_tables)} tables")
print("="*60)

print("\n🎉 Notebook 04 completed successfully!")
