import { IDBFactory } from 'fake-indexeddb';
import { indexedDbStore, localDb, memoryStore, type LocalDb } from './local-db';

const exercise = async (db: LocalDb) => {
  await db.set('draft:a', { text: 'Era uma vez' });
  await db.set('draft:b', { text: 'Fim' });
  await db.set('sheet:x', 1);

  expect(await db.get('draft:a')).toEqual({ text: 'Era uma vez' });
  expect(await db.get('missing')).toBeUndefined();
  expect((await db.entries('draft:')).map(([key]) => key)).toEqual(['draft:a', 'draft:b']);
  expect(await db.entries()).toHaveLength(3);

  await db.remove('draft:a');

  expect(await db.get('draft:a')).toBeUndefined();
};

describe('local stores', () => {
  it('keeps values in IndexedDB', async () => {
    const db = indexedDbStore(new IDBFactory());
    await exercise(db);

    expect(await db.get('draft:b')).toEqual({ text: 'Fim' });
  });

  it('keeps values in memory when IndexedDB is missing, as copies', async () => {
    const db = memoryStore();
    await exercise(db);
    const value = { text: 'original' };
    await db.set('copy', value);
    value.text = 'changed';

    expect(await db.get('copy')).toEqual({ text: 'original' });
  });

  it('shares one store, in memory where the browser has no IndexedDB', () => {
    expect(localDb()).toBe(localDb());
  });

  it('passes on an error from IndexedDB', async () => {
    const factory = new IDBFactory();
    const newer = factory.open('open-wrimo-tools', 5);
    await new Promise((resolve) => {
      newer.onsuccess = () => {
        newer.result.close();
        resolve(undefined);
      };
    });

    await expect(indexedDbStore(factory).get('anything')).rejects.toThrow();
  });

  it('uses IndexedDB when the browser has it', async () => {
    vi.stubGlobal('indexedDB', new IDBFactory());
    vi.resetModules();
    const fresh = await import('./local-db');
    await fresh.localDb().set('kept', 'yes');

    expect(await fresh.localDb().get('kept')).toBe('yes');
    vi.unstubAllGlobals();
  });
});
