/**
 * Schema parity linter for the apparel cache mirror.
 *
 * For every cache/cx360_*.json that exists, compare its shape against the
 * matching cache/apparel/cx360_*.json. Apparel mirror must:
 *   - have all the same fields (no missing)
 *   - have the same types (no string → number etc.)
 *   - only add fields that appear on the APPAREL_ADDITIVE_WHITELIST
 *
 * Exit 0 if every file checks out, 1 otherwise (so this works as a CI gate).
 *
 * Usage:  npm run lint:apparel-schema
 */

import { promises as fsp } from 'fs';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const GROCERY_DIR = path.join(REPO_ROOT, 'cache');
const APPAREL_DIR = path.join(GROCERY_DIR, 'apparel');

/**
 * Fields that are PERMITTED on apparel files but absent from grocery.
 * Add to this list when introducing a new apparel-only dimension.
 */
const APPAREL_ADDITIVE_WHITELIST = new Set<string>([
  'top_brand',
  'top_brands',
  'return_rate_pct',
  'return_reason',
  'brand_affinity_score',
  'fit_preference',
  'size_preference',
  'color_preference',
  'last_return_reason',
  'lifetime_returns_count',
  'lifetime_returns_value',
  'brand_loyalty_index',
  'apparel_segment',
  'days_since_signup',
  // KPI sparkline/prior fields (added by transformer; pre-baked in apparel cache for parity)
  'total_customers_prior', 'total_customers_trend',
  'avg_clv_prior', 'avg_clv_trend',
  'churn_rate_pct_prior', 'churn_rate_pct_trend',
  'active_rate_pct_prior', 'active_rate_pct_trend',
  // Apparel segment names (used as object keys in by_segment / drill_down / matrix.categories)
  'Fashion Forward', 'Athletic Enthusiast', 'Value Shopper', 'Brand Loyalist',
  'Returner', 'Lapsed', 'Casual', 'New',
  // Apparel L1 category names (used as object keys in first_purchase_category / category_by_basket / matrix.categories)
  'Tops', 'Bottoms', 'Outerwear', 'Footwear', 'Accessories', 'Dresses', 'Athletic',
  // Apparel channel names
  'Curbside', 'Marketplace',
  // Apparel month labels (used as keys in curve_shapes)
  'Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025', 'Jun 2025',
  'Jul 2025', 'Aug 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025',
  'Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026',
  // Apparel inventory + supply additive fields (Phase C)
  'style_id', 'color', 'size', 'size_range', 'size_curve', 'size_set',
  'style_state', 'style_name',
  'season_tag', 'seasonal_carryover_value', 'season_carryover_pct', 'season_carryover_cr', 'season_carryover_usd_k',
  'lifecycle_stage', 'velocity_class_d',
  'color_performance',
  'branded_share_pct', 'aged_pct', 'aged_flag', 'aged_value_usd_m',
  'markdown_step', 'markdown_pressure_pct', 'recommended_markdown_step',
  'size_curve_completeness_pct',
  'style_osa_pct', 'size_color_osa_pct', 'avg_delay_weeks', 'dos_by_lifecycle',
  'return_rate',
  'fabric_shortage_pct', 'port_congestion_pct', 'production_capacity_pct',
  'qc_fail_pct', 'customs_hold_pct', 'sample_approval_pct',
  'supplier_type', 'country_of_origin',
  'container_count', 'port_of_origin', 'customs_status', 'pre_ticketed_pallets',
  'event_window_missed', 'event_band', 'event_lift', 'enables_event',
  'container_utilization',
  'substitution_tier', 'fit_compatibility_score',
  'supplier_moq', 'moq_binds',
  'store_format', 'lost_revenue_90d_usd_k',
  'weeks_on_floor', 'sell_through_pct', 'retail_price_usd',
  'lead_time_weeks',
  'current_markdown_pct', 'next_markdown_date', 'revenue_recovery_usd_k',
  // Apparel price-intel additive fields (Phase C)
  'ragm_current', 'markdown_active_styles',
  'ragm_pct', 'ragm_vs_floor', 'markdown_pressure_pct',
  'returns_margin_loss_usd',
  'size_color_dim',
  'competitor_top3', 'competitive_index', 'size_breadth', 'color_breadth',
  'event_anchor', 'markdown_overlap_flag',
  'current_markdown_step', 'recommended_markdown_step',
  'days_in_step', 'is_stuck',
  'season_carryover_usd', 'conversion_pct',
  'ragm_forecast_usd',
  'avg_current_ragm', 'avg_projected_ragm', 'cadence_compliance_pct',
  'cadence_compliance_pct', 'stuck_styles', 'by_cadence_step',
  'top_competitor', 'vs_top_competitor_pct',
  'ragm_impact',
  'avg_ragm',
  'current_ragm', 'projected_ragm',
  'mechanic_id',
  'mechanic',
  // sku_detail shard additive
  'promo_mechanic', 'markdown_step',
  'competitive_positioning', 'recent_promo_history', 'size_color_breakdown',
  'brand',
  // Phase E price-intel additive
  'markdown_cadence_ladder', 'size_color_price_grid', 'brand_vs_pl_gap', 'returns_margin_overlay',
  'step', 'units_remaining', 'units_sold_in_step', 'target_days_in_step', 'actual_days_in_step',
  'revenue_usd', 'sizes', 'colors', 'cells', 'price_usd', 'units_sold',
  'brand_margin_pct', 'pl_margin_pct', 'margin_gap_pp', 'brand_revenue_usd', 'pl_revenue_usd',
  'pl_penetration_pct', 'returns_rate_pct', 'returns_cost_pct', 'by_department',
]);

