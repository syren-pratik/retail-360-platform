import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'cache', 'demand_forecast_vs_actual.json');
    const data = await fs.readFile(filePath, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading forecast data:', error);
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}
