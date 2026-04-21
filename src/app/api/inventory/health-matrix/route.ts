import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface HealthRow {
  product_id: string;
  product_name: string;
  department: string;
  city: string;
  store_type: string;
  abc_class: string;
  current_stock: string | number;
  days_of_stock: string | number;
  status: string;
  is_stockout: boolean;
  is_perishable: boolean;
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'cache', 'inventory_health_matrix.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const parsed: HealthRow[] = JSON.parse(data);

    // Transform to expected format
    const healthMatrix = parsed.map(item => {
      const dos = Number(item.days_of_stock) || 0;
      const stock = Number(item.current_stock) || 0;
      let status: string;

      if (item.is_stockout || stock === 0) {
        status = 'stockout';
      } else if (dos < 3) {
        status = 'critical';
      } else if (dos < 7) {
        status = 'low';
      } else if (dos > 30) {
        status = 'overstock';
      } else {
        status = 'healthy';
      }

      return {
        product_id: item.product_id,
        product_name: item.product_name,
        store_id: item.city, // Using city as store identifier
        store_name: item.city,
        department: item.department,
        category: item.department, // Using department as category
        abc_class: item.abc_class || 'C',
        current_stock: stock,
        avg_daily_demand: Math.round(stock / Math.max(dos, 1)),
        days_of_supply: dos,
        inventory_value: stock * 100, // Placeholder
        status,
        stockout_flag: item.is_stockout || stock === 0,
        overstock_flag: dos > 30,
      };
    });

    return NextResponse.json(healthMatrix);
  } catch (error) {
    console.error('Error reading inventory health matrix:', error);
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}
