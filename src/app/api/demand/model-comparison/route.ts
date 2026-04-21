import { NextResponse } from 'next/server';
import modelData from '../../../../../cache/demand_model_comparison.json';

export async function GET() {
  return NextResponse.json(modelData);
}
