import {
  DELETED_KEEP_MS,
  bringBack,
  deletedDrafts,
  draftKey,
  expiredSnapshots,
  liveDrafts,
  loadDraft,
  loadDrafts,
  loadSnapshots,
  makeDraftId,
  moveToDeleted,
  newDraft,
  nextOrder,
  purgeDeleted,
  restoreSnapshot,
  saveDraft,
  shouldSnapshot,
  snapshotKey,
  sortDrafts,
  writeDraftText,
  type Draft,
} from './drafts';
import { memoryStore } from './local-db';

const at = (minutes: number): Date => new Date(Date.UTC(2026, 10, 8, 10, 0) + minutes * 60_000);

const draft = (id: string, extra: Partial<Draft> = {}): Draft => ({
  ...newDraft({ id, title: `Draft ${id}`, now: at(0) }),
  ...extra,
});

describe('draft keys and ids', () => {
  it('builds the shared keys', () => {
    expect(draftKey('a1')).toBe('draft:a1');
    expect(snapshotKey('a1', '2026-11-08T10:00:00.000Z')).toBe('snapshot:a1:2026-11-08T10:00:00.000Z');
  });

  it('makes unique ids', () => {
    expect(makeDraftId()).not.toBe(makeDraftId());
  });

  it('creates a draft with defaults and with a novel', () => {
    expect(newDraft({ id: 'a', title: 'T', now: at(0) })).toEqual({
      id: 'a',
      novelId: null,
      title: 'T',
      text: '',
      order: 0,
      createdAt: '2026-11-08T10:00:00.000Z',
      updatedAt: '2026-11-08T10:00:00.000Z',
    });
    expect(newDraft({ id: 'b', title: 'T', now: at(0), novelId: 'n1', order: 3, text: 'Hi' })).toMatchObject({
      novelId: 'n1',
      order: 3,
      text: 'Hi',
    });
  });
});

describe('pure helpers', () => {
  it('sorts by novel, order and creation, loose drafts last', () => {
    const drafts = [
      draft('loose'),
      draft('n2', { novelId: 'b' }),
      draft('late', { novelId: 'a', order: 1, createdAt: at(5).toISOString() }),
      draft('early', { novelId: 'a', order: 1 }),
      draft('first', { novelId: 'a', order: 0 }),
      draft('loose2', { createdAt: at(-1).toISOString() }),
    ];

    expect(sortDrafts(drafts).map((item) => item.id)).toEqual(['first', 'early', 'late', 'n2', 'loose2', 'loose']);
  });

  it('separates live and recently deleted drafts', () => {
    const drafts = [
      draft('live'),
      draft('recent', { deletedAt: at(0).toISOString() }),
      draft('old', { deletedAt: new Date(at(0).getTime() - DELETED_KEEP_MS).toISOString() }),
    ];

    expect(liveDrafts(drafts).map((item) => item.id)).toEqual(['live']);
    expect(deletedDrafts(drafts, at(1)).map((item) => item.id)).toEqual(['recent']);
  });

  it('snapshots the first text and then at most every five minutes while it changes', () => {
    expect(shouldSnapshot(undefined, '', at(0))).toBe(false);
    expect(shouldSnapshot(undefined, 'a', at(0))).toBe(true);
    const latest = { draftId: 'a', text: 'a', takenAt: at(0).toISOString() };

    expect(shouldSnapshot(latest, 'ab', at(4))).toBe(false);
    expect(shouldSnapshot(latest, 'a', at(10))).toBe(false);
    expect(shouldSnapshot(latest, 'ab', at(5))).toBe(true);
  });

  it('expires snapshots older than an hour but keeps the newest', () => {
    const snapshot = (minutes: number) => ({ draftId: 'a', text: String(minutes), takenAt: at(minutes).toISOString() });

    expect(expiredSnapshots([], at(0))).toEqual([]);
    expect(expiredSnapshots([snapshot(0)], at(500))).toEqual([]);
    expect(expiredSnapshots([snapshot(0), snapshot(100), snapshot(30)], at(100)).map((item) => item.text)).toEqual([
      '30',
      '0',
    ]);
  });

  it('puts the next chapter after the last live one of the same novel', () => {
    const drafts = [
      draft('a', { novelId: 'n', order: 2 }),
      draft('b', { novelId: 'n', order: 7, deletedAt: at(0).toISOString() }),
      draft('c', { order: 4 }),
    ];

    expect(nextOrder(drafts, 'n')).toBe(3);
    expect(nextOrder(drafts, null)).toBe(5);
    expect(nextOrder(drafts, 'other')).toBe(0);
  });
});

