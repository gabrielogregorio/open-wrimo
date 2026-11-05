import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/session';
import {
  LOCALE_COOKIE,
  LOCALE_HEADER,
  LOCALE_QUERY,
  PREFERENCE_MAX_AGE_SECONDS,
  normalizeLocale,
} from '@/lib/i18n/locales';

const PROTECTED_PREFIX = '/shelf';

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith(PROTECTED_PREFIX) && !request.cookies.has(SESSION_COOKIE)) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', `${pathname}${search}`);

    return NextResponse.redirect(login);
  }

  const locale = normalizeLocale(request.nextUrl.searchParams.get(LOCALE_QUERY));

  if (!locale) {
    return NextResponse.next();
  }

  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, locale);
  const response = NextResponse.next({ request: { headers } });
  response.cookies.set(LOCALE_COOKIE, locale, { path: '/', maxAge: PREFERENCE_MAX_AGE_SECONDS, sameSite: 'lax' });

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|api/health|icon.svg|robots.txt).*)'],
};
