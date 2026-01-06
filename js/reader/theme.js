// js/reader/theme.js

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
  const font = localStorage.getItem("reader-font") || "serif";
  setFont(font);

  const size = localStorage.getItem("reader-size");
  if (size) {
    document.documentElement.style.setProperty("--reader-size", size + "px");
  }
}

export function setFont(font) {
  const map = {
    serif: "'Crimson Pro', serif",
    sans: "'Plus Jakarta Sans', sans-serif",
    mono: "'JetBrains Mono', monospace"
  };

  document.documentElement.style.setProperty("--reader-font", map[font]);
  document.querySelectorAll(".font-btn").forEach(b => b.classList.remove("active"));
  document
    .querySelectorAll(`.font-btn[onclick="setFont('${font}')"]`)
    .forEach(b => b.classList.add("active"));

  localStorage.setItem("reader-font", font);
}

export function updateSize(val) {
  document.documentElement.style.setProperty("--reader-size", val + "px");
  localStorage.setItem("reader-size", val);
}
