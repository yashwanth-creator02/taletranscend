import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toggleResonance, getResonanceStatus } from '../resonance.service.js';

// Mock @fb/index.js
vi.mock('@fb/index.js', () => ({
  auth: { currentUser: { uid: 'u1' } },
  getDoc: vi.fn(),
  setDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(() => Promise.resolve()),
  increment: vi.fn((v) => ({ type: 'increment', value: v })),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
  refs: {
    taleReaction: vi.fn((tid, uid) => ({ path: `tales/${tid}/reactions/${uid}` })),
    tale: vi.fn((tid) => ({ path: `tales/${tid}` })),
  },
}));

// Mock @/utils
vi.mock('@/utils', () => ({
  safeCall: vi.fn(async (promise, fallback) => {
    try {
      return await promise;
    } catch {
      return fallback;
    }
  }),
  guardOffline: vi.fn(() => false),
  checkRateLimit: vi.fn(() => true),
  escapeText: vi.fn((s) => s),
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
  })),
}));

describe('ResonanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('toggleResonance', () => {
    it('should throw error if not authenticated', async () => {
      const { auth } = await import('@fb/index.js');
      const originalUser = auth.currentUser;
      auth.currentUser = null;
      await expect(toggleResonance('t1')).rejects.toThrow('Authentication required');
      auth.currentUser = originalUser;
    });

    it('should add reaction if it does not exist (toggle ON)', async () => {
      const { getDoc, setDoc, updateDoc, auth } = await import('@fb/index.js');
      auth.currentUser = { uid: 'u1' };

      getDoc
        .mockResolvedValueOnce({ exists: () => false }) // reactionSnap
        .mockResolvedValueOnce({
          // updatedSnap
          data: () => ({ reactionCount: 10 }),
        });

      const result = await toggleResonance('t1');

      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: 'u1',
          type: 'like',
        })
      );
      expect(updateDoc).toHaveBeenCalled();
      expect(result).toEqual({ active: true, count: 10 });
    });

    it('should remove reaction if it exists (toggle OFF)', async () => {
      const { getDoc, deleteDoc, updateDoc, auth } = await import('@fb/index.js');
      auth.currentUser = { uid: 'u1' };

      getDoc
        .mockResolvedValueOnce({ exists: () => true }) // reactionSnap
        .mockResolvedValueOnce({
          // updatedSnap
          data: () => ({ reactionCount: 9 }),
        });

      const result = await toggleResonance('t1');

      expect(deleteDoc).toHaveBeenCalled();
      expect(updateDoc).toHaveBeenCalled();
      expect(result).toEqual({ active: false, count: 9 });
    });

    it('returns error status if rate-limited', async () => {
      const { checkRateLimit } = await import('@/utils');
      vi.mocked(checkRateLimit).mockReturnValue(false);

      const result = await toggleResonance('t1');

      expect(result.status).toBe('rate-limited');
    });
  });

  describe('getResonanceStatus', () => {
    it('should return true if reaction exists', async () => {
      const { getDoc, auth } = await import('@fb/index.js');
      auth.currentUser = { uid: 'u1' };
      getDoc.mockResolvedValueOnce({ exists: () => true });
      const result = await getResonanceStatus('t1');
      expect(result).toBe(true);
    });

    it('should return false if reaction does not exist', async () => {
      const { getDoc, auth } = await import('@fb/index.js');
      auth.currentUser = { uid: 'u1' };
      getDoc.mockResolvedValueOnce({ exists: () => false });
      const result = await getResonanceStatus('t1');
      expect(result).toBe(false);
    });
  });
});
