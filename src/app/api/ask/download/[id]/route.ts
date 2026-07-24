import { NextRequest, NextResponse } from 'next/server';
import { getBlob } from '@/app/lib/blob-store';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const b = getBlob(params.id);
  if (!b) return NextResponse.json({ error: 'File not found' }, { status: 404 });
  return new NextResponse(new Uint8Array(b.buffer), {
    headers: {
      'Content-Type': b.mimeType,
      'Content-Disposition': `attachment; filename="${b.filename}"`,
    },
  });
}
