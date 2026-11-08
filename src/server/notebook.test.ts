import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db/collections';
import { actAs, createWriter, testDb } from '@/test/next-server';
import { logProgress, saveGoal, saveProject, setPersonalBadges } from '@/lib/writing/service';
import {
  allEarnedBadges,
  badgeById,
  laurelCount,
  lifetimeBadges,
  lifetimeWords,
  loadNotebook,
  participationBadges,
  projectBadges,
  wordsFor,
} from './notebook';
import { writingContext } from './session';
import { toolData } from './tools';

const shift = (date: string, days: number): string =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

const NOVEL = { title: 'Young Love', status: 'in-progress', type: 'novel', genres: '', wordsBefore: '1000' };

describe('the notebook', () => {
  it('gathers only the signed-in writer, with totals, badges and the data for the tools', async () => {
    const other = await createWriter();
    actAs(other);
    const otherNovel = (await saveProject(await writingContext(), { ...NOVEL, title: 'Not mine' })).id!;

    const writer = await createWriter();
    actAs(writer);
    const context = await writingContext();
    const { today } = context;
    const novelId = (await saveProject(context, NOVEL)).id!;
    const goal = (fields: Record<string, string>) =>
      saveGoal(context, novelId, { name: 'Goal', unit: 'words', target: '5000', ...fields });
    const active = (await goal({ startDate: shift(today, -2), endDate: shift(today, 5) })).id!;
    await goal({ name: 'Old', startDate: shift(today, -40), endDate: shift(today, -30) });
    await goal({ name: 'Later', startDate: shift(today, 10), endDate: shift(today, 20) });
    await goal({ name: 'Pages', unit: 'pages', target: '10', startDate: today, endDate: shift(today, 3) });
    await logProgress(context, active, { mode: 'add', count: '1200', date: today, mood: '', place: '' });
    await logProgress(context, active, { mode: 'add', count: '300', date: shift(today, -1), mood: '', place: '' });
    await setPersonalBadges(context, novelId, ['back-it-up']);

    const notebook = await loadNotebook();

    expect(notebook.projects.map((project) => project.id)).toEqual([novelId]);
    expect(notebook.projects.map((project) => project.id)).not.toContain(otherNovel);
    expect(notebook.goals).toHaveLength(4);
    expect(notebook.postCount).toBe(0);
    expect(wordsFor(notebook, novelId)).toBe(2500);
    expect(wordsFor(notebook, 'missing')).toBe(0);
    expect(lifetimeWords(notebook)).toBe(2500);
    expect(lifetimeBadges(notebook)).toBeInstanceOf(Set);
    expect(projectBadges(notebook, novelId)).toBeInstanceOf(Set);
    expect(allEarnedBadges(notebook)).toContain(`${novelId}:back-it-up`);
    expect(participationBadges(notebook)).toBeInstanceOf(Set);
    expect(laurelCount(notebook)).toBeGreaterThanOrEqual(0);
    expect(badgeById.get('back-it-up')?.id).toBe('back-it-up');

    const data = toolData(notebook);

    expect(data.today).toBe(today);
    expect(data.novels).toEqual([expect.objectContaining({ id: novelId, title: 'Young Love', totalWords: 2500 })]);
    expect(data.novels[0].goals.map((item) => item.name).sort()).toEqual(['Goal', 'Later']);
    expect(data.novels[0].goals.find((item) => item.name === 'Later')).toMatchObject({
      startDate: shift(today, 10),
      endDate: shift(today, 20),
    });
    expect(data.wordsByDay).toEqual([
      { date: shift(today, -1), count: 300 },
      { date: today, count: 1200 },
    ]);
  });
});

describe('the tool data', () => {
  it('falls back to the stored dates of a goal whose days cannot be laid out', async () => {
    const writer = await createWriter();
    actAs(writer);
    const context = await writingContext();
    const novelId = (await saveProject(context, NOVEL)).id!;
    await collections(testDb()).goals.insertOne({
      name: 'Backwards',
      unit: 'words',
      target: 100,
      startDate: shift(context.today, 5),
      endDate: shift(context.today, 1),
      userId: new ObjectId(writer.id),
      projectId: new ObjectId(novelId),
      createdAt: new Date(),
    });

    const [goal] = toolData(await loadNotebook()).novels[0].goals;

    expect(goal).toMatchObject({ startDate: shift(context.today, 5), endDate: shift(context.today, 1) });
  });
});
