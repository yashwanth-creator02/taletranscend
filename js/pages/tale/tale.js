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

const taleId = new URLSearchParams(window.location.search).get('id');
if (!taleId) location.href = 'library.html';

initAuth(async (user) => {
  const userId = user.uid;
  const tale = await loadTale(taleId, user);
  if (!tale) return;

  renderTale(userId, tale, taleId);

  const chapters = await loadChapters(taleId);
  renderChapters(userId, chapters, taleId);

  bindChapterClicks(taleId);
  setupStartReading(taleId, chapters);
  setupResumeReading(userId, taleId);
  setupTabs();

  listenToComments(taleId);
  window.postComment = () => postComment(taleId);
});

initIcons();
