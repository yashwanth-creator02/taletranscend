// src/pages/library/__tests__/ui.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  setupSidebarToggle,
  setActiveSidebarBtn,
  buildEraChips,
  setActiveEraChip,
  updateSidebarUser,
  showGridSkeleton,
  showGridEmpty,
  showGridError,
} from '../ui.js';
import { libraryState } from '../state.js';

vi.mock('@shared/icons.js', () => ({
  initIcons: vi.fn(),
}));

describe('LibraryUI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div id="sidebar"></div>
      <button id="toggle-sidebar"><i></i></button>
      <div id="era-filter-bar"></div>
      <div id="cards-grid"></div>
      <img id="sidebar-user-avatar" />
      <div id="sidebar-user-name"></div>
      <div id="sidebar-user-sub"></div>
      <button class="sidebar-filter" data-filter="all"></button>
      <button class="sidebar-filter" data-filter="bookmarks"></button>
    `;
    libraryState.sidebarCollapsed = false;
    libraryState.activeEra = 'all';
  });

  describe('setupSidebarToggle', () => {
    it('toggles sidebar class and persists to localStorage', () => {
      setupSidebarToggle();
      const btn = document.getElementById('toggle-sidebar');
      const sidebar = document.getElementById('sidebar');

      btn.click();
      expect(sidebar.classList.contains('sidebar--collapsed')).toBe(true);
      expect(localStorage.getItem('tt-lib-sidebar-collapsed')).toBe('true');

      btn.click();
      expect(sidebar.classList.contains('sidebar--collapsed')).toBe(false);
      expect(localStorage.getItem('tt-lib-sidebar-collapsed')).toBe('false');
    });
  });

  describe('setActiveSidebarBtn', () => {
    it('sets active class on correct button', () => {
      setActiveSidebarBtn('bookmarks');
      const allBtn = document.querySelector('[data-filter="all"]');
      const bookBtn = document.querySelector('[data-filter="bookmarks"]');

      expect(bookBtn.classList.contains('sidebar-filter--active')).toBe(true);
      expect(allBtn.classList.contains('sidebar-filter--active')).toBe(false);
    });
  });

  describe('buildEraChips', () => {
    it('renders era buttons', () => {
      buildEraChips(['Mythic', 'Future']);
      const bar = document.getElementById('era-filter-bar');
      expect(bar.innerHTML).toContain('Mythic');
      expect(bar.innerHTML).toContain('Future');
      expect(bar.querySelectorAll('[data-era]').length).toBe(3); // All + 2
    });
  });

  describe('updateSidebarUser', () => {
    it('updates avatar and name', () => {
      updateSidebarUser({ uid: 'user123', displayName: 'Hero' });
      expect(document.getElementById('sidebar-user-name').textContent).toBe('Hero');
      expect(document.getElementById('sidebar-user-avatar').src).toContain('user123');
    });
  });

  describe('showGridSkeleton', () => {
    it('renders skeleton cards', () => {
      showGridSkeleton(4);
      expect(document.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    });
  });

  describe('showGridEmpty', () => {
    it('renders empty state message', () => {
      showGridEmpty('No tales');
      expect(document.getElementById('cards-grid').textContent).toContain('No tales');
    });
  });

  describe('showGridError', () => {
    it('renders error state', () => {
      showGridError();
      expect(document.getElementById('cards-grid').textContent).toContain('Neural Link Severed');
    });
  });
});
