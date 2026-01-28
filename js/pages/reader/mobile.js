// js/reader/mobile.js

/**
 * Initializes the mobile drawer for the reader interface.
 * Toggles the drawer open/closed when the drawer button is clicked.
 */
export function initMobileDrawer() {
  const drawer = document.getElementById('mobile-drawer'); // Drawer element
  const btn = document.getElementById('drawer-btn'); // Button to toggle drawer

  // Exit early if elements are not found
  if (!drawer || !btn) return;

  // Toggle the 'open' class on click
  btn.addEventListener('click', () => {
    drawer.classList.toggle('open');
  });
}
