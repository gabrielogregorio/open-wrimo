import { SignJWT, jwtVerify } from 'jose';

export const ACCESS_COOKIE = 'openwrimo-access';
export const REFRESH_COOKIE = 'openwrimo-refresh';
export const ACCESS_TTL_SECONDS = 15 * 60;
const ISSUER = 'open-wrimo';
const AUDIENCE = 'open-wrimo';

export type AccessClaims = { userId: string; username: string };

const keyOf = (secret: string): Uint8Array => new TextEncoder().encode(secret);

export const signAccessToken = (claims: AccessClaims, secret: string, now: Date): Promise<string> => {
  const issuedAt = Math.floor(now.getTime() / 1000);

  return new SignJWT({ username: claims.username })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + ACCESS_TTL_SECONDS)
    .sign(keyOf(secret));
};

export const verifyAccessToken = async (token: string | undefined, secret: string): Promise<AccessClaims | null> => {
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, keyOf(secret), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'],
    });

    return typeof payload.sub === 'string' && typeof payload.username === 'string'
      ? { userId: payload.sub, username: payload.username }
      : null;
  } catch {
    return null;
  }
};
