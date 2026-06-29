import { NextResponse } from 'next/server';
import { loadCache } from '@/app/lib/cache-loader';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await loadCache('inventory_sku_table.json');
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading inventory SKU table:', error);
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}
