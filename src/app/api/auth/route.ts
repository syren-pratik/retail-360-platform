import { NextRequest, NextResponse } from 'next/server';

const AUTH_COOKIE = 'rct_auth';
const COOKIE_TOKEN = 'rct-portal-ok-2025';
const PASSWORD = process.env.RCT_PASSWORD ?? 'rct-demo-2025';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const entered = String(body.password ?? '').trim();

  if (entered !== PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, COOKIE_TOKEN, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(AUTH_COOKIE);
  return response;
}
