import type { ImageKind } from './images';

export type StoredImage = { url: string; key: string };

export type ImageStorage = {
  save: (image: { bytes: Uint8Array; kind: ImageKind; folder: string }) => Promise<StoredImage>;
  remove: (key: string) => Promise<void>;
};

/** Every kind of image. Each account keeps its own folder inside each kind: `<kind>/<userId>/<file>`. */
export const IMAGE_FOLDERS = ['covers', 'avatars', 'posts', 'inline'] as const;
export type ImageFolder = (typeof IMAGE_FOLDERS)[number];

export const ownerFolder = (kind: ImageFolder, userId: string): string => `${kind}/${userId}`;

/**
 * Storage that can also copy one image and empty one account's folder, for deleting an account
 * and for bringing images uploaded before folders were per account into their owner's folder.
 * `removeFolder` takes a folder such as `covers/<userId>`; the others take keys as `save` returned them.
 */
export type OwnedImageStorage = ImageStorage & {
  /** Makes a second image at `toKey` and leaves the original where it was. */
  copy: (key: string, toKey: string) => Promise<StoredImage>;
  removeFolder: (folder: string) => Promise<void>;
  /** The address an image is served at, read from its key. */
  urlFor: (key: string) => string;
};
