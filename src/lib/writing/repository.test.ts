import { ObjectId } from 'mongodb';
import { startTestDatabase, type TestDatabase } from '@/test/mongo';
import { createWritingRepository, type NewEntry, type WritingRepository } from './repository';
import type { GoalInput, ProjectInput } from './schema';

const NOW = new Date('2026-11-05T12:00:00.000Z');
const WRITER = new ObjectId().toHexString();
const STRANGER = new ObjectId().toHexString();
const MISSING = new ObjectId().toHexString();

const PROJECT: Omit<ProjectInput, 'event'> = {
  title: 'Novo Livro ✨',
  status: 'in-progress',
  type: 'novel',
  genres: ['Romance', 'Japão'],
  summary: 'Two summers in Kyoto.',
  excerpt: 'The train was late.',
  pinterestUrl: '',
  playlistUrl: 'https://example.com/playlist',
  featured: false,
};

const GOAL: GoalInput = {
  name: 'November',
  unit: 'words',
  target: 50000,
  startDate: '2026-11-01',
  endDate: '2026-11-30',
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
});
