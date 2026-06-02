// src/pages/tale/ui.js
// Presentation layer for the tale summary page.
// Handles tale metadata rendering, chapter lists, and skeleton states.

import { initIcons } from '@ui/components/icons.js';
import { setText, formatNumber, escapeText } from '@/utils';
import { getTotalReadTime } from '@services/index.js';
import { getChapterProgress } from '@services/reader/localProgress.service.js';
import { MS_PER_MINUTE } from '@config/app.config.js';

/* ─────────────────────────────────────────────
   State Helpers
   ───────────────────────────────────────────── */

function getChapterState(progress) {
  if (!progress) return 'not_started';
  if (progress.isFinished) return 'completed';
  return 'in_progress';
}

/* ─────────────────────────────────────────────
   Skeletons
   ───────────────────────────────────────────── */

export function renderTaleSkeleton() {
  const list = document.getElementById('chapter-list');
  if (list) {
    list.innerHTML = Array.from(
      { length: 5 },
      () => `
      <div class="h-24 rounded-[2rem] skeleton mb-4"></div>
    `
    ).join('');
  }

  const title = document.getElementById('tale-title');
  if (title) title.innerHTML = '<div class="skeleton h-12 w-3/4 rounded-2xl mb-4"></div>';

  const desc = document.getElementById('tale-description');
  if (desc) {
    desc.innerHTML = `
      <div class="skeleton h-4 w-full rounded-md mb-2"></div>
      <div class="skeleton h-4 w-5/6 rounded-md"></div>
    `;
  }
}

/* ─────────────────────────────────────────────
   Meta Render
   ───────────────────────────────────────────── */

/**
 * Populates the tale metadata into the UI.
 *
 * @param {import('@state/schemas/tale.schema.js').Tale} tale
 * @param {string} userId
 * @param {string} taleId
 */
export async function renderTaleMeta(tale, userId, taleId) {
  const title = document.getElementById('tale-title');
  const desc = document.getElementById('tale-description');
  const chCount = document.getElementById('tale-chapters');
  const author = document.getElementById('tale-author');
  const era = document.getElementById('tale-era');
  const cover = document.getElementById('tale-cover');

  if (title) title.textContent = tale.title || 'Untitled Tale';
  if (desc) desc.textContent = tale.description || 'A mysterious tale waiting to be uncovered...';

  const count = tale.chapterCount || 0;
  if (chCount) chCount.textContent = `${count} ${count === 1 ? 'Fragment' : 'Fragments'}`;

  if (cover) {
    const url =
      tale.coverUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800';
    cover.src = url;
    cover.alt = tale.title || 'Tale cover';

    // Apply as background too for the hero glow
    document
      .getElementById('hero-section')
      ?.style.setProperty('--bg-url', `url('${tale.coverUrl}')`);
  }

  // Author and Era
  if (author) author.textContent = tale.authorName || 'Unknown Scribe';
  if (era) era.textContent = tale.era || 'Unknown Era';

  // Tags
  const tagList = document.getElementById('lore-tag-list');
  if (tagList && tale.tags?.length) {
    tagList.innerHTML = tale.tags
      .map(
        (t) => `
      <span class="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400">
        ${escapeText(t)}
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
             <h4 class="text-base md:text-lg font-bold text-white uppercase tracking-tight">${escapeText(ch.title || 'Untitled')}</h4>
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
