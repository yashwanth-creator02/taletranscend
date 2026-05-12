// src/pages/home/home.js
// Entry point for the home page.
// Loads trending tales from Firestore and handles page interactions.

import '@css/base.css';
import '@css/components.css';
import '@css/pages/home.css';

import { initNav } from '@ui/components/nav/nav.js';
import { initIcons } from '@ui/components/icons.js';
import { db, appId, collection, getDocs, query, orderBy, limit } from '@fb/index.js';

initNav();

document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  initHomeInteractions();
  loadTrendingTales();
});

/* ==================== Interactions ==================== */

function initHomeInteractions() {
  document.getElementById('home-start-writing-btn')?.addEventListener('click', () => {
    window.location.href = 'contribution.html';
  });

  document.getElementById('newsletter-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
  });

  document.getElementById('home-search-btn')?.addEventListener('click', () => {
    const term = document.getElementById('home-search-input')?.value.trim();
    if (term) window.location.href = `library.html?search=${encodeURIComponent(term)}`;
  });

  document.getElementById('home-search-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const term = e.target.value.trim();
      if (term) window.location.href = `library.html?search=${encodeURIComponent(term)}`;
    }
  });
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
    const ref = collection(db, 'artifacts', appId, 'public', 'data', 'community_tales');

    const q = query(ref, orderBy('publishedAt', 'desc'), limit(3));
    const snap = await getDocs(q);

    if (snap.empty) {
      // Hide the whole trending section if no tales exist yet
      document.getElementById('trending-section')?.classList.add('hidden');
      return;
    }

    const tales = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    container.innerHTML = tales.map(renderTrendingCard).join('');

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    console.error('Failed to load trending tales:', err);
    document.getElementById('trending-section')?.classList.add('hidden');
  }
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
    <a href="tale.html?id=${tale.id}"
      class="glass-card rounded-[2.5rem] bg-indigo-600/10 p-5 group hover:border-indigo-500/50 transition-all duration-500 block">
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
          ${chapterCount} ${chapterCount === 1 ? 'Fragment' : 'Fragments'}
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
