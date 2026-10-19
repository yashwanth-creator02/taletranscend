import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: { currentUser: null },
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => mockAuth),
  signOut: vi.fn(() => Promise.resolve()),
  signInAnonymously: vi.fn(),
  onAuthStateChanged: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  linkWithPopup: vi.fn(),
  setPersistence: vi.fn(() => Promise.resolve()),
  browserLocalPersistence: 'local',
  browserSessionPersistence: 'session',
}));

import {
  initAuth,
  signInWithGoogle,
  upgradeAnonymousToGoogle,
  setRememberPreference,
  signOutAndForget,
} from '../auth.js';
import {
  signInAnonymously,
  onAuthStateChanged,
  signInWithPopup,
  linkWithPopup,
  signOut,
  setPersistence,
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
    localStorage.clear();
    sessionStorage.clear();
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

    it('remembers a restored account durably', async () => {
      const mockUser = { uid: 'u9', isAnonymous: false };
      onAuthStateChanged.mockImplementation((auth, callback) => {
        Promise.resolve().then(() => callback(mockUser));
        return vi.fn();
      });

      initAuth(vi.fn());

      await vi.waitFor(() => expect(localStorage.getItem('tt_auth')).not.toBeNull());
      expect(JSON.parse(localStorage.getItem('tt_auth'))).toMatchObject({
        uid: 'u9',
        anonymous: false,
        method: 'restore',
      });
    });

    it('does not remember a restored anonymous session', async () => {
      // The app auto-creates anonymous sessions on most pages. Treating one as
      // a returning visitor would disarm the first-visit login gate.
      const mockUser = { uid: 'u10', isAnonymous: true };
      onAuthStateChanged.mockImplementation((auth, callback) => {
        Promise.resolve().then(() => callback(mockUser));
        return vi.fn();
      });

      initAuth(vi.fn());

      await vi.waitFor(() => expect(onAuthStateChanged).toHaveBeenCalled());
      expect(localStorage.getItem('tt_auth')).toBeNull();
    });

    it('does not remember a freshly created anonymous session', async () => {
      const mockUser = { uid: 'u11', isAnonymous: true };
      onAuthStateChanged.mockImplementation((auth, callback) => {
        Promise.resolve().then(() => callback(null));
        return vi.fn();
      });
      signInAnonymously.mockResolvedValueOnce({ user: mockUser });

      const onReady = vi.fn();
      initAuth(onReady);

      await vi.waitFor(() => expect(onReady).toHaveBeenCalledWith(mockUser));
      expect(localStorage.getItem('tt_auth')).toBeNull();
    });
  });

  describe('setRememberPreference', () => {
    it('applies local persistence by default', async () => {
      await expect(setRememberPreference()).resolves.toBe(true);
      expect(setPersistence).toHaveBeenCalledWith(mockAuth, 'local');
    });

    it('applies session persistence when not durable', async () => {
      await expect(setRememberPreference(false)).resolves.toBe(true);
      expect(setPersistence).toHaveBeenCalledWith(mockAuth, 'session');
    });

    it('resolves false when persistence cannot be applied', async () => {
      setPersistence.mockRejectedValueOnce(new Error('unsupported'));
      await expect(setRememberPreference(false)).resolves.toBe(false);
    });
  });

  describe('signOutAndForget', () => {
    it('forgets the remembered auth and signs out', async () => {
      localStorage.setItem('tt_auth', JSON.stringify({ v: 1, uid: 'u1' }));
      localStorage.setItem('tt_has_visited', 'true');

      await signOutAndForget();

      expect(localStorage.getItem('tt_auth')).toBeNull();
      expect(localStorage.getItem('tt_has_visited')).toBeNull();
      expect(signOut).toHaveBeenCalledWith(mockAuth);
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
