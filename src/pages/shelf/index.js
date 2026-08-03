// src/pages/shelf/index.js
// Barrel file for the shelf page.

export { initAuth } from '@fb/index.js';
export { shelfState } from './state.js';
export { renderGrid, setGridLoading, setGridEmpty, setGridError, setActiveTab } from './ui.js';
export {
  loadBookmarkedTales,
  loadDrafts,
  loadRecentTales,
  computeAndRenderHeroStats,
  applyAndRender,
} from './content.js';
export { initShelfInteractions } from './interactions.js';
export { initNav } from '@shared/components/nav/nav.js';
export { initIcons } from '@shared/icons.js';
