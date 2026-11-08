import type { Db, ObjectId, WithId } from 'mongodb';
import type { EventId } from '@/lib/writing/events';
import type { GoalPeriod, GoalUnit, Mood, ProjectStatus, ProjectType } from '@/lib/writing/schema';

export type UserDocument = {
  email: string;
  username: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
  /** Turned on only by hand in the database; opens the moderation pages. */
  isAdmin?: boolean;
  /** The terms version this writer accepted, and when; older accounts lack them. */
  termsVersion?: string;
  termsAcceptedAt?: Date;
  /** Set when the writer asks to delete the account; the account is hidden from then on. */
  deletionRequestedAt?: Date;
};

export const ACCESS_ACTIONS = ['register', 'login', 'upload', 'terms', 'deletion-request', 'deletion-cancel'] as const;
export type AccessAction = (typeof ACCESS_ACTIONS)[number];

/** Connection records kept for six months (Marco Civil da Internet, art. 15), then expired by MongoDB. */
export type AccessLogDocument = {
  userId: ObjectId | null;
  action: AccessAction;
  address: string | null;
  userAgent: string;
  /** For uploads, the stored image key, so deleting the account can remove the file. */
  detail?: string;
  createdAt: Date;
  expiresAt: Date;
};

export const REPORT_REASONS = [
  'child-abuse',
  'non-consensual-intimate',
  'hate-or-violence',
  'copyright',
  'spam',
  'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export const REPORT_TARGETS = ['profile', 'novel'] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];

export type ReportDocument = {
  target: ReportTarget;
  /** The reported writer. */
  targetUserId: ObjectId;
  /** The reported novel, when the target is a novel. */
  targetProjectId: ObjectId | null;
  reason: ReportReason;
  details: string;
  /** Who reported, when signed in; anyone can report a public page. */
  reporterUserId: ObjectId | null;
  reporterAddress: string | null;
  reporterUserAgent: string;
  status: 'open' | 'resolved';
  createdAt: Date;
  resolvedAt: Date | null;
};

/**
 * One image copied into its owner's folder by `pnpm run images:owners`. The original stays until
 * `--remove-old`, so `--undo` can point everything back, and deleting the account removes both.
 */
export type ImageMigrationDocument = {
  userId: ObjectId;
  fromKey: string;
  fromUrl: string;
  toKey: string;
  toUrl: string;
  copiedAt: Date;
};

export type SessionDocument = {
  tokenHash: string;
  userId: ObjectId;
  familyId: string;
  usedAt: Date | null;
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
  /** Words written before the novel was tracked here; older documents lack it. */
  wordsBefore?: number;
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
  /** Older profiles lack it. */
  pronouns?: '' | 'he' | 'she';
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
export type StoredReport = WithId<ReportDocument>;

export const collections = (database: Db) => ({
  users: database.collection<UserDocument>('users'),
  sessions: database.collection<SessionDocument>('sessions'),
  rateLimits: database.collection<RateLimitDocument>('rate_limits'),
  projects: database.collection<ProjectDocument>('projects'),
  goals: database.collection<GoalDocument>('goals'),
  entries: database.collection<EntryDocument>('entries'),
  posts: database.collection<PostDocument>('posts'),
  profiles: database.collection<ProfileDocument>('profiles'),
  accessLogs: database.collection<AccessLogDocument>('access_logs'),
  reports: database.collection<ReportDocument>('reports'),
  imageMigrations: database.collection<ImageMigrationDocument>('image_migrations'),
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
  const {
    users,
    sessions,
    rateLimits,
    projects,
    goals,
    entries,
    posts,
    profiles,
    accessLogs,
    reports,
    imageMigrations,
  } = collections(database);

  await Promise.all([
    users.createIndex({ email: 1 }, { unique: true }),
    users.createIndex({ username: 1 }, { unique: true, partialFilterExpression: { username: { $type: 'string' } } }),
    sessions.createIndex({ tokenHash: 1 }, { unique: true }),
    sessions.createIndex({ familyId: 1 }),
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    rateLimits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    projects.createIndex({ userId: 1, updatedAt: -1 }),
    goals.createIndex({ userId: 1, projectId: 1, startDate: -1 }),
    entries.createIndex({ userId: 1, projectId: 1, unit: 1, date: 1 }),
    posts.createIndex({ userId: 1, createdAt: -1 }),
    profiles.createIndex({ userId: 1 }, { unique: true }),
    posts.createIndex({ userId: 1, projectId: 1, createdAt: -1 }),
    accessLogs.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    accessLogs.createIndex({ userId: 1, createdAt: -1 }),
    reports.createIndex({ status: 1, createdAt: -1 }),
    imageMigrations.createIndex({ userId: 1 }),
  ]);
};
