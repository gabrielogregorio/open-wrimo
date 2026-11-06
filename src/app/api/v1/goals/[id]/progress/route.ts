import { logProgress } from '@/lib/writing/service';
import { bearerClaims, formResponse, readJson, unauthorized } from '@/server/api';
import { writingContextFor } from '@/server/session';

export async function POST(
  request: Request,
  { params }: RouteContext<'/api/v1/goals/[id]/progress'>,
): Promise<Response> {
  const claims = await bearerClaims(request);

  if (!claims) {
    return unauthorized();
  }

  const body = await readJson(request);
  const source = body.source === 'sprint' ? 'sprint' : 'update';
  const result = await logProgress(await writingContextFor(claims.userId), (await params).id, body, source);

  return formResponse(result, 201);
}
