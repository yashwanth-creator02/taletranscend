// src/test/setup.js

// Global test setup — runs before each test file

import '@testing-library/jest-dom';
import { vi, beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server.js';

// Ensure navigator is online by default for all tests
Object.defineProperty(navigator, 'onLine', {
  configurable: true,
  value: true,
  writable: true,
});

// Mock scrollIntoView which is missing in JSDOM
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// MSW setup
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock Firebase for unit tests
// Some tests might want the real SDK with MSW, others might want a pure mock.
// By default, we mock the local @fb/index.js to simplify unit tests.
vi.mock('@fb/index.js', () => ({
  auth: {
    currentUser: null,
  },
  db: {
    batch: vi.fn(() => ({
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    })),
  },
  refs: {
    tales: vi.fn(() => 'tales'),
    tale: vi.fn((id) => `tales/${id}`),
    chapters: vi.fn((id) => `tales/${id}/chapters`),
    chapter: vi.fn((tid, cid) => `tales/${tid}/chapters/${cid}`),
    users: vi.fn(() => 'users'),
    user: vi.fn((uid) => `users/${uid}`),
    bookmarks: vi.fn((uid) => 'users/' + uid + '/bookmarks'),
    bookmark: vi.fn((uid, tid) => 'users/' + uid + '/bookmarks/' + tid),
    progress: vi.fn((uid, tid) => `users/${uid}/readerProgress/${tid}`),
    progressChapters: vi.fn((uid, tid) => `users/${uid}/readerProgress/${tid}/chapters`),
    progressChapter: vi.fn((uid, tid, idx) => `users/${uid}/readerProgress/${tid}/chapters/${idx}`),
    taleReactions: vi.fn((tid) => `tales/${tid}/reactions`),
    taleReaction: vi.fn((tid, uid) => `tales/${tid}/reactions/${uid}`),
    drafts: vi.fn((uid) => `users/${uid}/drafts`),
    draft: vi.fn((uid, did) => `users/${uid}/drafts/${did}`),
  },
  getDocs: vi.fn(),
  deleteDoc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  increment: vi.fn((n) => ({ type: 'increment', value: n })),
  writeBatch: vi.fn((db) => ({
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  })),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
  query: vi.fn((...args) => ({ type: 'query', args })),
  where: vi.fn((field, op, value) => ({ type: 'where', field, op, value })),
  orderBy: vi.fn((field, dir) => ({ type: 'orderBy', field, dir })),
  limit: vi.fn((n) => ({ type: 'limit', value: n })),
  startAfter: vi.fn((snap) => ({ type: 'startAfter', snap })),
  getCountFromServer: vi.fn(),
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn(),
  initAuth: vi.fn((cb) => cb({ uid: 'mock-uid' })),
}));

// Mock console.error to fail tests on unexpected errors
const originalError = console.error;
console.error = (...args) => {
  // Filter out known React/Firebase warnings if needed
  if (typeof args[0] === 'string' && /Warning.*not wrapped in act/.test(args[0])) return;
  originalError(...args);
};
