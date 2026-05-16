// src/pages/shelf/index.js
// Barrel file for the shelf page.

export { initAuth } from '@fb/index.js';
export { initNav } from '@ui/components/nav/nav.js';
export { shelfState } from './state.js';
export { 
  renderGrid, 
  setGridLoading, 
  setGridEmpty, 
  setGridError,
  setActiveTab
} from './ui.js';
export { 
  loadBookmarkedTales, 
  loadDrafts, 
  computeAndRenderHeroStats,
  applyAndRender
} from './content.js';
export { initShelfInteractions } from './interactions.js';
