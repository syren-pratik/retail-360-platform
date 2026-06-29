import { NextResponse } from 'next/server';
import { loadCache } from '@/app/lib/cache-loader';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('id');
    const profiles = (await loadCache('supply_supplier_profiles.json')) as Record<string, unknown>;
    if (supplierId) {
      const profile = profiles[supplierId];
      if (!profile) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
      return NextResponse.json(profile);
    }
    return NextResponse.json(profiles);
  } catch {
    return NextResponse.json({ error: 'Failed to load supplier data' }, { status: 500 });
  }
}
