import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { MerchDemandFullPayload, MerchDemandPrecomputedDept } from '@/app/lib/merch-demand-types';
import {
  aggregateByDateAndSubcategory,
  aggregateByDateAndTopSKUs,
  getTopSKUsInScope,
} from '@/app/merchandise/demand/lib/forecast-aggregation';

export const dynamic = 'force-dynamic';

// Pre-aggregated slim payload — replaces raw 244 MB with ~1 MB
let cachedSlimPayload: MerchDemandFullPayload | null = null;
let loadingPromise: Promise<MerchDemandFullPayload> | null = null;

async function buildSlimPayload(): Promise<MerchDemandFullPayload> {
  const cacheDir = path.join(process.cwd(), 'cache', 'merch_demand');
  const deptKeys = ['grocery-staples', 'dairy-frozen', 'beverages', 'snacks-biscuits', 'personal-care'];

  // Read core + all department shards in parallel
  const [core, ...dailyShards] = await Promise.all([
    fs.readFile(path.join(cacheDir, 'core.json'), 'utf-8').then(JSON.parse),
    ...deptKeys.map((d) =>
      fs.readFile(path.join(cacheDir, `forecast_daily_${d}.json`), 'utf-8').then(JSON.parse)
    ),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const skuMap: Map<string, any> = new Map(core.skus.map((s: { sku_id: string }) => [s.sku_id, s]));
  const allStoreIds = new Set<string>(core.stores.map((s: { store_id: string }) => s.store_id));

  const precomputed: Record<string, MerchDemandPrecomputedDept> = {};
  const horizons = [7, 14, 28, 60] as const;

  // Pre-aggregate per department + combined 'all'
  const entries: Array<{ key: string; points: unknown[] }> = deptKeys.map((key, i) => ({
    key,
    points: dailyShards[i].points,
  }));
  entries.push({
    key: 'all',
    points: dailyShards.flatMap((s: { points: unknown[] }) => s.points),
  });

  for (const { key, points } of entries) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deptSKUs: any[] = key === 'all'
      ? core.skus
      : core.skus.filter((s: { department: string }) => s.department === key);
    const skuIdSet = new Set<string>(deptSKUs.map((s: { sku_id: string }) => s.sku_id));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pts = points as any[];
    const subcatResult = aggregateByDateAndSubcategory(pts, skuMap, skuIdSet, allStoreIds);
    const topSKUResult = aggregateByDateAndTopSKUs(pts, skuMap, skuIdSet, allStoreIds, 5);

    const sku_tables: Record<number, ReturnType<typeof getTopSKUsInScope>> = {};
    for (const h of horizons) {
      sku_tables[h] = getTopSKUsInScope(pts, skuMap, skuIdSet, allStoreIds, h, 10);
    }

    precomputed[key] = {
      subcat_chart: subcatResult.chartData as Record<string, unknown>[],
      subcategories: subcatResult.subcategories,
      topsku_chart: topSKUResult.chartData as Record<string, unknown>[],
      topsku_ids: topSKUResult.skuIds,
      topsku_names: topSKUResult.skuNames,
      sku_tables,
    };
  }

  return {
    ...core,
    daily_forecast_points: [],   // omitted — use precomputed instead
    weekly_forecast_points: [],  // unused by current UI
    precomputed,
  };
}

function getSlimPayload(): Promise<MerchDemandFullPayload> {
  if (cachedSlimPayload) return Promise.resolve(cachedSlimPayload);
  if (loadingPromise) return loadingPromise;

  loadingPromise = buildSlimPayload().then((p) => {
    cachedSlimPayload = p;
    loadingPromise = null;
    return p;
  });

  return loadingPromise;
}

export async function GET() {
  try {
    const payload = await getSlimPayload();
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'private, max-age=300' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'merch_demand cache not found. Run: npm run gen:merch-demand', detail: message },
      { status: 500 }
    );
  }
}
