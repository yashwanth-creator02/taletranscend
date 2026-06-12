// src/utils/offline-storage.utils.ts
import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'taletranscend-offline';
const DB_VERSION = 1;

export interface OfflineTale {
  id: string;
  title: string;
  authorName: string;
  coverUrl: string;
  synopsis: string;
  chapters: any[];
  lastReadAt: number;
}

export interface OfflineBookmark {
  taleId: string;
  taleTitle: string;
  coverUrl: string;
  authorName: string;
  chapterCount: number;
  era: string;
  bookmarkedAt: number;
}

let _db: Promise<IDBPDatabase> | null = null;

/**
 * Initialises and returns the IndexedDB instance.
 */
async function getDB() {
  if (_db) return _db;

  _db = openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Store full tale content for the reader
      if (!db.objectStoreNames.contains('reader')) {
        db.createObjectStore('reader', { keyPath: 'id' });
      }
      // Store bookmarks for the shelf
      if (!db.objectStoreNames.contains('shelf')) {
        db.createObjectStore('shelf', { keyPath: 'taleId' });
      }
    },
  });

  return _db;
}

/* ─────────────────────────────────────────────
   Reader (Tales)
   ───────────────────────────────────────────── */

/**
 * Saves a full tale (with metadata and chapters) for offline reading.
 */
export async function saveTaleOffline(tale: OfflineTale): Promise<void> {
  const db = await getDB();
  await db.put('reader', tale);
}

/**
 * Retrieves a tale from local storage.
 */
export async function getTaleOffline(taleId: string): Promise<OfflineTale | undefined> {
  const db = await getDB();
  return db.get('reader', taleId);
}

/**
 * Removes a tale from local storage.
 */
export async function removeTaleOffline(taleId: string): Promise<void> {
  const db = await getDB();
  await db.delete('reader', taleId);
}

/* ─────────────────────────────────────────────
   Shelf (Bookmarks)
   ───────────────────────────────────────────── */

/**
 * Saves a bookmark for offline viewing on the shelf.
 */
export async function saveBookmarkOffline(bookmark: OfflineBookmark): Promise<void> {
  const db = await getDB();
  await db.put('shelf', bookmark);
}

/**
 * Retrieves all offline bookmarks.
 */
export async function getBookmarksOffline(): Promise<OfflineBookmark[]> {
  const db = await getDB();
  return db.getAll('shelf');
}

/**
 * Saves multiple bookmarks at once (sync).
 */
export async function syncBookmarksOffline(bookmarks: OfflineBookmark[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('shelf', 'readwrite');
  await tx.store.clear();
  for (const b of bookmarks) {
    await tx.store.put(b);
  }
  await tx.done;
}

/**
 * Removes a bookmark from offline storage.
 */
export async function removeBookmarkOffline(taleId: string): Promise<void> {
  const db = await getDB();
  await db.delete('shelf', taleId);
}
