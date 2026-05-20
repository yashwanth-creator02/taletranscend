// src/pages/tale/index.js
// Barrel export for the Tale Archive page.

export { loadTale, loadChapters } from './content.js';
export { renderTale, renderChapters } from './ui.js';
export {
  bindChapterClicks,
  setupTabs,
  setupStartReading,
  setupResumeReading,
  setupResonance,
  initHeaderScroll,
} from './interactions.js';
export { listenToComments, postComment } from './comments.js';

export { initAuth } from '@fb/index.js';
export { initIcons } from '@ui/components/icons.js';
