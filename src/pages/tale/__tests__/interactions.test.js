// src/pages/tale/__tests__/interactions.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  setupResonance,
  bindChapterClicks,
  setupTabs,
  setupStartReading,
  setupShelfButton,
  setupChronicleBatchActions,
} from '../interactions.js';
import * as services from '@services/index.js';
import * as utils from '@/utils';
import * as localProgress from '@services/reader/localProgress.service.js';
import * as cloudProgress from '@services/reader/cloudProgress.service.js';
import * as downloadTale from '@services/tale/downloadTale.js';
import * as confirmModal from '@ui/components/confirmModal.js';

vi.mock('@services/reader/localProgress.service.js', () => ({
  markChapterRead: vi.fn(),
  markChapterUnread: vi.fn(),
  markAllChaptersRead: vi.fn(),
  markAllChaptersUnread: vi.fn(),
  getChapterProgress: vi.fn(),
}));

vi.mock('@services/reader/cloudProgress.service.js', () => ({
  syncMarkChapterRead: vi.fn(),
  syncMarkChapterUnread: vi.fn(),
  syncMarkAllChaptersRead: vi.fn(),
  syncMarkAllChaptersUnread: vi.fn(),
}));

vi.mock('@services/tale/downloadTale.js', () => ({
  downloadChronicle: vi.fn(),
  downloadChapter: vi.fn(),
}));

vi.mock('@ui/components/confirmModal.js', () => ({
  confirmTaleDownload: vi.fn(),
  showConfirmModal: vi.fn(),
}));

vi.mock('@services/index.js', () => ({
  toggleResonance: vi.fn(),
  getResonanceStatus: vi.fn(),
  getResonanceCount: vi.fn(),
  resolveResumePoint: vi.fn(),
  RESONANCE_COOLDOWN_MS: 2000,
  BOOKMARK_COOLDOWN_MS: 5000,
}));

vi.mock('@/utils', () => ({
  navigateTo: vi.fn(),
  readerUrl: vi.fn((id, ch) => `/tales/${id}/read/${ch}`),
  taleUrl: vi.fn((id) => `/tales/${id}`),
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  })),
  getRemainingTime: vi.fn(() => 1000),
  applyButtonCooldown: vi.fn(),
  escapeHtml: vi.fn((str) => str),
  setText: vi.fn(),
}));

vi.mock('@fb/index.js', () => ({
  auth: { currentUser: { uid: 'u1' } },
}));

vi.mock('@ui/components/toast.js', () => ({
  showToast: vi.fn(),
}));

vi.mock('@ui/components/icons.js', () => ({
  initIcons: vi.fn(),
}));

