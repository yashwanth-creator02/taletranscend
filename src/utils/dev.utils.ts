// src/utils/dev.utils.ts
// Developer-only utilities and initialization.

import { IS_DEV_MODE } from '@config/app.config.js';

/**
 * Global developer flag.
 */
declare global {
  interface Window {
    __TT_DEV__: boolean;
  }
}

/**
 * Initializes developer mode if the toggle is enabled in the environment.
 * Surfaces a console announcement and sets a global flag.
 */
export function initDevMode(): void {
  if (IS_DEV_MODE) {
    window.__TT_DEV__ = true;

    // Inject Dev Badge
    const badge = document.createElement('div');
    badge.className = 'dev-badge';
    badge.innerHTML = `
      <span class="dev-badge__indicator animate-pulse"></span>
      <span class="dev-badge__label">Dev Mode Active</span>
    `;
    document.body.appendChild(badge);

    // Cinematic console announcement
    console.log(
      '%c[TaleTranscend] %cDev Mode Active %c✦ %cNeural link established.',
      'color: #6366f1; font-weight: 900; font-family: serif; font-size: 14px;',
      'color: #e2e8f0; font-weight: 500; font-family: sans-serif; font-size: 14px;',
      'color: #6366f1; font-weight: bold; font-size: 14px;',
      'color: #64748b; font-style: italic; font-size: 12px;'
    );

    console.log(
      '%c🛠 Commands available: %cwindow.__TT_DEV__',
      'color: #94a3b8; font-weight: bold; font-size: 11px;',
      'color: #6366f1; font-family: monospace; font-size: 11px;'
    );
  }
}
