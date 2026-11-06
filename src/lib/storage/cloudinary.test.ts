import { createHash } from 'node:crypto';
import { createCloudinaryStorage, parseCloudinaryUrl, signParameters } from './cloudinary';

const CREDENTIALS = { cloudName: 'demo-cloud', apiKey: '1234', apiSecret: 'shh' };
const NOW = new Date('2026-11-05T12:00:00.000Z');
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

const respond = (body: unknown, status = 200) =>
  vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));

describe('Cloudinary storage', () => {
  it('reads the credentials from CLOUDINARY_URL', () => {
    expect(parseCloudinaryUrl('cloudinary://1234:s%40cret@demo-cloud')).toEqual({
      cloudName: 'demo-cloud',
      apiKey: '1234',
      apiSecret: 's@cret',
    });
  });

  it('signs the sorted parameters with the secret', () => {
    expect(signParameters({ timestamp: '10', folder: 'a' }, 'shh')).toBe(
      // eslint-disable-next-line sonarjs/hashing -- Cloudinary request signatures are SHA-1
      createHash('sha1').update('folder=a&timestamp=10shh').digest('hex'),
    );
  });

  it('uploads a signed image into the folder', async () => {
    const fetch = respond({ secure_url: 'https://res.cloudinary.com/demo/x.png', public_id: 'openwrimo/covers/x' });
    const storage = createCloudinaryStorage({ ...CREDENTIALS, folder: 'openwrimo', fetch, now: () => NOW });

    await expect(
      storage.save({ bytes: PNG, kind: { contentType: 'image/png', extension: 'png' }, folder: 'covers' }),
    ).resolves.toEqual({ url: 'https://res.cloudinary.com/demo/x.png', key: 'openwrimo/covers/x' });

    const [url, init] = fetch.mock.calls[0];
    const body = init!.body as FormData;
    expect(url).toBe('https://api.cloudinary.com/v1_1/demo-cloud/image/upload');
    expect(body.get('folder')).toBe('openwrimo/covers');
    expect(body.get('timestamp')).toBe('1793880000');
    expect(body.get('api_key')).toBe('1234');
    expect(body.get('signature')).toBe(signParameters({ folder: 'openwrimo/covers', timestamp: '1793880000' }, 'shh'));
    expect((body.get('file') as Blob).type).toBe('image/png');
  });

  it('destroys an image by its id', async () => {
    const fetch = respond({ result: 'ok' });
    const storage = createCloudinaryStorage({ ...CREDENTIALS, folder: 'openwrimo', fetch, now: () => NOW });

    await storage.remove('openwrimo/covers/x');

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://api.cloudinary.com/v1_1/demo-cloud/image/destroy');
    expect((init!.body as FormData).get('public_id')).toBe('openwrimo/covers/x');
    expect((init!.body as FormData).get('file')).toBeNull();
  });

  it('fails loudly when Cloudinary refuses', async () => {
    const storage = createCloudinaryStorage({ ...CREDENTIALS, folder: 'f', fetch: respond({}, 401) });

    await expect(storage.remove('x')).rejects.toThrow('Cloudinary destroy failed with status 401');
    const explained = createCloudinaryStorage({
      ...CREDENTIALS,
      folder: 'f',
      fetch: respond({ error: { message: 'Invalid Signature 1a2b. String to sign - timestamp=1' } }, 401),
    });
    await expect(explained.remove('x')).rejects.toThrow(
      'Cloudinary destroy failed with status 401: Invalid Signature 1a2b. String to sign - timestamp=1',
    );
    const unreadable = createCloudinaryStorage({
      ...CREDENTIALS,
      folder: 'f',
      fetch: vi.fn<typeof fetch>(async () => new Response('<html>', { status: 500 })),
    });
    await expect(unreadable.remove('x')).rejects.toThrow('Cloudinary destroy failed with status 500');
  });

  it('uses the global fetch and clock by default', async () => {
    const fetch = respond({ result: 'ok' });
    vi.stubGlobal('fetch', fetch);

    await createCloudinaryStorage({ ...CREDENTIALS, folder: 'f' }).remove('x');

    expect(fetch).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
