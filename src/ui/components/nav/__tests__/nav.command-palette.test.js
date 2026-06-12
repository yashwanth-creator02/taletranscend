// src/ui/components/nav/__tests__/nav.command-palette.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  renderCommandList,
  openCommandPalette,
  closeCommandPalette,
  moveFocus,
  executeCommand,
} from '../nav.command-palette.js';
import { navState } from '../nav.state.js';
import * as utils from '../nav.utils.js';

vi.mock('../nav.utils.js', () => ({
  getNavElements: vi.fn(),
  renderIcons: vi.fn(),
  getCurrentPage: vi.fn(() => 'index.html'),
}));

vi.mock('@fb/index.js', () => ({
  auth: {},
  signOut: vi.fn(),
}));

describe('Nav Command Palette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navState.currentUser = null;
    navState.commandFocusedIndex = -1;
    navState.commandPaletteOpen = false;

    document.body.innerHTML = `
      <div id="nav-command-palette" hidden>
        <input id="nav-command-input" />
        <div id="nav-command-list"></div>
      </div>
      <button id="nav-command-button"></button>
    `;

    vi.mocked(utils.getNavElements).mockReturnValue({
      commandPalette: document.getElementById('nav-command-palette'),
      commandInput: document.getElementById('nav-command-input'),
      commandList: document.getElementById('nav-command-list'),
      commandButton: document.getElementById('nav-command-button'),
    });
  });

  describe('open/close', () => {
    it('openCommandPalette shows palette and resets state', () => {
      openCommandPalette();
      expect(navState.commandPaletteOpen).toBe(true);
      expect(document.getElementById('nav-command-palette').hidden).toBe(false);
      expect(document.getElementById('nav-command-list').children.length).toBeGreaterThan(0);
    });

    it('closeCommandPalette hides palette', () => {
      openCommandPalette();
      closeCommandPalette();
      expect(navState.commandPaletteOpen).toBe(false);
      expect(document.getElementById('nav-command-palette').hidden).toBe(true);
    });
  });

  describe('renderCommandList', () => {
    it('filters items by query', () => {
      renderCommandList('library');
      const list = document.getElementById('nav-command-list');
      expect(list.textContent).toContain('Library');
      expect(list.textContent).not.toContain('Home');
    });

    it('shows empty state if no match', () => {
      renderCommandList('xyz123');
      expect(document.getElementById('nav-command-list').textContent).toContain('No results');
    });
  });

  describe('moveFocus', () => {
    it('increments focused index on down', () => {
      openCommandPalette();
      moveFocus('down');
      expect(navState.commandFocusedIndex).toBe(0);

      moveFocus('down');
      expect(navState.commandFocusedIndex).toBe(1);
    });

    it('wraps around at ends', () => {
      openCommandPalette();
      const count = navState.commandFilteredItems.length;
      navState.commandFocusedIndex = count - 1;

      moveFocus('down');
      expect(navState.commandFocusedIndex).toBe(0);
    });
  });

  describe('executeCommand', () => {
    it('navigates on href dataset', () => {
      const btn = document.createElement('button');
      btn.dataset.href = 'test.html';

      // Mock location
      delete window.location;
      window.location = { href: '' };

      executeCommand(btn);
      expect(window.location.href).toBe('test.html');
    });
  });
});
