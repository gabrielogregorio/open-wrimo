import { saveInlineImage } from '@/lib/writing/service';
import { getTranslator } from '@/server/i18n';
import { getCurrentUser, writingContext } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  if (!(await getCurrentUser())) {
    return Response.json({ error: 'Sign in first.' }, { status: 401 });
  }

  const t = await getTranslator();
  const file = (await request.formData()).get('image');

  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: t('Use a PNG, JPEG, WebP or GIF image.') }, { status: 400 });
  }

  const result = await saveInlineImage(await writingContext(), new Uint8Array(await file.arrayBuffer()));

  return 'url' in result ? Response.json(result) : Response.json({ error: t(result.error) }, { status: 400 });
}