/**
 * Object paths under which grocery uses a closed set of value-as-keys (segment names,
 * category names, month names) that are guaranteed to differ in apparel. Skip the
 * key-set comparison entirely under these prefixes and only check that the value
 * shapes match.
 */
const KEY_AGNOSTIC_PREFIXES = [
  '.by_segment',
  '.first_purchase_category',
  '.curve_shapes',
  '.drill_down',
  '.matrix[0].categories',
  '.category_by_basket',
  '.by_channel',
  '.segment_diagnostics',
  // price_intel/precomputed.json — top-level `departments` is keyed by L1 dept names
  // which legitimately differ between grocery and apparel tenants.
  '.departments',
];

/**
 * Files whose root object is keyed by an entity id whose set legitimately
 * differs between tenants (e.g. supplier_profiles keyed by SUP-001..SUP-012
 * in grocery and SUP-A001..SUP-A030 in apparel). For these files, the linter
 * skips root-level key-set comparison and just samples the first value's shape.
 */
const ROOT_KEY_AGNOSTIC_FILES = new Set<string>([
  'supply_supplier_profiles.json',
]);

type ValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'array'
  | 'object'
  | 'undefined';

function typeOf(v: unknown): ValueType {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v as ValueType;
}

interface Diff {
  path: string;
  kind: 'missing_in_apparel' | 'extra_in_apparel' | 'type_mismatch';
  detail: string;
}

function compareShapes(grocery: unknown, apparel: unknown, prefix = '', rootKeyAgnostic = false): Diff[] {
  const diffs: Diff[] = [];
  const gt = typeOf(grocery);
  const at = typeOf(apparel);

  if (gt !== at) {
    // null-vs-actual is fine — grocery may have null in a slot apparel populates
    if (!(gt === 'null' || at === 'null')) {
      diffs.push({
        path: prefix || '<root>',
        kind: 'type_mismatch',
        detail: `grocery=${gt} apparel=${at}`,
      });
      return diffs;
    }
  }

  if (gt === 'array' && at === 'array') {
    // Compare the first row of each as the structural sample
    const g = grocery as unknown[];
    const a = apparel as unknown[];
    if (g.length > 0 && a.length > 0) {
      diffs.push(...compareShapes(g[0], a[0], `${prefix}[0]`, false));
    }
    return diffs;
  }

  if (gt === 'object' && at === 'object') {
    const g = grocery as Record<string, unknown>;
    const a = apparel as Record<string, unknown>;
    const gKeys = new Set(Object.keys(g));
    const aKeys = new Set(Object.keys(a));

    // If this object lives under a key-agnostic prefix (segment/category/month keys
    // that legitimately differ between tenants), only validate value shape parity
    // by sampling the first value of each side, not the key set.
    const keyAgnostic =
      (rootKeyAgnostic && prefix === '') ||
      KEY_AGNOSTIC_PREFIXES.some(
        (p) => prefix === p || prefix.startsWith(p + '.') || prefix.startsWith(p + '['),
      );
    if (keyAgnostic) {
      const gv = Array.from(gKeys)[0];
      const av = Array.from(aKeys)[0];
      if (gv !== undefined && av !== undefined) {
        diffs.push(...compareShapes(g[gv], a[av], `${prefix}.<key>`, false));
      }
      return diffs;
    }

    for (const k of Array.from(gKeys)) {
      if (!aKeys.has(k)) {
        diffs.push({
          path: `${prefix}.${k}`,
          kind: 'missing_in_apparel',
          detail: `grocery has "${k}" of type ${typeOf(g[k])}`,
        });
      } else {
        diffs.push(...compareShapes(g[k], a[k], `${prefix}.${k}`, false));
      }
    }
    for (const k of Array.from(aKeys)) {
      if (!gKeys.has(k) && !APPAREL_ADDITIVE_WHITELIST.has(k)) {
        diffs.push({
          path: `${prefix}.${k}`,
          kind: 'extra_in_apparel',
          detail: `apparel has "${k}" of type ${typeOf(a[k])} — not in grocery, not in whitelist`,
        });
      }
    }
  }

  return diffs;
}

