// src/utils/__tests__/offline-storage.utils.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveTaleOffline,
  getTaleOffline,
  removeTaleOffline,
  saveBookmarkOffline,
  getBookmarksOffline,
  syncBookmarksOffline,
} from '../offline-storage.utils.ts';

// Mock idb
vi.mock('idb', () => {
  const store = new Map();
  const db = {
    put: vi.fn((s, val) => {
      const key = s === 'reader' ? val.id : val.taleId;
      if (!store.has(s)) store.set(s, new Map());
      store.get(s).set(key, val);
      return Promise.resolve();
    }),
    get: vi.fn((s, key) => {
      return Promise.resolve(store.get(s)?.get(key));
    }),
    delete: vi.fn((s, key) => {
      store.get(s)?.delete(key);
      return Promise.resolve();
    }),
    getAll: vi.fn((s) => {
      return Promise.resolve(Array.from(store.get(s)?.values() || []));
    }),
    transaction: vi.fn(() => ({
      store: {
        clear: vi.fn(() => {
          store.get('shelf')?.clear();
          return Promise.resolve();
        }),
        put: vi.fn((val) => {
          if (!store.has('shelf')) store.set('shelf', new Map());
          store.get('shelf').set(val.taleId, val);
          return Promise.resolve();
        }),
      },
      done: Promise.resolve(),
    })),
  };
  return {
    openDB: vi.fn(() => Promise.resolve(db)),
  };
});

describe('OfflineStorage Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves and retrieves a tale', async () => {
    const tale = {
      id: 't1',
      title: 'Tale 1',
      chapters: [],
      lastReadAt: 123,
      authorName: '',
      coverUrl: '',
      synopsis: '',
    };
    await saveTaleOffline(tale);
    const retrieved = await getTaleOffline('t1');
    expect(retrieved).toEqual(tale);
  });

  it('removes a tale', async () => {
    const tale = {
      id: 't2',
      title: 'Tale 2',
      chapters: [],
      lastReadAt: 123,
      authorName: '',
      coverUrl: '',
      synopsis: '',
    };
    await saveTaleOffline(tale);
    await removeTaleOffline('t2');
    const retrieved = await getTaleOffline('t2');
    expect(retrieved).toBeUndefined();
  });

  it('saves and retrieves bookmarks', async () => {
    const bookmark = {
      taleId: 'b1',
      taleTitle: 'B1',
      authorName: '',
      coverUrl: '',
      chapterCount: 0,
      era: '',
      bookmarkedAt: 123,
    };
    await saveBookmarkOffline(bookmark);
    const bookmarks = await getBookmarksOffline();
    expect(bookmarks).toContainEqual(bookmark);
  });

  it('syncs bookmarks', async () => {
    const b1 = {
      taleId: 'sync1',
      taleTitle: 'S1',
      authorName: '',
      coverUrl: '',
      chapterCount: 0,
      era: '',
      bookmarkedAt: 1,
    };
    const b2 = {
      taleId: 'sync2',
      taleTitle: 'S2',
      authorName: '',
      coverUrl: '',
      chapterCount: 0,
      era: '',
      bookmarkedAt: 2,
    };
    await syncBookmarksOffline([b1, b2]);
    const bookmarks = await getBookmarksOffline();
    expect(bookmarks).toHaveLength(2);
    expect(bookmarks).toContainEqual(b1);
    expect(bookmarks).toContainEqual(b2);
  });
});
