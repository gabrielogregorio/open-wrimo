import type { Db, ObjectId, WithId } from 'mongodb';
import type { EventId } from '@/lib/writing/events';
import type { GoalPeriod, GoalUnit, Mood, ProjectStatus, ProjectType } from '@/lib/writing/schema';

export type UserDocument = {
  email: string;
  username: string;
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
  isPublic?: boolean;
  awards: string[];
  coverUrl: string | null;
  coverKey: string | null;
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
  eventId?: EventId | null;
  period?: GoalPeriod | null;
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

export type PostDocument = {
  userId: ObjectId;
  projectId: ObjectId;
  title: string;
  body: string;
  imageUrl: string | null;
  imageKey: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProfileDocument = {
  userId: ObjectId;
  bio: string;
  location: string;
  writingTime: string;
  favoriteBooks: string;
  favoriteAuthors: string;
  avatarUrl: string | null;
  avatarKey: string | null;
  isPublic?: boolean;
  shown?: Partial<Record<ProfileSection, boolean>>;
  updatedAt: Date;
};

export const PROFILE_SECTIONS = ['bio', 'stats', 'favorites', 'badges'] as const;
export type ProfileSection = (typeof PROFILE_SECTIONS)[number];

export type StoredUser = WithId<UserDocument>;
export type StoredProject = WithId<ProjectDocument>;
export type StoredGoal = WithId<GoalDocument>;
export type StoredEntry = WithId<EntryDocument>;
export type StoredPost = WithId<PostDocument>;

export const collections = (database: Db) => ({
  users: database.collection<UserDocument>('users'),
  sessions: database.collection<SessionDocument>('sessions'),
  rateLimits: database.collection<RateLimitDocument>('rate_limits'),
  projects: database.collection<ProjectDocument>('projects'),
  goals: database.collection<GoalDocument>('goals'),
  entries: database.collection<EntryDocument>('entries'),
  posts: database.collection<PostDocument>('posts'),
  profiles: database.collection<ProfileDocument>('profiles'),
});

const migrateUsernames = async (database: Db): Promise<void> => {
  const { users } = collections(database);
  const missing = await users.find({ username: { $exists: false } }, { projection: { _id: 1 } }).toArray();

  await Promise.all(
    missing.map((user) =>
      users.updateOne({ _id: user._id }, { $set: { username: `escritor-${user._id.toHexString().slice(-6)}` } }),
    ),
  );
};

export const ensureIndexes = async (database: Db): Promise<void> => {
  await migrateUsernames(database);
  const { users, sessions, rateLimits, projects, goals, entries, posts, profiles } = collections(database);

  await Promise.all([
    users.createIndex({ email: 1 }, { unique: true }),
    users.createIndex({ username: 1 }, { unique: true, partialFilterExpression: { username: { $type: 'string' } } }),
    sessions.createIndex({ tokenHash: 1 }, { unique: true }),
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    rateLimits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    projects.createIndex({ userId: 1, updatedAt: -1 }),
    goals.createIndex({ userId: 1, projectId: 1, startDate: -1 }),
    entries.createIndex({ userId: 1, projectId: 1, unit: 1, date: 1 }),
    posts.createIndex({ userId: 1, createdAt: -1 }),
    profiles.createIndex({ userId: 1 }, { unique: true }),
    posts.createIndex({ userId: 1, projectId: 1, createdAt: -1 }),
  ]);
};
