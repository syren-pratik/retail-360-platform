import { NextResponse } from 'next/server';
import featureData from '../../../../../cache/demand_feature_importance.json';

export async function GET() {
  return NextResponse.json(featureData);
}
