// js/reader/theme.js
import { READER_FONTS,applyReaderFont, loadReaderFont } from "../../core/ui/font.registry.js";

export function initTheme() {
  const saved = localStorage.getItem("reader-theme") || "dark";
  setTheme(saved);
}

export function setTheme(theme) {
  document.body.classList.remove("theme-sepia", "theme-light");
  document.querySelectorAll(".theme-btn").forEach(b => b.classList.remove("active"));

  if (theme === "sepia") document.body.classList.add("theme-sepia");
  if (theme === "light") document.body.classList.add("theme-light");

  document.querySelectorAll(".theme-btn").forEach(btn => {
    if (btn.getAttribute("onclick")?.includes(`'${theme}'`)) {
      btn.classList.add("active");
    }
  });

  localStorage.setItem("reader-theme", theme);
}

export function initFont() {
  const container = document.getElementById("font-controls");
  if (!container) return;

  container.innerHTML = "";

  Object.entries(READER_FONTS).forEach(([key, font]) => {
    const btn = document.createElement("button");
    btn.className = "font-btn";
    btn.textContent = font.label;
    btn.dataset.font = key;

    btn.addEventListener("click", () => {
      applyReaderFont(key);
      markActiveFont(key);
    });

    container.appendChild(btn);
  });

  const savedFont = loadReaderFont();
  applyReaderFont(savedFont);
  markActiveFont(savedFont);
}


/* ================= UI helpers ================= */

function markActiveFont(activeKey) {
  document.querySelectorAll(".font-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.font === activeKey);
  });
}



export function updateSize(val) {
  document.documentElement.style.setProperty("--reader-size", val + "px");
  localStorage.setItem("reader-size", val);
}
