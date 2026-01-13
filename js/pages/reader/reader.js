// js/pages/reader/reader.js

import {
  getChapterProgress,
  getCloudProgress,
  updateReaderProgress,
  bindScrollProgress,
  restoreScrollProgress,
  initAuth,
  initMobileDrawer,
  initTheme,
  initFont,
  setTheme,
  setFont,
  updateSize,
  loadReaderMeta,
  loadReaderChapter,
  applyNavigation,
  goBackToTale
} from "./index.js";

/* ================= URL Params ================= */

const params = new URLSearchParams(window.location.search);
const taleId = params.get("taleId");
const chapterIndex = parseInt(params.get("chapterId")) || 0;

/* ================= Theme ================= */

initTheme();
initFont();

window.setTheme = setTheme;
window.setFont = setFont;
window.updateSize = updateSize;

/* ================= Progress Resolver ================= */

async function resolveProgress({ userId, taleId, chapterIndex }) {
  const local = getChapterProgress({ userId, taleId, chapterIndex });
  const cloud = await getCloudProgress({ userId, taleId });

  const cloudChapter = cloud?.chapters?.[chapterIndex];

  if (!local && !cloudChapter) return null;
  if (!cloudChapter) return local;
  if (!local) return cloudChapter;

  return cloudChapter.updatedAt > local.updatedAt ? cloudChapter : local;
}

/* ================= Init ================= */

initAuth(async (user) => {
  const userId = user.uid;

  const resolvedProgress = await resolveProgress({
    userId,
    taleId,
    chapterIndex
  });

  await loadReaderMeta(taleId);
  const navigation = await loadReaderChapter({ taleId, chapterIndex });
  if (!navigation) return;

  applyNavigation(navigation, taleId);

  updateReaderProgress({
    chapterIndex,
    totalChapters: navigation.totalChapters
  });

  restoreScrollProgress({ resolvedProgress });

  bindScrollProgress({ userId, taleId, chapterIndex });
});

/* ================= Mobile ================= */

window.GoBack = () => goBackToTale(taleId);
initMobileDrawer();

if (window.lucide) {
  lucide.createIcons();
}
