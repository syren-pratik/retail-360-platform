import { NextResponse } from 'next/server';
import heatmapData from '../../../../../cache/demand_hourly_heatmap.json';

export async function GET() {
  return NextResponse.json(heatmapData);
}
