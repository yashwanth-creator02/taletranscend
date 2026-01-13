// js/reader/progress.js

import { getOverallProgress } from "./progress.utils.js";
import { saveReaderProgress, getChapterProgress } from "../../core/services/reader/index.js";

/* =========================================================
   OVERALL READING PROGRESS (chapter-based)
   ========================================================= */
export function updateReaderProgress({ chapterIndex, totalChapters }) {
  const progress = getOverallProgress({ chapterIndex, totalChapters });

  const sidebarBar = document.getElementById("sidebar-progress-bar");
  const percentLabel = document.getElementById("progress-percent");

  if (sidebarBar) sidebarBar.style.width = `${progress.percent}%`;
  if (percentLabel) percentLabel.textContent = `${progress.percent}%`;
}

/* =========================================================
   SCROLL PROGRESS (chapter-local) with debounce
   ========================================================= */
function getScrollTarget() {
  return document.querySelector(".story-scroll-area") || document.documentElement;
}

function calculateScrollPercent(target) {
  const scrollTop = target.scrollTop;
  const scrollHeight = target.scrollHeight - target.clientHeight;
  if (scrollHeight <= 0) return 0;
  return Math.min(100, Math.round((scrollTop / scrollHeight) * 100));
}

export function bindScrollProgress({ userId, taleId, chapterIndex }) {
  const target = getScrollTarget();
  let throttleTimeout = null;

  target.addEventListener("scroll", () => {
    if (throttleTimeout) return;

    throttleTimeout = setTimeout(() => {
      const scrollPercent = calculateScrollPercent(target);
      updateScrollUI(scrollPercent);

      saveReaderProgress({ userId, taleId, chapterIndex, scrollPercent });

      throttleTimeout = null;
    }, 200); // ✅ throttle: max once per 200ms
  });
}

function updateScrollUI(scrollPercent) {
  const bar = document.getElementById("reading-progress");
  if (bar) bar.style.width = `${scrollPercent}%`;
}

/* =========================================================
   RESTORE SCROLL POSITION
   ========================================================= */
export function restoreScrollProgress({ userId, taleId, chapterIndex, resolvedProgress }) {
  if (!resolvedProgress || typeof resolvedProgress.scrollPercent !== "number") return;

  const target = getScrollTarget();

  requestAnimationFrame(() => {
    const scrollHeight = target.scrollHeight - target.clientHeight;
    if (scrollHeight <= 0) return;

    target.scrollTop = (resolvedProgress.scrollPercent / 100) * scrollHeight;
    updateScrollUI(resolvedProgress.scrollPercent);
  });
}
