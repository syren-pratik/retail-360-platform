import { NextResponse } from 'next/server';
import type { ColdstartPayload } from '@/app/lib/coldstart-types';
import { loadCache } from '@/app/lib/cache-loader';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const payload = await loadCache<ColdstartPayload>('coldstart.json');
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to load coldstart data: ${message}. Run: npm run gen:coldstart-data` },
      { status: 500 }
    );
  }
}
