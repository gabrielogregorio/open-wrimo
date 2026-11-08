// Shared fixtures of the write tool tests.
import type { ToolData } from '@/lib/tools/data';
import { localDb } from '@/lib/tools/local-db';

export const toolData: ToolData = {
  today: '2026-11-08',
  novels: [
    {
      id: 'n1',
      title: 'Novel',
      totalWords: 0,
      goals: [{ id: 'g1', name: 'Nov', target: 50000, total: 0, startDate: '2026-11-01', endDate: '2026-11-30' }],
    },
    {
      id: 'n2',
      title: 'Other',
      totalWords: 0,
      goals: [{ id: 'g2', name: 'Dec', target: 1000, total: 0, startDate: '2026-12-01', endDate: '2026-12-31' }],
    },
  ],
  wordsByDay: [],
};

export const clearLocalDb = async (): Promise<void> => {
  const db = localDb();

  for (const [key] of await db.entries()) {
    await db.remove(key);
  }
};
