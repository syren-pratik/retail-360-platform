import { NextResponse } from 'next/server';
import { loadCache, getTenantFromCookie } from '@/app/lib/cache-loader';
import * as fs from 'fs/promises';
import * as path from 'path';

export const dynamic = 'force-dynamic';

// PRD-000001 to PRD-999999 (grocery) OR APR-XX-NNNN (apparel) — allow both.
function isValidSkuId(id: string): boolean {
  return /^PRD-\d{6}$/.test(id) || /^APR-[A-Z]+-\d{4}$/.test(id);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const tenant = getTenantFromCookie();

  try {
    if (type === 'sku') {
      const skuId = searchParams.get('sku_id') ?? '';
      if (!isValidSkuId(skuId)) {
        return NextResponse.json({ error: 'Invalid sku_id' }, { status: 400 });
      }
      // sku_detail shards live in nested directories — resolve tenant-aware path manually
      const root =
        tenant === 'us_apparel'
          ? path.join(process.cwd(), 'cache', 'apparel', 'price_intel', 'sku_detail')
          : path.join(process.cwd(), 'cache', 'price_intel', 'sku_detail');
      const filePath = path.join(root, `${skuId}.json`);
      const resolved = path.resolve(filePath);
      if (!resolved.startsWith(path.resolve(root))) {
        return NextResponse.json({ error: 'Invalid sku_id' }, { status: 400 });
      }
      try {
        const data = await fs.readFile(resolved, 'utf-8').then(JSON.parse);
        return NextResponse.json(data, { headers: { 'Cache-Control': 'private, max-age=300' } });
      } catch {
        // try grocery fallback if apparel shard missing
        if (tenant === 'us_apparel') {
          try {
            const fallback = path.join(
              process.cwd(),
              'cache',
              'price_intel',
              'sku_detail',
              `${skuId}.json`,
            );
            const data = await fs.readFile(fallback, 'utf-8').then(JSON.parse);
            return NextResponse.json(data, { headers: { 'Cache-Control': 'private, max-age=300' } });
          } catch {
            // fall through
          }
        }
        return NextResponse.json(
          { error: 'SKU detail not available', sku_id: skuId },
          { status: 404 },
        );
      }
    }

    if (type === 'precomputed') {
      const data = await loadCache('price_intel/precomputed.json');
      return NextResponse.json(data, { headers: { 'Cache-Control': 'private, max-age=300' } });
    }

    const data = await loadCache('price_intel/core.json');
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'price_intel cache not found. Run: npm run gen:price-intel', detail: message },
      { status: 500 },
    );
  }
}
