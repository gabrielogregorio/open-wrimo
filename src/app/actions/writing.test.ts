import { revalidatePath } from 'next/cache';
import { collections } from '@/lib/db/collections';
import { createWritingRepository } from '@/lib/writing/repository';
import { GOAL_NOT_FOUND, PROJECT_NOT_FOUND } from '@/lib/writing/service';
import { actAs, createWriter, form, pngFile, redirectOf, testDb, type TestWriter } from '@/test/next-server';
import {
  createGoalInlineAction,
  createNovelAction,
  deleteGoalAction,
  deleteGoalInlineAction,
  deleteNovelAction,
  editGoalInlineAction,
  logProgressAction,
  logSprintAction,
  removeEntryAction,
  saveGoalAction,
  setPersonalBadgesAction,
  updateNovelAction,
  updateProfileAction,
} from './writing';

const NOVEL = { title: 'Young Love', status: 'in-progress', type: 'novel', genres: '' };
const GOAL = { name: 'November', unit: 'words', target: '50000', startDate: '2026-11-01', endDate: '2026-11-30' };
const ENTRY = { mode: 'add', count: '500', date: '2026-11-05', mood: '', place: '' };
const PROFILE = { name: 'Ana Lima', username: 'ana-lima', bio: '', location: '', pronouns: '' };
const NO_STATE = {};

const writing = () => createWritingRepository(testDb());

const idFrom = (url: string): string => url.match(/[0-9a-f]{24}/)![0];

/** A writer with a novel, a goal and one logged entry, then signed in as somebody else. */
const ownedNotebook = async () => {
  const owner = await createWriter();
  actAs(owner);
  const novelId = idFrom(await redirectOf(() => createNovelAction(NO_STATE, form(NOVEL))));
  await redirectOf(() => saveGoalAction(novelId, undefined, NO_STATE, form(GOAL)));
  const [goal] = await writing().listGoals(owner.id);
  await logProgressAction(NO_STATE, form({ goal: goal.id, ...ENTRY }));
  const [entry] = await writing().listEntries(owner.id);

  return { owner, novelId, goalId: goal.id, entryId: entry.id };
};

