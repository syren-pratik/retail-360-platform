import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

export const dynamic = 'force-dynamic';

const CACHE_DIR = path.join(process.cwd(), 'cache', 'price_intel');

let cachedCore: unknown = null;
let cachedPrecomputed: unknown = null;

// PRD-000001 to PRD-999999
function isValidSkuId(id: string): boolean {
  return /^PRD-\d{6}$/.test(id);
}

async function getCore() {
  if (cachedCore) return cachedCore;
  cachedCore = await fs.readFile(path.join(CACHE_DIR, 'core.json'), 'utf-8').then(JSON.parse);
  return cachedCore;
}

async function getPrecomputed() {
  if (cachedPrecomputed) return cachedPrecomputed;
  cachedPrecomputed = await fs
    .readFile(path.join(CACHE_DIR, 'precomputed.json'), 'utf-8')
    .then(JSON.parse);
  return cachedPrecomputed;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');

  try {
    if (type === 'sku') {
      const skuId = searchParams.get('sku_id') ?? '';
      if (!isValidSkuId(skuId)) {
        return NextResponse.json({ error: 'Invalid sku_id — must match PRD-XXXXXX' }, { status: 400 });
      }
      const filePath = path.join(CACHE_DIR, 'sku_detail', `${skuId}.json`);
      const resolved = path.resolve(filePath);
      if (!resolved.startsWith(path.resolve(CACHE_DIR))) {
        return NextResponse.json({ error: 'Invalid sku_id' }, { status: 400 });
      }
      try {
        const data = await fs.readFile(resolved, 'utf-8').then(JSON.parse);
        return NextResponse.json(data, { headers: { 'Cache-Control': 'private, max-age=300' } });
      } catch {
        // SKU detail file doesn't exist yet — return 404 instead of 500
        return NextResponse.json(
          { error: 'SKU detail not available', sku_id: skuId },
          { status: 404 },
        );
      }
    }

    if (type === 'precomputed') {
      const data = await getPrecomputed();
      return NextResponse.json(data, { headers: { 'Cache-Control': 'private, max-age=300' } });
    }

    const data = await getCore();
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    cachedCore = null;
    cachedPrecomputed = null;
    return NextResponse.json(
      { error: 'price_intel cache not found. Run: npm run gen:price-intel', detail: message },
      { status: 500 },
    );
  }
}
