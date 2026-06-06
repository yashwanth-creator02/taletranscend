// src/utils/network.utils.ts
// Listens for browser online/offline events and broadcasts to the app.

/**
 * Initializes listeners for window online/offline events.
 * Adds/removes 'is-offline' class on document.body for CSS hooks.
 */
export function initNetworkListeners(): void {
  window.addEventListener('offline', () => {
    console.warn('[network] Offline');
    document.body.classList.add('is-offline');
  });

  window.addEventListener('online', () => {
    console.info('[network] Online');
    document.body.classList.remove('is-offline');
  });

  // Initial check
  if (!navigator.onLine) {
    document.body.classList.add('is-offline');
  }
}
