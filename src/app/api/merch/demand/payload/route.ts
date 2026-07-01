import { NextResponse } from 'next/server';
import { loadCache } from '@/app/lib/cache-loader';

export const dynamic = 'force-dynamic';

// Safe SKU ID: only alphanumeric, hyphens, underscores, max 32 chars
function isValidSkuId(id: string): boolean {
  return /^[A-Za-z0-9_-]{1,32}$/.test(id);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');

  try {
    if (type === 'sku') {
      const skuId = searchParams.get('sku_id') ?? '';
      if (!isValidSkuId(skuId)) {
        return NextResponse.json({ error: 'Invalid sku_id' }, { status: 400 });
      }
      const data = await loadCache(`merch_demand/sku_detail/${skuId}.json`);
      return NextResponse.json(data, { headers: { 'Cache-Control': 'private, max-age=300' } });
    }

    if (type === 'precomputed') {
      const data = await loadCache('merch_demand/precomputed.json');
      return NextResponse.json(data, { headers: { 'Cache-Control': 'private, max-age=300' } });
    }

    const [core, precomputed] = await Promise.all([
      loadCache<Record<string, unknown>>('merch_demand/core.json'),
      loadCache('merch_demand/precomputed.json'),
    ]);
    return NextResponse.json(
      { ...core, weekly_forecast_points: [], precomputed },
      { headers: { 'Cache-Control': 'private, max-age=300' } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'merch_demand cache not found. Run: npm run gen:merch-demand', detail: message },
      { status: 500 },
    );
  }
}
