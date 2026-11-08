import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { createRateLimiter } from '@/lib/auth/rate-limit';
import { clientAddressFrom } from '@/lib/auth/request';
import type { AuthDependencies } from '@/lib/auth/service';
import { createSessionRepository, type SessionUser } from '@/lib/auth/session';
import { ACCESS_COOKIE, verifyAccessToken } from '@/lib/auth/tokens';
import { createUserRepository } from '@/lib/auth/users';
import { getDatabase } from '@/lib/db/client';
import { getEnvironment } from '@/lib/env';
import { storageFor } from '@/lib/storage';
import type { ImageStorage } from '@/lib/storage/storage';
import { TIME_ZONE_COOKIE, localDate, resolveTimeZone } from '@/lib/writing/dates';
import { createWritingRepository } from '@/lib/writing/repository';
import type { WritingContext } from '@/lib/writing/service';
import { getTranslator } from './i18n';

export const authDependencies = async (): Promise<AuthDependencies> => {
  const database = await getDatabase();

  return {
    users: createUserRepository(database),
    sessions: createSessionRepository(database),
    limiter: createRateLimiter(database),
    now: () => new Date(),
  };
};

export const clientAddress = async (): Promise<string | null> =>
  clientAddressFrom((await headers()).get('x-forwarded-for'), getEnvironment().TRUST_PROXY);

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const claims = await verifyAccessToken((await cookies()).get(ACCESS_COOKIE)?.value, getEnvironment().JWT_SECRET);

  return claims ? createSessionRepository(await getDatabase()).findUserById(claims.userId) : null;
});

export const requireUser = async (): Promise<SessionUser> => {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return user;
};

let imageStorage: ImageStorage | undefined;

export const getImageStorage = (): ImageStorage => {
  imageStorage ??= storageFor(getEnvironment());

  return imageStorage;
};

export const getTimeZone = async (): Promise<string> => resolveTimeZone((await cookies()).get(TIME_ZONE_COOKIE)?.value);

export const writingContext = async (): Promise<WritingContext & { today: string }> => {
  const user = await requireUser();
  const database = await getDatabase();
  const timeZone = await getTimeZone();
  const now = new Date();

  return {
    writing: createWritingRepository(database),
    storage: getImageStorage(),
    limiter: createRateLimiter(database),
    userId: user.id,
    now,
    timeZone,
    today: localDate(now, timeZone),
    translate: await getTranslator(),
  };
};

export const writingContextFor = async (
  userId: string,
  timeZone = 'America/Sao_Paulo',
): Promise<WritingContext & { today: string }> => {
  const database = await getDatabase();
  const now = new Date();

  return {
    writing: createWritingRepository(database),
    storage: getImageStorage(),
    limiter: createRateLimiter(database),
    userId,
    now,
    timeZone,
    today: localDate(now, timeZone),
    translate: await getTranslator(),
  };
};

const MAX_USER_AGENT_LENGTH = 300;

/** The address and browser of the current request, for access records and reports. */
export const clientInfo = async (): Promise<{ address: string | null; userAgent: string }> => ({
  address: await clientAddress(),
  userAgent: ((await headers()).get('user-agent') ?? '').slice(0, MAX_USER_AGENT_LENGTH),
});
