// src/pages/tale/__tests__/interactions.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  setupResonance,
  bindChapterClicks,
  setupTabs,
  setupStartReading,
  setupShelfButton,
} from '../interactions.js';
import * as services from '@services/index.js';
import * as utils from '@/utils';

vi.mock('@services/index.js', () => ({
  toggleResonance: vi.fn(),
  getResonanceStatus: vi.fn(),
  resolveResumePoint: vi.fn(),
  RESONANCE_COOLDOWN_MS: 2000,
  BOOKMARK_COOLDOWN_MS: 5000,
}));

vi.mock('@/utils', () => ({
  navigateTo: vi.fn(),
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  })),
  getRemainingTime: vi.fn(() => 1000),
  applyButtonCooldown: vi.fn(),
}));

vi.mock('@fb/index.js', () => ({
  auth: { currentUser: { uid: 'u1' } },
}));

vi.mock('@shared/components/toast/toast.js', () => ({
  showToast: vi.fn(),
}));

vi.mock('@shared/icons.js', () => ({
  initIcons: vi.fn(),
}));

describe('TaleInteractions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <button id="resonance-btn"><i></i><span></span></button>
      <div id="resonance-count">0</div>
      <div id="chapter-list">
        <div class="chapter-item" data-chapter-index="5"></div>
      </div>
      <button data-tab="synopsis" class="active"></button>
      <button data-tab="echoes"></button>
      <div id="content-synopsis" class="tab-content"></div>
      <div id="content-echoes" class="tab-content hidden"></div>
      <button id="start-btn"></button>
      <button id="shelf-btn"><i></i><span></span></button>
    `;
  });

  describe('setupResonance', () => {
    it('toggles resonance state on click', async () => {
      vi.mocked(services.getResonanceStatus).mockResolvedValue(false);
      vi.mocked(services.toggleResonance).mockResolvedValue({ active: true, count: 1 });

      await setupResonance('t1');

      const btn = document.getElementById('resonance-btn');
      await btn.click();

      expect(services.toggleResonance).toHaveBeenCalledWith('t1');
      expect(document.getElementById('resonance-count').textContent).toBe('1');
      expect(btn.querySelector('span').textContent).toBe('Souls Aligned');
    });

    it('applies cooldown if resonance is rate-limited', async () => {
      vi.mocked(services.getResonanceStatus).mockResolvedValue(false);
      vi.mocked(services.toggleResonance).mockResolvedValue({ status: 'rate-limited' });

      await setupResonance('t1');

      const btn = document.getElementById('resonance-btn');
      await btn.click();

      expect(utils.applyButtonCooldown).toHaveBeenCalled();
    });
  });

  describe('bindChapterClicks', () => {
    it('navigates to reader on chapter click', () => {
      bindChapterClicks('t1');
      const item = document.querySelector('.chapter-item');
      item.click();
      expect(utils.navigateTo).toHaveBeenCalledWith('reader.html?taleId=t1&chapterId=5');
    });
  });

  describe('setupTabs', () => {
    it('switches active classes and visibility', () => {
      setupTabs();
      const echoBtn = document.querySelector('[data-tab="echoes"]');
      echoBtn.click();

      expect(echoBtn.classList.contains('active')).toBe(true);
      expect(document.getElementById('content-echoes').classList.contains('hidden')).toBe(false);
      expect(document.getElementById('content-synopsis').classList.contains('hidden')).toBe(true);
    });
  });

  describe('setupStartReading', () => {
    it('navigates to chapter 0', () => {
      setupStartReading('t1', [{ id: 'c1' }]);
      document.getElementById('start-btn').click();
      expect(utils.navigateTo).toHaveBeenCalledWith('reader.html?taleId=t1&chapterId=0');
    });
  });

  describe('setupShelfButton', () => {
    it('toggles bookmark state', async () => {
      const mockService = {
        isBookmarked: vi.fn(() => Promise.resolve(false)),
        addToBookmarks: vi.fn(),
        removeFromBookmarks: vi.fn(),
      };

      await setupShelfButton('u1', 't1', {}, mockService);

      const btn = document.getElementById('shelf-btn');
      await btn.click();

      expect(mockService.addToBookmarks).toHaveBeenCalled();
      expect(btn.dataset.shelved).toBe('true');
    });
  });
});
