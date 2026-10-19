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
import {
  closeNotificationsPopover,
  toggleNotificationPin,
  toggleNotificationsPopover,
} from '../notifications.popover.js';

vi.mock('../nav.utils.js', () => ({
  getNavElements: vi.fn(),
  renderIcons: vi.fn(),
  getCurrentPage: vi.fn(() => 'index.html'),
  getAvatarSeed: vi.fn(() => 'seed'),
  escapeHtml: vi.fn((s) => s),
}));

vi.mock('../nav.command-palette.js', () => ({
  openCommandPalette: vi.fn(),
  closeCommandPalette: vi.fn(),
  executeCommand: vi.fn(),
  executeActiveFocusedItem: vi.fn(),
  moveFocus: vi.fn(),
  renderCommandList: vi.fn(),
}));

vi.mock('../notifications.popover.js', () => ({
  toggleNotificationsPopover: vi.fn(),
  closeNotificationsPopover: vi.fn(),
  initNotifications: vi.fn(),
  destroyNotifications: vi.fn(),
  updateNotificationBadge: vi.fn(),
  loadAndRenderNotifications: vi.fn(),
  toggleNotificationPin: vi.fn(),
}));

vi.mock('@services/notification.service.js', () => ({
  markAllNotificationsAsRead: vi.fn(() => Promise.resolve(true)),
  subscribeUnreadNotifications: vi.fn(() => vi.fn()),
  getUserNotifications: vi.fn(() => Promise.resolve([])),
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
    navState.commandPaletteOpen = false;
    navState.commandFocusedIndex = -1;
    navState.dropdownHideTimer = null;
    document.body.innerHTML = `
      <header id="app-nav">
        <button id="nav-menu-btn" aria-expanded="false"></button>
        <div id="user-dropdown" hidden></div>
        <div id="nav-user"></div>
        <div id="mobile-dock-container"></div>
        <button id="nav-command-button"></button>
        <input id="nav-command-input" />
        <button id="btn-upgrade-account"></button>
        <button id="btn-sign-out"></button>
      </header>
    `;

    vi.mocked(utils.getNavElements).mockReturnValue({
      menuButton: document.getElementById('nav-menu-btn'),
      dropdown: document.getElementById('user-dropdown'),
      nav: document.getElementById('app-nav'),
      navUser: document.getElementById('nav-user'),
      commandInput: document.getElementById('nav-command-input'),
      commandButton: document.getElementById('nav-command-button'),
    });
  });

  describe('Dropdown', () => {
    it('openDropdown shows dropdown and sets aria-expanded', () => {
      openDropdown();
      const dropdown = document.getElementById('user-dropdown');
      const btn = document.getElementById('nav-menu-btn');
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

    it('re-opening during the close animation cancels the pending hide', () => {
      openDropdown();
      closeDropdown(false);
      openDropdown();

      vi.advanceTimersByTime(400);

      const dropdown = document.getElementById('user-dropdown');
      expect(dropdown.hidden).toBe(false);
      expect(dropdown.classList.contains('is-closing')).toBe(false);
      expect(document.getElementById('nav-menu-btn').getAttribute('aria-expanded')).toBe('true');
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

    it('toggles the dropdown when the brand menu button is clicked', () => {
      const btn = document.getElementById('nav-menu-btn');
      btn.click();
      expect(document.getElementById('user-dropdown').hidden).toBe(false);
      expect(btn.getAttribute('aria-expanded')).toBe('true');

      btn.click();
      vi.advanceTimersByTime(220);
      expect(document.getElementById('user-dropdown').hidden).toBe(true);
      expect(btn.getAttribute('aria-expanded')).toBe('false');
    });

    it('closes dropdown when clicking outside', () => {
      openDropdown();
      document.body.click();
      // closeDropdown uses setTimeout
      vi.advanceTimersByTime(220);
      expect(document.getElementById('user-dropdown').hidden).toBe(true);
    });

    it('toggles the notifications drawer from its trigger', () => {
      document.body.insertAdjacentHTML('beforeend', '<button id="nav-notifications-btn"></button>');

      document.getElementById('nav-notifications-btn').click();
      expect(toggleNotificationsPopover).toHaveBeenCalled();
    });

    it('routes pin clicks inside a notice to the pin toggle', () => {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<div id="nav-notifications-container"><button class="nav-notifications-item__pin" data-notification-id="n1"></button></div>'
      );

      document.querySelector('.nav-notifications-item__pin').click();
      expect(toggleNotificationPin).toHaveBeenCalledWith('n1');
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
      expect(document.getElementById('nav-profile-link')).toBeTruthy();
      expect(utils.renderIcons).toHaveBeenCalled();
    });

    it('renders guest UI when user is null', () => {
      updateNavUser(null);
      expect(document.body.innerHTML).toContain('Sign In');
    });
  });

  describe('Keyboard Shortcuts & Focus Navigation', () => {
    beforeEach(() => {
      attachGlobalListeners();
    });

    afterEach(() => {
      detachGlobalListeners();
    });

    it('selects all text on Ctrl+A inside input', () => {
      const input = document.createElement('input');
      input.value = 'Tale of the Stars';
      document.body.appendChild(input);
      input.focus();

      const selectSpy = vi.spyOn(input, 'select');
      const event = new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true,
        bubbles: true,
      });
      input.dispatchEvent(event);

      expect(selectSpy).toHaveBeenCalled();
      input.remove();
    });

    it('toggles command palette on Ctrl+K', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);

      expect(openCommandPalette).toHaveBeenCalled();
    });

    it('does not open command palette on tapping /', () => {
      const event = new KeyboardEvent('keydown', {
        key: '/',
        bubbles: true,
      });
      document.dispatchEvent(event);

      expect(openCommandPalette).not.toHaveBeenCalled();
    });

    it('clears command input on first Escape if value exists', () => {
      navState.commandPaletteOpen = true;
      const input = document.getElementById('nav-command-input');
      input.value = 'search query';
      input.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      });
      document.dispatchEvent(event);

      expect(input.value).toBe('');
    });

    it('closes the notifications drawer on Escape', () => {
      document.body.insertAdjacentHTML('beforeend', '<div id="nav-notifications-popover"></div>');

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      expect(closeNotificationsPopover).toHaveBeenCalledWith(true);
    });

    it('keeps Tab inside the palette by skipping tabindex="-1" elements', () => {
      const palette = document.createElement('div');
      palette.id = 'nav-command-palette';
      palette.innerHTML = `
        <input id="trap-input" />
        <button id="trap-close"></button>
      `;
      const item = document.createElement('button');
      item.className = 'command-item';
      item.setAttribute('tabindex', '-1');
      palette.appendChild(item);
      document.body.appendChild(palette);

      const input = palette.querySelector('#trap-input');
      const close = palette.querySelector('#trap-close');
      // jsdom has no layout, so the trap's visibility filter needs stubbing.
      for (const el of [input, close, item]) {
        Object.defineProperty(el, 'offsetParent', { value: document.body });
      }

      vi.mocked(utils.getNavElements).mockReturnValue({ commandPalette: palette });
      navState.commandPaletteOpen = true;

      close.focus();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      expect(document.activeElement).toBe(input);

      input.focus();
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })
      );
      expect(document.activeElement).toBe(close);
    });

    it('navigates dropdown menu items with ArrowDown and ArrowUp', () => {
      openDropdown();
      const dropdown = document.getElementById('user-dropdown');
      dropdown.innerHTML = `
        <a role="menuitem" id="item-1" href="#1">Item 1</a>
        <a role="menuitem" id="item-2" href="#2">Item 2</a>
      `;

      const item1 = document.getElementById('item-1');
      const item2 = document.getElementById('item-2');
      item1.focus();

      const downEvent = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
      });
      document.dispatchEvent(downEvent);
      expect(document.activeElement).toBe(item2);

      const upEvent = new KeyboardEvent('keydown', {
        key: 'ArrowUp',
        bubbles: true,
      });
      document.dispatchEvent(upEvent);
      expect(document.activeElement).toBe(item1);
    });
  });
});
