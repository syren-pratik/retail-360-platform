import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('id');
    const filePath = path.join(process.cwd(), 'cache', 'supply_supplier_profiles.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const profiles = JSON.parse(data);
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
