import type { Draft } from '@/lib/tools/export/drafts';
import { localDb } from '@/lib/tools/local-db';

export const draft = (overrides: Partial<Draft>): Draft => ({
  id: 'd1',
  novelId: 'n1',
  title: 'O começo',
  text: 'Era uma vez.\n***\nFim.',
  order: 1,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  ...overrides,
});

export const clearDb = async (): Promise<void> => {
  const db = localDb();

  for (const [key] of await db.entries()) {
    await db.remove(key);
  }
};
