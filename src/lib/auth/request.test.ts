import { clientAddressFrom, safeRedirectPath, sessionCookieOptions } from './request';

describe('safeRedirectPath', () => {
  it.each(['/shelf', '/shelf/6650f0c2a1b2c3d4e5f60718', '/shelf?status=reading&page=2'])('keeps %s', (path) => {
    expect(safeRedirectPath(path)).toBe(path);
  });

  it.each([
    ['another site', 'https://evil.example.com'],
    ['a protocol relative address', '//evil.example.com'],
    ['a backslash trick', '/\\evil.example.com'],
    ['a relative path', 'shelf'],
    ['a script', 'javascript:alert(1)'],
    ['a value that is not text', 42],
    ['a very long path', `/${'a'.repeat(600)}`],
  ])('falls back on %s', (_description, value) => {
    expect(safeRedirectPath(value)).toBe('/shelf');
  });

  it('uses the given fallback', () => {
    expect(safeRedirectPath(undefined, '/')).toBe('/');
  });
});

describe('clientAddressFrom', () => {
  it('ignores the header when the proxy is not trusted', () => {
    expect(clientAddressFrom('203.0.113.7', false)).toBeNull();
  });

  it('takes the first hop from a trusted proxy', () => {
    expect(clientAddressFrom(' 203.0.113.7 , 10.0.0.2', true)).toBe('203.0.113.7');
  });

  it.each([null, '', ' , 10.0.0.2'])('returns null for the header "%s"', (header) => {
    expect(clientAddressFrom(header, true)).toBeNull();
  });
});

describe('sessionCookieOptions', () => {
  it('marks the cookie secure on https', () => {
    expect(sessionCookieOptions('https://books.example.com', 90_000)).toEqual({
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 90,
    });
  });

  it('keeps it usable on plain http for local work', () => {
    expect(sessionCookieOptions('http://localhost:8920', 1000).secure).toBe(false);
  });
});
