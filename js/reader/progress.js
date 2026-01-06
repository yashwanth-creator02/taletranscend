// js/reader/progress.js

export function initReadingProgress() {
  const scrollTarget =
    document.querySelector(".story-scroll-area") || document.documentElement;

  const topBar = document.getElementById("reading-progress");
  const sideBar = document.getElementById("sidebar-progress-bar");
  const percent = document.getElementById("progress-percent");

  if (!topBar || !sideBar || !percent) return;

  scrollTarget.addEventListener("scroll", () => {
    const height = scrollTarget.scrollHeight - scrollTarget.clientHeight;
    if (height <= 0) return;

    const scrolled = (scrollTarget.scrollTop / height) * 100;

    topBar.style.width = scrolled + "%";
    sideBar.style.width = scrolled + "%";
    percent.textContent = Math.round(scrolled) + "%";
  });
}
