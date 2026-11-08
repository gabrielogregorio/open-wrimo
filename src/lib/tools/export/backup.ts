// The full backup of what the tools keep on this device: every IndexedDB entry plus a few browser
// settings, as a backup.json inside a zip with readable .txt copies of the drafts.
import { DRAFT_PREFIX, isDraft, liveDrafts } from './drafts';
import { slugify } from './text';
import { createZip, isZip, readZip, textOf } from './zip';

export const BACKUP_FORMAT = 'open-wrimo-tools-backup';
export const BACKUP_VERSION = 1;
export const BACKUP_UNREADABLE = 'This file is not a backup of the tools.';
// Browser settings that travel with the backup.
export const BACKUP_LOCAL_KEYS = ['openwrimo-favorite-tools'];

export type Backup = {
  format: typeof BACKUP_FORMAT;
  version: number;
  createdAt: string;
  entries: Record<string, unknown>;
  localStorage: Record<string, string>;
};

export const makeBackup = (
  entries: [string, unknown][],
  localValues: Record<string, string>,
  createdAt: Date,
): Backup => ({
  format: BACKUP_FORMAT,
  version: BACKUP_VERSION,
  createdAt: createdAt.toISOString(),
  entries: Object.fromEntries(entries),
  localStorage: Object.fromEntries(Object.entries(localValues).filter(([key]) => BACKUP_LOCAL_KEYS.includes(key))),
});

export const backupZip = (backup: Backup): Uint8Array => {
  const drafts = liveDrafts(Object.entries(backup.entries)).map((draft, index) => ({
    name: `drafts/${String(index + 1).padStart(3, '0')}-${slugify(draft.title, 'draft')}.txt`,
    data: `${draft.title}\n\n${draft.text}\n`,
  }));

  return createZip(
    [{ name: 'backup.json', data: JSON.stringify(backup, null, 2) }, ...drafts],
    new Date(backup.createdAt),
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const parseBackup = (bytes: Uint8Array): Backup => {
  let text: string;

  try {
    text = isZip(bytes)
      ? textOf(readZip(bytes).find((entry) => entry.name === 'backup.json')?.data ?? new Uint8Array())
      : textOf(bytes);
  } catch {
    throw new Error(BACKUP_UNREADABLE);
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(BACKUP_UNREADABLE);
  }

  if (!isRecord(parsed) || parsed.format !== BACKUP_FORMAT || !isRecord(parsed.entries)) {
    throw new Error(BACKUP_UNREADABLE);
  }

  const localValues = isRecord(parsed.localStorage) ? parsed.localStorage : {};

  return {
    format: BACKUP_FORMAT,
    version: typeof parsed.version === 'number' ? parsed.version : BACKUP_VERSION,
    createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : '',
    entries: parsed.entries,
    localStorage: Object.fromEntries(
      Object.entries(localValues).filter(
        (entry): entry is [string, string] => BACKUP_LOCAL_KEYS.includes(entry[0]) && typeof entry[1] === 'string',
      ),
    ),
  };
};

export type RestoreAction = 'add' | 'replace' | 'keep';

export type RestoreItem = { key: string; action: RestoreAction };

// What a restore would do: new keys are added, equal ones skipped, drafts keep the newer version and
// everything else takes the backup's value.
export const planRestore = (current: [string, unknown][], backup: Backup): RestoreItem[] => {
  const existing = new Map(current);

  return Object.entries(backup.entries).flatMap(([key, incoming]): RestoreItem[] => {
    if (!existing.has(key)) {
      return [{ key, action: 'add' }];
    }

    const present = existing.get(key);

    if (JSON.stringify(present) === JSON.stringify(incoming)) {
      return [];
    }

    if (
      key.startsWith(DRAFT_PREFIX) &&
      isDraft(present) &&
      isDraft(incoming) &&
      present.updatedAt > incoming.updatedAt
    ) {
      return [{ key, action: 'keep' }];
    }

    return [{ key, action: 'replace' }];
  });
};
