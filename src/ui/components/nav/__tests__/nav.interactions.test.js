// src/ui/components/nav/__tests__/nav.interactions.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  openDropdown,
  closeDropdown,
  attachGlobalListeners,
  detachGlobalListeners,
  updateNavUser,
} from '../nav.interactions.js';
import { navState } from '../nav.state.js';
import * as utils from '../nav.utils.js';
import * as fb from '@fb/index.js';
import { openCommandPalette } from '../nav.command-palette.js';

vi.mock('../nav.utils.js', () => ({
  getNavElements: vi.fn(),
  renderIcons: vi.fn(),
  getCurrentPage: vi.fn(() => 'index.html'),
  getAvatarSeed: vi.fn(() => 'seed'),
  escapeText: vi.fn((s) => s),
}));

vi.mock('../nav.command-palette.js', () => ({
  openCommandPalette: vi.fn(),
  closeCommandPalette: vi.fn(),
  executeCommand: vi.fn(),
  executeActiveFocusedItem: vi.fn(),
  moveFocus: vi.fn(),
  renderCommandList: vi.fn(),
}));

vi.mock('@fb/index.js', () => ({
  auth: { currentUser: { uid: 'u1' } },
  upgradeAnonymousToGoogle: vi.fn(),
  signOut: vi.fn(),
}));

describe('Nav Interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    navState.listenersAttached = false;
    document.body.innerHTML = `
      <header id="app-nav">
        <button id="avatar-btn" aria-expanded="false"></button>
        <div id="user-dropdown" hidden></div>
        <div id="nav-user"></div>
        <div id="mobile-dock-container"></div>
        <button id="nav-command-button"></button>
        <button id="btn-upgrade-account"></button>
        <button id="btn-sign-out"></button>
      </header>
    `;

    vi.mocked(utils.getNavElements).mockReturnValue({
      avatarButton: document.getElementById('avatar-btn'),
      dropdown: document.getElementById('user-dropdown'),
      nav: document.getElementById('app-nav'),
      navUser: document.getElementById('nav-user'),
    });
  });

  describe('Dropdown', () => {
    it('openDropdown shows dropdown and sets aria-expanded', () => {
      openDropdown();
      const dropdown = document.getElementById('user-dropdown');
      const btn = document.getElementById('avatar-btn');
      expect(dropdown.hidden).toBe(false);
      expect(btn.getAttribute('aria-expanded')).toBe('true');
    });

    it('closeDropdown hides dropdown after delay', () => {
      openDropdown();
      closeDropdown(false);
      const dropdown = document.getElementById('user-dropdown');
      expect(dropdown.classList.contains('is-closing')).toBe(true);

      vi.advanceTimersByTime(220);
      expect(dropdown.hidden).toBe(true);
    });
  });

  describe('Click Delegation', () => {
    beforeEach(() => {
      attachGlobalListeners();
    });

    afterEach(() => {
      detachGlobalListeners();
    });

    it('opens command palette when command button is clicked', () => {
      const btn = document.getElementById('nav-command-button');
      btn.click();
      expect(openCommandPalette).toHaveBeenCalled();
    });

    it('closes dropdown when clicking outside', () => {
      openDropdown();
      document.body.click();
      // closeDropdown uses setTimeout
      vi.advanceTimersByTime(220);
      expect(document.getElementById('user-dropdown').hidden).toBe(true);
    });

    it('triggers upgrade when upgrade button is clicked', async () => {
      document.body.innerHTML += '<button id="nav-upgrade-btn"></button>';
      vi.mocked(fb.upgradeAnonymousToGoogle).mockResolvedValue({ uid: 'u1' });

      const btn = document.getElementById('nav-upgrade-btn');
      await btn.click();

      expect(fb.upgradeAnonymousToGoogle).toHaveBeenCalled();
    });
  });

  describe('updateNavUser', () => {
    it('updates DOM when user changes', () => {
      const user = { uid: 'u1', displayName: 'Hero' };
      updateNavUser(user);
      expect(navState.currentUser).toBe(user);
      expect(document.getElementById('avatar-btn')).toBeTruthy();
      expect(utils.renderIcons).toHaveBeenCalled();
    });

    it('renders guest UI when user is null', () => {
      updateNavUser(null);
      expect(document.body.innerHTML).toContain('Sign In');
    });
  });
});
