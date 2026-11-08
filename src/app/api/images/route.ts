import { saveInlineImage } from '@/lib/writing/service';
import { getTranslator } from '@/server/i18n';
import { currentWriter, writingContext } from '@/server/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const writer = await currentWriter();
  const t = await getTranslator();

  if (writer === 'signed-out') {
    return Response.json({ error: t('Sign in first.') }, { status: 401 });
  }

  if (writer === 'blocked') {
    return Response.json(
      { error: t('Accept the new Terms of Use, or cancel the deletion of your account, to add images.') },
      { status: 403 },
    );
  }

  const file = (await request.formData()).get('image');

  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: t('Use a PNG, JPEG, WebP or GIF image.') }, { status: 400 });
  }

  const result = await saveInlineImage(await writingContext(), new Uint8Array(await file.arrayBuffer()));

  return 'url' in result ? Response.json(result) : Response.json({ error: t(result.error) }, { status: 400 });
}
