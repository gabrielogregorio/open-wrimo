import { createAccessLog } from '@/lib/account/account';
import { collections } from '@/lib/db/collections';
import { TERMS_VERSION } from '@/lib/legal/terms';
import { startTestDatabase, type TestDatabase } from '@/test/mongo';
import { LOGIN_RULES, createRateLimiter } from './rate-limit';
import {
  ACCOUNT_CLOSED,
  EMAIL_TAKEN,
  INVALID_CREDENTIALS,
  TOO_MANY_ATTEMPTS,
  USERNAME_TAKEN,
  signIn,
  signUp,
  type AuthDependencies,
} from './service';
import { createSessionRepository } from './session';
import { createUserRepository } from './users';

const NOW = new Date('2026-03-01T10:00:00.000Z');
const PASSWORD = 'a long enough secret';

const repeat = async <Result>(times: number, attempt: (index: number) => Promise<Result>): Promise<Result[]> => {
  const results: Result[] = [];

  for (let index = 0; index < times; index += 1) {
    results.push(await attempt(index));
  }

  return results;
};

describe('auth service', () => {
  let testDatabase: TestDatabase;
  let dependencies: AuthDependencies;

  beforeAll(async () => {
    testDatabase = await startTestDatabase();
    dependencies = {
      users: createUserRepository(testDatabase.database),
      sessions: createSessionRepository(testDatabase.database),
      limiter: createRateLimiter(testDatabase.database),
      accessLog: createAccessLog(testDatabase.database),
      now: () => NOW,
    };
  });

  afterEach(async () => {
    await collections(testDatabase.database).rateLimits.deleteMany({});
  });

  afterAll(async () => {
    await testDatabase.stop();
  });

  const usernameFor = (email: string): string =>
    email
      .trim()
      .toLowerCase()
      .split('@')[0]
      .replace(/[^a-z0-9]+/g, '-');

  const register = (email: string, address: string | null = null, username = usernameFor(email)) =>
    signUp(dependencies, { name: 'Clara', username, email, password: PASSWORD, acceptTerms: 'on' }, address, 'Firefox');
  const session = { ok: true, refreshToken: expect.stringMatching(/^[\w-]{43}$/), userId: expect.any(String) };

  it('signs up with a normalized email and opens a session', async () => {
    const result = await register('  Clara@Example.com ');

    expect(result).toEqual({ ...session, username: 'clara' });
    const user = await dependencies.users.findByEmail('clara@example.com');
    expect(user?.name).toBe('Clara');
    expect(user).toMatchObject({ termsVersion: TERMS_VERSION, termsAcceptedAt: NOW });
    expect(await collections(testDatabase.database).accessLogs.findOne({ userId: user?._id })).toMatchObject({
      action: 'register',
      userAgent: 'Firefox',
    });
  });

  it('refuses to create an account without accepting the terms', async () => {
    await expect(
      signUp(dependencies, { name: 'Lia', username: 'lia', email: 'lia@example.com', password: PASSWORD }, null),
    ).resolves.toEqual({
      ok: false,
      fieldErrors: { acceptTerms: 'Accept the Terms of Use and Privacy Policy to create an account.' },
    });
  });

  it('lets a writer in during the deletion grace period, and never after it', async () => {
    await register('leaving@example.com');
    await register('gone@example.com');
    const { users } = collections(testDatabase.database);
    await users.updateOne({ email: 'leaving@example.com' }, { $set: { deletionRequestedAt: NOW } });
    await users.updateOne(
      { email: 'gone@example.com' },
      { $set: { deletionRequestedAt: new Date(NOW.getTime() - 31 * 86_400_000) } },
    );

    await expect(
      signIn(dependencies, { email: 'leaving@example.com', password: PASSWORD }, null),
    ).resolves.toMatchObject({
      ok: true,
    });
    await expect(signIn(dependencies, { email: 'gone@example.com', password: PASSWORD }, null)).resolves.toEqual({
      ok: false,
      error: ACCOUNT_CLOSED,
    });
  });

  it('refuses the same email twice', async () => {
    await register('twice@example.com');

    await expect(register('TWICE@example.com', null, 'twice-again')).resolves.toEqual({
      ok: false,
      fieldErrors: { email: EMAIL_TAKEN },
    });
  });

  it('refuses a username that is taken and keeps it lowercase', async () => {
    await expect(register('first@example.com', null, '  Same-Name ')).resolves.toMatchObject({
      ok: true,
      username: 'same-name',
    });
    await expect(register('second@example.com', null, 'same-name')).resolves.toEqual({
      ok: false,
      fieldErrors: { username: USERNAME_TAKEN },
    });
  });

  it('reports every invalid sign up field', async () => {
    await expect(
      signUp(
        dependencies,
        { name: '', username: 'no spaces!', email: 'not-an-email', password: 'short', acceptTerms: 'on' },
        null,
      ),
    ).resolves.toEqual({
      ok: false,
      fieldErrors: {
        name: 'Enter a name up to 80 characters.',
        username: 'Use 3 to 20 lowercase letters, numbers and dashes.',
        email: 'Enter a valid email address.',
        password: 'Use 10 to 128 characters.',
      },
    });
  });

  it('limits sign ups from the same address', async () => {
    const results = await repeat(6, (index) => register(`reader${index}@example.com`, '203.0.113.9'));

    expect(results.at(-1)).toEqual({ ok: false, error: TOO_MANY_ATTEMPTS, retryAfterMinutes: 60 });
  });

  it('signs in with the right password', async () => {
    await register('right@example.com');

    await expect(signIn(dependencies, { email: 'RIGHT@example.com', password: PASSWORD }, null)).resolves.toEqual({
      ...session,
      username: 'right',
    });
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    await register('wrong@example.com');

    const wrongPassword = await signIn(dependencies, { email: 'wrong@example.com', password: 'not it at all' }, null);
    const unknownEmail = await signIn(dependencies, { email: 'nobody@example.com', password: PASSWORD }, null);

    expect(wrongPassword).toEqual({ ok: false, error: INVALID_CREDENTIALS });
    expect(unknownEmail).toEqual(wrongPassword);
  });

  it('reports missing sign in fields before touching the limiter', async () => {
    await expect(signIn(dependencies, { email: '', password: '' }, null)).resolves.toEqual({
      ok: false,
      fieldErrors: { email: 'Enter a valid email address.', password: 'Enter your password.' },
    });
    await expect(collections(testDatabase.database).rateLimits.countDocuments()).resolves.toBe(0);
  });

  it('blocks the sixth try for one email even with the right password', async () => {
    await register('locked@example.com');

    await repeat(LOGIN_RULES.perEmail.limit, () =>
      signIn(dependencies, { email: 'locked@example.com', password: 'guessing wrong' }, null),
    );

    await expect(signIn(dependencies, { email: 'locked@example.com', password: PASSWORD }, null)).resolves.toEqual({
      ok: false,
      error: TOO_MANY_ATTEMPTS,
      retryAfterMinutes: 15,
    });
  });

  it('clears the email counter after a successful sign in', async () => {
    await register('forgetful@example.com');

    await repeat(LOGIN_RULES.perEmail.limit - 1, () =>
      signIn(dependencies, { email: 'forgetful@example.com', password: 'guessing wrong' }, null),
    );

    await signIn(dependencies, { email: 'forgetful@example.com', password: PASSWORD }, null);
    const afterReset = await signIn(dependencies, { email: 'forgetful@example.com', password: 'guessing wrong' }, null);

    expect(afterReset).toEqual({ ok: false, error: INVALID_CREDENTIALS });
  });

  it('blocks one address that sprays many emails', async () => {
    const address = '198.51.100.4';

    await repeat(LOGIN_RULES.perAddress.limit, (index) =>
      signIn(dependencies, { email: `spray${index}@example.com`, password: 'guessing wrong' }, address),
    );

    await expect(
      signIn(dependencies, { email: 'one-more@example.com', password: 'guessing wrong' }, address),
    ).resolves.toMatchObject({ ok: false, error: TOO_MANY_ATTEMPTS });
  });
});
