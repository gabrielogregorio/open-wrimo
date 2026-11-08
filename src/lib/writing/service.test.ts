import { ObjectId } from 'mongodb';
import { startTestDatabase, type TestDatabase } from '@/test/mongo';
import { createWritingRepository, type WritingRepository } from './repository';
import sharp from 'sharp';
import { createRateLimiter } from '@/lib/auth/rate-limit';
import { collections } from '@/lib/db/collections';
import { IMAGE_UPLOAD_TOO_BIG, IMAGE_WRONG_TYPE, MAX_UPLOAD_BYTES } from '@/lib/storage/images';
import type { ImageStorage } from '@/lib/storage/storage';
import {
  GOAL_NOT_FOUND,
  POST_NOT_FOUND,
  PROJECT_NOT_FOUND,
  IMAGE_NOT_STORED,
  UPLOADS_TOO_FAST,
  exportNotebook,
  logProgress,
  removePost,
  removeProject,
  saveInlineImage,
  saveProfile,
  saveCover,
  saveGoal,
  savePost,
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
const allowAll = { consume: async () => ({ allowed: true, retryAfterMs: 0 }), reset: async () => undefined };

describe('writing service', () => {
  let testDatabase: TestDatabase;
  let writing: WritingRepository;
  let context: WritingContext;
  let PNG: Uint8Array;
  let saved = 0;
  const storage = {
    save: vi.fn<ImageStorage['save']>(async ({ kind, folder }) => {
      saved += 1;

      return { url: `/media/${folder}/${saved}.${kind.extension}`, key: `${folder}/${saved}.${kind.extension}` };
    }),
    remove: vi.fn<ImageStorage['remove']>(async () => undefined),
  };

  beforeAll(async () => {
    testDatabase = await startTestDatabase();
    writing = createWritingRepository(testDatabase.database);
    PNG = new Uint8Array(
      await sharp({ create: { width: 40, height: 30, channels: 3, background: '#7d2a26' } })
        .png()
        .toBuffer(),
    );
    context = { writing, storage, limiter: allowAll, userId: WRITER, now: NOW, timeZone: 'America/Sao_Paulo' };
  });

  afterAll(async () => {
    await testDatabase.stop();
  });

  beforeEach(() => {
    storage.save.mockClear();
    storage.remove.mockClear();
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

  it('creates the goal of the event the project joins', async () => {
    const { id } = await saveProject(
      { ...context, translate: (text, values) => `${text}|${values.year}` },
      {
        ...PROJECT_FORM,
        event: 'november',
      },
    );

    await expect(writing.listGoals(WRITER, id)).resolves.toEqual([
      expect.objectContaining({
        name: 'November novel {year}|2026',
        target: 50000,
        startDate: '2026-11-01',
        endDate: '2026-11-30',
      }),
    ]);
    const plain = await saveProject(context, { ...PROJECT_FORM, event: 'july-camp' });
    expect((await writing.listGoals(WRITER, plain.id))[0].name).toBe('July camp 2027');
  });

  it('stores a cover and lets go of the old one', async () => {
    const projectId = await newProject();

    await expect(saveCover(context, projectId, PNG)).resolves.toEqual({ id: projectId, saved: true });
    expect(storage.save).toHaveBeenCalledWith(expect.objectContaining({ folder: `covers/${WRITER}` }));
    expect(storage.remove).not.toHaveBeenCalled();
    const firstKey = (await storage.save.mock.results[0].value).key;

    await saveCover(context, projectId, null);
    expect(storage.remove).toHaveBeenCalledWith(firstKey);
    expect((await writing.getProject(WRITER, projectId))?.coverUrl).toBeNull();
  });

  it('refuses a cover that is not an image or is too big', async () => {
    const projectId = await newProject();

    await expect(saveCover(context, projectId, new TextEncoder().encode('<svg/>'))).resolves.toEqual({
      fieldErrors: { cover: IMAGE_WRONG_TYPE },
    });
    await expect(saveCover(context, projectId, new Uint8Array(MAX_UPLOAD_BYTES))).resolves.toEqual({
      fieldErrors: { cover: IMAGE_UPLOAD_TOO_BIG },
    });
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('accepts two images per second for each writer', async () => {
    const projectId = await newProject();
    const limited = { ...context, limiter: createRateLimiter(testDatabase.database) };

    await expect(saveCover(limited, projectId, PNG)).resolves.toMatchObject({ saved: true });
    await expect(saveCover(limited, projectId, PNG)).resolves.toMatchObject({ saved: true });
    await expect(saveCover(limited, projectId, PNG)).resolves.toEqual({ fieldErrors: { cover: UPLOADS_TOO_FAST } });
    await expect(saveCover({ ...limited, now: new Date(NOW.getTime() + 1000) }, projectId, PNG)).resolves.toMatchObject(
      {
        saved: true,
      },
    );
  });

  it('throws away a new cover when the project is gone', async () => {
    const missing = new ObjectId().toHexString();

    await expect(saveCover(context, missing, PNG)).resolves.toEqual({ error: PROJECT_NOT_FOUND });
    expect(storage.remove).toHaveBeenCalledTimes(1);
    await expect(saveCover(context, missing, null)).resolves.toEqual({ error: PROJECT_NOT_FOUND });
    expect(storage.remove).toHaveBeenCalledTimes(1);
  });

  it('removes a project and its images', async () => {
    const projectId = await newProject();
    await saveCover(context, projectId, PNG);
    storage.remove.mockClear();

    await expect(removeProject(context, projectId)).resolves.toBe(true);
    expect(storage.remove).toHaveBeenCalledTimes(1);
    await expect(removeProject(context, projectId)).resolves.toBe(false);
  });

  it('writes posts with or without an image', async () => {
    const projectId = await newProject();
    const form = { title: ' Day one ', body: 'I met the main character.' };

    const { id: postId } = await savePost(context, projectId, form, { image: PNG });
    expect((await writing.getPost(WRITER, postId!))?.title).toBe('Day one');
    expect(storage.save).toHaveBeenCalledWith(expect.objectContaining({ folder: `posts/${WRITER}` }));

    await expect(savePost(context, projectId, form, { postId })).resolves.toEqual({ id: postId });
    expect(storage.remove).not.toHaveBeenCalled();
    await expect(savePost(context, projectId, form, { postId, image: PNG })).resolves.toEqual({ id: postId });
    expect(storage.remove).toHaveBeenCalledTimes(1);
    await savePost(context, projectId, form, { postId, removeImage: true });
    expect(storage.remove).toHaveBeenCalledTimes(2);
    expect((await writing.getPost(WRITER, postId!))?.imageUrl).toBeNull();

    await expect(savePost(context, projectId, form)).resolves.toEqual({ id: expect.any(String) });
  });

  it('refuses a broken post and cleans up after a missing one', async () => {
    const projectId = await newProject();
    const form = { title: 'Title', body: 'Body' };

    await expect(savePost(context, projectId, { ...form, body: ' ' })).resolves.toEqual({
      fieldErrors: { body: 'Write something in the post.' },
    });
    await expect(savePost(context, projectId, form, { image: new Uint8Array([1]) })).resolves.toEqual({
      fieldErrors: { image: IMAGE_WRONG_TYPE },
    });
    await expect(savePost(context, new ObjectId().toHexString(), form, { image: PNG })).resolves.toEqual({
      error: PROJECT_NOT_FOUND,
    });
    await expect(savePost(context, new ObjectId().toHexString(), form)).resolves.toEqual({ error: PROJECT_NOT_FOUND });
    await expect(
      savePost(context, projectId, form, { postId: new ObjectId().toHexString(), image: PNG }),
    ).resolves.toEqual({
      error: POST_NOT_FOUND,
    });
    await expect(savePost(context, projectId, form, { postId: new ObjectId().toHexString() })).resolves.toEqual({
      error: POST_NOT_FOUND,
    });
    expect(storage.remove).toHaveBeenCalledTimes(2);
  });

  it('removes a post and its image', async () => {
    const projectId = await newProject();
    const withImage = (await savePost(context, projectId, { title: 'a', body: 'b' }, { image: PNG })).id!;
    const plain = (await savePost(context, projectId, { title: 'c', body: 'd' })).id!;

    await expect(removePost(context, withImage)).resolves.toBe(true);
    expect(storage.remove).toHaveBeenCalledTimes(1);
    await expect(removePost(context, plain)).resolves.toBe(true);
    await expect(removePost(context, plain)).resolves.toBe(false);
    expect(storage.remove).toHaveBeenCalledTimes(1);
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
      fieldErrors: { count: 'Enter a number from 0 to 10000000.' },
    });
    await expect(logProgress(context, new ObjectId().toHexString(), form)).resolves.toEqual({ error: GOAL_NOT_FOUND });
  });

  it('keeps only known personal badges', async () => {
    const projectId = await newProject();

    await expect(setPersonalBadges(context, projectId, ['planner', 'winner', 'planner'])).resolves.toEqual({
      id: projectId,
      saved: true,
    });
    expect((await writing.getProject(WRITER, projectId))?.awards).toEqual(['planner']);
    await expect(setPersonalBadges(context, new ObjectId().toHexString(), [])).resolves.toEqual({
      error: PROJECT_NOT_FOUND,
    });
  });

  it('exports the whole notebook', async () => {
    const notebook = await exportNotebook(context);

    expect(notebook).toMatchObject({ exportedFrom: 'Open Wrimo', version: 1 });
    expect(notebook.projects.length).toBeGreaterThan(0);
    expect(notebook.goals.length).toBeGreaterThan(0);
    expect(notebook.entries.length).toBeGreaterThan(0);
    expect(notebook.posts.length).toBeGreaterThan(0);
  });

  it('creates the repeating goal asked for together with the novel', async () => {
    const { id } = await saveProject(context, { ...PROJECT_FORM, period: 'daily', periodTarget: '1667' });

    await expect(writing.listGoals(WRITER, id)).resolves.toEqual([
      expect.objectContaining({ name: 'Daily goal', target: 1667, period: 'daily', startDate: '2026-11-05' }),
    ]);
    const { id: withoutTarget } = await saveProject(context, { ...PROJECT_FORM, period: 'monthly', periodTarget: '' });
    await expect(writing.listGoals(WRITER, withoutTarget)).resolves.toEqual([]);
  });

  it('moves a not started novel to in progress on its first words', async () => {
    const projectId = (await saveProject(context, { ...PROJECT_FORM, status: 'not-started' })).id!;
    const goalId = await newGoal(projectId);
    const form = { mode: 'add', count: '10', date: '2026-11-05', mood: '', place: '' };

    await logProgress(context, goalId, { ...form, mode: 'set', count: '0' });
    expect((await writing.getProject(WRITER, projectId))?.status).toBe('not-started');
    await logProgress(context, goalId, form);
    expect((await writing.getProject(WRITER, projectId))?.status).toBe('in-progress');
    await writing.updateProject(
      WRITER,
      projectId,
      { ...(await writing.getProject(WRITER, projectId))!, status: 'not-started' },
      NOW,
    );
    await expect(logProgress(context, goalId, { ...form, mode: 'set', count: '4' })).resolves.toMatchObject({
      saved: true,
    });
    expect((await writing.getProject(WRITER, projectId))?.status).toBe('not-started');
  });

  it('records every stored image and keeps the upload when the record fails', async () => {
    const recorded: string[] = [];
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await saveInlineImage({ ...context, onImageStored: async (key) => void recorded.push(key) }, PNG);
    expect(recorded).toEqual([expect.stringMatching(/^inline\//)]);

    await expect(
      saveInlineImage(
        {
          ...context,
          onImageStored: async () => {
            throw new Error('database down');
          },
        },
        PNG,
      ),
    ).resolves.toEqual({ url: expect.stringMatching(/^\/media\/inline\//) });
    expect(errorLog).toHaveBeenCalledWith('Upload record failed', expect.any(Error));
    errorLog.mockRestore();
  });

  it('stores an image dropped in the editor or explains why not', async () => {
    await expect(saveInlineImage(context, PNG)).resolves.toEqual({ url: expect.stringMatching(/^\/media\/inline\//) });
    await expect(saveInlineImage(context, new TextEncoder().encode('<svg/>'))).resolves.toEqual({
      error: IMAGE_WRONG_TYPE,
    });
  });

  it('saves the profile with name, username, sections and avatar', async () => {
    await collections(testDatabase.database).users.insertOne({
      _id: new ObjectId(WRITER),
      name: 'Writer',
      username: 'writer',
      email: 'writer@example.com',
      passwordHash: 'scrypt$hash',
      createdAt: NOW,
    });
    const form = { name: 'Bia', username: 'Bia-Escreve', isPublic: 'on', bio: 'Oi', location: '', writingTime: '' };
    const shown = { bio: true, stats: false, favorites: true, badges: true };

    await expect(saveProfile(context, form, { bytes: PNG, remove: false }, shown)).resolves.toEqual({ saved: true });
    const firstKey = (await storage.save.mock.results[0].value).key;
    await expect(writing.getProfile(WRITER)).resolves.toMatchObject({
      isPublic: true,
      shown,
      avatarUrl: expect.any(String),
    });
    await expect(
      collections(testDatabase.database).users.findOne({ _id: new ObjectId(WRITER) }),
    ).resolves.toMatchObject({
      name: 'Bia',
      username: 'bia-escreve',
    });

    await saveProfile(context, form, { bytes: PNG, remove: false });
    expect(storage.remove).toHaveBeenCalledWith(firstKey);
    await saveProfile(context, form, { bytes: null, remove: true });
    expect((await writing.getProfile(WRITER)).avatarUrl).toBeNull();
    await expect(saveProfile(context, form, { bytes: null, remove: false })).resolves.toEqual({ saved: true });
  });

  it('refuses a broken profile, a bad avatar and a taken username', async () => {
    await collections(testDatabase.database).users.insertOne({
      name: 'Other',
      username: 'someone-else',
      email: 'other@example.com',
      passwordHash: 'scrypt$hash',
      createdAt: NOW,
    });
    const form = { name: 'Bia', username: 'bia-escreve', bio: '', location: '', writingTime: '' };

    await expect(saveProfile(context, { ...form, username: 'x' }, { bytes: null, remove: false })).resolves.toEqual({
      fieldErrors: { username: 'Use 3 to 20 lowercase letters, numbers and dashes.' },
    });
    await expect(saveProfile(context, form, { bytes: new Uint8Array([1, 2]), remove: false })).resolves.toEqual({
      fieldErrors: { avatar: IMAGE_WRONG_TYPE },
    });
    await expect(
      saveProfile(context, { ...form, username: 'someone-else' }, { bytes: null, remove: false }),
    ).resolves.toEqual({ fieldErrors: { username: 'This username is taken.' } });
  });

  it('turns a storage failure into a form error instead of a crash', async () => {
    const projectId = await newProject();
    const broken = {
      save: vi.fn(async () => Promise.reject(new Error('Cloudinary upload failed with status 401'))),
      remove: storage.remove,
    };
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(saveCover({ ...context, storage: broken }, projectId, PNG)).resolves.toEqual({
      fieldErrors: { cover: IMAGE_NOT_STORED },
    });
    expect(quiet).toHaveBeenCalledWith('Image storage failed', expect.any(Error));
  });
});
