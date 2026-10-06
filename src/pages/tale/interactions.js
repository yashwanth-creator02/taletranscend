// src/pages/tale/interactions.js
// User interactions for the Tale Archive page (Chronicle Codex).

import {
  navigateTo,
  taleUrl,
  readerUrl,
  createLogger,
  getRemainingTime,
  applyButtonCooldown,
} from '@/utils';
import {
  resolveResumePoint,
  toggleResonance,
  getResonanceStatus,
  RESONANCE_COOLDOWN_MS,
  BOOKMARK_COOLDOWN_MS,
} from '@services/index.js';
import { auth } from '@fb/index.js';
import { showToast } from '@ui/components/toast.js';
import { initIcons } from '@ui/components/icons.js';
import { renderChapters } from './ui.js';
import {
  markChapterRead,
  markChapterUnread,
  markAllChaptersRead,
  markAllChaptersUnread,
} from '@services/reader/localProgress.service.js';
import {
  syncMarkChapterRead,
  syncMarkChapterUnread,
  syncMarkAllChaptersRead,
  syncMarkAllChaptersUnread,
} from '@services/reader/cloudProgress.service.js';
import { downloadChronicle, downloadChapter } from '@services/tale/downloadTale.js';

const log = createLogger('TaleInteractions');

/* ─────────────────────────────────────────────
   Soul Resonance
   ───────────────────────────────────────────── */

/**
 * Sets up the Soul Resonance (reaction) interaction across all resonance buttons.
 *
 * @param {string} taleId
 */
export async function setupResonance(taleId) {
  log.info('Setting up resonance', { taleId });
  const btns = document.querySelectorAll('[id^="resonance-btn"]');
  const countEls = document.querySelectorAll('[id^="resonance-count"]');
  if (!btns.length || !countEls.length) return;

  const isActive = await getResonanceStatus(taleId);
  log.debug('Initial resonance status', { isActive });
  btns.forEach((btn) => _updateResonanceUI(btn, countEls, isActive));

  btns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      log.info('Resonance toggle clicked');
      btns.forEach((b) => (b.disabled = true));
      try {
        const result = await toggleResonance(taleId);

        if (result.status === 'rate-limited') {
          const rateLimitKey = `resonance:${auth.currentUser?.uid}:${taleId}`;
          btns.forEach((b) => {
            const label =
              b.querySelector('.resonance-label') ||
              b.querySelector('span:not([id*="resonance-count"])');
            const currentText = label?.textContent || '';
            applyButtonCooldown(b, RESONANCE_COOLDOWN_MS, currentText, () =>
              getRemainingTime(rateLimitKey, RESONANCE_COOLDOWN_MS)
            );
          });
          return;
        }

        const { active, count } = result;
        log.info('Resonance toggled', { active, count });
        btns.forEach((b) => _updateResonanceUI(b, countEls, active, count));
        showToast(active ? 'Souls Aligned.' : 'Resonance Decoupled.', 'success');

        // Start cooldown after success
        const rateLimitKey = `resonance:${auth.currentUser?.uid}:${taleId}`;
        btns.forEach((b) => {
          const label =
            b.querySelector('.resonance-label') ||
            b.querySelector('span:not([id*="resonance-count"])');
          const currentText = label?.textContent || '';
          applyButtonCooldown(b, RESONANCE_COOLDOWN_MS, currentText, () =>
            getRemainingTime(rateLimitKey, RESONANCE_COOLDOWN_MS)
          );
        });
      } catch (err) {
        log.error('Resonance failed', err);
        showToast('Resonance failed. Authentication required.', 'error');
        btns.forEach((b) => (b.disabled = false));
      }
    });
  });
}

function _updateResonanceUI(btn, countEls, active, count) {
  if (count !== undefined) {
    countEls.forEach((el) => (el.textContent = count));
  }

  const label =
    btn.querySelector('.resonance-label') || btn.querySelector('span:not([id*="resonance-count"])');

  if (active) {
    btn.classList.add('border-red-500/50', 'bg-red-500/15', 'text-red-400', 'is-aligned');
    btn.classList.remove(
      'border-white/8',
      'border-white/10',
      'text-slate-300',
      'border-orange-500/40',
      'bg-orange-500/10',
      'text-orange-300'
    );

    const icon = btn.querySelector('i, svg');
    if (icon) {
      icon.setAttribute('data-lucide', 'heart');
      icon.classList.remove('text-slate-400', 'text-slate-500', 'text-orange-400');
      icon.classList.add('text-red-500', 'fill-red-500');
    }
    if (label) label.textContent = 'Souls Aligned';
  } else {
    btn.classList.remove(
      'border-red-500/50',
      'bg-red-500/15',
      'text-red-400',
      'is-aligned',
      'border-orange-500/40',
      'bg-orange-500/10',
      'text-orange-300'
    );
    btn.classList.add('border-white/8', 'text-slate-300');

    const icon = btn.querySelector('i, svg');
    if (icon) {
      icon.setAttribute('data-lucide', 'heart');
      icon.classList.remove('text-red-500', 'fill-red-500', 'text-orange-400');
      icon.classList.add('text-slate-400');
    }
    if (label) label.textContent = 'Align Souls';
  }

  initIcons(btn);

  const renderedSvg = btn.querySelector('svg');
  if (renderedSvg) {
    if (active) {
      renderedSvg.classList.remove('text-slate-400', 'text-slate-500');
      renderedSvg.classList.add('text-red-500', 'fill-red-500');
    } else {
      renderedSvg.classList.remove('text-red-500', 'fill-red-500');
      renderedSvg.classList.add('text-slate-400');
    }
  }
}

