import { state } from './state.js';

/* ---------------------------
   EDITOR
---------------------------- */
export function autoSaveLocal() {
  const chapter = state.chapters[state.currentChapterIndex];
  if (!chapter) return;

  chapter.content = document.getElementById('chapter-content').value;
  updateWordCount();

  const status = document.getElementById('stat-status');
  if (status) status.textContent = 'Draft Saved';
}

function updateWordCount() {
  const text = document.getElementById('chapter-content').value || '';
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  const stat = document.getElementById('stat-words');
  if (stat) stat.textContent = `${words} Words`;
}
