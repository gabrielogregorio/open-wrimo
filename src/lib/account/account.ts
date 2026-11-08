import { ObjectId, type Db } from 'mongodb';
import { collections, type AccessAction } from '@/lib/db/collections';
import type { ImageStorage } from '@/lib/storage/storage';
import { ACCESS_LOG_MONTHS, DELETION_DEADLINE_DAYS, DELETION_GRACE_DAYS } from '@/lib/legal/terms-content';

const DAY_MS = 86_400_000;
const ACCESS_LOG_DAYS = Math.ceil(ACCESS_LOG_MONTHS * 30.5);

export type AccessRecord = {
  userId: string | null;
  action: AccessAction;
  address: string | null;
  userAgent: string;
  detail?: string;
};

export type AccountStatus = {
  termsVersion: string | null;
  termsAcceptedAt: Date | null;
  deletionRequestedAt: Date | null;
  isAdmin: boolean;
};

/** 'grace' while the writer can still cancel the deletion, 'closed' after that. */
export type DeletionState = 'none' | 'grace' | 'closed';

export const deletionState = (requestedAt: Date | null | undefined, now: Date): DeletionState => {
  if (!requestedAt) {
    return 'none';
  }

  return now.getTime() - requestedAt.getTime() < DELETION_GRACE_DAYS * DAY_MS ? 'grace' : 'closed';
};

const idOf = (userId: string | null): ObjectId | null =>
  userId && ObjectId.isValid(userId) ? new ObjectId(userId) : null;

export const createAccessLog = (database: Db) => {
  const { accessLogs } = collections(database);

  return {
    async record(record: AccessRecord, now: Date): Promise<void> {
      await accessLogs.insertOne({
        userId: idOf(record.userId),
        action: record.action,
        address: record.address,
        userAgent: record.userAgent,
        ...(record.detail ? { detail: record.detail } : {}),
        createdAt: now,
        expiresAt: new Date(now.getTime() + ACCESS_LOG_DAYS * DAY_MS),
      });
    },
  };
};

export type AccessLog = ReturnType<typeof createAccessLog>;

export const createAccountRepository = (database: Db) => {
  const { users, sessions } = collections(database);

  return {
    async status(userId: string): Promise<AccountStatus | null> {
      const id = idOf(userId);
      const user = id ? await users.findOne({ _id: id }) : null;

      return user
        ? {
            termsVersion: user.termsVersion ?? null,
            termsAcceptedAt: user.termsAcceptedAt ?? null,
            deletionRequestedAt: user.deletionRequestedAt ?? null,
            isAdmin: user.isAdmin === true,
          }
        : null;
    },

    async acceptTerms(userId: string, version: string, now: Date): Promise<void> {
      const id = idOf(userId);

      if (id) {
        await users.updateOne({ _id: id }, { $set: { termsVersion: version, termsAcceptedAt: now } });
      }
    },

    /** Hides the account and ends every session; the purge removes it later. */
    async requestDeletion(userId: string, now: Date): Promise<void> {
      const id = idOf(userId);

      if (id) {
        await users.updateOne({ _id: id }, { $set: { deletionRequestedAt: now } });
        await sessions.deleteMany({ userId: id });
      }
    },

    async cancelDeletion(userId: string): Promise<void> {
      const id = idOf(userId);

      if (id) {
        await users.updateOne({ _id: id }, { $unset: { deletionRequestedAt: '' } });
      }
    },
  };
};

export type AccountRepository = ReturnType<typeof createAccountRepository>;

export type DeletionPreview = {
  userId: string;
  name: string;
  username: string;
  email: string;
  requestedAt: Date;
  graceEndsAt: Date;
  deadline: Date;
  state: Exclude<DeletionState, 'none'>;
  overdue: boolean;
  counts: { novels: number; goals: number; entries: number; posts: number; images: number; profile: boolean };
};

const later = (date: Date, days: number): Date => new Date(date.getTime() + days * DAY_MS);

