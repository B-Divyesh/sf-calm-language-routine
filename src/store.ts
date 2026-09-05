import type { Backup, Card, Reflection, Session, Settings } from './types';

const DB_VERSION = 1;
const DEFAULTS: Settings = { dailyLimit: 7, weeklyPlan: false, theme: 'system' };

export function createStore(databaseName: string) {
  function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('cards')) database.createObjectStore('cards', { keyPath: 'id' });
        if (!database.objectStoreNames.contains('settings')) database.createObjectStore('settings', { keyPath: 'key' });
        if (!database.objectStoreNames.contains('sessions')) database.createObjectStore('sessions', { keyPath: 'date' });
        if (!database.objectStoreNames.contains('reflections')) database.createObjectStore('reflections', { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Could not open device storage.'));
    });
  }

  async function request<T>(store: string, mode: IDBTransactionMode, fn: (value: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const database = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(store, mode);
      const operation = fn(transaction.objectStore(store));
      operation.onsuccess = () => resolve(operation.result);
      operation.onerror = () => reject(operation.error ?? new Error('Storage action failed.'));
      transaction.oncomplete = () => database.close();
      transaction.onerror = () => {
        database.close();
        reject(transaction.error ?? new Error('Storage action failed.'));
      };
    });
  }

  async function writeBackup(backup: Backup): Promise<void> {
    const database = await openDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(['cards', 'settings', 'sessions', 'reflections'], 'readwrite');
      const cards = transaction.objectStore('cards');
      const sessions = transaction.objectStore('sessions');
      const reflections = transaction.objectStore('reflections');
      for (const card of backup.cards) cards.put(card);
      for (const session of backup.sessions) sessions.put(session);
      for (const reflection of backup.reflections) reflections.put(reflection);
      transaction.objectStore('settings').put({ key: 'main', value: backup.settings });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Backup import failed.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Backup import failed.'));
    });
    database.close();
  }

  async function clearAll(): Promise<void> {
    const database = await openDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(['cards', 'settings', 'sessions', 'reflections'], 'readwrite');
      for (const name of ['cards', 'settings', 'sessions', 'reflections']) transaction.objectStore(name).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not clear local data.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Could not clear local data.'));
    });
    database.close();
  }

  return {
    allCards: () => request<unknown[]>('cards', 'readonly', (store) => store.getAll()),
    putCard: (card: Card) => request<IDBValidKey>('cards', 'readwrite', (store) => store.put(card)),
    getSettings: async (): Promise<unknown> => {
      const stored = await request<{ key: string; value: unknown } | undefined>('settings', 'readonly', (store) => store.get('main'));
      return stored?.value ?? DEFAULTS;
    },
    putSettings: (value: Settings) => request<IDBValidKey>('settings', 'readwrite', (store) => store.put({ key: 'main', value })),
    getSession: (date: string) => request<unknown>('sessions', 'readonly', (store) => store.get(date)),
    allSessions: () => request<unknown[]>('sessions', 'readonly', (store) => store.getAll()),
    putSession: (session: Session) => request<IDBValidKey>('sessions', 'readwrite', (store) => store.put(session)),
    allReflections: () => request<unknown[]>('reflections', 'readonly', (store) => store.getAll()),
    putReflection: (reflection: Reflection) => request<IDBValidKey>('reflections', 'readwrite', (store) => store.put(reflection)),
    writeBackup,
    clearAll
  };
}

export type QuietLoopStore = ReturnType<typeof createStore>;
