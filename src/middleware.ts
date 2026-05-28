import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const AUTH_COOKIE = 'rct_auth';
export const EXPECTED_TOKEN = 'rct-portal-ok-2025';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow: login page, auth API, Next.js internals, static assets
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (token !== EXPECTED_TOKEN) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
