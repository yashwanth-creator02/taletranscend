// src/pages/profile/__tests__/ui.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  openModal,
  closeModal,
  switchTab,
  updateProfileUI,
  renderContinueReading,
  renderPublishedTales,
  renderDrafts,
} from '../ui.js';
import { profileState } from '../state.js';

vi.mock('@ui/components/icons.js', () => ({
  initIcons: vi.fn(),
}));

vi.mock('@ui/components/toast.js', () => ({
  showToast: vi.fn(),
}));

vi.mock('@/utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    setText: vi.fn((id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    }),
    setInput: vi.fn((id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    }),
    formatJoinDate: vi.fn(() => 'June 2026'),
  };
});

describe('ProfileUI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div id="edit-modal" class="hidden"></div>
      <div id="tab-panel-basic"></div>
      <div id="tab-panel-identity"></div>
      <button data-tab="basic"></button>
      <button data-tab="identity"></button>
      <div id="desktop-display-name"></div>
      <div id="desktop-display-bio"></div>
      <div id="profile-genres"></div>
      <div id="continue-reading-list"></div>
      <div id="contributions-grid"></div>
      <div id="drafts-grid"></div>
      <input id="input-name" />
      <div class="mythic-badge"></div>
    `;
  });

  describe('Modal controls', () => {
    it('opens modal and switches to basic tab', () => {
      openModal();
      const modal = document.getElementById('edit-modal');
      expect(modal.classList.contains('flex')).toBe(true);
      expect(modal.classList.contains('hidden')).toBe(false);
      expect(profileState.activeModalTab).toBe('basic');
    });

    it('closes modal', () => {
      openModal();
      closeModal();
      const modal = document.getElementById('edit-modal');
      expect(modal.classList.contains('hidden')).toBe(true);
    });
  });

  describe('switchTab', () => {
    it('updates state and panel visibility', () => {
      switchTab('identity');
      expect(profileState.activeModalTab).toBe('identity');
      expect(document.getElementById('tab-panel-identity').hidden).toBe(false);
      expect(document.getElementById('tab-panel-basic').hidden).toBe(true);
    });
  });

  describe('updateProfileUI', () => {
    it('populates fields from data', () => {
      const data = {
        name: 'Hero Scribe',
        bio: 'Legendary stories',
        totalWordsWritten: 15000,
        favouriteGenres: ['Mythic', 'Sci-Fi'],
      };

      updateProfileUI(data);

      expect(document.getElementById('desktop-display-name').textContent).toBe('Hero Scribe');
      expect(document.getElementById('input-name').value).toBe('Hero Scribe');
      expect(document.getElementById('profile-genres').innerHTML).toContain('Mythic');
      expect(document.querySelector('.mythic-badge').textContent).toContain('Chronicler');
    });
  });

  describe('renderContinueReading', () => {
    it('renders cards into list', () => {
      const tales = [{ id: 't1', title: 'Tale 1', percent: 45, lastChapterIndex: 0 }];
      renderContinueReading(tales);
      const list = document.getElementById('continue-reading-list');
      expect(list.innerHTML).toContain('Tale 1');
      expect(list.innerHTML).toContain('45%');
    });
  });

  describe('renderPublishedTales', () => {
    it('renders cards into grid', () => {
      const tales = [{ id: 't1', title: 'Published 1', description: 'Desc' }];
      renderPublishedTales(tales);
      const grid = document.getElementById('contributions-grid');
      expect(grid.innerHTML).toContain('Published 1');
    });
  });
});
