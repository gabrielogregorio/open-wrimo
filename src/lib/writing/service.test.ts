import { ObjectId } from 'mongodb';
import { startTestDatabase, type TestDatabase } from '@/test/mongo';
import { createWritingRepository, type WritingRepository } from './repository';
import {
  COVER_TOO_BIG,
  COVER_WRONG_TYPE,
  GOAL_NOT_FOUND,
  MAX_COVER_BYTES,
  PROJECT_NOT_FOUND,
  coverTypeOf,
  exportNotebook,
  logProgress,
  saveCover,
  saveGoal,
  saveProject,
  setPersonalBadges,
  type WritingContext,
} from './service';

const NOW = new Date('2026-11-05T09:30:00.000Z');
const WRITER = new ObjectId().toHexString();

const PROJECT_FORM = {
  title: ' Young Love ',
  status: 'in-progress',
  type: 'novel',
  genres: 'Romance, drama, Romance',
  summary: '',
  excerpt: '',
  pinterestUrl: '',
  playlistUrl: '',
  featured: 'on',
};

const GOAL_FORM = {
  name: 'Novo Livro',
  unit: 'words',
  target: '12000',
  startDate: '2026-11-01',
  endDate: '2026-11-30',
};
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('writing service', () => {
  let testDatabase: TestDatabase;
  let writing: WritingRepository;
  let context: WritingContext;

  beforeAll(async () => {
    testDatabase = await startTestDatabase();
    writing = createWritingRepository(testDatabase.database);
    context = { writing, userId: WRITER, now: NOW, timeZone: 'America/Sao_Paulo' };
  });

  afterAll(async () => {
    await testDatabase.stop();
  });

  const newProject = async (): Promise<string> => (await saveProject(context, PROJECT_FORM)).id!;
  const newGoal = async (projectId: string): Promise<string> => (await saveGoal(context, projectId, GOAL_FORM)).id!;

  it('saves a project from the form', async () => {
    const projectId = await newProject();

    await expect(writing.getProject(WRITER, projectId)).resolves.toMatchObject({
      title: 'Young Love',
      genres: ['Romance', 'drama'],
      featured: true,
    });
    await expect(saveProject(context, { ...PROJECT_FORM, featured: '' }, projectId)).resolves.toEqual({
      id: projectId,
    });
    await expect(saveProject(context, PROJECT_FORM, new ObjectId().toHexString())).resolves.toEqual({
      error: PROJECT_NOT_FOUND,
    });
    await expect(saveProject(context, { ...PROJECT_FORM, title: '' })).resolves.toEqual({
      fieldErrors: { title: 'Enter a title up to 200 characters.' },
    });
  });

  it('checks the cover by its bytes', async () => {
    const projectId = await newProject();

    expect(coverTypeOf(PNG)).toBe('image/png');
    expect(coverTypeOf(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(coverTypeOf(new TextEncoder().encode('GIF89a'))).toBe('image/gif');
    expect(coverTypeOf(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 '))).toBe('image/webp');
    expect(coverTypeOf(new TextEncoder().encode('RIFF\0\0\0\0WAVE'))).toBeNull();
    expect(coverTypeOf(new TextEncoder().encode('<svg></svg>'))).toBeNull();

    await expect(saveCover(context, projectId, PNG)).resolves.toEqual({ id: projectId, saved: true });
    await expect(saveCover(context, projectId, new TextEncoder().encode('<svg/>'))).resolves.toEqual({
      fieldErrors: { cover: COVER_WRONG_TYPE },
    });
    await expect(saveCover(context, projectId, new Uint8Array(MAX_COVER_BYTES + 1))).resolves.toEqual({
      fieldErrors: { cover: COVER_TOO_BIG },
    });
    await expect(saveCover(context, new ObjectId().toHexString(), PNG)).resolves.toEqual({ error: PROJECT_NOT_FOUND });
  });

  it('creates and edits goals', async () => {
    const projectId = await newProject();
    const goalId = await newGoal(projectId);

    await expect(saveGoal(context, projectId, { ...GOAL_FORM, target: '30000' }, goalId)).resolves.toEqual({
      id: goalId,
    });
    await expect(saveGoal(context, projectId, GOAL_FORM, new ObjectId().toHexString())).resolves.toEqual({
      error: GOAL_NOT_FOUND,
    });
    await expect(saveGoal(context, new ObjectId().toHexString(), GOAL_FORM)).resolves.toEqual({
      error: PROJECT_NOT_FOUND,
    });
    await expect(saveGoal(context, projectId, { ...GOAL_FORM, endDate: '2026-10-01' })).resolves.toEqual({
      fieldErrors: { endDate: 'End on or after the start.' },
    });
  });

  it('adds words or sets the total, with the local date and hour', async () => {
    const projectId = await newProject();
    const goalId = await newGoal(projectId);
    const today = { mode: 'add', count: '800', date: '2026-11-05', mood: 'inspired', place: 'Kitchen' };

    await expect(logProgress(context, goalId, today)).resolves.toEqual({ id: goalId, saved: true });
    await logProgress(context, goalId, { ...today, count: '1200', date: '2026-11-02', mood: '' }, 'sprint');
    await logProgress(context, goalId, { ...today, mode: 'set', count: '2500' });
    await expect(logProgress(context, goalId, { ...today, mode: 'set', count: '2500' })).resolves.toEqual({
      id: goalId,
      saved: true,
    });

    const entries = await writing.listEntries(WRITER, { projectId });

    expect(entries.map(({ date, count, hour, source }) => ({ date, count, hour, source }))).toEqual([
      { date: '2026-11-05', count: 500, hour: 6, source: 'update' },
      { date: '2026-11-05', count: 800, hour: 6, source: 'update' },
      { date: '2026-11-02', count: 1200, hour: -1, source: 'sprint' },
    ]);
    expect(entries[2].mood).toBeNull();
  });

  it('refuses empty or invalid progress', async () => {
    const projectId = await newProject();
    const goalId = await newGoal(projectId);
    const form = { mode: 'add', count: '0', date: '2026-11-05', mood: '', place: '' };

    await expect(logProgress(context, goalId, form)).resolves.toEqual({
      fieldErrors: { count: 'Enter how much you wrote.' },
    });
    await expect(logProgress(context, goalId, { ...form, count: '-3' })).resolves.toEqual({
      fieldErrors: { count: 'Enter a number from 0 to 100000.' },
    });
    await expect(logProgress(context, new ObjectId().toHexString(), form)).resolves.toEqual({ error: GOAL_NOT_FOUND });
  });

  it('keeps only known personal badges', async () => {
    const projectId = await newProject();

    await expect(setPersonalBadges(context, projectId, ['planned-plot', 'winner', 'planned-plot'])).resolves.toEqual({
      id: projectId,
      saved: true,
    });
    expect((await writing.getProject(WRITER, projectId))?.awards).toEqual(['planned-plot']);
    await expect(setPersonalBadges(context, new ObjectId().toHexString(), [])).resolves.toEqual({
      error: PROJECT_NOT_FOUND,
    });
  });

  it('exports the whole notebook', async () => {
    const notebook = await exportNotebook(context);

    expect(notebook).toMatchObject({ exportedFrom: 'Folio', version: 1 });
    expect(notebook.projects.length).toBeGreaterThan(0);
    expect(notebook.goals.length).toBeGreaterThan(0);
    expect(notebook.entries.length).toBeGreaterThan(0);
  });
});
