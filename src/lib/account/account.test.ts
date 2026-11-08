import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db/collections';
import type { OwnedImageStorage } from '@/lib/storage/storage';
import { startTestDatabase, type TestDatabase } from '@/test/mongo';
import { TERMS_VERSION } from '@/lib/legal/terms';
import {
  accountBlock,
  createAccessLog,
  createAccountRepository,
  deletionState,
  listPendingDeletions,
  purgeAccount,
  type AccountRepository,
} from './account';

const NOW = new Date('2026-11-08T12:00:00.000Z');
const DAY = 86_400_000;

describe('deletionState', () => {
  it('is none without a request, grace for 30 days and closed after', () => {
    expect(deletionState(null, NOW)).toBe('none');
    expect(deletionState(undefined, NOW)).toBe('none');
    expect(deletionState(new Date(NOW.getTime() - 29 * DAY), NOW)).toBe('grace');
    expect(deletionState(new Date(NOW.getTime() - 30 * DAY), NOW)).toBe('closed');
  });
});

describe('accountBlock', () => {
  const status = { termsVersion: TERMS_VERSION, termsAcceptedAt: NOW, deletionRequestedAt: null, isAdmin: false };

  it('lets a live account with the terms in force write', () => {
    expect(accountBlock(status)).toBeNull();
  });

  it('blocks a missing account, one waiting for deletion and one with old terms, in that order', () => {
    expect(accountBlock(null)).toBe('gone');
    expect(accountBlock({ ...status, termsVersion: 'old', deletionRequestedAt: NOW })).toBe('deletion');
    expect(accountBlock({ ...status, termsVersion: 'old' })).toBe('terms');
    expect(accountBlock({ ...status, termsVersion: null })).toBe('terms');
  });
});

