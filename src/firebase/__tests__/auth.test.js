import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: { currentUser: null },
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => mockAuth),
  signOut: vi.fn(),
  signInAnonymously: vi.fn(),
  onAuthStateChanged: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  linkWithPopup: vi.fn(),
}));

import { initAuth, signInWithGoogle, upgradeAnonymousToGoogle } from '../auth.js';
import {
  signInAnonymously,
  onAuthStateChanged,
  signInWithPopup,
  linkWithPopup,
} from 'firebase/auth';

vi.mock('../app.js', () => ({
  default: {},
}));

vi.mock('@/utils', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('firebase/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.currentUser = null;
  });

  describe('initAuth', () => {
    it('calls onReady with existing user', async () => {
      const mockUser = { uid: 'u1', isAnonymous: true };
      onAuthStateChanged.mockImplementation((auth, callback) => {
        // Use a microtask to ensure unsubscribe is initialized
        Promise.resolve().then(() => callback(mockUser));
        return vi.fn();
      });

      const onReady = vi.fn();
      initAuth(onReady);

      await vi.waitFor(() => expect(onReady).toHaveBeenCalledWith(mockUser));
      expect(signInAnonymously).not.toHaveBeenCalled();
    });

    it('signs in anonymously if no existing user', async () => {
      const mockUser = { uid: 'u2', isAnonymous: true };
      onAuthStateChanged.mockImplementation((auth, callback) => {
        Promise.resolve().then(() => callback(null));
        return vi.fn();
      });
      signInAnonymously.mockResolvedValueOnce({ user: mockUser });

      const onReady = vi.fn();
      initAuth(onReady);

      await vi.waitFor(() => expect(onReady).toHaveBeenCalledWith(mockUser));
      expect(signInAnonymously).toHaveBeenCalled();
    });
  });

  describe('signInWithGoogle', () => {
    it('calls signInWithPopup and returns user', async () => {
      const mockUser = { uid: 'u3' };
      signInWithPopup.mockResolvedValueOnce({ user: mockUser });

      const user = await signInWithGoogle();
      expect(user).toBe(mockUser);
      expect(signInWithPopup).toHaveBeenCalled();
    });
  });

  describe('upgradeAnonymousToGoogle', () => {
    it('throws error if no current user', async () => {
      mockAuth.currentUser = null;
      await expect(upgradeAnonymousToGoogle()).rejects.toThrow('No user is currently signed in.');
    });

    it('calls linkWithPopup if user exists', async () => {
      const mockUser = { uid: 'u4' };
      mockAuth.currentUser = mockUser;
      linkWithPopup.mockResolvedValueOnce({ user: mockUser });

      const user = await upgradeAnonymousToGoogle();
      expect(user).toBe(mockUser);
      expect(linkWithPopup).toHaveBeenCalledWith(mockUser, expect.anything());
    });
  });
});