describe('TaleInteractions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <button id="resonance-btn"><i></i><span></span></button>
      <div id="resonance-count">0</div>
      <div id="chapter-list">
        <div class="chapter-item" data-chapter-index="5">
          <button data-action="mark-read" data-chapter-index="5"></button>
          <button data-action="mark-unread" data-chapter-index="5"></button>
          <button data-action="download-chapter" data-chapter-index="5"></button>
        </div>
      </div>
      <button id="btn-mark-all-read"></button>
      <button id="btn-mark-all-unread"></button>
      <button id="btn-download-all-chronicles"></button>
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

    it('re-enables button and does not toggle state if resonance returns error', async () => {
      vi.mocked(services.getResonanceStatus).mockResolvedValue(false);
      vi.mocked(services.toggleResonance).mockResolvedValue({ status: 'error' });

      await setupResonance('t1');

      const btn = document.getElementById('resonance-btn');
      await btn.click();

      expect(btn.disabled).toBe(false);
      expect(btn.classList.contains('is-aligned')).toBe(false);
    });

    it('initializes with provided count and resonated state immediately', async () => {
      await setupResonance('t1', 50, true, 'u1');

      expect(services.getResonanceStatus).not.toHaveBeenCalled();
      expect(services.getResonanceCount).not.toHaveBeenCalled();

      const btn = document.getElementById('resonance-btn');
      expect(document.getElementById('resonance-count').textContent).toBe('50');
      expect(btn.classList.contains('is-aligned')).toBe(true);
      expect(btn.getAttribute('aria-pressed')).toBe('true');
      expect(btn.querySelector('span').textContent).toBe('Souls Aligned');
    });

    it('fetches count and status if not provided', async () => {
      vi.mocked(services.getResonanceStatus).mockResolvedValue(true);
      vi.mocked(services.getResonanceCount).mockResolvedValue(12);

      await setupResonance('t1');

      expect(services.getResonanceStatus).toHaveBeenCalledWith('t1', null);
      expect(services.getResonanceCount).toHaveBeenCalledWith('t1');
      expect(document.getElementById('resonance-count').textContent).toBe('12');
      const btn = document.getElementById('resonance-btn');
      expect(btn.classList.contains('is-aligned')).toBe(true);
    });
  });

  describe('bindChapterClicks', () => {
    it('navigates to reader on chapter click', () => {
      bindChapterClicks('t1');
      const item = document.querySelector('.chapter-item');
      item.click();
      expect(utils.navigateTo).toHaveBeenCalledWith('/tales/t1/read/5');
    });

    it('marks chapter read when mark-read button clicked without navigating', () => {
      const chapters = [{ title: 'Chapter 1' }];
      bindChapterClicks('t1', chapters, 'u1', { title: 'Test Tale' });
      const btn = document.querySelector('[data-action="mark-read"]');
      btn.click();

      expect(localProgress.markChapterRead).toHaveBeenCalledWith({
        userId: 'u1',
        taleId: 't1',
        chapterIndex: 5,
      });
      expect(cloudProgress.syncMarkChapterRead).toHaveBeenCalled();
      expect(utils.navigateTo).not.toHaveBeenCalled();
    });

    it('marks chapter unread when mark-unread button clicked without navigating', () => {
      const chapters = [{ title: 'Chapter 1' }];
      bindChapterClicks('t1', chapters, 'u1', { title: 'Test Tale' });
      const btn = document.querySelector('[data-action="mark-unread"]');
      btn.click();

      expect(localProgress.markChapterUnread).toHaveBeenCalledWith({
        userId: 'u1',
        taleId: 't1',
        chapterIndex: 5,
      });
      expect(cloudProgress.syncMarkChapterUnread).toHaveBeenCalled();
      expect(utils.navigateTo).not.toHaveBeenCalled();
    });

    it('downloads chapter when download-chapter button clicked and confirmed', async () => {
      confirmModal.confirmTaleDownload.mockResolvedValue(true);
      const chapters = [{ title: 'Chapter 1' }];
      bindChapterClicks('t1', chapters, 'u1', { title: 'Test Tale' });
      const btn = document.querySelector('[data-action="download-chapter"]');
      btn.click();
      await Promise.resolve();

      expect(confirmModal.confirmTaleDownload).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Tale',
          isFragment: true,
        })
      );
      expect(downloadTale.downloadChapter).toHaveBeenCalledWith(
        't1',
        5,
        expect.objectContaining({ taleTitle: 'Test Tale' })
      );
      expect(utils.navigateTo).not.toHaveBeenCalled();
    });

    it('does not download chapter when confirmation cancelled', async () => {
      confirmModal.confirmTaleDownload.mockResolvedValue(false);
      const chapters = [{ title: 'Chapter 1' }];
      bindChapterClicks('t1', chapters, 'u1', { title: 'Test Tale' });
      const btn = document.querySelector('[data-action="download-chapter"]');
      btn.click();
      await Promise.resolve();

      expect(downloadTale.downloadChapter).not.toHaveBeenCalled();
    });
  });

  describe('setupChronicleBatchActions', () => {
    it('marks all chapters read on batch button click', () => {
      const chapters = [{ title: 'C1' }, { title: 'C2' }];
      setupChronicleBatchActions('u1', 't1', chapters);
      document.getElementById('btn-mark-all-read').click();

      expect(localProgress.markAllChaptersRead).toHaveBeenCalledWith({
        userId: 'u1',
        taleId: 't1',
        chapterCount: 2,
      });
      expect(cloudProgress.syncMarkAllChaptersRead).toHaveBeenCalled();
    });

    it('marks all chapters unread on batch button click', () => {
      const chapters = [{ title: 'C1' }, { title: 'C2' }];
      setupChronicleBatchActions('u1', 't1', chapters);
      document.getElementById('btn-mark-all-unread').click();

      expect(localProgress.markAllChaptersUnread).toHaveBeenCalledWith({
        userId: 'u1',
        taleId: 't1',
      });
      expect(cloudProgress.syncMarkAllChaptersUnread).toHaveBeenCalled();
    });

    it('downloads all chronicles on download all button click when confirmed', async () => {
      confirmModal.confirmTaleDownload.mockResolvedValue(true);
      setupChronicleBatchActions('u1', 't1', []);
      await document.getElementById('btn-download-all-chronicles').click();

      expect(confirmModal.confirmTaleDownload).toHaveBeenCalled();
      expect(downloadTale.downloadChronicle).toHaveBeenCalledWith('t1');
    });

    it('does not download all chronicles when confirmation cancelled', async () => {
      confirmModal.confirmTaleDownload.mockResolvedValue(false);
      setupChronicleBatchActions('u1', 't1', []);
      await document.getElementById('btn-download-all-chronicles').click();

      expect(downloadTale.downloadChronicle).not.toHaveBeenCalled();
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
      expect(utils.navigateTo).toHaveBeenCalledWith('/tales/t1/read/0');
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

    it('re-enables button and does not toggle state if adding bookmark fails', async () => {
      const mockService = {
        isBookmarked: vi.fn(() => Promise.resolve(false)),
        addToBookmarks: vi.fn(() => Promise.resolve(null)),
        removeFromBookmarks: vi.fn(),
      };

      await setupShelfButton('u1', 't1', {}, mockService);

      const btn = document.getElementById('shelf-btn');
      await btn.click();

      expect(mockService.addToBookmarks).toHaveBeenCalled();
      expect(btn.disabled).toBe(false);
      expect(btn.dataset.shelved).toBe('false');
    });
  });
});
