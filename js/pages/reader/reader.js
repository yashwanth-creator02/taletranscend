// js\pages\reader\reader.js

import {
  resolveProgress,
  scheduleProgressSync,
  saveReaderProgress,
  getChapterProgress,
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

/* ================= Load Content ================= */
initAuth(async (user) => {
  const userId = user.uid;

  // STEP 4.3 — Resolve progress (local vs cloud)
  const resolvedProgress = await resolveProgress({ userId, taleId, chapterIndex });

  // Load tale metadata & chapter
  await loadReaderMeta(taleId);
  const navigation = await loadReaderChapter({ taleId, chapterIndex });
  if (!navigation) return;

  applyNavigation(navigation, taleId);

  updateReaderProgress({
    chapterIndex,
    totalChapters: navigation.totalChapters
  });

  /* ================= Progress Tracker ================= */
  function initProgressTracker() {
    console.log("Initializing Progress Tracker for:", taleId);

    // RESTORE scroll position
    restoreScrollProgress({ userId, taleId, chapterIndex, resolvedProgress });

    // BIND scroll events with throttling
    bindScrollProgress({ userId, taleId, chapterIndex });

    // Schedule cloud sync (debounced)
    scheduleProgressSync({ userId, taleId });
  }

  initProgressTracker();

  // Save progress immediately when page hidden
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      scheduleProgressSync({ userId, taleId, delay: 0 });
    }
  });
});

/* ================= Mobile ================= */
window.GoBack = () => goBackToTale(taleId);

initMobileDrawer();

// Ensure lucide icons are created if lucide is loaded
if (window.lucide) {
  lucide.createIcons();
}
