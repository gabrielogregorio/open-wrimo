import { createSessionRepository } from '@/lib/auth/session';
import { getDatabase } from '@/lib/db/client';
import { bearerClaims, json, unauthorized } from '@/server/api';

export async function GET(request: Request): Promise<Response> {
  const claims = await bearerClaims(request);
  const user = claims ? await createSessionRepository(await getDatabase()).findUserById(claims.userId) : null;

  return user ? json(user) : unauthorized();
}
