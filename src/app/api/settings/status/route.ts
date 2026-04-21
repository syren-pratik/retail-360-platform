import { NextResponse } from 'next/server';
import { getDataSourceStatus } from '@/app/lib/data-source';

export async function GET() {
  try {
    const status = await getDataSourceStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting data source status:', error);
    return NextResponse.json(
      {
        databricksConfigured: false,
        databricksConnected: false,
        mockAvailable: true,
        active: 'mock' as const,
      },
      { status: 200 }
    );
  }
}
