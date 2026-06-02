// src/pages/home/home.js
// Home page entry point.
// Loads trending tales from Firestore and handles page interactions.

import '@css/base.css';
import '@css/nav.css';
import '@css/components.css';
import '@css/pages/home.css';

import { initNav } from '@ui/components/nav/nav.js';
import { navigateTo, initPageReveal, readyReveal, escapeText } from '@/utils';
import { initIcons } from '@ui/components/icons.js';
import { getTales } from '@services/index.js';
import { DEFAULT_COVER_URL } from '@config/app.config.js';

initPageReveal();
initNav();

document.addEventListener('DOMContentLoaded', () => {
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

  // Search button
  document.getElementById('home-search-btn')?.addEventListener('click', _performSearch);

  // Enter key inside search input
  document.getElementById('home-search-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') _performSearch();
  });
}

/**
 * Reads the home search input and redirects to library with the search param.
 */
function _performSearch() {
  const term = document.getElementById('home-search-input')?.value.trim();
  if (!term) return;
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
      _hideTrendingSection();
      return;
    }

    container.innerHTML = tales.map(_renderTrendingCard).join('');
    initIcons();
  } catch (err) {
    console.error('[home] Failed to load trending tales:', err);
    _hideTrendingSection();
  }
}

function _showSkeletons(container) {
  container.innerHTML = Array.from(
    { length: 3 },
    () => `
    <div class="glass-card rounded-[2.5rem] bg-indigo-600/5 p-5 border border-white/[0.03]">
      <div class="aspect-[4/3] rounded-[2rem] skeleton mb-6"></div>
      <div class="space-y-4 px-1">
        <div class="flex gap-3">
          <div class="skeleton h-4 w-20 rounded-md"></div>
          <div class="skeleton h-4 w-24 rounded-md"></div>
        </div>
        <div class="skeleton h-7 w-3/4 rounded-lg"></div>
        <div class="space-y-2">
          <div class="skeleton h-3.5 w-full rounded-md"></div>
          <div class="skeleton h-3.5 w-5/6 rounded-md"></div>
        </div>
        <div class="flex items-center justify-between pt-4 border-t border-white/5 mt-2">
          <div class="skeleton h-4 w-28 rounded-md"></div>
          <div class="skeleton h-4 w-12 rounded-md"></div>
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

  const safeTitle = escapeText(tale.title || 'Untitled Tale');
  const safeDescription = escapeText(tale.description || 'A mysterious tale waiting to be uncovered...');
  const safeEra = escapeText(tale.era || 'Unknown Era');
  const safeAuthor = escapeText(tale.authorName || 'Unknown Scribe');

  return `
    <a
      href="tale.html?id=${tale.id}"
      class="glass-card rounded-[2.5rem] bg-indigo-600/10 p-5 group hover:border-indigo-500/50 transition-all duration-500 block"
    >
      <div class="aspect-[4/3] rounded-[2rem] overflow-hidden mb-6 border border-zinc-800">
        <img
          src="${cover}"
          alt="${safeTitle}"
          class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          loading="lazy"
        />
      </div>

      <div class="flex items-center gap-2 mb-3">
        <span class="bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md">
          ${safeEra}
        </span>
        <span class="text-zinc-600 text-[10px] font-bold">
          ${count} ${count === 1 ? 'Fragment' : 'Fragments'}
        </span>
      </div>

      <h3 class="text-2xl font-extrabold text-white mb-3 group-hover:text-indigo-400 transition-colors truncate">
        ${safeTitle}
      </h3>

      <p class="text-slate-500 text-sm leading-relaxed mb-6 line-clamp-3">
        ${safeDescription}
      </p>

      <div class="flex items-center justify-between pt-4 border-t border-zinc-800/50">
        <span class="text-zinc-500 text-xs font-bold">
          ${safeAuthor}
        </span>
        <span class="flex items-center gap-1 text-indigo-400 text-xs font-bold group-hover:gap-2 transition-all">
          Read
          <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
        </span>
      </div>
    </a>
  `;
}
