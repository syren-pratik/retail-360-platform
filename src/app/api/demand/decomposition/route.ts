import { NextResponse } from 'next/server';
import decompositionData from '../../../../../cache/demand_decomposition.json';

export async function GET() {
  return NextResponse.json(decompositionData);
}
