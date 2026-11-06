import { SignJWT } from 'jose';
import { ACCESS_TTL_SECONDS, signAccessToken, verifyAccessToken } from './tokens';

const SECRET = 'a-test-secret-that-is-long-enough-1234';
const CLAIMS = { userId: '6650f0c2a1b2c3d4e5f60718', username: 'ana' };

describe('access tokens', () => {
  it('signs and reads back the writer', async () => {
    const token = await signAccessToken(CLAIMS, SECRET, new Date());

    await expect(verifyAccessToken(token, SECRET)).resolves.toEqual(CLAIMS);
  });

  it('refuses an expired token, another secret, garbage and nothing', async () => {
    const old = await signAccessToken(CLAIMS, SECRET, new Date(Date.now() - (ACCESS_TTL_SECONDS + 5) * 1000));

    await expect(verifyAccessToken(old, SECRET)).resolves.toBeNull();
    await expect(
      verifyAccessToken(await signAccessToken(CLAIMS, SECRET, new Date()), `${SECRET}-other`),
    ).resolves.toBeNull();
    await expect(verifyAccessToken('not.a.token', SECRET)).resolves.toBeNull();
    await expect(verifyAccessToken(undefined, SECRET)).resolves.toBeNull();
  });

  it('refuses a valid signature without the username claim', async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(CLAIMS.userId)
      .setIssuer('open-wrimo')
      .setAudience('open-wrimo')
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode(SECRET));

    await expect(verifyAccessToken(token, SECRET)).resolves.toBeNull();
  });
});
