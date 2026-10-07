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
  if (
    progress.isFinished ||
    progress.finished ||
    progress.scrollPercent >= 95 ||
    progress.status === 'completed'
  ) {
    return 'completed';
  }
  if (progress.scrollPercent > 0 || progress.status === 'in_progress') return 'in_progress';
  return 'not_started';
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

  const editBtnDesktop = getEl('edit-tale-btn-desktop');
  if (editBtnDesktop) {
    editBtnDesktop.classList.add('hidden');
    editBtnDesktop.style.setProperty('display', 'none', 'important');
  }
  const editBtnMobile = getEl('edit-tale-btn-mobile');
  if (editBtnMobile) {
    editBtnMobile.classList.add('hidden');
    editBtnMobile.style.setProperty('display', 'none', 'important');
  }
  const authorActionsMobile = getEl('author-actions-mobile');
  if (authorActionsMobile) {
    authorActionsMobile.classList.add('hidden');
    authorActionsMobile.style.setProperty('display', 'none', 'important');
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
 * @param {boolean} [isResonated=false]
 */
export async function renderTale(userId, tale, taleId, isResonated = false) {
  log.info('Rendering tale metadata', { taleId, title: tale.title, isResonated });
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

  // Status indicator (Ongoing, Completed, Hiatus, Stopped/Cancelled)
  const rawStatus = (
    tale.publicationStatus ||
    (tale.status !== 'published' && tale.status !== 'pending' && tale.status !== 'draft'
      ? tale.status
      : null) ||
    'ongoing'
  ).toLowerCase();
  let statusLabel = 'Ongoing';
  let dotClass = 'bg-emerald-400';

  if (rawStatus === 'completed') {
    statusLabel = 'Completed';
    dotClass = 'bg-indigo-400';
  } else if (rawStatus === 'hiatus') {
    statusLabel = 'Hiatus';
    dotClass = 'bg-amber-400';
  } else if (rawStatus === 'stopped' || rawStatus === 'cancelled') {
    statusLabel = 'Cancelled';
    dotClass = 'bg-rose-400';
  } else {
    statusLabel = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
    dotClass = 'bg-emerald-400';
  }

  setTextIfExists('display-status', statusLabel);
  const statusDot = getEl('display-status-dot');
  if (statusDot) {
    statusDot.className = `w-2 h-2 rounded-full ${dotClass} animate-pulse`;
  }

  // Author Edit Chronicle Action Buttons & Inquire Controls
  const isAuthor = Boolean(
    userId &&
    userId !== 'anonymous' &&
    tale.authorId &&
    tale.authorId !== 'anonymous' &&
    userId === tale.authorId
  );
  const editUrl = `/contribution.html?taleId=${encodeURIComponent(taleId)}`;

  const editBtnDesktop = getEl('edit-tale-btn-desktop');
  if (editBtnDesktop) {
    editBtnDesktop.href = editUrl;
    editBtnDesktop.classList.toggle('hidden', !isAuthor);
    editBtnDesktop.style.setProperty('display', isAuthor ? 'inline-flex' : 'none', 'important');
  }
  const editBtnMobile = getEl('edit-tale-btn-mobile');
  if (editBtnMobile) {
    editBtnMobile.href = editUrl;
    editBtnMobile.classList.toggle('hidden', !isAuthor);
    editBtnMobile.style.setProperty('display', isAuthor ? 'inline-flex' : 'none', 'important');
  }
  const authorActionsMobile = getEl('author-actions-mobile');
  if (authorActionsMobile) {
    authorActionsMobile.classList.toggle('hidden', !isAuthor);
    authorActionsMobile.style.setProperty('display', isAuthor ? 'block' : 'none', 'important');
  }

  // Inquire of the Author controls (hidden if user is the author)
  const tabBtnLetter = getEl('tab-btn-letter');
  if (tabBtnLetter) {
    tabBtnLetter.classList.toggle('hidden', isAuthor);
  }
  const contentLetter = getEl('content-letter');
  if (contentLetter && isAuthor) {
    contentLetter.classList.add('hidden');
  }
  const inviteCard = document.querySelector('.chronicler-invite-card');
  if (inviteCard) {
    inviteCard.classList.toggle('hidden', isAuthor);
  }

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

  const letterAuthorName = getEl('letter-author-name');
  if (letterAuthorName) letterAuthorName.textContent = authorName;

  const letterAuthorBio = getEl('letter-author-bio');
  if (letterAuthorBio) {
    letterAuthorBio.textContent = tale.authorBio || `Creator and keeper of this chronicle.`;
  }

  const letterAuthorAvatar = getEl('letter-author-avatar');
  if (letterAuthorAvatar) {
    const seed = encodeURIComponent((tale.authorId || 'scribe').slice(0, 8));
    letterAuthorAvatar.src =
      tale.authorAvatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    letterAuthorAvatar.alt = authorName;
  }

  const profileLink = getEl('letter-author-profile-link');
  if (profileLink) {
    profileLink.href = tale.authorId
      ? `/profile.html?uid=${encodeURIComponent(tale.authorId)}`
      : '/library.html';
  }

  const coverUrl = tale.coverUrl || FALLBACK_COVER;
  setCoverImage(coverUrl, title);

  const heroSection = getEl('hero-section');
  if (heroSection) {
    heroSection.style.setProperty('--bg-url', `url('${coverUrl}')`);
  }
  const heroBackdropImg = getEl('hero-backdrop-img');
  if (heroBackdropImg) {
    heroBackdropImg.style.backgroundImage = `url('${coverUrl}')`;
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

  // Soul Resonance Initial Display & Alignment
  const reactionCount = Number(tale.reactionCount ?? 0);
  setTextIfExists('resonance-count', reactionCount);
  setTextIfExists('resonance-count-mobile', reactionCount);

  const resonanceBtns = document.querySelectorAll('[id^="resonance-btn"]');
  resonanceBtns.forEach((btn) => {
    btn.setAttribute('aria-pressed', isResonated ? 'true' : 'false');
    const label =
      btn.querySelector('.resonance-label') ||
      btn.querySelector('span:not([id*="resonance-count"])');

    if (isResonated) {
      btn.classList.add('border-red-500/50', 'bg-red-500/15', 'text-red-400', 'is-aligned');
      btn.classList.remove('border-white/8', 'border-white/10', 'text-slate-300');
      if (label) label.textContent = 'Souls Aligned';
      const icon = btn.querySelector('i, svg');
      if (icon) {
        icon.classList.remove('text-slate-400', 'text-slate-500');
        icon.classList.add('text-red-500', 'fill-red-500');
        icon.setAttribute('fill', 'currentColor');
        icon.style.fill = 'currentColor';
      }
    } else {
      btn.classList.remove('border-red-500/50', 'bg-red-500/15', 'text-red-400', 'is-aligned');
      btn.classList.add('border-white/8', 'text-slate-300');
      if (label) label.textContent = 'Align Souls';
      const icon = btn.querySelector('i, svg');
      if (icon) {
        icon.classList.remove('text-red-500', 'fill-red-500');
        icon.classList.add('text-slate-400');
        icon.setAttribute('fill', 'none');
        icon.style.fill = 'none';
      }
    }
  });

  initIcons();

  if (isResonated) {
    resonanceBtns.forEach((btn) => {
      const renderedSvg = btn.querySelector('svg');
      if (renderedSvg) {
        renderedSvg.classList.remove('text-slate-400', 'text-slate-500');
        renderedSvg.classList.add('text-red-500', 'fill-red-500');
        renderedSvg.setAttribute('fill', 'currentColor');
        renderedSvg.style.fill = 'currentColor';
      }
    });
  }
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

  let completedCount = 0;

  list.innerHTML = chapters
    .map((ch, idx) => {
      const progress = getChapterProgress({ userId, taleId, chapterIndex: idx });
      const state = getChapterState(progress);
      const isCompleted = state === 'completed';
      if (isCompleted) completedCount++;

      let icon = 'circle';
      let iconCls = 'text-slate-400';

      if (state === 'in_progress') {
        icon = 'clock';
        iconCls = 'text-amber-400';
      }

      if (state === 'completed') {
        icon = 'check-circle-2';
        iconCls = 'text-emerald-400';
      }

      return `
        <div data-chapter-index="${idx}" class="chapter-item ${state} glass-card p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-3 group cursor-pointer hover:border-indigo-500/30 transition-all">
          <div class="flex items-center gap-3 sm:gap-3.5 min-w-0">
            <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/4 border border-white/6 flex items-center justify-center text-xs font-bold text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all shrink-0">
              ${String(idx + 1).padStart(2, '0')}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2 mb-0.5">
                <span class="text-[9px] font-black text-indigo-400/70 uppercase tracking-[0.2em] block">Scroll #${idx + 1}</span>
              </div>
              <h4 class="text-xs sm:text-sm font-bold text-white uppercase tracking-tight truncate">${escapeHtml(ch.title || 'Untitled')}</h4>
            </div>
          </div>
          <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <!-- Download Fragment Action -->
            <button
              type="button"
              data-action="download-chapter"
              data-chapter-index="${idx}"
              title="Download fragment (.md)"
              class="p-2 rounded-xl border border-white/6 bg-white/3 hover:bg-white/10 hover:border-white/15 text-slate-400 hover:text-white transition-all cursor-pointer active:scale-95"
            >
              <i data-lucide="download" class="w-3.5 h-3.5"></i>
            </button>
            <!-- Toggle Read/Unread Action -->
            <button
              type="button"
              data-action="${isCompleted ? 'mark-unread' : 'mark-read'}"
              data-chapter-index="${idx}"
              title="${isCompleted ? 'Mark as unread' : 'Mark as read'}"
              class="px-2.5 py-1.5 rounded-xl border ${isCompleted ? 'border-white/8 bg-white/4 hover:bg-white/10 text-slate-300 hover:text-white' : 'border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white'} text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <i data-lucide="${isCompleted ? 'rotate-ccw' : 'check'}" class="w-3.5 h-3.5 ${isCompleted ? 'text-slate-400' : 'text-emerald-400'}"></i>
              <span class="hidden md:inline">${isCompleted ? 'Unread' : 'Mark Read'}</span>
            </button>
            <!-- Status Icon -->
            <div class="w-6 flex items-center justify-center">
              <i data-lucide="${icon}" class="w-4 h-4 ${iconCls}"></i>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  const readCountEl = getEl('chronicle-read-count');
  if (readCountEl) {
    const percent = chapters.length ? Math.round((completedCount / chapters.length) * 100) : 0;
    readCountEl.textContent = `${completedCount} of ${chapters.length} read (${percent}%)`;
  }

  initIcons();
}
