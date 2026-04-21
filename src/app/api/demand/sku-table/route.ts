import { NextResponse } from 'next/server';
import skuData from '../../../../../cache/demand_sku_table.json';

export async function GET() {
  return NextResponse.json(skuData);
}
