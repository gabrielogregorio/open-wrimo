import { signUp } from '@/lib/auth/service';
import { authResponse, readJson, requestAddress } from '@/server/api';
import { authDependencies } from '@/server/session';

export async function POST(request: Request): Promise<Response> {
  return authResponse(await signUp(await authDependencies(), await readJson(request), requestAddress(request)), 201);
}
