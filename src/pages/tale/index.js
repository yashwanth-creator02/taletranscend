// src/pages/tale/index.js
// Barrel file for the tale page.
// Import all tale page functionality from here.

export { initAuth } from '@fb/index.js';
export { loadTale, loadChapters } from './content.js';
export { renderTale, renderChapters } from './ui.js';
export {
  bindChapterClicks,
  setupTabs,
  setupStartReading,
  setupResumeReading,
} from './interactions.js';
export { listenToComments, postComment } from './comments.js';
export { initIcons } from '@ui/components/icons.js';