/* ─────────────────────────────────────────────
   Chapter List
   ───────────────────────────────────────────── */

/**
 * Wires chapter item clicks to navigate to the reader page,
 * or handles manual mark read/unread and individual fragment download.
 *
 * @param {string} taleId
 * @param {Array<Object>} [chapters]
 * @param {string} [userId]
 * @param {Object} [tale]
 */
export function bindChapterClicks(taleId, chapters = [], userId = null, tale = null) {
  const list = document.getElementById('chapter-list');
  if (!list) return;

  list.addEventListener('click', (e) => {
    const uid = userId || auth.currentUser?.uid;

    // 1. Download fragment button
    const downloadBtn = e.target.closest('[data-action="download-chapter"]');
    if (downloadBtn) {
      e.preventDefault();
      e.stopPropagation();
      const idx = Number(downloadBtn.dataset.chapterIndex ?? 0);
      const ch = chapters[idx];
      downloadChapter(taleId, idx, { taleTitle: tale?.title, chapter: ch });
      return;
    }

    // 2. Mark fragment as read
    const markReadBtn = e.target.closest('[data-action="mark-read"]');
    if (markReadBtn) {
      e.preventDefault();
      e.stopPropagation();
      const idx = Number(markReadBtn.dataset.chapterIndex ?? 0);
      markChapterRead({ userId: uid, taleId, chapterIndex: idx });
      syncMarkChapterRead({ userId: uid, taleId, chapterIndex: idx });
      const chTitle = chapters[idx]?.title || `Scroll #${idx + 1}`;
      showToast(`Marked "${chTitle}" as read.`, 'success');
      renderChapters(uid, chapters, taleId);
      return;
    }

    // 3. Mark fragment as unread
    const markUnreadBtn = e.target.closest('[data-action="mark-unread"]');
    if (markUnreadBtn) {
      e.preventDefault();
      e.stopPropagation();
      const idx = Number(markUnreadBtn.dataset.chapterIndex ?? 0);
      markChapterUnread({ userId: uid, taleId, chapterIndex: idx });
      syncMarkChapterUnread({ userId: uid, taleId, chapterIndex: idx });
      const chTitle = chapters[idx]?.title || `Scroll #${idx + 1}`;
      showToast(`Marked "${chTitle}" as unread.`, 'info');
      renderChapters(uid, chapters, taleId);
      return;
    }

    // 4. Default: Navigate to reader
    const item = e.target.closest('.chapter-item');
    if (!item) return;

    // chapterIndex is the zero-based index stored on the element — use it directly
    const chapterId = item.dataset.chapterIndex ?? '0';
    _fadeAndGo(readerUrl(taleId, chapterId));
  });
}

/**
 * Wires batch action buttons in the Chronicles section:
 * - Mark All Read
 * - Mark All Unread
 * - Download All Chronicles
 *
 * @param {string} userId
 * @param {string} taleId
 * @param {Array<Object>} chapters
 * @param {Object} [tale]
 */
export function setupChronicleBatchActions(userId, taleId, chapters = [], tale = null) {
  const markAllReadBtn = document.getElementById('btn-mark-all-read');
  const markAllUnreadBtn = document.getElementById('btn-mark-all-unread');
  const downloadAllBtn = document.getElementById('btn-download-all-chronicles');

  if (markAllReadBtn) {
    markAllReadBtn.addEventListener('click', () => {
      if (!chapters.length) return;
      const uid = userId || auth.currentUser?.uid;
      markAllChaptersRead({ userId: uid, taleId, chapterCount: chapters.length });
      syncMarkAllChaptersRead({ userId: uid, taleId, chapterCount: chapters.length });
      showToast('All fragments marked as read.', 'success');
      renderChapters(uid, chapters, taleId);
    });
  }

  if (markAllUnreadBtn) {
    markAllUnreadBtn.addEventListener('click', () => {
      if (!chapters.length) return;
      const uid = userId || auth.currentUser?.uid;
      markAllChaptersUnread({ userId: uid, taleId });
      syncMarkAllChaptersUnread({ userId: uid, taleId, chapterCount: chapters.length });
      showToast('All fragments marked as unread.', 'info');
      renderChapters(uid, chapters, taleId);
    });
  }

  if (downloadAllBtn) {
    downloadAllBtn.addEventListener('click', () => {
      downloadChronicle(taleId);
    });
  }
}

