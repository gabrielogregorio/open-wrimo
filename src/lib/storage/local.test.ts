import { mkdtemp, readdir, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLocalStorage } from './local';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2]);
const KIND = { contentType: 'image/png', extension: 'png' };

describe('createLocalStorage', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'openwrimo-uploads-'));
  });

  it('saves under the folder, serves and removes the file', async () => {
    const storage = createLocalStorage(directory);
    const saved = await storage.save({ bytes: PNG, kind: KIND, folder: 'covers' });

    expect(saved.key).toMatch(/^covers\/[0-9a-f-]{36}\.png$/);
    expect(saved.url).toBe(`/media/${saved.key}`);
    await expect(readdir(join(directory, 'covers'))).resolves.toHaveLength(1);
    await expect(storage.read(saved.key)).resolves.toEqual({ bytes: PNG, contentType: 'image/png' });

    await storage.remove(saved.key);
    await expect(readdir(join(directory, 'covers'))).resolves.toHaveLength(0);
    await expect(storage.read(saved.key)).resolves.toBeNull();
    await expect(storage.remove(saved.key)).resolves.toBeUndefined();
  });

  it.each(['../secret.png', 'covers/../../x.png', '/etc/passwd', 'covers/a.svg', 'covers/a b.png'])(
    'ignores the unsafe key %s',
    async (key) => {
      const storage = createLocalStorage(directory);

      await expect(storage.read(key)).resolves.toBeNull();
      await expect(storage.remove(key)).resolves.toBeUndefined();
    },
  );

  it('reports disk errors other than a missing file', async () => {
    const storage = createLocalStorage(directory);
    await mkdir(join(directory, 'covers', 'folder.png'), { recursive: true });

    await expect(storage.read('covers/folder.png')).rejects.toThrow();
    await expect(storage.remove('covers/folder.png')).rejects.toThrow();
    await writeFile(join(directory, 'covers', 'kept.png'), PNG);
    await expect(storage.read('covers/kept.png')).resolves.toMatchObject({ contentType: 'image/png' });
  });

  it('copies an image into an owner folder, keeps the original and empties that folder', async () => {
    const storage = createLocalStorage(directory);
    const saved = await storage.save({ bytes: PNG, kind: KIND, folder: 'covers' });
    const owner = '0123456789abcdef01234567';
    const toKey = saved.key.replace('covers/', `covers/${owner}/`);

    await expect(storage.copy(saved.key, toKey)).resolves.toEqual({ key: toKey, url: `/media/${toKey}` });
    await expect(storage.read(saved.key)).resolves.toEqual({ bytes: PNG, contentType: 'image/png' });
    await expect(storage.read(toKey)).resolves.toEqual({ bytes: PNG, contentType: 'image/png' });
    expect(storage.urlFor(toKey)).toBe(`/media/${toKey}`);

    await storage.removeFolder(`covers/${owner}`);
    await expect(storage.read(toKey)).resolves.toBeNull();
    await expect(storage.removeFolder(`covers/${owner}`)).resolves.toBeUndefined();
  });

  it('refuses to copy to or from an unsafe key and to empty a whole kind or a folder outside', async () => {
    const storage = createLocalStorage(directory);
    const saved = await storage.save({ bytes: PNG, kind: KIND, folder: 'covers' });

    await expect(storage.copy(saved.key, '../x.png')).rejects.toThrow('Cannot copy');
    await expect(storage.copy('../x.png', 'covers/x.png')).rejects.toThrow('Cannot copy');

    await storage.removeFolder('covers');
    await storage.removeFolder('covers/../..');
    await expect(storage.read(saved.key)).resolves.toEqual({ bytes: PNG, contentType: 'image/png' });
  });
});
