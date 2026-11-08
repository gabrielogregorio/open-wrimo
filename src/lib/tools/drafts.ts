// Drafts written in the write tools, kept on this device, with snapshots to undo accidents. The key and
// value shapes are shared with the export tools, so they must not change.
import type { LocalDb } from './local-db';

export type Draft = {
  id: string;
  novelId: string | null;
  title: string;
  text: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type Snapshot = { draftId: string; text: string; takenAt: string };

export const DRAFT_PREFIX = 'draft:';
export const SNAPSHOT_PREFIX = 'snapshot:';
export const SNAPSHOT_EVERY_MS = 5 * 60_000;
export const SNAPSHOT_KEEP_MS = 60 * 60_000;
export const DELETED_KEEP_MS = 7 * 24 * 60 * 60_000;

export const draftKey = (draftId: string): string => `${DRAFT_PREFIX}${draftId}`;

export const snapshotKey = (draftId: string, takenAt: string): string => `${SNAPSHOT_PREFIX}${draftId}:${takenAt}`;

export const makeDraftId = (): string => crypto.randomUUID();

const age = (iso: string, now: Date): number => now.getTime() - new Date(iso).getTime();

type NewDraft = { id: string; title: string; now: Date; novelId?: string | null; order?: number; text?: string };

export const newDraft = ({ id, title, now, novelId = null, order = 0, text = '' }: NewDraft): Draft => ({
  id,
  novelId,
  title,
  text,
  order,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
});

// Drafts of the same novel stay together, in chapter order; loose drafts come last.
export const sortDrafts = (drafts: readonly Draft[]): Draft[] =>
  [...drafts].sort(
    (first, second) =>
      (first.novelId ?? '￿').localeCompare(second.novelId ?? '￿') ||
      first.order - second.order ||
      first.createdAt.localeCompare(second.createdAt),
  );

export const liveDrafts = (drafts: readonly Draft[]): Draft[] => drafts.filter((draft) => !draft.deletedAt);

export const deletedDrafts = (drafts: readonly Draft[], now: Date): Draft[] =>
  drafts.filter((draft) => draft.deletedAt && age(draft.deletedAt, now) < DELETED_KEEP_MS);

export const shouldSnapshot = (latest: Snapshot | undefined, text: string, now: Date): boolean => {
  if (!latest) {
    return text.length > 0;
  }

  return latest.text !== text && age(latest.takenAt, now) >= SNAPSHOT_EVERY_MS;
};

// Snapshots older than an hour go away, but the newest one always stays, however old it is.
export const expiredSnapshots = (snapshots: readonly Snapshot[], now: Date): Snapshot[] => {
  const [, ...older] = [...snapshots].sort((first, second) => second.takenAt.localeCompare(first.takenAt));

  return older.filter((snapshot) => age(snapshot.takenAt, now) > SNAPSHOT_KEEP_MS);
};

export const loadDrafts = async (db: LocalDb): Promise<Draft[]> =>
  sortDrafts((await db.entries<Draft>(DRAFT_PREFIX)).map(([, draft]) => draft));

export const loadDraft = (db: LocalDb, draftId: string): Promise<Draft | undefined> => db.get<Draft>(draftKey(draftId));

export const saveDraft = (db: LocalDb, draft: Draft): Promise<void> => db.set(draftKey(draft.id), draft);

export const loadSnapshots = async (db: LocalDb, draftId: string): Promise<Snapshot[]> =>
  (await db.entries<Snapshot>(`${SNAPSHOT_PREFIX}${draftId}:`))
    .map(([, snapshot]) => snapshot)
    .sort((first, second) => second.takenAt.localeCompare(first.takenAt));

const addSnapshot = (db: LocalDb, draftId: string, text: string, now: Date): Promise<void> => {
  const takenAt = now.toISOString();

  return db.set(snapshotKey(draftId, takenAt), { draftId, text, takenAt } satisfies Snapshot);
};

export const pruneSnapshots = async (db: LocalDb, draftId: string, now: Date): Promise<void> => {
  const expired = expiredSnapshots(await loadSnapshots(db, draftId), now);
  await Promise.all(expired.map((snapshot) => db.remove(snapshotKey(draftId, snapshot.takenAt))));
};

// Saves the new text and, at most every five minutes while it changes, keeps a snapshot of it.
export const writeDraftText = async (db: LocalDb, draft: Draft, text: string, now: Date): Promise<Draft> => {
  const updated: Draft = { ...draft, text, updatedAt: now.toISOString() };
  await saveDraft(db, updated);
  const [latest] = await loadSnapshots(db, draft.id);

  if (shouldSnapshot(latest, text, now)) {
    await addSnapshot(db, draft.id, text, now);
  }

  await pruneSnapshots(db, draft.id, now);

  return updated;
};

// The text being replaced becomes a snapshot first, so a restore can itself be undone.
export const restoreSnapshot = async (db: LocalDb, draft: Draft, snapshot: Snapshot, now: Date): Promise<Draft> => {
  const [latest] = await loadSnapshots(db, draft.id);

  if (draft.text && latest?.text !== draft.text) {
    await addSnapshot(db, draft.id, draft.text, now);
  }

  const restored: Draft = { ...draft, text: snapshot.text, updatedAt: now.toISOString() };
  await saveDraft(db, restored);

  return restored;
};

export const moveToDeleted = async (db: LocalDb, draft: Draft, now: Date): Promise<Draft> => {
  const deleted: Draft = { ...draft, deletedAt: now.toISOString() };
  await saveDraft(db, deleted);

  return deleted;
};

export const bringBack = async (db: LocalDb, draft: Draft): Promise<Draft> => {
  const restored: Draft = { ...draft };
  delete restored.deletedAt;
  await saveDraft(db, restored);

  return restored;
};

// Drafts deleted more than seven days ago are removed for good, with their snapshots.
export const purgeDeleted = async (db: LocalDb, now: Date): Promise<void> => {
  const expired = (await loadDrafts(db)).filter(
    (draft) => draft.deletedAt && age(draft.deletedAt, now) >= DELETED_KEEP_MS,
  );

  for (const draft of expired) {
    const snapshots = await loadSnapshots(db, draft.id);
    await Promise.all(snapshots.map((snapshot) => db.remove(snapshotKey(draft.id, snapshot.takenAt))));
    await db.remove(draftKey(draft.id));
  }
};

export const nextOrder = (drafts: readonly Draft[], novelId: string | null): number =>
  liveDrafts(drafts)
    .filter((draft) => draft.novelId === novelId)
    .reduce((highest, draft) => Math.max(highest, draft.order + 1), 0);
