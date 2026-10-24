import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@fb/index.js', () => ({
  auth: { currentUser: null },
}));

vi.mock('@ui/components/toast.js', () => ({
  showToast: vi.fn(),
}));

import { auth } from '@fb/index.js';
import { showToast } from '@ui/components/toast.js';
import {
  isRegisteredUser,
  buildLoginUrl,
  requireRegisteredUser,
  showGuestGateToast,
} from '../auth.guard.js';

describe('auth.guard', () => {
  beforeEach(() => {
    auth.currentUser = null;
    vi.clearAllMocks();
  });

  describe('isRegisteredUser', () => {
    it('rejects a missing user', () => {
      expect(isRegisteredUser(null)).toBe(false);
    });

    it('rejects an anonymous guest', () => {
      expect(isRegisteredUser({ uid: 'guest-1', isAnonymous: true })).toBe(false);
    });

    it('accepts a registered account', () => {
      expect(isRegisteredUser({ uid: 'reader-1', isAnonymous: false })).toBe(true);
    });

    it('treats a user without the flag as registered for legacy doubles', () => {
      expect(isRegisteredUser({ uid: 'reader-1' })).toBe(true);
    });
  });

  describe('buildLoginUrl', () => {
    it('preserves path, query, and hash as the return target', () => {
      expect(
        buildLoginUrl({
          pathname: '/reader.html',
          search: '?tale=abc',
          hash: '#discussion',
        })
      ).toBe('/login.html?returnUrl=%2Freader.html%3Ftale%3Dabc%23discussion');
    });

    it('falls back to the login page without a location', () => {
      expect(buildLoginUrl(null)).toBe('/login.html');
    });
  });

  describe('requireRegisteredUser', () => {
    it('allows a registered user without showing a toast', () => {
      auth.currentUser = { uid: 'reader-1', isAnonymous: false };

      expect(requireRegisteredUser('comment')).toBe(true);
      expect(showToast).not.toHaveBeenCalled();
    });

    it('blocks a guest and offers sign in or sign up', () => {
      auth.currentUser = { uid: 'guest-1', isAnonymous: true };

      expect(requireRegisteredUser('post a comment')).toBe(false);
      expect(showToast).toHaveBeenCalledTimes(1);

      const [message, options] = showToast.mock.calls[0];
      expect(message).toContain('Only registered readers can post a comment');
      expect(message).toContain('Guests can read every tale');
      expect(options).toMatchObject({
        type: 'warning',
        title: 'Registration required',
        duration: 8000,
        action: { label: 'Sign in or sign up' },
      });
      expect(typeof options.action.onClick).toBe('function');
    });

    it('shows the toast directly through showGuestGateToast', () => {
      showGuestGateToast('resonate with a tale');

      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining('Only registered readers can resonate with a tale'),
        expect.objectContaining({ type: 'warning' })
      );
    });
  });
});
