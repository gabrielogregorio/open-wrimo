import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db/collections';
import { startTestDatabase, type TestDatabase } from '@/test/mongo';
import { createLocalStorage } from './local';
import { applyImageOwners, planImageOwners, removeOldImages, undoImageOwners } from './owner-migration';

const NOW = new Date('2026-11-08T12:00:00.000Z');
const img = (key: string) => `<img src="/media/${key}" alt="">`;

describe('moving old images into owner folders', () => {
  let testDatabase: TestDatabase;
  let directory: string;

  beforeAll(async () => {
    testDatabase = await startTestDatabase();
  });

  afterAll(async () => {
    await testDatabase.stop();
  });

  const file = async (key: string): Promise<void> => {
    await mkdir(dirname(join(directory, key)), { recursive: true });
    await writeFile(join(directory, key), new Uint8Array([1, 2, 3]));
  };

  it('plans by owner, moves the files, rewrites every address and can run again', async () => {
    directory = await mkdtemp(join(tmpdir(), 'openwrimo-migration-'));
    const { projects, profiles, posts, accessLogs } = collections(testDatabase.database);
    const ana = new ObjectId();
    const bia = new ObjectId();
    const [a, b] = [ana.toHexString(), bia.toHexString()];

    for (const key of [
      'covers/c.webp',
      'avatars/v.webp',
      'posts/p.webp',
      'inline/mine.webp',
      'inline/hers.webp',
      'inline/both.webp',
    ]) {
      await file(key);
    }

    await projects.insertOne({
      userId: ana,
      coverKey: 'covers/c.webp',
      coverUrl: '/media/covers/c.webp',
      excerpt: `${img('inline/mine.webp')}${img('inline/hers.webp')}${img('inline/both.webp')}${img('inline/gone.webp')}`,
    } as never);
    await projects.insertOne({ userId: ana, coverKey: `covers/${a}/new.webp`, excerpt: '' } as never);
    await profiles.insertOne({
      userId: bia,
      avatarKey: 'avatars/v.webp',
      avatarUrl: '/media/avatars/v.webp',
      bio: `${img('inline/hers.webp')}${img('inline/both.webp')}`,
    } as never);
    await posts.insertOne({
      userId: ana,
      imageKey: 'posts/p.webp',
      imageUrl: '/media/posts/p.webp',
      body: img('inline/mine.webp'),
    } as never);
    await accessLogs.insertMany([
      {
        userId: bia,
        action: 'upload',
        detail: 'inline/hers.webp',
        address: null,
        userAgent: '',
        createdAt: NOW,
        expiresAt: NOW,
      },
      {
        userId: ana,
        action: 'upload',
        detail: 'covers/c.webp',
        address: null,
        userAgent: '',
        createdAt: NOW,
        expiresAt: NOW,
      },
      {
        userId: null,
        action: 'upload',
        detail: 'inline/x.webp',
        address: null,
        userAgent: '',
        createdAt: NOW,
        expiresAt: NOW,
      },
    ]);

    const plan = await planImageOwners(testDatabase.database);

    expect(plan.moves.map(({ key, toKey, source }) => [key, toKey, source]).sort()).toEqual(
      [
        ['avatars/v.webp', `avatars/${b}/v.webp`, 'avatar'],
        ['covers/c.webp', `covers/${a}/c.webp`, 'cover'],
        ['inline/gone.webp', `inline/${a}/gone.webp`, 'editor image'],
        ['inline/hers.webp', `inline/${b}/hers.webp`, 'editor image'],
        ['inline/mine.webp', `inline/${a}/mine.webp`, 'editor image'],
        ['posts/p.webp', `posts/${a}/p.webp`, 'post image'],
      ].sort(),
    );
    expect(plan.unassigned).toEqual([{ key: 'inline/both.webp', userIds: [a, b].sort() }]);

    const progress: number[] = [];
    const storage = createLocalStorage(directory);
    const result = await applyImageOwners(testDatabase.database, storage, plan, (done) => progress.push(done));

    expect(result.done).toHaveLength(5);
    expect(result.failed).toEqual([{ key: 'inline/gone.webp', error: expect.stringContaining('ENOENT') }]);
    expect(progress).toEqual([1, 2, 3, 4, 5, 6]);

    const cover = await projects.findOne({ userId: ana, coverKey: `covers/${a}/c.webp` });
    expect(cover).toMatchObject({ coverUrl: `/media/covers/${a}/c.webp` });
    const [aMine, bHers] = [img(`inline/${a}/mine.webp`), img(`inline/${b}/hers.webp`)];
    expect(cover?.excerpt).toBe(aMine + bHers + img('inline/both.webp') + img('inline/gone.webp'));
    expect(await profiles.findOne({ userId: bia })).toMatchObject({
      avatarKey: `avatars/${b}/v.webp`,
      avatarUrl: `/media/avatars/${b}/v.webp`,
      bio: bHers + img('inline/both.webp'),
    });
    expect(await posts.findOne({ userId: ana })).toMatchObject({
      imageKey: `posts/${a}/p.webp`,
      body: img(`inline/${a}/mine.webp`),
    });
    expect(await accessLogs.countDocuments({ detail: `covers/${a}/c.webp` })).toBe(1);
    await expect(storage.read(`inline/${b}/hers.webp`)).resolves.not.toBeNull();
    await expect(storage.read('inline/hers.webp')).resolves.not.toBeNull();
    const { imageMigrations } = collections(testDatabase.database);
    expect(await imageMigrations.findOne({ fromKey: 'covers/c.webp' })).toMatchObject({
      userId: ana,
      fromUrl: '/media/covers/c.webp',
      toKey: `covers/${a}/c.webp`,
      toUrl: `/media/covers/${a}/c.webp`,
    });
    expect((await imageMigrations.findOne({ fromKey: 'inline/hers.webp' }))?.fromUrl).toBe('/media/inline/hers.webp');
    expect((await imageMigrations.findOne({ fromKey: 'posts/p.webp' }))?.fromUrl).toBe('/media/posts/p.webp');
    expect(await imageMigrations.countDocuments()).toBe(5);

    const again = await planImageOwners(testDatabase.database);
    expect(again.moves.map((move) => move.key)).toEqual(['inline/gone.webp']);
    expect(again.unassigned).toHaveLength(1);

    const undone = await undoImageOwners(testDatabase.database, storage);
    expect(undone).toEqual({ done: expect.any(Array), failed: [] });
    expect(await projects.findOne({ userId: ana, coverKey: 'covers/c.webp' })).toMatchObject({
      coverUrl: '/media/covers/c.webp',
      excerpt: img('inline/mine.webp') + img('inline/hers.webp') + img('inline/both.webp') + img('inline/gone.webp'),
    });
    expect(await profiles.findOne({ userId: bia })).toMatchObject({ avatarKey: 'avatars/v.webp' });
    await expect(storage.read(`covers/${a}/c.webp`)).resolves.toBeNull();
    expect(await imageMigrations.countDocuments()).toBe(0);

    await applyImageOwners(testDatabase.database, storage, await planImageOwners(testDatabase.database));
    const removed = await removeOldImages(testDatabase.database, storage);
    expect(removed.done.sort()).toEqual([
      'avatars/v.webp',
      'covers/c.webp',
      'inline/hers.webp',
      'inline/mine.webp',
      'posts/p.webp',
    ]);
    await expect(storage.read('covers/c.webp')).resolves.toBeNull();
    await expect(storage.read(`covers/${a}/c.webp`)).resolves.not.toBeNull();
    expect(await imageMigrations.countDocuments()).toBe(0);
  });

  it('plans a key used by two documents only once and skips documents without an image', async () => {
    const { projects } = collections(testDatabase.database);
    await projects.deleteMany({});
    const ana = new ObjectId();
    await projects.insertMany([
      { userId: ana, coverKey: 'covers/twice.webp', excerpt: '' },
      { userId: ana, coverKey: 'covers/twice.webp', excerpt: '' },
      { userId: ana, coverKey: null, excerpt: '' },
    ] as never);

    const plan = await planImageOwners(testDatabase.database);

    expect(plan.moves.filter((move) => move.key === 'covers/twice.webp')).toHaveLength(1);
  });

  it('reports anything thrown, and needs no progress callback', async () => {
    const offline = vi.fn(async () => Promise.reject('offline'));
    const storage = {
      save: vi.fn(),
      remove: offline,
      removeFolder: vi.fn(),
      copy: offline,
      urlFor: (key: string) => `/x/${key}`,
    };
    const plan = {
      moves: [
        { key: 'covers/z.webp', toKey: 'covers/u/z.webp', userId: new ObjectId().toHexString(), source: 'cover' },
      ],
      unassigned: [],
    };
    const failed = { done: [], failed: [{ key: 'covers/z.webp', error: 'offline' }] };

    await expect(applyImageOwners(testDatabase.database, storage, plan)).resolves.toEqual(failed);

    const { imageMigrations } = collections(testDatabase.database);
    await imageMigrations.insertOne({
      userId: new ObjectId(),
      fromKey: 'covers/z.webp',
      fromUrl: '/x/covers/z.webp',
      toKey: 'covers/u/z.webp',
      toUrl: '/x/covers/u/z.webp',
      copiedAt: NOW,
    });
    await expect(undoImageOwners(testDatabase.database, storage)).resolves.toEqual(failed);
    await expect(removeOldImages(testDatabase.database, storage)).resolves.toEqual(failed);
    expect(await imageMigrations.countDocuments()).toBe(1);
  });

  it('falls back to the stored address of an image that no document shows', async () => {
    const { projects, imageMigrations } = collections(testDatabase.database);
    await projects.deleteMany({});
    await imageMigrations.deleteMany({});
    const storage = {
      save: vi.fn(),
      remove: vi.fn(),
      removeFolder: vi.fn(),
      copy: vi.fn(async (_key: string, toKey: string) => ({ key: toKey, url: `/x/${toKey}` })),
      urlFor: (key: string) => `/x/${key}`,
    };
    const plan = {
      moves: [
        {
          key: 'inline/lost.webp',
          toKey: 'inline/u/lost.webp',
          userId: new ObjectId().toHexString(),
          source: 'editor image',
        },
      ],
      unassigned: [],
    };

    await applyImageOwners(testDatabase.database, storage, plan);

    expect(await imageMigrations.findOne({ fromKey: 'inline/lost.webp' })).toMatchObject({
      fromUrl: '/x/inline/lost.webp',
    });
  });
});
