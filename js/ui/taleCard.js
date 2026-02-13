import { getTotalReadTime, getBookmarks, getTaleProgressData } from '@services/index.js';
import { getOverallProgress } from '@pages/reader/progress.utills';

/* =========================
    RENDER GRID OF TALE CARDS
========================= */

/**
 * Render a grid of tale cards for the library page.
 * @param {string} userId - The current user's ID.
 * @param {Array<Object>} tales - Array of tale objects to render.
 */
export async function renderCardsGrid(userId, tales) {
  const container = document.getElementById('cards-grid');
  if (!container) return;

  // Show empty state if no tales exist
  if (!tales.length) {
    container.innerHTML = `
            <div class="col-span-full text-center py-20 text-zinc-600 italic">
                No tales found in the archives...
            </div>
        `;
    return;
  }

  try {
    // 1. Parallel Fetching: Progress, Bookmarks, and Read Times
    // We fetch the progress sub-collection for every tale simultaneously
    const [progressSnapshots, bookmarks, readTimeEntries] = await Promise.all([
      Promise.all(tales.map((tale) => getTaleProgressData(userId, tale.id))),
      getBookmarks({ userId }),
      Promise.all(
        tales.map(async (tale) => {
          const ms = await getTotalReadTime({ userId, taleId: tale.id });
          return [tale.id, ms];
        })
      ),
    ]);

    // 2. Build Lookup Maps
    const bookmarkMap = Object.fromEntries(bookmarks.map((b) => [b.id, true]));
    const readTimeMap = Object.fromEntries(readTimeEntries);

    // 3. Render and Inject
    container.innerHTML = tales
      .map((tale, index) => {
        // chaptersProgress is the object { "0": 100, "1": 45... } from Firestore
        const chaptersProgress = progressSnapshots[index];

        // Calculate numeric progress using the math utility
        const progressStats = getOverallProgress({
          chapterCount: tale.chapterCount,
          chaptersProgress: chaptersProgress,
        });

        // Override logic for "Finished" status
        const displayPercent = tale.status === 'finished' ? 100 : progressStats.percent;

        // Pass all data to the template
        return createTaleCard(tale, displayPercent, readTimeMap, bookmarkMap);
      })
      .join('');

    // Re-initialize icons if using Lucide
    if (window.lucide) {
      window.lucide.createIcons();
    }
  } catch (err) {
    console.error('[RenderGrid] Failed to populate library:', err);
  }
}

/* =========================
    TALE CARD TEMPLATE
========================= */

/**
 * Create a single tale card HTML.
 * @param {Object} tale - Tale data object.
 * @param {number} progressPercent - Pre-calculated progress number.
 */
