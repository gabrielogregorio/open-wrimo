import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db/collections';
import { startTestDatabase, type TestDatabase } from '@/test/mongo';
import {
  COMMUNITY_PAGE_SIZE,
  EMPTY_PROFILE,
  createWritingRepository,
  type NewEntry,
  type WritingRepository,
} from './repository';
import type { GoalInput, ProjectFields } from './schema';

const NOW = new Date('2026-11-05T12:00:00.000Z');
const WRITER = new ObjectId().toHexString();
const STRANGER = new ObjectId().toHexString();
const MISSING = new ObjectId().toHexString();

const PROJECT: ProjectFields = {
  title: 'Novo Livro ✨',
  status: 'in-progress',
  type: 'novel',
  genres: ['Romance', 'Japão'],
  summary: 'Two summers in Kyoto.',
  excerpt: 'The train was late.',
  pinterestUrl: '',
  playlistUrl: 'https://example.com/playlist',
  featured: false,
  isPublic: false,
  wordsBefore: 0,
};

const GOAL: GoalInput = {
  name: 'November',
  unit: 'words',
  target: 50000,
  startDate: '2026-11-01',
  endDate: '2026-11-30',
  period: null,
};

const entryFor = (projectId: string, overrides: Partial<NewEntry> = {}): NewEntry => ({
  projectId,
  unit: 'words',
  date: '2026-11-05',
  count: 500,
  mood: null,
  place: '',
  source: 'update',
  hour: 9,
  ...overrides,
});

