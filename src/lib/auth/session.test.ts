import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db/collections';
import { startTestDatabase, type TestDatabase } from '@/test/mongo';
import { SESSION_TTL_MS, createSessionRepository, generateSessionToken, hashSessionToken } from './session';

const NOW = new Date('2026-03-01T10:00:00.000Z');

describe('session tokens', () => {
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
  let userId: ObjectId;

  beforeAll(async () => {
    testDatabase = await startTestDatabase();
    const { insertedId } = await collections(testDatabase.database).users.insertOne({
      email: 'ana@example.com',
      name: 'Ana',
      passwordHash: 'scrypt$hash',
      createdAt: NOW,
    });
    userId = insertedId;
  });

  afterAll(async () => {
    await testDatabase.stop();
  });

  it('finds the user of a live session without exposing the password hash', async () => {
    const sessions = createSessionRepository(testDatabase.database);
    const token = await sessions.create(userId, NOW);

    await expect(sessions.findUser(token, NOW)).resolves.toEqual({
      id: userId.toHexString(),
      name: 'Ana',
      email: 'ana@example.com',
    });
  });

  it('keeps the raw token out of the database', async () => {
    const sessions = createSessionRepository(testDatabase.database);
    const token = await sessions.create(userId, NOW);
    const stored = await collections(testDatabase.database).sessions.findOne({ tokenHash: hashSessionToken(token) });

    expect(stored?.expiresAt).toEqual(new Date(NOW.getTime() + SESSION_TTL_MS));
    expect(JSON.stringify(stored)).not.toContain(token);
  });

  it('ignores an expired session', async () => {
    const sessions = createSessionRepository(testDatabase.database);
    const token = await sessions.create(userId, NOW);

    await expect(sessions.findUser(token, new Date(NOW.getTime() + SESSION_TTL_MS))).resolves.toBeNull();
  });

  it('ignores an unknown token', async () => {
    await expect(createSessionRepository(testDatabase.database).findUser('unknown', NOW)).resolves.toBeNull();
  });

  it('ignores a session whose user is gone', async () => {
    const sessions = createSessionRepository(testDatabase.database);
    const token = await sessions.create(new ObjectId(), NOW);

    await expect(sessions.findUser(token, NOW)).resolves.toBeNull();
  });

  it('revokes a session', async () => {
    const sessions = createSessionRepository(testDatabase.database);
    const token = await sessions.create(userId, NOW);
    await sessions.revoke(token);

    await expect(sessions.findUser(token, NOW)).resolves.toBeNull();
  });
});
