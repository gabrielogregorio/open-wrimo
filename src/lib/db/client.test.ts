import { MongoClient } from 'mongodb';
import { resetEnvironmentCache } from '@/lib/env';
import { startTestDatabase, type TestDatabase } from '@/test/mongo';
import { closeDatabase, getDatabase } from './client';

describe('getDatabase', () => {
  let testDatabase: TestDatabase;

  beforeAll(async () => {
    testDatabase = await startTestDatabase();
  });

  afterEach(async () => {
    await closeDatabase();
    resetEnvironmentCache();
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    await testDatabase.stop();
  });

  it('connects once, creates the indexes and reuses the client', async () => {
    vi.stubEnv('MONGODB_URI', testDatabase.uri);
    vi.stubEnv('MONGODB_DB', 'folio-client-test');

    const connect = vi.spyOn(MongoClient.prototype, 'connect');
    const [first] = await Promise.all([getDatabase(), getDatabase()]);
    await getDatabase();
    const sessionIndexes = await first.collection('sessions').indexes();

    expect(first.databaseName).toBe('folio-client-test');
    expect(connect).toHaveBeenCalledTimes(1);
    expect(sessionIndexes.map((index) => index.name).sort()).toEqual(['_id_', 'expiresAt_1', 'tokenHash_1']);
  });

  it('tries again after a failed connection', async () => {
    vi.stubEnv('MONGODB_URI', 'mongodb://127.0.0.1:1/?serverSelectionTimeoutMS=200');

    await expect(getDatabase()).rejects.toThrow();

    resetEnvironmentCache();
    vi.stubEnv('MONGODB_URI', testDatabase.uri);

    await expect(getDatabase()).resolves.toHaveProperty('databaseName', 'folio');
  });

  it('closes nothing when it never connected', async () => {
    await expect(closeDatabase()).resolves.toBeUndefined();
  });
});
