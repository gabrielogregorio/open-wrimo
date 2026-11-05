export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const IMAGE_TOO_BIG = 'Use an image up to 2 MB.';
export const IMAGE_WRONG_TYPE = 'Use a PNG, JPEG, WebP or GIF image.';

const ascii = (bytes: Uint8Array, from: number, to: number): string => String.fromCharCode(...bytes.slice(from, to));

const SIGNATURES = [
  {
    contentType: 'image/png',
    extension: 'png',
    matches: (bytes: Uint8Array) => ascii(bytes, 1, 4) === 'PNG' && bytes[0] === 0x89,
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

export const imageKindOf = (bytes: Uint8Array): ImageKind | null => {
  const signature = SIGNATURES.find((candidate) => candidate.matches(bytes));

  return signature ? { contentType: signature.contentType, extension: signature.extension } : null;
};

export const contentTypeForExtension = (extension: string): string | null =>
  SIGNATURES.find((signature) => signature.extension === extension)?.contentType ?? null;

export type ImageCheck = { kind: ImageKind; error?: never } | { kind?: never; error: string };

export const checkImage = (bytes: Uint8Array): ImageCheck => {
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    return { error: IMAGE_TOO_BIG };
  }

  const kind = imageKindOf(bytes);

  return kind ? { kind } : { error: IMAGE_WRONG_TYPE };
};
