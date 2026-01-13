// js/pages/reader/progress.js

import { getOverallProgress } from "./progress.utils.js";
import {
  saveReaderProgress,
  scheduleProgressSync
} from "../../core/services/reader/index.js";

/* ================= Overall Progress ================= */

export function updateReaderProgress({ chapterIndex, totalChapters }) {
  const progress = getOverallProgress({ chapterIndex, totalChapters });

  const bar = document.getElementById("sidebar-progress-bar");
  const label = document.getElementById("progress-percent");

  if (bar) bar.style.width = `${progress.percent}%`;
  if (label) label.textContent = `${progress.percent}%`;
}

/* ================= Scroll Progress ================= */

function getScrollTarget() {
  return document.querySelector(".story-scroll-area") || document.documentElement;
}

function calculateScrollPercent(target) {
  const max = target.scrollHeight - target.clientHeight;
  if (max <= 0) return 0;
  return Math.min(100, Math.round((target.scrollTop / max) * 100));
}

export function bindScrollProgress({ userId, taleId, chapterIndex }) {
  const target = getScrollTarget();
  let ticking = false;

  target.addEventListener("scroll", () => {
    if (ticking) return;

    ticking = true;
    requestAnimationFrame(() => {
      const scrollPercent = calculateScrollPercent(target);

      saveReaderProgress({ userId, taleId, chapterIndex, scrollPercent });
      scheduleProgressSync({ userId, taleId, chapterIndex, scrollPercent });

      const bar = document.getElementById("reading-progress");
      if (bar) bar.style.width = `${scrollPercent}%`;

      ticking = false;
    });
  });
}

/* ================= Restore Scroll ================= */

export function restoreScrollProgress({ resolvedProgress }) {
  if (!resolvedProgress) return;

  const target = getScrollTarget();

  requestAnimationFrame(() => {
    const max = target.scrollHeight - target.clientHeight;
    if (max <= 0) return;

    target.scrollTop = (resolvedProgress.scrollPercent / 100) * max;

    const bar = document.getElementById("reading-progress");
    if (bar) bar.style.width = `${resolvedProgress.scrollPercent}%`;
  });
}
