import { cookies } from 'next/headers';
import { sessionCookieOptions } from '@/lib/auth/request';
import { REFRESH_TTL_MS } from '@/lib/auth/session';
import { ACCESS_COOKIE, ACCESS_TTL_SECONDS, REFRESH_COOKIE, signAccessToken } from '@/lib/auth/tokens';
import { getEnvironment } from '@/lib/env';

export type TokenPair = { accessToken: string; refreshToken: string; expiresIn: number };

export const tokenPair = async (
  user: { userId: string; username: string },
  refreshToken: string,
): Promise<TokenPair> => ({
  accessToken: await signAccessToken(user, getEnvironment().JWT_SECRET, new Date()),
  refreshToken,
  expiresIn: ACCESS_TTL_SECONDS,
});

export const accessCookieOptions = () => sessionCookieOptions(getEnvironment().APP_URL, ACCESS_TTL_SECONDS * 1000);
export const refreshCookieOptions = () => sessionCookieOptions(getEnvironment().APP_URL, REFRESH_TTL_MS);

export const storeTokenCookies = async (pair: TokenPair): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_COOKIE, pair.accessToken, accessCookieOptions());
  cookieStore.set(REFRESH_COOKIE, pair.refreshToken, refreshCookieOptions());
};

export const clearTokenCookies = async (): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
};
