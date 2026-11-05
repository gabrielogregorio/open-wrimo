import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { contentTypeForExtension } from './images';
import type { ImageStorage } from './storage';

export const LOCAL_MEDIA_PATH = '/media';
const SAFE_KEY = /^[\w-]+(?:\/[\w-]+)*\.(png|jpg|gif|webp)$/;

const isMissing = (error: unknown): boolean => (error as NodeJS.ErrnoException).code === 'ENOENT';

export const createLocalStorage = (directory: string) => {
  const root = resolve(directory);
  const pathFor = (key: string): string | null => {
    const path = resolve(join(root, key));

    return SAFE_KEY.test(key) && path.startsWith(`${root}${sep}`) ? path : null;
  };

  const storage: ImageStorage & { read: (key: string) => Promise<{ bytes: Uint8Array; contentType: string } | null> } =
    {
      async save({ bytes, kind, folder }) {
        const key = `${folder}/${randomUUID()}.${kind.extension}`;
        const path = join(root, key);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, bytes);

        return { key, url: `${LOCAL_MEDIA_PATH}/${key}` };
      },

      async remove(key) {
        const path = pathFor(key);

        if (path) {
          await unlink(path).catch((error: unknown) => {
            if (!isMissing(error)) {
              throw error;
            }
          });
        }
      },

      async read(key) {
        const path = pathFor(key);

        if (!path) {
          return null;
        }

        try {
          return {
            bytes: new Uint8Array(await readFile(path)),
            contentType: contentTypeForExtension(key.split('.').pop()!)!,
          };
        } catch (error) {
          if (isMissing(error)) {
            return null;
          }

          throw error;
        }
      },
    };

  return storage;
};
