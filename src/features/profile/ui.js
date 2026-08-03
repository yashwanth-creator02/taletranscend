// src/features/profile/ui.js
// Profile page UI — tabbed modal controls, all field rendering,
// genre multi-select, avatar preview, toast notifications.

import { profileState, GENRE_OPTIONS } from './state.js';
import { suggestNameFromBio } from './ai-name.js';
import { debounce } from '@/utils';
import { initIcons } from '@shared/icons.js';
import { showToast } from '@shared/components/toast/toast.js';
import {
  setText,
  setInput,
  formatNumber,
  formatJoinDate,
  timeAgo,
  escapeHtml as escapeHtml,
} from '@/utils';

/* ─────────────────────────────────────────────
   Modal
   ───────────────────────────────────────────── */

/**
 * Bootstraps all profile UI interactions:
 * - Modal open/close
 * - Tab switching
 * - Genre multi-select
 * - Avatar preview
 * - AI name suggestion button
 * - Backdrop click to close
 */
export function initProfileUI() {
  _bindModalTriggers();
  _bindTabSwitching();
  _buildGenreSelector();
  _bindAvatarPreview();
  _bindAiNameButton();
  _bindBackdropClose();
}

function _bindModalTriggers() {
  ['btn-edit-desktop', 'btn-edit-mobile'].forEach((id) => {
    document.getElementById(id)?.addEventListener('click', openModal);
  });

  ['btn-close-modal', 'btn-cancel-modal'].forEach((id) => {
    document.getElementById(id)?.addEventListener('click', closeModal);
  });
}

