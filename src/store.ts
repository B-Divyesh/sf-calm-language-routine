import type { Card, Reflection, Session, Settings } from './types';

const DB_NAME = 'quiet-loop';
const DB_VERSION = 1;
const DEFAULTS: Settings = { dailyLimit: 7, weeklyPlan: false, theme: 'system' };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('cards')) db.createObjectStore('cards', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions', { keyPath: 'date' });
      if (!db.objectStoreNames.contains('reflections')) db.createObjectStore('reflections', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open device storage.'));
  });
}

async function request<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const operation = fn(tx.objectStore(store));
    operation.onsuccess = () => resolve(operation.result);
    operation.onerror = () => reject(operation.error ?? new Error('Storage action failed.'));
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('Storage action failed.')); };
  });
}

export const db = {
  allCards: () => request<Card[]>('cards', 'readonly', (s) => s.getAll()),
  putCard: (card: Card) => request<IDBValidKey>('cards', 'readwrite', (s) => s.put(card)),
  putCards: async (cards: Card[]) => { for (const card of cards) await db.putCard(card); },
  getSettings: async (): Promise<Settings> => {
    const record = await request<{ key: string; value: Settings } | undefined>('settings', 'readonly', (s) => s.get('main'));
    return { ...DEFAULTS, ...(record?.value ?? {}) };
  },
  putSettings: (value: Settings) => request<IDBValidKey>('settings', 'readwrite', (s) => s.put({ key: 'main', value })),
  getSession: (date: string) => request<Session | undefined>('sessions', 'readonly', (s) => s.get(date)),
  putSession: (session: Session) => request<IDBValidKey>('sessions', 'readwrite', (s) => s.put(session)),
  allReflections: () => request<Reflection[]>('reflections', 'readonly', (s) => s.getAll()),
  putReflection: (reflection: Reflection) => request<IDBValidKey>('reflections', 'readwrite', (s) => s.put(reflection)),
  clearAll: async () => {
    const database = await openDb();
    await Promise.all(['cards', 'settings', 'sessions', 'reflections'].map((name) => new Promise<void>((resolve, reject) => {
      const tx = database.transaction(name, 'readwrite');
      tx.objectStore(name).clear(); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    })));
    database.close();
  }
};
