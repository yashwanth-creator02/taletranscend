// src/pages/profile/profile.js
// Entry point for the profile page.
// Handles auth, profile sync, continue reading, and published tales.

import '@css/base.css';
import '@css/components.css';
import '@css/pages/profile.css';

import { initNav } from '@ui/components/nav.js';
import { initAuth } from '@fb/index.js';
import { initProfileUI, saveProfile, startProfileSync } from './index.js';
import { initIcons } from '@ui/components/icons.js';
import { getContinueReading, getUserPublishedTales } from '@services/index.js';

// Inject shared nav
initNav();

/* ==================== Auth & Data ==================== */

const authTimeout = setTimeout(() => {
  renderContinueReadingEmpty('Connection timed out. Please refresh.');
}, 10000);

initAuth(async (user) => {
  clearTimeout(authTimeout);
  const userId = user.uid;

  // Sync profile data in real time
  startProfileSync(userId);

  // Load continue reading and published tales in parallel
  const [continueReading, publishedTales] = await Promise.all([
    getContinueReading(userId),
    getUserPublishedTales(userId),
  ]);

  renderContinueReading(continueReading);
  renderPublishedTales(publishedTales);
});

/* ==================== UI Initialization ==================== */

document.addEventListener('DOMContentLoaded', () => {
  initProfileUI();
  initIcons();

  // Wire save profile via event listener instead of window assignment
  document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveProfile();
  });

  // New story button navigates to contribution page
  document.getElementById('btn-new-story')?.addEventListener('click', () => {
    window.location.href = 'contribution.html';
  });
});

/* ==================== Continue Reading ==================== */

/**
 * Renders the continue reading section with real tale data.
 *
 * @param {Array<Object>} tales - Array of in-progress tale objects
 */
function renderContinueReading(tales) {
  const container = document.getElementById('continue-reading-list');
  if (!container) return;

  if (!tales.length) {
    renderContinueReadingEmpty('No tales in progress. Head to the library to start reading.');
    return;
  }

  container.innerHTML = tales.map(renderContinueReadingCard).join('');
  if (window.lucide) window.lucide.createIcons();
}

/**
 * Renders a single continue reading card.
 *
 * @param {Object} tale - Tale object with progress data
 * @returns {string} HTML string for the card
 */
function renderContinueReadingCard(tale) {
  const cover =
    tale.coverUrl ||
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=400';

  return `
    <a href="reader.html?taleId=${tale.id}&chapterId=${tale.lastChapterIndex}"
      class="snap-start flex-shrink-0 w-80 glass-card p-5 rounded-[2rem] group hover:-translate-y-2 transition-all duration-500 block">
      <div class="aspect-[16/10] bg-zinc-800 rounded-2xl mb-5 overflow-hidden relative">
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
        <img src="${cover}"
          class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          alt="${tale.title}" />
        <div class="absolute bottom-3 left-3 z-20 flex gap-2">
          <span class="px-2 py-1 bg-black/50 backdrop-blur-md rounded-md text-[9px] font-bold text-white uppercase">
            ${tale.era || 'Unknown Era'}
          </span>
        </div>
      </div>
      <h3 class="text-xl font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors truncate">
        ${tale.title || 'Untitled Tale'}
      </h3>
      <p class="text-sm text-slate-500 line-clamp-2 mb-6 leading-relaxed">
        ${tale.description || ''}
      </p>
      <div class="space-y-3">
        <div class="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-tighter">
          <span>Progress</span>
          <span>${tale.percent}%</span>
        </div>
        <div class="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-indigo-600 to-purple-500 rounded-full"
            style="width: ${tale.percent}%"></div>
        </div>
      </div>
    </a>
  `;
}

/**
 * Renders an empty state message in the continue reading section.
 *
 * @param {string} message - Message to display
 */
function renderContinueReadingEmpty(message) {
  const container = document.getElementById('continue-reading-list');
  if (!container) return;

  container.innerHTML = `
    <div class="text-sm text-slate-500 italic py-4">
      ${message}
      <a href="library.html" class="text-indigo-400 hover:text-indigo-300 ml-2 font-bold">Browse Library</a>
    </div>
  `;
}

/* ==================== Published Tales ==================== */

/**
 * Renders the user's published tales in the contributions section.
 * Appends cards before the existing New Tale button.
 *
 * @param {Array<Object>} tales - Array of published tale objects
 */
function renderPublishedTales(tales) {
  const container = document.getElementById('contributions-grid');
  if (!container) return;

  if (!tales.length) return;

  const cards = tales.map(renderPublishedTaleCard).join('');

  // Insert published tales before the New Tale button
  container.insertAdjacentHTML('afterbegin', cards);
  if (window.lucide) window.lucide.createIcons();
}

/**
 * Renders a single published tale card.
 *
 * @param {Object} tale - Published tale object
 * @returns {string} HTML string for the card
 */
function renderPublishedTaleCard(tale) {
  const cover =
    tale.coverUrl ||
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=400';

  return `
    <a href="tale.html?id=${tale.id}"
      class="group p-0 glass-card rounded-[2rem] overflow-hidden hover:-translate-y-1 transition-all duration-500 block">
      <div class="aspect-[4/3] overflow-hidden relative">
        <img src="${cover}"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          alt="${tale.title}" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
        <div class="absolute bottom-4 left-4 right-4">
          <span class="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/20 px-2 py-1 rounded-md">
            Published
          </span>
          <h3 class="text-lg font-bold text-white uppercase tracking-tight mt-2 truncate">
            ${tale.title || 'Untitled Tale'}
          </h3>
        </div>
      </div>
      <div class="p-5">
        <div class="flex items-center justify-between text-[9px] font-bold uppercase text-zinc-500 tracking-widest">
          <span>${tale.chapterCount || 0} Chapters</span>
          <i data-lucide="arrow-right" class="w-4 h-4 group-hover:translate-x-1 transition-transform text-indigo-400"></i>
        </div>
      </div>
    </a>
  `;
}
