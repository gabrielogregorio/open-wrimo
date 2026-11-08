// A small key-value store in the browser's IndexedDB, where the tools keep drafts, sheets and boards.
// Nothing leaves the device. Without IndexedDB (old browsers, some private windows) it falls back to
// memory for the session, so the tools still work.
const DATABASE = 'open-wrimo-tools';
const STORE = 'items';

export type LocalDb = {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
  entries<T>(prefix?: string): Promise<[string, T][]>;
};

const requestResult = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const openDatabase = (factory: IDBFactory): Promise<IDBDatabase> => {
  const request = factory.open(DATABASE, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE);

  return requestResult(request);
};

export const indexedDbStore = (factory: IDBFactory): LocalDb => {
  let opened: Promise<IDBDatabase> | null = null;
  const store = async (mode: IDBTransactionMode): Promise<IDBObjectStore> => {
    opened ??= openDatabase(factory);

    return (await opened).transaction(STORE, mode).objectStore(STORE);
  };

  return {
    async get<T>(key: string) {
      return (await requestResult((await store('readonly')).get(key))) as T | undefined;
    },
    async set(key, value) {
      await requestResult((await store('readwrite')).put(value, key));
    },
    async remove(key) {
      await requestResult((await store('readwrite')).delete(key));
    },
    async entries<T>(prefix = '') {
      const items = await store('readonly');
      const [keys, values] = await Promise.all([requestResult(items.getAllKeys()), requestResult(items.getAll())]);

      return keys
        .map((key, index): [string, T] => [String(key), values[index] as T])
        .filter(([key]) => key.startsWith(prefix));
    },
  };
};

export const memoryStore = (): LocalDb => {
  const items = new Map<string, unknown>();

  return {
    async get<T>(key: string) {
      return items.get(key) as T | undefined;
    },
    async set(key, value) {
      items.set(key, structuredClone(value));
    },
    async remove(key) {
      items.delete(key);
    },
    async entries<T>(prefix = '') {
      return [...items.entries()]
        .filter(([key]) => key.startsWith(prefix))
        .sort(([first], [second]) => first.localeCompare(second))
        .map(([key, value]): [string, T] => [key, value as T]);
    },
  };
};

let shared: LocalDb | null = null;

export const localDb = (): LocalDb => {
  shared ??= typeof indexedDB === 'undefined' ? memoryStore() : indexedDbStore(indexedDB);

  return shared;
};
