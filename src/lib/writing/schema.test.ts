import { entryInputSchema, goalInputSchema, projectInputSchema } from './schema';

const PROJECT = {
  title: 'Livro',
  status: 'planning',
  type: 'memoir',
  genres: '',
  summary: '',
  excerpt: '',
  pinterestUrl: 'https://pin.it/abc',
  playlistUrl: '',
  featured: '',
};

const firstError = (result: { success: boolean; error?: { issues: { message: string }[] } }): string | undefined =>
  result.error?.issues[0].message;

describe('project input', () => {
  it('turns a comma list into unique genres and the checkbox into a flag', () => {
    expect(projectInputSchema.parse({ ...PROJECT, genres: ' romance , ,teen,romance' })).toMatchObject({
      genres: ['romance', 'teen'],
      featured: false,
    });
    expect(projectInputSchema.parse({ ...PROJECT, genres: ['a'], featured: true }).featured).toBe(true);
  });

  it.each([
    [{ pinterestUrl: 'pin.it/x' }, 'Enter an https:// address.'],
    [{ playlistUrl: 'javascript:alert(1)' }, 'Enter an https:// address.'],
    [{ genres: Array.from({ length: 11 }, (_unused, index) => `g${index}`).join(',') }, 'Pick up to 10 genres.'],
    [{ genres: 'x'.repeat(41) }, 'Keep each genre under 40 characters.'],
    [{ status: 'abandoned' }, 'Choose a project status.'],
    [{ type: 'comic' }, 'Choose a project type.'],
  ])('refuses %o', (change, message) => {
    expect(firstError(projectInputSchema.safeParse({ ...PROJECT, ...change }))).toBe(message);
  });
});

describe('goal input', () => {
  const GOAL = { name: 'Camp', unit: 'hours', target: '30', startDate: '2026-07-01', endDate: '2026-07-31' };

  it('accepts a goal in hours', () => {
    expect(goalInputSchema.parse(GOAL)).toMatchObject({ unit: 'hours', target: 30 });
  });

  it.each([
    [{ target: '0' }, 'Enter a target from 1 to 10000000.'],
    [{ startDate: '2026-02-30' }, 'Enter a valid date.'],
    [{ endDate: '2027-07-02' }, 'Keep a goal within 366 days.'],
    [{ unit: 'chapters' }, 'Choose what the goal counts.'],
  ])('refuses %o', (change, message) => {
    expect(firstError(goalInputSchema.safeParse({ ...GOAL, ...change }))).toBe(message);
  });
});

describe('entry input', () => {
  const ENTRY = { mode: 'add', count: '250', date: '2026-11-05', mood: 'stuck', place: '' };

  it('reads a mood or none', () => {
    expect(entryInputSchema.parse(ENTRY).mood).toBe('stuck');
    expect(entryInputSchema.parse({ ...ENTRY, mood: '' }).mood).toBeNull();
  });

  it.each([
    [{ mode: 'multiply' }, 'Choose to add or to set the total.'],
    [{ mood: 'angry' }, 'Choose how it felt.'],
    [{ count: '100001' }, 'Enter a number from 0 to 100000.'],
  ])('refuses %o', (change, message) => {
    expect(firstError(entryInputSchema.safeParse({ ...ENTRY, ...change }))).toBe(message);
  });
});
