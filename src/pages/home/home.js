// src/pages/home/home.js
// Home page entry point.
// Loads trending tales from Firestore and handles page interactions.

import '@css/base.css';
import '@css/nav.css';
import '@css/components.css';
import '@css/pages/home.css';

import { initNav } from '@ui/components/nav/nav.js';
import {
  navigateTo,
  initPageReveal,
  readyReveal,
  escapeHtml as escapeHtml,
  taleUrl,
  createLogger,
} from '@/utils';
import { initIcons } from '@ui/icons.js';
import { showToast } from '@ui/components/toast.js';
import { getTales } from '@services/index.js';
import { cacheService } from '@services/cache.service.js';
import { DEFAULT_COVER_URL } from '@config/app.config.js';
import { initReliquary } from './reliquary.js';
import { initFooterTheme } from '@ui/components/footerTheme.js';

const log = createLogger('Home');

initPageReveal();
initNav();

let _resizeBound = false;
let _cachedTrendingTales = [];

export function initHomePage() {
  init();
}

function init() {
  log.info('Home page initialized');
  initIcons();
  initReliquary('archive-reliquary-container');
  initFooterTheme('#footer-theme-control');
  _initInteractions();
  _loadTrendingTales();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/* ─────────────────────────────────────────────
   Interactions
   ───────────────────────────────────────────── */

function _initInteractions() {
  // Hero CTA navigates to the contribution editor
  document.getElementById('home-start-writing-btn')?.addEventListener('click', () => {
    navigateTo('contribution.html');
  });

  // Newsletter form — handles Reading Circle dispatches subscription
  const newsletterForm = document.getElementById('newsletter-form');
  newsletterForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('newsletter-email');
    const email = emailInput?.value?.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Please enter a valid email address for dispatches.', 'warning');
      return;
    }

    try {
      const existing = JSON.parse(localStorage.getItem('tt_newsletter_subscribers') || '[]');
      if (!existing.includes(email)) {
        existing.push(email);
        localStorage.setItem('tt_newsletter_subscribers', JSON.stringify(existing));
      }
    } catch {
      // Ignore localStorage access failures
    }

    showToast('Welcome to the Reading Circle. Dispatches shall be delivered.', 'success');
    if (emailInput) emailInput.value = '';
  });

  // Search.
  //
  // The search control is a real <form> now, so one submit handler covers
  // the button, the Enter key and the virtual keyboard's "go" action. The
  // previous version wired a click listener and a keydown listener
  // separately, which meant Enter worked but the on-screen keyboard's
  // search key on mobile did nothing at all.
  document.getElementById('home-search-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    _performSearch();
  });

  const searchInput = document.getElementById('home-search-input');
  const suggestionsBox = document.getElementById('home-search-suggestions');
  if (searchInput && suggestionsBox) {
    let debounceTimer = null;
    searchInput.addEventListener('input', () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const val = searchInput.value.trim().toLowerCase();
        if (val.length < 2) {
          suggestionsBox.classList.add('hidden');
          suggestionsBox.innerHTML = '';
          return;
        }

        const matches = _cachedTrendingTales
          .filter((t) => {
            const str = [t.title, t.description, t.era, t.authorName]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();
            return str.includes(val);
          })
          .slice(0, 3);

        if (!matches.length) {
          suggestionsBox.classList.add('hidden');
          suggestionsBox.innerHTML = '';
          return;
        }

        suggestionsBox.innerHTML = matches
          .map(
            (m) => `
            <a href="/reader.html?id=${encodeURIComponent(m.id)}" class="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors group">
              <div class="min-w-0 pr-2">
                <p class="text-xs font-cinzel font-bold text-white group-hover:text-indigo-400 transition-colors truncate">${escapeHtml(m.title || 'Untitled')}</p>
                <p class="text-[10px] text-slate-400 truncate">${escapeHtml(m.era || 'Mythic')} · ${escapeHtml(m.authorName || 'Ancient Chronicler')}</p>
              </div>
              <i data-lucide="arrow-right" class="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors shrink-0"></i>
            </a>
          `
          )
          .join('');
        suggestionsBox.classList.remove('hidden');
        initIcons(suggestionsBox);
      }, 150);
    });

    document.addEventListener('click', (e) => {
      if (
        !e.target?.closest?.('#home-search-form') &&
        !e.target?.closest?.('#home-search-suggestions')
      ) {
        suggestionsBox.classList.add('hidden');
      }
    });
  }

  // Preserve clean viewport positioning when resizing across responsive breakpoints
  if (!_resizeBound) {
    _resizeBound = true;
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const main = document.getElementById('main-content');
        if (main && main.scrollTop < 60) {
          main.scrollTop = 0;
        }
      }, 100);
    });
  }
}

/**
 * Reads the home search input and redirects to library with the search param.
 */
function _performSearch() {
  const term = document.getElementById('home-search-input')?.value.trim();
  if (!term) return;
  log.info('Performing search:', term);
  navigateTo(`library.html?search=${encodeURIComponent(term)}`);
}

/* ─────────────────────────────────────────────
   Trending Tales
   ───────────────────────────────────────────── */

/**
 * Fetches the 3 most recently published tales and renders them in the trending grid.
 * Falls back to hiding the section entirely if no tales exist.
 */
