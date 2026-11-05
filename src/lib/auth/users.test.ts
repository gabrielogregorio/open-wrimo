import { MongoServerError, type Db } from 'mongodb';
import { startTestDatabase, type TestDatabase } from '@/test/mongo';
import { createUserRepository } from './users';

const NOW = new Date('2026-03-01T10:00:00.000Z');
const NEW_USER = { email: 'bruno@example.com', name: 'Bruno', passwordHash: 'scrypt$hash', createdAt: NOW };

describe('createUserRepository', () => {
  let testDatabase: TestDatabase;

  beforeAll(async () => {
    testDatabase = await startTestDatabase();
  });

  afterAll(async () => {
    await testDatabase.stop();
  });

  it('inserts a user and finds it by email', async () => {
    const users = createUserRepository(testDatabase.database);
    const userId = await users.insert(NEW_USER);

    expect((await users.findByEmail('bruno@example.com'))?._id).toEqual(userId);
  });

  it('returns null for an email that is already registered', async () => {
    await expect(createUserRepository(testDatabase.database).insert(NEW_USER)).resolves.toBeNull();
  });

  it('lets other database errors through', async () => {
    const failure = new MongoServerError({ message: 'not primary', code: 10107 });
    const database = {
      collection: () => ({
        insertOne: async () => {
          throw failure;
        },
      }),
    } as unknown as Db;

    await expect(createUserRepository(database).insert(NEW_USER)).rejects.toBe(failure);
  });
});