const imageKeysOf = async (database: Db, userId: ObjectId): Promise<string[]> => {
  const { projects, profiles, posts, accessLogs } = collections(database);
  const [ownProjects, profile, ownPosts, uploads] = await Promise.all([
    projects.find({ userId }, { projection: { coverKey: 1 } }).toArray(),
    profiles.findOne({ userId }, { projection: { avatarKey: 1 } }),
    posts.find({ userId }, { projection: { imageKey: 1 } }).toArray(),
    accessLogs.find({ userId, action: 'upload' }, { projection: { detail: 1 } }).toArray(),
  ]);

  return [
    ...new Set(
      [
        ...ownProjects.map((project) => project.coverKey),
        profile?.avatarKey,
        ...ownPosts.map((post) => post.imageKey),
        ...uploads.map((upload) => upload.detail),
      ].filter((key): key is string => typeof key === 'string' && key.length > 0),
    ),
  ];
};

/**
 * Every account waiting for deletion, oldest request first, with what deleting it would remove, so an
 * admin can check before deleting by hand. `overdue` marks requests past the deadline the terms promise.
 */
export const listPendingDeletions = async (database: Db, now: Date): Promise<DeletionPreview[]> => {
  const { users, projects, goals, entries, posts, profiles } = collections(database);
  const pending = await users
    .find({ deletionRequestedAt: { $exists: true } })
    .sort({ deletionRequestedAt: 1 })
    .toArray();

  return Promise.all(
    pending.map(async (user) => {
      const requestedAt = user.deletionRequestedAt as Date;
      const userId = user._id;
      const [novels, goalCount, entryCount, postCount, profile, images] = await Promise.all([
        projects.countDocuments({ userId }),
        goals.countDocuments({ userId }),
        entries.countDocuments({ userId }),
        posts.countDocuments({ userId }),
        profiles.countDocuments({ userId }),
        imageKeysOf(database, userId),
      ]);
      const deadline = later(requestedAt, DELETION_DEADLINE_DAYS);

      return {
        userId: userId.toHexString(),
        name: user.name,
        username: user.username,
        email: user.email,
        requestedAt,
        graceEndsAt: later(requestedAt, DELETION_GRACE_DAYS),
        deadline,
        state: deletionState(requestedAt, now) === 'closed' ? 'closed' : 'grace',
        overdue: now.getTime() > deadline.getTime(),
        counts: {
          novels,
          goals: goalCount,
          entries: entryCount,
          posts: postCount,
          images: images.length,
          profile: profile > 0,
        },
      };
    }),
  );
};

/**
 * Deletes one account for good, with its novels, goals, entries, profile, sessions and images (covers,
 * avatar and the uploads still in the access records), but only once its grace period is over. Access
 * records and reports stay until their own expiry, as the terms say.
 */
export const purgeAccount = async (
  database: Db,
  storage: ImageStorage,
  userId: string,
  now: Date,
): Promise<{ deleted: boolean; images: number }> => {
  const { users, sessions, projects, goals, entries, posts, profiles } = collections(database);
  const id = idOf(userId);
  const user = id ? await users.findOne({ _id: id }, { projection: { deletionRequestedAt: 1 } }) : null;

  if (!id || !user || deletionState(user.deletionRequestedAt, now) !== 'closed') {
    return { deleted: false, images: 0 };
  }

  const keys = await imageKeysOf(database, id);
  await Promise.all(keys.map((key) => storage.remove(key).catch(() => undefined)));
  await Promise.all([
    projects.deleteMany({ userId: id }),
    goals.deleteMany({ userId: id }),
    entries.deleteMany({ userId: id }),
    posts.deleteMany({ userId: id }),
    profiles.deleteMany({ userId: id }),
    sessions.deleteMany({ userId: id }),
  ]);
  await users.deleteOne({ _id: id });

  return { deleted: true, images: keys.length };
};
