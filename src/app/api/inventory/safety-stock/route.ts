import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface SafetyStockRow {
  department: string;
  abc_class: string;
  sku_count: string | number;
  avg_dos: string | number;
  avg_stock: string | number;
  above_safety: string | number;
  below_safety: string | number;
  coverage_pct: string | number;
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'cache', 'inventory_safety_stock.json');
    const data: SafetyStockRow[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Group by department
    const deptMap = new Map<string, { coverage_pct: number; gap_skus: number; count: number }>();
    const abcMap = new Map<string, { coverage_pct: number; gap_skus: number; count: number }>();

    for (const row of data) {
      const dept = row.department;
      const abc = row.abc_class;
      const coverage = Number(row.coverage_pct) || 0;
      const gap = Number(row.below_safety) || 0;

      // Aggregate by department
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { coverage_pct: 0, gap_skus: 0, count: 0 });
      }
      const deptData = deptMap.get(dept)!;
      deptData.coverage_pct += coverage;
      deptData.gap_skus += gap;
      deptData.count += 1;

      // Aggregate by ABC class
      if (!abcMap.has(abc)) {
        abcMap.set(abc, { coverage_pct: 0, gap_skus: 0, count: 0 });
      }
      const abcData = abcMap.get(abc)!;
      abcData.coverage_pct += coverage;
      abcData.gap_skus += gap;
      abcData.count += 1;
    }

    const by_department = Array.from(deptMap.entries()).map(([department, d]) => ({
      department,
      coverage_pct: Math.round(d.coverage_pct / d.count),
      target: 95,
      gap_skus: d.gap_skus,
    }));

    const by_abc = Array.from(abcMap.entries()).map(([abc_class, d]) => ({
      abc_class,
      coverage_pct: Math.round(d.coverage_pct / d.count),
      target: abc_class === 'A' ? 98 : abc_class === 'B' ? 95 : 90,
      gap_skus: d.gap_skus,
    }));

    // Generate under_stocked items from replenishment data
    const replenishmentPath = path.join(process.cwd(), 'cache', 'inventory_replenishment.json');
    let under_stocked: Array<{
      product_id: string;
      product_name: string;
      store: string;
      current: number;
      safety: number;
      gap: number;
      urgency: string;
    }> = [];

    try {
      const repData = JSON.parse(fs.readFileSync(replenishmentPath, 'utf-8'));
      under_stocked = (repData ?? []).slice(0, 20).map((item: {
        product_id: string;
        product_name: string;
        store_name: string;
        current_stock: string | number;
        days_of_stock: string | number;
        priority: string;
      }) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        store: item.store_name,
        current: Number(item.current_stock) || 0,
        safety: 7, // Safety stock target in days
        gap: 7 - (Number(item.days_of_stock) || 0),
        urgency: item.priority,
      }));
    } catch {
      // Use empty array if replenishment data not available
    }

    return NextResponse.json({
      by_department,
      by_abc,
      under_stocked,
    });
  } catch (error) {
    console.error('Error reading safety stock:', error);
    return NextResponse.json({ error: 'Failed to load safety stock data' }, { status: 500 });
  }
}
