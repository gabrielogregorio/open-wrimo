import { NextRequest } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE, verifyAccessToken } from '@/lib/auth/tokens';
import { LOCALE_COOKIE, LOCALE_HEADER } from '@/lib/i18n/locales';
import { createWriter } from '@/test/next-server';
import { config, proxy } from './proxy';

const SECRET = 'unit-test-secret-that-is-at-least-32-chars';

const visit = (path: string, cookies: Record<string, string> = {}): NextRequest =>
  new NextRequest(`http://localhost:8920${path}`, {
    headers: {
      cookie: Object.entries(cookies)
        .map(([name, value]) => `${name}=${value}`)
        .join('; '),
    },
  });

describe('proxy', () => {
  it('sends a visitor without a session from a private page to sign in, keeping the page asked for', async () => {
    const response = await proxy(visit('/write/stats?range=month'));
    const location = new URL(response.headers.get('location')!);

    expect(response.status).toBe(307);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('next')).toBe('/write/stats?range=month');
  });

  it('clears a dead refresh token on the way to sign in', async () => {
    const response = await proxy(visit('/write', { [ACCESS_COOKIE]: 'forged', [REFRESH_COOKIE]: 'unknown' }));

    expect(response.headers.get('location')).toContain('/login');
    expect(response.cookies.get(ACCESS_COOKIE)?.value).toBe('');
    expect(response.cookies.get(REFRESH_COOKIE)?.value).toBe('');
  });

  it('lets a visitor without a session see public pages', async () => {
    const response = await proxy(visit('/u/ana'));

    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('passes a live access token through untouched', async () => {
    const writer = await createWriter();
    const response = await proxy(visit('/write', { [ACCESS_COOKIE]: writer.accessToken }));

    expect(response.headers.get('location')).toBeNull();
    expect(response.cookies.get(ACCESS_COOKIE)).toBeUndefined();
  });

  it('renews an expired access token from the refresh token and rotates it', async () => {
    const writer = await createWriter();
    const response = await proxy(visit('/write', { [REFRESH_COOKIE]: writer.refreshToken }));
    const access = response.cookies.get(ACCESS_COOKIE);
    const refresh = response.cookies.get(REFRESH_COOKIE);

    expect(response.headers.get('location')).toBeNull();
    expect(access?.httpOnly).toBe(true);
    await expect(verifyAccessToken(access?.value, SECRET)).resolves.toMatchObject({ userId: writer.id });
    expect(refresh?.value).toMatch(/^[\w-]{43}$/);
    expect(refresh?.value).not.toBe(writer.refreshToken);
  });

  it('remembers a language asked for in the address', async () => {
    const response = await proxy(visit('/?lang=pt-BR'));

    expect(response.cookies.get(LOCALE_COOKIE)?.value).toBe('pt-BR');
    expect(response.headers.get(`x-middleware-request-${LOCALE_HEADER}`)).toBe('pt-BR');
  });

  it('stays away from static files, the API and uploaded images', () => {
    const [matcher] = config.matcher;
    const matches = (path: string) => new RegExp(`^${matcher}$`).test(path);

    expect(matches('/write')).toBe(true);
    expect(matches('/api/v1/novels')).toBe(false);
    expect(matches('/media/covers/a.webp')).toBe(false);
  });
});
