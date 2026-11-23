/**
 * The family's own videos (a relative saying "le chat", a birthday song…). The video files live in the phone's
 * IndexedDB, never on a server; AppData only keeps the title and size.
 */
const DB = 'hlc-family';
const STORE = 'videos';
export const MAX_FAMILY_BYTES = 60 * 1024 * 1024;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const putFamilyVideo = (id: string, blob: Blob) => tx('readwrite', (s) => s.put(blob, id));
export const getFamilyVideo = (id: string) => tx<Blob | undefined>('readonly', (s) => s.get(id));
export const deleteFamilyVideo = (id: string) => tx('readwrite', (s) => s.delete(id));
