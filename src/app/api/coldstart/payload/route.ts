import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { ColdstartPayload } from '@/app/lib/coldstart-types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'cache', 'coldstart.json');
    const raw = await fs.readFile(filePath, 'utf-8');
    const payload: ColdstartPayload = JSON.parse(raw);
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to load coldstart data: ${message}. Run: npm run gen:coldstart-data` },
      { status: 500 }
    );
  }
}
