import { NextResponse } from 'next/server';
import monthlyCatGeoData from '../../../../../cache/demand_monthly_cat_geo.json';

export async function GET() {
  return NextResponse.json(monthlyCatGeoData);
}
