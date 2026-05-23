// src/pages/reader/toc.js
// Handles Table of Contents building and Scroll Spy

import { readerState } from './state.js';
import { renderTocPanel } from './templates.js';
import { initIcons } from '@ui/components/icons.js';

/**
 * Builds the TOC list based on headers in the article body.
 * Note: Now largely handled by templates.js, this builds the section list.
 */
export function buildTOC() {
  const article = document.getElementById('articleBody');
  if (!article) return;

  const currentChapter = readerState.chapters.find(c => c.id === readerState.currentChapterId);
  if (currentChapter) {
      currentChapter.sections = _extractSectionsFromDOM(article);
  }
}

/**
 * Updates the active state of TOC items based on current scroll position.
 */
export function updateTOCScrollSpy() {
  const scroller = document.getElementById('scroller');
  const article = document.getElementById('articleBody');
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

function _refreshToc() {
    const content = document.getElementById('panelContent');
    if (!content) return;
    
    content.innerHTML = renderTocPanel(
        readerState.chapters,
        readerState.currentChapterId,
        readerState.progress,
        readerState.activeSection,
        readerState.taleTitle
    );
    
    // Re-bind events (same as in reader.js but encapsulated here for spy updates)
    document.querySelectorAll('[data-chapter-id]').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = readerState.chapters.findIndex(c => c.id === btn.dataset.chapterId);
            const url = new URL(window.location.href);
            url.searchParams.set('chapterId', idx);
            window.location.href = url.toString();
        });
    });
    
    document.querySelectorAll('[data-section-id]').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.sectionId;
            const target = document.getElementById(id);
            const scroller = document.getElementById('scroller');
            if (target && scroller) {
                const top = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 32;
                scroller.scrollTo({ top, behavior: 'smooth' });
                if (window.innerWidth < 1024) {
                    const closeBtn = document.getElementById('closePanel');
                    closeBtn?.click();
                }
            }
        });
    });
    
    initIcons();
}

function _extractSectionsFromDOM(container) {
    const headers = Array.from(container.querySelectorAll('h2, h3'));
    return headers.map(h => ({
        id: h.id,
        level: h.tagName === 'H2' ? 2 : 3,
        title: h.textContent
    }));
}
