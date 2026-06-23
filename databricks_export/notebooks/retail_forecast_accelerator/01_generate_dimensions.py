# Databricks notebook source
# MAGIC %md
# MAGIC # 01 - Generate Dimension Tables
# MAGIC
# MAGIC This notebook creates all 11 dimension tables for the Indian Retail Demand Forecasting accelerator.
# MAGIC
# MAGIC **Tables Generated:**
# MAGIC 1. dim_product (2,000 rows)
# MAGIC 2. dim_category (50 rows)
# MAGIC 3. dim_brand (55 rows)
# MAGIC 4. dim_store (275 rows)
# MAGIC 5. dim_channel (6 rows)
# MAGIC 6. dim_geography (25 rows)
# MAGIC 7. dim_cluster (12 rows)
# MAGIC 8. dim_date (2,192 rows)
# MAGIC 9. dim_time_of_day (24 rows)
# MAGIC 10. dim_customer (50,000 rows)
# MAGIC 11. dim_supplier (30 rows)
# MAGIC
# MAGIC **Runtime:** ~2-3 minutes

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
import hashlib

# Configuration - Using hive_metastore
CATALOG = "hive_metastore"
SCHEMA_BRONZE = "retail_bronze"
SCHEMA_SILVER = "retail_silver"
SCHEMA_GOLD = "retail_gold"
SCHEMA_ML = "retail_ml"

# Scale parameters
NUM_CITIES = 10
TOTAL_STORES = 275
NUM_PRODUCTS = 2000
NUM_CUSTOMERS = 50000
NUM_SUPPLIERS = 30
NUM_BRANDS = 55
DATE_START = "2020-01-01"
DATE_END = "2025-12-31"
NUM_DAYS = 2192

# Set random seed for reproducibility
np.random.seed(42)
random.seed(42)

print("✅ Configuration loaded")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Create Catalog and Schemas

# COMMAND ----------

# Create schemas in hive_metastore (no need to create catalog - it already exists)
spark.sql(f"CREATE DATABASE IF NOT EXISTS {SCHEMA_BRONZE}")
spark.sql(f"CREATE DATABASE IF NOT EXISTS {SCHEMA_SILVER}")
spark.sql(f"CREATE DATABASE IF NOT EXISTS {SCHEMA_GOLD}")
spark.sql(f"CREATE DATABASE IF NOT EXISTS {SCHEMA_ML}")

