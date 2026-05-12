// src/pages/contribution/contribution.js
// Entry point for the contribution/editor page.
// Loads the user's saved draft on open, or starts fresh if none exists.

import '@css/base.css';
import '@css/components.css';
import '@css/pages/contribution.css';

import { initNav } from '@ui/components/nav/nav.js';
import { initAuth } from '@fb/index.js';

import {
  addNewChapter,
  updateSidebarTitle,
  autoSaveLocal,
  saveToCloud,
  loadDraft,
  publishFullTale,
  renderChapterList,
  loadCurrentChapter,
} from './index.js';

initNav();

/* ==================== Initialization ==================== */

/**
 * Initializes the editor after authentication.
 * Attempts to load an existing draft from Firestore.
 * Falls back to a blank chapter if no draft exists.
 */
async function init(userId) {
  bindEditorEvents();

  const hasDraft = await loadDraft();

  if (hasDraft) {
    // Restore the sidebar and load the first chapter into the editor
    renderChapterList();
    loadCurrentChapter();
    setStatus('Draft restored.', 'success');
  } else {
    // No saved draft — start with one blank chapter
    addNewChapter();
    setStatus('New tale started.', 'neutral');
  }

  if (window.lucide) window.lucide.createIcons();
}

/* ==================== Auth ==================== */

const authTimeout = setTimeout(() => {
  setStatus('Connection timed out. Please refresh.', 'error');
}, 10000);

initAuth(async (user) => {
  clearTimeout(authTimeout);
  await init(user.uid);
});

/* ==================== Event Bindings ==================== */

/**
 * Binds all editor interactions via event listeners.
 */
function bindEditorEvents() {
  document.getElementById('add-chapter-btn')?.addEventListener('click', addNewChapter);

  document.getElementById('save-draft-btn')?.addEventListener('click', async () => {
    await saveToCloud();
    setStatus('Saved to Cloud.', 'success');
  });

  document.getElementById('publish-btn')?.addEventListener('click', publishFullTale);

  document
    .getElementById('current-chapter-title')
    ?.addEventListener('input', (e) => updateSidebarTitle(e.target.value));

  document.getElementById('chapter-content')?.addEventListener('input', autoSaveLocal);

  document
    .getElementById('ai-continue-btn')
    ?.addEventListener('click', () => console.log('AI continue: not yet implemented'));
  document
    .getElementById('ai-enhance-btn')
    ?.addEventListener('click', () => console.log('AI enhance: not yet implemented'));

  document.getElementById('save-draft-btn-mobile')?.addEventListener('click', async () => {
    await saveToCloud();
    setStatus('Saved to Cloud.', 'success');
  });

  document.getElementById('publish-btn-mobile')?.addEventListener('click', publishFullTale);
  // Warn user if they try to navigate away with unsaved changes
  window.addEventListener('beforeunload', (e) => {
    const content = document.getElementById('chapter-content')?.value || '';
    if (content.trim().length > 0) {
      e.preventDefault();
    }
  });
}

/* ==================== Status Helper ==================== */

/**
 * Updates the status indicator in the editor footer.
 *
 * @param {string} message - Status text to display
 * @param {'success'|'error'|'neutral'} type - Visual style
 */
function setStatus(message, type) {
  const status = document.getElementById('stat-status');
  if (!status) return;

  status.classList.remove('text-emerald-400', 'text-red-400', 'text-zinc-500');

  const colors = {
    success: 'text-emerald-400',
    error: 'text-red-400',
    neutral: 'text-zinc-500',
  };

  status.classList.add(colors[type] || 'text-zinc-500');
  status.textContent = message;
}
