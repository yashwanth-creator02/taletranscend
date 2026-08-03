// src/shared/nav/nav.js
//
// ┌─────────────────────────────────────────────────────────────────┐
// │  TaleTranscend — Shared Navigation Component                    │
// │                                                                 │
// │  Public API:                                                    │
// │    initNav()    — Inject nav, wire listeners, start auth watch  │
// │    destroyNav() — Tear everything down (SPA route changes etc.) │
// │                                                                 │
// │  Usage (every page entry file):                                 │
// │    import { initNav } from '@shared/components/nav/nav.js';         │
// │    initNav();                                                   │
// └─────────────────────────────────────────────────────────────────┘
//
// Internal architecture:
//   nav.config.js          — Link/command data (pure config)
//   nav.state.js           — Shared mutable state singleton
//   nav.utils.js           — Pure helper functions
//   nav.templates.js       — HTML string builders (no side effects)
//   nav.styles.js          — CSS injection (idempotent)
//   nav.command-palette.js — Palette open/close/filter/execute
//   nav.interactions.js    — Event listeners, scroll, auth sync

import { auth, onAuthStateChanged } from '@fb/index.js';

import { navState } from './nav.state.js';
import { buildNav } from './nav.templates.js';
import { renderIcons } from './nav.utils.js';
import { attachGlobalListeners, detachGlobalListeners, updateNavUser } from './nav.interactions.js';
import { createLogger } from '@/utils';

const log = createLogger('Nav');

/* ─────────────────────────────────────────────
   Public lifecycle API
   ───────────────────────────────────────────── */

/**
 * Bootstraps the shared navigation component.
 *
 * Order of operations:
 *   1. Render the full nav HTML shell at the top of <body>
 *   2. Initialise Lucide icons within the new markup
 *   3. Attach global event listeners (click, keydown, scroll)
 *   4. Subscribe to Firebase auth state — swaps user area on resolve
 *
 * Safe to call multiple times — subsequent calls are no-ops if the
 * nav element already exists in the DOM.
 */
export function initNav() {
  // Guard: Check if either component is already mounted
  if (document.getElementById('app-nav') || document.getElementById('mobile-dock-container'))
    return;

  log.info('Initializing Navigation');

  // 1. Build HTML and destructure parts
  const { headerHtml, dockHtml } = buildNav();

  // 3. Mount Header at the top of <body>
  document.body.insertAdjacentHTML('afterbegin', headerHtml);

  // 4. Mount Dock at the very end of <body> (Ensures true fixed positioning)
  document.body.insertAdjacentHTML('beforeend', dockHtml);

  // 5. Initialize Lucide icons
  renderIcons();

  // 6. Attach global event listeners
  attachGlobalListeners();

  // 7. Subscribe to Firebase auth state
  navState.unsubscribeAuth?.();
  navState.unsubscribeAuth = onAuthStateChanged(auth, updateNavUser);
}

/**
 * Tears down the navigation component completely.
 *
 * - Unsubscribes from Firebase auth
 * - Removes global event listeners + scroll handler
 * - Removes the nav DOM element and its style tag
 * - Resets all shared state
 *
 * Call this when doing SPA-style full teardown, or in tests.
 */
export function destroyNav() {
  log.info('Destroying Navigation');
  // Unsubscribe Firebase auth listener
  navState.unsubscribeAuth?.();
  navState.unsubscribeAuth = null;

  // Remove DOM listeners
  detachGlobalListeners();

  // Remove both DOM nodes
  document.getElementById('app-nav')?.remove();
  document.getElementById('mobile-dock-container')?.remove(); // Cleanup the dock too
  document.getElementById('app-nav-styles')?.remove();

  // Reset runtime state
  navState.currentUser = null;
  navState.commandPaletteOpen = false;
  navState.commandFocusedIndex = -1;
  navState.commandFilteredItems = [];
}
