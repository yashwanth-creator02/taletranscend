import { getChapterState, getChapterProgress } from '@services/index.js';
import { getLastReadChapter, getTotalReadTime } from '@services/index.js';

/**
 * Render the main Tale details in the UI.
 *
 * Updates:
 * - Title, author, description
 * - Cover image and hero section background
 * - Last read fragment for resuming
 * - Total read time
 *
 * @param {string} userId - The current authenticated user's ID
 * @param {Object} tale - Tale object containing metadata (title, authorName, description, chapterCount, coverUrl)
 * @param {string} taleId - Unique identifier for the tale
 */
export function renderTale(userId, tale, taleId) {
  // Get the last read chapter index and display as fragment number
  const last = getLastReadChapter({ userId, taleId }) + 1;

  // Update loading status
  document.getElementById('loading-indicator').innerText = 'Transcription Successful';

  // Display title with fade-in animation
  const titleEl = document.getElementById('display-title');
  titleEl.innerText = tale.title || 'Untitled Legend';
  titleEl.style.opacity = 1;
  titleEl.style.transform = 'translateY(0)';

  // Show meta container
  document.getElementById('meta-container').style.opacity = 1;

  // Display author
  document.getElementById('display-author').innerText =
    tale.authorName || `Scribe ${taleId.slice(0, 5)}`;

  // Display fragment/chapter count
  document.getElementById('display-chapters').innerText = `${tale.chapterCount || 0} Fragments`;

  // Display description
  document.getElementById('display-description').innerText =
    tale.description || 'A mysterious tale waiting to be uncovered...';

  // Display last read fragment or default resume text
  document.getElementById('resume-text').innerText = last
    ? `Resume Fragment ${last}`
    : 'Resume Fragment';

  // Set cover image and hero background if provided
  if (tale.coverUrl) {
    document.getElementById('display-cover').src = tale.coverUrl;
    document
      .getElementById('hero-section')
      .style.setProperty('--bg-url', `url('${tale.coverUrl}')`);
  }

  // Display total read time if available
  const totalMs = getTotalReadTime({ userId, taleId });
  const readEl = document.getElementById('read-time');
  if (totalMs > 0) {
    const minutes = Math.floor(totalMs / 60000);
    readEl.classList.remove('hidden');
    readEl.innerText = `⏱ ${minutes} min read`;
  } else {
    readEl.classList.add('hidden');
  }
}

/**
 * Render the list of chapters/fragments for a tale.
 *
 * Each chapter displays:
 * - Fragment number
 * - Title
 * - Progress state icon (not started, in progress, completed)
 *
 * @param {string} userId - The current authenticated user's ID
 * @param {Array<Object>} chapters - Array of chapter objects
 * @param {string} taleId - Unique identifier for the tale
 */
export function renderChapters(userId, chapters, taleId) {
  const list = document.getElementById('chapter-list');

  // If no chapters, display empty state message
  if (!chapters.length) {
    list.innerHTML = `
      <p class="text-[10px] text-zinc-700 font-black uppercase tracking-widest italic py-10">
        No chronicles detected.
      </p>
    `;
    return;
  }

  // Render each chapter with progress icon
  list.innerHTML = chapters
    .map((ch, idx) => {
      const progress = getChapterProgress({ userId, taleId, chapterIndex: idx });
      const state = getChapterState(progress);

      // Default icon (not started)
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

  // Initialize Lucide icons if available
  if (window.lucide) {
    window.lucide.createIcons();
  }
}
