import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { ObjectId, type Db } from 'mongodb';
import { collections } from '@/lib/db/collections';

export const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const TOKEN_BYTES = 32;
export const REUSE_GRACE_MS = 30_000;

export type SessionUser = { id: string; name: string; email: string; username: string };
export type RotatedToken = { userId: string; username: string; refreshToken: string };

export const generateSessionToken = (): string => randomBytes(TOKEN_BYTES).toString('base64url');

export const hashSessionToken = (token: string): string => createHash('sha256').update(token).digest('hex');

export type SessionRepository = {
  create: (userId: ObjectId, now: Date, familyId?: string) => Promise<string>;
  rotate: (refreshToken: string, now: Date) => Promise<RotatedToken | null>;
  findUserById: (userId: string) => Promise<SessionUser | null>;
  revoke: (refreshToken: string) => Promise<void>;
};

export const createSessionRepository = (database: Db): SessionRepository => {
  const { sessions, users } = collections(database);

  const create = async (userId: ObjectId, now: Date, familyId: string = randomUUID()): Promise<string> => {
    const token = generateSessionToken();
    await sessions.insertOne({
      tokenHash: hashSessionToken(token),
      userId,
      familyId,
      usedAt: null,
      createdAt: now,
      expiresAt: new Date(now.getTime() + REFRESH_TTL_MS),
    });

    return token;
  };

  return {
    create,

    async rotate(refreshToken, now) {
      const tokenHash = hashSessionToken(refreshToken);
      const claimed = await sessions.findOneAndUpdate(
        { tokenHash, usedAt: null, expiresAt: { $gt: now } },
        { $set: { usedAt: now } },
      );

      const session = claimed ?? (await sessions.findOne({ tokenHash, expiresAt: { $gt: now } }));

      if (!session) {
        return null;
      }

      const concurrent = !claimed && session.usedAt && now.getTime() - session.usedAt.getTime() < REUSE_GRACE_MS;

      if (!claimed && !concurrent) {
        await sessions.deleteMany({ familyId: session.familyId });

        return null;
      }

      const user = await users.findOne({ _id: session.userId }, { projection: { username: 1 } });

      if (!user) {
        return null;
      }

      return {
        userId: user._id.toHexString(),
        username: user.username,
        refreshToken: await create(session.userId, now, session.familyId),
      };
    },

    async findUserById(userId) {
      if (!ObjectId.isValid(userId)) {
        return null;
      }

      const user = await users.findOne(
        { _id: new ObjectId(userId) },
        { projection: { name: 1, email: 1, username: 1 } },
      );

      return user ? { id: user._id.toHexString(), name: user.name, email: user.email, username: user.username } : null;
    },

    async revoke(refreshToken) {
      const session = await sessions.findOne({ tokenHash: hashSessionToken(refreshToken) });

      if (session) {
        await sessions.deleteMany({ familyId: session.familyId });
      }
    },
  };
};
