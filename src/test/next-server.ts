// Stand-ins for the Next.js request APIs, so server code (sessions, route handlers, server actions and
// the proxy) runs in unit tests against a throwaway MongoDB. src/test/setup-server.ts wires them in.
import type { Db } from 'mongodb';
import sharp from 'sharp';
import { createAccountRepository } from '@/lib/account/account';
import { signUp } from '@/lib/auth/service';
import { ACCESS_COOKIE, REFRESH_COOKIE, signAccessToken } from '@/lib/auth/tokens';
import { collections } from '@/lib/db/collections';
import { getEnvironment } from '@/lib/env';
import { createReportRepository } from '@/lib/moderation/reports';
import { authDependencies } from '@/server/session';
import type { TestDatabase } from './mongo';

/** What redirect() throws here; Next.js throws its own error that the framework catches. */
export class Redirected extends Error {
  constructor(readonly url: string) {
    super(`redirected to ${url}`);
  }
}

/** What notFound() throws here. */
export class NotFoundError extends Error {
  constructor() {
    super('not found');
  }
}

type StoredCookie = { value: string; options?: unknown };

const jar = new Map<string, StoredCookie>();
let requestHeaders = new Headers();
let testDatabase: TestDatabase | undefined;

export const cookieStore = {
  get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)!.value } : undefined),
  set: (name: string, value: string, options?: unknown) => {
    jar.set(name, { value, options });
  },
  delete: (name: string) => {
    jar.delete(name);
  },
};

export const storedCookie = (name: string): StoredCookie | undefined => jar.get(name);

export const currentHeaders = (): Headers => requestHeaders;

export const setRequestHeaders = (headers: Record<string, string>): void => {
  requestHeaders = new Headers(headers);
};

export const resetRequest = (): void => {
  jar.clear();
  requestHeaders = new Headers();
};

export const useTestDatabase = (database: TestDatabase | undefined): void => {
  testDatabase = database;
};

export const testDb = (): Db => {
  if (!testDatabase) {
    throw new Error('The test database is not running.');
  }

  return testDatabase.database;
};

export type TestWriter = { id: string; username: string; email: string; refreshToken: string; accessToken: string };

let writerCount = 0;

/** A real account, signed up through the auth service, with tokens to act as it. */
export const createWriter = async (
  extra: { termsVersion?: string; deletionRequestedAt?: Date; isAdmin?: boolean; isPublic?: boolean } = {},
): Promise<TestWriter> => {
  writerCount += 1;
  const username = `writer-${writerCount}`;
  const email = `${username}@example.com`;
  const result = await signUp(
    await authDependencies(),
    { name: `Writer ${writerCount}`, username, email, password: 'a long enough secret', acceptTerms: 'on' },
    null,
  );

  if (!result.ok) {
    throw new Error(`could not sign up: ${JSON.stringify(result)}`);
  }

  const { users, profiles } = collections(testDb());
  const { isPublic, ...fields } = extra;

  if (Object.keys(fields).length > 0) {
    await users.updateOne({ username }, { $set: fields });
  }

  if (isPublic !== undefined) {
    const user = await users.findOne({ username });
    await profiles.updateOne({ userId: user!._id }, { $set: { isPublic } }, { upsert: true });
  }

  const accessToken = await signAccessToken(result, getEnvironment().JWT_SECRET, new Date());

  return { id: result.userId, username, email, refreshToken: result.refreshToken, accessToken };
};

/** Puts the writer's tokens in the request cookies, as the browser would send them. */
export const actAs = (writer: TestWriter | null): void => {
  jar.clear();

  if (writer) {
    jar.set(ACCESS_COOKIE, { value: writer.accessToken });
    jar.set(REFRESH_COOKIE, { value: writer.refreshToken });
  }
};

export const isAdmin = (userId: string) => createReportRepository(testDb()).isAdmin(userId);

export const accountOf = (userId: string) => createAccountRepository(testDb()).status(userId);

export const form = (fields: Record<string, string | string[] | File>): FormData => {
  const data = new FormData();

  for (const [name, value] of Object.entries(fields)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      data.append(name, item);
    }
  }

  return data;
};

export const pngFile = async (name = 'image.png'): Promise<File> =>
  new File(
    [
      new Uint8Array(
        await sharp({ create: { width: 40, height: 30, channels: 3, background: '#7d2a26' } })
          .png()
          .toBuffer(),
      ),
    ],
    name,
    { type: 'image/png' },
  );

/** Runs a server action or page step and gives back where it redirected to. */
export const redirectOf = async (run: () => Promise<unknown>): Promise<string> => {
  try {
    await run();
  } catch (error) {
    if (error instanceof Redirected) {
      return error.url;
    }

    throw error;
  }

  throw new Error('expected a redirect');
};
