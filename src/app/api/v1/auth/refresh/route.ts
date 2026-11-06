import { createSessionRepository } from '@/lib/auth/session';
import { getDatabase } from '@/lib/db/client';
import { json, readJson } from '@/server/api';
import { tokenPair } from '@/server/tokens';

export async function POST(request: Request): Promise<Response> {
  const { refreshToken } = await readJson(request);

  if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
    return json({ error: 'Send the refresh token.' }, 400);
  }

  const rotated = await createSessionRepository(await getDatabase()).rotate(refreshToken, new Date());

  return rotated
    ? json(await tokenPair(rotated, rotated.refreshToken))
    : json({ error: 'The refresh token is not valid.' }, 401);
}
