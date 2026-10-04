// src/pages/profile/ui.js
// Profile page UI — tabbed modal controls, all field rendering,
// genre multi-select, avatar preview, toast notifications.

import { profileState, GENRE_OPTIONS } from './state.js';
import { suggestNameFromBio } from './ai-name.js';
import { debounce } from '@/utils';
import { initIcons } from '@ui/components/icons.js';
import { showToast } from '@ui/components/toast.js';
import {
  getStoredApiKey,
  setStoredApiKey,
  clearStoredApiKey,
} from '@/services/ai/apiKey.storage.js';
import {
  setText,
  setInput,
  formatNumber,
  formatJoinDate,
  timeAgo,
  escapeHtml as escapeHtml,
  taleUrl,
  readerUrl,
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
 * - Gemini API key input
 * - Backdrop click to close
 */
export function initProfileUI() {
  _bindModalTriggers();
  _bindTabSwitching();
  _buildGenreSelector();
  _bindAvatarPreview();
  _bindAiNameButton();
  _bindApiKeyInput();
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
  window.requestAnimationFrame(() => {
    document.getElementById('input-name')?.focus();
  });
}

export function closeModal() {
  const modal = document.getElementById('edit-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  document.body.style.overflow = '';
  const trigger =
    document.getElementById('btn-edit-desktop') || document.getElementById('btn-edit-mobile');
  trigger?.focus?.();
}

function _bindBackdropClose() {
  document.getElementById('edit-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget || e.target.classList?.contains('modal-backdrop')) {
      closeModal();
    }
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
   AI Name Suggestion & Gemini Key
   ───────────────────────────────────────────── */

function _bindAiNameButton() {
  const btn = document.getElementById('btn-suggest-name');
  const nameInput = document.getElementById('input-name');
  const bioInput = document.getElementById('input-bio');
  const keyInput = document.getElementById('input-gemini-key');
  if (!btn || !nameInput || !bioInput) return;

  btn.addEventListener('click', async () => {
    const bio = bioInput.value.trim();
    if (!bio || bio.length < 5) {
      showToast('Write a short bio first (at least 5 characters) to summon a name.', 'info');
      bioInput.focus();
      return;
    }

    const apiKey =
      keyInput?.value?.trim() ||
      getStoredApiKey() ||
      (typeof window !== 'undefined' ? window.__GEMINI_KEY__ : null);

    if (!apiKey) {
      showToast('Please enter your Gemini API key below to summon name suggestions.', 'info');
      if (keyInput) {
        keyInput.focus();
        keyInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        keyInput.classList.add('ring-2', 'ring-amber-500/50');
        setTimeout(() => keyInput.classList.remove('ring-2', 'ring-amber-500/50'), 2500);
      }
      return;
    }

    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Conjuring…';

    try {
      const suggested = await suggestNameFromBio(bio, apiKey);

      if (suggested) {
        nameInput.value = suggested;
        if (keyInput?.value?.trim()) {
          setStoredApiKey(keyInput.value.trim());
        }
        showToast(`Suggested: "${suggested}"`, 'success');
      } else {
        showToast('Could not summon a name. Verify your Gemini API key and try again.', 'error');
      }
    } catch {
      showToast('Failed to summon name. Please check your connection and API key.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}

function _bindApiKeyInput() {
  const keyInput = document.getElementById('input-gemini-key');
  const toggleBtn = document.getElementById('btn-toggle-gemini-key');
  if (!keyInput) return;

  const storedKey = getStoredApiKey();
  if (storedKey) {
    keyInput.value = storedKey;
  }

  const saveBtn = document.getElementById('btn-save-gemini-key');

  const saveKey = () => {
    const val = keyInput.value.trim();
    if (val) {
      setStoredApiKey(val);
      showToast('Gemini API key saved.', 'success');
    } else {
      clearStoredApiKey();
      showToast('Gemini API key cleared.', 'info');
    }
  };

  keyInput.addEventListener('change', saveKey);

  if (saveBtn) {
    saveBtn.addEventListener('click', saveKey);
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isPassword = keyInput.type === 'password';
      keyInput.type = isPassword ? 'text' : 'password';
      toggleBtn.textContent = isPassword ? 'Hide' : 'Show';
    });
  }
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

  const keyInput = document.getElementById('input-gemini-key');
  if (keyInput && !keyInput.value) {
    keyInput.value = getStoredApiKey() || '';
  }

  // Sync genre chips
  if (data.favouriteGenres) {
    profileState.favouriteGenres = [...data.favouriteGenres];
    syncGenreChips();
  }
}

function _renderRank(wordCount) {
  const badges = document.querySelectorAll('.mythic-badge');
  if (!badges.length) return;

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

  badges.forEach((badge) => {
    badge.className = `mythic-badge ${bgCls} ${borderCls} ${colorCls}`;
    badge.innerHTML = `<i data-lucide="sparkles" class="w-3.5 h-3.5"></i> ${rank}`;
    initIcons(badge);
  });
}

function _renderGenrePills(genres) {
  const container = document.getElementById('profile-genres');
  if (!container) return;
  if (!genres.length) {
    container.innerHTML = '<span class="text-xs text-slate-400 italic">No genres set</span>';
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
  const words = typeof stats === 'number' ? stats : (stats?.wordsWritten ?? 0);
  const readers = typeof stats === 'object' ? (stats?.readers ?? 0) : 0;
  const readingTime = typeof stats === 'object' ? (stats?.readingTime ?? 0) : 0;
  const streak = typeof stats === 'object' ? (stats?.streak ?? 0) : 0;

  setText('stat-words-written', formatNumber(words));
  setText('stat-total-readers', formatNumber(readers));
  setText('stat-reading-time-given', `${Math.round(readingTime / 60)}h`);
  setText('stat-streak', String(streak));
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

  if (!tales || !tales.length) {
    container.innerHTML = `
      <div class="flex items-center gap-3 py-6 px-4 text-xs sm:text-sm text-slate-400 italic bg-white/1 rounded-2xl border border-white/5 w-full">
        <i data-lucide="book-open-check" class="w-4 h-4 text-slate-500 not-italic shrink-0"></i>
        <span>No tales in progress.</span>
        <a href="/library.html" class="text-indigo-400 hover:text-indigo-300 font-semibold not-italic ml-1">Browse Library →</a>
      </div>
    `;
    initIcons(container);
    return;
  }

  container.innerHTML = tales.map(_buildContinueReadingCard).join('');
  initIcons(container);
}

function _buildContinueReadingCard(tale) {
  const safeTitle = escapeHtml(tale.title || 'Untitled Tale');
  const safeDescription = escapeHtml(tale.description || '');

  const cover =
    tale.coverUrl ||
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=400';

  return `
    <a
      href="${readerUrl(tale.id, tale.lastChapterIndex)}"
      class="continue-card group snap-start shrink-0 w-60 sm:w-64 bg-white/2 border border-white/5 rounded-2xl overflow-hidden hover:bg-white/4 hover:border-white/10 transition-all duration-300"
    >
      <div class="relative h-28 w-full bg-zinc-950 overflow-hidden">
        <img
          src="${cover}"
          alt="${safeTitle}"
          class="w-full h-full object-cover opacity-60 group-hover:opacity-85 group-hover:scale-105 transition-all duration-500"
          loading="lazy"
        />
        <div class="card-overlay"></div>
        <div class="absolute bottom-2.5 left-2.5">
          <span class="px-2 py-0.5 bg-black/70 backdrop-blur-md border border-white/10 rounded-md text-[8.5px] font-black text-white/90 uppercase tracking-widest">
            ${escapeHtml(tale.era || 'Mythic Era')}
          </span>
        </div>
      </div>

      <div class="p-3 sm:p-3.5 space-y-2">
        <h3 class="font-cinzel text-sm sm:text-base font-bold text-white group-hover:text-indigo-400 transition-colors truncate">
          ${safeTitle}
        </h3>
        <p class="text-xs text-slate-400 line-clamp-2 leading-relaxed font-medium">
          ${safeDescription}
        </p>

        <div class="pt-1.5 space-y-1.5 border-t border-white/5">
          <div class="flex items-center justify-between text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">
            <span>Progress</span>
            <span class="text-indigo-400">${tale.percent}%</span>
          </div>
          <div class="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              class="h-full bg-linear-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
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

  // Always remove any previously injected cards, skeletons, and empty state
  container
    .querySelectorAll('.skeleton-card, .contribution-card, .contribution-empty-state')
    .forEach((el) => el.remove());

  const newBtn = document.getElementById('btn-new-story');

  if (!tales || !tales.length) {
    const emptyHtml = `
      <div class="contribution-empty-state flex flex-col justify-center p-5 sm:p-6 rounded-2xl bg-white/2 border border-white/5 text-slate-400">
        <div class="flex items-center gap-2.5 text-white font-cinzel font-bold text-sm mb-1.5">
          <i data-lucide="scroll" class="w-4 h-4 text-indigo-400"></i>
          <span>No Published Legends Yet</span>
        </div>
        <p class="text-xs text-slate-500 leading-relaxed mb-3">
          Your chronicles have not yet been woven into the Great Library.
        </p>
        <span class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1">
          Record a new story to publish <i data-lucide="arrow-right" class="w-3 h-3"></i>
        </span>
      </div>
    `;
    if (newBtn) {
      newBtn.insertAdjacentHTML('beforebegin', emptyHtml);
    } else {
      container.insertAdjacentHTML('afterbegin', emptyHtml);
    }
    initIcons(container);
    return;
  }

  const cards = tales.map(_buildPublishedCard).join('');
  if (newBtn) {
    newBtn.insertAdjacentHTML('beforebegin', cards);
  } else {
    container.insertAdjacentHTML('afterbegin', cards);
  }
  initIcons(container);
}

function _buildPublishedCard(tale) {
  const safeTitle = escapeHtml(tale.title || 'Untitled Tale');
  const safeDescription = escapeHtml(tale.description || '');

  const cover =
    tale.coverUrl ||
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=400';

  return `
    <a href="${taleUrl(tale.id)}" class="contribution-card group block bg-white/2 border border-white/5 rounded-2xl sm:rounded-3xl overflow-hidden hover:bg-white/4 hover:border-indigo-500/30 hover:-translate-y-1 transition-all duration-300">
      <div class="relative h-28 sm:h-32 bg-zinc-950 overflow-hidden">
        <img src="${cover}" alt="${safeTitle}"
          class="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500" loading="lazy" />
        <div class="absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-transparent"></div>
        <div class="absolute top-2.5 left-2.5">
          <span class="px-2.5 py-0.5 bg-emerald-500/15 text-emerald-400 text-[8.5px] font-black uppercase tracking-widest rounded-full border border-emerald-500/25 backdrop-blur-md">
            Published
          </span>
        </div>
        <div class="absolute bottom-2.5 left-3 right-3">
          <h3 class="font-cinzel font-bold text-white text-sm sm:text-base leading-snug group-hover:text-indigo-300 transition-colors truncate">
            ${safeTitle}
          </h3>
        </div>
      </div>
      <div class="p-3.5 sm:p-4 space-y-2.5">
        <p class="text-xs text-slate-400 line-clamp-2 leading-relaxed font-medium">${safeDescription}</p>
        <div class="flex items-center justify-between pt-2 border-t border-white/5">
          <div class="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span class="flex items-center gap-1.5">
              <i data-lucide="layers" class="w-3.5 h-3.5 text-slate-400"></i>
              ${tale.chapterCount || 0} ch
            </span>
            ${tale.readCount ? `<span class="flex items-center gap-1.5"><i data-lucide="eye" class="w-3.5 h-3.5 text-slate-400"></i>${formatNumber(tale.readCount)}</span>` : ''}
          </div>
          <span class="flex items-center gap-1 text-[10px] font-bold text-indigo-400 group-hover:text-indigo-300">
            Read <i data-lucide="arrow-right" class="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform"></i>
          </span>
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

  if (!drafts || !drafts.length) {
    container.innerHTML = `
      <div class="col-span-full flex items-center gap-3 py-6 px-4 text-xs sm:text-sm text-slate-400 italic bg-white/1 rounded-2xl border border-white/5 font-medium">
        <i data-lucide="feather" class="w-4 h-4 text-slate-500 not-italic shrink-0"></i>
        <span>No drafts awaiting preservation.</span>
        <a href="/contribution.html" class="text-indigo-400 hover:text-indigo-300 font-semibold not-italic ml-1">Begin a Draft →</a>
      </div>
    `;
    initIcons(container);
    return;
  }

  container.innerHTML = drafts.map(_buildDraftCard).join('');
  initIcons(container);
}

function _buildDraftCard(draft) {
  const safeTitle = escapeHtml(draft.title || 'Untitled Draft');
  const safeSynopsis = escapeHtml(draft.synopsis || 'No synopsis recorded yet.');

  const updated = draft.updatedAt?.seconds
    ? timeAgo(new Date(draft.updatedAt.seconds * 1000))
    : 'Recently';

  return `
    <a
      href="/contribution.html?draft=${draft.id}"
      class="group block bg-white/2 border border-white/5 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 hover:bg-white/4 hover:border-amber-500/30 hover:-translate-y-1 transition-all duration-300"
    >
      <div class="flex items-center justify-between gap-2 mb-2.5">
        <span class="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[8.5px] font-black uppercase tracking-widest rounded-full border border-amber-500/20">
          Draft
        </span>
        <span class="text-[9.5px] font-medium text-slate-400 uppercase tracking-wider">${updated}</span>
      </div>
      <h3 class="font-cinzel font-bold text-white text-sm sm:text-base group-hover:text-amber-300 transition-colors truncate mb-1">
        ${safeTitle}
      </h3>
      <p class="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3 font-medium">
        ${safeSynopsis}
      </p>
      <div class="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400 pt-2 border-t border-white/5">
        <span class="flex items-center gap-1.5">
          <i data-lucide="book-type" class="w-3.5 h-3.5 text-slate-400"></i>
          ${draft.chapterCount || 0} ch
        </span>
        <span class="flex items-center gap-1 text-amber-400 group-hover:gap-1.5 transition-all">
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
    <div class="shrink-0 w-60 sm:w-64 rounded-2xl overflow-hidden bg-white/2 border border-white/5 p-3">
      <div class="h-28 skeleton rounded-xl mb-3"></div>
      <div class="space-y-2">
        <div class="skeleton h-4 w-3/4 rounded-md"></div>
        <div class="skeleton h-3 w-full rounded-md"></div>
        <div class="skeleton h-1.5 w-full rounded-full mt-2"></div>
      </div>
    </div>
  `
  ).join('');
}

export function showContributionsSkeleton() {
  const container = document.getElementById('contributions-grid');
  if (!container) return;
  const newBtn = document.getElementById('btn-new-story');
  container
    .querySelectorAll('.skeleton-card, .contribution-empty-state')
    .forEach((el) => el.remove());
  const skeletons = Array.from(
    { length: 2 },
    () => `
    <div class="skeleton-card rounded-2xl sm:rounded-3xl overflow-hidden bg-white/2 border border-white/5">
      <div class="h-28 sm:h-32 skeleton"></div>
      <div class="p-3.5 sm:p-4 space-y-2.5">
        <div class="skeleton h-4 w-2/3 rounded-md"></div>
        <div class="skeleton h-3 w-full rounded-md"></div>
        <div class="skeleton h-3 w-1/3 rounded-md"></div>
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
