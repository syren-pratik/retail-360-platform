import { NextResponse } from 'next/server';
import { loadCache } from '@/app/lib/cache-loader';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await loadCache('supply_replenishment.json');
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}
