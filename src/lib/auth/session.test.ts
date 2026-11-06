import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db/collections';
import { startTestDatabase, type TestDatabase } from '@/test/mongo';
import {
  REFRESH_TTL_MS,
  REUSE_GRACE_MS,
  createSessionRepository,
  generateSessionToken,
  hashSessionToken,
  type SessionRepository,
} from './session';

const NOW = new Date('2026-03-01T10:00:00.000Z');
const later = (milliseconds: number): Date => new Date(NOW.getTime() + milliseconds);

describe('refresh token helpers', () => {
  it('generates 32 random bytes in base64url', () => {
    expect(generateSessionToken()).toMatch(/^[\w-]{43}$/);
    expect(generateSessionToken()).not.toBe(generateSessionToken());
  });

  it('stores only the sha256 of the token', () => {
    expect(hashSessionToken('token')).toBe('3c469e9d6c5875d37a43f353d4f88e61fcf812c66eee3457465a40b0da4153e0');
  });
});

describe('createSessionRepository', () => {
  let testDatabase: TestDatabase;
  let sessions: SessionRepository;
  let userId: ObjectId;

  beforeAll(async () => {
    testDatabase = await startTestDatabase();
    sessions = createSessionRepository(testDatabase.database);
    const { insertedId } = await collections(testDatabase.database).users.insertOne({
      email: 'ana@example.com',
      username: 'ana',
      name: 'Ana',
      passwordHash: 'scrypt$hash',
      createdAt: NOW,
    });
    userId = insertedId;
  });

  afterAll(async () => {
    await testDatabase.stop();
  });

  it('keeps the raw token out of the database and expires it in 30 days', async () => {
    const token = await sessions.create(userId, NOW);
    const stored = await collections(testDatabase.database).sessions.findOne({ tokenHash: hashSessionToken(token) });

    expect(stored).toMatchObject({ usedAt: null, expiresAt: later(REFRESH_TTL_MS) });
    expect(JSON.stringify(stored)).not.toContain(token);
  });

  it('trades a refresh token for the next one in the same family', async () => {
    const token = await sessions.create(userId, NOW);
    const rotated = await sessions.rotate(token, later(1000));
    const stored = collections(testDatabase.database).sessions;
    const first = await stored.findOne({ tokenHash: hashSessionToken(token) });
    const next = await stored.findOne({ tokenHash: hashSessionToken(rotated!.refreshToken) });

    expect(rotated).toMatchObject({ userId: userId.toHexString(), username: 'ana' });
    expect(rotated!.refreshToken).not.toBe(token);
    expect(first?.usedAt).toEqual(later(1000));
    expect(next?.familyId).toBe(first?.familyId);
  });

  it('lets parallel requests reuse a token inside the grace window', async () => {
    const token = await sessions.create(userId, NOW);
    const first = await sessions.rotate(token, NOW);
    const second = await sessions.rotate(token, later(REUSE_GRACE_MS - 1));

    expect(second?.refreshToken).toEqual(expect.any(String));
    expect(second?.refreshToken).not.toBe(first?.refreshToken);
  });

  it('revokes the whole family when an old token comes back later', async () => {
    const token = await sessions.create(userId, NOW);
    const rotated = await sessions.rotate(token, NOW);

    await expect(sessions.rotate(token, later(REUSE_GRACE_MS + 1))).resolves.toBeNull();
    await expect(sessions.rotate(rotated!.refreshToken, later(REUSE_GRACE_MS + 2))).resolves.toBeNull();
  });

  it('refuses unknown and expired tokens', async () => {
    const token = await sessions.create(userId, NOW);

    await expect(sessions.rotate('unknown', NOW)).resolves.toBeNull();
    await expect(sessions.rotate(token, later(REFRESH_TTL_MS))).resolves.toBeNull();
  });

  it('refuses a token whose user is gone', async () => {
    const token = await sessions.create(new ObjectId(), NOW);

    await expect(sessions.rotate(token, NOW)).resolves.toBeNull();
  });

  it('finds a user by id without the password hash', async () => {
    await expect(sessions.findUserById(userId.toHexString())).resolves.toEqual({
      id: userId.toHexString(),
      name: 'Ana',
      email: 'ana@example.com',
      username: 'ana',
    });
    await expect(sessions.findUserById(new ObjectId().toHexString())).resolves.toBeNull();
    await expect(sessions.findUserById('not-an-id')).resolves.toBeNull();
  });

  it('revokes the family of a token and ignores unknown ones', async () => {
    const token = await sessions.create(userId, NOW);
    const rotated = await sessions.rotate(token, NOW);
    await sessions.revoke(token);

    await expect(sessions.rotate(rotated!.refreshToken, NOW)).resolves.toBeNull();
    await expect(sessions.revoke('unknown')).resolves.toBeUndefined();
  });
});
