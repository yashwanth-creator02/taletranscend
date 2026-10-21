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
  signOutAndForget: vi.fn(() => Promise.resolve()),
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

    it('surfaces every settings destination with its canonical section hash', () => {
      renderCommandList('settings');
      const list = document.getElementById('nav-command-list');
      const expected = [
        ['General & Theme', 'settings.html#general'],
        ['Reader & Codex', 'settings.html#reader'],
        ['Atmosphere & Motion', 'settings.html#atmosphere'],
        ['Archival Storage', 'settings.html#storage'],
        ['Accounts', 'settings.html#accounts'],
        ['About Codex', 'settings.html#about'],
      ];

      for (const [label, href] of expected) {
        const item = [...list.querySelectorAll('.command-item')].find(
          (element) => element.querySelector('.command-item__label')?.textContent === label
        );
        expect(item).not.toBeUndefined();
        expect(item?.dataset.href).toBe(href);
      }
    });

    it('finds the table of contents through its living-codex alias', () => {
      renderCommandList('living codex');
      const list = document.getElementById('nav-command-list');
      const item = list.querySelector('.command-item[data-href="toc.html"]');

      expect(item).not.toBeNull();
      expect(item?.textContent).toContain('Table of Contents');
    });

    it('shows empty state if no match', () => {
      renderCommandList('xyz123');
      expect(document.getElementById('nav-command-list').textContent).toContain('No results');
    });

    it('wraps matched query text in a highlight element', () => {
      renderCommandList('libr');
      const mark = document.querySelector('#nav-command-list .command-item__match');
      expect(mark).not.toBeNull();
      expect(mark.textContent.toLowerCase()).toBe('libr');
    });

    it('renders no highlight markup when the query is empty', () => {
      renderCommandList('');
      expect(document.querySelector('#nav-command-list .command-item__match')).toBeNull();
    });

    it('escapes raw query text instead of injecting markup in the empty state', () => {
      renderCommandList('<img src=x onerror=alert(1)>');
      const list = document.getElementById('nav-command-list');
      expect(list.querySelector('img')).toBeNull();
      expect(list.textContent).toContain('<img');
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
      expect(window.location.href).toBe('/test.html');
    });

    it('switches application theme on theme action dataset', () => {
      const btn = document.createElement('button');
      btn.dataset.action = 'theme:light';

      executeCommand(btn);
      expect(document.documentElement.getAttribute('data-app-theme')).toBe('light');
    });
  });
});
