import { ObjectId } from 'mongodb';
import { ACCESS_COOKIE, REFRESH_COOKIE, verifyAccessToken } from '@/lib/auth/tokens';
import { storedCookie } from '@/test/next-server';
import { SITE_NAME, absoluteUrl, jsonLd, siteUrl } from './seo';
import { getLocale, getTranslator } from './i18n';
import { clearTokenCookies, refreshCookieOptions, storeTokenCookies, tokenPair } from './tokens';

describe('session tokens', () => {
  it('sign an access token for the writer and keep the refresh token', async () => {
    const userId = new ObjectId().toHexString();
    const pair = await tokenPair({ userId, username: 'ana' }, 'refresh');

    expect(pair).toMatchObject({ refreshToken: 'refresh', expiresIn: 900 });
    await expect(
      verifyAccessToken(pair.accessToken, 'unit-test-secret-that-is-at-least-32-chars'),
    ).resolves.toMatchObject({ userId, username: 'ana' });
  });

  it('live in httpOnly cookies until cleared', async () => {
    await storeTokenCookies({ accessToken: 'access', refreshToken: 'refresh', expiresIn: 900 });

    expect(storedCookie(ACCESS_COOKIE)).toMatchObject({ value: 'access', options: { httpOnly: true } });
    expect(storedCookie(REFRESH_COOKIE)).toMatchObject({ value: 'refresh', options: refreshCookieOptions() });

    await clearTokenCookies();
    expect(storedCookie(ACCESS_COOKIE)).toBeUndefined();
    expect(storedCookie(REFRESH_COOKIE)).toBeUndefined();
  });
});

describe('site details', () => {
  it('build absolute links and safe structured data', () => {
    expect(SITE_NAME).toBe('Open Wrimo');
    expect(siteUrl().origin).toBe('http://localhost:8920');
    expect(absoluteUrl('/u/ana')).toBe('http://localhost:8920/u/ana');
    expect(jsonLd({ name: '</script>' }).__html).toBe('{"name":"\\u003c/script>"}');
  });

  it('speak Brazilian Portuguese', async () => {
    await expect(getLocale()).resolves.toBe('pt-BR');
    expect((await getTranslator())('Sign in')).toBe('Entrar');
  });
});
