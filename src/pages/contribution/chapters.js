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
 * Highlights the active chapter and binds click handlers via event listeners.
 */
export function renderChapterList() {
  const list = document.getElementById('chapter-list');
  if (!list) return;

  list.innerHTML = '';

  state.chapters.forEach((ch, index) => {
    const item = document.createElement('div');
    const isActive = index === state.currentChapterIndex;

    item.className = `px-6 py-3 text-xs cursor-pointer transition-colors
      ${isActive ? 'text-white bg-white/5 border-l-2 border-indigo-500' : 'text-zinc-400 hover:text-white'}`;
    item.textContent = ch.title || 'Untitled Chapter';

    // Use event listener instead of onclick
    item.addEventListener('click', () => {
      // Save current chapter content before switching
      const currentChapter = state.chapters[state.currentChapterIndex];
      if (currentChapter) {
        currentChapter.content = document.getElementById('chapter-content')?.value || '';
        currentChapter.title = document.getElementById('current-chapter-title')?.value || '';
      }

      state.currentChapterIndex = index;
      renderChapterList();
      loadCurrentChapter();
    });

    list.appendChild(item);
  });
}

/**
 * Loads the currently selected chapter into the editor input fields.
 */
export function loadCurrentChapter() {
  const chapter = state.chapters[state.currentChapterIndex];
  if (!chapter) return;

  const titleInput = document.getElementById('current-chapter-title');
  const contentArea = document.getElementById('chapter-content');

  if (titleInput) titleInput.value = chapter.title || '';
  if (contentArea) contentArea.value = chapter.content || '';
}

/**
 * Updates the title of the current chapter in state and re-renders the sidebar.
 *
 * @param {string} value - New title value from the title input field
 */
export function updateSidebarTitle(value) {
  const chapter = state.chapters[state.currentChapterIndex];
  if (!chapter) return;

  chapter.title = value;
  renderChapterList();
}
