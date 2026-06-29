import { NextResponse } from 'next/server';
import { loadCache } from '@/app/lib/cache-loader';
interface StockoutSKURow {
  product_id: string;
  product_name: string;
  department: string;
  abc_class: string;
  stores_affected: string | number;
  stockout_instances: string | number;
}

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data: StockoutSKURow[]  = await loadCache('inventory_stockout_top_skus.json');

    // Transform to expected format
    const stockoutTopSKUs = data.map(item => ({
      product_id: item.product_id,
      product_name: item.product_name,
      department: item.department,
      total_stockout_hours: Number(item.stockout_instances) * 24, // Estimate hours
      events: Number(item.stockout_instances) || 0,
      lost_sales: Math.round(Number(item.stockout_instances) * 200), // Estimated lost sales
      affected_stores: Number(item.stores_affected) || 0,
    }));

    return NextResponse.json(stockoutTopSKUs);
  } catch (error) {
    console.error('Error reading stockout top SKUs:', error);
    return NextResponse.json({ error: 'Failed to load stockout top SKUs data' }, { status: 500 });
  }
}