describe('novel actions', () => {
  let writer: TestWriter;

  beforeEach(async () => {
    writer = await createWriter();
    actAs(writer);
  });

  it('create a novel, with or without a cover, and keep the form when it is broken', async () => {
    const plain = await redirectOf(() => createNovelAction(NO_STATE, form(NOVEL)));
    expect(plain).toMatch(/^\/write\/novels\/[0-9a-f]{24}$/);

    const cover = await pngFile();
    const covered = idFrom(await redirectOf(() => createNovelAction(NO_STATE, form({ ...NOVEL, cover }))));
    expect((await writing().getProject(writer.id, covered))?.coverUrl).toMatch(/^\/media\/covers\//);

    const refused = await redirectOf(() =>
      createNovelAction(NO_STATE, form({ ...NOVEL, cover: new File(['not an image'], 'x.png') })),
    );
    expect(refused).toMatch(/^\/write\/novels\/[0-9a-f]{24}\/edit\?cover=refused$/);

    await expect(createNovelAction(NO_STATE, form({ ...NOVEL, title: '' }))).resolves.toMatchObject({
      fieldErrors: { title: expect.any(String) },
      values: expect.objectContaining({ title: '' }),
    });
  });

  it('update a novel, its cover, and refuse a broken form or cover', async () => {
    const novelId = idFrom(await redirectOf(() => createNovelAction(NO_STATE, form(NOVEL))));

    await expect(
      redirectOf(() => updateNovelAction(novelId, NO_STATE, form({ ...NOVEL, title: 'Old Love' }))),
    ).resolves.toBe(`/write/novels/${novelId}`);
    expect((await writing().getProject(writer.id, novelId))?.title).toBe('Old Love');
    expect(revalidatePath).toHaveBeenCalledWith(`/write/novels/${novelId}`);

    const cover = await pngFile();
    await redirectOf(() => updateNovelAction(novelId, NO_STATE, form({ ...NOVEL, cover })));
    expect((await writing().getProject(writer.id, novelId))?.coverUrl).not.toBeNull();

    await redirectOf(() => updateNovelAction(novelId, NO_STATE, form({ ...NOVEL, removeCover: 'on' })));
    expect((await writing().getProject(writer.id, novelId))?.coverUrl).toBeNull();

    await expect(
      updateNovelAction(novelId, NO_STATE, form({ ...NOVEL, cover: new File(['nope'], 'x.png') })),
    ).resolves.toMatchObject({ fieldErrors: { cover: expect.any(String) } });
    await expect(updateNovelAction(novelId, NO_STATE, form({ ...NOVEL, title: '' }))).resolves.toMatchObject({
      fieldErrors: { title: expect.any(String) },
    });
  });

  it('delete a novel', async () => {
    const novelId = idFrom(await redirectOf(() => createNovelAction(NO_STATE, form(NOVEL))));

    await expect(redirectOf(() => deleteNovelAction(novelId))).resolves.toBe('/write');
    await expect(writing().getProject(writer.id, novelId)).resolves.toBeNull();
  });
});

describe('goal and progress actions', () => {
  it('create, edit and delete goals, on their page or in place', async () => {
    const writer = await createWriter();
    actAs(writer);
    const novelId = idFrom(await redirectOf(() => createNovelAction(NO_STATE, form(NOVEL))));

    await expect(redirectOf(() => saveGoalAction(novelId, undefined, NO_STATE, form(GOAL)))).resolves.toBe(
      `/write/novels/${novelId}?tab=goals`,
    );
    await expect(saveGoalAction(novelId, undefined, NO_STATE, form({ ...GOAL, name: '' }))).resolves.toMatchObject({
      fieldErrors: { name: expect.any(String) },
    });
    const [goal] = await writing().listGoals(writer.id);

    await expect(editGoalInlineAction(novelId, goal.id, NO_STATE, form({ ...GOAL, target: '60000' }))).resolves.toEqual(
      { saved: true },
    );
    expect((await writing().getGoal(writer.id, goal.id))?.target).toBe(60000);
    await expect(
      editGoalInlineAction(novelId, goal.id, NO_STATE, form({ ...GOAL, target: '0' })),
    ).resolves.toMatchObject({ fieldErrors: { target: expect.any(String) } });

    await expect(createGoalInlineAction(novelId, NO_STATE, form({ ...GOAL, name: 'Second' }))).resolves.toEqual({
      saved: true,
    });
    await expect(createGoalInlineAction(novelId, NO_STATE, form({ ...GOAL, unit: 'x' }))).resolves.toMatchObject({
      fieldErrors: { unit: expect.any(String) },
    });

    await deleteGoalInlineAction(goal.id);
    await expect(writing().getGoal(writer.id, goal.id)).resolves.toBeNull();

    const [second] = await writing().listGoals(writer.id);
    await expect(redirectOf(() => deleteGoalAction(novelId, second.id))).resolves.toBe(
      `/write/novels/${novelId}?tab=goals`,
    );
    await expect(writing().listGoals(writer.id)).resolves.toEqual([]);
  });

  it('log words from the update page or a sprint, undo them and keep a broken form', async () => {
    const { owner, goalId, entryId } = await ownedNotebook();
    actAs(owner);

    await expect(logSprintAction(NO_STATE, form({ goal: goalId, ...ENTRY, count: '250' }))).resolves.toEqual({
      saved: true,
      values: { goal: goalId, date: ENTRY.date },
    });
    expect((await writing().listEntries(owner.id)).map((entry) => entry.source).sort()).toEqual(['sprint', 'update']);
    await expect(logProgressAction(NO_STATE, form({ goal: goalId, ...ENTRY, count: '0' }))).resolves.toMatchObject({
      fieldErrors: { count: expect.any(String) },
      values: expect.objectContaining({ count: '0' }),
    });

    await removeEntryAction(entryId);
    expect(await writing().listEntries(owner.id)).toHaveLength(1);
  });

  it('give personal badges', async () => {
    const { owner, novelId } = await ownedNotebook();
    actAs(owner);

    await expect(
      setPersonalBadgesAction(novelId, NO_STATE, form({ badge: ['back-it-up', 'made-up'] })),
    ).resolves.toMatchObject({
      saved: true,
    });
    expect((await writing().getProject(owner.id, novelId))?.awards).toEqual(['back-it-up']);
  });
});

describe("another writer's notebook", () => {
  it('cannot be changed, deleted or written in by someone else', async () => {
    const { owner, novelId, goalId, entryId } = await ownedNotebook();
    actAs(await createWriter());

    await expect(updateNovelAction(novelId, NO_STATE, form({ ...NOVEL, title: 'Stolen' }))).resolves.toMatchObject({
      error: PROJECT_NOT_FOUND,
    });
    await redirectOf(() => deleteNovelAction(novelId));
    await expect(saveGoalAction(novelId, undefined, NO_STATE, form(GOAL))).resolves.toMatchObject({
      error: PROJECT_NOT_FOUND,
    });
    await expect(saveGoalAction(novelId, goalId, NO_STATE, form({ ...GOAL, target: '1' }))).resolves.toMatchObject({
      error: GOAL_NOT_FOUND,
    });
    await expect(
      editGoalInlineAction(novelId, goalId, NO_STATE, form({ ...GOAL, target: '1' })),
    ).resolves.toMatchObject({ error: GOAL_NOT_FOUND });
    await expect(createGoalInlineAction(novelId, NO_STATE, form(GOAL))).resolves.toMatchObject({
      error: PROJECT_NOT_FOUND,
    });
    await deleteGoalInlineAction(goalId);
    await redirectOf(() => deleteGoalAction(novelId, goalId));
    await expect(logProgressAction(NO_STATE, form({ goal: goalId, ...ENTRY }))).resolves.toMatchObject({
      error: GOAL_NOT_FOUND,
    });
    await removeEntryAction(entryId);
    await expect(setPersonalBadgesAction(novelId, NO_STATE, form({ badge: 'back-it-up' }))).resolves.toMatchObject({
      error: PROJECT_NOT_FOUND,
    });

    const novel = await writing().getProject(owner.id, novelId);
    expect(novel).toMatchObject({ title: 'Young Love', awards: [] });
    expect(await writing().getGoal(owner.id, goalId)).toMatchObject({ target: 50000 });
    expect(await writing().listEntries(owner.id)).toHaveLength(1);
  });

  it('cannot be written in by a signed-out visitor or an account that is blocked', async () => {
    const { novelId, goalId } = await ownedNotebook();

    actAs(null);
    await expect(redirectOf(() => logProgressAction(NO_STATE, form({ goal: goalId, ...ENTRY })))).resolves.toBe(
      '/login',
    );

    actAs(await createWriter({ termsVersion: 'old' }));
    await expect(redirectOf(() => createNovelAction(NO_STATE, form(NOVEL)))).resolves.toBe('/termos/aceitar');

    actAs(await createWriter({ deletionRequestedAt: new Date() }));
    await expect(redirectOf(() => deleteNovelAction(novelId))).resolves.toBe('/conta');

    expect(await collections(testDb()).projects.countDocuments()).toBe(1);
  });
});

describe('profile action', () => {
  it('saves the profile with the sections shown, or keeps a broken form', async () => {
    const writer = await createWriter();
    actAs(writer);

    await expect(
      redirectOf(() => updateProfileAction(NO_STATE, form({ ...PROFILE, show: ['bio', 'stats'] }))),
    ).resolves.toBe('/write/profile');
    const profile = await writing().getProfile(writer.id);
    expect(profile.shown).toMatchObject({ bio: true, stats: true, favorites: false });

    await expect(
      updateProfileAction(NO_STATE, form({ ...PROFILE, avatar: await pngFile(), removeImage: 'on' })),
    ).rejects.toMatchObject({ url: '/write/profile' });
    await expect(updateProfileAction(NO_STATE, form({ ...PROFILE, username: 'A B' }))).resolves.toMatchObject({
      fieldErrors: { username: expect.any(String) },
    });
  });
});
