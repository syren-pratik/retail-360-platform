-- DDL for retail_gold.gold_demand_daily_sku_store
-- Generated: 2026-05-20
-- Workspace: https://adb-3361736940380124.4.azuredatabricks.net

-- ── SHOW CREATE TABLE ───────────────────────────────

CREATE TABLE hive_metastore.retail_gold.gold_demand_daily_sku_store (
  date_id BIGINT,
  product_id STRING COLLATE UTF8_BINARY,
  store_id STRING COLLATE UTF8_BINARY,
  department STRING COLLATE UTF8_BINARY,
  category_l1 STRING COLLATE UTF8_BINARY,
  category_l2 STRING COLLATE UTF8_BINARY,
  brand_id STRING COLLATE UTF8_BINARY,
  abc_class STRING COLLATE UTF8_BINARY,
  xyz_class STRING COLLATE UTF8_BINARY,
  current_mrp DOUBLE,
  is_perishable BOOLEAN,
  is_essential_commodity BOOLEAN,
  lifecycle_stage STRING COLLATE UTF8_BINARY,
  pack_size DOUBLE,
  pack_uom STRING COLLATE UTF8_BINARY,
  city STRING COLLATE UTF8_BINARY,
  state STRING COLLATE UTF8_BINARY,
  region STRING COLLATE UTF8_BINARY,
  store_type STRING COLLATE UTF8_BINARY,
  cluster_id STRING COLLATE UTF8_BINARY,
  geo_id STRING COLLATE UTF8_BINARY,
  quantity_sold BIGINT,
  revenue DOUBLE,
  gross_revenue DOUBLE,
  total_discount DOUBLE,
  avg_selling_price DOUBLE,
  avg_cost_price DOUBLE,
  total_margin DOUBLE,
  num_transactions BIGINT,
  unique_customers BIGINT,
  qty_offline BIGINT,
  qty_online BIGINT,
  opening_stock INT,
  closing_stock INT,
  received_qty INT,
  days_of_stock DOUBLE,
  is_stockout INT,
  price_to_mrp_ratio DOUBLE,
  is_on_promo INT,
  promo_id STRING COLLATE UTF8_BINARY,
  day_of_week BIGINT,
  day_name STRING COLLATE UTF8_BINARY,
  is_weekend BOOLEAN,
  month_num BIGINT,
  month_name STRING COLLATE UTF8_BINARY,
  quarter BIGINT,
  year BIGINT,
  fiscal_year STRING COLLATE UTF8_BINARY,
  fiscal_quarter STRING COLLATE UTF8_BINARY,
  indian_season STRING COLLATE UTF8_BINARY,
  is_public_holiday BOOLEAN,
  is_festival_period BOOLEAN,
  festival_name STRING COLLATE UTF8_BINARY,
  festival_intensity STRING COLLATE UTF8_BINARY,
  days_to_festival DOUBLE,
  is_wedding_season BOOLEAN,
  is_ipl_season BOOLEAN,
  is_exam_season BOOLEAN,
  is_monsoon_active BOOLEAN,
  is_salary_week BOOLEAN,
  is_harvest_season BOOLEAN,
  is_ramadan BOOLEAN,
  is_navratri_fast BOOLEAN,
  is_lockdown BOOLEAN,
  is_covid_period BOOLEAN,
  covid_demand_multiplier DOUBLE,
  temp_max_c DOUBLE,
  temp_min_c DOUBLE,
  temp_avg_c DOUBLE,
  humidity_pct DOUBLE,
  rainfall_mm DOUBLE,
  is_heavy_rain BOOLEAN,
  aqi BIGINT)
USING delta
COMMENT 'Daily demand at SKU x Store grain - THE foundation table for forecasting'
TBLPROPERTIES (
  'delta.enableDeletionVectors' = 'true',
  'delta.feature.deletionVectors' = 'supported',
  'delta.minReaderVersion' = '3',
  'delta.minWriterVersion' = '7')


-- ── DESCRIBE TABLE EXTENDED ─────────────────────────

