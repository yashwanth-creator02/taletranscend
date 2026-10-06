// src/services/__tests__/author.service.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAuthorStatus, registerAuthor } from '../author.service.js';
import * as fb from '@fb/index.js';
import { cacheService } from '../cache.service.js';

// Mock Firebase
vi.mock('@fb/index.js', () => ({
  refs: {
    user: vi.fn((uid) => ({ path: `users/${uid}` })),
  },
  getDoc: vi.fn(),
  setDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
}));

// Mock @/utils
vi.mock('@/utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    safeAsync: vi.fn(async (p, options = {}) => {
      try {
        return await p;
      } catch (err) {
        if (options.fallback !== undefined) return options.fallback;
        throw err;
      }
    }),
    createLogger: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  };
});

describe('Author Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    cacheService.clear();
  });

  describe('getAuthorStatus', () => {
    it('returns empty defaults when no userId is passed', async () => {
      const status = await getAuthorStatus('');
      expect(status).toEqual({
        isAuthor: false,
        penName: '',
        authorEmail: '',
        authorBio: '',
      });
    });

    it('returns author status when user document exists in Firestore', async () => {
      vi.mocked(fb.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          isAuthor: true,
          penName: 'Chronicler Valen',
          authorEmail: 'valen@example.com',
          authorBio: 'Keeper of stories',
        }),
      });

      const status = await getAuthorStatus('user-123');
      expect(status.isAuthor).toBe(true);
      expect(status.penName).toBe('Chronicler Valen');
      expect(status.authorEmail).toBe('valen@example.com');
      expect(status.authorBio).toBe('Keeper of stories');
    });

    it('falls back to local storage if user document does not exist', async () => {
      vi.mocked(fb.getDoc).mockResolvedValue({
        exists: () => false,
      });

      localStorage.setItem(
        'tt_author_user-fallback',
        JSON.stringify({
          isAuthor: true,
          penName: 'Local Scribe',
          authorEmail: 'local@example.com',
          authorBio: 'Local bio',
        })
      );

      const status = await getAuthorStatus('user-fallback');
      expect(status.isAuthor).toBe(true);
      expect(status.penName).toBe('Local Scribe');
      expect(status.authorEmail).toBe('local@example.com');
    });
  });

  describe('registerAuthor', () => {
    it('throws error when user ID is missing', async () => {
      await expect(
        registerAuthor('', { penName: 'Valen', authorEmail: 'valen@test.com' })
      ).rejects.toThrow('User ID is required');
    });

    it('throws error when registration data is invalid (e.g. invalid email)', async () => {
      await expect(
        registerAuthor('user-123', { penName: 'V', authorEmail: 'not-an-email' })
      ).rejects.toThrow();
    });

    it('successfully registers an author and returns updated status', async () => {
      vi.mocked(fb.setDoc).mockResolvedValue(undefined);

      const status = await registerAuthor('user-123', {
        penName: 'Master Chronicler',
        authorEmail: 'chronicler@domain.com',
        authorBio: 'Inscribing eternity',
      });

      expect(status.isAuthor).toBe(true);
      expect(status.penName).toBe('Master Chronicler');
      expect(status.authorEmail).toBe('chronicler@domain.com');
      expect(status.authorBio).toBe('Inscribing eternity');

      expect(fb.setDoc).toHaveBeenCalledWith(
        { path: 'users/user-123' },
        expect.objectContaining({
          isAuthor: true,
          role: 'author',
          penName: 'Master Chronicler',
          authorEmail: 'chronicler@domain.com',
          authorBio: 'Inscribing eternity',
        }),
        { merge: true }
      );

      // Verify localStorage was also updated
      const local = JSON.parse(localStorage.getItem('tt_author_user-123'));
      expect(local.isAuthor).toBe(true);
      expect(local.penName).toBe('Master Chronicler');
    });
  });
});
