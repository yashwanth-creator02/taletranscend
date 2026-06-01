// src/pages/tale/ui.js
// Renders the high-fidelity tale overview and chronicles for the Archive page.

import {
  getChapterState,
  getChapterProgress,
  getLastReadChapter,
  getTotalReadTime,
} from '@services/index.js';
import { escapeHtml, setText, formatMs } from '@/utils/string.utils';
import { MS_PER_MINUTE } from '@config/app.config.js';
import { initIcons } from '@ui/components/icons.js';

/**
 * Shows high-fidelity skeleton loaders for the Archive page.
 */
export function showArchiveSkeletons() {
  const list = document.getElementById('chapter-list');
  if (list) {
    list.innerHTML = Array.from(
      { length: 4 },
      () => `
      <div class="glass-card p-6 md:p-8 rounded-[2rem] flex justify-between items-center animate-pulse">
        <div class="flex items-center gap-6">
           <div class="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 skeleton"></div>
           <div>
             <div class="skeleton h-3 w-16 rounded-md mb-2"></div>
             <div class="skeleton h-6 w-48 rounded-lg"></div>
           </div>
        </div>
        <div class="skeleton h-5 w-5 rounded-full"></div>
      </div>
    `
    ).join('');
  }

  const title = document.getElementById('display-title');
  if (title) title.innerHTML = '<div class="skeleton h-12 w-3/4 rounded-2xl mb-4"></div>';

  const desc = document.getElementById('display-description');
  if (desc) {
    desc.innerHTML = `
      <div class="space-y-3">
        <div class="skeleton h-4 w-full rounded-lg"></div>
        <div class="skeleton h-4 w-full rounded-lg"></div>
        <div class="skeleton h-4 w-2/3 rounded-lg"></div>
      </div>
    `;
  }
}

/**
 * Renders the primary tale metadata with cinematic transitions.
 */
export async function renderTale(userId, tale, taleId) {
  const lastChapter = getLastReadChapter({ userId, taleId });
  const last = lastChapter != null ? lastChapter + 1 : null;

  setText('loading-indicator', 'Archive Link Synchronised');
  setText('header-tale-title', tale.title || 'Unknown Legend');

  const titleEl = document.getElementById('display-title');
  if (titleEl) {
    titleEl.innerText = tale.title || 'Untitled Legend';
    titleEl.classList.remove('opacity-0', 'translate-y-12');
  }

  const metaHero = document.getElementById('hero-meta');
  if (metaHero) {
    metaHero.classList.remove('opacity-0', 'translate-y-8');
  }

  setText('display-author', tale.authorName || 'Unknown Scribe');
  setText('display-chapters', `${tale.chapterCount || 0} Fragments`);
  setText('sidebar-chapter-count', tale.chapterCount || 0);
  setText(
    'display-description',
    tale.description || 'A mysterious tale waiting to be uncovered...'
  );

  setText('tale-era', tale.era || 'Universal Era');
  setText('tale-genre', tale.genre || 'Mythic Fiction');
  setText('tale-language', tale.language || 'Primordial');
  setText('sidebar-creation', tale.era || 'Neural Entry');

  const resumeText = document.getElementById('resume-text');
  if (resumeText) resumeText.innerText = last ? `Resume Fragment ${last}` : 'Resume Reading';

  const authorAvatar = document.getElementById('author-avatar-hero');
  if (authorAvatar) {
    const seed = encodeURIComponent((tale.authorId || 'scribe').slice(0, 8));
    authorAvatar.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
  }

  if (tale.coverUrl) {
    const covers = document.querySelectorAll('#display-cover');
    covers.forEach((img) => (img.src = tale.coverUrl));

    document
      .getElementById('hero-section')
      ?.style.setProperty('--bg-url', `url('${tale.coverUrl}')`);
  }

  // Tags
  const tagList = document.getElementById('lore-tag-list');
  if (tagList && tale.tags?.length) {
    tagList.innerHTML = tale.tags
      .map(
        (t) => `
      <span class="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400">
        ${escapeHtml(t)}
      </span>
    `
      )
      .join('');
  }

  // Read Time
  const totalMs = await getTotalReadTime({ userId, taleId });
  const minutes = Math.max(1, Math.floor(totalMs / MS_PER_MINUTE));
  setText('read-time', `${minutes} min read`);

  initIcons();
}

/**
 * Renders the chronicles list with progress indicators.
 */
export function renderChapters(userId, chapters, taleId) {
  const list = document.getElementById('chapter-list');
  if (!list) return;

  if (!chapters.length) {
    list.innerHTML = `<div class="glass p-12 rounded-[2rem] text-center text-slate-600 text-[10px] font-black uppercase tracking-widest">No chronicles detected in this archive.</div>`;
    return;
  }

  list.innerHTML = chapters
    .map((ch, idx) => {
      const progress = getChapterProgress({ userId, taleId, chapterIndex: idx });
      const state = getChapterState(progress);

      let icon = 'circle';
      let iconCls = 'text-slate-700';
      if (state === 'in_progress') {
        icon = 'clock';
        iconCls = 'text-indigo-400';
      }
      if (state === 'completed') {
        icon = 'check-circle-2';
        iconCls = 'text-emerald-500';
      }

      return `
      <div data-chapter-index="${idx}" class="chapter-item ${state} glass-card p-6 md:p-8 rounded-[2rem] flex justify-between items-center group cursor-pointer">
        <div class="flex items-center gap-6">
           <div class="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-xs font-black text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
             ${String(idx + 1).padStart(2, '0')}
           </div>
           <div>
             <span class="text-[9px] font-black text-indigo-500/60 uppercase tracking-[0.3em] block mb-1">Fragment</span>
             <h4 class="text-base md:text-lg font-bold text-white uppercase tracking-tight">${escapeHtml(ch.title || 'Untitled')}</h4>
           </div>
        </div>
        <div class="flex items-center gap-4">
           <span class="hidden md:block text-[9px] font-black uppercase tracking-widest text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">Access Fragment</span>
           <i data-lucide="${icon}" class="w-5 h-5 ${iconCls}"></i>
        </div>
      </div>
    `;
    })
    .join('');

  initIcons();
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.innerText = val ?? '';
}
