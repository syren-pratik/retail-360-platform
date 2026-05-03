import { NextResponse } from 'next/server';
import data from '../../../../../cache/supply_echelon.json';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(data);
}
