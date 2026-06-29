import { NextResponse } from 'next/server';
import { loadCache } from '@/app/lib/cache-loader';
interface DOSDeptRow {
  department: string;
  avg_dos: string | number;
  sku_count: string | number;
  stockout_count: string | number;
  stockout_pct: string | number;
}

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const parsed: DOSDeptRow[]  = await loadCache('inventory_dos_by_dept.json');

    // Transform to expected format
    const dosByDept = parsed.map(item => ({
      department: item.department,
      avg_dos: Number(item.avg_dos) || 0,
      target: 14, // Target days of stock
      below_target_pct: Number(item.stockout_pct) || 0,
    }));

    return NextResponse.json(dosByDept);
  } catch (error) {
    console.error('Error reading DOS by department:', error);
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}
