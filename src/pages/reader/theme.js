// src/pages/reader/theme.js
// Manages reader theme selection and font controls.
// Persists preferences to localStorage and applies them on init.

import { READER_FONTS, applyReaderFont, loadReaderFont } from '@ui/font.registry.js';

/* ==================== Theme ==================== */

/**
 * Initializes the reader theme from localStorage.
 * Defaults to 'dark' if no preference is saved.
 */
export function initTheme() {
  const saved = localStorage.getItem('reader-theme') || 'dark';
  setTheme(saved);
}

/**
 * Applies a theme to the reader by toggling body classes
 * and highlighting the matching theme button.
 *
 * @param {string} theme - Theme key: 'dark', 'light', or 'sepia'
 */
export function setTheme(theme) {
  // Remove any existing theme classes
  document.body.classList.remove('theme-sepia', 'theme-light');

  // Reset active state on all theme buttons
  document.querySelectorAll('.theme-btn').forEach((b) => b.classList.remove('active'));

  if (theme === 'sepia') document.body.classList.add('theme-sepia');
  if (theme === 'light') document.body.classList.add('theme-light');

  // Mark the matching button as active
  document.querySelectorAll('.theme-btn').forEach((btn) => {
    if (btn.getAttribute('onclick')?.includes(`'${theme}'`)) {
      btn.classList.add('active');
    }
  });

  localStorage.setItem('reader-theme', theme);
}

/* ==================== Font ==================== */

/**
 * Initializes font selection controls in the reader UI.
 * Creates a button for each available font and applies the saved preference.
 */
export function initFont() {
  const container = document.getElementById('font-controls');
  if (!container) return;

  container.innerHTML = '';

  Object.entries(READER_FONTS).forEach(([key, font]) => {
    const btn = document.createElement('button');
    btn.className = 'font-btn';
    btn.textContent = font.label;
    btn.dataset.font = key;

    btn.addEventListener('click', () => {
      applyReaderFont(key);
      markActiveFont(key);
    });

    container.appendChild(btn);
  });

  // Apply and highlight the saved font preference
  const savedFont = loadReaderFont();
  applyReaderFont(savedFont);
  markActiveFont(savedFont);
}

/**
 * Updates the font size CSS variable and persists the preference.
 *
 * @param {number} val - Font size value in pixels
 */
export function updateSize(val) {
  document.documentElement.style.setProperty('--reader-size', val + 'px');
  localStorage.setItem('reader-size', val);
}

/* ==================== Helpers ==================== */

/**
 * Marks the active font button and removes active state from all others.
 *
 * @param {string} activeKey - Key of the currently active font
 */
function markActiveFont(activeKey) {
  document.querySelectorAll('.font-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.font === activeKey);
  });
}