/* ─────────────────────────────────────────────
   Tabs
   ───────────────────────────────────────────── */

/**
 * Sets up the tab system for Synopsis, Chronicles, and Echoes.
 */
export function setupTabs() {
  const tabs = document.querySelectorAll('[data-tab]');

  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      tabs.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.tab-content').forEach((pane) => pane.classList.add('hidden'));

      // Check standard target ID (e.g. content-about, content-synopsis, content-letter)
      const targetPane =
        document.getElementById(`content-${target}`) ||
        (target === 'synopsis' ? document.getElementById('content-about') : null) ||
        (target === 'echoes' ? document.getElementById('content-comments') : null) ||
        (target === 'letter' || target === 'inquire'
          ? document.getElementById('content-letter') || document.getElementById('content-inquire')
          : null);

      if (targetPane) {
        targetPane.classList.remove('hidden');
      }
    });
  });
}

/* ─────────────────────────────────────────────
   Start Reading
   ───────────────────────────────────────────── */

/**
 * Starts reading from chapter 0.
 *
 * @param {string} taleId
 * @param {import('@state/schemas/tale.schema.js').Chapter[]} chapters
 */
export function setupStartReading(taleId, chapters) {
  const btns = document.querySelectorAll('[id^="start-btn"]');
  if (!btns.length) return;

  btns.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!chapters?.length) {
        showToast('No chronicles available to read yet.', 'info');
        return;
      }
      _fadeAndGo(readerUrl(taleId, 0));
    });
  });
}

/* ─────────────────────────────────────────────
   Resume Reading
   ───────────────────────────────────────────── */

/**
 * Resumes reading from the last recorded chapter.
 *
 * @param {string} userId
 * @param {string} taleId
 */
export function setupResumeReading(userId, taleId) {
  const btns = document.querySelectorAll('[id^="resume-btn"]');
  if (!btns.length) return;

  btns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const resume = await resolveResumePoint({ userId, taleId });
      const chapterId = resume?.chapterIndex ?? 0;
      _fadeAndGo(readerUrl(taleId, chapterId));
    });
  });
}

/* ─────────────────────────────────────────────
   Add to Shelf (Bookmark)
   ───────────────────────────────────────────── */

/**
 * Wires the Add to Shelf button across all shelf button instances.
 *
 * @param {string} userId
 * @param {string} taleId
 * @param {import('@state/schemas/tale.schema.js').Tale} tale
 * @param {{ addToBookmarks: Function, removeFromBookmarks: Function, isBookmarked: Function }} bookmarkService
 */
export async function setupShelfButton(userId, taleId, tale, bookmarkService) {
  const btns = document.querySelectorAll('[id^="shelf-btn"]');
  if (!btns.length) return;

  // Set initial state
  const alreadyShelved = await bookmarkService.isBookmarked({ userId, taleId });
  btns.forEach((btn) => _updateShelfUI(btn, alreadyShelved));

  btns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      btns.forEach((b) => (b.disabled = true));
      const rateLimitKey = `bookmark:${userId}`;

      try {
        const current = btn.dataset.shelved === 'true';
        if (current) {
          // Remove from bookmarks (rate limited)
          const result = await bookmarkService.removeFromBookmarks({ userId, taleId });

          if (result?.status === 'rate-limited') {
            btns.forEach((b) => {
              const label = b.querySelector('span');
              const currentText = label?.textContent || 'On Your Shelf';
              applyButtonCooldown(b, BOOKMARK_COOLDOWN_MS, currentText, () =>
                getRemainingTime(rateLimitKey, BOOKMARK_COOLDOWN_MS)
              );
            });
            return;
          }

          btns.forEach((b) => _updateShelfUI(b, false));
          showToast('Removed from your shelf.', 'info');

          // Start cooldown after success
          btns.forEach((b) => {
            const label = b.querySelector('span');
            const currentText = label?.textContent || 'Save to Shelf';
            applyButtonCooldown(b, BOOKMARK_COOLDOWN_MS, currentText, () =>
              getRemainingTime(rateLimitKey, BOOKMARK_COOLDOWN_MS)
            );
          });
        } else {
          // Add to bookmarks (rate limited)
          const result = await bookmarkService.addToBookmarks({ userId, taleId, tale });

          if (result?.status === 'rate-limited') {
            btns.forEach((b) => {
              const label = b.querySelector('span');
              const currentText = label?.textContent || 'Save to Shelf';
              applyButtonCooldown(b, BOOKMARK_COOLDOWN_MS, currentText, () =>
                getRemainingTime(rateLimitKey, BOOKMARK_COOLDOWN_MS)
              );
            });
            return;
          }

          btns.forEach((b) => _updateShelfUI(b, true));
          showToast('Added to your shelf.', 'success');

          // Start cooldown after success
          btns.forEach((b) => {
            const label = b.querySelector('span');
            const currentText = label?.textContent || 'Save to Shelf';
            applyButtonCooldown(b, BOOKMARK_COOLDOWN_MS, currentText, () =>
              getRemainingTime(rateLimitKey, BOOKMARK_COOLDOWN_MS)
            );
          });
        }
      } catch (err) {
        log.error('Shelf operation failed', err);
        showToast('Could not update shelf.', 'error');
        btns.forEach((b) => (b.disabled = false));
      }
    });
  });
}

