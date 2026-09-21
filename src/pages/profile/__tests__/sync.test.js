// src/pages/profile/__tests__/sync.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startProfileSync, stopProfileSync, saveProfile, computeAndSyncStats } from '../sync.js';
import { profileState } from '../state.js';
import * as fb from '@fb/index.js';
import * as ui from '../ui.js';

vi.mock('@fb/index.js', () => ({
  auth: { currentUser: { uid: 'u1' } },
  onSnapshot: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'ts'),
  refs: { user: vi.fn(() => 'user-ref') },
}));

vi.mock('../ui.js', () => ({
  updateProfileUI: vi.fn(),
  showNotification: vi.fn(),
}));

vi.mock('@/utils', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
  setText: vi.fn(),
  escapeText: vi.fn((s) => s),
  formatNumber: vi.fn((n) => String(n)),
  validateData: vi.fn((schema, data) => ({ success: true, data })),
  UserProfileSchema: {},
}));

describe('ProfileSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profileState.unsubscribeProfile = null;
    profileState.favouriteGenres = [];
  });

  describe('startProfileSync', () => {
    it('sets up onSnapshot listener', () => {
      startProfileSync('u1');
      expect(fb.onSnapshot).toHaveBeenCalled();
      expect(profileState.uid).toBe('u1');
    });

    it('updates state and UI on snapshot', () => {
      let callback;
      vi.mocked(fb.onSnapshot).mockImplementation((ref, cb) => {
        callback = cb;
        return vi.fn();
      });

      startProfileSync('u1');

      const mockSnap = {
        exists: () => true,
        data: () => ({ name: 'New Name', bio: 'New Bio' }),
      };
      callback(mockSnap);

      expect(profileState.name).toBe('New Name');
      expect(ui.updateProfileUI).toHaveBeenCalledWith(profileState);
    });
  });

  describe('stopProfileSync', () => {
    it('calls unsubscribe', () => {
      const unsub = vi.fn();
      profileState.unsubscribeProfile = unsub;
      stopProfileSync();
      expect(unsub).toHaveBeenCalled();
      expect(profileState.unsubscribeProfile).toBeNull();
    });
  });

  describe('saveProfile', () => {
    it('reads from DOM and calls setDoc', async () => {
      document.body.innerHTML = `
        <input id="input-name" value="Scribe" />
        <input id="input-bio" value="Bio" />
        <input id="input-pronouns" value="" />
        <input id="input-avatar-url" value="" />
        <input id="input-location" value="" />
        <input id="input-website" value="" />
        <input id="input-twitter" value="" />
        <input id="input-instagram" value="" />
        <input id="input-reading-goal" value="50" />
      `;

      vi.mocked(fb.getDoc).mockResolvedValue({ exists: () => true });

      await saveProfile();

      expect(fb.setDoc).toHaveBeenCalledWith(
        'user-ref',
        expect.objectContaining({
          name: 'Scribe',
          readingGoal: 50,
        }),
        { merge: true }
      );
      expect(ui.showNotification).toHaveBeenCalledWith(expect.stringContaining('saved'), 'success');
    });
  });

  describe('computeAndSyncStats', () => {
    it('calculates stats from published tales and service', async () => {
      // Mock the lazy-loaded service functions
      const mockCompute = vi.fn(() => Promise.resolve(5000));
      const mockGetTales = vi.fn(() => Promise.resolve([{ readCount: 10 }, { readCount: 20 }]));

      // Mock @services/index.js (ensure it's used by the lazy import)
      vi.doMock('@services/index.js', () => ({
        computeAndSyncStats: mockCompute,
        getUserPublishedTales: mockGetTales,
      }));

      const result = await computeAndSyncStats('u1');

      expect(result.wordsWritten).toBe(5000);
      expect(result.readers).toBe(30);
      expect(result.readingTime).toBe(1500); // 5000 * 0.3
    });
  });
});
