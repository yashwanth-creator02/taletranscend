// src/utils/network.utils.ts
// Listens for browser online/offline events and broadcasts to the app.

import { createLogger } from './logger.ts';

const log = createLogger('NetworkUtils');

/**
 * Initializes listeners for window online/offline events.
 * Adds/removes 'is-offline' class on document.body for CSS hooks.
 */
export function initNetworkListeners(): void {
  window.addEventListener('offline', () => {
    log.warn('[network] Offline');
    document.body.classList.add('is-offline');
  });

  window.addEventListener('online', () => {
    log.info('[network] Online');
    document.body.classList.remove('is-offline');
  });

  // Initial check
  if (!navigator.onLine) {
    document.body.classList.add('is-offline');
  }
}

log.debug('NetworkUtils initialized');
