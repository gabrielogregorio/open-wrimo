import { saveCover, saveProject } from '@/lib/writing/service';
import { bearerWriter, fileBytes, formResponse, json, stringFields } from '@/server/api';
import { writingContextFor } from '@/server/session';

export async function POST(request: Request): Promise<Response> {
  const claims = await bearerWriter(request);

  if (claims instanceof Response) {
    return claims;
  }

  const form = await request.formData();
  const context = await writingContextFor(claims.userId);
  const result = await saveProject(context, stringFields(form));

  if (!result.id) {
    return formResponse(result);
  }

  const cover = await fileBytes(form, 'cover');
  let coverStatus: unknown = 'none';

  if (cover) {
    const coverResult = await saveCover(context, result.id, cover);
    coverStatus = coverResult.saved ? 'saved' : coverResult.fieldErrors;
  }

  return json({ id: result.id, cover: coverStatus }, 201);
}
