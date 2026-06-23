import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { StoreOpeningPayload } from '@/app/lib/store-opening-types';

export const dynamic = 'force-dynamic';

let cached: StoreOpeningPayload | null = null;

export async function GET() {
  try {
    if (!cached) {
      const filePath = path.join(process.cwd(), 'cache', 'store_opening.json');
      const raw = await fs.readFile(filePath, 'utf-8');
      cached = JSON.parse(raw) as StoreOpeningPayload;
    }
    return NextResponse.json(cached);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to load store-opening data: ${message}. Run: npm run gen:store-opening` },
      { status: 500 }
    );
  }
}
