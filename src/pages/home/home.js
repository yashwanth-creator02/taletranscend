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
  createLogger,
} from '@/utils';
import { initIcons } from '@ui/components/icons.js';
import { getTales } from '@services/index.js';
import { DEFAULT_COVER_URL } from '@config/app.config.js';

const log = createLogger('Home');

initPageReveal();
initNav();

document.addEventListener('DOMContentLoaded', () => {
  log.info('Home page initialized');
  initIcons();
  _initInteractions();
  readyReveal();
  _loadTrendingTales();
});

/* ─────────────────────────────────────────────
   Interactions
   ───────────────────────────────────────────── */

function _initInteractions() {
  // Hero CTA navigates to the contribution editor
  document.getElementById('home-start-writing-btn')?.addEventListener('click', () => {
    navigateTo('contribution.html');
  });

  // Newsletter form — placeholder, no backend yet
  document.getElementById('newsletter-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
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
    const tales = await getTales({ status: 'published', count: 3 });

    if (!tales.length) {
      log.info('No trending tales found');
      _hideTrendingSection();
      return;
    }

    log.info(`Loaded ${tales.length} trending tales`);
    container.innerHTML = tales.map(_renderTrendingCard).join('');
    initIcons();
  } catch (err) {
    log.error('Failed to load trending tales:', err);
    _hideTrendingSection();
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

  return `
    <a
      href="tale.html?id=${tale.id}"
      class="home-tale-card group"
    >
      <div class="home-tale-card__media">
        <img
          src="${cover}"
          alt="${safeTitle}"
          class="home-tale-card__img"
          loading="lazy"
        />
      </div>

      <div class="home-tale-card__meta">
        <span class="home-tale-card__era">
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
