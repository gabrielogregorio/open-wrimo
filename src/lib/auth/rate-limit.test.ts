import { startTestDatabase, type TestDatabase } from '@/test/mongo';
import { LOGIN_RULES, createRateLimiter, decide, minutesUntil } from './rate-limit';

const START = new Date('2026-03-01T10:00:00.000Z');
const RULE = { limit: 2, windowMs: 60_000 };

const later = (milliseconds: number): Date => new Date(START.getTime() + milliseconds);

describe('decide', () => {
  it('allows up to the limit', () => {
    expect(decide(5, 5, later(1000), START)).toEqual({ allowed: true, retryAfterMs: 0 });
  });

  it('blocks one over the limit and says how long to wait', () => {
    expect(decide(6, 5, later(90_000), START)).toEqual({ allowed: false, retryAfterMs: 90_000 });
  });

  it('never reports a negative wait', () => {
    expect(decide(6, 5, START, later(1000)).retryAfterMs).toBe(0);
  });
});

describe('minutesUntil', () => {
  it.each([
    [0, 1],
    [60_000, 1],
    [60_001, 2],
    [15 * 60_000, 15],
  ])('turns %i ms into %i minutes', (milliseconds, minutes) => {
    expect(minutesUntil(milliseconds)).toBe(minutes);
  });
});

describe('login rules', () => {
  it('allows five tries per email in fifteen minutes', () => {
    expect(LOGIN_RULES.perEmail).toEqual({ limit: 5, windowMs: 15 * 60_000 });
  });
});

describe('createRateLimiter', () => {
  let testDatabase: TestDatabase;

  beforeAll(async () => {
    testDatabase = await startTestDatabase();
  });

  afterAll(async () => {
    await testDatabase.stop();
  });

  it('blocks after the limit inside the same window', async () => {
    const limiter = createRateLimiter(testDatabase.database);

    await expect(limiter.consume('blocks', RULE, START)).resolves.toEqual({ allowed: true, retryAfterMs: 0 });
    await expect(limiter.consume('blocks', RULE, later(1000))).resolves.toEqual({ allowed: true, retryAfterMs: 0 });
    await expect(limiter.consume('blocks', RULE, later(2000))).resolves.toEqual({
      allowed: false,
      retryAfterMs: 58_000,
    });
  });

  it('opens a new window once the old one expires', async () => {
    const limiter = createRateLimiter(testDatabase.database);
    await limiter.consume('expires', RULE, START);
    await limiter.consume('expires', RULE, START);
    await limiter.consume('expires', RULE, START);

    await expect(limiter.consume('expires', RULE, later(RULE.windowMs))).resolves.toEqual({
      allowed: true,
      retryAfterMs: 0,
    });
  });

  it('counts parallel attempts without losing any', async () => {
    const limiter = createRateLimiter(testDatabase.database);
    const attempts = 10;
    const decisions = await Promise.all(
      Array.from({ length: attempts }, () => limiter.consume('parallel', RULE, START)),
    );

    expect(decisions.filter((decision) => decision.allowed)).toHaveLength(RULE.limit);
  });

  it('starts over after a reset', async () => {
    const limiter = createRateLimiter(testDatabase.database);
    await limiter.consume('reset', RULE, START);
    await limiter.consume('reset', RULE, START);
    await limiter.consume('reset', RULE, START);
    await limiter.reset('reset');

    await expect(limiter.consume('reset', RULE, START)).resolves.toEqual({ allowed: true, retryAfterMs: 0 });
  });

  it('fails loudly when the database returns nothing', async () => {
    const database = {
      collection: () => ({ findOneAndUpdate: async () => null }),
    } as unknown as TestDatabase['database'];

    await expect(createRateLimiter(database).consume('lost', RULE, START)).rejects.toThrow(
      'Rate limit "lost" was not stored',
    );
  });
});
