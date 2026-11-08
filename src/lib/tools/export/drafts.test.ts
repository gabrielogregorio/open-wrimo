import { draftsOf, isDraft, liveDrafts, type Draft } from './drafts';

const draft = (overrides: Partial<Draft>): Draft => ({
  id: 'd1',
  novelId: 'n1',
  title: 'Um',
  text: 'Texto',
  order: 1,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  ...overrides,
});

describe('drafts', () => {
  it('recognizes drafts', () => {
    expect(isDraft(draft({}))).toBe(true);
    expect(isDraft(draft({ novelId: null }))).toBe(true);
    expect(isDraft(null)).toBe(false);
    expect(isDraft('x')).toBe(false);
    expect(isDraft({ ...draft({}), novelId: 3 })).toBe(false);
    expect(isDraft({ id: 'x' })).toBe(false);
  });

  it('keeps live drafts in order and filters by novel', () => {
    const entries: [string, unknown][] = [
      ['draft:c', draft({ id: 'c', order: 2 })],
      ['draft:b', draft({ id: 'b', order: 1, createdAt: '2026-11-02T00:00:00.000Z' })],
      ['draft:a', draft({ id: 'a', order: 1 })],
      ['draft:gone', draft({ id: 'gone', deletedAt: '2026-11-03T00:00:00.000Z' })],
      ['draft:broken', { id: 'broken' }],
      ['snapshot:a:1', draft({ id: 'snap' })],
      ['draft:loose', draft({ id: 'loose', novelId: null, order: 0 })],
    ];
    const live = liveDrafts(entries);

    expect(live.map((item) => item.id)).toEqual(['loose', 'a', 'b', 'c']);
    expect(draftsOf(live, null).map((item) => item.id)).toEqual(['loose']);
    expect(draftsOf(live, 'n1')).toHaveLength(3);
  });
});
