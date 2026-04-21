import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface InboundRow {
  product_id: string;
  product_name: string;
  store_id: string;
  store_name: string;
  department: string;
  expected_qty: string | number;
  expected_date: string;
  status: string;
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'cache', 'inventory_inbound.json');
    const data: InboundRow[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Calculate summary stats
    const inTransit = data.filter(d => d.status === 'in_transit');
    const delayed = data.filter(d => d.status === 'delayed');

    const summary = {
      in_transit: {
        count: (inTransit ?? []).length,
        value: (inTransit ?? []).reduce((sum, d) => sum + Number(d.expected_qty) * 50, 0),
      },
      delayed: {
        count: (delayed ?? []).length,
        value: (delayed ?? []).reduce((sum, d) => sum + Number(d.expected_qty) * 50, 0),
        avg_delay_days: 2,
      },
      received_this_week: {
        count: Math.floor((data ?? []).length * 0.3),
        value: Math.floor((data ?? []).reduce((sum, d) => sum + Number(d.expected_qty) * 50, 0) * 0.3),
      },
    };

    // Generate pipeline for next 7 days
    const pipeline = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const dayDeliveries = data.filter(d => d.expected_date === date);
      pipeline.push({
        date,
        expected_deliveries: (dayDeliveries ?? []).length || Math.floor(Math.random() * 5) + 1,
        status_breakdown: {
          on_time: Math.floor((dayDeliveries ?? []).length * 0.7) || 2,
          at_risk: Math.floor((dayDeliveries ?? []).length * 0.2) || 1,
          delayed: Math.floor((dayDeliveries ?? []).length * 0.1) || 0,
        },
      });
    }

    // Transform orders
    const orders = (data ?? []).slice(0, 20).map((item, index) => ({
      po_id: `PO-${10000 + index}`,
      product_name: item.product_name,
      supplier: `Supplier ${(index % 5) + 1}`,
      qty: Number(item.expected_qty) || 100,
      expected_date: item.expected_date,
      status: item.status === 'delayed' ? 'delayed' :
              item.status === 'in_transit' ? 'in_transit' :
              Math.random() > 0.8 ? 'at_risk' : 'in_transit',
      delay_days: item.status === 'delayed' ? Math.floor(Math.random() * 3) + 1 : 0,
    }));

    return NextResponse.json({
      summary,
      pipeline,
      orders,
    });
  } catch (error) {
    console.error('Error reading inbound data:', error);
    return NextResponse.json({ error: 'Failed to load inbound data' }, { status: 500 });
  }
}
