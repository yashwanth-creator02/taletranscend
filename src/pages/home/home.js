// src/pages/home/home.js
// Entry point for the home page.
// Loads trending tales from Firestore and handles page interactions.

import '@css/base.css';
import '@css/components.css';
import '@css/pages/home.css';

import { initNav } from '@ui/components/nav/nav.js';
import { initIcons } from '@ui/components/icons.js';

import { getDocs, query, orderBy, limit } from 'firebase/firestore';

import { refs } from '@fb/refs.js';

initNav();

document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  initHomeInteractions();
  loadTrendingTales();
});

/* ==================== Interactions ==================== */

function initHomeInteractions() {
  // Hero CTA → contribution page
  document.getElementById('home-start-writing-btn')?.addEventListener('click', () => {
    window.location.href = 'contribution.html';
  });

  // Newsletter form (placeholder)
  document.getElementById('newsletter-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
  });

  // Search button
  document.getElementById('home-search-btn')?.addEventListener('click', () => {
    performSearch();
  });

  // Enter key inside search input
  document.getElementById('home-search-input')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      performSearch();
    }
  });
}

/**
 * Reads the home search input and redirects to library search.
 */
function performSearch() {
  const searchInput = document.getElementById('home-search-input');

  const term = searchInput?.value.trim();

  if (!term) return;

  window.location.href = `library.html?search=${encodeURIComponent(term)}`;
}

/* ==================== Trending Tales ==================== */

/**
 * Fetches the 3 most recently published tales from Firestore
 * and renders them in the trending section.
 * Falls back to hiding the section if none exist yet.
 */
async function loadTrendingTales() {
  const container = document.getElementById('trending-grid');

  if (!container) return;

  try {
    // Public tales collection reference
    const talesRef = refs.tales();

    // Query newest published tales
    const trendingQuery = query(talesRef, orderBy('publishedAt', 'desc'), limit(3));

    const snapshot = await getDocs(trendingQuery);

    // Hide the entire section if no tales exist yet
    if (snapshot.empty) {
      hideTrendingSection();
      return;
    }

    // Normalize Firestore docs
    const tales = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    // Render cards
    container.innerHTML = tales.map(renderTrendingCard).join('');

    // Refresh Lucide icons
    initIcons();
  } catch (error) {
    console.error('[home] Failed to load trending tales:', error);

    hideTrendingSection();
  }
}

/**
 * Hides the trending section entirely.
 */
function hideTrendingSection() {
  document.getElementById('trending-section')?.classList.add('hidden');
}

/**
 * Renders a single trending tale card.
 *
 * @param {Object} tale - Tale object from Firestore
 * @returns {string} HTML string for the card
 */
function renderTrendingCard(tale) {
  const cover =
    tale.coverUrl ||
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1000&auto=format&fit=crop';

  const era = tale.era || 'Unknown Era';

  const chapterCount = tale.chapterCount || 0;

  const description = tale.description || 'A mysterious tale waiting to be uncovered...';

  return `
    <a
      href="tale.html?id=${tale.id}"
      class="glass-card rounded-[2.5rem] bg-indigo-600/10 p-5 group hover:border-indigo-500/50 transition-all duration-500 block"
    >
      <div class="aspect-[4/3] rounded-[2rem] overflow-hidden mb-6 border border-zinc-800">
        <img
          src="${cover}"
          alt="${tale.title}"
          class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
      </div>

      <div class="flex items-center gap-2 mb-3">
        <span class="bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md">
          ${era}
        </span>

        <span class="text-zinc-600 text-[10px] font-bold">
          ${chapterCount}
          ${chapterCount === 1 ? 'Fragment' : 'Fragments'}
        </span>
      </div>

      <h3 class="text-2xl font-extrabold text-white mb-3 group-hover:text-indigo-400 transition-colors truncate">
        ${tale.title || 'Untitled Tale'}
      </h3>

      <p class="text-slate-500 text-sm leading-relaxed mb-6 line-clamp-3">
        ${description}
      </p>

      <div class="flex items-center justify-between pt-4 border-t border-zinc-800/50">
        <span class="text-zinc-500 text-xs font-bold">
          ${tale.authorName || 'Unknown Scribe'}
        </span>

        <span class="flex items-center gap-1 text-indigo-400 text-xs font-bold group-hover:gap-2 transition-all">
          Read
          <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
        </span>
      </div>
    </a>
  `;
}
