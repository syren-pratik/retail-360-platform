import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface DOSDeptRow {
  department: string;
  avg_dos: string | number;
  sku_count: string | number;
  stockout_count: string | number;
  stockout_pct: string | number;
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'cache', 'inventory_dos_by_dept.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const parsed: DOSDeptRow[] = JSON.parse(data);

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
