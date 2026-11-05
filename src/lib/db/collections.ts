import type { Binary, Db, ObjectId, WithId } from 'mongodb';
import type { BookStatus } from '@/lib/books/schema';
import type { GoalUnit, Mood, ProjectStatus, ProjectType } from '@/lib/writing/schema';

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

export type ProjectDocument = {
  userId: ObjectId;
  title: string;
  status: ProjectStatus;
  type: ProjectType;
  genres: string[];
  summary: string;
  excerpt: string;
  pinterestUrl: string;
  playlistUrl: string;
  featured: boolean;
  awards: string[];
  coverVersion: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type GoalDocument = {
  userId: ObjectId;
  projectId: ObjectId;
  name: string;
  unit: GoalUnit;
  target: number;
  startDate: string;
  endDate: string;
  createdAt: Date;
};

export type EntryDocument = {
  userId: ObjectId;
  projectId: ObjectId;
  unit: GoalUnit;
  date: string;
  count: number;
  mood: Mood | null;
  place: string;
  source: 'update' | 'sprint';
  hour: number;
  createdAt: Date;
};

export type CoverDocument = {
  userId: ObjectId;
  contentType: string;
  data: Binary;
  updatedAt: Date;
};

export type StoredUser = WithId<UserDocument>;
export type StoredBook = WithId<BookDocument>;
export type StoredProject = WithId<ProjectDocument>;
export type StoredGoal = WithId<GoalDocument>;
export type StoredEntry = WithId<EntryDocument>;

export const collections = (database: Db) => ({
  users: database.collection<UserDocument>('users'),
  sessions: database.collection<SessionDocument>('sessions'),
  rateLimits: database.collection<RateLimitDocument>('rate_limits'),
  books: database.collection<BookDocument>('books'),
  projects: database.collection<ProjectDocument>('projects'),
  goals: database.collection<GoalDocument>('goals'),
  entries: database.collection<EntryDocument>('entries'),
  covers: database.collection<CoverDocument>('covers'),
});

export const ensureIndexes = async (database: Db): Promise<void> => {
  const { users, sessions, rateLimits, books, projects, goals, entries } = collections(database);

  await Promise.all([
    users.createIndex({ email: 1 }, { unique: true }),
    sessions.createIndex({ tokenHash: 1 }, { unique: true }),
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    rateLimits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    books.createIndex({ userId: 1, updatedAt: -1 }),
    books.createIndex({ userId: 1, status: 1, updatedAt: -1 }),
    projects.createIndex({ userId: 1, updatedAt: -1 }),
    goals.createIndex({ userId: 1, projectId: 1, startDate: -1 }),
    entries.createIndex({ userId: 1, projectId: 1, unit: 1, date: 1 }),
  ]);
};
