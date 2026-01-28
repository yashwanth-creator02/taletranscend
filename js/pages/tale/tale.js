import {
  setupResumeReading,
  initAuth,
  loadTale,
  loadChapters,
  renderTale,
  renderChapters,
  bindChapterClicks,
  setupTabs,
  setupStartReading,
  listenToComments,
  postComment,
  initIcons,
} from './index.js';

/* -------------------------------
   Extract Tale ID from URL
--------------------------------- */
const taleId = new URLSearchParams(window.location.search).get('id');

// Redirect to library if no tale ID is provided
if (!taleId) location.href = 'library.html';

/* -------------------------------
   Initialize Authentication and Load Tale
--------------------------------- */

/**
 * Bootstraps the Tale page:
 * - Authenticates the user
 * - Loads tale data and chapters
 * - Renders UI components
 * - Binds interactions and comments
 */
initAuth(async (user) => {
  const userId = user.uid;

  // Load the main tale data (public or user draft)
  const tale = await loadTale(taleId, user);
  if (!tale) return;

  // Render the main tale overview
  renderTale(userId, tale, taleId);

  // Load all chapters for the tale
  const chapters = await loadChapters(taleId);

  // Render chapter list in the UI
  renderChapters(userId, chapters, taleId);

  // Bind interactions
  bindChapterClicks(taleId); // Clicks on chapter list items
  setupStartReading(taleId, chapters); // "Start Reading" button
  setupResumeReading(userId, taleId); // "Resume Reading" button
  setupTabs(); // Tabs for switching description/chapters/comments

  // Comment system
  listenToComments(taleId); // Real-time comment updates
  window.postComment = () => postComment(taleId); // Expose posting function for HTML
});

/* -------------------------------
   Initialize Icons
--------------------------------- */
// Lucide icons initialization
initIcons();
