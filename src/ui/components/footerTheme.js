// src/ui/components/footerTheme.js
// Segmented theme control toggle for the site footer.
// Renders an icon-only segmented toggle matching the tab-nav design, with hover tooltips.

import {
  applyAppTheme,
  getSavedAppTheme,
  resolveAppTheme,
  APP_THEME_STORAGE_KEY,
} from '@/config/theme.config.js';
import { createLogger } from '@/utils';
import { initIcons } from './icons.js';

const log = createLogger('FooterTheme');

/**
 * Generates the markup for the footer theme toggle.
 * @returns {string} HTML markup
 */
export function buildFooterThemeControl() {
  return `
    <div class="footer-theme-control" id="footer-theme-control" role="radiogroup" aria-label="Interface theme selector">
      <button
        type="button"
        class="footer-theme-control__box"
        data-theme-id="transcendental"
        role="radio"
        aria-checked="false"
        title="Transcendental (Signature Cosmic Dark)"
        aria-label="Transcendental theme"
      >
        <i data-lucide="sparkles" class="footer-theme-control__icon" aria-hidden="true"></i>
      </button>
      <button
        type="button"
        class="footer-theme-control__box"
        data-theme-id="dark"
        role="radio"
        aria-checked="false"
        title="Midnight Dark"
        aria-label="Midnight Dark theme"
      >
        <i data-lucide="moon" class="footer-theme-control__icon" aria-hidden="true"></i>
      </button>
      <button
        type="button"
        class="footer-theme-control__box"
        data-theme-id="light"
        role="radio"
        aria-checked="false"
        title="Illuminated Light"
        aria-label="Illuminated Light theme"
      >
        <i data-lucide="sun" class="footer-theme-control__icon" aria-hidden="true"></i>
      </button>
    </div>
  `.trim();
}

/**
 * Initializes interactions for the footer theme control.
 *
 * @param {HTMLElement|string} [target='#footer-theme-control']
 * @returns {(() => void)|null} Cleanup function to detach listeners
 */
export function initFooterTheme(target = '#footer-theme-control') {
  if (typeof document === 'undefined') return null;

  const container = typeof target === 'string' ? document.querySelector(target) : target;
  if (!container) {
    log.debug('Footer theme control container not found in DOM');
    return null;
  }

  const buttons = Array.from(container.querySelectorAll('[data-theme-id]'));
  if (buttons.length === 0) return null;

  function syncActiveTheme(overrideTheme) {
    const rawTheme =
      overrideTheme ||
      getSavedAppTheme() ||
      document.documentElement.getAttribute('data-app-theme') ||
      '';
    const activeTheme = resolveAppTheme(rawTheme);

    buttons.forEach((btn) => {
      const themeId = btn.getAttribute('data-theme-id');
      const isMatch = themeId === rawTheme || themeId === activeTheme;
      btn.classList.toggle('active', isMatch);
      btn.setAttribute('aria-checked', isMatch ? 'true' : 'false');
      btn.setAttribute('tabindex', isMatch ? '0' : '-1');
    });
  }

  function handleButtonClick(event) {
    const btn = event.currentTarget;
    if (!(btn instanceof HTMLElement)) return;
    const themeId = btn.getAttribute('data-theme-id');
    if (!themeId) return;

    log.info('Theme selected from footer control:', themeId);
    applyAppTheme(themeId);
    syncActiveTheme(themeId);
    btn.focus();
  }

  function handleKeyDown(event) {
    const key = event.key;
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) {
      return;
    }

    event.preventDefault();
    const currentIndex = buttons.findIndex((btn) => btn === document.activeElement);
    let nextIndex = 0;

    if (key === 'ArrowRight' || key === 'ArrowDown') {
      nextIndex = currentIndex >= 0 ? (currentIndex + 1) % buttons.length : 0;
    } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1;
    } else if (key === 'Home') {
      nextIndex = 0;
    } else if (key === 'End') {
      nextIndex = buttons.length - 1;
    }

    const nextBtn = buttons[nextIndex];
    if (nextBtn) {
      const themeId = nextBtn.getAttribute('data-theme-id');
      if (themeId) {
        applyAppTheme(themeId);
        syncActiveTheme(themeId);
      }
      nextBtn.focus();
    }
  }

  buttons.forEach((btn) => {
    btn.addEventListener('click', handleButtonClick);
  });

  container.addEventListener('keydown', handleKeyDown);

  const onThemeChange = () => {
    syncActiveTheme();
  };

  const onStorage = (event) => {
    if (event.key === APP_THEME_STORAGE_KEY) {
      syncActiveTheme();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('appthemechange', onThemeChange);
    window.addEventListener('storage', onStorage);
  }

  syncActiveTheme();
  initIcons(container);

  return function cleanup() {
    buttons.forEach((btn) => {
      btn.removeEventListener('click', handleButtonClick);
    });
    container.removeEventListener('keydown', handleKeyDown);
    if (typeof window !== 'undefined') {
      window.removeEventListener('appthemechange', onThemeChange);
      window.removeEventListener('storage', onStorage);
    }
  };
}
