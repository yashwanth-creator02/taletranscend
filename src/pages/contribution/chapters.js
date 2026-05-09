// src/pages/contribution/chapters.js
// Manages chapter creation, sidebar rendering, and chapter loading in the editor.

import { state } from './state.js';

/**
 * Adds a new untitled chapter to state, sets it as current,
 * and refreshes the sidebar and editor content.
 */
export function addNewChapter() {
  state.chapters.push({ title: 'Untitled Chapter', content: '' });
  state.currentChapterIndex = state.chapters.length - 1;

  renderChapterList();
  loadCurrentChapter();
}

/**
 * Renders the full chapter list in the editor sidebar.
 * Highlights the active chapter and binds click handlers to switch chapters.
 */
export function renderChapterList() {
  const list = document.getElementById('chapter-list');
  list.innerHTML = '';

  state.chapters.forEach((ch, index) => {
    const item = document.createElement('div');
    item.className = 'px-6 py-3 text-xs cursor-pointer text-zinc-400 hover:text-white';
    item.textContent = ch.title;

    item.onclick = () => {
      state.currentChapterIndex = index;
      loadCurrentChapter();
    };

    list.appendChild(item);
  });
}

/**
 * Loads the currently selected chapter into the editor input fields.
 */
export function loadCurrentChapter() {
  const chapter = state.chapters[state.currentChapterIndex];
  if (!chapter) return;

  document.getElementById('current-chapter-title').value = chapter.title;
  document.getElementById('chapter-content').value = chapter.content;
}

/**
 * Updates the title of the current chapter and re-renders the sidebar.
 *
 * @param {string} value - New title value from the title input field
 */
export function updateSidebarTitle(value) {
  const chapter = state.chapters[state.currentChapterIndex];
  if (!chapter) return;

  chapter.title = value;
  renderChapterList();
}