-- col_name                              | data_type            | comment
-- date_id                                 | bigint                | 
-- product_id                              | string                | 
-- store_id                                | string                | 
-- department                              | string                | 
-- category_l1                             | string                | 
-- category_l2                             | string                | 
-- brand_id                                | string                | 
-- abc_class                               | string                | 
-- xyz_class                               | string                | 
-- current_mrp                             | double                | 
-- is_perishable                           | boolean               | 
-- is_essential_commodity                  | boolean               | 
-- lifecycle_stage                         | string                | 
-- pack_size                               | double                | 
-- pack_uom                                | string                | 
-- city                                    | string                | 
-- state                                   | string                | 
-- region                                  | string                | 
-- store_type                              | string                | 
-- cluster_id                              | string                | 
-- geo_id                                  | string                | 
-- quantity_sold                           | bigint                | 
-- revenue                                 | double                | 
-- gross_revenue                           | double                | 
-- total_discount                          | double                | 
-- avg_selling_price                       | double                | 
-- avg_cost_price                          | double                | 
-- total_margin                            | double                | 
-- num_transactions                        | bigint                | 
-- unique_customers                        | bigint                | 
-- qty_offline                             | bigint                | 
-- qty_online                              | bigint                | 
-- opening_stock                           | int                   | 
-- closing_stock                           | int                   | 
-- received_qty                            | int                   | 
-- days_of_stock                           | double                | 
-- is_stockout                             | int                   | 
-- price_to_mrp_ratio                      | double                | 
-- is_on_promo                             | int                   | 
-- promo_id                                | string                | 
-- day_of_week                             | bigint                | 
-- day_name                                | string                | 
-- is_weekend                              | boolean               | 
-- month_num                               | bigint                | 
-- month_name                              | string                | 
-- quarter                                 | bigint                | 
-- year                                    | bigint                | 
-- fiscal_year                             | string                | 
-- fiscal_quarter                          | string                | 
-- indian_season                           | string                | 
-- is_public_holiday                       | boolean               | 
-- is_festival_period                      | boolean               | 
-- festival_name                           | string                | 
-- festival_intensity                      | string                | 
-- days_to_festival                        | double                | 
-- is_wedding_season                       | boolean               | 
-- is_ipl_season                           | boolean               | 
-- is_exam_season                          | boolean               | 
-- is_monsoon_active                       | boolean               | 
-- is_salary_week                          | boolean               | 
-- is_harvest_season                       | boolean               | 
-- is_ramadan                              | boolean               | 
-- is_navratri_fast                        | boolean               | 
-- is_lockdown                             | boolean               | 
-- is_covid_period                         | boolean               | 
-- covid_demand_multiplier                 | double                | 
-- temp_max_c                              | double                | 
-- temp_min_c                              | double                | 
-- temp_avg_c                              | double                | 
-- humidity_pct                            | double                | 
-- rainfall_mm                             | double                | 
-- is_heavy_rain                           | boolean               | 
-- aqi                                     | bigint                | 
--                                         |                       | 
-- # Detailed Table Information            |                       | 
-- Catalog                                 | hive_metastore        | 
-- Database                                | retail_gold           | 
-- Table                                   | gold_demand_daily_sku_store| 
-- Created Time                            | Tue Mar 24 21:57:00 UTC 2026| 
-- Last Access                             | UNKNOWN               | 
-- Created By                              | Spark 3.5.0           | 
-- Statistics                              | 20992372452 bytes, 0 rows| 
-- Type                                    | MANAGED               | 
-- Comment                                 | Daily demand at SKU x Store grain - THE foundation table for forecasting| 
-- Location                                | dbfs:/user/hive/warehouse/retail_gold.db/gold_demand_daily_sku_store| 
-- Provider                                | delta                 | 
-- Owner                                   | root                  | 
-- Is_managed_location                     | true                  | 
-- Table Properties                        | [delta.enableDeletionVectors=true,delta.feature.deletionVectors=supported,delta.minReaderVersion=3,delta.minWriterVersion=7]| 
