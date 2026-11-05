import { MongoClient, type Db } from 'mongodb';
import { getEnvironment } from '@/lib/env';
import { ensureIndexes } from './collections';

const globalForMongo = globalThis as typeof globalThis & { openWrimoMongoClient?: Promise<MongoClient> };

const connect = async (uri: string, databaseName: string): Promise<MongoClient> => {
  const client = await new MongoClient(uri, { appName: 'openwrimo' }).connect();
  await ensureIndexes(client.db(databaseName));

  return client;
};

export const getDatabase = async (): Promise<Db> => {
  const { MONGODB_URI, MONGODB_DB } = getEnvironment();

  globalForMongo.openWrimoMongoClient ??= connect(MONGODB_URI, MONGODB_DB).catch((error: unknown) => {
    globalForMongo.openWrimoMongoClient = undefined;
    throw error;
  });

  const client = await globalForMongo.openWrimoMongoClient;

  return client.db(MONGODB_DB);
};

export const closeDatabase = async (): Promise<void> => {
  const pending = globalForMongo.openWrimoMongoClient;
  globalForMongo.openWrimoMongoClient = undefined;

  if (pending) {
    await (await pending).close();
  }
};
