import { NextResponse } from 'next/server';
import { loadCache } from '@/app/lib/cache-loader';
interface DOSRow {
  dos_bucket: string;
  sku_count: string | number;
  avg_stock: string | number;
}

const BUCKET_COLORS: Record<string, string> = {
  'Stockout (0)': '#EF4444',
  'Critical (<3)': '#F97316',
  'Low (3-7)': '#EAB308',
  'Normal (7-14)': '#22C55E',
  'High (14-30)': '#3B82F6',
  'Overstock (30+)': '#8B5CF6',
};

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const parsed: DOSRow[]  = await loadCache('inventory_dos_distribution.json');

    // Calculate total for percentages
    const total = parsed.reduce((sum, item) => sum + Number(item.sku_count), 0);

    // Transform to expected format
    const dosDistribution = parsed.map(item => {
      const count = Number(item.sku_count) || 0;
      const avgStock = Number(item.avg_stock) || 0;

      return {
        bucket: item.dos_bucket,
        count,
        pct: total > 0 ? Math.round((count / total) * 100 * 10) / 10 : 0,
        value_at_risk: Math.round(avgStock * count * 0.01), // Placeholder calculation
        color: BUCKET_COLORS[item.dos_bucket] || '#6B7280',
      };
    });

    return NextResponse.json(dosDistribution);
  } catch (error) {
    console.error('Error reading DOS distribution:', error);
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}
