// src/test/setup.js
// Global test setup — runs before each test file

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Firebase for unit tests
vi.mock('@fb/index.js', () => ({
  auth: {},
  db: {},
  refs: {
    tales: vi.fn(() => 'tales'),
    tale: vi.fn((id) => `tales/${id}`),
    chapters: vi.fn((id) => `tales/${id}/chapters`),
    chapter: vi.fn((tid, cid) => `tales/${tid}/chapters/${cid}`),
    users: vi.fn(() => 'users'),
    user: vi.fn((uid) => `users/${uid}`),
    bookmarks: vi.fn((uid) => `users/${uid}/bookmarks`),
    bookmark: vi.fn((uid, tid) => `users/${uid}/bookmarks/${tid}`),
    progress: vi.fn((uid, tid) => `users/${uid}/readerProgress/${tid}`),
    progressChapter: vi.fn((uid, tid, idx) => `users/${uid}/readerProgress/${tid}/chapters/${idx}`),
  },
}));

// Mock console.error to fail tests on unexpected errors
const originalError = console.error;
console.error = (...args) => {
  // Filter out known React/Firebase warnings if needed
  if (typeof args[0] === 'string' && /Warning.*not wrapped in act/.test(args[0])) return;
  originalError(...args);
};
