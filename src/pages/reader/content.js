// src/pages/reader/content.js
// Renders tale metadata and chapter content for the reader page.
// All Firestore data is normalized through schema factories before
// being stored in readerState.

import { refs, getDocs } from '@fb/index.js';
import { getTaleMeta, getChapter } from '@services/index.js';
import { createChapter } from '@state/index.js';
import { readerState } from './state.js';
import { escapeHtml, countWords, estimateReadMins, setText } from '@/utils';

/* ─────────────────────────────────────────────
   Skeletons
   ───────────────────────────────────────────── */

/**
 * Shows skeleton loaders in the article body while content is loading.
 */
export function showReaderSkeletons() {
  const content = document.getElementById('article-body');
  if (!content) return;

  content.innerHTML = `
    <div class="space-y-8 animate-pulse">
      <div class="skeleton h-5 w-full rounded-lg"></div>
      <div class="skeleton h-5 w-5/6 rounded-lg"></div>
      <div class="skeleton h-5 w-4/5 rounded-lg"></div>
      <div class="skeleton h-5 w-full rounded-lg"></div>
      <div class="skeleton h-5 w-3/4 rounded-lg"></div>
      <div class="pt-8">
        <div class="skeleton h-5 w-11/12 rounded-lg"></div>
        <div class="skeleton h-5 w-5/6 rounded-lg"></div>
      </div>
    </div>
  `;
}

/* ─────────────────────────────────────────────
   Meta Load
   ───────────────────────────────────────────── */

/**
 * Fetches tale metadata and the full chapter list.
 * Populates readerState with tale fields and the chapters array used by the TOC.
 * Chapters are normalized through createChapter to ensure a consistent shape.
 *
 * @param {string} taleId
 */
export async function loadReaderMeta(taleId) {
  try {
    const meta = await getTaleMeta(taleId);

    // Sync tale fields into readerState
    readerState.taleTitle = meta.title || 'Untitled Tale';
    readerState.authorName = meta.authorName || 'Unknown Scribe';
    readerState.authorBio = meta.authorBio || 'A mysterious scribe from the forgotten archives.';
    readerState.authorHandle =
      meta.authorHandle || `@${(meta.authorName || 'scribe').toLowerCase().replace(/\s+/g, '')}`;
    readerState.coverUrl = meta.coverUrl || '';
    readerState.tags = meta.tags || [];
    readerState.era = meta.era || 'Mythic';
    readerState.language = meta.language || 'High Elven';

    // Populate UI elements
    setText('article-meta-title', readerState.taleTitle);
    setText('author-name', readerState.authorName);
    setText('author-heading', readerState.authorName);
    setText('author-handle', readerState.authorHandle);
    setText('author-card-bio', readerState.authorBio);
    setText('top-bar-ch-title', 'Loading...');

    _renderBreadcrumbs(readerState.taleTitle);
    _renderAvatars(readerState.authorName);

    // Fetch all chapters for the TOC — normalized through createChapter
    const chaptersSnap = await getDocs(refs.chapters(taleId));

    readerState.chapters = chaptersSnap.docs
      .map((d) => {
        const ch = createChapter(d.id, d.data());
        return {
          id: ch.id,
          number: ch.chapterNum,
          title: ch.title || `Fragment ${ch.chapterNum}`,
          wordCount: ch.wordCount || countWords(ch.content),
          sections: _extractSections(ch.content || ''),
        };
      })
      .sort((a, b) => a.number - b.number);
  } catch (err) {
    console.error('[reader] Meta load failed:', err);
  }
}

/* ─────────────────────────────────────────────
   Chapter Load
   ───────────────────────────────────────────── */

/**
 * Fetches and renders a specific chapter by index.
 * Returns the navigation context for prev/next wiring.
 *
 * @param {Object} params
 * @param {string} params.taleId
 * @param {number} params.chapterIndex
 * @returns {Promise<Object|null>} Navigation object or null on failure
 */
export async function loadReaderChapter({ taleId, chapterIndex }) {
  try {
    const { chapter, navigation } = await getChapter({ taleId, chapterIndex });

    // Sync chapter fields into readerState
    readerState.chapterTitle = chapter.title || `Fragment ${chapterIndex + 1}`;
    readerState.totalChapters = navigation.totalChapters;
    readerState.wordCount = chapter.wordCount || countWords(chapter.content);
    readerState.estimatedReadMins =
      chapter.estimatedReadMins || estimateReadMins(readerState.wordCount);
    readerState.currentChapterId = readerState.chapters[chapterIndex]?.id || '';

    // Populate UI elements
    console.log(readerState.chapterTitle);
    setText('top-bar-ch-num', chapterIndex + 1);
    setText('top-bar-ch-total', navigation.totalChapters);
    setText('top-bar-ch-title', readerState.chapterTitle);
    setText('header-ch-num', chapterIndex + 1);
    setText('header-ch-total', navigation.totalChapters);
    setText('article-title', readerState.chapterTitle);
    setText('article-subtitle', chapter.subtitle || '');
    setText('read-minutes', readerState.estimatedReadMins);

    // Render article body
    const container = document.getElementById('article-body');
    if (container) {
      container.innerHTML = _processContent(chapter.content || '');
    }

    // Show read time in top bar
    const topBarReadTime = document.getElementById('top-bar-read-time');
    if (topBarReadTime) {
      setText('top-bar-min', readerState.estimatedReadMins);
      topBarReadTime.classList.remove('hidden');
      topBarReadTime.classList.add('flex');
    }

    return navigation;
  } catch (err) {
    console.error('[reader] Chapter load failed:', err);
    setText('article-title', 'Chapter load failed.');
    return null;
  }
}

