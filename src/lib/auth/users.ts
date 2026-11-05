import { MongoServerError, type Db, type ObjectId } from 'mongodb';
import { collections, type StoredUser, type UserDocument } from '@/lib/db/collections';

const DUPLICATE_KEY_CODE = 11000;

export type NewUser = UserDocument;

export type UserRepository = {
  findByEmail: (email: string) => Promise<StoredUser | null>;
  findByUsername: (username: string) => Promise<StoredUser | null>;
  insert: (user: NewUser) => Promise<ObjectId | null>;
};

export const createUserRepository = (database: Db): UserRepository => {
  const { users } = collections(database);

  return {
    findByEmail: (email) => users.findOne({ email }),
    findByUsername: (username) => users.findOne({ username }),
    async insert(user) {
      try {
        const { insertedId } = await users.insertOne(user);

        return insertedId;
      } catch (error) {
        if (error instanceof MongoServerError && error.code === DUPLICATE_KEY_CODE) {
          return null;
        }

        throw error;
      }
    },
  };
};
