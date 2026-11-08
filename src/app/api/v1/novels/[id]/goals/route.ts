import { saveGoal } from '@/lib/writing/service';
import { bearerWriter, formResponse, readJson } from '@/server/api';
import { writingContextFor } from '@/server/session';

export async function POST(request: Request, { params }: RouteContext<'/api/v1/novels/[id]/goals'>): Promise<Response> {
  const claims = await bearerWriter(request);

  if (claims instanceof Response) {
    return claims;
  }

  const result = await saveGoal(await writingContextFor(claims.userId), (await params).id, await readJson(request));

  return formResponse(result, 201);
}
