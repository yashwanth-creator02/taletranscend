// src/pages/reader/content.js
// Loads tale metadata and chapter content from Firestore.
// Renders into the reader's custom header, article body, sidebar, chapter trail,
// and lore/compass panels.

import { getTaleMeta, getChapter } from '@services/index.js';
import { readerState } from './state.js';

/* ─────────────────────────────────────────────
   Tale Metadata
   ───────────────────────────────────────────── */

/**
 * Fetches tale-level metadata and populates all static display areas.
 * Called once on load — chapter-specific data is populated by loadReaderChapter.
 *
 * @param {string} taleId
 */
export async function loadReaderMeta(taleId) {
  try {
    const meta = await getTaleMeta(taleId);

    // Mirror into state
    readerState.taleTitle = meta.title || 'Untitled Tale';
    readerState.authorName = meta.authorName || 'Unknown Scribe';
    readerState.coverUrl = meta.coverUrl || '';
    readerState.era = meta.era || '';
    readerState.language = meta.language || '';
    readerState.tags = meta.tags || [];

    // Header
    setText('reader-tale-title', readerState.taleTitle);
    setText('reader-author-name', readerState.authorName);
    setText('reader-era-badge', readerState.era);
    setText('reader-language-badge', readerState.language);

    // Sidebar
    setText('sidebar-story-name', readerState.taleTitle);
    setText('sidebar-description', meta.description || '');
    setText('sidebar-author', readerState.authorName);

    // Author avatar
    const uid = meta.authorId || 'scribe';
    const avatarSrc = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(uid.slice(0, 8))}`;
    const avatarEl = document.getElementById('author-avatar');
    if (avatarEl) avatarEl.src = avatarSrc;

    // Lore tags
    _renderLoreTags(readerState.tags);

    // Story compass
    _renderCompass(meta);

    // Cover art in sidebar
    if (readerState.coverUrl) {
      const coverEl = document.getElementById('sidebar-cover');
      if (coverEl) {
        coverEl.src = readerState.coverUrl;
        coverEl.closest('[data-cover-wrap]')?.classList.remove('hidden');
      }
    }
  } catch (err) {
    console.error('[reader] loadReaderMeta failed:', err);
  }
}

/* ─────────────────────────────────────────────
   Chapter Content
   ───────────────────────────────────────────── */

/**
 * Fetches a chapter, renders title + body, updates header meta,
 * and returns the navigation context for prev/next wiring.
 *
 * @param {{ taleId: string, chapterIndex: number }} params
 * @returns {Promise<Object|null>} navigation context or null on failure
 */
export async function loadReaderChapter({ taleId, chapterIndex }) {
  try {
    const { chapter, navigation } = await getChapter({ taleId, chapterIndex });

    readerState.chapterTitle = chapter.title || `Chapter ${chapterIndex + 1}`;
    readerState.totalChapters = navigation.totalChapters;

    // Fragment label + chapter heading
    const pad = String(chapter.index + 1).padStart(2, '0');
    setText('chapter-label', `Fragment ${pad}`);
    setText('chapter-title', readerState.chapterTitle);

    // Update header chapter info
    setText('reader-chapter-label', `Fragment ${pad} of ${navigation.totalChapters}`);
    setText('reader-header-title', readerState.taleTitle);

    // Render story content
    const story = document.getElementById('story-content');
    if (story) {
      story.innerHTML = _renderContent(chapter.content || '');
    }

    // Compute and display word count / read time
    const wordCount = _countWords(chapter.content || '');
    const readMins = Math.max(1, Math.ceil(wordCount / 200));
    readerState.wordCount = wordCount;
    readerState.estimatedReadMins = readMins;

    setText('reader-wordcount', `${_formatNumber(wordCount)} words`);
    setText('reader-readtime', `${readMins} min read`);

    // Chapter trail update
    _renderChapterTrail(navigation, taleId, chapterIndex);

    return navigation;
  } catch (err) {
    console.error('[reader] loadReaderChapter failed:', err);
    const title = document.getElementById('chapter-title');
    if (title) title.textContent = 'Failed to load chapter. Please refresh.';
    return null;
  }
}

/* ─────────────────────────────────────────────
   Content Renderer
   ───────────────────────────────────────────── */

/**
 * Converts raw chapter text into semantic HTML.
 * - Blank lines become paragraph breaks
 * - Lines starting with # become headings
 * - Lines starting with > become blockquotes
 * - First paragraph gets a drop cap via CSS class
 *
 * @param {string} raw
 * @returns {string} HTML string
 */
function _renderContent(raw) {
  const paragraphs = raw.split('\n').filter((l) => l.trim());
  let isFirst = true;

  return paragraphs
    .map((line) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('## ')) {
        return `<h3 class="reader-h3">${_esc(trimmed.slice(3))}</h3>`;
      }
      if (trimmed.startsWith('# ')) {
        return `<h2 class="reader-h2">${_esc(trimmed.slice(2))}</h2>`;
      }
      if (trimmed.startsWith('> ')) {
        return `<blockquote class="reader-blockquote">${_esc(trimmed.slice(2))}</blockquote>`;
      }

      const cls = isFirst ? 'reader-p reader-p--dropcap' : 'reader-p';
      isFirst = false;
      return `<p class="${cls}">${_esc(trimmed)}</p>`;
    })
    .join('');
}

/* ─────────────────────────────────────────────
   Chapter Trail
   ───────────────────────────────────────────── */

/**
 * Renders the chapter trail list in the sidebar.
 * Shows all chapters with the current one highlighted.
 *
 * @param {Object} navigation
 * @param {string} taleId
 * @param {number} currentIndex
 */
function _renderChapterTrail(navigation, taleId, currentIndex) {
  const container = document.getElementById('chapter-trail-list');
  if (!container || !navigation.allChapters?.length) return;

  container.innerHTML = navigation.allChapters
    .map((ch, i) => {
      const isCurrent = i === currentIndex;
      const isPast = i < currentIndex;

      return `
      <a
        href="reader.html?taleId=${taleId}&chapterId=${i}"
        class="chapter-trail-item${isCurrent ? ' chapter-trail-item--active' : ''}${isPast ? ' chapter-trail-item--done' : ''}"
        ${isCurrent ? 'aria-current="true"' : ''}
      >
        <span class="chapter-trail-item__num">${String(i + 1).padStart(2, '0')}</span>
        <span class="chapter-trail-item__title">${_esc(ch.title || `Chapter ${i + 1}`)}</span>
        ${isPast ? '<i data-lucide="check" class="chapter-trail-item__check"></i>' : ''}
        ${isCurrent ? '<span class="chapter-trail-item__dot"></span>' : ''}
      </a>
    `;
    })
    .join('');

  window.lucide?.createIcons?.();

  // Scroll active item into view
  const active = container.querySelector('.chapter-trail-item--active');
  active?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

/* ─────────────────────────────────────────────
   Lore Tags + Compass
   ───────────────────────────────────────────── */

function _renderLoreTags(tags) {
  const container = document.getElementById('lore-tag-list');
  if (!container) return;

  if (!tags.length) {
    container.innerHTML = '<span class="text-xs text-slate-600 italic">No tags set</span>';
    return;
  }

  container.innerHTML = tags
    .map(
      (t) => `
    <span class="lore-tag">${_esc(t)}</span>
  `
    )
    .join('');
}

function _renderCompass(meta) {
  setText('compass-setting', meta.worldSetting || '—');
  setText('compass-tone', meta.tone || '—');
  setText('compass-audience', meta.audience || '—');
  setText('compass-language', meta.language || '—');
}

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? '';
}

function _countWords(text) {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

function _formatNumber(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function _esc(str) {
  return String(str).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
