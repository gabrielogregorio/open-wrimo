import { createHash, randomBytes } from 'node:crypto';
import type { Db, ObjectId } from 'mongodb';
import { collections } from '@/lib/db/collections';

export const SESSION_COOKIE = 'openwrimo-session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const TOKEN_BYTES = 32;

export type SessionUser = { id: string; name: string; email: string; username: string };

export const generateSessionToken = (): string => randomBytes(TOKEN_BYTES).toString('base64url');

export const hashSessionToken = (token: string): string => createHash('sha256').update(token).digest('hex');

export type SessionRepository = {
  create: (userId: ObjectId, now: Date) => Promise<string>;
  findUser: (token: string, now: Date) => Promise<SessionUser | null>;
  revoke: (token: string) => Promise<void>;
};

export const createSessionRepository = (database: Db): SessionRepository => {
  const { sessions, users } = collections(database);

  return {
    async create(userId, now) {
      const token = generateSessionToken();
      await sessions.insertOne({
        tokenHash: hashSessionToken(token),
        userId,
        createdAt: now,
        expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
      });

      return token;
    },
    async findUser(token, now) {
      const session = await sessions.findOne({ tokenHash: hashSessionToken(token), expiresAt: { $gt: now } });

      if (!session) {
        return null;
      }

      const user = await users.findOne({ _id: session.userId }, { projection: { name: 1, email: 1, username: 1 } });

      if (!user) {
        return null;
      }

      return { id: user._id.toHexString(), name: user.name, email: user.email, username: user.username };
    },
    async revoke(token) {
      await sessions.deleteOne({ tokenHash: hashSessionToken(token) });
    },
  };
};
