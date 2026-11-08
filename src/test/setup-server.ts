import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { vi } from 'vitest';
import { resetEnvironmentCache } from '@/lib/env';
import { startTestDatabase, type TestDatabase } from './mongo';
import { resetRequest, testDb, useTestDatabase } from './next-server';

process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/unused';
process.env.LOCAL_UPLOADS_DIR = mkdtempSync(join(tmpdir(), 'openwrimo-unit-uploads-'));
process.env.STORAGE_DRIVER = 'local';
process.env.TRUST_PROXY = 'false';

vi.mock('next/headers', async () => {
  const fake = await import('./next-server');

  return { cookies: async () => fake.cookieStore, headers: async () => fake.currentHeaders() };
});

vi.mock('next/navigation', async () => {
  const fake = await import('./next-server');

  return {
    redirect: (url: string) => {
      throw new fake.Redirected(url);
    },
    notFound: () => {
      throw new fake.NotFoundError();
    },
  };
});

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

vi.mock('@/lib/db/client', async () => {
  const fake = await import('./next-server');

  return { getDatabase: async () => fake.testDb() };
});

let database: TestDatabase;

beforeAll(async () => {
  database = await startTestDatabase();
  useTestDatabase(database);
});

beforeEach(async () => {
  resetRequest();
  resetEnvironmentCache();

  for (const collection of await testDb().collections()) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  useTestDatabase(undefined);
  await database.stop();
});
