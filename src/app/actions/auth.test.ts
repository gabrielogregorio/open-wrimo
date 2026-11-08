import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/auth/tokens';
import { collections } from '@/lib/db/collections';
import { actAs, createWriter, form, redirectOf, storedCookie, testDb } from '@/test/next-server';
import { signInAction, signOutAction, signUpAction } from './auth';

const PASSWORD = 'a long enough secret';

describe('auth actions', () => {
  it('sign up, store the tokens and open the writing desk', async () => {
    const fields = { name: 'Ana', username: 'ana', email: 'ana@example.com', password: PASSWORD, acceptTerms: 'on' };

    await expect(redirectOf(() => signUpAction({}, form(fields)))).resolves.toBe('/write');
    expect(storedCookie(ACCESS_COOKIE)?.value).toBeTruthy();
    expect(storedCookie(REFRESH_COOKIE)?.value).toBeTruthy();
  });

  it('keep the form, without the password, when sign up is refused', async () => {
    const fields = { name: 'Ana', username: 'ana', email: 'ana@example.com', password: PASSWORD };

    await expect(signUpAction({}, form(fields))).resolves.toMatchObject({
      fieldErrors: { acceptTerms: expect.any(String) },
      values: { name: 'Ana', username: 'ana', email: 'ana@example.com', acceptTerms: '' },
    });
  });

  it('keep the ticked terms box when the username is taken', async () => {
    const writer = await createWriter();
    const fields = {
      name: 'Ana',
      username: writer.username,
      email: 'ana@example.com',
      password: PASSWORD,
      acceptTerms: 'on',
    };

    await expect(signUpAction({}, form(fields))).resolves.toMatchObject({
      fieldErrors: { username: expect.any(String) },
      values: expect.objectContaining({ acceptTerms: 'on' }),
    });
  });

  it('sign in and go back only to a page of this site', async () => {
    const writer = await createWriter();

    await expect(
      redirectOf(() => signInAction({}, form({ email: writer.email, password: PASSWORD, next: '/write/stats' }))),
    ).resolves.toBe('/write/stats');
    await expect(
      redirectOf(() =>
        signInAction({}, form({ email: writer.email, password: PASSWORD, next: 'https://evil.example' })),
      ),
    ).resolves.toBe('/write');
  });

  it('refuse a wrong password and say how long to wait after too many tries', async () => {
    const writer = await createWriter();
    const wrong = form({ email: writer.email, password: 'not the password' });

    await expect(signInAction({}, wrong)).resolves.toMatchObject({
      error: expect.any(String),
      errorValues: undefined,
      values: { email: writer.email },
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await signInAction({}, wrong);
    }

    await expect(signInAction({}, wrong)).resolves.toMatchObject({ errorValues: { minutes: expect.any(Number) } });
  });

  it('sign out, revoking the session when there is one', async () => {
    const writer = await createWriter();

    await expect(redirectOf(signOutAction)).resolves.toBe('/login');

    actAs(writer);
    await expect(redirectOf(signOutAction)).resolves.toBe('/login');
    expect(storedCookie(REFRESH_COOKIE)).toBeUndefined();
    expect(await collections(testDb()).sessions.countDocuments({ usedAt: null })).toBe(0);
  });
});
