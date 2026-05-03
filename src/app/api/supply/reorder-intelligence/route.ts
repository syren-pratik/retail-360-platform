import { NextResponse } from 'next/server';
import data from '../../../../../cache/supply_reorder_intelligence.json';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(data);
}
