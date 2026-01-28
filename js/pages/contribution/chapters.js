import { state } from './state.js';

/* ================= Chapter Management ================= */

/**
 * Adds a new chapter to the current story.
 * Automatically sets it as the current chapter and updates the UI.
 */
export function addNewChapter() {
  // Add a default new chapter
  state.chapters.push({
    title: 'Untitled Chapter',
    content: '',
  });

  // Set the newly added chapter as the current chapter
  state.currentChapterIndex = state.chapters.length - 1;

  // Re-render chapter list in sidebar and load content editor
  renderChapterList();
  loadCurrentChapter();
}

/**
 * Renders the list of chapters in the sidebar.
 * Highlights the current chapter and sets up click handlers.
 */
export function renderChapterList() {
  const list = document.getElementById('chapter-list');
  list.innerHTML = ''; // Clear existing list

  state.chapters.forEach((ch, index) => {
    const item = document.createElement('div');
    item.className = 'px-6 py-3 text-xs cursor-pointer text-zinc-400 hover:text-white';
    item.textContent = ch.title;

    // Clicking a chapter sets it as the current chapter and loads it
    item.onclick = () => {
      state.currentChapterIndex = index;
      loadCurrentChapter();
    };

    list.appendChild(item);
  });
}

/**
 * Loads the currently selected chapter into the editor fields.
 */
export function loadCurrentChapter() {
  const chapter = state.chapters[state.currentChapterIndex];
  if (!chapter) return;

  document.getElementById('current-chapter-title').value = chapter.title;
  document.getElementById('chapter-content').value = chapter.content;
}

/**
 * Updates the title of the current chapter and refreshes the sidebar.
 *
 * @param {string} value - New title for the current chapter
 */
export function updateSidebarTitle(value) {
  const chapter = state.chapters[state.currentChapterIndex];
  if (!chapter) return;

  chapter.title = value;

  // Re-render sidebar to reflect updated title
  renderChapterList();
}
