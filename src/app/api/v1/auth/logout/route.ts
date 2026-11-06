import { createSessionRepository } from '@/lib/auth/session';
import { getDatabase } from '@/lib/db/client';
import { readJson } from '@/server/api';

export async function POST(request: Request): Promise<Response> {
  const { refreshToken } = await readJson(request);

  if (typeof refreshToken === 'string' && refreshToken.length > 0) {
    await createSessionRepository(await getDatabase()).revoke(refreshToken);
  }

  return new Response(null, { status: 204 });
}
