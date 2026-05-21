// src/pages/reader/content.js
// Optimized Content Loader for Reader
// Renders tale metadata and semantic story content.

import { getTaleMeta, getChapter } from '@services/index.js';
import { readerState } from './state.js';
import { initIcons } from '@ui/components/icons.js';
import { escapeHtml } from '@/utils/string.utils';

/* ─────────────────────────────────────────────
   Public Fetchers
   ───────────────────────────────────────────── */

/**
 * Shows high-fidelity skeleton loaders for the reader page.
 */
export function showReaderSkeletons() {
  const content = document.getElementById('story-content');
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

  const sidebar = document.querySelector('.reader-sidebar');
  if (sidebar) {
    const name = document.getElementById('sidebar-story-name');
    const author = document.getElementById('sidebar-author');
    const description = document.getElementById('sidebar-description');
    if (name) name.innerHTML = '<div class="skeleton h-7 w-3/4 rounded-lg mb-2"></div>';
    if (author) author.innerHTML = '<div class="skeleton h-4 w-1/2 rounded-md mb-4"></div>';
    if (description) {
      description.innerHTML = `
        <div class="space-y-2">
          <div class="skeleton h-3.5 w-full rounded-md"></div>
          <div class="skeleton h-3.5 w-full rounded-md"></div>
          <div class="skeleton h-3.5 w-2/3 rounded-md"></div>
        </div>
      `;
    }
  }
}

export async function loadReaderMeta(taleId) {
  try {
    const meta = await getTaleMeta(taleId);
    
    // 1. Sync State
    readerState.taleTitle = meta.title || 'Untitled Tale';
    readerState.authorName = meta.authorName || 'Unknown Scribe';
    readerState.coverUrl = meta.coverUrl || '';
    readerState.tags = meta.tags || [];

    // 2. Populate Header
    _setText('reader-header-title', readerState.taleTitle);

    // 3. Populate Sidebar
    _setText('sidebar-story-name', readerState.taleTitle);
    _setText('sidebar-author', readerState.authorName);
    _setText('sidebar-description', meta.description || 'A tale from the archives.');
    
    const cover = document.getElementById('sidebar-cover');
    if (cover && readerState.coverUrl) {
      cover.src = readerState.coverUrl;
      cover.hidden = false;
    }

    // 4. Author Branding
    _renderAuthorRow(meta);

    // 5. Post-Content Data
    _renderLoreTags(readerState.tags);
    _renderCompass(meta);

  } catch (err) {
    console.error('[reader] Meta load failed:', err);
  }
}

export async function loadReaderChapter({ taleId, chapterIndex }) {
  try {
    const { chapter, navigation } = await getChapter({ taleId, chapterIndex });
    
    // 1. Update State
    readerState.chapterTitle = chapter.title || `Chapter ${chapterIndex + 1}`;
    readerState.totalChapters = navigation.totalChapters;

    // 2. Render Identifiers
    const pad = String(chapterIndex + 1).padStart(2, '0');
    _setText('reader-chapter-label', `Fragment ${pad} of ${navigation.totalChapters}`);
    _setText('chapter-label', `Fragment ${pad}`);
    _setText('chapter-title', readerState.chapterTitle);

    // 3. Render Content
    const container = document.getElementById('story-content');
    if (container) {
      container.innerHTML = _processContent(chapter.content || '');
    }

    return navigation;
  } catch (err) {
    console.error('[reader] Chapter load failed:', err);
    _setText('chapter-title', 'Chapter load failed.');
    return null;
  }
}

/* ─────────────────────────────────────────────
   Private Renderers
   ───────────────────────────────────────────── */

function _processContent(raw) {
  const paragraphs = raw.split('\n').filter(l => l.trim());
  let first = true;

  return paragraphs.map(p => {
    const text = p.trim();
    if (text.startsWith('## ')) return `<h3 class="text-xl font-bold mt-10 mb-5 text-white/90">${escapeHtml(text.slice(3))}</h3>`;
    if (text.startsWith('# ')) return `<h2 class="text-2xl font-black uppercase tracking-tight mt-14 mb-8 text-white">${escapeHtml(text.slice(2))}</h2>`;
    if (text.startsWith('> ')) return `<blockquote class="border-l-2 border-indigo-500/40 pl-8 my-10 italic text-slate-400 font-serif text-lg">${escapeHtml(text.slice(2))}</blockquote>`;

    const cls = first ? 'mb-6 first-letter:float-left first-letter:text-[5em] first-letter:font-black first-letter:font-cinzel first-letter:mr-3 first-letter:text-indigo-400 first-letter:leading-[0.85] first-letter:mt-2' : 'mb-6';
    first = false;
    return `<p class="${cls}">${escapeHtml(text)}</p>`;
  }).join('');
}

function _renderAuthorRow(meta) {
  const container = document.getElementById('reader-author-row');
  if (!container) return;

  const uid = meta.authorId || 'scribe';
  const seed = encodeURIComponent(uid.slice(0, 8));

  container.innerHTML = `
    <div class="glass flex items-center gap-3.5 px-5 py-3 rounded-2xl border-white/5">
      <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}" class="w-10 h-10 rounded-xl bg-indigo-500/10 object-cover" />
      <div>
        <p class="text-[10px] font-black text-white uppercase tracking-[0.2em]">${escapeHtml(meta.authorName || 'Scribe')}</p>
        <p class="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">${escapeHtml(meta.era || 'Unknown Era')}</p>
      </div>
    </div>
  `;
}

function _renderLoreTags(tags) {
  const container = document.getElementById('lore-tag-list');
  if (!container) return;
  
  if (!tags.length) {
    container.innerHTML = '<span class="text-[10px] text-slate-600 italic">Unclassified Archive</span>';
    return;
  }

  container.innerHTML = tags.map(t => `<span class="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">${escapeHtml(t)}</span>`).join('');
}

function _renderCompass(meta) {
  const container = document.getElementById('compass-data');
  if (!container) return;

  const items = [
    { label: 'Setting', value: meta.worldSetting },
    { label: 'Tone', value: meta.tone },
    { label: 'Audience', value: meta.audience },
    { label: 'Language', value: meta.language }
  ];

  container.innerHTML = items.map(item => `
    <div class="glass p-3 rounded-xl border-white/5">
      <p class="text-[8px] font-black text-slate-600 uppercase mb-1 tracking-widest">${item.label}</p>
      <p class="font-bold text-white/80">${escapeHtml(item.value || '—')}</p>
    </div>
  `).join('');
}

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function _setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? '';
}
