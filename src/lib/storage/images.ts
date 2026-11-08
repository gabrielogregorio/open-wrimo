import sharp from 'sharp';

import { MAX_HEIGHT, MAX_STORED_BYTES, MAX_UPLOAD_BYTES, MAX_WIDTH } from './limits';

export { MAX_UPLOAD_BYTES } from './limits';
const MAX_INPUT_PIXELS = 40_000_000;
const WEBP_QUALITY = 70;
export const AVATAR_SIZE = 512;

export const IMAGE_UPLOAD_TOO_BIG = 'Send an image under 5 MB.';
export const IMAGE_WRONG_TYPE = 'Use a PNG, JPEG, WebP or GIF image.';
export const IMAGE_UNREADABLE = 'This image could not be read.';
export const IMAGE_STILL_TOO_BIG = 'The image is still 2 MB or more after converting to WebP.';

const ascii = (bytes: Uint8Array, from: number, to: number): string => String.fromCharCode(...bytes.slice(from, to));

const SIGNATURES = [
  {
    contentType: 'image/png',
    extension: 'png',
    matches: (bytes: Uint8Array) => bytes[0] === 0x89 && ascii(bytes, 1, 4) === 'PNG',
  },
  {
    contentType: 'image/jpeg',
    extension: 'jpg',
    matches: (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  { contentType: 'image/gif', extension: 'gif', matches: (bytes: Uint8Array) => ascii(bytes, 0, 4) === 'GIF8' },
  {
    contentType: 'image/webp',
    extension: 'webp',
    matches: (bytes: Uint8Array) => ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP',
  },
] as const;

export type ImageKind = { contentType: string; extension: string };
export const WEBP: ImageKind = { contentType: 'image/webp', extension: 'webp' };

export const imageKindOf = (bytes: Uint8Array): ImageKind | null => {
  const signature = SIGNATURES.find((candidate) => candidate.matches(bytes));

  return signature ? { contentType: signature.contentType, extension: signature.extension } : null;
};

export const contentTypeForExtension = (extension: string): string | null =>
  SIGNATURES.find((signature) => signature.extension === extension)?.contentType ?? null;

export type PreparedImage = { bytes: Uint8Array; kind: ImageKind; width: number; height: number };
export type ImageLimits = { maxUploadBytes: number; maxStoredBytes: number };
/** `avatar` is cropped to a square, since it is only ever shown small and round; `free` keeps the shape. */
export type ImageShape = 'free' | 'avatar';

const DEFAULT_LIMITS: ImageLimits = { maxUploadBytes: MAX_UPLOAD_BYTES, maxStoredBytes: MAX_STORED_BYTES };

// A still avatar is cropped around what draws the eye (usually a face); sharp can only centre an animation.
const sizeFor = (shape: ImageShape, animated: boolean) =>
  shape === 'avatar'
    ? { width: AVATAR_SIZE, height: AVATAR_SIZE, fit: 'cover' as const, position: animated ? 'centre' : 'attention' }
    : { width: MAX_WIDTH, height: MAX_HEIGHT, fit: 'inside' as const, withoutEnlargement: true };

/**
 * Turns an upload into a WebP: upright by its EXIF, at most Full HD (avatars a 512 px square), quality 70,
 * without metadata such as GPS. Animated GIFs and WebPs keep every frame.
 */
export const prepareImage = async (
  bytes: Uint8Array,
  { shape = 'free', limits = DEFAULT_LIMITS }: { shape?: ImageShape; limits?: ImageLimits } = {},
): Promise<{ image: PreparedImage } | { error: string }> => {
  if (bytes.byteLength >= limits.maxUploadBytes) {
    return { error: IMAGE_UPLOAD_TOO_BIG };
  }

  if (!imageKindOf(bytes)) {
    return { error: IMAGE_WRONG_TYPE };
  }

  try {
    const image = sharp(bytes, { animated: true, limitInputPixels: MAX_INPUT_PIXELS });
    const { pages = 1 } = await image.metadata();
    const { data, info } = await image
      .rotate()
      .resize(sizeFor(shape, pages > 1))
      .webp({ quality: WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });

    if (data.byteLength >= limits.maxStoredBytes) {
      return { error: IMAGE_STILL_TOO_BIG };
    }

    // An animation reports the height of all its frames stacked; one frame is what the page shows.
    const height = info.pageHeight ?? info.height;

    return { image: { bytes: new Uint8Array(data), kind: WEBP, width: info.width, height } };
  } catch {
    return { error: IMAGE_UNREADABLE };
  }
};
