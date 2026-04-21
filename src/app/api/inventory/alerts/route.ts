import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface AlertRow {
  product_id: string;
  product_name: string;
  store_id: string;
  store_name: string;
  department: string;
  alert_type: string;
  severity: string;
  days_of_stock: string | number;
  current_stock: string | number;
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'cache', 'inventory_alerts.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const parsed: AlertRow[] = JSON.parse(data);

    // Transform to expected format
    const alerts = (parsed ?? []).slice(0, 10).map(item => ({
      type: item.severity === 'critical' ? 'critical' : item.severity === 'high' ? 'warning' : 'info',
      message: `${item.product_name} at ${item.store_name}: ${item.alert_type} (${item.days_of_stock} days of stock)`,
      related_chart: item.alert_type === 'stockout' ? 'stockout-trend' : 'dos-distribution',
    }));

    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Error reading inventory alerts:', error);
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}
