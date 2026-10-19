// src/ui/components/nav/__tests__/nav.templates.test.js
import { describe, it, expect } from 'vitest';
import {
  buildPrimaryLink,
  buildBrandMark,
  buildAccountMenu,
  buildAuthenticatedUser,
  buildGuestUser,
  buildMobileDock,
  buildCommandItem,
  buildCommandPalette,
  buildNav,
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
    it('renders the avatar as a direct link to the profile page', () => {
      const user = { uid: 'u123', displayName: 'Hero', email: 'h@tt.com', isAnonymous: false };
      const html = buildAuthenticatedUser(user);
      expect(html).toContain('id="nav-user"');
      expect(html).toContain('id="nav-profile-link"');
      expect(html).toContain('profile.html');
      expect(html).toContain('u123'); // avatar seed
      expect(html).toContain('aria-label="Open profile for Hero"');
      // The account menu no longer hangs off the avatar
      expect(html).not.toContain('id="user-dropdown"');
      expect(html).not.toContain('aria-haspopup');
    });
  });

  describe('buildBrandMark', () => {
    it('renders a plain home link when no user is signed in', () => {
      const html = buildBrandMark(null);
      expect(html).toContain('class="nav-logo__mark"');
      expect(html).toContain('index.html');
      expect(html).toContain('aria-label="TaleTranscend home"');
      expect(html).not.toContain('nav-menu-btn');
      expect(html).not.toContain('user-dropdown');
    });

    it('renders a menu button with the hamburger glyph plus the account menu for members', () => {
      const user = { uid: 'u123', displayName: 'Hero', email: 'h@tt.com', isAnonymous: false };
      const links = [{ href: 'shelf.html', icon: 'bookmark', label: 'My Shelf' }];
      const html = buildBrandMark(user, 'index.html', links);
      expect(html).toContain('id="nav-menu-btn"');
      expect(html).toContain('aria-haspopup="menu"');
      expect(html).toContain('aria-expanded="false"');
      expect(html).toContain('aria-controls="user-dropdown"');
      expect(html).toContain('aria-label="Open account menu for Hero"');
      expect(html).toContain('data-lucide="menu"');
      expect(html).toContain('nav-logo__menu-icon');
      expect(html).toContain('id="user-dropdown"');
      expect(html).toContain('My Shelf');
    });
  });

  describe('buildAccountMenu', () => {
    it('renders identity header, links, and sign out for members', () => {
      const user = { uid: 'u123', displayName: 'Hero', email: 'h@tt.com', isAnonymous: false };
      const links = [{ href: 'shelf.html', icon: 'bookmark', label: 'My Shelf' }];
      const html = buildAccountMenu(user, 'index.html', links);
      expect(html).toContain('aria-labelledby="nav-menu-btn"');
      expect(html).toContain('Hero');
      expect(html).toContain('h@tt.com');
      expect(html).toContain('My Shelf');
      expect(html).toContain('id="signout-btn"');
      expect(html).not.toContain('Secure Account');
    });

    it('renders the secure account CTA for anonymous users', () => {
      const user = { uid: 'u123', isAnonymous: true };
      const html = buildAccountMenu(user, 'index.html', []);
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

  describe('buildCommandPalette', () => {
    it('renders a lookup layout: field row first, results below, close control inline', () => {
      const html = buildCommandPalette();
      const searchIndex = html.indexOf('class="command-search"');
      const inputIndex = html.indexOf('id="nav-command-input"');
      const closeIndex = html.indexOf('id="nav-command-close"');
      const listIndex = html.indexOf('id="nav-command-list"');

      expect(searchIndex).toBeGreaterThan(-1);
      expect(inputIndex).toBeGreaterThan(searchIndex);
      expect(closeIndex).toBeGreaterThan(inputIndex);
      expect(listIndex).toBeGreaterThan(closeIndex);
      expect(html).not.toContain('command-header');
    });

    it('names the dialog for assistive technology', () => {
      const html = buildCommandPalette();
      expect(html).toContain('id="nav-command-title"');
      expect(html).toContain('aria-labelledby="nav-command-title"');
    });

    it('renders the custom look-up glyph in the field row', () => {
      const html = buildCommandPalette();
      expect(html).toContain('data-lucide="look-up"');
    });
  });

  describe('buildNav', () => {
    it('renders settings navigation icon between search bar and user profile', () => {
      const { headerHtml } = buildNav();
      expect(headerHtml).toContain('id="nav-settings-btn"');
      expect(headerHtml).toContain('settings.html');
      const searchIndex = headerHtml.indexOf('id="nav-command-button"');
      const settingsIndex = headerHtml.indexOf('id="nav-settings-btn"');
      const userIndex = headerHtml.indexOf('id="nav-user"');
      expect(searchIndex).toBeGreaterThan(-1);
      expect(settingsIndex).toBeGreaterThan(searchIndex);
      expect(userIndex).toBeGreaterThan(settingsIndex);
    });

    it('returns headerHtml, dockHtml, and paletteHtml with command palette unnested from header', () => {
      const { headerHtml, dockHtml, paletteHtml } = buildNav();
      expect(headerHtml).not.toContain('id="nav-command-palette"');
      expect(paletteHtml).toContain('id="nav-command-palette"');
      expect(dockHtml).toContain('id="mobile-dock-container"');
    });

    it('renders the brand mark anchor with a standalone wordmark home link', () => {
      const { headerHtml } = buildNav();
      const anchorIndex = headerHtml.indexOf('id="nav-brand-anchor"');
      const wordmarkIndex = headerHtml.indexOf('class="nav-logo__wordmark"');
      expect(anchorIndex).toBeGreaterThan(-1);
      expect(wordmarkIndex).toBeGreaterThan(anchorIndex);
      expect(headerHtml).toContain('aria-label="TaleTranscend home"');
    });

    it('renders the custom look-up glyph on both quick-tools triggers', () => {
      const { headerHtml } = buildNav();
      const matches = headerHtml.match(/data-lucide="look-up"/g) ?? [];
      expect(matches).toHaveLength(2);
    });
  });
});
