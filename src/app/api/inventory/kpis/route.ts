import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Generate mock sparkline data
function generateSparkline(baseValue: number, count: number = 7): number[] {
  return Array.from({ length: count }, () =>
    baseValue * (0.9 + Math.random() * 0.2)
  );
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'cache', 'inventory_kpis.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(data);
    // Return the first item if array, or the object itself
    const kpis = Array.isArray(parsed) ? parsed[0] : parsed;

    const avgDos = Number(kpis.avg_dos) || 21.5;
    const stockoutPct = Number(kpis.stockout_pct) || 0;
    const fillRate = 100 - stockoutPct;
    const osa = 100 - stockoutPct; // On-Shelf Availability
    const inventoryValue = (Number(kpis.total_stock_qty) || 0) * 50; // Estimated value
    const lostSales = Math.round(stockoutPct * 10000); // Estimated lost sales

    // Transform to expected format with nested KPIData structure
    return NextResponse.json({
      osa: {
        value: osa,
        prior: osa - 0.5,
        unit: '%',
        label: 'On-Shelf Availability',
        direction: 'higher_better',
      },
      stockout_rate: {
        value: stockoutPct,
        prior: stockoutPct + 0.2,
        unit: '%',
        label: 'Stockout Rate',
        direction: 'lower_better',
      },
      avg_dos: {
        value: avgDos,
        prior: avgDos - 1.2,
        unit: 'days',
        label: 'Avg Days of Stock',
        direction: 'target_range',
        target: [14, 21],
      },
      fill_rate: {
        value: fillRate,
        prior: fillRate - 0.3,
        unit: '%',
        label: 'Fill Rate',
        direction: 'higher_better',
      },
      inventory_value: {
        value: inventoryValue,
        prior: inventoryValue * 0.95,
        unit: '₹',
        label: 'Inventory Value',
        direction: 'target_range',
      },
      lost_sales: {
        value: lostSales,
        prior: lostSales * 1.1,
        unit: '₹',
        label: 'Lost Sales',
        direction: 'lower_better',
      },
      sparklines: {
        osa: generateSparkline(osa),
        stockout_rate: generateSparkline(stockoutPct),
        avg_dos: generateSparkline(avgDos),
        fill_rate: generateSparkline(fillRate),
        inventory_value: generateSparkline(inventoryValue),
        lost_sales: generateSparkline(lostSales),
      },
    });
  } catch (error) {
    console.error('Error reading inventory KPIs:', error);
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}