function _updateShelfUI(btn, shelved) {
  btn.dataset.shelved = String(shelved);
  const label = btn.querySelector('span');
  const icon = btn.querySelector('i');
  if (label) label.textContent = shelved ? 'On Your Shelf' : 'Save to Shelf';
  if (icon) icon.setAttribute('data-lucide', shelved ? 'bookmark-check' : 'bookmark-plus');
  btn.classList.toggle('active', shelved);
  if (shelved) {
    btn.classList.add('border-indigo-500/40', 'bg-indigo-500/10', 'text-indigo-300');
  } else {
    btn.classList.remove('border-indigo-500/40', 'bg-indigo-500/10', 'text-indigo-300');
  }
  initIcons(btn);
}

/* ─────────────────────────────────────────────
   Share
   ───────────────────────────────────────────── */

/**
 * Wires the Share button across all share button instances.
 *
 * @param {string} taleId
 */
export function setupShareButton(taleId) {
  const btns = document.querySelectorAll('[id^="share-btn"]');
  if (!btns.length) return;

  btns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const url = taleUrl(taleId, window.location.origin);
      if (navigator.share) {
        try {
          await navigator.share({ title: document.title, url });
        } catch {
          _copyToClipboard(url);
        }
      } else {
        _copyToClipboard(url);
      }
    });
  });
}

async function _copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Chronicle link copied to clipboard.', 'success');
  } catch {
    showToast('Could not copy link.', 'error');
  }
}

/* ─────────────────────────────────────────────
   Header Scroll
   ───────────────────────────────────────────── */

/**
 * Handles floating action bar visibility on scroll.
 */
export function initHeaderScroll() {
  const bar = document.getElementById('tale-action-bar');
  const hero = document.getElementById('hero-section');
  const main = document.getElementById('main-content');
  const scrollToTopBtn = document.getElementById('scroll-to-top');

  const onScroll = () => {
    const scrollY = main ? main.scrollTop : window.scrollY;

    if (hero && bar) {
      const heroBtn = hero.querySelector('#start-btn') || hero.querySelector('#start-btn-desktop');
      const threshold =
        heroBtn && window.innerWidth < 1024
          ? heroBtn.offsetTop + heroBtn.offsetHeight + 30
          : Math.max(180, hero.offsetTop + hero.offsetHeight - 80);
      bar.classList.toggle('is-hidden', scrollY < threshold);
    }

    if (scrollToTopBtn) {
      const showTop = scrollY > 80;
      scrollToTopBtn.classList.toggle('is-visible', showTop);
      scrollToTopBtn.classList.toggle('opacity-100', showTop);
      scrollToTopBtn.classList.toggle('pointer-events-auto', showTop);
      scrollToTopBtn.classList.toggle('translate-y-0', showTop);
      scrollToTopBtn.classList.toggle('opacity-0', !showTop);
      scrollToTopBtn.classList.toggle('pointer-events-none', !showTop);
      scrollToTopBtn.classList.toggle('translate-y-3', !showTop);
    }
  };

  if (scrollToTopBtn) {
    scrollToTopBtn.addEventListener('click', () => {
      if (main && main.scrollTop > 0) {
        main.scrollTo({ top: 0, behavior: 'smooth' });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  if (main) {
    main.addEventListener('scroll', onScroll, { passive: true });
  }
  onScroll();
}

/* ─────────────────────────────────────────────
   Internal
   ───────────────────────────────────────────── */

function _fadeAndGo(url) {
  navigateTo(url);
}

export { setupInquire } from './inquire.js';