function createTaleCard(tale, progressPercent, readTimeMap = {}, bookmarkMap = {}) {
  const {
    id = '0000',
    title = 'Untitled Echo',
    coverUrl,
    description = 'No description provided.',
    era = 'Unknown Era',
    chapterCount = 0,
    estimatedReadTime = '—',
  } = tale;

  const isBookmarked = !!bookmarkMap[id];
  const menuId = `menu-${id}`;
  const isFinished = tale.status === 'finished';

  const totalMs = readTimeMap[id] || 0;
  const minutes = Math.floor(totalMs / 60000);

  const time =
    minutes > 1
      ? `<div class="flex items-center gap-2">
            <i data-lucide="clock" class="w-3.5 h-3.5 text-zinc-600"></i>
            <span class="text-[9px] font-bold uppercase text-zinc-500 tracking-widest">
                ${minutes}m read
            </span>
        </div>`
      : '';

  const cover =
    coverUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800';

  return `
    <div
        class="tale-card-glow glass-panel group relative p-5 rounded-[2.5rem] hover:border-indigo-500/40 transition-all cursor-pointer tale-card"
        data-id="${id}">

        <div class="flex justify-between items-start mb-4">
            <div class="flex flex-col">
                <span class="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-1 rounded-md w-fit mb-1">
                    ${era}
                </span>
            </div>

            <div class="relative">
                <button
                    data-action="options"
                    data-menu-id="${menuId}"
                    class="p-2 hover:bg-white/5 rounded-full transition text-zinc-500 hover:text-white">
                    <i data-lucide="more-vertical" class="w-4 h-4"></i>
                </button>

                <div id="${menuId}"
                    class="options-menu hidden absolute right-0 mt-2 w-48 bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-[60] py-2">
                    <div class="px-4 py-1 mb-2">
                        <span class="text-[7px] font-black text-zinc-600 uppercase tracking-[0.3em]">Quick Actions</span>
                    </div>
                    <button data-action="copy-link" data-id="${id}" class="menu-btn w-full px-4 py-2 text-left text-[9px] uppercase tracking-widest font-bold text-zinc-400 hover:text-white hover:bg-indigo-500/10 transition flex items-center gap-3">
                        <i data-lucide="link" class="w-3.5 h-3.5"></i> Copy Link
                    </button>
                    <button class="menu-btn w-full px-4 py-2 text-left text-[9px] uppercase tracking-widest font-bold text-zinc-400 hover:text-white hover:bg-indigo-500/10 transition flex items-center gap-3">
                        <i data-lucide="download" class="w-3.5 h-3.5"></i> Enable Offline Read
                    </button>

                    <div class="h-[1px] bg-white/5 my-2 mx-2"></div>

                    <div class="px-4 py-1 mb-1">
                        <span class="text-[7px] font-black text-zinc-600 uppercase tracking-[0.3em]">Management</span>
                    </div>

                    <button
                      class="menu-btn w-full px-4 py-2 text-left text-[9px] uppercase tracking-widest font-bold transition flex items-center gap-3
                        ${isFinished ? 'text-zinc-600 cursor-not-allowed' : 'text-zinc-400 hover:text-white hover:bg-indigo-500/10'}"
                      ${isFinished ? 'disabled' : ''}
                      data-action="${isFinished ? '' : 'mark-finished'}"
                      data-id="${id}"
                    >
                      <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>
                      ${isFinished ? 'Finished' : 'Mark Finished'}
                    </button>

                    <button class="menu-btn w-full px-4 py-2 text-left text-[9px] uppercase tracking-widest font-bold text-orange-400/80 hover:text-orange-400 hover:bg-orange-500/10 transition flex items-center gap-3">
                        <i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i> Report
                    </button>

                    <div class="h-[1px] bg-white/5 my-2 mx-2"></div>

                    <button
                      class="menu-btn w-full px-4 py-2 text-left text-[9px] uppercase tracking-widest font-bold transition flex items-center gap-3
                        ${isBookmarked ? 'text-red-400 hover:bg-red-500/20' : 'text-emerald-400 hover:bg-emerald-500/20'}"
                      data-action="${isBookmarked ? 'decouple' : 'couple'}"
                      data-id="${id}"
                    >
                      <i data-lucide="${isBookmarked ? 'trash-2' : 'link'}" class="w-3.5 h-3.5"></i>
                      ${isBookmarked ? 'Decouple Fragment' : 'Couple Fragment'}
                    </button>
                </div>
            </div>
        </div>

        <div class="relative h-56 bg-zinc-900 rounded-[1.8rem] mb-6 overflow-hidden">
            <img src="${cover}" class="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700">

            <div class="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md p-3 rounded-2xl">
              <div class="flex justify-between text-[8px] uppercase font-bold">
                <span class="text-zinc-400">Reading Progress</span>
                <span class="text-indigo-400">${progressPercent}%</span>
              </div>
              <div class="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  class="h-full bg-indigo-500 transition-all duration-500"
                  style="width:${Math.max(2, progressPercent)}%"
                ></div>
              </div>
            </div>
        </div>

        <div class="px-2">
            <h3 class="text-xl font-bold text-white uppercase tracking-wider mb-2 group-hover:text-indigo-400 transition-colors">
                ${title}
            </h3>

            <p class="text-xs text-zinc-400 leading-relaxed line-clamp-2 mb-4 italic">
                ${description}
            </p>

            <div class="grid grid-cols-2 gap-4 py-4 border-t border-white/5">
                <div class="flex items-center gap-2">
                    <i data-lucide="layers" class="w-3.5 h-3.5 text-zinc-600"></i>
                    <span class="text-[9px] font-bold uppercase text-zinc-500 tracking-widest">
                        ${chapterCount} Fragments
                    </span>
                </div>
                ${time}
            </div>

            <div class="mt-4 flex items-center justify-end">
                <button
                    data-action="resume"
                    data-id="${id}"
                    class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:text-indigo-400 transition group/btn">
                    Resume Link
                    <i data-lucide="arrow-right-circle" class="w-4 h-4 transition-transform group-hover/btn:translate-x-1"></i>
                </button>
            </div>
        </div>
    </div>
    `;
}
