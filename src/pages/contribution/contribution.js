// src/pages/contribution/contribution.js
// Entry point for the contribution/editor page.

import '@css/base.css';
import '@css/components.css';
import '@css/pages/contribution.css';

import { addNewChapter, updateSidebarTitle } from './chapters.js';
import { autoSaveLocal } from './editor.js';
import { saveToCloud } from './cloud.js';
import { publishFullTale } from './publish.js';
import { initNav } from '@ui/components/nav.js';
initNav();
/* ==================== Initialization ==================== */
function init() {
  addNewChapter();
  bindEditorEvents();

  // Initialize icons via CDN
  if (window.lucide) window.lucide.createIcons();
}

/* ==================== Event Bindings ==================== */

/**
 * Binds all contribution page interactions via event listeners.
 * No onclick attributes are used in the HTML.
 */
function bindEditorEvents() {
  document.getElementById('add-chapter-btn')?.addEventListener('click', addNewChapter);

  document.getElementById('save-draft-btn')?.addEventListener('click', saveToCloud);

  document.getElementById('publish-btn')?.addEventListener('click', publishFullTale);

  document
    .getElementById('current-chapter-title')
    ?.addEventListener('input', (e) => updateSidebarTitle(e.target.value));

  document.getElementById('chapter-content')?.addEventListener('input', autoSaveLocal);

  // AI helpers — placeholders for future implementation
  document
    .getElementById('ai-continue-btn')
    ?.addEventListener('click', () => console.log('AI continue: not yet implemented'));
  document
    .getElementById('ai-enhance-btn')
    ?.addEventListener('click', () => console.log('AI enhance: not yet implemented'));
}

init();