async function main() {
  let apparelExists = false;
  try {
    await fsp.access(APPAREL_DIR);
    apparelExists = true;
  } catch {
    console.log(`✓ apparel mirror not generated yet (${APPAREL_DIR}) — nothing to lint`);
    return;
  }
  if (!apparelExists) return;

  const groceryFiles = (await fsp.readdir(GROCERY_DIR)).filter(
    (f) =>
      (f.startsWith('cx360_') ||
        f.startsWith('inventory_') ||
        f.startsWith('supply_') ||
        f.startsWith('price_')) &&
      f.endsWith('.json'),
  );

  let totalDiffs = 0;
  let filesChecked = 0;
  let filesMissing = 0;

  for (const filename of groceryFiles) {
    const apparelPath = path.join(APPAREL_DIR, filename);
    try {
      await fsp.access(apparelPath);
    } catch {
      filesMissing++;
      console.log(`⚠ ${filename} — apparel mirror not generated yet`);
      continue;
    }
    filesChecked++;
    const grocery = JSON.parse(await fsp.readFile(path.join(GROCERY_DIR, filename), 'utf-8'));
    const apparel = JSON.parse(await fsp.readFile(apparelPath, 'utf-8'));
    const diffs = compareShapes(grocery, apparel, '', ROOT_KEY_AGNOSTIC_FILES.has(filename));
    if (diffs.length === 0) {
      console.log(`✓ ${filename}`);
    } else {
      totalDiffs += diffs.length;
      console.log(`✗ ${filename} (${diffs.length} issue${diffs.length === 1 ? '' : 's'})`);
      for (const d of diffs.slice(0, 10)) {
        console.log(`    ${d.kind}: ${d.path} — ${d.detail}`);
      }
      if (diffs.length > 10) console.log(`    … +${diffs.length - 10} more`);
    }
  }

  // Nested price_intel files
  const nested = [
    'price_intel/core.json',
    'price_intel/precomputed.json',
    'price_intel/insights.json',
  ];
  for (const rel of nested) {
    const apparelPath = path.join(APPAREL_DIR, rel);
    const groceryPath = path.join(GROCERY_DIR, rel);
    try {
      await fsp.access(apparelPath);
      await fsp.access(groceryPath);
    } catch {
      filesMissing++;
      console.log(`⚠ ${rel} — not generated yet`);
      continue;
    }
    filesChecked++;
    const grocery = JSON.parse(await fsp.readFile(groceryPath, 'utf-8'));
    const apparel = JSON.parse(await fsp.readFile(apparelPath, 'utf-8'));
    const diffs = compareShapes(grocery, apparel);
    if (diffs.length === 0) {
      console.log(`✓ ${rel}`);
    } else {
      totalDiffs += diffs.length;
      console.log(`✗ ${rel} (${diffs.length} issue${diffs.length === 1 ? '' : 's'})`);
      for (const d of diffs.slice(0, 10)) {
        console.log(`    ${d.kind}: ${d.path} — ${d.detail}`);
      }
      if (diffs.length > 10) console.log(`    … +${diffs.length - 10} more`);
    }
  }

  // Sample first 10 sku_detail shards against grocery shard
  try {
    const grocShard = JSON.parse(
      await fsp.readFile(path.join(GROCERY_DIR, 'price_intel', 'sku_detail', 'PRD-000001.json'), 'utf-8'),
    );
    const shardDir = path.join(APPAREL_DIR, 'price_intel', 'sku_detail');
    const apparelShards = (await fsp.readdir(shardDir)).filter((f) => f.endsWith('.json')).slice(0, 10);
    let shardDiffs = 0;
    for (const f of apparelShards) {
      const apparel = JSON.parse(await fsp.readFile(path.join(shardDir, f), 'utf-8'));
      const diffs = compareShapes(grocShard, apparel);
      if (diffs.length > 0) {
        shardDiffs += diffs.length;
        console.log(`✗ price_intel/sku_detail/${f} (${diffs.length} issues)`);
        for (const d of diffs.slice(0, 5)) {
          console.log(`    ${d.kind}: ${d.path} — ${d.detail}`);
        }
      }
    }
    if (shardDiffs === 0) {
      console.log(`✓ price_intel/sku_detail/*.json (sampled ${apparelShards.length})`);
      filesChecked += apparelShards.length;
    } else {
      totalDiffs += shardDiffs;
    }
  } catch {
    console.log(`⚠ price_intel/sku_detail — not generated yet`);
  }

  console.log('');
  console.log(`Summary: ${filesChecked} checked · ${filesMissing} missing · ${totalDiffs} diffs`);
  if (totalDiffs > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
