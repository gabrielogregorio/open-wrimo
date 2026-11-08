import { IMAGE_FOLDERS } from './storage';

// Keys look like `<kind>/<file>` on the local disk and `<root>/<kind>/<file>` on Cloudinary, with the
// owner's account id between kind and file since 0.2.1: `<kind>/<userId>/<file>`.
const KIND = `(?:${IMAGE_FOLDERS.join('|')})`;
const OWNED_KEY = new RegExp(`(?:^|/)${KIND}/([a-f\\d]{24})/[\\w-]+(?:\\.\\w+)?$`);
const LEGACY_KEY = new RegExp(`^((?:.*/)?${KIND})/([\\w-]+(?:\\.\\w+)?)$`);
const LOCAL_INLINE_IMAGE = /^\/media\/(inline\/(?:[a-f\d]{24}\/)?[\w-]+\.webp)$/;
const CLOUDINARY_IMAGE = /^https:\/\/res\.cloudinary\.com\/[\w-]+\/image\/upload\/(?:v\d+\/)?([\w/-]+)\.\w+$/;
const INLINE_FILE = /(?:^|\/)inline\/(?:[a-f\d]{24}\/)?[\w-]+$/;

/** The account a key belongs to, read from its folder; null for images uploaded before 0.2.1. */
export const keyOwner = (key: string): string | null => OWNED_KEY.exec(key)?.[1] ?? null;

/** Where an image uploaded before 0.2.1 goes inside its owner's folder; null when it is already there. */
export const ownedKey = (key: string, userId: string): string | null => {
  const legacy = LEGACY_KEY.exec(key);

  return legacy ? `${legacy[1]}/${userId}/${legacy[2]}` : null;
};

/** The storage key of an image added through the text editor, read from its address; null for anything else. */
export const inlineImageKey = (url: string): string | null => {
  const local = LOCAL_INLINE_IMAGE.exec(url);

  if (local) {
    return local[1];
  }

  const cloud = CLOUDINARY_IMAGE.exec(url);

  return cloud && INLINE_FILE.test(cloud[1]) ? cloud[1] : null;
};

const IMAGE_SOURCE = /<img\b[^>]*?\bsrc="([^"]+)"/gi;

/** The editor images shown in a text, by key. */
export const inlineKeysIn = (html: string | undefined): string[] =>
  [...(html ?? '').matchAll(IMAGE_SOURCE)].flatMap((match) => inlineImageKey(match[1]) ?? []);

/** The text with every image of one key pointing to its new address. */
export const replaceImage = (html: string, key: string, url: string): string =>
  html.replace(IMAGE_SOURCE, (tag: string, source: string) =>
    inlineImageKey(source) === key ? tag.replace(`src="${source}"`, `src="${url}"`) : tag,
  );
