import { ObjectId, type Db } from 'mongodb';
import { collections, type AccessAction } from '@/lib/db/collections';
import type { ImageStorage } from '@/lib/storage/storage';
import { ACCESS_LOG_MONTHS, DELETION_GRACE_DAYS } from '@/lib/legal/terms-content';

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

/**
 * Deletes for good the accounts whose grace period is over, with their novels, goals, entries,
 * profile, sessions and images (covers, avatar and the uploads still in the access records).
 * Access records and reports stay until their own expiry, as the terms say.
 */
export const purgeDeletedAccounts = async (database: Db, storage: ImageStorage, now: Date): Promise<number> => {
  const { users, sessions, projects, goals, entries, posts, profiles, accessLogs } = collections(database);
  const cutoff = new Date(now.getTime() - DELETION_GRACE_DAYS * DAY_MS);
  const closed = await users.find({ deletionRequestedAt: { $lte: cutoff } }, { projection: { _id: 1 } }).toArray();

  for (const { _id: userId } of closed) {
    const [ownProjects, profile, ownPosts, uploads] = await Promise.all([
      projects.find({ userId }, { projection: { coverKey: 1 } }).toArray(),
      profiles.findOne({ userId }, { projection: { avatarKey: 1 } }),
      posts.find({ userId }, { projection: { imageKey: 1 } }).toArray(),
      accessLogs.find({ userId, action: 'upload' }, { projection: { detail: 1 } }).toArray(),
    ]);
    const keys = new Set(
      [
        ...ownProjects.map((project) => project.coverKey),
        profile?.avatarKey,
        ...ownPosts.map((post) => post.imageKey),
        ...uploads.map((upload) => upload.detail),
      ].filter((key): key is string => typeof key === 'string' && key.length > 0),
    );

    await Promise.all([...keys].map((key) => storage.remove(key).catch(() => undefined)));
    await Promise.all([
      projects.deleteMany({ userId }),
      goals.deleteMany({ userId }),
      entries.deleteMany({ userId }),
      posts.deleteMany({ userId }),
      profiles.deleteMany({ userId }),
      sessions.deleteMany({ userId }),
    ]);
    await users.deleteOne({ _id: userId });
  }

  return closed.length;
};
