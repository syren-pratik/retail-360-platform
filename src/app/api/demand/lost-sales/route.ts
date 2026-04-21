import { NextResponse } from 'next/server';
import lostSalesData from '../../../../../cache/demand_lost_sales.json';

// Generate lost sales trend data
function generateLostSalesTrend() {
  const data = [];
  const now = new Date();

  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Generate realistic fulfilled/lost ratio
    const baseFulfilled = 800000 + Math.random() * 200000;
    const baseLost = 50000 + Math.random() * 30000;

    // Add weekend spike
    const dayOfWeek = date.getDay();
    const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 1.3 : 1;

    data.push({
      date: date.toISOString().split('T')[0],
      fulfilled: Math.round(baseFulfilled * weekendMultiplier),
      lost: Math.round(baseLost * weekendMultiplier),
    });
  }

  return data;
}

export async function GET() {
  return NextResponse.json({
    top_skus: lostSalesData,
    trend: generateLostSalesTrend(),
  });
}
