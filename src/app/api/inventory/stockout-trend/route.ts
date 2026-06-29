import { NextResponse } from 'next/server';
import { loadCache } from '@/app/lib/cache-loader';
interface StockoutRow {
  month: string;
  stockout_count: string | number;
  total_count: string | number;
  stockout_pct: string | number;
}

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data: StockoutRow[]  = await loadCache('inventory_stockout_trend.json');

    // Transform to expected format
    const stockoutTrend = data.map(item => ({
      date: item.month,
      stockout_count: Number(item.stockout_count) || 0,
      lost_sales: Math.round(Number(item.stockout_count) * 150), // Estimated lost sales per stockout
    }));

    return NextResponse.json(stockoutTrend);
  } catch (error) {
    console.error('Error reading stockout trend:', error);
    return NextResponse.json({ error: 'Failed to load stockout trend data' }, { status: 500 });
  }
}
