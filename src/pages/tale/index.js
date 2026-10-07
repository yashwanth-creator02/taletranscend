// src/pages/tale/index.js
// Barrel export for the Tale Archive page.

export { loadTale, loadChapters } from './content.js';
export { renderTale, renderChapters, showArchiveSkeletons } from './ui.js';
export {
  bindChapterClicks,
  setupTabs,
  setupStartReading,
  setupResumeReading,
  setupShelfButton,
  setupShareButton,
  setupResonance,
  initHeaderScroll,
  setupChronicleBatchActions,
  setupInquire,
} from './interactions.js';
export {
  listenToComments,
  postComment,
  editComment,
  editReply,
  deleteComment,
  deleteReply,
  buildReplyTree,
} from './comments.js';

export { initAuth } from '@fb/index.js';
export { initIcons } from '@ui/components/icons.js';
