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
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  deleteUser: vi.fn(),
  EmailAuthProvider: {
    credential: vi.fn(() => ({ providerId: 'password' })),
  },
  linkWithCredential: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  updatePassword: vi.fn(),
  setPersistence: vi.fn(() => Promise.resolve()),
  browserLocalPersistence: 'local',
  browserSessionPersistence: 'session',
}));

import {
  initAuth,
  signInWithGoogle,
  upgradeAnonymousToGoogle,
  upgradeAnonymousToEmail,
  updateUserPassword,
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
  EmailAuthProvider,
  linkWithCredential,
  reauthenticateWithCredential,
  updatePassword,
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

    it('keeps a session-only login session-only when its session is restored', async () => {
      // Regression guard: the login page hands over to another page, which
      // restores the session. Promoting it here would silently defeat the
      // unchecked "Keep me signed in" checkbox.
      sessionStorage.setItem(
        'tt_auth',
        JSON.stringify({ v: 1, uid: 'u9', anonymous: false, method: 'google', at: 1 })
      );
      const mockUser = { uid: 'u9', isAnonymous: false };
      onAuthStateChanged.mockImplementation((auth, callback) => {
        Promise.resolve().then(() => callback(mockUser));
        return vi.fn();
      });

      initAuth(vi.fn());

      await vi.waitFor(() =>
        expect(JSON.parse(sessionStorage.getItem('tt_auth')).method).toBe('restore')
      );
      expect(localStorage.getItem('tt_auth')).toBeNull();
    });

    it('keeps a durable login durable when its session is restored', async () => {
      const mockUser = { uid: 'u12', isAnonymous: false };
      onAuthStateChanged.mockImplementation((auth, callback) => {
        Promise.resolve().then(() => callback(mockUser));
        return vi.fn();
      });
      initAuth(vi.fn());
      await vi.waitFor(() => expect(localStorage.getItem('tt_auth')).not.toBeNull());

      // A second page load restores the same session again.
      onAuthStateChanged.mockImplementation((auth, callback) => {
        Promise.resolve().then(() => callback(mockUser));
        return vi.fn();
      });
      initAuth(vi.fn());

      await vi.waitFor(() =>
        expect(JSON.parse(localStorage.getItem('tt_auth')).method).toBe('restore')
      );
      expect(sessionStorage.getItem('tt_auth')).toBeNull();
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

    it('signs out before forgetting, so a failed sign-out stays remembered', async () => {
      localStorage.setItem('tt_auth', JSON.stringify({ v: 1, uid: 'u1' }));
      signOut.mockRejectedValueOnce(new Error('offline'));

      await expect(signOutAndForget()).rejects.toThrow('offline');

      // The visitor is still signed in, so the gate must stay quiet.
      expect(JSON.parse(localStorage.getItem('tt_auth')).uid).toBe('u1');
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

  describe('upgradeAnonymousToEmail', () => {
    it('throws error if no current user', async () => {
      mockAuth.currentUser = null;
      await expect(upgradeAnonymousToEmail('scribe@example.com', 'password123')).rejects.toThrow(
        'No user is currently signed in.'
      );
    });

    it('throws when the current account is already secured', async () => {
      mockAuth.currentUser = { uid: 'u5', isAnonymous: false, email: 'scribe@example.com' };
      await expect(upgradeAnonymousToEmail('other@example.com', 'password123')).rejects.toThrow(
        'This chronicle is already secured with another sign-in method.'
      );
    });

    it('links an email credential to the anonymous user', async () => {
      const anonymousUser = { uid: 'u6', isAnonymous: true };
      const linkedUser = {
        uid: 'u6',
        isAnonymous: false,
        email: 'scribe@example.com',
        providerData: [{ providerId: 'password' }],
      };
      mockAuth.currentUser = anonymousUser;
      linkWithCredential.mockResolvedValueOnce({ user: linkedUser });

      const user = await upgradeAnonymousToEmail('scribe@example.com', 'password123');

      expect(EmailAuthProvider.credential).toHaveBeenCalledWith(
        'scribe@example.com',
        'password123'
      );
      expect(linkWithCredential).toHaveBeenCalledWith(anonymousUser, {
        providerId: 'password',
      });
      expect(user).toBe(linkedUser);
    });
  });

  describe('updateUserPassword', () => {
    it('throws when no email account is signed in', async () => {
      mockAuth.currentUser = { uid: 'u7', email: null };
      await expect(updateUserPassword('oldpass123', 'newpass123')).rejects.toThrow(
        'No email account is currently signed in.'
      );
    });

    it('reauthenticates before updating the password', async () => {
      const user = { uid: 'u8', email: 'scribe@example.com' };
      mockAuth.currentUser = user;
      reauthenticateWithCredential.mockResolvedValueOnce({ user });
      updatePassword.mockResolvedValueOnce();

      const result = await updateUserPassword('oldpass123', 'newpass123');

      expect(EmailAuthProvider.credential).toHaveBeenCalledWith('scribe@example.com', 'oldpass123');
      expect(reauthenticateWithCredential).toHaveBeenCalledWith(user, {
        providerId: 'password',
      });
      expect(updatePassword).toHaveBeenCalledWith(user, 'newpass123');
      expect(result).toBe(user);
    });
  });
});
