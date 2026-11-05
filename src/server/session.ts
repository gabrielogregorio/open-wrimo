import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { createRateLimiter } from '@/lib/auth/rate-limit';
import { clientAddressFrom } from '@/lib/auth/request';
import type { AuthDependencies } from '@/lib/auth/service';
import { SESSION_COOKIE, createSessionRepository, type SessionUser } from '@/lib/auth/session';
import { createUserRepository } from '@/lib/auth/users';
import { createBookRepository } from '@/lib/books/repository';
import { getDatabase } from '@/lib/db/client';
import { getEnvironment } from '@/lib/env';

export const authDependencies = async (): Promise<AuthDependencies> => {
  const database = await getDatabase();

  return {
    users: createUserRepository(database),
    sessions: createSessionRepository(database),
    limiter: createRateLimiter(database),
    now: () => new Date(),
  };
};

export const bookRepository = async () => createBookRepository(await getDatabase());

export const clientAddress = async (): Promise<string | null> =>
  clientAddressFrom((await headers()).get('x-forwarded-for'), getEnvironment().TRUST_PROXY);

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return createSessionRepository(await getDatabase()).findUser(token, new Date());
});

export const requireUser = async (): Promise<SessionUser> => {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return user;
};
