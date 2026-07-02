import { NextResponse } from 'next/server';
import type { StoreOpeningPayload } from '@/app/lib/store-opening-types';
import { loadCache } from '@/app/lib/cache-loader';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const payload = await loadCache<StoreOpeningPayload>('store_opening.json');
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to load store-opening data: ${message}. Run: npm run gen:store-opening` },
      { status: 500 }
    );
  }
}
