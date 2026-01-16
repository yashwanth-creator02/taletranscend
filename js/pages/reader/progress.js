// js/pages/reader/progress.js
import { getOverallProgress } from "./progress.utils.js";

/* ================= Overall Progress ================= */

export function updateReaderProgress({ chapterIndex, totalChapters }) {
  const progress = getOverallProgress({ chapterIndex, totalChapters });

  const bar = document.getElementById("sidebar-progress-bar");
  const label = document.getElementById("progress-percent");

  if (bar) bar.style.width = `${progress.percent}%`;
  if (label) label.textContent = `${progress.percent}%`;
}

/* ================= Scroll ================= */

function getScrollTarget() {
  return document.querySelector(".story-scroll-area") || document.documentElement;
}

function calculateScrollPercent(target) {
  const max = target.scrollHeight - target.clientHeight;
  if (max <= 0) return 0;
  return Math.min(100, Math.round((target.scrollTop / max) * 100));
}

export function bindScrollProgress({ onScroll }) {
  const target = getScrollTarget();
  let ticking = false;

  target.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      const percent = calculateScrollPercent(target);
      onScroll(percent);

      const bar = document.getElementById("reading-progress");
      if (bar) bar.style.width = `${percent}%`;

      ticking = false;
    });
  });
}

/* ================= Restore ================= */

export function restoreScrollProgress({ scrollPercent }) {
  if (typeof scrollPercent !== "number") return;

  const target = getScrollTarget();
  requestAnimationFrame(() => {
    const max = target.scrollHeight - target.clientHeight;
    if (max > 0) {
      target.scrollTop = (scrollPercent / 100) * max;
    }
  });
}
