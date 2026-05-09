// src/pages/tale/ui.js
// Renders the tale overview and chapter list for the tale page.

import {
  getChapterState,
  getChapterProgress,
  getLastReadChapter,
  getTotalReadTime,
} from '@services/index.js';

/**
 * Renders the tale overview section of the tale page.
 * Populates title, author, description, cover image, resume text, and read time.
 *
 * @param {string} userId - ID of the authenticated user
 * @param {Object} tale - Tale metadata object from Firestore
 * @param {string} taleId - ID of the tale
 */
export async function renderTale(userId, tale, taleId) {
  const lastChapter = getLastReadChapter({ userId, taleId });
  const last = lastChapter != null ? lastChapter + 1 : null;

  document.getElementById('loading-indicator').innerText = 'Transcription Successful';

  const titleEl = document.getElementById('display-title');
  titleEl.innerText = tale.title || 'Untitled Legend';
  titleEl.style.opacity = 1;
  titleEl.style.transform = 'translateY(0)';

  document.getElementById('meta-container').style.opacity = 1;
  document.getElementById('display-author').innerText =
    tale.authorName || `Scribe ${taleId.slice(0, 5)}`;
  document.getElementById('display-chapters').innerText = `${tale.chapterCount || 0} Fragments`;
  document.getElementById('display-description').innerText =
    tale.description || 'A mysterious tale waiting to be uncovered...';
  document.getElementById('resume-text').innerText = last
    ? `Resume Fragment ${last}`
    : 'Resume Fragment';

  if (tale.coverUrl) {
    document.getElementById('display-cover').src = tale.coverUrl;
    document
      .getElementById('hero-section')
      .style.setProperty('--bg-url', `url('${tale.coverUrl}')`);
  }

  // Await async read time before updating UI
  const totalMs = await getTotalReadTime({ userId, taleId });
  const readEl = document.getElementById('read-time');
  if (totalMs > 0) {
    const minutes = Math.floor(totalMs / 60000);
    readEl.classList.remove('hidden');
    readEl.innerText = `${minutes} min read`;
  } else {
    readEl.classList.add('hidden');
  }
}

/**
 * Renders the chapter list for a tale.
 * Each chapter shows its fragment number, title, and reading state icon.
 *
 * @param {string} userId - ID of the authenticated user
 * @param {Array<Object>} chapters - Array of chapter objects sorted by chapterNum
 * @param {string} taleId - ID of the tale
 */
export function renderChapters(userId, chapters, taleId) {
  const list = document.getElementById('chapter-list');

  if (!chapters.length) {
    list.innerHTML = `
      <p class="text-[10px] text-zinc-700 font-black uppercase tracking-widest italic py-10">
        No chronicles detected.
      </p>
    `;
    return;
  }

  list.innerHTML = chapters
    .map((ch, idx) => {
      const progress = getChapterProgress({ userId, taleId, chapterIndex: idx });
      const state = getChapterState(progress);

      let icon = `<i data-lucide="circle" class="w-4 h-4 text-zinc-600"></i>`;
      if (state === 'in_progress')
        icon = `<i data-lucide="circle-dashed" class="w-4 h-4 text-indigo-400"></i>`;
      if (state === 'completed')
        icon = `<i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-500"></i>`;

      return `
        <div data-chapter-index="${idx}"
          class="chapter-item ${state} glass-card p-8 rounded-3xl flex justify-between items-center group hover:border-indigo-500/40 transition-all cursor-pointer">
          <div>
            <span class="text-[9px] text-indigo-500 font-black block mb-2 uppercase tracking-[0.3em]">
              Fragment ${String(idx + 1).padStart(2, '0')}
            </span>
            <h3 class="text-xl font-black text-white uppercase tracking-tighter">
              ${ch.title || 'Untitled Fragment'}
            </h3>
          </div>
          <span class="chapter-icon">${icon}</span>
        </div>
      `;
    })
    .join('');

  if (window.lucide) {
    window.lucide.createIcons();
  }
}
