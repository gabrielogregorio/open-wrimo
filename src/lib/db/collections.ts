import type { Db, ObjectId, WithId } from 'mongodb';
import type { BookStatus } from '@/lib/books/schema';

export type UserDocument = {
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
};

export type SessionDocument = {
  tokenHash: string;
  userId: ObjectId;
  createdAt: Date;
  expiresAt: Date;
};

export type RateLimitDocument = {
  _id: string;
  count: number;
  expiresAt: Date;
};

export type BookmarkDocument = {
  id: ObjectId;
  page: number;
  note: string;
  createdAt: Date;
};

export type BookDocument = {
  userId: ObjectId;
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
  status: BookStatus;
  rating: number | null;
  notes: string;
  bookmarks: BookmarkDocument[];
  createdAt: Date;
  updatedAt: Date;
};

export type StoredUser = WithId<UserDocument>;
export type StoredBook = WithId<BookDocument>;

export const collections = (database: Db) => ({
  users: database.collection<UserDocument>('users'),
  sessions: database.collection<SessionDocument>('sessions'),
  rateLimits: database.collection<RateLimitDocument>('rate_limits'),
  books: database.collection<BookDocument>('books'),
});

export const ensureIndexes = async (database: Db): Promise<void> => {
  const { users, sessions, rateLimits, books } = collections(database);

  await Promise.all([
    users.createIndex({ email: 1 }, { unique: true }),
    sessions.createIndex({ tokenHash: 1 }, { unique: true }),
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    rateLimits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    books.createIndex({ userId: 1, updatedAt: -1 }),
    books.createIndex({ userId: 1, status: 1, updatedAt: -1 }),
  ]);
};
