import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

export const dynamic = 'force-dynamic';

const CACHE_DIR = path.join(process.cwd(), 'cache', 'merch_demand');

let cachedPayload: unknown = null;
let cachedPrecomputed: unknown = null;

async function getPayload() {
  if (cachedPayload && cachedPrecomputed) return { ...cachedPayload as object, precomputed: cachedPrecomputed };

  const [core, precomputed] = await Promise.all([
    fs.readFile(path.join(CACHE_DIR, 'core.json'), 'utf-8').then(JSON.parse),
    fs.readFile(path.join(CACHE_DIR, 'precomputed.json'), 'utf-8').then(JSON.parse),
  ]);

  cachedPayload = core;
  cachedPrecomputed = precomputed;

  return { ...core, weekly_forecast_points: [], precomputed };
}

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
      const filePath = path.join(CACHE_DIR, 'sku_detail', `${skuId}.json`);
      // Path traversal guard: ensure resolved path is inside CACHE_DIR
      const resolved = path.resolve(filePath);
      if (!resolved.startsWith(path.resolve(CACHE_DIR))) {
        return NextResponse.json({ error: 'Invalid sku_id' }, { status: 400 });
      }
      const data = await fs.readFile(resolved, 'utf-8').then(JSON.parse);
      return NextResponse.json(data, { headers: { 'Cache-Control': 'private, max-age=300' } });
    }

    if (type === 'precomputed') {
      const data = await fs.readFile(path.join(CACHE_DIR, 'precomputed.json'), 'utf-8').then(JSON.parse);
      return NextResponse.json(data, { headers: { 'Cache-Control': 'private, max-age=300' } });
    }

    const payload = await getPayload();
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'private, max-age=300' } });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Reset cache on error so next request retries disk read
    cachedPayload = null;
    cachedPrecomputed = null;
    return NextResponse.json(
      { error: 'merch_demand cache not found. Run: npm run gen:merch-demand', detail: message },
      { status: 500 },
    );
  }
}
