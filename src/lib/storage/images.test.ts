import {
  IMAGE_TOO_BIG,
  IMAGE_WRONG_TYPE,
  MAX_IMAGE_BYTES,
  checkImage,
  contentTypeForExtension,
  imageKindOf,
} from './images';

const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);

describe('image checks', () => {
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
    expect(checkImage(data)).toEqual({ error: IMAGE_WRONG_TYPE });
  });

  it('refuses anything over 2 MB and unknown extensions', () => {
    expect(checkImage(new Uint8Array(MAX_IMAGE_BYTES + 1))).toEqual({ error: IMAGE_TOO_BIG });
    expect(checkImage(bytes('GIF89a'))).toEqual({ kind: { contentType: 'image/gif', extension: 'gif' } });
    expect(contentTypeForExtension('svg')).toBeNull();
  });
});