describe('createWritingRepository', () => {
  let testDatabase: TestDatabase;
  let writing: WritingRepository;

  beforeAll(async () => {
    testDatabase = await startTestDatabase();
    writing = createWritingRepository(testDatabase.database);
  });

  afterAll(async () => {
    await testDatabase.stop();
  });

  it('keeps projects private to their writer', async () => {
    const projectId = await writing.createProject(WRITER, PROJECT, NOW);

    await expect(writing.getProject(WRITER, projectId)).resolves.toEqual({
      ...PROJECT,
      id: projectId,
      awards: [],
      coverUrl: null,
      updatedAt: NOW.toISOString(),
    });
    await expect(writing.getProject(STRANGER, projectId)).resolves.toBeNull();
    await expect(writing.getProject(WRITER, 'not-an-id')).resolves.toBeNull();
  });

  it('features one project at a time and lists it first', async () => {
    const first = await writing.createProject(WRITER, { ...PROJECT, title: 'First', featured: true }, NOW);
    const second = await writing.createProject(WRITER, { ...PROJECT, title: 'Second', featured: true }, NOW);

    expect((await writing.getProject(WRITER, first))?.featured).toBe(false);
    expect((await writing.listProjects(WRITER))[0].id).toBe(second);

    await expect(writing.updateProject(WRITER, first, { ...PROJECT, featured: true }, NOW)).resolves.toBe(true);
    expect((await writing.getProject(WRITER, second))?.featured).toBe(false);
    await expect(writing.updateProject(WRITER, second, { ...PROJECT, title: 'Plain' }, NOW)).resolves.toBe(true);
    await expect(writing.updateProject(STRANGER, first, PROJECT, NOW)).resolves.toBe(false);
    await expect(writing.updateProject(WRITER, 'bad', PROJECT, NOW)).resolves.toBe(false);
  });

  it('stores personal badges', async () => {
    const projectId = await writing.createProject(WRITER, PROJECT, NOW);

    await expect(writing.setAwards(WRITER, projectId, ['planned-plot'], NOW)).resolves.toBe(true);
    expect((await writing.getProject(WRITER, projectId))?.awards).toEqual(['planned-plot']);
    await expect(writing.setAwards(STRANGER, projectId, [], NOW)).resolves.toBe(false);
    await expect(writing.setAwards(WRITER, 'bad', [], NOW)).resolves.toBe(false);
  });

  it('points to a cover and hands back the one it replaced', async () => {
    const projectId = await writing.createProject(WRITER, PROJECT, NOW);
    const first = { url: '/media/covers/a.png', key: 'covers/a.png' };

    await expect(writing.setCover(WRITER, projectId, first, NOW)).resolves.toBeNull();
    expect((await writing.getProject(WRITER, projectId))?.coverUrl).toBe(first.url);
    await expect(writing.setCover(WRITER, projectId, null, NOW)).resolves.toBe('covers/a.png');
    expect((await writing.getProject(WRITER, projectId))?.coverUrl).toBeNull();
    await expect(writing.setCover(STRANGER, projectId, first, NOW)).resolves.toBe(false);
    await expect(writing.setCover(WRITER, 'bad', first, NOW)).resolves.toBe(false);
  });

  it('writes, edits and removes posts of a project', async () => {
    const projectId = await writing.createProject(WRITER, PROJECT, NOW);
    const image = { url: '/media/posts/p.png', key: 'posts/p.png' };
    const older = await writing.createPost(WRITER, projectId, { title: 'Day one', body: 'Started.' }, null, NOW);
    const postId = await writing.createPost(
      WRITER,
      projectId,
      { title: 'Day two', body: 'A map.' },
      image,
      new Date(NOW.getTime() + 1000),
    );

    expect((await writing.listPosts(WRITER, projectId)).map((post) => post.id)).toEqual([postId, older]);
    expect((await writing.listPosts(WRITER)).length).toBeGreaterThanOrEqual(2);
    await expect(writing.listPosts(WRITER, 'bad')).resolves.toEqual([]);
    await expect(writing.getPost(WRITER, postId!)).resolves.toMatchObject({ projectId, imageUrl: image.url });
    await expect(writing.getPost(STRANGER, postId!)).resolves.toBeNull();
    await expect(writing.getPost(WRITER, 'bad')).resolves.toBeNull();
    await expect(writing.createPost(WRITER, MISSING, { title: 'x', body: 'y' }, null, NOW)).resolves.toBeNull();
    await expect(writing.createPost(WRITER, 'bad', { title: 'x', body: 'y' }, null, NOW)).resolves.toBeNull();

    await expect(
      writing.updatePost(WRITER, postId!, { title: 'Day 2', body: 'A map.' }, undefined, NOW),
    ).resolves.toBeNull();
    expect((await writing.getPost(WRITER, postId!))?.imageUrl).toBe(image.url);
    await expect(writing.updatePost(WRITER, postId!, { title: 'Day 2', body: 'A map.' }, null, NOW)).resolves.toBe(
      'posts/p.png',
    );
    await expect(writing.updatePost(STRANGER, postId!, { title: 'x', body: 'y' }, null, NOW)).resolves.toBe(false);
    await expect(writing.updatePost(WRITER, 'bad', { title: 'x', body: 'y' }, null, NOW)).resolves.toBe(false);
    await expect(writing.removePost(STRANGER, postId!)).resolves.toBe(false);
    await expect(writing.removePost(WRITER, 'bad')).resolves.toBe(false);
    await expect(writing.removePost(WRITER, postId!)).resolves.toBeNull();
  });

  it('creates, lists, edits and removes goals', async () => {
    const projectId = await writing.createProject(WRITER, PROJECT, NOW);
    const older = await writing.createGoal(
      WRITER,
      projectId,
      { ...GOAL, startDate: '2026-04-01', endDate: '2026-04-30' },
      NOW,
    );
    const goalId = await writing.createGoal(WRITER, projectId, GOAL, NOW);

    expect(goalId).toMatch(/^[0-9a-f]{24}$/);
    expect((await writing.listGoals(WRITER, projectId)).map((goal) => goal.id)).toEqual([goalId, older]);
    expect((await writing.listGoals(WRITER)).length).toBeGreaterThanOrEqual(2);
    await expect(writing.listGoals(WRITER, 'bad')).resolves.toEqual([]);
    await expect(writing.createGoal(WRITER, MISSING, GOAL, NOW)).resolves.toBeNull();
    await expect(writing.createGoal(WRITER, 'bad', GOAL, NOW)).resolves.toBeNull();
    await expect(writing.createGoal(STRANGER, projectId, GOAL, NOW)).resolves.toBeNull();

    await expect(writing.updateGoal(WRITER, goalId!, { ...GOAL, target: 30000 })).resolves.toBe(true);
    await expect(writing.getGoal(WRITER, goalId!)).resolves.toMatchObject({ projectId, target: 30000 });
    await expect(writing.getGoal(STRANGER, goalId!)).resolves.toBeNull();
    await expect(writing.getGoal(WRITER, 'bad')).resolves.toBeNull();
    await expect(writing.updateGoal(WRITER, 'bad', GOAL)).resolves.toBe(false);
    await expect(writing.removeGoal(STRANGER, goalId!)).resolves.toBe(false);
    await expect(writing.removeGoal(WRITER, 'bad')).resolves.toBe(false);
    await expect(writing.removeGoal(WRITER, goalId!)).resolves.toBe(true);
  });

  it('logs entries newest first and filters them', async () => {
    const projectId = await writing.createProject(WRITER, PROJECT, NOW);
    const otherProject = await writing.createProject(WRITER, PROJECT, NOW);
    const first = await writing.addEntry(WRITER, entryFor(projectId, { date: '2026-11-01' }), NOW);
    const second = await writing.addEntry(WRITER, entryFor(projectId, { mood: 'proud', place: 'Café' }), NOW);
    await writing.addEntry(WRITER, entryFor(projectId, { unit: 'hours', count: 2 }), NOW);
    await writing.addEntry(WRITER, entryFor(otherProject), NOW);

    const words = await writing.listEntries(WRITER, { projectId, unit: 'words' });

    expect(words.map((entry) => entry.id)).toEqual([second, first]);
    expect(words[0]).toMatchObject({ mood: 'proud', place: 'Café', createdAt: NOW.toISOString() });
    expect(await writing.listEntries(WRITER, { projectId })).toHaveLength(3);
    expect((await writing.listEntries(WRITER)).length).toBeGreaterThanOrEqual(4);
    await expect(writing.listEntries(WRITER, { projectId: 'bad' })).resolves.toEqual([]);
    await expect(writing.listEntries(STRANGER)).resolves.toEqual([]);

    await expect(writing.removeEntry(STRANGER, first)).resolves.toBe(false);
    await expect(writing.removeEntry(WRITER, 'bad')).resolves.toBe(false);
    await expect(writing.removeEntry(WRITER, first)).resolves.toBe(true);
  });

  it('removes a project with its goals, entries and posts, and lists their images', async () => {
    const projectId = await writing.createProject(WRITER, PROJECT, NOW);
    await writing.createGoal(WRITER, projectId, GOAL, NOW);
    await writing.addEntry(WRITER, entryFor(projectId), NOW);
    await writing.setCover(WRITER, projectId, { url: '/media/c.png', key: 'covers/c.png' }, NOW);
    await writing.createPost(
      WRITER,
      projectId,
      { title: 'a', body: 'b' },
      { url: '/media/p.gif', key: 'posts/p.gif' },
      NOW,
    );
    await writing.createPost(WRITER, projectId, { title: 'c', body: 'd' }, null, NOW);

    await expect(writing.removeProject(STRANGER, projectId)).resolves.toBeNull();
    await expect(writing.removeProject(WRITER, 'bad')).resolves.toBeNull();
    await expect(writing.removeProject(WRITER, projectId)).resolves.toEqual(['covers/c.png', 'posts/p.gif']);
    await expect(writing.listGoals(WRITER, projectId)).resolves.toEqual([]);
    await expect(writing.listEntries(WRITER, { projectId })).resolves.toEqual([]);
    await expect(writing.listPosts(WRITER, projectId)).resolves.toEqual([]);
    await expect(writing.removeProject(WRITER, projectId)).resolves.toBeNull();

    const bare = await writing.createProject(WRITER, PROJECT, NOW);
    await expect(writing.removeProject(WRITER, bare)).resolves.toEqual([]);
  });

  const addWriter = async (name: string, username: string): Promise<string> => {
    const { insertedId } = await collections(testDatabase.database).users.insertOne({
      name,
      username,
      email: `${username}@example.com`,
      passwordHash: 'scrypt$hash',
      createdAt: NOW,
    });

    return insertedId.toHexString();
  };

  const PROFILE = {
    bio: 'Escrevo de madrugada.',
    location: 'Café',
    writingTime: 'À noite',
    favoriteBooks: 'Dom Casmurro',
    favoriteAuthors: 'Clarice',
    pronouns: 'she' as const,
    isPublic: true,
  };
  const ALL_SECTIONS = { bio: true, stats: true, favorites: true, badges: true };

  it('starts with an empty private profile and saves the name, username and sections', async () => {
    const userId = await addWriter('Lia', 'lia');

    await expect(writing.getProfile(userId)).resolves.toEqual(EMPTY_PROFILE);
    await collections(testDatabase.database).profiles.insertOne({
      userId: new ObjectId(userId),
      bio: '',
      location: '',
      writingTime: '',
      favoriteBooks: '',
      favoriteAuthors: '',
      avatarUrl: null,
      avatarKey: null,
      updatedAt: NOW,
    });
    await expect(writing.getProfile(userId)).resolves.toEqual(EMPTY_PROFILE);
    await expect(
      writing.saveProfile(
        userId,
        { ...PROFILE, name: 'Lia Souza', username: 'lia-souza' },
        { ...ALL_SECTIONS, stats: false },
        NOW,
      ),
    ).resolves.toBe(true);
    await expect(writing.getProfile(userId)).resolves.toEqual({
      ...PROFILE,
      avatarUrl: null,
      shown: { ...ALL_SECTIONS, stats: false },
    });
    await expect(collections(testDatabase.database).users.findOne({ username: 'lia-souza' })).resolves.toMatchObject({
      name: 'Lia Souza',
    });
  });

  it('refuses a username another writer has', async () => {
    const taken = await addWriter('Taken', 'taken-name');
    const other = await addWriter('Other', 'other-name');

    await expect(
      writing.saveProfile(other, { ...PROFILE, name: 'Other', username: 'taken-name' }, ALL_SECTIONS, NOW),
    ).resolves.toBe(false);
    await expect(
      writing.saveProfile(taken, { ...PROFILE, name: 'Taken', username: 'taken-name' }, ALL_SECTIONS, NOW),
    ).resolves.toBe(true);
  });

  it('sets an avatar before or after the profile exists and returns the old key', async () => {
    const userId = await addWriter('Avatar', 'avatar');

    await expect(
      writing.setAvatar(userId, { url: '/media/avatars/a.webp', key: 'avatars/a.webp' }, NOW),
    ).resolves.toBeNull();
    expect((await writing.getProfile(userId)).avatarUrl).toBe('/media/avatars/a.webp');
    await expect(writing.setAvatar(userId, null, NOW)).resolves.toBe('avatars/a.webp');
    expect((await writing.getProfile(userId)).avatarUrl).toBeNull();
  });

  it('marks a not started novel as in progress only once', async () => {
    const projectId = await writing.createProject(WRITER, { ...PROJECT, status: 'not-started' }, NOW);
    const hiatus = await writing.createProject(WRITER, { ...PROJECT, status: 'on-hiatus' }, NOW);

    await writing.markStarted(WRITER, projectId, NOW);
    await writing.markStarted(WRITER, hiatus, NOW);
    await writing.markStarted(WRITER, 'bad', NOW);

    expect((await writing.getProject(WRITER, projectId))?.status).toBe('in-progress');
    expect((await writing.getProject(WRITER, hiatus))?.status).toBe('on-hiatus');
  });

  it('shows an unknown stored status as in progress', async () => {
    const projectId = await writing.createProject(WRITER, PROJECT, NOW);
    await collections(testDatabase.database).projects.updateOne(
      { _id: new ObjectId(projectId) },
      { $set: { status: 'drafted' as never }, $unset: { isPublic: '', wordsBefore: '' } },
    );

    expect(await writing.getProject(WRITER, projectId)).toMatchObject({
      status: 'in-progress',
      isPublic: false,
      wordsBefore: 0,
    });
  });

  it('finds a public writer by username and hides private ones', async () => {
    const open = await addWriter('Aberta', 'aberta');
    await addWriter('Fechada', 'fechada');
    await writing.saveProfile(open, { ...PROFILE, name: 'Aberta', username: 'aberta' }, ALL_SECTIONS, NOW);

    await expect(writing.findPublicWriter('aberta')).resolves.toEqual({
      userId: open,
      name: 'Aberta',
      username: 'aberta',
    });
    await expect(writing.findPublicWriter('fechada')).resolves.toBeNull();
    await expect(writing.findPublicWriter('ninguem')).resolves.toBeNull();

    const leaving = await addWriter('Saindo', 'saindo');
    await writing.saveProfile(leaving, { ...PROFILE, name: 'Saindo', username: 'saindo' }, ALL_SECTIONS, NOW);
    await collections(testDatabase.database).users.updateOne(
      { _id: new ObjectId(leaving) },
      { $set: { deletionRequestedAt: NOW } },
    );

    await expect(writing.findPublicWriter('saindo')).resolves.toBeNull();
    expect((await writing.listCommunity({ query: 'saindo', sort: 'name', page: 1 })).writers).toEqual([]);
  });

  it('lists public writers with their public novels, words and last day', async () => {
    const database = collections(testDatabase.database);
    await database.profiles.updateMany({}, { $set: { isPublic: false } });
    const busy = await addWriter('Zélia Busy', 'zelia-busy');
    const quiet = await addWriter('Ana Quiet', 'ana-quiet');
    const hidden = await addWriter('Hidden', 'hidden-one');

    for (const [userId, username] of [
      [busy, 'zelia-busy'],
      [quiet, 'ana-quiet'],
    ]) {
      await writing.saveProfile(userId, { ...PROFILE, name: username, username }, ALL_SECTIONS, NOW);
    }

    await writing.saveProfile(
      hidden,
      { ...PROFILE, isPublic: false, name: 'Hidden', username: 'hidden-one' },
      ALL_SECTIONS,
      NOW,
    );
    const shown = await writing.createProject(
      busy,
      { ...PROJECT, title: 'Pública', isPublic: true, featured: true },
      NOW,
    );
    const secret = await writing.createProject(busy, { ...PROJECT, title: 'Secreta', isPublic: false }, NOW);
    await writing.addEntry(busy, entryFor(shown, { count: 900, date: '2026-10-01' }), NOW);
    await writing.addEntry(busy, entryFor(secret, { count: 5000, date: '2026-11-04' }), NOW);

    const legacy = await addWriter('Legacy', 'legacy-one');
    await database.profiles.insertOne({
      userId: new ObjectId(legacy),
      isPublic: true,
      avatarUrl: null,
      avatarKey: null,
      updatedAt: NOW,
    } as never);
    const byWords = await writing.listCommunity({ query: '', sort: 'words', page: 1 });

    expect(byWords.total).toBe(3);
    expect(byWords.writers.find((writer) => writer.username === 'legacy-one')).toMatchObject({ location: '' });
    expect(byWords.writers[0]).toEqual({
      username: 'zelia-busy',
      name: 'zelia-busy',
      avatarUrl: null,
      location: 'Café',
      novels: 1,
      words: 900,
      lastWrote: '2026-10-01',
      featured: { title: 'Pública', coverUrl: null },
    });
    expect(byWords.writers.find((writer) => writer.username === 'ana-quiet')).toMatchObject({
      words: 0,
      lastWrote: null,
      featured: null,
    });
    expect((await writing.listCommunity({ query: '', sort: 'recent', page: 1 })).writers[0].username).toBe(
      'zelia-busy',
    );
    expect(
      (await writing.listCommunity({ query: '', sort: 'name', page: 1 })).writers.map((writer) => writer.username),
    ).toEqual(['ana-quiet', 'legacy-one', 'zelia-busy']);
    expect(
      (await writing.listCommunity({ query: 'QUIET', sort: 'words', page: 1 })).writers.map(
        (writer) => writer.username,
      ),
    ).toEqual(['ana-quiet']);
    expect((await writing.listCommunity({ query: '(.*', sort: 'words', page: 1 })).total).toBe(0);
    expect((await writing.listCommunity({ query: '', sort: 'words', page: 2 })).writers).toEqual([]);
    expect(COMMUNITY_PAGE_SIZE).toBe(24);
  });
});