describe('account', () => {
  let testDatabase: TestDatabase;
  let account: AccountRepository;

  const addUser = async (email: string, extra: Record<string, unknown> = {}): Promise<string> => {
    const { insertedId } = await collections(testDatabase.database).users.insertOne({
      email,
      username: email.split('@')[0],
      name: 'Writer',
      passwordHash: 'hash',
      createdAt: NOW,
      ...extra,
    });

    return insertedId.toHexString();
  };

  beforeAll(async () => {
    testDatabase = await startTestDatabase();
    account = createAccountRepository(testDatabase.database);
  });

  afterAll(async () => {
    await testDatabase.stop();
  });

  it('reads the status, records the accepted terms and the deletion request', async () => {
    const userId = await addUser('ana@example.com');
    await collections(testDatabase.database).sessions.insertOne({
      tokenHash: 'session-ana',
      userId: new ObjectId(userId),
      familyId: 'family',
      usedAt: null,
      createdAt: NOW,
      expiresAt: new Date(NOW.getTime() + DAY),
    });

    expect(await account.status(userId)).toEqual({
      termsVersion: null,
      termsAcceptedAt: null,
      deletionRequestedAt: null,
      isAdmin: false,
    });

    await account.acceptTerms(userId, 'v2', NOW);
    await account.requestDeletion(userId, NOW);

    expect(await account.status(userId)).toEqual({
      termsVersion: 'v2',
      termsAcceptedAt: NOW,
      deletionRequestedAt: NOW,
      isAdmin: false,
    });
    expect(await collections(testDatabase.database).sessions.countDocuments({ userId: new ObjectId(userId) })).toBe(0);

    await account.cancelDeletion(userId);

    expect((await account.status(userId))?.deletionRequestedAt).toBeNull();
  });

  it('knows an admin only by the flag set in the database and ignores unknown ids', async () => {
    const adminId = await addUser('admin@example.com', { isAdmin: true });

    expect((await account.status(adminId))?.isAdmin).toBe(true);
    expect(await account.status('not-an-id')).toBeNull();
    expect(await account.status(new ObjectId().toHexString())).toBeNull();
    await account.acceptTerms('bad', 'v1', NOW);
    await account.requestDeletion('bad', NOW);
    await account.cancelDeletion('bad');
  });

  it('keeps access records for six months, with the uploaded image key when there is one', async () => {
    const userId = await addUser('logs@example.com');
    const log = createAccessLog(testDatabase.database);
    await log.record({ userId, action: 'login', address: '203.0.113.7', userAgent: 'Firefox' }, NOW);
    await log.record({ userId: null, action: 'register', address: null, userAgent: '' }, NOW);
    await log.record({ userId, action: 'upload', address: null, userAgent: 'Chrome', detail: 'inline/a.webp' }, NOW);
    const records = await collections(testDatabase.database).accessLogs.find({}).sort({ _id: 1 }).toArray();

    expect(
      records.slice(-3).map(({ action, address, detail, userId: owner }) => ({
        action,
        address,
        detail,
        owner: owner?.toHexString() ?? null,
      })),
    ).toEqual([
      { action: 'login', address: '203.0.113.7', detail: undefined, owner: userId },
      { action: 'register', address: null, detail: undefined, owner: null },
      { action: 'upload', address: null, detail: 'inline/a.webp', owner: userId },
    ]);
    expect((records.at(-1)?.expiresAt.getTime() ?? 0) - NOW.getTime()).toBe(183 * DAY);
  });

  it('also deletes old editor images found in the texts, but never one another account uses or uploaded', async () => {
    const database = testDatabase.database;
    const { projects, profiles, posts } = collections(database);
    const goneId = await addUser('old@example.com', { deletionRequestedAt: new Date(NOW.getTime() - 31 * DAY) });
    const otherId = await addUser('other@example.com');
    const gone = new ObjectId(goneId);
    const cloud = 'https://res.cloudinary.com/demo/image/upload/v17/openwrimo/inline/abc.webp';
    const img = (src: string) => `<img src="${src}" alt="">`;
    const othersNew = `/media/inline/${otherId}/new.webp`;

    await projects.insertOne({
      userId: gone,
      coverKey: null,
      excerpt: `<p>a</p>${img('/media/inline/old.webp')}${img(cloud)}${img('/media/inline/theirs.webp')}${img(othersNew)}`,
    } as never);
    await projects.insertOne({ userId: gone, coverKey: null, excerpt: img('/media/inline/old.webp') } as never);
    await profiles.insertOne({ userId: gone, avatarKey: null, bio: img('/media/inline/bio.webp') } as never);
    await posts.insertOne({
      userId: gone,
      imageKey: null,
      body: `${img('/media/inline/post.webp')}${img('/media/inline/logged.webp')}${img('/media/covers/c.webp')}`,
    } as never);
    await projects.insertOne({ userId: new ObjectId(otherId), excerpt: img('/media/inline/theirs.webp') } as never);
    await createAccessLog(database).record(
      { userId: otherId, action: 'upload', address: null, userAgent: '', detail: 'inline/logged.webp' },
      NOW,
    );
    await createAccessLog(database).record(
      { userId: goneId, action: 'upload', address: null, userAgent: '', detail: 'inline/old.webp' },
      NOW,
    );

    await collections(database).imageMigrations.insertOne({
      userId: gone,
      fromKey: 'covers/copied.webp',
      fromUrl: '/media/covers/copied.webp',
      toKey: `covers/${goneId}/copied.webp`,
      toUrl: `/media/covers/${goneId}/copied.webp`,
      copiedAt: NOW,
    });
    const removed: string[] = [];
    const emptied: string[] = [];
    const storage: OwnedImageStorage = {
      save: vi.fn(),
      copy: vi.fn(),
      urlFor: (key: string) => key,
      remove: async (key) => void removed.push(key),
      removeFolder: async (folder) => void emptied.push(folder),
    };

    expect(await purgeAccount(database, storage, goneId, NOW)).toEqual({ deleted: true, images: 5 });
    expect(await collections(database).imageMigrations.countDocuments({ userId: gone })).toBe(0);
    expect(removed.sort()).toEqual([
      'covers/copied.webp',
      'inline/bio.webp',
      'inline/old.webp',
      'inline/post.webp',
      'openwrimo/inline/abc',
    ]);
    expect(await projects.countDocuments({ userId: new ObjectId(otherId) })).toBe(1);
    expect(emptied.sort()).toEqual([`avatars/${goneId}`, `covers/${goneId}`, `inline/${goneId}`, `posts/${goneId}`]);
  });

  it('previews the accounts waiting for deletion and purges one by hand only after the grace period', async () => {
    const database = testDatabase.database;
    const { users } = collections(database);
    await users.updateMany({ deletionRequestedAt: { $exists: true } }, { $unset: { deletionRequestedAt: '' } });
    const goneId = await addUser('gone@example.com', { deletionRequestedAt: new Date(NOW.getTime() - 31 * DAY) });
    const lateId = await addUser('late@example.com', { deletionRequestedAt: new Date(NOW.getTime() - 200 * DAY) });
    const waitingId = await addUser('waiting@example.com', { deletionRequestedAt: new Date(NOW.getTime() - DAY) });
    const gone = new ObjectId(goneId);
    const { projects, profiles, posts, goals, entries } = collections(database);
    await projects.insertOne({ userId: gone, coverKey: 'covers/c.webp' } as never);
    await projects.insertOne({ userId: gone, coverKey: null } as never);
    await profiles.insertOne({ userId: gone, avatarKey: 'avatars/a.webp' } as never);
    await posts.insertOne({ userId: gone, imageKey: 'posts/p.webp' } as never);
    await goals.insertOne({ userId: gone } as never);
    await entries.insertOne({ userId: gone } as never);
    await createAccessLog(database).record(
      { userId: goneId, action: 'upload', address: null, userAgent: '', detail: 'inline/i.webp' },
      NOW,
    );

    const preview = await listPendingDeletions(database, NOW);

    expect(preview.map((item) => [item.username, item.state, item.overdue])).toEqual([
      ['late', 'closed', true],
      ['gone', 'closed', false],
      ['waiting', 'grace', false],
    ]);
    expect(preview[1]).toMatchObject({
      email: 'gone@example.com',
      graceEndsAt: new Date(NOW.getTime() - DAY),
      deadline: new Date(NOW.getTime() + 149 * DAY),
      counts: { novels: 2, goals: 1, entries: 1, posts: 1, images: 4, profile: true },
    });
    expect(preview[2].counts).toEqual({ novels: 0, goals: 0, entries: 0, posts: 0, images: 0, profile: false });

    const removed: string[] = [];
    const storage: OwnedImageStorage = {
      save: vi.fn(),
      copy: vi.fn(),
      urlFor: (key: string) => key,
      removeFolder: async () => undefined,
      remove: async (key) => {
        removed.push(key);

        if (key === 'posts/p.webp') {
          throw new Error('already gone');
        }
      },
    };

    expect(await purgeAccount(database, storage, waitingId, NOW)).toEqual({ deleted: false, images: 0 });
    expect(await purgeAccount(database, storage, 'not-an-id', NOW)).toEqual({ deleted: false, images: 0 });
    expect(await purgeAccount(database, storage, goneId, NOW)).toEqual({ deleted: true, images: 4 });
    expect(removed.sort()).toEqual(['avatars/a.webp', 'covers/c.webp', 'inline/i.webp', 'posts/p.webp']);
    expect(await users.findOne({ _id: gone })).toBeNull();
    expect(await projects.countDocuments({ userId: gone })).toBe(0);
    expect(await users.findOne({ _id: new ObjectId(waitingId) })).not.toBeNull();
    expect(await purgeAccount(database, storage, goneId, NOW)).toEqual({ deleted: false, images: 0 });
    expect(await purgeAccount(database, storage, lateId, NOW)).toEqual({ deleted: true, images: 0 });
  });
});
