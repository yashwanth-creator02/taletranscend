// src/ui/components/nav/nav.global.js
//
// Mounts global shortcut handlers so that quick-action tools (Command Palette / Ctrl+K)
// are accessible everywhere across the entire application, even on standalone pages
// (Reader, Shelf, Tale Detail, Studio, Login) where full #app-nav is not rendered.

import { createLogger } from '@/utils';

const log = createLogger('GlobalPalette');

let _globalPaletteInitialized = false;

/**
 * Ensures the command palette DOM and styling are mounted, then toggles it.
 */
export async function toggleGlobalCommandPalette() {
  if (typeof document === 'undefined') return;

  const palette = document.getElementById('nav-command-palette');

  if (!palette) {
    log.info('Mounting command palette dynamically for standalone view');

    // 1. Ensure nav CSS is present in head
    const hasNavCss = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some((l) =>
      l.getAttribute('href')?.includes('nav.css')
    );

    if (!hasNavCss) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/src/assets/css/nav.css';
      document.head.appendChild(link);
    }

    // 2. Build and mount command palette markup
    const { buildCommandPalette } = await import('./nav.templates.js');
    const container = document.createElement('div');
    container.id = 'standalone-palette-container';
    container.innerHTML = buildCommandPalette();
    document.body.appendChild(container.firstElementChild);

    // 3. Attach event delegation listeners
    const { attachGlobalListeners } = await import('./nav.interactions.js');
    attachGlobalListeners();
  }

  // 4. Open palette
  const { openCommandPalette, closeCommandPalette } = await import('./nav.command-palette.js');
  const { navState } = await import('./nav.state.js');

  if (navState.commandPaletteOpen) {
    closeCommandPalette(true);
  } else {
    openCommandPalette(true);
  }
}

/**
 * Initializes global keyboard capture for Cmd/Ctrl+K across all pages.
 */
export function initGlobalPaletteShortcut() {
  if (typeof window === 'undefined' || _globalPaletteInitialized) return;
  _globalPaletteInitialized = true;

  window.addEventListener(
    'keydown',
    (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        e.stopPropagation();
        toggleGlobalCommandPalette();
      }
    },
    { capture: true }
  );

  log.debug('Global Ctrl+K palette listener attached');
}
