// src/pages/contribution/chapters.js
// Manages chapter creation, deletion, reordering, sidebar rendering,
// and loading the active chapter into the editor.

import { state } from './state.js';
import { updateStats } from './editor.js';
import { initIcons } from '@ui/components/icons.js';
import { sanitizeHtml } from '@/utils';
/* ── Add ──────────────────────────────────────────────────────────── */

/**
 * Adds a new untitled chapter to state, sets it as current,
 * and refreshes the sidebar and editor.
 */
export function addNewChapter() {
  state.chapters.push({ title: 'Untitled Chapter', content: '' });
  state.currentChapterIndex = state.chapters.length - 1;

  renderChapterList();
  loadCurrentChapter();
  updateStats();
}

/* ── Delete ───────────────────────────────────────────────────────── */

/**
 * Deletes the chapter at the given index.
 * Adjusts currentChapterIndex to stay in bounds.
 * Prevents deletion of the last remaining chapter.
 *
 * @param {number} index
 */
export function deleteChapter(index) {
  if (state.chapters.length <= 1) return; // Always keep at least one chapter

  state.chapters.splice(index, 1);

  // Keep index in bounds
  if (state.currentChapterIndex >= state.chapters.length) {
    state.currentChapterIndex = state.chapters.length - 1;
  }

  renderChapterList();
  loadCurrentChapter();
}

/* ── Reorder ──────────────────────────────────────────────────────── */

/**
 * Moves a chapter up or down in the list.
 * Also moves currentChapterIndex to follow the moved chapter.
 *
 * @param {number} index - Chapter index to move
 * @param {'up'|'down'} direction
 */
export function moveChapter(index, direction) {
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= state.chapters.length) return;

  // Swap
  [state.chapters[index], state.chapters[targetIndex]] = [
    state.chapters[targetIndex],
    state.chapters[index],
  ];

  // Follow the moved chapter if it was active
  if (state.currentChapterIndex === index) {
    state.currentChapterIndex = targetIndex;
  }

  renderChapterList();
}

/* ── Render Sidebar ───────────────────────────────────────────────── */

/**
 * Renders the full chapter list in the editor sidebar.
 * Each item shows the chapter title, reorder arrows, and a delete button.
 * Highlights the active chapter.
 */
export function renderChapterList() {
  const list = document.getElementById('chapter-list');
  if (!list) return;

  list.innerHTML = '';

  state.chapters.forEach((ch, index) => {
    const isActive = index === state.currentChapterIndex;
    const isOnly = state.chapters.length === 1;

    const item = document.createElement('div');
    item.className = `chapter-item${isActive ? ' chapter-item--active' : ''}`;
    item.setAttribute('data-index', index);

    item.innerHTML = `
      <button class="chapter-item__select" type="button" aria-label="Select chapter ${index + 1}">
        <span class="chapter-item__num">${index + 1}</span>
        <span class="chapter-item__title">${escapeText(ch.title || 'Untitled Chapter')}</span>
      </button>
      <div class="chapter-item__actions">
        <button
          class="chapter-item__action"
          type="button"
          aria-label="Move up"
          data-move="up"
          data-index="${index}"
          ${index === 0 ? 'disabled' : ''}
        ><i data-lucide="chevron-up"></i></button>
        <button
          class="chapter-item__action"
          type="button"
          aria-label="Move down"
          data-move="down"
          data-index="${index}"
          ${index === state.chapters.length - 1 ? 'disabled' : ''}
        ><i data-lucide="chevron-down"></i></button>
        <button
          class="chapter-item__action chapter-item__action--danger"
          type="button"
          aria-label="Delete chapter"
          data-delete="${index}"
          ${isOnly ? 'disabled' : ''}
        ><i data-lucide="trash-2"></i></button>
      </div>
    `;

    // Select chapter
    item.querySelector('.chapter-item__select').addEventListener('click', () => {
      saveCurrentChapterToState();
      state.currentChapterIndex = index;
      renderChapterList();
      loadCurrentChapter();
    });

    // Move up / down
    item.querySelectorAll('[data-move]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dir = btn.dataset.move;
        const idx = Number(btn.dataset.index);
        saveCurrentChapterToState();
        moveChapter(idx, dir);
      });
    });

    // Delete
    item.querySelector('[data-delete]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = Number(e.currentTarget.dataset.delete);
      if (confirm(`Delete "${state.chapters[idx].title || 'Untitled Chapter'}"?`)) {
        deleteChapter(idx);
      }
    });

    list.appendChild(item);
  });

  initIcons();

  // Update chapter count stat
  const countEl = document.getElementById('studio-chapter-count');
  if (countEl) countEl.textContent = String(state.chapters.length);
}

/* ── Load into Editor ─────────────────────────────────────────────── */

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

  updateStats();
}

/* ── Update Sidebar Title ─────────────────────────────────────────── */

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

/* ── Internal Helper ──────────────────────────────────────────────── */

/**
 * Syncs the live editor fields back into state before switching chapters.
 * Prevents content loss when the user clicks a different chapter without typing.
 */
function saveCurrentChapterToState() {
  const chapter = state.chapters[state.currentChapterIndex];
  if (!chapter) return;
  chapter.content = document.getElementById('chapter-content')?.value ?? '';
  chapter.title = document.getElementById('current-chapter-title')?.value ?? '';
}
