// src/pages/tale/index.js
// Barrel export for the Tale Archive page.

export { loadTale, loadChapters } from './content.js';
export { renderTale, renderChapters, showArchiveSkeletons, renderTaleNotFound } from './ui.js';
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
  setupReportMissingTale,
} from './interactions.js';
export {
  listenToComments,
  postComment,
  editComment,
  editReply,
  deleteComment,
  deleteReply,
} from './comments.js';
export { formatCommentDateTime, buildReplyTree } from '@/utils/comment.utils.ts';

export { initAuth } from '@fb/index.js';
export { initIcons } from '@ui/icons.js';
