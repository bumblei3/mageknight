/**
 * IndexedDB-backed save layer for PWA offline play.
 *
 * localStorage is quota-limited and synchronous; IndexedDB gives us a larger,
 * async store that works offline. This module exposes the same shape as
 * SaveManager but backed by IndexedDB, with a graceful fallback to
 * localStorage when IndexedDB is unavailable (e.g. private mode, tests).
 */

const DB_NAME = 'mageknight-saves';
const DB_VERSION = 1;
const STORE_NAME = 'saves';
const INDEX_KEY = 'mk_save_index';

function openDb(): Promise<IDBDatabase | null> {
    return new Promise((resolve) => {
        if (typeof indexedDB === 'undefined') {
            resolve(null);
            return;
        }
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'key' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
    });
}

export class IndexedDBSaveManager {
    static async saveGame(slotKey: string | number, state: any): Promise<boolean> {
        const db = await openDb();
        const key = String(slotKey);
        const serialized = JSON.stringify(state);
        if (!db) {
            try {
                localStorage.setItem(key, serialized);
                const indexJson = localStorage.getItem(INDEX_KEY);
                const index = indexJson ? JSON.parse(indexJson) : [];
                if (!index.includes(key)) {
                    index.push(key);
                    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
                }
                return true;
            } catch {
                return false;
            }
        }
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                store.put({ key, value: serialized, timestamp: Date.now() });
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            } catch {
                resolve(false);
            }
        });
    }

    static async loadGame(slotKey: string | number): Promise<any | null> {
        const db = await openDb();
        const key = String(slotKey);
        if (!db) {
            try {
                const raw = localStorage.getItem(key);
                return raw ? JSON.parse(raw) : null;
            } catch {
                return null;
            }
        }
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const req = store.get(key);
                req.onsuccess = () => {
                    const row = req.result;
                    resolve(row ? JSON.parse(row.value) : null);
                };
                req.onerror = () => resolve(null);
            } catch {
                resolve(null);
            }
        });
    }

    static async deleteSave(slotKey: string | number): Promise<void> {
        const db = await openDb();
        const key = String(slotKey);
        if (!db) {
            try { localStorage.removeItem(key); } catch { /* ignore */ }
            try {
                const indexJson = localStorage.getItem(INDEX_KEY);
                if (indexJson) {
                    let index = JSON.parse(indexJson);
                    index = index.filter((k: string) => k !== key);
                    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
                }
            } catch { /* ignore */ }
            return;
        }
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).delete(key);
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            } catch {
                resolve();
            }
        });
    }

    static async listSaves(): Promise<string[]> {
        const db = await openDb();
        if (!db) {
            try {
                const raw = localStorage.getItem(INDEX_KEY);
                const idx = raw ? JSON.parse(raw) : [];
                return Array.isArray(idx) ? idx : [];
            } catch {
                return [];
            }
        }
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const req = tx.objectStore(STORE_NAME).getAllKeys();
                req.onsuccess = () => resolve((req.result || []).map(String));
                req.onerror = () => resolve([]);
            } catch {
                resolve([]);
            }
        });
    }
}
