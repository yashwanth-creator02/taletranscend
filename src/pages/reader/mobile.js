// src/pages/reader/mobile.js
// Handles mobile-specific UI behavior for the reader page.

/**
 * Initializes the mobile drawer toggle.
 * Toggles the open class on the drawer when the drawer button is clicked.
 * Exits silently if either element is not present in the DOM.
 */
export function initMobileDrawer() {
  const drawer = document.getElementById('mobile-drawer');
  const btn = document.getElementById('drawer-btn');

  if (!drawer || !btn) return;

  btn.addEventListener('click', () => {
    drawer.classList.toggle('open');
  });
}
