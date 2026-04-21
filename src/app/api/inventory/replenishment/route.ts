import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface ReplenishmentRow {
  product_id: string;
  product_name: string;
  store_id: string;
  store_name: string;
  department: string;
  abc_class: string;
  current_stock: string | number;
  days_of_stock: string | number;
  priority: string;
  is_perishable: boolean;
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'cache', 'inventory_replenishment.json');
    const data: ReplenishmentRow[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Transform to expected format
    const replenishment = data.map((item, index) => {
      const currentStock = Number(item.current_stock) || 0;
      const dos = Number(item.days_of_stock) || 0;
      const reorderPoint = 7; // Days of stock target
      const suggestedQty = Math.max(0, Math.round((reorderPoint - dos) * (currentStock / Math.max(dos, 1)) * 1.5));

      return {
        product_id: item.product_id,
        product_name: item.product_name,
        store_id: item.store_id,
        store_name: item.store_name,
        department: item.department,
        current_stock: currentStock,
        reorder_point: reorderPoint,
        days_to_stockout: Math.max(0, Math.round(dos)),
        suggested_qty: suggestedQty || 100,
        suggested_date: new Date(Date.now() + (index % 7 + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        supplier: `Supplier ${(index % 5) + 1}`,
        lead_time_days: (index % 5) + 2,
        estimated_cost: Math.round(suggestedQty * 50) || 5000,
        urgency: item.priority as 'Critical' | 'High' | 'Medium' | 'Low',
        status: 'pending' as const,
      };
    });

    return NextResponse.json(replenishment);
  } catch (error) {
    console.error('Error reading replenishment data:', error);
    return NextResponse.json({ error: 'Failed to load replenishment data' }, { status: 500 });
  }
}
