// src/pages/tale/ui.js
// Presentation layer for the tale summary page (Chronicle Codex).

import { initIcons } from '@ui/components/icons.js';
import { setText, escapeHtml, createLogger } from '@/utils';
import { getTotalReadTime } from '@services/index.js';
import { getChapterProgress } from '@services/reader/localProgress.service.js';
import { MS_PER_MINUTE } from '@config/app.config.js';

const log = createLogger('TaleUI');

const FALLBACK_COVER = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800';

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
  const coverEls = document.querySelectorAll('img[id^="display-cover"]');
  if (coverEls.length) {
    coverEls.forEach((img) => {
      img.src = url;
      img.alt = title || 'Tale cover';
      img.onerror = () => {
        img.onerror = null;
        img.src = FALLBACK_COVER;
      };
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
 * Shows skeleton loaders for the Archive page layout.
 */
export function showArchiveSkeletons() {
  const list = getEl('chapter-list');
  if (list) {
    list.innerHTML = Array.from(
      { length: 4 },
      () => `
        <div class="h-16 rounded-2xl skeleton mb-3"></div>
      `
    ).join('');
  }

  const title = getEl('display-title');
  if (title) title.innerHTML = '<div class="skeleton h-10 sm:h-12 w-3/4 rounded-2xl mb-2"></div>';

  const desc = getEl('display-description');
  if (desc) {
    desc.innerHTML = `
      <div class="space-y-2">
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

  const resumeTexts = document.querySelectorAll('[id^="resume-text"]');
  resumeTexts.forEach((el) => {
    el.innerText = 'Resume Reading';
  });

  const authorAvatar = getEl('author-avatar-hero');
  if (authorAvatar) {
    const seed = encodeURIComponent((tale.authorId || 'scribe').slice(0, 8));
    authorAvatar.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    authorAvatar.alt = authorName;
  }

  const coverUrl = tale.coverUrl || FALLBACK_COVER;
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
            <span class="px-2.5 py-1 rounded-lg bg-white/4 border border-white/6 text-[10px] font-bold uppercase tracking-wider text-slate-300">
              ${escapeHtml(t)}
            </span>
          `
        )
        .join('');
    } else {
      tagList.innerHTML =
        '<span class="text-xs text-slate-500 italic">No lore tags designated.</span>';
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
    list.innerHTML = `<div class="glass p-8 sm:p-12 rounded-2xl text-center text-slate-500 text-[11px] font-bold uppercase tracking-widest">No chronicles detected in this archive.</div>`;
    return;
  }

  list.innerHTML = chapters
    .map((ch, idx) => {
      const progress = getChapterProgress({ userId, taleId, chapterIndex: idx });
      const state = getChapterState(progress);

      let icon = 'circle';
      let iconCls = 'text-slate-600';

      if (state === 'in_progress') {
        icon = 'clock';
        iconCls = 'text-amber-400';
      }

      if (state === 'completed') {
        icon = 'check-circle-2';
        iconCls = 'text-emerald-400';
      }

      return `
        <div data-chapter-index="${idx}" class="chapter-item ${state} glass-card p-4 sm:p-5 rounded-2xl flex justify-between items-center group cursor-pointer hover:border-indigo-500/30 transition-all">
          <div class="flex items-center gap-3.5 sm:gap-4 min-w-0">
            <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/4 border border-white/6 flex items-center justify-center text-xs font-bold text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all shrink-0">
              ${String(idx + 1).padStart(2, '0')}
            </div>
            <div class="min-w-0">
              <span class="text-[9px] font-black text-indigo-400/70 uppercase tracking-[0.25em] block mb-0.5">Fragment</span>
              <h4 class="text-sm sm:text-base font-bold text-white uppercase tracking-tight truncate">${escapeHtml(ch.title || 'Untitled')}</h4>
            </div>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <span class="hidden sm:inline-block text-[9px] font-bold uppercase tracking-wider text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">Read</span>
            <i data-lucide="${icon}" class="w-4 h-4 ${iconCls}"></i>
          </div>
        </div>
      `;
    })
    .join('');

  initIcons();
}
