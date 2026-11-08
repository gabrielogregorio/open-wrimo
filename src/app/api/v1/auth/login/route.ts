import { signIn } from '@/lib/auth/service';
import { authResponse, readJson, requestAddress, requestUserAgent } from '@/server/api';
import { authDependencies } from '@/server/session';

export async function POST(request: Request): Promise<Response> {
  return authResponse(
    await signIn(await authDependencies(), await readJson(request), requestAddress(request), requestUserAgent(request)),
  );
}
