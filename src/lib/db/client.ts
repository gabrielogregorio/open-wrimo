import { MongoClient, type Db } from 'mongodb';
import { getEnvironment } from '@/lib/env';
import { ensureIndexes } from './collections';

const globalForMongo = globalThis as typeof globalThis & { folioMongoClient?: Promise<MongoClient> };

const connect = async (uri: string, databaseName: string): Promise<MongoClient> => {
  const client = await new MongoClient(uri, { appName: 'folio' }).connect();
  await ensureIndexes(client.db(databaseName));

  return client;
};

export const getDatabase = async (): Promise<Db> => {
  const { MONGODB_URI, MONGODB_DB } = getEnvironment();

  globalForMongo.folioMongoClient ??= connect(MONGODB_URI, MONGODB_DB).catch((error: unknown) => {
    globalForMongo.folioMongoClient = undefined;
    throw error;
  });

  const client = await globalForMongo.folioMongoClient;

  return client.db(MONGODB_DB);
};

export const closeDatabase = async (): Promise<void> => {
  const pending = globalForMongo.folioMongoClient;
  globalForMongo.folioMongoClient = undefined;

  if (pending) {
    await (await pending).close();
  }
};