async function _loadTrendingTales() {
  const container = document.getElementById('trending-grid');
  if (!container) return;

  container.classList.add('fade-in-stagger');
  _showSkeletons(container);

  try {
    let currentTales = [];
    const tales = await getTales({
      status: 'published',
      count: 3,
      onBackgroundUpdate: (freshTales) => {
        log.info('Background update for trending tales received', { count: freshTales.length });
        cacheService.reconcileOrReload({
          cached: currentTales,
          fresh: freshTales,
          updateDiv: (freshTale, id) => {
            log.info('Updating specific trending tale card div', { id });
            const cardEl = container.querySelector(`[data-tale-id="${id}"]`);
            if (cardEl) {
              const temp = document.createElement('div');
              temp.innerHTML = _renderTrendingCard(freshTale);
              const newCard = temp.firstElementChild;
              if (newCard) {
                cardEl.replaceWith(newCard);
                initIcons();
              }
            }
          },
          onReload: () => {
            log.info('Changes too many in trending tales — re-rendering section');
            currentTales = freshTales;
            container.innerHTML = freshTales.map(_renderTrendingCard).join('');
            initReliquary('archive-reliquary-container', freshTales);
            initIcons();
          },
        });
      },
    });

    currentTales = tales;
    _cachedTrendingTales = tales;

    if (!tales.length) {
      log.info('No trending tales found — hiding section');
      _hideTrendingSection();
      return;
    }

    log.info(`Loaded ${tales.length} trending tales`);
    container.innerHTML = tales.map(_renderTrendingCard).join('');
    initReliquary('archive-reliquary-container', tales);
    initIcons();
  } catch (err) {
    log.error('Failed to load trending tales:', err);
    _hideTrendingSection();
  } finally {
    readyReveal();
  }
}

function _showSkeletons(container) {
  container.innerHTML = Array.from(
    { length: 3 },
    () => `
    <div class="home-tale-card home-tale-card--skeleton">
      <div class="home-tale-card__media skeleton"></div>
      <div class="home-tale-card__body">
        <div class="flex gap-2 mb-2">
          <div class="skeleton h-3 w-16 rounded"></div>
          <div class="skeleton h-3 w-20 rounded"></div>
        </div>
        <div class="skeleton h-4 w-3/4 rounded mb-2"></div>
        <div class="skeleton h-3 w-full rounded mb-1"></div>
        <div class="skeleton h-3 w-4/5 rounded mb-3"></div>
        <div class="flex items-center justify-between pt-2 border-t border-white/5">
          <div class="skeleton h-3 w-20 rounded"></div>
          <div class="skeleton h-3 w-8 rounded"></div>
        </div>
      </div>
    </div>
  `
  ).join('');
}

function _hideTrendingSection() {
  document.getElementById('trending-section')?.classList.add('hidden');
}

/**
 * Maps an era string to a mythic chromatic modifier class.
 *
 * @param {string} era
 * @returns {string}
 */
function _getEraBadgeClass(era) {
  const normalized = (era || '').toLowerCase();
  if (
    normalized.includes('ancient') ||
    normalized.includes('bronze') ||
    normalized.includes('gold')
  ) {
    return 'home-tale-card__era--gold';
  }
  if (
    normalized.includes('mythic') ||
    normalized.includes('celtic') ||
    normalized.includes('sage') ||
    normalized.includes('forest')
  ) {
    return 'home-tale-card__era--sage';
  }
  if (
    normalized.includes('classic') ||
    normalized.includes('lapis') ||
    normalized.includes('imperial') ||
    normalized.includes('iron')
  ) {
    return 'home-tale-card__era--lapis';
  }
  if (
    normalized.includes('oral') ||
    normalized.includes('folk') ||
    normalized.includes('terracotta') ||
    normalized.includes('flame')
  ) {
    return 'home-tale-card__era--terracotta';
  }
  if (
    normalized.includes('primordial') ||
    normalized.includes('frost') ||
    normalized.includes('ice') ||
    normalized.includes('glacial')
  ) {
    return 'home-tale-card__era--cyan';
  }
  const variants = [
    'home-tale-card__era--gold',
    'home-tale-card__era--sage',
    'home-tale-card__era--lapis',
    'home-tale-card__era--cyan',
    'home-tale-card__era--violet',
    'home-tale-card__era--terracotta',
  ];
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash + normalized.charCodeAt(i)) % variants.length;
  }
  return variants[hash] || 'home-tale-card__era--lapis';
}

/**
 * Renders a single trending tale card.
 *
 * @param {import('@state/schemas/tale.schema.js').Tale} tale
 * @returns {string}
 */
function _renderTrendingCard(tale) {
  const cover = tale.coverUrl || DEFAULT_COVER_URL;
  const count = tale.chapterCount || 0;

  const safeTitle = escapeHtml(tale.title || 'Untitled Tale');
  const safeDescription = escapeHtml(
    tale.description || 'A mysterious tale waiting to be uncovered...'
  );
  const safeEra = escapeHtml(tale.era || 'Unknown Era');
  const safeAuthor = escapeHtml(tale.authorName || 'Unknown Scribe');
  const eraClass = _getEraBadgeClass(tale.era);

  return `
    <a
      href="${taleUrl(tale.id)}"
      class="home-tale-card group"
      data-tale-id="${escapeHtml(tale.id)}"
    >
      <div class="home-tale-card__media">
        <img
          src="${cover}"
          alt="${safeTitle}"
          class="home-tale-card__img"
          loading="lazy"
          onerror="this.onerror=null;this.src='${DEFAULT_COVER_URL}';"
        />
      </div>

      <div class="home-tale-card__meta">
        <span class="home-tale-card__era ${eraClass}">
          ${safeEra}
        </span>
        <span class="home-tale-card__count">
          ${count} ${count === 1 ? 'Fragment' : 'Fragments'}
        </span>
      </div>

      <h3 class="home-tale-card__title">
        ${safeTitle}
      </h3>

      <p class="home-tale-card__desc">
        ${safeDescription}
      </p>

      <div class="home-tale-card__footer">
        <span class="home-tale-card__author">
          ${safeAuthor}
        </span>
        <span class="home-tale-card__link">
          Read
          <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
        </span>
      </div>
    </a>
  `;
}
