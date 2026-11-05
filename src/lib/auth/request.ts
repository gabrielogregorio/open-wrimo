const SAFE_PATH = /^\/(?![/\\])[\w\-./?=&%]*$/;
const MAX_PATH_LENGTH = 512;

export const safeRedirectPath = (value: unknown, fallback = '/write'): string => {
  if (typeof value !== 'string' || value.length > MAX_PATH_LENGTH || !SAFE_PATH.test(value)) {
    return fallback;
  }

  return value;
};

export const clientAddressFrom = (forwardedFor: string | null, trustProxy: boolean): string | null => {
  if (!trustProxy || !forwardedFor) {
    return null;
  }

  const firstHop = forwardedFor.split(',')[0].trim();

  return firstHop || null;
};

export const sessionCookieOptions = (appUrl: string, maxAgeMs: number) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: appUrl.startsWith('https://'),
  path: '/',
  maxAge: Math.floor(maxAgeMs / 1000),
});
