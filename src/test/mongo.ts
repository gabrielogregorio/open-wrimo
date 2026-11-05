import { MongoClient, type Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ensureIndexes } from '@/lib/db/collections';

export type TestDatabase = { database: Db; uri: string; stop: () => Promise<void> };

export const startTestDatabase = async (): Promise<TestDatabase> => {
  const server = await MongoMemoryServer.create();
  const uri = server.getUri();
  const client = await new MongoClient(uri).connect();
  const database = client.db('folio-test');
  await ensureIndexes(database);

  return {
    database,
    uri,
    stop: async () => {
      await client.close();
      await server.stop();
    },
  };
};
