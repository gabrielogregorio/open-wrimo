import { collections } from '@/lib/db/collections';
import { startTestDatabase, type TestDatabase } from '@/test/mongo';
import { LOGIN_RULES, createRateLimiter } from './rate-limit';
import { EMAIL_TAKEN, INVALID_CREDENTIALS, TOO_MANY_ATTEMPTS, signIn, signUp, type AuthDependencies } from './service';
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
      now: () => NOW,
    };
  });

  afterEach(async () => {
    await collections(testDatabase.database).rateLimits.deleteMany({});
  });

  afterAll(async () => {
    await testDatabase.stop();
  });

  const register = (email: string, address: string | null = null) =>
    signUp(dependencies, { name: 'Clara', email, password: PASSWORD }, address);

  it('signs up with a normalized email and opens a session', async () => {
    const result = await register('  Clara@Example.com ');

    expect(result).toEqual({ ok: true, token: expect.stringMatching(/^[\w-]{43}$/) });
    expect((await dependencies.users.findByEmail('clara@example.com'))?.name).toBe('Clara');
  });

  it('refuses the same email twice', async () => {
    await register('twice@example.com');

    await expect(register('TWICE@example.com')).resolves.toEqual({ ok: false, fieldErrors: { email: EMAIL_TAKEN } });
  });

  it('reports every invalid sign up field', async () => {
    await expect(signUp(dependencies, { name: '', email: 'not-an-email', password: 'short' }, null)).resolves.toEqual({
      ok: false,
      fieldErrors: {
        name: 'Enter a name up to 80 characters.',
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
      ok: true,
      token: expect.any(String),
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
