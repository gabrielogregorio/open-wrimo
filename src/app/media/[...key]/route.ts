import { getEnvironment } from '@/lib/env';
import { createLocalStorage } from '@/lib/storage/local';

const ONE_YEAR_IN_SECONDS = 31536000;

export async function GET(_request: Request, { params }: RouteContext<'/media/[...key]'>): Promise<Response> {
  const environment = getEnvironment();

  if (environment.STORAGE_DRIVER !== 'local') {
    return new Response(null, { status: 404 });
  }

  const image = await createLocalStorage(environment.LOCAL_UPLOADS_DIR).read((await params).key.join('/'));

  if (!image) {
    return new Response(null, { status: 404 });
  }

  return new Response(image.bytes as BodyInit, {
    headers: {
      'Content-Type': image.contentType,
      'Cache-Control': `public, max-age=${ONE_YEAR_IN_SECONDS}, immutable`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
