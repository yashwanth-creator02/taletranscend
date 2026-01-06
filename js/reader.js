// js/reader.js

/* ================= Firebase ================= */

import { loadReaderContent } from "./reader/content.js";
import { initMobileDrawer } from "./reader/mobile.js";
import { goBackToTale } from "./reader/navigation.js";


import {
  initTheme,
  initFont,
  setTheme,
  setFont,
  updateSize
} from "./reader/theme.js";

import { initReadingProgress } from "./reader/progress.js";
import { initAuth } from "./reader/auth.js";
import { initNavigation } from "./reader/navigation.js";



/* ================= URL Params ================= */
const params = new URLSearchParams(window.location.search);
const taleId = params.get("taleId");
const chapterIdx = parseInt(params.get("chapterId")) || 0;

const appId = "taletranscend-pro";

/* ================= Theme ================= */
initTheme();
initFont();

window.setTheme = setTheme;
window.setFont = setFont;
window.updateSize = updateSize;


/* ================= Progress ================= */
initReadingProgress();

/* ================= Load Content ================= */
initAuth(async () => {
  const { chapters } = await loadReaderContent({ taleId, chapterIdx });
  initNavigation({ taleId, chapterIdx, chapters });
});


/* ================= Auth ================= */
initAuth(() => {
  loadChapter();
});

/* ================= Mobile ================= */
window.GoBack = () => goBackToTale(taleId);


initMobileDrawer();


lucide.createIcons();
