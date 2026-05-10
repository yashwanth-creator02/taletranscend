// src/pages/shelf/content.js
// Fetches and renders bookmarked tales and user drafts for the shelf page.

import { getBookmarks, getTales, getUserDrafts } from '@services/index.js';
import { renderCardsGrid } from '@ui/components/taleCard.js';

/* ==================== Bookmarked Tales ==================== */

/**
 * Fetches community tales filtered to only those bookmarked by the user.
 *
 * @param {string} userId - ID of the authenticated user
 * @returns {Promise<Array<Object>>} Array of bookmarked tale objects
 */
async function getBookmarkedTales(userId) {
  const [allTales, bookmarks] = await Promise.all([getTales(), getBookmarks({ userId })]);

  const bookmarkedIds = new Set(bookmarks.map((b) => b.id));
  return allTales.filter((tale) => bookmarkedIds.has(tale.id));
}

/**
 * Renders the user's bookmarked tales into the studio grid.
 *
 * @param {string} userId - ID of the authenticated user
 */
export async function renderBookmarkedCards(userId) {
  if (!userId) return;

  const grid = document.getElementById('studio-grid');
  if (grid) grid.innerHTML = loadingState();

  const tales = await getBookmarkedTales(userId);

  if (!tales.length) {
    if (grid) grid.innerHTML = emptyState('No bookmarked tales yet.');
    return;
  }

  await renderCardsGrid(userId, tales);
}

/* ==================== Draft Tales ==================== */

/**
 * Renders the user's draft tales into the studio grid.
 * Drafts are displayed as simple cards since they are not published tales.
 *
 * @param {string} userId - ID of the authenticated user
 */
export async function renderDraftCards(userId) {
  if (!userId) return;

  const grid = document.getElementById('studio-grid');
  if (grid) grid.innerHTML = loadingState();

  const drafts = await getUserDrafts(userId);

  if (!drafts.length) {
    if (grid) grid.innerHTML = emptyState('No drafts yet. Start writing in the contribution page.');
    return;
  }

  if (grid) {
    grid.innerHTML = drafts.map(renderDraftCard).join('');
  }

  if (window.lucide) window.lucide.createIcons();
}

/* ==================== Draft Card Template ==================== */

/**
 * Renders a single draft card as an HTML string.
 *
 * @param {Object} draft - Draft object from Firestore
 * @returns {string} HTML string for the draft card
 */
function renderDraftCard(draft) {
  const { id, title = 'Untitled Draft', chapters = [], updatedAt } = draft;

  const chapterCount = chapters.length;
  const wordCount = chapters.reduce((acc, ch) => {
    const words = ch.content?.trim().split(/\s+/).filter(Boolean).length || 0;
    return acc + words;
  }, 0);

  const updated = updatedAt?.seconds
    ? new Date(updatedAt.seconds * 1000).toLocaleDateString()
    : 'Unknown';

  return `
    <div class="glass-panel group relative p-5 rounded-[2.5rem] hover:border-indigo-500/40 transition-all" data-id="${id}">
      <div class="flex justify-between items-start mb-6">
        <span class="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-1 rounded-md">
          Draft
        </span>
        <span class="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
          ${updated}
        </span>
      </div>

      <h3 class="text-xl font-bold text-white uppercase tracking-wider mb-2 group-hover:text-indigo-400 transition-colors">
        ${title}
      </h3>

      <div class="grid grid-cols-2 gap-4 py-4 border-t border-white/5 mt-4">
        <div class="flex items-center gap-2">
          <i data-lucide="layers" class="w-3.5 h-3.5 text-zinc-600"></i>
          <span class="text-[9px] font-bold uppercase text-zinc-500 tracking-widest">
            ${chapterCount} Chapters
          </span>
        </div>
        <div class="flex items-center gap-2">
          <i data-lucide="file-text" class="w-3.5 h-3.5 text-zinc-600"></i>
          <span class="text-[9px] font-bold uppercase text-zinc-500 tracking-widest">
            ${wordCount} Words
          </span>
        </div>
      </div>

      <div class="mt-4 flex items-center justify-end">
        <a href="contribution.html"
          class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:text-indigo-400 transition group/btn">
          Continue Writing
          <i data-lucide="arrow-right-circle" class="w-4 h-4 transition-transform group-hover/btn:translate-x-1"></i>
        </a>
      </div>
    </div>
  `;
}

/* ==================== UI Helpers ==================== */

function loadingState() {
  return `
    <div class="col-span-full text-center py-20">
      <div class="inline-block w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="mt-4 text-zinc-500 font-medium">Loading...</p>
    </div>
  `;
}

function emptyState(message) {
  return `
    <div class="col-span-full text-center py-20 text-zinc-600 italic text-sm">
      ${message}
    </div>
  `;
}
