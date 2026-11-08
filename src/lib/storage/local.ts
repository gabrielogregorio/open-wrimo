import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { contentTypeForExtension } from './images';
import type { OwnedImageStorage } from './storage';

export const LOCAL_MEDIA_PATH = '/media';
const SAFE_KEY = /^[\w-]+(?:\/[\w-]+)*\.(png|jpg|gif|webp)$/;
const SAFE_FOLDER = /^[\w-]+(?:\/[\w-]+)+$/;

const isMissing = (error: unknown): boolean => (error as NodeJS.ErrnoException).code === 'ENOENT';

export const createLocalStorage = (directory: string) => {
  const root = resolve(directory);
  const pathFor = (key: string): string | null => {
    const path = resolve(join(root, key));

    return SAFE_KEY.test(key) && path.startsWith(`${root}${sep}`) ? path : null;
  };
  const pathsFor = (key: string, toKey: string, action: string): [string, string] => {
    const from = pathFor(key);
    const to = pathFor(toKey);

    if (!from || !to) {
      throw new Error(`Cannot ${action} ${key} to ${toKey}`);
    }

    return [from, to];
  };

  // Only a folder at least two levels deep, such as covers/<userId>, can be emptied at once.
  const folderPath = (folder: string): string | null => {
    const path = resolve(join(root, folder));

    return SAFE_FOLDER.test(folder) && path.startsWith(`${root}${sep}`) ? path : null;
  };

  const storage: OwnedImageStorage & {
    read: (key: string) => Promise<{ bytes: Uint8Array; contentType: string } | null>;
  } = {
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

    async copy(key, toKey) {
      const [from, to] = pathsFor(key, toKey, 'copy');
      await mkdir(dirname(to), { recursive: true });
      await copyFile(from, to);

      return { key: toKey, url: storage.urlFor(toKey) };
    },

    urlFor: (key) => `${LOCAL_MEDIA_PATH}/${key}`,

    async removeFolder(folder) {
      const path = folderPath(folder);

      if (path) {
        await rm(path, { recursive: true, force: true });
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
