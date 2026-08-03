// src/pages/tale/ui.js
// Presentation layer for the tale summary page.
// Keeps the v2 rendering logic, but maps output to the older DOM IDs used by v1.

import { initIcons } from '@shared/icons.js';
import { setText, escapeHtml, createLogger } from '@/utils';
import { getTotalReadTime } from '@services/index.js';
import { getChapterProgress } from '@services/reader/localProgress.service.js';
import { MS_PER_MINUTE } from '@config/app.config.js';

const log = createLogger('TaleUI');

/* ─────────────────────────────────────────────
   Small DOM helpers
   ───────────────────────────────────────────── */

function getEl(id) {
  return document.getElementById(id);
}

function setTextIfExists(id, value) {
  const el = getEl(id);
  if (el) el.textContent = value;
}

function setCoverImage(url, title) {
  const coverEls = document.querySelectorAll('#display-cover');
  if (coverEls.length) {
    coverEls.forEach((img) => {
      img.src = url;
      img.alt = title || 'Tale cover';
    });
  }
}

function getChapterState(progress) {
  if (!progress) return 'not_started';
  if (progress.isFinished || progress.finished) return 'completed';
  return 'in_progress';
}

/* ─────────────────────────────────────────────
   Skeletons
   ───────────────────────────────────────────── */

/**
 * Shows skeleton loaders for the existing Archive page layout.
 */
export function showArchiveSkeletons() {
  const list = getEl('chapter-list');
  if (list) {
    list.innerHTML = Array.from(
      { length: 5 },
      () => `
        <div class="h-24 rounded-[2rem] skeleton mb-4"></div>
      `
    ).join('');
  }

  const title = getEl('display-title');
  if (title) title.innerHTML = '<div class="skeleton h-12 w-3/4 rounded-2xl mb-4"></div>';

  const desc = getEl('display-description');
  if (desc) {
    desc.innerHTML = `
      <div class="space-y-3">
        <div class="skeleton h-4 w-full rounded-md"></div>
        <div class="skeleton h-4 w-5/6 rounded-md"></div>
      </div>
    `;
  }
}

/* ─────────────────────────────────────────────
   Meta Render
   ───────────────────────────────────────────── */

/**
 * Populates the tale metadata into the UI.
 *
 * Uses v2 data logic, but writes into the older v1 DOM IDs.
 *
 * @param {string} userId
 * @param {import('@state/schemas/tale.schema.js').Tale} tale
 * @param {string} taleId
 */
export async function renderTale(userId, tale, taleId) {
  log.info('Rendering tale metadata', { taleId, title: tale.title });
  const title = tale.title || 'Untitled Tale';
  const description = tale.description || 'A mysterious tale waiting to be uncovered...';
  const count = tale.chapterCount || 0;
  const chapterLabel = `${count} ${count === 1 ? 'Fragment' : 'Fragments'}`;
  const authorName = tale.authorName || 'Unknown Scribe';
  const eraName = tale.era || 'Unknown Era';
  const genreName = tale.genre || 'Unknown Genre';
  const languageName = tale.language || 'Unknown Language';

  log.debug('Updating UI elements for tale');
  setText('loading-indicator', 'Archive Link Synchronised');
  setText('header-tale-title', title);

  setTextIfExists('display-title', title);
  setTextIfExists('display-description', description);

  const titleEl = getEl('display-title');
  if (titleEl) {
    titleEl.classList.remove('opacity-0', 'translate-y-12');
  }

  const metaHero = getEl('hero-meta');
  if (metaHero) {
    metaHero.classList.remove('opacity-0', 'translate-y-8');
  }

  setTextIfExists('display-author', authorName);
  setTextIfExists('display-chapters', chapterLabel);
  setTextIfExists('sidebar-chapter-count', count);

  setTextIfExists('tale-era', eraName);
  setTextIfExists('tale-genre', genreName);
  setTextIfExists('tale-language', languageName);
  setTextIfExists('sidebar-creation', eraName);

  const resumeText = getEl('resume-text');
  if (resumeText) {
    const lastChapter = null;
    resumeText.innerText =
      lastChapter != null ? `Resume Fragment ${lastChapter + 1}` : 'Resume Reading';
  }

  const authorAvatar = getEl('author-avatar-hero');
  if (authorAvatar) {
    const seed = encodeURIComponent((tale.authorId || 'scribe').slice(0, 8));
    authorAvatar.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    authorAvatar.alt = authorName;
  }

  const coverUrl =
    tale.coverUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800';
  setCoverImage(coverUrl, title);

  const heroSection = getEl('hero-section');
  if (heroSection) {
    heroSection.style.setProperty('--bg-url', `url('${coverUrl}')`);
  }

  const tagList = getEl('lore-tag-list');
  if (tagList) {
    if (tale.tags?.length) {
      tagList.innerHTML = tale.tags
        .map(
          (t) => `
            <span class="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400">
              ${escapeHtml(t)}
            </span>
          `
        )
        .join('');
    } else {
      tagList.innerHTML = '';
    }
  }

  const totalMs = await getTotalReadTime({ userId, taleId });
  const minutes = Math.max(1, Math.floor(totalMs / MS_PER_MINUTE));
  setText('read-time', `${minutes} min read`);

  initIcons();
}

/**
 * Renders the chronicles list with progress indicators.
 *
 * @param {string} userId
 * @param {Array<Object>} chapters
 * @param {string} taleId
 */
export function renderChapters(userId, chapters, taleId) {
  log.info(`Rendering ${chapters.length} chapters`, { taleId });
  const list = getEl('chapter-list');
  if (!list) return;

  if (!chapters.length) {
    log.info('No chapters found to render');
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
