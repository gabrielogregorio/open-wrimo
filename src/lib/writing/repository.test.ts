import { ObjectId } from 'mongodb';
import { startTestDatabase, type TestDatabase } from '@/test/mongo';
import { createWritingRepository, type NewEntry, type WritingRepository } from './repository';
import type { GoalInput, ProjectInput } from './schema';

const NOW = new Date('2026-11-05T12:00:00.000Z');
const WRITER = new ObjectId().toHexString();
const STRANGER = new ObjectId().toHexString();
const MISSING = new ObjectId().toHexString();

const PROJECT: ProjectInput = {
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

  it('saves, serves and removes a cover', async () => {
    const projectId = await writing.createProject(WRITER, PROJECT, NOW);
    const data = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);

    await expect(writing.saveCover(WRITER, projectId, { contentType: 'image/png', data }, NOW)).resolves.toBe(true);
    expect((await writing.getProject(WRITER, projectId))?.coverUrl).toBe(`/api/covers/${projectId}?v=${NOW.getTime()}`);
    await expect(writing.getCover(WRITER, projectId)).resolves.toEqual({ contentType: 'image/png', data });
    await expect(writing.getCover(STRANGER, projectId)).resolves.toBeNull();
    await expect(writing.getCover(WRITER, 'bad')).resolves.toBeNull();
    await expect(writing.saveCover(STRANGER, projectId, { contentType: 'image/png', data }, NOW)).resolves.toBe(false);
    await expect(writing.saveCover(WRITER, 'bad', { contentType: 'image/png', data }, NOW)).resolves.toBe(false);

    await expect(writing.removeCover(STRANGER, projectId, NOW)).resolves.toBe(false);
    await expect(writing.removeCover(WRITER, 'bad', NOW)).resolves.toBe(false);
    await expect(writing.removeCover(WRITER, projectId, NOW)).resolves.toBe(true);
    await expect(writing.getCover(WRITER, projectId)).resolves.toBeNull();
    expect((await writing.getProject(WRITER, projectId))?.coverUrl).toBeNull();
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

  it('removes a project with its goals, entries and cover', async () => {
    const projectId = await writing.createProject(WRITER, PROJECT, NOW);
    await writing.createGoal(WRITER, projectId, GOAL, NOW);
    await writing.addEntry(WRITER, entryFor(projectId), NOW);
    await writing.saveCover(WRITER, projectId, { contentType: 'image/gif', data: new Uint8Array([1]) }, NOW);

    await expect(writing.removeProject(STRANGER, projectId)).resolves.toBe(false);
    await expect(writing.removeProject(WRITER, 'bad')).resolves.toBe(false);
    await expect(writing.removeProject(WRITER, projectId)).resolves.toBe(true);
    await expect(writing.listGoals(WRITER, projectId)).resolves.toEqual([]);
    await expect(writing.listEntries(WRITER, { projectId })).resolves.toEqual([]);
    await expect(writing.getCover(WRITER, projectId)).resolves.toBeNull();
    await expect(writing.removeProject(WRITER, projectId)).resolves.toBe(false);
  });
});
