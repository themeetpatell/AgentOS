import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/runs', '/briefs', '/brand', '/guardrails'];
const FIREBASE_SESSION_COOKIE = '__session';

/**
 * Lightweight gate: redirect to /login if no Firebase session cookie is present.
 * The cookie value is verified server-side by the API (Firebase Admin) in Sprint 1.
 * Middleware does not verify the token here because Firebase Admin is not
 * available in the Edge runtime; intentional, matches Next 15 guidance.
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const requiresAuth = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (!requiresAuth) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(FIREBASE_SESSION_COOKIE);
  if (!sessionCookie?.value) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/runs/:path*',
    '/briefs/:path*',
    '/brand/:path*',
    '/guardrails/:path*',
  ],
};
