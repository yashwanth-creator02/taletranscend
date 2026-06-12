// src/ui/components/nav/__tests__/nav.templates.test.js
import { describe, it, expect, vi } from 'vitest';
import {
  buildPrimaryLink,
  buildDropdownLink,
  buildAuthenticatedUser,
  buildGuestUser,
  buildMobileDock,
  buildCommandItem,
} from '../nav.templates.js';

describe('Nav Templates', () => {
  describe('buildPrimaryLink', () => {
    it('renders link with active class if matches current', () => {
      const link = { href: 'library.html', icon: 'book', label: 'Library' };
      const html = buildPrimaryLink(link, 'library.html');
      expect(html).toContain('nav-link--active');
      expect(html).toContain('aria-current="page"');
    });

    it('renders normal link if no match', () => {
      const link = { href: 'library.html', icon: 'book', label: 'Library' };
      const html = buildPrimaryLink(link, 'home.html');
      expect(html).not.toContain('nav-link--active');
    });
  });

  describe('buildAuthenticatedUser', () => {
    it('renders user display name and avatar', () => {
      const user = { uid: 'u123', displayName: 'Hero', email: 'h@tt.com', isAnonymous: false };
      const html = buildAuthenticatedUser(user, 'index.html', []);
      expect(html).toContain('Hero');
      expect(html).toContain('h@tt.com');
      expect(html).toContain('u123'); // seed
    });

    it('renders secure account button if anonymous', () => {
      const user = { uid: 'u123', isAnonymous: true };
      const html = buildAuthenticatedUser(user, 'index.html', []);
      expect(html).toContain('Secure Account');
    });
  });

  describe('buildGuestUser', () => {
    it('renders sign in button', () => {
      const html = buildGuestUser();
      expect(html).toContain('Sign In');
      expect(html).toContain('login.html');
    });
  });

  describe('buildMobileDock', () => {
    it('renders dock items', () => {
      const html = buildMobileDock('library.html', null);
      expect(html).toContain('mobile-dock');
      expect(html).toContain('Sign In'); // null user
    });

    it('renders profile in dock if user exists', () => {
      const html = buildMobileDock('profile.html', { uid: 'u1' });
      expect(html).toContain('Profile');
    });
  });

  describe('buildCommandItem', () => {
    it('renders command button with label and shortcut', () => {
      const item = { label: 'Go Home', icon: 'home', shortcut: 'G H' };
      const html = buildCommandItem(item, 'index.html');
      expect(html).toContain('Go Home');
      expect(html).toContain('G H');
    });
  });
});
