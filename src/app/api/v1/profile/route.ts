import { PROFILE_SECTIONS, type ProfileSection } from '@/lib/db/collections';
import { saveProfile } from '@/lib/writing/service';
import { bearerWriter, fileBytes, formResponse, stringFields } from '@/server/api';
import { writingContextFor } from '@/server/session';

export async function PUT(request: Request): Promise<Response> {
  const claims = await bearerWriter(request);

  if (claims instanceof Response) {
    return claims;
  }

  const form = await request.formData();
  const shown = new Set(form.getAll('show'));
  const result = await saveProfile(
    await writingContextFor(claims.userId),
    stringFields(form),
    { bytes: await fileBytes(form, 'avatar'), remove: false },
    Object.fromEntries(PROFILE_SECTIONS.map((section) => [section, shown.has(section)])) as Record<
      ProfileSection,
      boolean
    >,
  );

  return formResponse(result);
}
