// src/pages/contribution/contribution.js
// Entry point for the contribution/editor page.

import '@css/base.css';
import '@css/components.css';
import '@css/pages/contribution.css';

import { addNewChapter, updateSidebarTitle } from './chapters.js';
import { autoSaveLocal } from './editor.js';
import { saveToCloud } from './cloud.js';
import { publishFullTale } from './publish.js';

/* ==================== Initialization ==================== */
function init() {
  addNewChapter();
  bindEditorEvents();
}

/* ==================== Event Bindings ==================== */

/**
 * Binds all contribution page interactions via event listeners.
 * No onclick attributes are used in the HTML.
 */
function bindEditorEvents() {
  // Add chapter button
  document.getElementById('add-chapter-btn')?.addEventListener('click', addNewChapter);

  // Save draft button
  document.getElementById('save-draft-btn')?.addEventListener('click', saveToCloud);

  // Publish button
  document.getElementById('publish-btn')?.addEventListener('click', publishFullTale);

  // Chapter title input — updates sidebar title on every keystroke
  document
    .getElementById('current-chapter-title')
    ?.addEventListener('input', (e) => updateSidebarTitle(e.target.value));

  // Chapter content textarea — auto-saves on every keystroke
  document.getElementById('chapter-content')?.addEventListener('input', autoSaveLocal);

  // AI helper buttons — placeholders for future implementation
  document
    .getElementById('ai-continue-btn')
    ?.addEventListener('click', () => console.log('AI continue: not yet implemented'));
  document
    .getElementById('ai-enhance-btn')
    ?.addEventListener('click', () => console.log('AI enhance: not yet implemented'));
}

init();
