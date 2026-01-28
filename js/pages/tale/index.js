// ------------------------------
// Firebase Authentication
// ------------------------------
export { initAuth } from '@core/firebase/index.js';

// ------------------------------
// Tale Content Management
// ------------------------------
// Functions to load tales and their chapters from Firestore
export { loadTale, loadChapters } from './content.js';

// ------------------------------
// UI Rendering
// ------------------------------
// Functions to render the tale and its chapters in the reader
export { renderTale, renderChapters } from './ui.js';

// ------------------------------
// User Interactions
// ------------------------------
// Functions to handle clicks, tab switching, and starting/resuming reading
export {
  bindChapterClicks,
  setupTabs,
  setupStartReading,
  setupResumeReading,
} from './interactions.js';

// ------------------------------
// Comments System
// ------------------------------
// Functions to listen for real-time comments and post new comments
export { listenToComments, postComment } from './comments.js';

// ------------------------------
// Icons Initialization
// ------------------------------
export { initIcons } from '@ui/icons.js';
