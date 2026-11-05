import type { ImageKind } from './images';

export type StoredImage = { url: string; key: string };

export type ImageStorage = {
  save: (image: { bytes: Uint8Array; kind: ImageKind; folder: string }) => Promise<StoredImage>;
  remove: (key: string) => Promise<void>;
};