export function openModal() {
  const modal = document.getElementById('edit-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  // Switch to basic tab on open
  switchTab('basic');
  document.body.style.overflow = 'hidden';
}

export function closeModal() {
  const modal = document.getElementById('edit-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  document.body.style.overflow = '';
}

function _bindBackdropClose() {
  document.getElementById('edit-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

/* ─────────────────────────────────────────────
   Tabs
   ───────────────────────────────────────────── */

/**
 * Switches the visible tab panel and updates tab button styles.
 *
 * @param {'basic'|'identity'|'social'|'goals'} tab
 */
export function switchTab(tab) {
  profileState.activeModalTab = tab;

  // Toggle panel visibility
  ['basic', 'identity', 'social', 'goals'].forEach((t) => {
    const panel = document.getElementById(`tab-panel-${t}`);
    if (panel) panel.hidden = t !== tab;

    const btn = document.querySelector(`[data-tab="${t}"]`);
    if (btn) {
      btn.classList.toggle('tab-btn--active', t === tab);
      btn.classList.toggle('tab-btn--inactive', t !== tab);
    }
  });
}

function _bindTabSwitching() {
  document.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

/* ─────────────────────────────────────────────
   Genre Multi-Select
   ───────────────────────────────────────────── */

/**
 * Builds the genre chip selector inside #genre-selector.
 * Chips are toggled; selected genres are stored in profileState.favouriteGenres.
 */
function _buildGenreSelector() {
  const container = document.getElementById('genre-selector');
  if (!container) return;

  container.innerHTML = GENRE_OPTIONS.map(
    (genre) => `
    <button
      type="button"
      class="genre-chip"
      data-genre="${genre}"
      aria-pressed="false"
    >${genre}</button>
  `
  ).join('');

  container.addEventListener('click', (e) => {
    const chip = e.target.closest('.genre-chip');
    if (!chip) return;

    const genre = chip.dataset.genre;
    const isSelected = chip.getAttribute('aria-pressed') === 'true';

    chip.setAttribute('aria-pressed', String(!isSelected));
    chip.classList.toggle('genre-chip--selected', !isSelected);

    if (!isSelected) {
      if (!profileState.favouriteGenres.includes(genre)) {
        profileState.favouriteGenres.push(genre);
      }
    } else {
      profileState.favouriteGenres = profileState.favouriteGenres.filter((g) => g !== genre);
    }
  });
}

/**
 * Updates genre chip visual state to match the current profileState.
 */
export function syncGenreChips() {
  document.querySelectorAll('.genre-chip').forEach((chip) => {
    const selected = profileState.favouriteGenres.includes(chip.dataset.genre);
    chip.setAttribute('aria-pressed', String(selected));
    chip.classList.toggle('genre-chip--selected', selected);
  });
}

/* ─────────────────────────────────────────────
   Avatar Preview
   ───────────────────────────────────────────── */

function _bindAvatarPreview() {
  const input = document.getElementById('input-avatar-url');
  const preview = document.getElementById('modal-avatar-preview');
  if (!input || !preview) return;

  const FALLBACK = '';

  input.addEventListener(
    'input',
    debounce((e) => {
      const url = e.target.value.trim();
      if (!url) {
        preview.src = FALLBACK;
        return;
      }
      const test = new Image();
      test.onload = () => {
        preview.src = url;
      };
      test.onerror = () => {
        preview.src = FALLBACK;
      };
      test.src = url;
    }, 500)
  );
}

/* ─────────────────────────────────────────────
   AI Name Suggestion
   ───────────────────────────────────────────── */

function _bindAiNameButton() {
  const btn = document.getElementById('btn-suggest-name');
  const nameInput = document.getElementById('input-name');
  const bioInput = document.getElementById('input-bio');
  if (!btn || !nameInput || !bioInput) return;

  btn.addEventListener('click', async () => {
    const bio = bioInput.value.trim();
    if (!bio || bio.length < 5) {
      showNotification('Write a short bio first to get a name suggestion.', 'info');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Conjuring…';

    // API key should come from your environment/config — not hardcoded
    const apiKey = window.__GEMINI_KEY__ ?? null;
    const suggested = await suggestNameFromBio(bio, apiKey);

    btn.disabled = false;
    btn.textContent = 'Suggest Name';

    if (suggested) {
      nameInput.value = suggested;
      showNotification(`Suggested: "${suggested}"`, 'success');
    } else {
      showNotification('Could not generate a name. Add your Gemini API key or try later.', 'error');
    }
  });
}

/* ─────────────────────────────────────────────
   Profile UI Update
   ───────────────────────────────────────────── */

/**
 * Updates all visible profile display fields and modal inputs
 * from the provided data object.
 *
 * @param {Partial<import('./state.js').ProfileState>} data
 */
export function updateProfileUI(data) {
  // Display fields
  setText('desktop-display-name', data.name || 'Explorer');
  setText('mobile-display-name', data.name || 'Explorer');
  setText('desktop-display-bio', data.bio || 'Whispering stories to the stars…');
  setText('mobile-display-bio', data.bio || 'Whispering stories to the stars…');
  setText('profile-location', data.location || '');
  setText('profile-website-display', data.website || '');
  setText('profile-pronouns', data.pronouns || '');
  setText('profile-joined', data.joinedAt ? `Joined ${formatJoinDate(data.joinedAt)}` : '');

  // Avatar
  if (data.avatarUrl) {
    ['profile-avatar-desktop', 'profile-avatar-mobile', 'modal-avatar-preview'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.src = data.avatarUrl;
    });
    document.querySelectorAll('.avatar-placeholder').forEach((el) => el.classList.add('hidden'));
    document.querySelectorAll('.avatar-img').forEach((el) => el.classList.remove('hidden'));
  }

  // Social links
  _setSocialLink(
    'social-link-twitter',
    data.twitterHandle ? `https://twitter.com/${data.twitterHandle}` : null
  );
  _setSocialLink(
    'social-link-instagram',
    data.instagramHandle ? `https://instagram.com/${data.instagramHandle}` : null
  );
  _setSocialLink('social-link-website', data.website || null);

  // Stats
  setText('stat-words-written', formatNumber(data.totalWordsWritten || 0));
  setText('stat-total-readers', formatNumber(data.totalReaders || 0));
  setText('stat-streak', String(data.writingStreak || 0));

  // Reading goal progress
  if (data.readingGoal) {
    setText('reading-goal-target', `${data.readingGoal} tales / yr`);
  }

  // Favourite genres pills
  _renderGenrePills(data.favouriteGenres || []);

  // Update Rank
  _renderRank(data.totalWordsWritten || 0);

  // Modal inputs
  setInput('input-name', data.name || '');
  setInput('input-bio', data.bio || '');
  setInput('input-pronouns', data.pronouns || '');
  setInput('input-avatar-url', data.avatarUrl || '');
  setInput('input-location', data.location || '');
  setInput('input-website', data.website || '');
  setInput('input-twitter', data.twitterHandle || '');
  setInput('input-instagram', data.instagramHandle || '');
  setInput('input-reading-goal', String(data.readingGoal || 12));

  // Sync genre chips
  if (data.favouriteGenres) {
    profileState.favouriteGenres = [...data.favouriteGenres];
    syncGenreChips();
  }
}

function _renderRank(wordCount) {
  const badge = document.querySelector('.mythic-badge');
  if (!badge) return;

  let rank = 'Explorer';
  let colorCls = 'text-indigo-300';
  let bgCls = 'bg-indigo-500/15';
  let borderCls = 'border-indigo-500/30';

  if (wordCount >= 100000) {
    rank = 'Ancient One';
    colorCls = 'text-amber-400';
    bgCls = 'bg-amber-500/20';
    borderCls = 'border-amber-500/40';
  } else if (wordCount >= 50000) {
    rank = 'Sage';
    colorCls = 'text-emerald-400';
    bgCls = 'bg-emerald-500/20';
    borderCls = 'border-emerald-500/40';
  } else if (wordCount >= 10000) {
    rank = 'Chronicler';
    colorCls = 'text-violet-300';
    bgCls = 'bg-violet-500/20';
    borderCls = 'border-violet-500/40';
  }

  badge.className = `mythic-badge ${bgCls} ${borderCls} ${colorCls}`;
  badge.innerHTML = `<i data-lucide="sparkles" class="w-3.5 h-3.5"></i> ${rank}`;
  initIcons(badge);
}

function _renderGenrePills(genres) {
  const container = document.getElementById('profile-genres');
  if (!container) return;
  if (!genres.length) {
    container.innerHTML = '<span class="text-xs text-slate-600 italic">No genres set</span>';
    return;
  }
  container.innerHTML = genres
    .map(
      (g) => `
    <span class="genre-pill">${g}</span>
  `
    )
    .join('');
}

function _setSocialLink(id, href) {
  const el = document.getElementById(id);
  if (!el) return;
  if (href) {
    el.href = href;
    el.closest('[data-social-wrap]')?.classList.remove('hidden');
  } else {
    el.closest('[data-social-wrap]')?.classList.add('hidden');
  }
}

/* ─────────────────────────────────────────────
   Stats Rendering
   ───────────────────────────────────────────── */

/**
 * Updates the chronicle stats panel with computed values.
 *
 * @param {{ wordsWritten: number, readers: number, readingTime: number, streak: number }} stats
 */
export function updateStatsUI(stats) {
  setText('stat-words-written', formatNumber(stats.wordsWritten ?? 0));
  setText('stat-total-readers', formatNumber(stats.readers ?? 0));
  setText('stat-reading-time-given', `${Math.round((stats.readingTime ?? 0) / 60)}h`);
  setText('stat-streak', String(stats.streak ?? 0));
}

/* ─────────────────────────────────────────────
   Toast Notifications
   ───────────────────────────────────────────── */

/**
 * Shows a toast notification.
 *
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
export function showNotification(message, type = 'success') {
  showToast(message, type);
}

/* ─────────────────────────────────────────────
   Continue Reading Cards
   ───────────────────────────────────────────── */

/**
 * Renders the continue reading horizontal scroll section.
 *
 * @param {Array<Object>} tales
 */
export function renderContinueReading(tales) {
  const container = document.getElementById('continue-reading-list');
  if (!container) return;

  if (!tales.length) {
    container.innerHTML = `
      <div class="flex items-center gap-3 py-8 px-4 text-sm text-slate-600 italic">
        No tales in progress.
        <a href="library.html" class="text-indigo-400 hover:text-indigo-300 font-semibold not-italic ml-1">Browse Library →</a>
      </div>
    `;
    return;
  }

  container.innerHTML = tales.map(_buildContinueReadingCard).join('');
  initIcons();
}

function _buildContinueReadingCard(tale) {
  const safeTitle = escapeHtml(tale.title || 'Untitled Tale');
  const safeDescription = escapeHtml(tale.description || '');

  const cover =
    tale.coverUrl ||
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=400';

  return `
    <a
      href="reader.html?taleId=${tale.id}&chapterId=${tale.lastChapterIndex}"
      class="continue-card group snap-start shrink-0"
    >
      <div class="card-image-wrap mb-4">
        <img
          src="${cover}"
          alt="${safeTitle}"
          class="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-all duration-700"
          loading="lazy"
        />
        <div class="card-overlay"></div>
        <div class="absolute bottom-4 left-4">
          <span class="px-2.5 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-[9px] font-black text-white/90 uppercase tracking-widest">
            ${escapeHtml(tale.era || 'Mythic Era')}
          </span>
        </div>
      </div>

      <div class="px-1">
        <h3 class="text-base font-bold text-white group-hover:text-indigo-400 transition-colors truncate">
          ${safeTitle}
        </h3>
        <p class="text-xs text-slate-500 line-clamp-2 leading-relaxed mt-1 font-medium">
          ${safeDescription}
        </p>

        <div class="mt-4 space-y-2">
          <div class="flex items-center justify-between text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">
            <span>Progress</span>
            <span class="text-indigo-500">${tale.percent}%</span>
          </div>
          <div class="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              class="h-full bg-linear-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-1000"
              style="width: ${Math.max(3, tale.percent)}%"
            ></div>
          </div>
        </div>
      </div>
    </a>
  `;
}

/* ─────────────────────────────────────────────
   Contributions + Drafts
   ───────────────────────────────────────────── */

/**
 * Renders published tales into #contributions-grid (before the New Tale button).
 *
 * @param {Array<Object>} tales
 */
export function renderPublishedTales(tales) {
  const container = document.getElementById('contributions-grid');
  if (!container) return;

  // Remove any previously injected cards (not the New Tale button)
  container.querySelectorAll('.contribution-card').forEach((el) => el.remove());

  if (!tales.length) return;

  const cards = tales.map(_buildPublishedCard).join('');
  container.insertAdjacentHTML('afterbegin', cards);
  initIcons();
}

function _buildPublishedCard(tale) {
  const safeTitle = escapeHtml(tale.title || 'Untitled Tale');
  const safeDescription = escapeHtml(tale.description || '');

  const cover =
    tale.coverUrl ||
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=400';

  return `
    <a href="tale.html?id=${tale.id}" class="contribution-card group block bg-white/1 border border-white/5 rounded-4xl overflow-hidden hover:bg-white/3 hover:border-white/10 hover:-translate-y-1.5 transition-all duration-500">
      <div class="relative aspect-video bg-zinc-950 overflow-hidden">
        <img src="${cover}" alt="${safeTitle}"
          class="w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-105 transition-all duration-700" loading="lazy" />
        <div class="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent"></div>
        <div class="absolute top-4 left-4">
          <span class="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20 backdrop-blur-md">
            Published
          </span>
        </div>
        <div class="absolute bottom-4 left-5 right-5">
          <h3 class="font-cinzel font-bold text-white text-lg leading-snug group-hover:text-indigo-300 transition-colors line-clamp-2">
            ${safeTitle}
          </h3>
        </div>
      </div>
      <div class="p-6 space-y-4">
        <p class="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium">${safeDescription}</p>
        <div class="flex items-center justify-between pt-2 border-t border-white/5">
          <div class="flex items-center gap-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            <span class="flex items-center gap-1.5">
              <i data-lucide="layers" class="w-3.5 h-3.5 text-slate-700"></i>
              ${tale.chapterCount || 0}
            </span>
            ${tale.readCount ? `<span class="flex items-center gap-1.5"><i data-lucide="eye" class="w-3.5 h-3.5 text-slate-700"></i>${formatNumber(tale.readCount)}</span>` : ''}
          </div>
          <i data-lucide="arrow-right" class="w-4 h-4 text-indigo-500 group-hover:translate-x-1.5 transition-transform"></i>
        </div>
      </div>
    </a>
  `;
}

/**
 * Renders draft tiles into #drafts-grid.
 *
 * @param {Array<Object>} drafts
 */
export function renderDrafts(drafts) {
  const container = document.getElementById('drafts-grid');
  if (!container) return;

  if (!drafts.length) {
    container.innerHTML = `
      <div class="col-span-full text-sm text-slate-600 italic py-8 font-medium">No drafts awaiting preservation.</div>
    `;
    return;
  }

  container.innerHTML = drafts.map(_buildDraftCard).join('');
  initIcons();
}

function _buildDraftCard(draft) {
  const safeTitle = escapeHtml(draft.title || 'Untitled Draft');
  const safeSynopsis = escapeHtml(draft.synopsis || 'No synopsis recorded yet.');

  const updated = draft.updatedAt?.seconds
    ? timeAgo(new Date(draft.updatedAt.seconds * 1000))
    : 'Recently';

  return `
    <a
      href="contribution.html?draft=${draft.id}"
      class="group block bg-white/2 border border-white/5 rounded-[1.75rem] p-6 hover:bg-white/4 hover:border-indigo-500/20 transition-all duration-400"
    >
      <div class="flex items-start justify-between gap-3 mb-4">
        <span class="px-2.5 py-1 bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase tracking-widest rounded-full border border-amber-500/10">
          Draft
        </span>
        <span class="text-[10px] font-bold text-slate-600 uppercase tracking-wider">${updated}</span>
      </div>
      <h3 class="font-cinzel font-bold text-white text-base group-hover:text-indigo-400 transition-colors truncate mb-2">
        ${safeTitle}
      </h3>
      <p class="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-6 font-medium">
        ${safeSynopsis}
      </p>
      <div class="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-600">
        <span class="flex items-center gap-2">
          <i data-lucide="book-type" class="w-3.5 h-3.5"></i>
          ${draft.chapterCount || 0} Chapters
        </span>
        <span class="flex items-center gap-2 text-indigo-500 group-hover:gap-3 transition-all">
          Resume <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
        </span>
      </div>
    </a>
  `;
}

/* ─────────────────────────────────────────────
   Contribution / Draft Tab Switcher
   ───────────────────────────────────────────── */

/**
 * Switches the contributions section between Published and Drafts tabs.
 *
 * @param {'published'|'drafts'} tab
 */
export function switchContribTab(tab) {
  ['published', 'drafts'].forEach((t) => {
    const panel = document.getElementById(`contrib-panel-${t}`);
    if (panel) panel.hidden = t !== tab;

    const btn = document.querySelector(`[data-contrib-tab="${t}"]`);
    if (btn) {
      btn.classList.toggle('contrib-tab--active', t === tab);
      btn.classList.toggle('contrib-tab--inactive', t !== tab);
    }
  });
}

/* ─────────────────────────────────────────────
   Skeleton Loaders
   ───────────────────────────────────────────── */

export function showContinueReadingSkeleton() {
  const container = document.getElementById('continue-reading-list');
  if (!container) return;
  container.innerHTML = Array.from(
    { length: 3 },
    () => `
    <div class="shrink-0 w-80 rounded-4xl overflow-hidden">
      <div class="aspect-video skeleton rounded-2xl mb-4"></div>
      <div class="space-y-3 px-1">
        <div class="skeleton h-5 w-3/4 rounded-lg"></div>
        <div class="skeleton h-3.5 w-full rounded-md"></div>
        <div class="skeleton h-3.5 w-2/3 rounded-md"></div>
      </div>
    </div>
  `
  ).join('');
}

export function showContributionsSkeleton() {
  const container = document.getElementById('contributions-grid');
  if (!container) return;
  const newBtn = document.getElementById('btn-new-story');
  container.querySelectorAll('.skeleton-card').forEach((el) => el.remove());
  const skeletons = Array.from(
    { length: 2 },
    () => `
    <div class="skeleton-card rounded-4xl overflow-hidden hidden">
      <div class="aspect-video skeleton"></div>
      <div class="p-6 space-y-3">
        <div class="skeleton h-5 w-2/3 rounded-lg"></div>
        <div class="skeleton h-3.5 w-full rounded-md"></div>
      </div>
    </div>
  `
  ).join('');
  if (newBtn) {
    newBtn.insertAdjacentHTML('beforebegin', skeletons);
  } else {
    container.insertAdjacentHTML('afterbegin', skeletons);
  }
}
