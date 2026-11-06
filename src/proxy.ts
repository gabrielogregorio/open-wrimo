import { NextResponse, type NextRequest } from 'next/server';
import { sessionCookieOptions } from '@/lib/auth/request';
import { REFRESH_TTL_MS, createSessionRepository } from '@/lib/auth/session';
import {
  ACCESS_COOKIE,
  ACCESS_TTL_SECONDS,
  REFRESH_COOKIE,
  signAccessToken,
  verifyAccessToken,
} from '@/lib/auth/tokens';
import { getDatabase } from '@/lib/db/client';
import { getEnvironment } from '@/lib/env';
import {
  LOCALE_COOKIE,
  LOCALE_HEADER,
  LOCALE_QUERY,
  PREFERENCE_MAX_AGE_SECONDS,
  normalizeLocale,
} from '@/lib/i18n/locales';

const PROTECTED_PREFIXES = ['/write'];

type Renewed = { accessToken: string; refreshToken: string } | null;

const renewTokens = async (request: NextRequest): Promise<Renewed | 'none'> => {
  const { JWT_SECRET } = getEnvironment();

  if (await verifyAccessToken(request.cookies.get(ACCESS_COOKIE)?.value, JWT_SECRET)) {
    return 'none';
  }

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    return null;
  }

  const now = new Date();
  const rotated = await createSessionRepository(await getDatabase()).rotate(refreshToken, now);

  return rotated
    ? { accessToken: await signAccessToken(rotated, JWT_SECRET, now), refreshToken: rotated.refreshToken }
    : null;
};

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const renewed = await renewTokens(request);

  if (renewed === null && PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', `${pathname}${search}`);
    const redirect = NextResponse.redirect(login);
    redirect.cookies.delete(ACCESS_COOKIE);
    redirect.cookies.delete(REFRESH_COOKIE);

    return redirect;
  }

  if (renewed && renewed !== 'none') {
    request.cookies.set(ACCESS_COOKIE, renewed.accessToken);
    request.cookies.set(REFRESH_COOKIE, renewed.refreshToken);
    const response = NextResponse.next({ request: { headers: new Headers(request.headers) } });
    const { APP_URL } = getEnvironment();
    response.cookies.set(ACCESS_COOKIE, renewed.accessToken, sessionCookieOptions(APP_URL, ACCESS_TTL_SECONDS * 1000));
    response.cookies.set(REFRESH_COOKIE, renewed.refreshToken, sessionCookieOptions(APP_URL, REFRESH_TTL_MS));

    return response;
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
  matcher: ['/((?!_next/static|_next/image|api/v1|api/health|media|icon.svg|robots.txt).*)'],
};
