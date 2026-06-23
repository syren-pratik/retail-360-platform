-- DDL for retail_gold.gold_customer_360_v2
-- Generated: 2026-05-20
-- Workspace: https://adb-3361736940380124.4.azuredatabricks.net

-- ── SHOW CREATE TABLE ───────────────────────────────

CREATE TABLE hive_metastore.retail_gold.gold_customer_360_v2 (
  customer_id STRING COLLATE UTF8_BINARY,
  customer_name STRING COLLATE UTF8_BINARY,
  age BIGINT,
  gender STRING COLLATE UTF8_BINARY,
  city STRING COLLATE UTF8_BINARY,
  state STRING COLLATE UTF8_BINARY,
  registration_date DATE,
  registration_channel STRING COLLATE UTF8_BINARY,
  loyalty_tier STRING COLLATE UTF8_BINARY,
  is_active BOOLEAN,
  preferred_payment_method STRING COLLATE UTF8_BINARY,
  total_transactions BIGINT,
  total_spend DOUBLE,
  last_purchase_date DATE,
  days_since_purchase INT,
  latest_nps_score INT,
  avg_csat_score INT,
  nps_category STRING COLLATE UTF8_BINARY,
  engagement_score_raw DECIMAL(25,1),
  digital_propensity_tier STRING COLLATE UTF8_BINARY,
  customer_segment STRING COLLATE UTF8_BINARY,
  churn_probability DOUBLE,
  churn_risk_tier STRING COLLATE UTF8_BINARY,
  churn_prediction INT,
  churn_risk_factors STRING COLLATE UTF8_BINARY,
  clv_12m DOUBLE,
  clv_tier STRING COLLATE UTF8_BINARY,
  predicted_purchases_12m DOUBLE,
  customer_health_score DOUBLE,
  updated_at TIMESTAMP)
USING delta
TBLPROPERTIES (
  'delta.enableDeletionVectors' = 'true',
  'delta.feature.deletionVectors' = 'supported',
  'delta.minReaderVersion' = '3',
  'delta.minWriterVersion' = '7')


-- ── DESCRIBE TABLE EXTENDED ─────────────────────────

-- col_name                              | data_type            | comment
-- customer_id                             | string                | 
-- customer_name                           | string                | 
-- age                                     | bigint                | 
-- gender                                  | string                | 
-- city                                    | string                | 
-- state                                   | string                | 
-- registration_date                       | date                  | 
-- registration_channel                    | string                | 
-- loyalty_tier                            | string                | 
-- is_active                               | boolean               | 
-- preferred_payment_method                | string                | 
-- total_transactions                      | bigint                | 
-- total_spend                             | double                | 
-- last_purchase_date                      | date                  | 
-- days_since_purchase                     | int                   | 
-- latest_nps_score                        | int                   | 
-- avg_csat_score                          | int                   | 
-- nps_category                            | string                | 
-- engagement_score_raw                    | decimal(25,1)         | 
-- digital_propensity_tier                 | string                | 
-- customer_segment                        | string                | 
-- churn_probability                       | double                | 
-- churn_risk_tier                         | string                | 
-- churn_prediction                        | int                   | 
-- churn_risk_factors                      | string                | 
-- clv_12m                                 | double                | 
-- clv_tier                                | string                | 
-- predicted_purchases_12m                 | double                | 
-- customer_health_score                   | double                | 
-- updated_at                              | timestamp             | 
--                                         |                       | 
-- # Detailed Table Information            |                       | 
-- Catalog                                 | hive_metastore        | 
-- Database                                | retail_gold           | 
-- Table                                   | gold_customer_360_v2  | 
-- Created Time                            | Wed Apr 01 04:41:02 UTC 2026| 
-- Last Access                             | UNKNOWN               | 
-- Created By                              | Spark 3.5.0           | 
-- Statistics                              | 14962073 bytes, 0 rows| 
-- Type                                    | MANAGED               | 
-- Location                                | dbfs:/user/hive/warehouse/retail_gold.db/gold_customer_360_v2| 
-- Provider                                | delta                 | 
-- Owner                                   | (Unknown)pratik.m     | 
-- Is_managed_location                     | true                  | 
-- Table Properties                        | [delta.enableDeletionVectors=true,delta.feature.deletionVectors=supported,delta.minReaderVersion=3,delta.minWriterVersion=7]| 
