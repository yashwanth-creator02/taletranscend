// js/reader/theme.js
import { READER_FONTS, applyReaderFont, loadReaderFont } from '@core/ui/font.registry.js';

/* ==================== Theme Initialization ==================== */

/**
 * Initializes the reader theme on page load.
 * Loads the saved theme from localStorage or defaults to 'dark'.
 */
export function initTheme() {
  const saved = localStorage.getItem('reader-theme') || 'dark';
  setTheme(saved);
}

/**
 * Sets the reader theme.
 *
 * @param {string} theme - Theme key ('dark', 'light', 'sepia')
 */
export function setTheme(theme) {
  // Remove previous theme classes
  document.body.classList.remove('theme-sepia', 'theme-light');

  // Reset active state on all theme buttons
  document.querySelectorAll('.theme-btn').forEach((b) => b.classList.remove('active'));

  // Apply new theme
  if (theme === 'sepia') document.body.classList.add('theme-sepia');
  if (theme === 'light') document.body.classList.add('theme-light');

  // Highlight active button in UI
  document.querySelectorAll('.theme-btn').forEach((btn) => {
    if (btn.getAttribute('onclick')?.includes(`'${theme}'`)) {
      btn.classList.add('active');
    }
  });

  // Persist selection
  localStorage.setItem('reader-theme', theme);
}

/* ==================== Font Initialization ==================== */

/**
 * Initializes the font selection controls in the reader UI.
 * Creates buttons for each available font and applies the saved font.
 */
export function initFont() {
  const container = document.getElementById('font-controls');
  if (!container) return;

  container.innerHTML = '';

  // Create buttons for each font
  Object.entries(READER_FONTS).forEach(([key, font]) => {
    const btn = document.createElement('button');
    btn.className = 'font-btn';
    btn.textContent = font.label;
    btn.dataset.font = key;

    // Apply font on click
    btn.addEventListener('click', () => {
      applyReaderFont(key);
      markActiveFont(key);
    });

    container.appendChild(btn);
  });

  // Apply saved font
  const savedFont = loadReaderFont();
  applyReaderFont(savedFont);
  markActiveFont(savedFont);
}

/* ==================== UI Helpers ==================== */

/**
 * Highlights the currently active font button in the reader UI.
 *
 * @param {string} activeKey - Key of the active font
 */
function markActiveFont(activeKey) {
  document.querySelectorAll('.font-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.font === activeKey);
  });
}

/**
 * Updates the reader text size and saves the preference.
 *
 * @param {number} val - Font size in pixels
 */
export function updateSize(val) {
  document.documentElement.style.setProperty('--reader-size', val + 'px');
  localStorage.setItem('reader-size', val);
}
