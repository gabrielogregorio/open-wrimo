import { saveGoal } from '@/lib/writing/service';
import { bearerClaims, formResponse, readJson, unauthorized } from '@/server/api';
import { writingContextFor } from '@/server/session';

export async function POST(request: Request, { params }: RouteContext<'/api/v1/novels/[id]/goals'>): Promise<Response> {
  const claims = await bearerClaims(request);

  if (!claims) {
    return unauthorized();
  }

  const result = await saveGoal(await writingContextFor(claims.userId), (await params).id, await readJson(request));

  return formResponse(result, 201);
}
