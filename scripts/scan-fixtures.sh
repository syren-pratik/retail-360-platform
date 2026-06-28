#!/bin/bash
# Pulls the canonical real values from Databricks for every dropdown/preset
# in the UI. Output is /tmp/dbx-fixtures.json — readable and committable as
# src/app/lib/dbx-fixtures.json so the build embeds real options.

set -e
TOKEN="${DATABRICKS_TOKEN:-dapif6aee73c5ce869da5ef1298f36efd23a-3}"
HOST="https://adb-3361736940380124.4.azuredatabricks.net"
WH="7f3dbb95180a6095"
OUT=/tmp/dbx-fixtures.json

run_sql() {
  local s="$1"
  curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "$(jq -nc --arg s "$s" --arg wh "$WH" '{warehouse_id:$wh, statement:$s, wait_timeout:"30s", disposition:"INLINE", format:"JSON_ARRAY"}')" \
    "$HOST/api/2.0/sql/statements"
}

rows() {
  python3 -c "
import json,sys
r=json.load(sys.stdin)
err=r.get('status',{}).get('error',{}).get('message','')
if err: print('ERROR:', err[:200], file=sys.stderr); sys.exit(1)
print(json.dumps(r.get('result',{}).get('data_array') or []))
"
}

echo '{' > $OUT
echo '  "_generated_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",' >> $OUT

echo "→ suppliers (top 15 by PO value)"
echo '  "suppliers": '$(run_sql "SELECT supplier_id, supplier_name, supplier_city, ROUND(CAST(on_time_pct AS DOUBLE),1) AS otif_pct, ROUND(CAST(in_full_pct AS DOUBLE),1) AS in_full_pct, ROUND(total_po_value/10000000,2) AS po_value_cr, lead_time_days FROM hive_metastore.retail_gold.gold_supplier_scorecard ORDER BY total_po_value DESC LIMIT 15" | rows)',' >> $OUT

echo "→ underperforming suppliers (otif < 75)"
echo '  "underperforming_suppliers": '$(run_sql "SELECT supplier_name, ROUND(CAST(on_time_pct AS DOUBLE),1) AS otif_pct FROM hive_metastore.retail_gold.gold_supplier_scorecard WHERE on_time_pct < 75 ORDER BY on_time_pct LIMIT 10" | rows)',' >> $OUT

echo "→ stores (top 20 by store_area_sqft, distinct cities)"
echo '  "stores": '$(run_sql "SELECT store_id, store_name, store_type, city, state, region FROM hive_metastore.retail_silver.dim_store WHERE is_active = true ORDER BY store_area_sqft DESC LIMIT 20" | rows)',' >> $OUT

echo "→ departments"
echo '  "departments": '$(run_sql "SELECT department, COUNT(*) AS sku_count FROM hive_metastore.retail_silver.dim_product WHERE department IS NOT NULL AND is_active = true GROUP BY department ORDER BY sku_count DESC" | rows)',' >> $OUT

echo "→ categories"
echo '  "categories": '$(run_sql "SELECT department, category_l1, COUNT(*) AS sku_count FROM hive_metastore.retail_silver.dim_product WHERE category_l1 IS NOT NULL AND is_active = true GROUP BY department, category_l1 ORDER BY sku_count DESC LIMIT 30" | rows)',' >> $OUT

echo "→ regions (DC proxy)"
echo '  "regions": '$(run_sql "SELECT region, COUNT(DISTINCT city) AS cities, COUNT(*) AS stores FROM hive_metastore.retail_silver.dim_store WHERE is_active = true GROUP BY region ORDER BY stores DESC" | rows)',' >> $OUT

echo "→ cities"
echo '  "cities": '$(run_sql "SELECT city, state, COUNT(*) AS stores FROM hive_metastore.retail_silver.dim_store WHERE is_active = true GROUP BY city, state ORDER BY stores DESC LIMIT 25" | rows)',' >> $OUT

echo "→ top 30 SKUs by recent revenue (anchored on max date_id, not CURRENT_DATE)"
echo '  "top_skus": '$(run_sql "WITH bounds AS (SELECT MAX(date_id) AS max_id FROM hive_metastore.retail_gold.gold_demand_daily_sku_store), cutoff AS (SELECT CAST(DATE_FORMAT(DATE_SUB(TO_DATE(CAST(max_id AS STRING), 'yyyyMMdd'), 7), 'yyyyMMdd') AS BIGINT) AS cut FROM bounds) SELECT product_id, MAX(department) AS department, MAX(category_l1) AS category_l1, SUM(quantity_sold) AS units_7d, ROUND(SUM(revenue),0) AS revenue_inr_7d FROM hive_metastore.retail_gold.gold_demand_daily_sku_store WHERE date_id >= (SELECT cut FROM cutoff) GROUP BY product_id ORDER BY revenue_inr_7d DESC LIMIT 30" | rows)',' >> $OUT

echo "→ overstocked SKUs (markdown candidates)"
echo '  "overstock_skus": '$(run_sql "SELECT product_id, store_id, department, city, closing_stock_qty, ROUND(days_of_stock,1) AS dos FROM hive_metastore.retail_gold.gold_inventory_health WHERE date_id = (SELECT MAX(date_id) FROM hive_metastore.retail_gold.gold_inventory_health) AND inventory_health_status = 'Overstock' ORDER BY days_of_stock DESC LIMIT 20" | rows)',' >> $OUT

echo "→ recent promos"
echo '  "promos": '$(run_sql "SELECT promo_id, promo_name, promo_type, ROUND(discount_pct,1) AS depth_pct, start_date, end_date FROM hive_metastore.retail_silver.fact_promotions WHERE is_active = true ORDER BY start_date DESC LIMIT 15" | rows)',' >> $OUT

echo "→ festivals"
echo '  "festivals": '$(run_sql "SELECT DISTINCT festival_name FROM hive_metastore.retail_gold.gold_festival_demand WHERE festival_name IS NOT NULL ORDER BY festival_name" | rows)',' >> $OUT

echo "→ ABC classes + store types"
echo '  "abc_classes": '$(run_sql "SELECT DISTINCT abc_class FROM hive_metastore.retail_silver.dim_product WHERE abc_class IS NOT NULL ORDER BY abc_class" | rows)',' >> $OUT
echo '  "store_types": '$(run_sql "SELECT store_type, COUNT(*) AS stores FROM hive_metastore.retail_silver.dim_store WHERE is_active = true GROUP BY store_type ORDER BY stores DESC" | rows)',' >> $OUT

echo "→ rfm segments + churn tiers"
echo '  "rfm_segments": '$(run_sql "SELECT rfm_segment, COUNT(*) AS customers FROM hive_metastore.cx_genome.genome_customer_360 WHERE rfm_segment IS NOT NULL GROUP BY rfm_segment ORDER BY customers DESC" | rows)',' >> $OUT
echo '  "churn_tiers": '$(run_sql "SELECT churn_risk_tier, COUNT(*) AS customers FROM hive_metastore.cx_genome.genome_customer_360 WHERE churn_risk_tier IS NOT NULL GROUP BY churn_risk_tier ORDER BY customers DESC" | rows)',' >> $OUT

echo '  "_end": true' >> $OUT
echo '}' >> $OUT

# Validate JSON
python3 -c "import json; print('✓ valid JSON:', len(json.load(open('$OUT'))), 'top-level keys')"
echo "wrote $OUT ($(wc -l < $OUT) lines)"
