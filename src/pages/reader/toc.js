// src/pages/reader/toc.js
// Handles Table of Contents building and Scroll Spy

import { readerState } from './state.js';
import { renderTocPanel } from './templates.js';
import { initIcons } from '@ui/components/icons.js';
import { createLogger, navigateTo, readerUrl } from '@/utils';
import { showToast } from '@ui/components/toast.js';
import {
  markChapterRead,
  markChapterUnread,
  syncMarkChapterRead,
  syncMarkChapterUnread,
  downloadChapter,
} from '@services/index.js';
import { updateReaderProgress } from './progress.js';

const log = createLogger('ReaderTOC');

/**
 * Builds the TOC list based on headers in the article body.
 * Note: Now largely handled by templates.js, this builds the section list.
 */
export function buildTOC() {
  log.debug('Building Table of Contents from DOM');
  const article = document.getElementById('article-body');
  if (!article) return;

  const currentChapter = readerState.chapters.find((c) => c.id === readerState.currentChapterId);
  if (currentChapter) {
    currentChapter.sections = _extractSectionsFromDOM(article);
    log.info(`TOC built: ${currentChapter.sections.length} sections found`);
  }
}

/**
 * Updates the active state of TOC items based on current scroll position.
 */
export function updateTOCScrollSpy() {
  const scroller = document.getElementById('scroller');
  const article = document.getElementById('article-body');
  if (!scroller || !article) return;

  const headers = Array.from(article.querySelectorAll('h2, h3'));
  let currentId = null;

  for (const header of headers) {
    const top = header.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    if (top - 120 <= 0) {
      currentId = header.id;
    } else {
      break;
    }
  }

  if (currentId !== readerState.activeSection) {
    readerState.activeSection = currentId;
    // If TOC is open, refresh it to show active section
    if (readerState.openTool === 'toc') {
      _refreshToc();
    }
  }
}

/**
 * Binds all interactive events in the TOC panel:
 * - Chapter navigation
 * - Heading section scroll spy jumping
 * - Chapter options dropdown toggle
 * - Mark as Read / Mark as Unread actions
 * - Fragment download action
 *
 * @param {Object} [options]
 * @param {Function} [options.onRefresh]
 */
export function bindTocEvents({ onRefresh } = {}) {
  // Global outside-click and escape listeners for TOC dropdowns (bound once)
  if (typeof window !== 'undefined' && !window._tocMenuListenersBound) {
    window._tocMenuListenersBound = true;
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.toc-chapter-menu-wrap')) {
        document.querySelectorAll('.toc-menu-dropdown').forEach((m) => m.classList.add('hidden'));
        document
          .querySelectorAll('[data-toc-menu-trigger]')
          .forEach((t) => t.setAttribute('aria-expanded', 'false'));
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.toc-menu-dropdown').forEach((m) => m.classList.add('hidden'));
        document
          .querySelectorAll('[data-toc-menu-trigger]')
          .forEach((t) => t.setAttribute('aria-expanded', 'false'));
      }
    });
  }

  // 1. Chapter navigation
  document.querySelectorAll('[data-chapter-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = readerState.chapters.findIndex((c) => c.id === btn.dataset.chapterId);
      if (idx !== -1 && readerState.taleId) {
        navigateTo(readerUrl(readerState.taleId, idx));
      }
    });
  });

  // 2. Section smooth scroll
  document.querySelectorAll('[data-section-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.sectionId;
      const target = document.getElementById(id);
      const scroller = document.getElementById('scroller');
      if (target && scroller) {
        const top =
          target.getBoundingClientRect().top -
          scroller.getBoundingClientRect().top +
          scroller.scrollTop -
          32;
        scroller.scrollTo({ top, behavior: 'smooth' });
        if (window.innerWidth < 1024) {
          const closeBtn = document.getElementById('close-panel');
          closeBtn?.click();
        }
      }
    });
  });

  // 3. Chapter options dropdown toggle
  document.querySelectorAll('[data-toc-menu-trigger]').forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const chapterId = trigger.dataset.tocMenuTrigger;
      const menu = document.getElementById(`toc-menu-${chapterId}`);
      if (!menu) return;

      const isHidden = menu.classList.contains('hidden');

      // Close all other open menus
      document.querySelectorAll('.toc-menu-dropdown').forEach((m) => m.classList.add('hidden'));
      document
        .querySelectorAll('[data-toc-menu-trigger]')
        .forEach((t) => t.setAttribute('aria-expanded', 'false'));

      if (isHidden) {
        menu.classList.remove('hidden');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // 4. Chapter menu actions
  document.querySelectorAll('.toc-menu-item').forEach((item) => {
    item.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const action = item.dataset.action;
      const chapterIndex = Number(item.dataset.chapterIndex ?? 0);
      const chapterTitle = item.dataset.chapterTitle || `Fragment ${chapterIndex + 1}`;
      const taleId = readerState.taleId;
      const userId = readerState.userId;

      // Close all menus
      document.querySelectorAll('.toc-menu-dropdown').forEach((m) => m.classList.add('hidden'));
      document
        .querySelectorAll('[data-toc-menu-trigger]')
        .forEach((t) => t.setAttribute('aria-expanded', 'false'));

      if (action === 'mark-read') {
        if (userId && taleId) {
          markChapterRead({ userId, taleId, chapterIndex });
          syncMarkChapterRead({ userId, taleId, chapterIndex });
        }
        if (chapterIndex === readerState.chapterIndex) {
          readerState.progress = 100;
          updateReaderProgress({ scrollPercent: 100 });
        }
        showToast(`Marked "${chapterTitle}" as read.`, 'success');
        onRefresh?.();
      } else if (action === 'mark-unread') {
        if (userId && taleId) {
          markChapterUnread({ userId, taleId, chapterIndex });
          syncMarkChapterUnread({ userId, taleId, chapterIndex });
        }
        if (chapterIndex === readerState.chapterIndex) {
          readerState.progress = 0;
          updateReaderProgress({ scrollPercent: 0 });
        }
        showToast(`Marked "${chapterTitle}" as unread.`, 'info');
        onRefresh?.();
      } else if (action === 'download-chapter') {
        const targetChapter = readerState.chapters[chapterIndex];
        downloadChapter(taleId, chapterIndex, {
          taleTitle: readerState.taleTitle,
          chapter: targetChapter,
        });
      }
    });
  });

  initIcons();
}

export function _refreshToc() {
  const content = document.getElementById('panel-content');
  if (!content) return;

  content.innerHTML = renderTocPanel(
    readerState.chapters,
    readerState.currentChapterId,
    readerState.progress,
    readerState.activeSection,
    readerState.taleTitle
  );

  bindTocEvents({ onRefresh: _refreshToc });
}

function _extractSectionsFromDOM(container) {
  const headers = Array.from(container.querySelectorAll('h2, h3'));
  return headers.map((h) => ({
    id: h.id,
    level: h.tagName === 'H2' ? 2 : 3,
    title: h.textContent,
  }));
}
