// src/pages/reader/content.js
// Optimized Content Loader for Reader
// Renders tale metadata and semantic story content.

import { refs, getDocs } from '@fb/index.js';
import { getTaleMeta, getChapter } from '@services/index.js';
import { readerState } from './state.js';
import { escapeHtml } from '@/utils/string.utils';

/* ─────────────────────────────────────────────
   Public Fetchers
   ───────────────────────────────────────────── */

/**
 * Shows high-fidelity skeleton loaders for the reader page.
 */
export function showReaderSkeletons() {
  const content = document.getElementById('articleBody');
  if (content) {
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
}

export async function loadReaderMeta(taleId) {
  try {
    const meta = await getTaleMeta(taleId);

    // 1. Sync State
    readerState.taleTitle = meta.title || 'Untitled Tale';
    readerState.authorName = meta.authorName || 'Unknown Scribe';
    readerState.authorBio = meta.authorBio || 'A mysterious scribe from the forgotten archives.';
    readerState.authorHandle =
      meta.authorHandle || `@${(meta.authorName || 'scribe').toLowerCase().replace(/\s+/g, '')}`;
    readerState.coverUrl = meta.coverUrl || '';
    readerState.tags = meta.tags || [];
    readerState.era = meta.era || 'Mythic';
    readerState.language = meta.language || 'High Elven';

    // 2. Populate Header & Sidebar
    _setText('articleMetaTitle', readerState.taleTitle);
    _setText('authorName', readerState.authorName);
    _setText('author-heading', readerState.authorName);
    _setText('authorHandle', readerState.authorHandle);
    _setText('authorCardBio', readerState.authorBio);
    _setText('topBarChTitle', 'Loading...');

    // 3. Render Breadcrumbs
    _renderBreadcrumbs(readerState.taleTitle);

    // 4. Render Author Avatars
    _renderAvatars(readerState.authorName);

    // 5. Fetch all chapters for TOC
    const chaptersSnap = await getDocs(refs.chapters(taleId));
    readerState.chapters = chaptersSnap.docs
      .map((d) => ({
        id: d.id,
        number: d.data().chapterNum,
        title: d.data().title || `Fragment ${d.data().chapterNum}`,
        wordCount: d.data().content ? d.data().content.split(/\s+/).length : 0,
        sections: _extractSections(d.data().content || ''),
      }))
      .sort((a, b) => a.number - b.number);
  } catch (err) {
    console.error('[reader] Meta load failed:', err);
  }
}

export async function loadReaderChapter({ taleId, chapterIndex }) {
  try {
    const { chapter, navigation } = await getChapter({ taleId, chapterIndex });

    // 1. Update State
    readerState.chapterTitle = chapter.title || `Fragment ${chapterIndex + 1}`;
    readerState.totalChapters = navigation.totalChapters;
    readerState.wordCount = chapter.content ? chapter.content.split(/\s+/).length : 0;
    readerState.estimatedReadMins = Math.ceil(readerState.wordCount / 225);
    readerState.currentChapterId = readerState.chapters[chapterIndex]?.id || '';

    // 2. Render Identifiers
    _setText('topBarChNum', chapterIndex + 1);
    _setText('topBarChTotal', navigation.totalChapters);
    _setText('topBarChTitle', readerState.chapterTitle);
    _setText('headerChNum', chapterIndex + 1);
    _setText('headerChTotal', navigation.totalChapters);
    _setText('articleTitle', readerState.chapterTitle);
    _setText('articleSubtitle', chapter.subtitle || '');
    _setText('readMinutes', readerState.estimatedReadMins);

    // 3. Render Content
    const container = document.getElementById('articleBody');
    if (container) {
      container.innerHTML = _processContent(chapter.content || '');
    }

    // 4. Update Progress Stats
    const topBarReadTime = document.getElementById('topBarReadTime');
    if (topBarReadTime) {
      _setText('topBarMin', readerState.estimatedReadMins);
      topBarReadTime.classList.remove('hidden');
      topBarReadTime.classList.add('flex');
    }

    return navigation;
  } catch (err) {
    console.error('[reader] Chapter load failed:', err);
    _setText('articleTitle', 'Chapter load failed.');
    return null;
  }
}

/* ─────────────────────────────────────────────
   Private Renderers
   ───────────────────────────────────────────── */

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
      if (text.startsWith('> ')) return `<blockquote>${escapeHtml(text.slice(2))}</blockquote>`;

      // Special handling for figures
      if (text.startsWith('![figure]')) {
        const tint = text.includes('indigo')
          ? 'indigo'
          : text.includes('amber')
            ? 'amber'
            : text.includes('rose')
              ? 'rose'
              : 'emerald';
        return _createFigure(tint);
      }

      const cls = first ? 'materialize' : '';
      first = false;
      return `<p class="${cls}">${escapeHtml(text)}</p>`;
    })
    .join('');
}

function _extractSections(content) {
  const lines = content.split('\n');
  const sections = [];
  lines.forEach((line) => {
    const text = line.trim();
    if (text.startsWith('# ')) {
      const title = text.slice(2);
      sections.push({ id: title.toLowerCase().replace(/\s+/g, '-'), level: 2, title });
    } else if (text.startsWith('## ')) {
      const title = text.slice(3);
      sections.push({ id: title.toLowerCase().replace(/\s+/g, '-'), level: 3, title });
    }
  });
  return sections;
}

function _renderBreadcrumbs(taleTitle) {
  const container = document.getElementById('breadcrumbs');
  if (!container) return;

  const crumbs = ['Archives', 'Tales', taleTitle];
  container.innerHTML = crumbs
    .map(
      (c, i) => `
      <span class="flex items-center gap-2">
        <span class="breadcrumb-item">${escapeHtml(c)}</span>
        ${i < crumbs.length - 1 ? '<i data-lucide="chevron-right" style="width:12px;height:12px;opacity:0.5"></i>' : ''}
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

  const topAvatar = document.getElementById('authorAvatar');
  const cardAvatar = document.getElementById('authorCardAvatar');

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

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function _setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? '';
}
