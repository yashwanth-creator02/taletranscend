// js/reader/navigation.js

export function initNavigation({ taleId, chapterIdx, chapters }) {
  if (!chapters || !chapters.length) return;

  const prev = document.getElementById("prev-link");
  const next = document.getElementById("next-link");

  if (!prev || !next) return;

  // Reset
  prev.classList.add("hidden");
  next.classList.add("hidden");
  next.classList.remove("sm:ml-auto");

  if (chapterIdx > 0) {
    prev.href = `reader.html?taleId=${taleId}&chapterId=${chapterIdx - 1}`;
    prev.classList.remove("hidden");

    const prevTitle = document.getElementById("prev-title");
    if (prevTitle) prevTitle.textContent = chapters[chapterIdx - 1].title;
  }

  if (chapterIdx < chapters.length - 1) {
    next.href = `reader.html?taleId=${taleId}&chapterId=${chapterIdx + 1}`;
    next.classList.remove("hidden");

    const nextTitle = document.getElementById("next-title");
    if (nextTitle) nextTitle.textContent = chapters[chapterIdx + 1].title;

    if (chapterIdx === 0) {
      next.classList.add("sm:ml-auto");
    }
  }
}
export function goBackToTale(taleId) {
  window.location.href = `Tale_page.html?id=${taleId}`;
}