describe('stored drafts', () => {
  it('saves, loads and lists drafts', async () => {
    const db = memoryStore();
    await saveDraft(db, draft('b', { order: 1 }));
    await saveDraft(db, draft('a'));

    expect((await loadDraft(db, 'a'))?.title).toBe('Draft a');
    expect((await loadDrafts(db)).map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('writes text with snapshots every five minutes and prunes old ones', async () => {
    const db = memoryStore();
    let current = draft('a');
    current = await writeDraftText(db, current, 'one', at(0));
    current = await writeDraftText(db, current, 'one two', at(2));

    expect((await loadSnapshots(db, 'a')).map((item) => item.text)).toEqual(['one']);
    current = await writeDraftText(db, current, 'one two three', at(6));
    current = await writeDraftText(db, current, 'four', at(40));

    expect(current.text).toBe('four');
    expect(current.updatedAt).toBe(at(40).toISOString());
    expect((await loadDraft(db, 'a'))?.text).toBe('four');
    expect((await loadSnapshots(db, 'a')).map((item) => item.text)).toEqual(['four', 'one two three', 'one']);
    await writeDraftText(db, current, 'five', at(140));

    expect((await loadSnapshots(db, 'a')).map((item) => item.text)).toEqual(['five']);
  });

  it('restores a snapshot after keeping the current text', async () => {
    const db = memoryStore();
    const current = await writeDraftText(db, draft('a'), 'old', at(0));
    const [snapshot] = await loadSnapshots(db, 'a');
    const changed = { ...current, text: 'new' };
    const restored = await restoreSnapshot(db, changed, snapshot, at(1));

    expect(restored.text).toBe('old');
    expect((await loadSnapshots(db, 'a')).map((item) => item.text)).toEqual(['new', 'old']);
    await restoreSnapshot(db, { ...restored, text: 'new' }, snapshot, at(2));

    expect(await loadSnapshots(db, 'a')).toHaveLength(2);
    await restoreSnapshot(db, { ...restored, text: '' }, snapshot, at(3));

    expect(await loadSnapshots(db, 'a')).toHaveLength(2);
  });

  it('moves to the deleted list, brings back and purges after seven days', async () => {
    const db = memoryStore();
    const deleted = await moveToDeleted(db, draft('a'), at(0));
    await writeDraftText(db, deleted, 'text', at(0));

    expect((await loadDraft(db, 'a'))?.deletedAt).toBe(at(0).toISOString());
    const restored = await bringBack(db, deleted);

    expect(restored).not.toHaveProperty('deletedAt');
    expect(await loadDraft(db, 'a')).not.toHaveProperty('deletedAt');
    await moveToDeleted(db, restored, at(0));
    await saveDraft(db, draft('live'));
    await purgeDeleted(db, at(60));

    expect(await loadDraft(db, 'a')).toBeDefined();
    await purgeDeleted(db, new Date(at(0).getTime() + DELETED_KEEP_MS));

    expect(await loadDraft(db, 'a')).toBeUndefined();
    expect(await loadSnapshots(db, 'a')).toEqual([]);
    expect(await loadDraft(db, 'live')).toBeDefined();
  });
});
