import { NextRequest, NextResponse } from 'next/server';

/**
 * Route protection middleware.
 * We rely on the presence of the access token stored as a cookie mirror
 * (set by the client-side AuthProvider) for route-level checks.
 *
 * Note: Because tokens are stored in localStorage (client-side only) we
 * use a lightweight cookie flag (`veriq_authed`) that the AuthProvider
 * sets/clears so the middleware can do server-side redirects without
 * exposing the real JWT in a cookie.
 */

const AUTH_COOKIE = 'veriq_authed';

// Routes that require authentication
const PROTECTED_PREFIXES = ['/dashboard'];

// Routes only for unauthenticated users (redirect away if already logged in)
const GUEST_ONLY = ['/auth/login', '/auth/register'];

// Admin-only routes
const ADMIN_ONLY = ['/dashboard/admin'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const authedCookie = req.cookies.get(AUTH_COOKIE);
  const roleCookie = req.cookies.get('veriq_role');

  const isAuthed = authedCookie?.value === '1';
  const role = roleCookie?.value ?? '';

  // ── Redirect logged-in users away from guest-only pages ───────────────
  if (isAuthed && GUEST_ONLY.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // ── Protect dashboard routes ───────────────────────────────────────────
  if (
    !isAuthed &&
    PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // ── Admin-only route guard ─────────────────────────────────────────────
  if (
    isAuthed &&
    role !== 'admin' &&
    ADMIN_ONLY.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)',
  ],
};
