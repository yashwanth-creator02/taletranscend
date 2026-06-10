import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addToBookmarks, removeFromBookmarks, getBookmarks } from '../bookmark.service.js';

// Mock Firebase
vi.mock('@fb/index.js', () => ({
  refs: {
    bookmark: vi.fn((uid, tid) => ({ path: `users/${uid}/bookmarks/${tid}` })),
    bookmarks: vi.fn((uid) => ({ path: `users/${uid}/bookmarks` })),
  },
  setDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  getDocs: vi.fn(() => Promise.resolve({ empty: true, docs: [] })),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
}));

describe('bookmark.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('addToBookmarks calls setDoc with correct data', async () => {
    const { setDoc, refs } = await import('@fb/index.js');

    await addToBookmarks({ userId: 'user-123', taleId: 'tale-456' });

    expect(setDoc).toHaveBeenCalledTimes(1);
    const [ref, data] = setDoc.mock.calls[0];
    expect(ref.path).toBe('users/user-123/bookmarks/tale-456');
    expect(data.taleId).toBe('tale-456');
    expect(data.taleTitle).toBe('');
    expect(data.bookmarkedAt).toBeDefined();
  });

  it('removeFromBookmarks calls deleteDoc', async () => {
    const { deleteDoc } = await import('@fb/index.js');

    await removeFromBookmarks({ userId: 'user-123', taleId: 'tale-456' });

    expect(deleteDoc).toHaveBeenCalledTimes(1);
  });
});
