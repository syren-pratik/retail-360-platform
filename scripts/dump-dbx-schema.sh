#!/bin/bash
# Full DESCRIBE TABLE for every table in the 4 retail schemas.
# Output: /tmp/dbx-full-schema.json keyed by table fqn → list of {name, type}
# Used by the cross-reference audit (Phase 2) to check chart→Databricks coverage.

set -e
TOKEN="${DATABRICKS_TOKEN:-dapif6aee73c5ce869da5ef1298f36efd23a-3}"
HOST="https://adb-3361736940380124.4.azuredatabricks.net"
WH="7f3dbb95180a6095"

run_sql() {
  curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "$(jq -nc --arg s "$1" --arg wh "$WH" '{warehouse_id:$wh, statement:$s, wait_timeout:"30s", disposition:"INLINE", format:"JSON_ARRAY"}')" \
    "$HOST/api/2.0/sql/statements"
}

OUT=/tmp/dbx-full-schema.json
echo '{' > $OUT
first=1
for schema in retail_gold retail_silver retail_ml cx_genome; do
  echo "→ $schema"
  TBLS=$(run_sql "SHOW TABLES IN hive_metastore.$schema" | python3 -c "
import json,sys
r=json.load(sys.stdin); rows=r.get('result',{}).get('data_array') or []
print(' '.join(x[1] for x in rows))")
  for tbl in $TBLS; do
    fqn="hive_metastore.$schema.$tbl"
    cols=$(run_sql "DESCRIBE TABLE $fqn" 2>/dev/null | python3 -c "
import json,sys
try:
  r=json.load(sys.stdin); rows=r.get('result',{}).get('data_array') or []
  cols=[{'n':x[0],'t':x[1]} for x in rows if x[0] and not x[0].startswith('#')]
  print(json.dumps(cols))
except: print('[]')")
    cnt=$(run_sql "SELECT COUNT(*) FROM $fqn" 2>/dev/null | python3 -c "
import json,sys
try:
  r=json.load(sys.stdin); rows=r.get('result',{}).get('data_array') or []
  print(rows[0][0] if rows else 0)
except: print(0)")
    if [ "$first" -eq 0 ]; then echo ',' >> $OUT; fi
    first=0
    printf '  "%s": {"rows": %s, "cols": %s}' "$fqn" "$cnt" "$cols" >> $OUT
  done
done
echo >> $OUT
echo '}' >> $OUT

python3 -c "
import json
d=json.load(open('$OUT'))
print(f'tables: {len(d)}')
print(f'total cols: {sum(len(v[\"cols\"]) for v in d.values())}')
"
