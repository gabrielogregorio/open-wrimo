import sharp from 'sharp';

import { MAX_HEIGHT, MAX_STORED_BYTES, MAX_UPLOAD_BYTES, MAX_WIDTH } from './limits';

export { MAX_UPLOAD_BYTES } from './limits';
const MAX_INPUT_PIXELS = 40_000_000;
const WEBP_QUALITY = 82;

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

const DEFAULT_LIMITS: ImageLimits = { maxUploadBytes: MAX_UPLOAD_BYTES, maxStoredBytes: MAX_STORED_BYTES };

export const prepareImage = async (
  bytes: Uint8Array,
  limits: ImageLimits = DEFAULT_LIMITS,
): Promise<{ image: PreparedImage } | { error: string }> => {
  if (bytes.byteLength >= limits.maxUploadBytes) {
    return { error: IMAGE_UPLOAD_TOO_BIG };
  }

  if (!imageKindOf(bytes)) {
    return { error: IMAGE_WRONG_TYPE };
  }

  try {
    const { data, info } = await sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS })
      .rotate()
      .resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });

    if (data.byteLength >= limits.maxStoredBytes) {
      return { error: IMAGE_STILL_TOO_BIG };
    }

    return { image: { bytes: new Uint8Array(data), kind: WEBP, width: info.width, height: info.height } };
  } catch {
    return { error: IMAGE_UNREADABLE };
  }
};