print(f"✅ Schemas created in hive_metastore: {SCHEMA_BRONZE}, {SCHEMA_SILVER}, {SCHEMA_GOLD}, {SCHEMA_ML}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Reference Data: Store Configuration

# COMMAND ----------

# Store configuration per city per format
STORE_CONFIG = {
    "Mumbai":     {"Hypermarket": 12, "Supermarket": 12, "Express": 6, "Dark Store": 6, "Kirana Partner": 4},  # 40 total
    "Delhi NCR":  {"Hypermarket": 12, "Supermarket": 10, "Express": 6, "Dark Store": 8, "Kirana Partner": 4},  # 40 total
    "Bangalore":  {"Hypermarket": 9,  "Supermarket": 10, "Express": 5, "Dark Store": 7, "Kirana Partner": 4},  # 35 total
    "Chennai":    {"Hypermarket": 8,  "Supermarket": 10, "Express": 4, "Dark Store": 4, "Kirana Partner": 4},  # 30 total
    "Hyderabad":  {"Hypermarket": 8,  "Supermarket": 9,  "Express": 4, "Dark Store": 4, "Kirana Partner": 5},  # 30 total
    "Kolkata":    {"Hypermarket": 6,  "Supermarket": 9,  "Express": 4, "Dark Store": 2, "Kirana Partner": 4},  # 25 total
    "Pune":       {"Hypermarket": 8,  "Supermarket": 9,  "Express": 4, "Dark Store": 2, "Kirana Partner": 2},  # 25 total
    "Ahmedabad":  {"Hypermarket": 6,  "Supermarket": 7,  "Express": 3, "Dark Store": 2, "Kirana Partner": 2},  # 20 total
    "Jaipur":     {"Hypermarket": 4,  "Supermarket": 5,  "Express": 3, "Dark Store": 1, "Kirana Partner": 2},  # 15 total
    "Lucknow":    {"Hypermarket": 3,  "Supermarket": 5,  "Express": 3, "Dark Store": 1, "Kirana Partner": 3},  # 15 total
}

# Store format specifications
FORMAT_SPECS = {
    "Hypermarket":    {"area_sqft": (25000, 40000), "sku_pct": 0.80, "basket_inr": (1200, 1800), "footfall": (2500, 4000), "channel": "CHN-OFFLINE"},
    "Supermarket":    {"area_sqft": (8000, 15000),  "sku_pct": 0.60, "basket_inr": (600, 1000),  "footfall": (800, 1500),  "channel": "CHN-OFFLINE"},
    "Express":        {"area_sqft": (1500, 4000),   "sku_pct": 0.25, "basket_inr": (250, 500),   "footfall": (400, 800),   "channel": "CHN-OFFLINE"},
    "Dark Store":     {"area_sqft": (2000, 3000),   "sku_pct": 0.15, "basket_inr": (350, 600),   "footfall": 0,            "channel": "CHN-QCOMMERCE"},
    "Kirana Partner": {"area_sqft": (200, 600),     "sku_pct": 0.08, "basket_inr": (100, 300),   "footfall": (100, 300),   "channel": "CHN-KIRANA"},
}

# Store opening date rules
OPENING_RULES = {
    "Hypermarket": {"earliest": "2018-01-01", "pct_existing_2020": 0.70, "new_per_year": 0.06},
    "Supermarket": {"earliest": "2018-01-01", "pct_existing_2020": 0.60, "new_per_year": 0.08},
    "Express": {"earliest": "2021-01-01", "pct_existing_2020": 0.0, "new_per_year": 0.20},
    "Dark Store": {"earliest": "2022-06-01", "pct_existing_2020": 0.0, "new_per_year": 0.35},
    "Kirana Partner": {"earliest": "2023-01-01", "pct_existing_2020": 0.0, "new_per_year": 0.40},
}

# City tier mapping
CITY_TIERS = {
    "Mumbai": "Tier1", "Delhi NCR": "Tier1", "Bangalore": "Tier1", "Chennai": "Tier1",
    "Hyderabad": "Tier1", "Kolkata": "Tier1", "Pune": "Tier1",
    "Ahmedabad": "Tier2", "Jaipur": "Tier2", "Lucknow": "Tier2"
}

# State mapping
CITY_STATES = {
    "Mumbai": "Maharashtra", "Delhi NCR": "Delhi", "Bangalore": "Karnataka", "Chennai": "Tamil Nadu",
    "Hyderabad": "Telangana", "Kolkata": "West Bengal", "Pune": "Maharashtra",
    "Ahmedabad": "Gujarat", "Jaipur": "Rajasthan", "Lucknow": "Uttar Pradesh"
}

# Region mapping
CITY_REGIONS = {
    "Mumbai": "West", "Pune": "West", "Ahmedabad": "West",
    "Delhi NCR": "North", "Jaipur": "North", "Lucknow": "North",
    "Bangalore": "South", "Chennai": "South", "Hyderabad": "South",
    "Kolkata": "East"
}

print("✅ Reference data loaded")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Reference Data: Product Taxonomy

# COMMAND ----------

# Full 50 subcategory product taxonomy
PRODUCT_TAXONOMY = [
    # (department, category_l1, category_l2, gst%, [(pack_size, uom, mrp_low_2020, mrp_high_2020), ...])

    # GROCERY & STAPLES (20 subcategories)
    ("Grocery & Staples", "Salt", "Iodized Salt", 5, [(1,"kg",18,24), (500,"g",10,14)]),
    ("Grocery & Staples", "Salt", "Rock Salt", 5, [(1,"kg",30,45), (500,"g",18,28)]),
    ("Grocery & Staples", "Edible Oil", "Sunflower Oil", 5, [(1,"L",100,150), (5,"L",480,700)]),
    ("Grocery & Staples", "Edible Oil", "Mustard Oil", 5, [(1,"L",120,170), (500,"ml",65,95)]),
    ("Grocery & Staples", "Edible Oil", "Groundnut Oil", 5, [(1,"L",160,220)]),
    ("Grocery & Staples", "Edible Oil", "Coconut Oil", 5, [(500,"ml",90,140), (1,"L",170,260)]),
    ("Grocery & Staples", "Atta & Flour", "Wheat Atta", 0, [(5,"kg",160,240), (10,"kg",310,460)]),
    ("Grocery & Staples", "Atta & Flour", "Maida", 0, [(1,"kg",28,45)]),
    ("Grocery & Staples", "Atta & Flour", "Besan", 0, [(500,"g",55,85), (1,"kg",100,160)]),
    ("Grocery & Staples", "Rice", "Basmati Rice", 5, [(1,"kg",110,220), (5,"kg",480,1000)]),
    ("Grocery & Staples", "Rice", "Non-Basmati Rice", 5, [(5,"kg",180,340)]),
    ("Grocery & Staples", "Dal & Pulses", "Toor Dal", 0, [(1,"kg",100,160), (500,"g",55,85)]),
    ("Grocery & Staples", "Dal & Pulses", "Moong Dal", 0, [(1,"kg",90,150), (500,"g",50,80)]),
    ("Grocery & Staples", "Dal & Pulses", "Chana Dal", 0, [(1,"kg",70,110)]),
    ("Grocery & Staples", "Sugar & Jaggery", "White Sugar", 5, [(1,"kg",35,48), (5,"kg",170,230)]),
    ("Grocery & Staples", "Sugar & Jaggery", "Jaggery", 0, [(500,"g",40,70)]),
    ("Grocery & Staples", "Spices", "Turmeric Powder", 5, [(100,"g",28,55), (500,"g",110,200)]),
    ("Grocery & Staples", "Spices", "Red Chili Powder", 5, [(100,"g",22,45), (500,"g",90,170)]),
    ("Grocery & Staples", "Spices", "Garam Masala", 12, [(50,"g",35,70), (100,"g",65,120)]),
    ("Grocery & Staples", "Spices", "Cumin Seeds", 5, [(100,"g",50,90)]),

    # DAIRY & FROZEN (10 subcategories)
    ("Dairy & Frozen", "Milk", "Toned Milk", 0, [(500,"ml",20,28), (1,"L",38,52)]),
    ("Dairy & Frozen", "Milk", "Full Cream Milk", 0, [(500,"ml",25,34), (1,"L",48,64)]),
    ("Dairy & Frozen", "Curd & Yogurt", "Plain Curd", 0, [(400,"g",28,42), (1,"kg",60,88)]),
    ("Dairy & Frozen", "Curd & Yogurt", "Flavored Yogurt", 12, [(100,"g",18,30), (400,"g",55,85)]),
    ("Dairy & Frozen", "Butter & Ghee", "Butter", 12, [(100,"g",44,56), (500,"g",210,260)]),
    ("Dairy & Frozen", "Butter & Ghee", "Ghee", 12, [(500,"ml",230,320), (1,"L",440,620)]),
    ("Dairy & Frozen", "Cheese", "Processed Cheese", 12, [(200,"g",80,120)]),
    ("Dairy & Frozen", "Ice Cream", "Vanilla Ice Cream", 18, [(500,"ml",90,160), (1,"L",180,300)]),
    ("Dairy & Frozen", "Paneer", "Fresh Paneer", 0, [(200,"g",55,82), (500,"g",130,185)]),
    ("Dairy & Frozen", "Frozen Foods", "Frozen Peas", 12, [(500,"g",70,110)]),

    # BEVERAGES (10 subcategories)
    ("Beverages", "Soft Drinks", "Cola", 28, [(250,"ml",18,22), (2,"L",72,95)]),
    ("Beverages", "Soft Drinks", "Lemon Lime", 28, [(250,"ml",18,22), (2,"L",72,95)]),
    ("Beverages", "Juice", "Mango Juice", 12, [(200,"ml",12,22), (1,"L",75,120)]),
    ("Beverages", "Juice", "Mixed Fruit Juice", 12, [(200,"ml",12,22), (1,"L",75,120)]),
    ("Beverages", "Water", "Packaged Water", 18, [(1,"L",16,20), (500,"ml",8,12)]),
    ("Beverages", "Tea", "Black Tea", 5, [(250,"g",80,160), (500,"g",155,300)]),
    ("Beverages", "Tea", "Green Tea", 5, [(25,"bags",90,180)]),
    ("Beverages", "Coffee", "Instant Coffee", 5, [(50,"g",110,200), (100,"g",200,360)]),
    ("Beverages", "Coffee", "Filter Coffee", 5, [(200,"g",120,220)]),
    ("Beverages", "Energy Drinks", "Caffeinated Drink", 28, [(250,"ml",90,135)]),

    # SNACKS & BISCUITS (5 subcategories)
    ("Snacks & Biscuits", "Biscuits", "Glucose Biscuits", 18, [(100,"g",8,14), (250,"g",20,32)]),
    ("Snacks & Biscuits", "Biscuits", "Cream Biscuits", 18, [(100,"g",18,32), (300,"g",50,82)]),
    ("Snacks & Biscuits", "Chips & Namkeen", "Potato Chips", 12, [(52,"g",18,28), (130,"g",45,72)]),
    ("Snacks & Biscuits", "Chips & Namkeen", "Namkeen Mix", 12, [(200,"g",45,80), (400,"g",85,145)]),
    ("Snacks & Biscuits", "Noodles", "Instant Noodles", 18, [(70,"g",12,16), (280,"g",42,58)]),

    # PERSONAL CARE (5 subcategories)
    ("Personal Care", "Soaps", "Bath Soap", 18, [(100,"g",25,48), (150,"g",36,68)]),
    ("Personal Care", "Shampoo", "Anti-Dandruff Shampoo", 18, [(180,"ml",135,225), (340,"ml",255,385)]),
    ("Personal Care", "Toothpaste", "Fluoride Toothpaste", 18, [(100,"g",50,90), (200,"g",95,165)]),
    ("Personal Care", "Detergent", "Washing Powder", 18, [(500,"g",40,72), (1,"kg",78,135)]),
    ("Personal Care", "Detergent", "Liquid Detergent", 18, [(500,"ml",110,180), (1,"L",200,340)]),
]

# Brand mapping by category
BRAND_MAPPING = {
    "Iodized Salt": ["Tata Salt", "Catch", "Patanjali", "DMart Home"],
    "Rock Salt": ["Tata Salt", "Catch", "24 Mantra"],
    "Sunflower Oil": ["Fortune", "Saffola", "Nature Fresh", "Good Life"],
    "Mustard Oil": ["Fortune", "Dhara", "Nature Fresh", "Patanjali"],
    "Groundnut Oil": ["Fortune", "Saffola", "Nature Fresh"],
    "Coconut Oil": ["Parachute", "KLF Coconad", "VVD", "Patanjali"],
    "Wheat Atta": ["Aashirvaad", "Pillsbury", "Patanjali", "DMart Home"],
    "Maida": ["Aashirvaad", "Pillsbury", "DMart Home"],
    "Besan": ["Rajdhani", "Aashirvaad", "DMart Home"],
    "Basmati Rice": ["India Gate", "Daawat", "Kohinoor", "BB Royal"],
    "Non-Basmati Rice": ["India Gate", "Daawat", "BB Royal", "DMart Home"],
    "Toor Dal": ["Tata Sampann", "24 Mantra", "Patanjali", "DMart Home"],
    "Moong Dal": ["Tata Sampann", "24 Mantra", "BB Royal"],
    "Chana Dal": ["Tata Sampann", "Patanjali", "DMart Home"],
    "White Sugar": ["Madhur", "Trust", "DMart Home"],
    "Jaggery": ["Patanjali", "24 Mantra", "Local Brand"],
    "Turmeric Powder": ["MDH", "Everest", "Catch", "Patanjali"],
    "Red Chili Powder": ["MDH", "Everest", "Catch", "Suhana"],
    "Garam Masala": ["MDH", "Everest", "Catch", "Kitchen King"],
    "Cumin Seeds": ["MDH", "Everest", "Catch", "Patanjali"],
    "Toned Milk": ["Amul", "Mother Dairy", "Nandini", "Aavin"],
    "Full Cream Milk": ["Amul", "Mother Dairy", "Nandini", "Aavin"],
    "Plain Curd": ["Amul", "Mother Dairy", "Milky Mist", "Nandini"],
    "Flavored Yogurt": ["Amul", "Nestle", "Danone", "Epigamia"],
    "Butter": ["Amul", "Britannia", "Mother Dairy"],
    "Ghee": ["Amul", "Patanjali", "Mother Dairy", "Gowardhan"],
    "Processed Cheese": ["Amul", "Britannia", "Gowardhan"],
    "Vanilla Ice Cream": ["Amul", "Kwality Walls", "Baskin Robbins", "Havmor"],
    "Fresh Paneer": ["Amul", "Mother Dairy", "Milky Mist", "Verka"],
    "Frozen Peas": ["Safal", "McCain", "Godrej"],
    "Cola": ["Coca-Cola", "Thums Up", "Pepsi"],
    "Lemon Lime": ["Sprite", "7Up", "Limca"],
    "Mango Juice": ["Maaza", "Slice", "Frooti", "Real"],
    "Mixed Fruit Juice": ["Tropicana", "Real", "B Natural", "Paper Boat"],
    "Packaged Water": ["Bisleri", "Kinley", "Aquafina", "Himalayan"],
    "Black Tea": ["Tata Tea", "Brooke Bond", "Wagh Bakri", "Patanjali"],
    "Green Tea": ["Lipton", "Tetley", "Organic India", "Typhoo"],
    "Instant Coffee": ["Nescafe", "Bru", "Davidoff"],
    "Filter Coffee": ["Bru", "Cothas", "Narasus"],
    "Caffeinated Drink": ["Red Bull", "Monster", "Sting"],
    "Glucose Biscuits": ["Parle-G", "Britannia", "Sunfeast"],
    "Cream Biscuits": ["Britannia", "Sunfeast", "Oreo", "Parle"],
    "Potato Chips": ["Lays", "Bingo", "Uncle Chipps", "Pringles"],
    "Namkeen Mix": ["Haldirams", "Bikano", "Balaji", "Cornitos"],
    "Instant Noodles": ["Maggi", "Yippee", "Top Ramen", "Ching's"],
    "Bath Soap": ["Lux", "Dove", "Lifebuoy", "Dettol", "Godrej No.1"],
    "Anti-Dandruff Shampoo": ["Head & Shoulders", "Clinic Plus", "Pantene", "Dove"],
    "Fluoride Toothpaste": ["Colgate", "Pepsodent", "Closeup", "Sensodyne"],
    "Washing Powder": ["Surf Excel", "Tide", "Ariel", "Ghadi"],
    "Liquid Detergent": ["Surf Excel", "Tide", "Ariel", "Comfort"],
}

# MRP inflation over years
MRP_INFLATION = {2020: 1.00, 2021: 1.04, 2022: 1.10, 2023: 1.16, 2024: 1.22, 2025: 1.28}

print(f"✅ Product taxonomy loaded: {len(PRODUCT_TAXONOMY)} subcategories")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Reference Data: Festivals & Events

# COMMAND ----------

# All festivals for 6 years (2020-2025)
FESTIVALS = {
    # 2020
    "2020-01-15": ("Makar Sankranti", "High", "National"),
    "2020-01-26": ("Republic Day", "Medium", "National"),
    "2020-03-10": ("Holi", "High", "National"),
    "2020-03-25": ("Ugadi", "Medium", "South"),
    "2020-04-02": ("Ram Navami", "Medium", "National"),
    "2020-05-07": ("Buddha Purnima", "Low", "National"),
    "2020-05-25": ("Eid ul-Fitr", "High", "National"),
    "2020-08-01": ("Eid ul-Adha", "High", "National"),
    "2020-08-03": ("Raksha Bandhan", "High", "National"),
    "2020-08-12": ("Janmashtami", "High", "National"),
    "2020-08-15": ("Independence Day", "Medium", "National"),
    "2020-08-22": ("Ganesh Chaturthi", "High", "West/South"),
    "2020-08-31": ("Onam", "High", "Kerala"),
    "2020-10-02": ("Gandhi Jayanti", "Low", "National"),
    "2020-10-17": ("Navratri Start", "High", "National"),
    "2020-10-25": ("Dussehra", "High", "National"),
    "2020-11-14": ("Diwali", "Peak", "National"),
    "2020-11-30": ("Guru Nanak Jayanti", "Medium", "North"),
    "2020-12-25": ("Christmas", "Medium", "National"),

    # 2021
    "2021-01-14": ("Makar Sankranti", "High", "National"),
    "2021-01-26": ("Republic Day", "Medium", "National"),
    "2021-03-29": ("Holi", "High", "National"),
    "2021-04-13": ("Ugadi", "Medium", "South"),
    "2021-04-14": ("Baisakhi", "Medium", "North"),
    "2021-04-21": ("Ram Navami", "Medium", "National"),
    "2021-05-13": ("Eid ul-Fitr", "High", "National"),
    "2021-05-26": ("Buddha Purnima", "Low", "National"),
    "2021-07-21": ("Eid ul-Adha", "High", "National"),
    "2021-08-15": ("Independence Day", "Medium", "National"),
    "2021-08-22": ("Raksha Bandhan", "High", "National"),
    "2021-08-30": ("Janmashtami", "High", "National"),
    "2021-09-10": ("Ganesh Chaturthi", "High", "West/South"),
    "2021-08-21": ("Onam", "High", "Kerala"),
    "2021-10-02": ("Gandhi Jayanti", "Low", "National"),
    "2021-10-07": ("Navratri Start", "High", "National"),
    "2021-10-15": ("Dussehra", "High", "National"),
    "2021-11-02": ("Karwa Chauth", "Medium", "North"),
    "2021-11-04": ("Diwali", "Peak", "National"),
    "2021-11-19": ("Guru Nanak Jayanti", "Medium", "North"),
    "2021-12-25": ("Christmas", "Medium", "National"),

    # 2022
    "2022-01-14": ("Makar Sankranti", "High", "National"),
    "2022-01-26": ("Republic Day", "Medium", "National"),
    "2022-03-18": ("Holi", "High", "National"),
    "2022-04-02": ("Ugadi", "Medium", "South"),
    "2022-04-10": ("Ram Navami", "Medium", "National"),
    "2022-05-03": ("Eid ul-Fitr", "High", "National"),
    "2022-05-16": ("Buddha Purnima", "Low", "National"),
    "2022-07-10": ("Eid ul-Adha", "High", "National"),
    "2022-08-11": ("Raksha Bandhan", "High", "National"),
    "2022-08-15": ("Independence Day", "Medium", "National"),
    "2022-08-19": ("Janmashtami", "High", "National"),
    "2022-08-31": ("Ganesh Chaturthi", "High", "West/South"),
    "2022-09-08": ("Onam", "High", "Kerala"),
    "2022-09-26": ("Navratri Start", "High", "National"),
    "2022-10-02": ("Gandhi Jayanti", "Low", "National"),
    "2022-10-05": ("Dussehra", "High", "National"),
    "2022-10-13": ("Karwa Chauth", "Medium", "North"),
    "2022-10-22": ("Dhanteras", "High", "National"),
    "2022-10-24": ("Diwali", "Peak", "National"),
    "2022-11-08": ("Guru Nanak Jayanti", "Medium", "North"),
    "2022-12-25": ("Christmas", "Medium", "National"),

    # 2023
    "2023-01-14": ("Makar Sankranti", "High", "National"),
    "2023-01-26": ("Republic Day", "Medium", "National"),
    "2023-03-07": ("Holi", "High", "National"),
    "2023-03-22": ("Ugadi", "Medium", "South"),
    "2023-03-30": ("Ram Navami", "Medium", "National"),
    "2023-04-14": ("Baisakhi", "Medium", "North"),
    "2023-04-22": ("Eid ul-Fitr", "High", "National"),
    "2023-05-05": ("Buddha Purnima", "Low", "National"),
    "2023-06-29": ("Eid ul-Adha", "High", "National"),
    "2023-08-15": ("Independence Day", "Medium", "National"),
    "2023-08-30": ("Raksha Bandhan", "High", "National"),
    "2023-09-07": ("Janmashtami", "High", "National"),
    "2023-09-19": ("Ganesh Chaturthi", "High", "West/South"),
    "2023-08-29": ("Onam", "High", "Kerala"),
    "2023-10-02": ("Gandhi Jayanti", "Low", "National"),
    "2023-10-15": ("Navratri Start", "High", "National"),
    "2023-10-24": ("Dussehra", "High", "National"),
    "2023-11-10": ("Dhanteras", "High", "National"),
    "2023-11-12": ("Diwali", "Peak", "National"),
    "2023-11-27": ("Guru Nanak Jayanti", "Medium", "North"),
    "2023-12-25": ("Christmas", "Medium", "National"),

    # 2024
    "2024-01-15": ("Makar Sankranti", "High", "National"),
    "2024-01-26": ("Republic Day", "Medium", "National"),
    "2024-03-25": ("Holi", "High", "National"),
    "2024-04-09": ("Ugadi", "Medium", "South"),
    "2024-04-11": ("Eid ul-Fitr", "High", "National"),
    "2024-04-17": ("Ram Navami", "Medium", "National"),
    "2024-04-21": ("Mahavir Jayanti", "Medium", "National"),
    "2024-05-23": ("Buddha Purnima", "Low", "National"),
    "2024-06-17": ("Eid ul-Adha", "High", "National"),
    "2024-08-15": ("Independence Day", "Medium", "National"),
    "2024-08-19": ("Raksha Bandhan", "High", "National"),
    "2024-08-26": ("Janmashtami", "High", "National"),
    "2024-09-07": ("Ganesh Chaturthi", "High", "West/South"),
    "2024-09-15": ("Onam", "High", "Kerala"),
    "2024-10-02": ("Gandhi Jayanti", "Low", "National"),
    "2024-10-03": ("Navratri Start", "High", "National"),
    "2024-10-12": ("Dussehra", "High", "National"),
    "2024-10-20": ("Karwa Chauth", "Medium", "North"),
    "2024-10-29": ("Dhanteras", "High", "National"),
    "2024-11-01": ("Diwali", "Peak", "National"),
    "2024-11-15": ("Guru Nanak Jayanti", "Medium", "North"),
    "2024-12-25": ("Christmas", "Medium", "National"),

    # 2025
    "2025-01-14": ("Makar Sankranti", "High", "National"),
    "2025-01-26": ("Republic Day", "Medium", "National"),
    "2025-03-14": ("Holi", "High", "National"),
    "2025-03-30": ("Ugadi", "Medium", "South"),
    "2025-03-31": ("Eid ul-Fitr", "High", "National"),
    "2025-04-06": ("Ram Navami", "Medium", "National"),
    "2025-04-14": ("Baisakhi", "Medium", "North"),
    "2025-05-12": ("Buddha Purnima", "Low", "National"),
    "2025-06-07": ("Eid ul-Adha", "High", "National"),
    "2025-08-09": ("Raksha Bandhan", "High", "National"),
    "2025-08-15": ("Independence Day", "Medium", "National"),
    "2025-08-16": ("Janmashtami", "High", "National"),
    "2025-08-27": ("Ganesh Chaturthi", "High", "West/South"),
    "2025-09-05": ("Onam", "High", "Kerala"),
    "2025-09-22": ("Navratri Start", "High", "National"),
    "2025-10-02": ("Dussehra/Gandhi Jayanti", "High", "National"),
    "2025-10-18": ("Dhanteras", "High", "National"),
    "2025-10-20": ("Diwali", "Peak", "National"),
    "2025-11-05": ("Guru Nanak Jayanti", "Medium", "North"),
    "2025-12-25": ("Christmas", "Medium", "National"),
}

# COVID periods
COVID_PERIODS = {
    "lockdown_1":   ("2020-03-25", "2020-05-31", 0.30),
    "unlock_1_2":   ("2020-06-01", "2020-09-30", 0.70),
    "recovery_1":   ("2020-10-01", "2021-03-31", 0.95),
    "wave_2_delta": ("2021-04-01", "2021-06-30", 0.55),
    "recovery_2":   ("2021-07-01", "2021-12-31", 0.90),
    "omicron":      ("2022-01-01", "2022-02-28", 0.80),
    "post_covid":   ("2022-03-01", "2025-12-31", 1.00),
}

print(f"✅ Festival data loaded: {len(FESTIVALS)} festival dates")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate dim_channel (6 rows)

# COMMAND ----------

def generate_dim_channel():
    """Generate 6 sales channel dimension records"""
    channels = [
        {"channel_id": "CHN-OFFLINE", "channel_code": "OFFLINE", "channel_name": "Offline / In-Store",
         "channel_type": "Physical", "is_digital": False, "requires_delivery": False,
         "typical_fulfillment_hours": None, "payment_types": "Cash,Card,UPI,Wallet",
         "default_commission_pct": 0.0, "is_active": True, "created_at": datetime(2020, 1, 1)},
        {"channel_id": "CHN-ONLINE", "channel_code": "ONLINE", "channel_name": "E-commerce Website/App",
         "channel_type": "Digital", "is_digital": True, "requires_delivery": True,
         "typical_fulfillment_hours": 48, "payment_types": "Card,UPI,Wallet,NetBanking",
         "default_commission_pct": 0.0, "is_active": True, "created_at": datetime(2020, 1, 1)},
        {"channel_id": "CHN-QCOMMERCE", "channel_code": "QCOMMERCE", "channel_name": "Quick Commerce",
         "channel_type": "Digital", "is_digital": True, "requires_delivery": True,
         "typical_fulfillment_hours": 1, "payment_types": "UPI,Card,Wallet",
         "default_commission_pct": 0.0, "is_active": True, "created_at": datetime(2022, 6, 1)},
        {"channel_id": "CHN-CLICKCOLLECT", "channel_code": "CLICKCOLLECT", "channel_name": "Click & Collect",
         "channel_type": "Hybrid", "is_digital": True, "requires_delivery": False,
         "typical_fulfillment_hours": 2, "payment_types": "Card,UPI,Wallet,Cash",
         "default_commission_pct": 0.0, "is_active": True, "created_at": datetime(2020, 1, 1)},
        {"channel_id": "CHN-B2B", "channel_code": "B2B", "channel_name": "Business to Business",
         "channel_type": "Wholesale", "is_digital": False, "requires_delivery": True,
         "typical_fulfillment_hours": 72, "payment_types": "Credit,NetBanking",
         "default_commission_pct": 5.0, "is_active": True, "created_at": datetime(2020, 1, 1)},
        {"channel_id": "CHN-KIRANA", "channel_code": "KIRANA", "channel_name": "Kirana Partner Network",
         "channel_type": "Physical", "is_digital": False, "requires_delivery": False,
         "typical_fulfillment_hours": None, "payment_types": "Cash,UPI",
         "default_commission_pct": 3.0, "is_active": True, "created_at": datetime(2023, 1, 1)},
    ]
    return pd.DataFrame(channels)

channel_df = generate_dim_channel()
spark_channel = spark.createDataFrame(channel_df)
spark_channel.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.dim_channel")
print(f"✅ dim_channel: {spark_channel.count()} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate dim_geography (25 rows)

# COMMAND ----------

def generate_dim_geography():
    """Generate geography dimension with hierarchy"""
    geos = []
    geo_id = 1

    # Country level
    geos.append({
        "geo_id": f"GEO-{geo_id:04d}", "geo_code": "IND", "geo_name": "India",
        "geo_level": "Country", "parent_geo_id": None,
        "country": "India", "country_code": "IN",
        "region": None, "zone": None, "state": None, "state_code": None,
        "district": None, "city": None, "city_tier": None,
        "pincode_range_start": "100001", "pincode_range_end": "999999",
        "latitude": 20.5937, "longitude": 78.9629,
        "timezone": "Asia/Kolkata", "currency_code": "INR",
        "official_language": "Hindi,English", "population_millions": 1400.0,
        "gdp_per_capita_usd": 2100.0, "is_metro": False, "is_active": True
    })
    geo_id += 1

    # Region level
    regions = ["North", "South", "East", "West"]
    region_geo_ids = {}
    for region in regions:
        region_geo_ids[region] = f"GEO-{geo_id:04d}"
        geos.append({
            "geo_id": f"GEO-{geo_id:04d}", "geo_code": f"IND-{region[:2].upper()}", "geo_name": f"{region} India",
            "geo_level": "Region", "parent_geo_id": "GEO-0001",
            "country": "India", "country_code": "IN",
            "region": region, "zone": None, "state": None, "state_code": None,
            "district": None, "city": None, "city_tier": None,
            "pincode_range_start": None, "pincode_range_end": None,
            "latitude": None, "longitude": None,
            "timezone": "Asia/Kolkata", "currency_code": "INR",
            "official_language": None, "population_millions": None,
            "gdp_per_capita_usd": None, "is_metro": False, "is_active": True
        })
        geo_id += 1

    # State level
    states_info = {
        "Maharashtra": ("West", "MH", 19.7515, 75.7139, 125.0, 3500.0),
        "Delhi": ("North", "DL", 28.7041, 77.1025, 20.0, 4800.0),
        "Karnataka": ("South", "KA", 15.3173, 75.7139, 68.0, 3200.0),
        "Tamil Nadu": ("South", "TN", 11.1271, 78.6569, 77.0, 3400.0),
        "Telangana": ("South", "TS", 18.1124, 79.0193, 38.0, 3800.0),
        "West Bengal": ("East", "WB", 22.9868, 87.8550, 100.0, 2000.0),
        "Gujarat": ("West", "GJ", 22.2587, 71.1924, 65.0, 3100.0),
        "Rajasthan": ("North", "RJ", 27.0238, 74.2179, 80.0, 1800.0),
        "Uttar Pradesh": ("North", "UP", 26.8467, 80.9462, 230.0, 1200.0),
    }
    state_geo_ids = {}
    for state, (region, code, lat, lon, pop, gdp) in states_info.items():
        state_geo_ids[state] = f"GEO-{geo_id:04d}"
        geos.append({
            "geo_id": f"GEO-{geo_id:04d}", "geo_code": f"IND-{code}", "geo_name": state,
            "geo_level": "State", "parent_geo_id": region_geo_ids[region],
            "country": "India", "country_code": "IN",
            "region": region, "zone": None, "state": state, "state_code": code,
            "district": None, "city": None, "city_tier": None,
            "pincode_range_start": None, "pincode_range_end": None,
            "latitude": lat, "longitude": lon,
            "timezone": "Asia/Kolkata", "currency_code": "INR",
            "official_language": None, "population_millions": pop,
            "gdp_per_capita_usd": gdp, "is_metro": False, "is_active": True
        })
        geo_id += 1

    # City level
    cities_info = {
        "Mumbai": ("Maharashtra", 12.5, 4500.0, 19.0760, 72.8777, "400001", "400999", True),
        "Delhi NCR": ("Delhi", 32.0, 5200.0, 28.7041, 77.1025, "110001", "201999", True),
        "Bangalore": ("Karnataka", 13.0, 5000.0, 12.9716, 77.5946, "560001", "560999", True),
        "Chennai": ("Tamil Nadu", 11.0, 4200.0, 13.0827, 80.2707, "600001", "600999", True),
        "Hyderabad": ("Telangana", 10.5, 4600.0, 17.3850, 78.4867, "500001", "500999", True),
        "Kolkata": ("West Bengal", 15.0, 3000.0, 22.5726, 88.3639, "700001", "700999", True),
        "Pune": ("Maharashtra", 7.0, 4000.0, 18.5204, 73.8567, "411001", "411999", True),
        "Ahmedabad": ("Gujarat", 8.0, 3500.0, 23.0225, 72.5714, "380001", "380999", True),
        "Jaipur": ("Rajasthan", 4.0, 2500.0, 26.9124, 75.7873, "302001", "302999", False),
        "Lucknow": ("Uttar Pradesh", 3.5, 2000.0, 26.8467, 80.9462, "226001", "226999", False),
    }

    for city, (state, pop, gdp, lat, lon, pin_s, pin_e, is_metro) in cities_info.items():
        tier = "Tier1" if city in ["Mumbai", "Delhi NCR", "Bangalore", "Chennai", "Hyderabad", "Kolkata", "Pune"] else "Tier2"
        geos.append({
            "geo_id": f"GEO-{geo_id:04d}", "geo_code": f"IND-{city[:3].upper()}", "geo_name": city,
            "geo_level": "City", "parent_geo_id": state_geo_ids[state],
            "country": "India", "country_code": "IN",
            "region": CITY_REGIONS[city], "zone": None, "state": state, "state_code": states_info[state][1],
            "district": city, "city": city, "city_tier": tier,
            "pincode_range_start": pin_s, "pincode_range_end": pin_e,
            "latitude": lat, "longitude": lon,
            "timezone": "Asia/Kolkata", "currency_code": "INR",
            "official_language": None, "population_millions": pop,
            "gdp_per_capita_usd": gdp, "is_metro": is_metro, "is_active": True
        })
        geo_id += 1

    return pd.DataFrame(geos)

geo_df = generate_dim_geography()
spark_geo = spark.createDataFrame(geo_df)
spark_geo.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.dim_geography")
print(f"✅ dim_geography: {spark_geo.count()} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate dim_cluster (12 rows)

# COMMAND ----------

def generate_dim_cluster():
    """Generate store clustering dimension"""
    clusters = []
    cluster_id = 1

    # Cluster based on (tier, format_type, performance)
    tiers = ["Tier1", "Tier2"]
    format_groups = ["Large Format", "Convenience", "Q-Commerce", "Partner"]
    performances = ["High", "Medium", "Low"]

    for tier in tiers:
        for fmt in format_groups:
            cluster_name = f"{tier} {fmt}"
            perf = random.choice(performances)
            clusters.append({
                "cluster_id": f"CLU-{cluster_id:04d}",
                "cluster_code": f"C{cluster_id:02d}",
                "cluster_name": cluster_name,
                "cluster_description": f"{tier} city {fmt.lower()} stores",
                "clustering_method": "RFM + Store Attributes",
                "cluster_tier": tier,
                "format_group": fmt,
                "avg_monthly_revenue_inr": random.randint(1000000, 10000000),
                "avg_footfall_daily": random.randint(100, 3000) if fmt != "Q-Commerce" else 0,
                "avg_basket_size_inr": random.randint(300, 1500),
                "store_count": random.randint(15, 50),
                "is_active": True,
                "last_refreshed": datetime(2024, 1, 1)
            })
            cluster_id += 1
            if cluster_id > 12:
                break
        if cluster_id > 12:
            break

    return pd.DataFrame(clusters)

cluster_df = generate_dim_cluster()
spark_cluster = spark.createDataFrame(cluster_df)
spark_cluster.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.dim_cluster")
print(f"✅ dim_cluster: {spark_cluster.count()} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate dim_time_of_day (24 rows)

# COMMAND ----------

def generate_dim_time_of_day():
    """Generate 24-hour time dimension"""
    hours = []

    for hour in range(24):
        # Determine time slot
        if 6 <= hour < 9:
            slot = "Early Morning"
            is_peak_offline = False
            is_peak_qcom = False
        elif 9 <= hour < 12:
            slot = "Morning"
            is_peak_offline = True
            is_peak_qcom = False
        elif 12 <= hour < 14:
            slot = "Lunch"
            is_peak_offline = True
            is_peak_qcom = True
        elif 14 <= hour < 17:
            slot = "Afternoon"
            is_peak_offline = False
            is_peak_qcom = False
        elif 17 <= hour < 21:
            slot = "Evening"
            is_peak_offline = True
            is_peak_qcom = True
        elif 21 <= hour < 24:
            slot = "Night"
            is_peak_offline = False
            is_peak_qcom = True
        else:
            slot = "Late Night"
            is_peak_offline = False
            is_peak_qcom = False

        hours.append({
            "time_id": f"T{hour:02d}",
            "hour_of_day": hour,
            "hour_label": f"{hour:02d}:00",
            "time_slot": slot,
            "is_business_hour": 9 <= hour < 21,
            "is_peak_offline": is_peak_offline,
            "is_peak_online": 20 <= hour < 23,
            "is_peak_qcommerce": is_peak_qcom,
            "offline_traffic_index": 1.0 if is_peak_offline else 0.5
        })

    return pd.DataFrame(hours)

time_df = generate_dim_time_of_day()
spark_time = spark.createDataFrame(time_df)
spark_time.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.dim_time_of_day")
print(f"✅ dim_time_of_day: {spark_time.count()} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate dim_date (2,192 rows)

# COMMAND ----------

def get_indian_season(month: int) -> str:
    """Return Indian season based on month"""
    if month in [3, 4, 5]:
        return "Summer"
    elif month in [6, 7, 8, 9]:
        return "Monsoon"
    elif month in [10, 11]:
        return "Post-Monsoon"
    else:
        return "Winter"

def get_covid_multiplier(date_str: str) -> tuple:
    """Return COVID demand multiplier and flags for a given date"""
    date = datetime.strptime(date_str, "%Y-%m-%d")
    is_lockdown = False
    is_covid_period = False
    multiplier = 1.0

    for period, (start, end, mult) in COVID_PERIODS.items():
        start_dt = datetime.strptime(start, "%Y-%m-%d")
        end_dt = datetime.strptime(end, "%Y-%m-%d")
        if start_dt <= date <= end_dt:
            multiplier = mult
            is_covid_period = date < datetime(2022, 3, 1)
            is_lockdown = period in ["lockdown_1", "wave_2_delta"]
            break

    return multiplier, is_lockdown, is_covid_period

def generate_dim_date():
    """Generate date dimension with Indian calendar features"""
    dates = []
    start_date = datetime.strptime(DATE_START, "%Y-%m-%d")

    # IPL seasons (March-May typically)
    ipl_periods = [
        ("2020-03-29", "2020-05-24"),  # IPL 2020 was Sept-Nov due to COVID
        ("2020-09-19", "2020-11-10"),  # Actual IPL 2020
        ("2021-04-09", "2021-05-30"),  # IPL 2021 Phase 1
        ("2021-09-19", "2021-10-15"),  # IPL 2021 Phase 2
        ("2022-03-26", "2022-05-29"),
        ("2023-03-31", "2023-05-28"),
        ("2024-03-22", "2024-05-26"),
        ("2025-03-21", "2025-05-25"),
    ]

    # Ramadan periods (approximate)
    ramadan_periods = [
        ("2020-04-24", "2020-05-23"),
        ("2021-04-13", "2021-05-12"),
        ("2022-04-02", "2022-05-01"),
        ("2023-03-23", "2023-04-21"),
        ("2024-03-11", "2024-04-09"),
        ("2025-03-01", "2025-03-30"),
    ]

    # School vacation periods
    vacation_periods = [
        # Summer vacations (May-June)
        *[(f"{y}-05-01", f"{y}-06-15") for y in range(2020, 2026)],
        # Diwali break
        *[(f"{y}-10-25", f"{y}-11-05") for y in range(2020, 2026)],
        # Christmas break
        *[(f"{y}-12-22", f"{y+1 if y < 2025 else 2025}-01-02") for y in range(2020, 2025)],
    ]

    for day_num in range(NUM_DAYS):
        dt = start_date + timedelta(days=day_num)
        date_str = dt.strftime("%Y-%m-%d")

        # Basic calendar fields
        dow = dt.weekday()
        is_weekend = dow >= 5

        # Fiscal year (April-March in India)
        if dt.month >= 4:
            fy = dt.year
            fiscal_month = dt.month - 3
        else:
            fy = dt.year - 1
            fiscal_month = dt.month + 9
        fiscal_quarter = (fiscal_month - 1) // 3 + 1

        # Festival info
        festival_name = None
        festival_intensity = None
        is_festival_period = False
        days_to_festival = None
        days_from_festival = None

        if date_str in FESTIVALS:
            fest_info = FESTIVALS[date_str]
            festival_name = fest_info[0]
            festival_intensity = fest_info[1]
            is_festival_period = True
            days_to_festival = 0
            days_from_festival = 0
        else:
            # Check ±7 days from any festival
            for fest_date_str, fest_info in FESTIVALS.items():
                fest_date = datetime.strptime(fest_date_str, "%Y-%m-%d")
                diff = (fest_date - dt).days
                if -7 <= diff <= 7:
                    is_festival_period = True
                    if diff >= 0 and (days_to_festival is None or diff < days_to_festival):
                        days_to_festival = diff
                        festival_name = fest_info[0]
                        festival_intensity = fest_info[1]
                    if diff < 0 and (days_from_festival is None or abs(diff) < days_from_festival):
                        days_from_festival = abs(diff)

        # COVID info
        covid_mult, is_lockdown, is_covid_period = get_covid_multiplier(date_str)

        # IPL season
        is_ipl = any(datetime.strptime(s, "%Y-%m-%d") <= dt <= datetime.strptime(e, "%Y-%m-%d")
                     for s, e in ipl_periods)

        # Ramadan
        is_ramadan = any(datetime.strptime(s, "%Y-%m-%d") <= dt <= datetime.strptime(e, "%Y-%m-%d")
                         for s, e in ramadan_periods)

        # School vacation
        is_school_vacation = any(datetime.strptime(s, "%Y-%m-%d") <= dt <= datetime.strptime(e.split("-01-")[0] + "-01-02" if "-01-02" in e else e, "%Y-%m-%d")
                                  for s, e in vacation_periods if datetime.strptime(s, "%Y-%m-%d").year <= dt.year)

        # Monsoon
        is_monsoon = dt.month in [6, 7, 8, 9]

        # Salary week (last week of month and first week)
        is_salary_week = dt.day <= 7 or dt.day >= 25

        # Wedding season (Nov-Feb, Apr-May, Oct-Nov)
        is_wedding_season = dt.month in [11, 12, 1, 2, 4, 5, 10]

        # Exam season (Feb-April for boards)
        is_exam_season = dt.month in [2, 3, 4]

        # Harvest season (Oct-Nov for Kharif, Mar-Apr for Rabi)
        is_harvest_season = dt.month in [10, 11, 3, 4]

        # GST filing dates (20th of each month)
        is_gst_filing = dt.day in [20, 21]

        # Government payday (1st of month)
        is_govt_payday = dt.day == 1

        dates.append({
            "date_id": int(dt.strftime("%Y%m%d")),
            "full_date": dt.date(),
            "day_of_week": dow + 1,  # 1=Monday
            "day_name": dt.strftime("%A"),
            "is_weekend": is_weekend,
            "day_of_month": dt.day,
            "day_of_year": dt.timetuple().tm_yday,
            "week_of_year": dt.isocalendar()[1],
            "month_num": dt.month,
            "month_name": dt.strftime("%B"),
            "quarter": (dt.month - 1) // 3 + 1,
            "year": dt.year,
            "fiscal_year": f"FY{fy}-{(fy+1) % 100:02d}",
            "fiscal_quarter": f"Q{fiscal_quarter}",
            "fiscal_month": fiscal_month,
            "is_month_end": (dt + timedelta(days=1)).month != dt.month,
            "is_quarter_end": dt.month in [3, 6, 9, 12] and (dt + timedelta(days=1)).month != dt.month,
            "is_year_end": dt.month == 12 and dt.day == 31,
            "indian_season": get_indian_season(dt.month),
            "is_public_holiday": festival_intensity in ["High", "Peak"] if festival_intensity else False,
            "holiday_name": festival_name if festival_intensity in ["High", "Peak", "Medium"] else None,
            "is_regional_holiday": False,  # Simplified
            "regional_holiday_states": None,
            "is_festival_period": is_festival_period,
            "festival_name": festival_name,
            "festival_intensity": festival_intensity,
            "days_to_festival": days_to_festival,
            "days_from_festival": days_from_festival,
            "is_wedding_season": is_wedding_season,
            "is_ipl_season": is_ipl,
            "is_exam_season": is_exam_season,
            "is_school_vacation": is_school_vacation,
            "is_monsoon_active": is_monsoon,
            "is_gst_filing_date": is_gst_filing,
            "is_salary_week": is_salary_week,
            "is_govt_payday": is_govt_payday,
            "is_dry_day": False,  # Simplified
            "election_flag": False,  # Simplified
            "is_harvest_season": is_harvest_season,
            "is_ramadan": is_ramadan,
            "is_navratri_fast": festival_name and "Navratri" in str(festival_name),
            "is_lockdown": is_lockdown,
            "is_covid_period": is_covid_period,
            "covid_demand_multiplier": covid_mult,
        })

    return pd.DataFrame(dates)

date_df = generate_dim_date()
spark_date = spark.createDataFrame(date_df)
spark_date.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.dim_date")
print(f"✅ dim_date: {spark_date.count()} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate dim_supplier (30 rows)

# COMMAND ----------

def generate_dim_supplier():
    """Generate supplier dimension with real Indian FMCG companies"""
    suppliers = [
        ("Hindustan Unilever", "FMCG Multinational", "Mumbai", "Maharashtra", True, 42000, 4.8),
        ("ITC Limited", "Conglomerate", "Kolkata", "West Bengal", True, 28000, 4.6),
        ("Nestle India", "FMCG Multinational", "Gurgaon", "Haryana", True, 15000, 4.7),
        ("Britannia Industries", "Foods", "Bangalore", "Karnataka", True, 14000, 4.5),
        ("Parle Products", "Foods", "Mumbai", "Maharashtra", False, 8500, 4.4),
        ("Dabur India", "Consumer Goods", "Ghaziabad", "Uttar Pradesh", True, 9000, 4.3),
        ("Marico Limited", "FMCG", "Mumbai", "Maharashtra", True, 8200, 4.4),
        ("Godrej Consumer", "FMCG", "Mumbai", "Maharashtra", True, 12000, 4.5),
        ("Tata Consumer", "FMCG", "Mumbai", "Maharashtra", True, 10500, 4.6),
        ("Patanjali", "FMCG", "Haridwar", "Uttarakhand", False, 5500, 4.0),
        ("Amul (GCMMF)", "Dairy Cooperative", "Anand", "Gujarat", False, 52000, 4.8),
        ("Mother Dairy", "Dairy", "Delhi", "Delhi", False, 12000, 4.5),
        ("PepsiCo India", "Beverages", "Gurgaon", "Haryana", True, 8000, 4.3),
        ("Coca-Cola India", "Beverages", "Gurgaon", "Haryana", True, 7500, 4.3),
        ("Haldirams", "Foods", "Nagpur", "Maharashtra", False, 4500, 4.4),
        ("MTR Foods", "Foods", "Bangalore", "Karnataka", False, 2800, 4.2),
        ("Everest Masala", "Spices", "Mumbai", "Maharashtra", False, 1800, 4.3),
        ("MDH Masala", "Spices", "Delhi", "Delhi", False, 1500, 4.4),
        ("Catch Foods", "Spices", "Delhi", "Delhi", False, 1200, 4.1),
        ("Fortune (Adani)", "Edible Oils", "Ahmedabad", "Gujarat", True, 18000, 4.5),
        ("Saffola (Marico)", "Edible Oils", "Mumbai", "Maharashtra", True, 3500, 4.4),
        ("Colgate-Palmolive", "Personal Care", "Mumbai", "Maharashtra", True, 4800, 4.6),
        ("P&G India", "Personal Care", "Mumbai", "Maharashtra", True, 3200, 4.5),
        ("L'Oreal India", "Personal Care", "Mumbai", "Maharashtra", True, 2100, 4.4),
        ("Reckitt India", "Home Care", "Gurgaon", "Haryana", True, 4500, 4.5),
        ("Bikaji Foods", "Snacks", "Bikaner", "Rajasthan", True, 1800, 4.2),
        ("Balaji Wafers", "Snacks", "Rajkot", "Gujarat", False, 1500, 4.3),
        ("Kwality Walls", "Ice Cream", "Mumbai", "Maharashtra", True, 2200, 4.4),
        ("Havmor", "Ice Cream", "Ahmedabad", "Gujarat", False, 800, 4.3),
        ("DMart Private Label", "Private Label", "Mumbai", "Maharashtra", False, 25000, 4.0),
    ]

    supplier_records = []
    for i, (name, category, city, state, listed, revenue, rating) in enumerate(suppliers, 1):
        supplier_records.append({
            "supplier_id": f"SUP-{i:04d}",
            "supplier_code": name[:5].upper().replace(" ", ""),
            "supplier_name": name,
            "supplier_type": category,
            "is_listed_company": listed,
            "contact_person": f"Vendor Manager {i}",
            "contact_email": f"vendor{i}@{name.lower().replace(' ', '')}.com",
            "contact_phone": f"+91-{random.randint(7000000000, 9999999999)}",
            "address_line1": f"Corporate Office, {city}",
            "city": city,
            "state": state,
            "pincode": f"{random.randint(100000, 999999)}",
            "payment_terms_days": random.choice([30, 45, 60]),
            "credit_limit_inr": revenue * 100,
            "annual_revenue_cr": revenue / 100,
            "supplier_rating": rating,
            "is_preferred": rating >= 4.5,
            "is_active": True,
            "onboarded_date": datetime(2019, random.randint(1, 12), random.randint(1, 28)),
        })

    return pd.DataFrame(supplier_records)

supplier_df = generate_dim_supplier()
spark_supplier = spark.createDataFrame(supplier_df)
spark_supplier.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.dim_supplier")
print(f"✅ dim_supplier: {spark_supplier.count()} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate dim_brand (55 rows)

# COMMAND ----------

def generate_dim_brand():
    """Generate brand dimension"""
    # Collect unique brands from brand mapping
    all_brands = set()
    for brands in BRAND_MAPPING.values():
        all_brands.update(brands)

    brands_info = {
        # National brands
        "Tata Salt": ("Tata Consumer", "National", "Mass", False, 45.0),
        "Catch": ("DS Group", "National", "Mass", False, 8.0),
        "Patanjali": ("Patanjali", "National", "Value", False, 12.0),
        "Fortune": ("Adani Wilmar", "National", "Mass", False, 22.0),
        "Saffola": ("Marico", "National", "Premium", False, 15.0),
        "Dhara": ("Mother Dairy", "National", "Mass", False, 8.0),
        "Nature Fresh": ("Cargill", "National", "Mass", False, 5.0),
        "Aashirvaad": ("ITC", "National", "Premium", False, 28.0),
        "Pillsbury": ("General Mills", "National", "Premium", False, 8.0),
        "India Gate": ("KRBL", "National", "Premium", False, 18.0),
        "Daawat": ("LT Foods", "National", "Premium", False, 15.0),
        "Kohinoor": ("McCormick", "National", "Premium", False, 8.0),
        "Tata Sampann": ("Tata Consumer", "National", "Premium", False, 5.0),
        "24 Mantra": ("24 Mantra", "National", "Premium Organic", False, 3.0),
        "Rajdhani": ("Rajdhani", "Regional", "Mass", False, 4.0),
        "Madhur": ("DSCL", "National", "Mass", False, 5.0),
        "Trust": ("Trust", "Regional", "Mass", False, 3.0),
        "MDH": ("MDH", "National", "Mass", False, 25.0),
        "Everest": ("Everest", "National", "Mass", False, 20.0),
        "Suhana": ("Suhana", "Regional", "Mass", False, 5.0),
        "Kitchen King": ("Badshah", "Regional", "Mass", False, 4.0),
        "Amul": ("GCMMF", "National", "Mass", False, 45.0),
        "Mother Dairy": ("Mother Dairy", "Regional", "Mass", False, 25.0),
        "Nandini": ("KMF", "Regional", "Mass", False, 8.0),
        "Aavin": ("TCMPF", "Regional", "Mass", False, 6.0),
        "Milky Mist": ("Milky Mist", "Regional", "Premium", False, 4.0),
        "Nestle": ("Nestle", "Multinational", "Premium", False, 12.0),
        "Danone": ("Danone", "Multinational", "Premium", False, 3.0),
        "Epigamia": ("Drums Food", "National", "Premium", False, 2.0),
        "Britannia": ("Britannia", "National", "Mass", False, 30.0),
        "Gowardhan": ("Parag Milk", "National", "Mass", False, 5.0),
        "Kwality Walls": ("HUL", "National", "Mass", False, 15.0),
        "Baskin Robbins": ("Baskin Robbins", "Multinational", "Premium", False, 5.0),
        "Havmor": ("Lotte", "Regional", "Mass", False, 8.0),
        "Verka": ("Milkfed Punjab", "Regional", "Mass", False, 4.0),
        "Safal": ("Mother Dairy", "National", "Mass", False, 12.0),
        "McCain": ("McCain", "Multinational", "Premium", False, 8.0),
        "Godrej": ("Godrej", "National", "Mass", False, 5.0),
        "Coca-Cola": ("Coca-Cola", "Multinational", "Mass", False, 35.0),
        "Thums Up": ("Coca-Cola", "National", "Mass", False, 15.0),
        "Pepsi": ("PepsiCo", "Multinational", "Mass", False, 18.0),
        "Sprite": ("Coca-Cola", "Multinational", "Mass", False, 12.0),
        "7Up": ("PepsiCo", "Multinational", "Mass", False, 8.0),
        "Limca": ("Coca-Cola", "National", "Mass", False, 6.0),
        "Maaza": ("Coca-Cola", "National", "Mass", False, 12.0),
        "Slice": ("PepsiCo", "National", "Mass", False, 8.0),
        "Frooti": ("Parle Agro", "National", "Mass", False, 15.0),
        "Real": ("Dabur", "National", "Mass", False, 10.0),
        "Tropicana": ("PepsiCo", "Multinational", "Premium", False, 12.0),
        "B Natural": ("ITC", "National", "Premium", False, 5.0),
        "Paper Boat": ("Hector Beverages", "National", "Premium", False, 3.0),
        "Bisleri": ("Bisleri", "National", "Mass", False, 40.0),
        "Kinley": ("Coca-Cola", "National", "Mass", False, 25.0),
        "Aquafina": ("PepsiCo", "National", "Mass", False, 15.0),
        "Himalayan": ("Tata Consumer", "National", "Premium", False, 8.0),
        "Tata Tea": ("Tata Consumer", "National", "Mass", False, 22.0),
        "Brooke Bond": ("HUL", "National", "Mass", False, 18.0),
        "Wagh Bakri": ("Wagh Bakri", "Regional", "Mass", False, 8.0),
        "Lipton": ("HUL", "Multinational", "Mass", False, 12.0),
        "Tetley": ("Tata Consumer", "Multinational", "Premium", False, 8.0),
        "Organic India": ("Organic India", "National", "Premium Organic", False, 5.0),
        "Typhoo": ("Typhoo", "Multinational", "Premium", False, 3.0),
        "Nescafe": ("Nestle", "Multinational", "Mass", False, 45.0),
        "Bru": ("HUL", "National", "Mass", False, 30.0),
        "Davidoff": ("JDE", "Multinational", "Premium", False, 5.0),
        "Cothas": ("Cothas", "Regional", "Mass", False, 4.0),
        "Narasus": ("Narasus", "Regional", "Mass", False, 3.0),
        "Red Bull": ("Red Bull", "Multinational", "Premium", False, 35.0),
        "Monster": ("Monster", "Multinational", "Premium", False, 15.0),
        "Sting": ("PepsiCo", "National", "Mass", False, 8.0),
        "Parle-G": ("Parle", "National", "Mass", False, 40.0),
        "Sunfeast": ("ITC", "National", "Mass", False, 18.0),
        "Oreo": ("Mondelez", "Multinational", "Premium", False, 12.0),
        "Parle": ("Parle", "National", "Mass", False, 35.0),
        "Lays": ("PepsiCo", "Multinational", "Mass", False, 28.0),
        "Bingo": ("ITC", "National", "Mass", False, 15.0),
        "Uncle Chipps": ("PepsiCo", "National", "Mass", False, 8.0),
        "Pringles": ("Kellanova", "Multinational", "Premium", False, 5.0),
        "Haldirams": ("Haldirams", "National", "Mass", False, 25.0),
        "Bikano": ("Bikano", "Regional", "Mass", False, 8.0),
        "Balaji": ("Balaji Wafers", "Regional", "Mass", False, 12.0),
        "Cornitos": ("Cornitos", "National", "Premium", False, 5.0),
        "Maggi": ("Nestle", "Multinational", "Mass", False, 55.0),
        "Yippee": ("ITC", "National", "Mass", False, 22.0),
        "Top Ramen": ("Nissin", "Multinational", "Mass", False, 8.0),
        "Ching's": ("Capital Foods", "National", "Mass", False, 10.0),
        "Lux": ("HUL", "National", "Mass", False, 18.0),
        "Dove": ("HUL", "Multinational", "Premium", False, 15.0),
        "Lifebuoy": ("HUL", "National", "Mass", False, 20.0),
        "Dettol": ("Reckitt", "Multinational", "Premium", False, 22.0),
        "Godrej No.1": ("Godrej", "National", "Mass", False, 8.0),
        "Head & Shoulders": ("P&G", "Multinational", "Premium", False, 18.0),
        "Clinic Plus": ("HUL", "National", "Mass", False, 12.0),
        "Pantene": ("P&G", "Multinational", "Premium", False, 10.0),
        "Colgate": ("Colgate-Palmolive", "Multinational", "Mass", False, 55.0),
        "Pepsodent": ("HUL", "National", "Mass", False, 12.0),
        "Closeup": ("HUL", "National", "Mass", False, 8.0),
        "Sensodyne": ("Haleon", "Multinational", "Premium", False, 10.0),
        "Surf Excel": ("HUL", "National", "Mass", False, 28.0),
        "Tide": ("P&G", "Multinational", "Mass", False, 18.0),
        "Ariel": ("P&G", "Multinational", "Premium", False, 12.0),
        "Ghadi": ("RSPL", "National", "Value", False, 15.0),
        "Comfort": ("HUL", "National", "Premium", False, 8.0),
        "Parachute": ("Marico", "National", "Mass", False, 55.0),
        "KLF Coconad": ("KLF Nirmal", "Regional", "Mass", False, 8.0),
        "VVD": ("VVD & Sons", "Regional", "Mass", False, 5.0),
        # Private Labels
        "DMart Home": ("DMart", "Private Label", "Value", True, 5.0),
        "Good Life": ("Reliance", "Private Label", "Value", True, 3.0),
        "BB Royal": ("BigBasket", "Private Label", "Value", True, 4.0),
        "Local Brand": ("Various", "Regional", "Value", False, 2.0),
        "Unibic": ("Unibic", "National", "Premium", False, 5.0),
    }

    brand_records = []
    brand_id = 1

    for brand_name, (parent, origin, tier, is_pl, share) in brands_info.items():
        brand_records.append({
            "brand_id": f"BRD-{brand_id:04d}",
            "brand_name": brand_name,
            "parent_brand": parent,
            "parent_brand_id": f"PB-{hash(parent) % 1000:03d}",
            "sub_brand": None,
            "brand_tier": tier,
            "brand_origin": origin,
            "manufacturer_name": parent,
            "brand_owner_type": "Corporate" if not is_pl else "Retailer",
            "market_share_pct": share,
            "brand_strength_index": 70 + share * 0.5,
            "is_private_label": is_pl,
            "private_label_retailer": "DMart" if is_pl and "DMart" in brand_name else None,
            "is_active": True,
        })
        brand_id += 1

    return pd.DataFrame(brand_records[:NUM_BRANDS])  # Limit to 55 brands

brand_df = generate_dim_brand()
spark_brand = spark.createDataFrame(brand_df)
spark_brand.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.dim_brand")
print(f"✅ dim_brand: {spark_brand.count()} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate dim_category (50 rows)

# COMMAND ----------

def generate_dim_category():
    """Generate category dimension from product taxonomy"""
    categories = []
    cat_id = 1

    # Department IDs
    dept_ids = {}
    for dept, _, _, _, _ in PRODUCT_TAXONOMY:
        if dept not in dept_ids:
            dept_ids[dept] = f"DEPT-{len(dept_ids)+1:02d}"

    # L1 IDs
    l1_ids = {}
    for dept, l1, _, _, _ in PRODUCT_TAXONOMY:
        key = (dept, l1)
        if key not in l1_ids:
            l1_ids[key] = f"L1-{len(l1_ids)+1:03d}"

    for dept, l1, l2, gst, packs in PRODUCT_TAXONOMY:
        # Determine demand pattern
        if "Milk" in l2 or "Curd" in l2:
            pattern = "High Frequency"
        elif "Oil" in l2 or "Atta" in l2 or "Rice" in l2:
            pattern = "Staple"
        elif "Ice Cream" in l2 or "Cold" in l2:
            pattern = "Seasonal"
        elif "Biscuits" in l2 or "Chips" in l2:
            pattern = "Impulse"
        else:
            pattern = "Regular"

        # Determine shelf life
        if "Milk" in l2 or "Curd" in l2 or "Paneer" in l2:
            shelf_life = 7
        elif "Ice Cream" in l2:
            shelf_life = 180
        elif "Frozen" in l2:
            shelf_life = 365
        elif "Oil" in l2 or "Ghee" in l2:
            shelf_life = 365
        else:
            shelf_life = 180

        categories.append({
            "category_id": f"CAT-{cat_id:04d}",
            "category_code": f"C{cat_id:03d}",
            "department_name": dept,
            "department_id": dept_ids[dept],
            "category_l1_name": l1,
            "category_l1_id": l1_ids[(dept, l1)],
            "category_l2_name": l2,
            "category_l2_id": f"L2-{cat_id:04d}",
            "category_l3_name": None,
            "category_l3_id": None,
            "category_l4_name": None,
            "category_l4_id": None,
            "is_food": dept in ["Grocery & Staples", "Dairy & Frozen", "Beverages", "Snacks & Biscuits"],
            "is_fmcg": True,
            "demand_pattern": pattern,
            "avg_shelf_life_days": shelf_life,
            "category_manager": f"CM_{dept[:3]}_{cat_id:02d}",
            "target_service_level": 95.0 if pattern == "Staple" else 92.0,
            "target_inventory_turns": 12.0 if "Milk" in l2 else 8.0,
            "gst_slab_typical": float(gst),
            "is_regulated_price": l2 in ["Toned Milk", "Full Cream Milk", "White Sugar"],
            "is_active": True,
        })
        cat_id += 1

    return pd.DataFrame(categories)

category_df = generate_dim_category()
spark_category = spark.createDataFrame(category_df)
spark_category.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.dim_category")
print(f"✅ dim_category: {spark_category.count()} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate dim_store (275 rows)

# COMMAND ----------

def get_store_opening_date(store_format: str, store_num: int, total_in_format: int) -> datetime:
    """Generate realistic store opening date based on format rules"""
    rules = OPENING_RULES[store_format]
    earliest = datetime.strptime(rules["earliest"], "%Y-%m-%d")
    pct_existing = rules["pct_existing_2020"]

    data_start = datetime(2020, 1, 1)

    # How many should exist before 2020-01-01?
    existing_count = int(total_in_format * pct_existing)

    if store_num <= existing_count:
        # Opened before 2020
        days_before = random.randint(0, 730)  # Up to 2 years before
        return data_start - timedelta(days=days_before)
    else:
        # Opened during 2020-2025
        if store_format == "Express":
            # Started 2021
            open_date = datetime(2021, random.randint(1, 12), random.randint(1, 28))
        elif store_format == "Dark Store":
            # Started mid-2022
            year = random.choice([2022, 2022, 2023, 2023, 2024, 2024, 2025])
            month = random.randint(6, 12) if year == 2022 else random.randint(1, 12)
            open_date = datetime(year, month, random.randint(1, 28))
        elif store_format == "Kirana Partner":
            # Started 2023
            year = random.choice([2023, 2023, 2024, 2024, 2025])
            open_date = datetime(year, random.randint(1, 12), random.randint(1, 28))
        else:
            # Hypermarket/Supermarket - gradual expansion
            years_since_2020 = (store_num - existing_count) / (total_in_format * rules["new_per_year"])
            years_since_2020 = min(years_since_2020, 5)
            open_date = data_start + timedelta(days=int(years_since_2020 * 365) + random.randint(0, 180))

        return min(open_date, datetime(2025, 12, 31))

def generate_dim_store():
    """Generate store dimension with 275 stores across 10 cities and 5 formats"""
    stores = []
    store_id = 1

    # Get geography IDs
    geo_ids = {row["geo_name"]: row["geo_id"] for _, row in geo_df.iterrows() if row["geo_level"] == "City"}

    # Get cluster IDs
    cluster_ids = {row["cluster_name"]: row["cluster_id"] for _, row in cluster_df.iterrows()}

    # Count total stores per format
    format_totals = {}
    for city_config in STORE_CONFIG.values():
        for fmt, count in city_config.items():
            format_totals[fmt] = format_totals.get(fmt, 0) + count

    # Track store numbers per format for opening date calculation
    format_store_nums = {fmt: 0 for fmt in FORMAT_SPECS.keys()}

    for city, formats in STORE_CONFIG.items():
        tier = CITY_TIERS[city]
        state = CITY_STATES[city]
        region = CITY_REGIONS[city]

        for store_format, count in formats.items():
            specs = FORMAT_SPECS[store_format]

            for i in range(count):
                format_store_nums[store_format] += 1

                area = random.randint(*specs["area_sqft"])

                # Determine cluster
                if store_format in ["Hypermarket", "Supermarket"]:
                    cluster_key = f"{tier} Large Format"
                elif store_format == "Express":
                    cluster_key = f"{tier} Convenience"
                elif store_format == "Dark Store":
                    cluster_key = f"{tier} Q-Commerce"
                else:
                    cluster_key = f"{tier} Partner"

                cluster_id = cluster_ids.get(cluster_key, list(cluster_ids.values())[0])

                opening_date = get_store_opening_date(
                    store_format,
                    format_store_nums[store_format],
                    format_totals[store_format]
                )

                stores.append({
                    "store_id": f"STR-{store_id:04d}",
                    "store_code": f"{city[:3].upper()}{store_format[:2].upper()}{i+1:02d}",
                    "store_name": f"{city} {store_format} {i+1}",
                    "store_type": store_format,
                    "store_format": "Large" if store_format in ["Hypermarket", "Supermarket"] else "Small",
                    "channel_id": specs["channel"],
                    "geo_id": geo_ids.get(city, "GEO-0015"),
                    "cluster_id": cluster_id,
                    "city": city,
                    "state": state,
                    "region": region,
                    "pincode": f"{random.randint(100000, 999999)}",
                    "address_line1": f"Plot {random.randint(1, 500)}, {city}",
                    "latitude": 19.0 + random.uniform(-3, 3),
                    "longitude": 73.0 + random.uniform(-5, 10),
                    "area_sqft": area,
                    "selling_area_sqft": int(area * 0.7),
                    "storage_area_sqft": int(area * 0.25),
                    "num_checkout_counters": max(1, area // 3000),
                    "has_cold_storage": store_format not in ["Kirana Partner"],
                    "has_warehouse": store_format in ["Hypermarket", "Dark Store"],
                    "opening_date": opening_date.date(),
                    "renovation_date": None,
                    "operating_hours_start": "09:00" if store_format != "Dark Store" else "00:00",
                    "operating_hours_end": "21:00" if store_format != "Dark Store" else "23:59",
                    "is_24x7": store_format == "Dark Store",
                    "weekly_off_day": "None" if store_format not in ["Kirana Partner"] else random.choice(["Sunday", "None"]),
                    "manager_name": f"Manager_{store_id}",
                    "manager_contact": f"+91-{random.randint(7000000000, 9999999999)}",
                    "is_active": True,
                    "created_at": opening_date,
                    "updated_at": datetime.now(),
                })
                store_id += 1

    return pd.DataFrame(stores)

store_df = generate_dim_store()
spark_store = spark.createDataFrame(store_df)
spark_store.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.dim_store")
print(f"✅ dim_store: {spark_store.count()} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate dim_product (2,000 rows)

# COMMAND ----------

def generate_dim_product():
    """Generate product dimension with 2000 SKUs"""
    products = []
    product_id = 1

    # Get category and brand IDs
    cat_ids = {row["category_l2_name"]: (row["category_id"], row["department_name"], row["category_l1_name"], row["gst_slab_typical"])
               for _, row in category_df.iterrows()}
    brand_ids = {row["brand_name"]: row["brand_id"] for _, row in brand_df.iterrows()}

    # Get supplier IDs
    sup_ids = [row["supplier_id"] for _, row in supplier_df.iterrows()]

    # HSN codes by category
    hsn_mapping = {
        "Salt": "25010010", "Edible Oil": "15079010", "Atta & Flour": "11010000",
        "Rice": "10063020", "Dal & Pulses": "07139090", "Sugar & Jaggery": "17011400",
        "Spices": "09109100", "Milk": "04012000", "Curd & Yogurt": "04031000",
        "Butter & Ghee": "04051000", "Cheese": "04061000", "Ice Cream": "21050000",
        "Paneer": "04061000", "Frozen Foods": "07102100", "Soft Drinks": "22021010",
        "Juice": "20091100", "Water": "22011010", "Tea": "09021000",
        "Coffee": "09011110", "Energy Drinks": "22029020", "Biscuits": "19053100",
        "Chips & Namkeen": "19059090", "Noodles": "19023010", "Soaps": "34011100",
        "Shampoo": "33051000", "Toothpaste": "33061010", "Detergent": "34022010",
    }

    # Product lifecycle distribution
    # 1200 exist from before 2020
    # ~150-170 launched per year 2020-2024
    # ~70-90 discontinued per year

    target_per_subcat = NUM_PRODUCTS // len(PRODUCT_TAXONOMY)  # ~40 per subcategory

    for dept, l1, l2, gst, packs in PRODUCT_TAXONOMY:
        cat_info = cat_ids.get(l2)
        if not cat_info:
            continue

        cat_id, dept_name, l1_name, gst_rate = cat_info
        brands = BRAND_MAPPING.get(l2, ["Generic Brand"])
        hsn = hsn_mapping.get(l1, "99999999")

        # Determine product characteristics based on category
        is_perishable = l1 in ["Milk", "Curd & Yogurt", "Paneer"]
        storage_type = "Cold" if is_perishable or l1 in ["Ice Cream", "Frozen Foods", "Butter & Ghee"] else "Ambient"
        temp_min = 2.0 if storage_type == "Cold" else None
        temp_max = 8.0 if storage_type == "Cold" else None

        if is_perishable:
            shelf_life = 7
        elif l1 in ["Ice Cream", "Frozen Foods"]:
            shelf_life = 180
        elif l1 in ["Soft Drinks", "Juice", "Water"]:
            shelf_life = 180
        else:
            shelf_life = 365

        # Generate products for this subcategory
        num_products_for_subcat = min(target_per_subcat, len(brands) * len(packs) * 2)

        for brand in brands:
            brand_id = brand_ids.get(brand, brand_ids.get("Local Brand", "BRD-0001"))
            is_private_label = "DMart" in brand or "BB Royal" in brand or "Good Life" in brand

            for pack_size, pack_uom, mrp_low, mrp_high in packs:
                # Generate 1-3 variants per brand-pack combination
                variants = ["Regular", "Premium", "Value"] if random.random() > 0.7 else ["Regular"]

                for variant in variants:
                    if product_id > NUM_PRODUCTS:
                        break

                    # Base MRP (2020)
                    base_mrp = random.randint(mrp_low, mrp_high)

                    # Determine lifecycle
                    # 60% launched before 2020, 40% during 2020-2025
                    if random.random() < 0.60:
                        launch_date = datetime(random.randint(2015, 2019), random.randint(1, 12), random.randint(1, 28))
                    else:
                        launch_year = random.choice([2020, 2020, 2021, 2021, 2022, 2022, 2023, 2024])
                        launch_date = datetime(launch_year, random.randint(1, 12), random.randint(1, 28))

                    # Some products get discontinued
                    discontinuation_date = None
                    lifecycle_stage = "Mature"
                    if random.random() < 0.05:  # 5% discontinued
                        disc_year = random.choice([2021, 2022, 2023, 2024])
                        discontinuation_date = datetime(disc_year, random.randint(1, 12), random.randint(1, 28))
                        if discontinuation_date <= launch_date:
                            discontinuation_date = launch_date + timedelta(days=365)
                        lifecycle_stage = "Discontinued"
                    elif launch_date.year >= 2023:
                        lifecycle_stage = "Growth"
                    elif launch_date.year >= 2020:
                        lifecycle_stage = "Mature"

                    # ABC/XYZ classification
                    abc_class = random.choices(["A", "B", "C"], weights=[0.2, 0.35, 0.45])[0]
                    xyz_class = random.choices(["X", "Y", "Z"], weights=[0.3, 0.4, 0.3])[0]

                    # Seasonality
                    is_seasonal = l1 in ["Ice Cream", "Soft Drinks"] or "Ghee" in l2
                    seasonality_type = "Summer Peak" if l1 in ["Ice Cream", "Soft Drinks"] else "Festival Peak" if "Ghee" in l2 else None

                    product_name = f"{brand} {l2} {pack_size}{pack_uom}"
                    if variant != "Regular":
                        product_name += f" {variant}"

                    products.append({
                        "product_id": f"PRD-{product_id:06d}",
                        "ean_code": f"89{random.randint(10000000000, 99999999999)}",
                        "product_name": product_name,
                        "product_name_regional": None,
                        "brand_id": brand_id,
                        "category_id": cat_id,
                        "supplier_id": random.choice(sup_ids),
                        "department": dept,
                        "category_l1": l1,
                        "category_l2": l2,
                        "category_l3": variant if variant != "Regular" else None,
                        "category_l4": None,
                        "pack_size": float(pack_size),
                        "pack_uom": pack_uom,
                        "pack_type": "Pouch" if l1 in ["Edible Oil", "Milk", "Atta & Flour"] else "Box" if l1 == "Biscuits" else "Bottle" if l1 in ["Soft Drinks", "Juice", "Water"] else "Pack",
                        "variant": variant if variant != "Regular" else None,
                        "mrp": float(base_mrp),
                        "gst_rate": float(gst),
                        "hsn_code": hsn,
                        "shelf_life_days": shelf_life,
                        "is_perishable": is_perishable,
                        "storage_type": storage_type,
                        "temperature_min_c": temp_min,
                        "temperature_max_c": temp_max,
                        "is_private_label": is_private_label,
                        "is_seasonal": is_seasonal,
                        "seasonality_type": seasonality_type,
                        "lifecycle_stage": lifecycle_stage,
                        "launch_date": launch_date.date(),
                        "discontinuation_date": discontinuation_date.date() if discontinuation_date else None,
                        "abc_class": abc_class,
                        "xyz_class": xyz_class,
                        "fss_license_required": l1 in ["Milk", "Curd & Yogurt", "Paneer", "Ice Cream"],
                        "is_essential_commodity": l1 in ["Rice", "Dal & Pulses", "Edible Oil", "Sugar & Jaggery", "Atta & Flour"],
                        "is_otc_pharma": False,
                        "is_age_restricted": False,
                        "is_returnable": not is_perishable,
                        "substitute_group_id": f"SUB-{l2[:3].upper()}-{random.randint(1,10):02d}",
                        "weight_kg": pack_size / 1000 if pack_uom in ["g", "ml"] else pack_size,
                        "volume_cbm": random.uniform(0.0001, 0.005),
                        "cases_per_pallet": random.randint(20, 100),
                        "units_per_case": random.choice([6, 12, 24, 48]),
                        "min_order_qty": random.choice([1, 6, 12]),
                        "is_active": lifecycle_stage != "Discontinued",
                        "created_at": launch_date,
                        "updated_at": datetime.now(),
                    })
                    product_id += 1

    return pd.DataFrame(products[:NUM_PRODUCTS])

product_df = generate_dim_product()
spark_product = spark.createDataFrame(product_df)
spark_product.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.dim_product")
print(f"✅ dim_product: {spark_product.count()} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Generate dim_customer (50,000 rows)

# COMMAND ----------

def generate_dim_customer():
    """Generate customer dimension with 50,000 customers"""
    customers = []

    # Customer segments
    segments = ["Value Seeker", "Premium Buyer", "Regular", "Occasional", "Bulk Buyer"]
    tiers = ["Platinum", "Gold", "Silver", "Bronze", "Non-Member"]

    # City distribution (weighted by population)
    city_weights = {
        "Mumbai": 0.18, "Delhi NCR": 0.20, "Bangalore": 0.13, "Chennai": 0.10,
        "Hyderabad": 0.10, "Kolkata": 0.08, "Pune": 0.08, "Ahmedabad": 0.06,
        "Jaipur": 0.04, "Lucknow": 0.03
    }

    # Age groups and gender
    age_groups = [(18, 25), (26, 35), (36, 45), (46, 55), (56, 70)]
    genders = ["M", "F", "O"]

    for i in range(1, NUM_CUSTOMERS + 1):
        # Assign city
        city = random.choices(list(city_weights.keys()), weights=list(city_weights.values()))[0]

        # Demographics
        age_group = random.choice(age_groups)
        age = random.randint(*age_group)
        gender = random.choices(genders, weights=[0.48, 0.48, 0.04])[0]

        # Loyalty
        is_loyalty = random.random() < 0.40  # 40% loyalty members
        tier = random.choices(tiers, weights=[0.05, 0.10, 0.20, 0.25, 0.40])[0] if is_loyalty else "Non-Member"

        # Segment
        segment = random.choice(segments)

        # Registration date
        reg_year = random.choice([2018, 2019, 2020, 2021, 2022, 2023, 2024])
        reg_date = datetime(reg_year, random.randint(1, 12), random.randint(1, 28))

        # Spending patterns
        if tier == "Platinum":
            monthly_spend = random.randint(15000, 50000)
            visit_freq = random.randint(8, 15)
        elif tier == "Gold":
            monthly_spend = random.randint(8000, 15000)
            visit_freq = random.randint(5, 10)
        elif tier == "Silver":
            monthly_spend = random.randint(4000, 8000)
            visit_freq = random.randint(3, 6)
        else:
            monthly_spend = random.randint(1000, 4000)
            visit_freq = random.randint(1, 4)

        customers.append({
            "customer_id": f"CUS-{i:08d}",
            "customer_code": f"C{i:07d}",
            "first_name": f"Customer{i}",
            "last_name": f"Name{i % 1000}",
            "email": f"customer{i}@example.com" if random.random() > 0.3 else None,
            "phone": f"+91-{random.randint(7000000000, 9999999999)}",
            "gender": gender,
            "age": age,
            "age_band": f"{age_group[0]}-{age_group[1]}",
            "city": city,
            "state": CITY_STATES[city],
            "pincode": f"{random.randint(100000, 999999)}",
            "registration_date": reg_date.date(),
            "registration_channel": random.choice(["Store", "App", "Website"]),
            "is_loyalty_member": is_loyalty,
            "loyalty_tier": tier,
            "loyalty_points_balance": random.randint(0, 10000) if is_loyalty else 0,
            "customer_segment": segment,
            "preferred_store_id": f"STR-{random.randint(1, 275):04d}",
            "preferred_payment_method": random.choice(["UPI", "Card", "Cash", "Wallet"]),
            "avg_monthly_spend_inr": monthly_spend,
            "avg_basket_size_inr": monthly_spend / visit_freq,
            "avg_visit_frequency": visit_freq,
            "is_active": random.random() > 0.05,
            "last_purchase_date": datetime(2024, random.randint(1, 12), random.randint(1, 28)).date() if random.random() > 0.1 else None,
        })

    return pd.DataFrame(customers)

customer_df = generate_dim_customer()
spark_customer = spark.createDataFrame(customer_df)
spark_customer.write.mode("overwrite").saveAsTable(f"{SCHEMA_BRONZE}.dim_customer")
print(f"✅ dim_customer: {spark_customer.count()} rows written")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Summary & Validation

# COMMAND ----------

# Validate all dimension tables
dimension_tables = [
    "dim_channel", "dim_geography", "dim_cluster", "dim_time_of_day",
    "dim_date", "dim_supplier", "dim_brand", "dim_category", "dim_store",
    "dim_product", "dim_customer"
]

print("\n" + "="*60)
print("DIMENSION TABLES SUMMARY")
print("="*60)

total_rows = 0
for table in dimension_tables:
    try:
        count = spark.table(f"{SCHEMA_BRONZE}.{table}").count()
        total_rows += count
        print(f"✅ {table}: {count:,} rows")
    except Exception as e:
        print(f"❌ {table}: ERROR - {str(e)}")

print("="*60)
print(f"Total: {total_rows:,} rows across {len(dimension_tables)} tables")
print("="*60)

# COMMAND ----------

# MAGIC %md
# MAGIC ## Add Table Comments

# COMMAND ----------

# Add comments to all tables
table_comments = {
    "dim_channel": "Sales channel dimension - Offline, Online, Q-Commerce, Click & Collect, B2B, Kirana",
    "dim_geography": "Geographic hierarchy - Country > Region > State > City",
    "dim_cluster": "Store clustering based on tier, format, and performance",
    "dim_time_of_day": "24-hour time slots with peak hour indicators",
    "dim_date": "Date dimension with Indian festivals, COVID flags, and fiscal calendar",
    "dim_supplier": "Vendor master with 30 real Indian FMCG companies",
    "dim_brand": "Brand hierarchy with 55 brands including private labels",
    "dim_category": "Product category hierarchy with 50 subcategories",
    "dim_store": "275 stores across 10 cities and 5 formats",
    "dim_product": "2000 SKUs with full product attributes",
    "dim_customer": "50000 customers with demographics and loyalty data",
}

for table, comment in table_comments.items():
    spark.sql(f"COMMENT ON TABLE {SCHEMA_BRONZE}.{table} IS '{comment}'")
    print(f"✅ Added comment to {table}")

print("\n🎉 Notebook 01 completed successfully!")