/* ─────────────────────────────────────────────
   Content Processing
   ───────────────────────────────────────────── */

/**
 * Converts raw story text (newline-separated) into semantic HTML.
 * Supports headings (#, ##), blockquotes (>), figures (![figure]), and paragraphs.
 *
 * @param {string} raw
 * @returns {string} HTML string
 */
function _processContent(raw) {
  const paragraphs = raw.split('\n').filter((l) => l.trim());
  let first = true;

  return paragraphs
    .map((p) => {
      const text = p.trim();

      if (text.startsWith('## ')) {
        const title = text.slice(3);
        const id = title.toLowerCase().replace(/\s+/g, '-');
        return `<h3 id="${id}">${escapeHtml(title)}</h3>`;
      }
      if (text.startsWith('# ')) {
        const title = text.slice(2);
        const id = title.toLowerCase().replace(/\s+/g, '-');
        return `<h2 id="${id}">${escapeHtml(title)}</h2>`;
      }
      if (text.startsWith('> ')) {
        return `<blockquote>${escapeHtml(text.slice(2))}</blockquote>`;
      }
      if (text.startsWith('![figure]')) {
        const tint =
          ['indigo', 'amber', 'rose', 'emerald'].find((t) => text.includes(t)) || 'indigo';
        return _createFigure(tint);
      }

      const cls = first ? 'materialize' : '';
      first = false;
      return `<p class="${cls}">${escapeHtml(text)}</p>`;
    })
    .join('');
}

/**
 * Extracts heading-level sections from raw content for TOC rendering.
 *
 * @param {string} content
 * @returns {Array<{ id: string, level: number, title: string }>}
 */
function _extractSections(content) {
  return content.split('\n').reduce((acc, line) => {
    const text = line.trim();
    if (text.startsWith('# ')) {
      const title = text.slice(2);
      acc.push({ id: title.toLowerCase().replace(/\s+/g, '-'), level: 2, title });
    } else if (text.startsWith('## ')) {
      const title = text.slice(3);
      acc.push({ id: title.toLowerCase().replace(/\s+/g, '-'), level: 3, title });
    }
    return acc;
  }, []);
}

/* ─────────────────────────────────────────────
   Private Renderers
   ───────────────────────────────────────────── */

function _renderBreadcrumbs(taleTitle) {
  const container = document.getElementById('breadcrumbs');
  if (!container) return;

  const crumbs = ['Archives', 'Tales', taleTitle];
  container.innerHTML = crumbs
    .map(
      (c, i) => `
      <span class="flex items-center gap-2">
        <span class="breadcrumb-item">${escapeHtml(c)}</span>
        ${
          i < crumbs.length - 1
            ? '<i data-lucide="chevron-right" style="width:12px;height:12px;opacity:0.5"></i>'
            : ''
        }
      </span>
    `
    )
    .join('');
}

function _renderAvatars(name) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const html = `<div style="display:flex;align-items:center;justify-content:center;border-radius:50%;color:#fff;width:40px;height:40px;font-size:13px;background:linear-gradient(135deg,rgba(99,102,241,0.85),rgba(168,85,247,0.85));box-shadow:0 0 18px -6px rgba(139,124,246,0.55);font-family:var(--font-serif);letter-spacing:0.08em">${initials}</div>`;

  const topAvatar = document.getElementById('author-avatar');
  const cardAvatar = document.getElementById('author-card-avatar');
  if (topAvatar) topAvatar.innerHTML = html;
  if (cardAvatar) cardAvatar.innerHTML = html;
}

function _createFigure(tint) {
  const palette =
    {
      indigo: 'rgba(99,102,241,0.45)',
      amber: 'rgba(245,158,11,0.45)',
      emerald: 'rgba(16,185,129,0.45)',
      rose: 'rgba(244,114,182,0.45)',
    }[tint] || 'rgba(99,102,241,0.45)';

  return `
    <figure>
      <div class="figure-placeholder" aria-hidden="true"
        style="background:radial-gradient(600px 320px at 30% 40%,${palette},transparent 60%),
               radial-gradient(500px 280px at 80% 70%,rgba(168,85,247,0.4),transparent 65%),
               linear-gradient(180deg,#0b0b14,#050509)">
      </div>
      <figcaption class="figure-caption">A reconstructed view of the chamber at twilight.</figcaption>
    </figure>
  `;
}
