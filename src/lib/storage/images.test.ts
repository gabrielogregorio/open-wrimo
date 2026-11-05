import sharp from 'sharp';
import {
  IMAGE_STILL_TOO_BIG,
  IMAGE_UNREADABLE,
  IMAGE_UPLOAD_TOO_BIG,
  IMAGE_WRONG_TYPE,
  MAX_UPLOAD_BYTES,
  WEBP,
  contentTypeForExtension,
  imageKindOf,
  prepareImage,
} from './images';

const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);

const picture = async (width: number, height: number, format: 'png' | 'jpeg' | 'gif' | 'webp' = 'png') =>
  new Uint8Array(
    await sharp({ create: { width, height, channels: 3, background: { r: 120, g: 60, b: 30 } } })
      .toFormat(format)
      .toBuffer(),
  );

describe('image kinds', () => {
  it.each([
    [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]), 'image/png', 'png'],
    [new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg', 'jpg'],
    [bytes('GIF89a'), 'image/gif', 'gif'],
    [bytes('RIFF\0\0\0\0WEBPVP8 '), 'image/webp', 'webp'],
  ])('knows %s by its first bytes', (data, contentType, extension) => {
    expect(imageKindOf(data)).toEqual({ contentType, extension });
    expect(contentTypeForExtension(extension)).toBe(contentType);
  });

  it.each([
    bytes('<svg/>'),
    bytes('RIFF\0\0\0\0WAVE'),
    new Uint8Array([0x89, 0x51]),
    new Uint8Array([0xff, 0xd8, 0x00]),
  ])('refuses what only looks like an image', (data) => {
    expect(imageKindOf(data)).toBeNull();
  });

  it('has no type for unknown extensions', () => {
    expect(contentTypeForExtension('svg')).toBeNull();
  });
});

describe('prepareImage', () => {
  it.each(['png', 'jpeg', 'gif', 'webp'] as const)('turns a %s into WebP', async (format) => {
    const result = await prepareImage(await picture(64, 48, format));

    expect(result).toMatchObject({ image: { kind: WEBP, width: 64, height: 48 } });
    expect('image' in result && imageKindOf(result.image.bytes)).toEqual(WEBP);
  });

  it('shrinks anything larger than Full HD and keeps the shape', async () => {
    await expect(prepareImage(await picture(4000, 3000))).resolves.toMatchObject({
      image: { width: 1440, height: 1080 },
    });
    await expect(prepareImage(await picture(3840, 1000))).resolves.toMatchObject({
      image: { width: 1920, height: 500 },
    });
  });

  it('refuses uploads of 5 MB or more before converting', async () => {
    const big = new Uint8Array(MAX_UPLOAD_BYTES);
    big.set([0x89, 0x50, 0x4e, 0x47]);

    await expect(prepareImage(big)).resolves.toEqual({ error: IMAGE_UPLOAD_TOO_BIG });
  });

  it('refuses a result of 2 MB or more after converting', async () => {
    await expect(
      prepareImage(await picture(64, 48), { maxUploadBytes: MAX_UPLOAD_BYTES, maxStoredBytes: 10 }),
    ).resolves.toEqual({
      error: IMAGE_STILL_TOO_BIG,
    });
  });

  it('refuses files that are not images or cannot be decoded', async () => {
    await expect(prepareImage(bytes('<svg onload="x"/>'))).resolves.toEqual({ error: IMAGE_WRONG_TYPE });
    await expect(prepareImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0]))).resolves.toEqual({
      error: IMAGE_UNREADABLE,
    });
  });
});
