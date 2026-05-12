// src/ui/components/nav/nav.utils.js
//
// Shared utility functions used across all nav sub-modules.
// Pure, side-effect-free helpers — safe to import anywhere.

/**
 * Returns the filename of the current page (e.g. 'library.html').
 * Falls back to 'index.html' for root paths.
 *
 * @returns {string}
 */
export function getCurrentPage() {
  return window.location.pathname.split('/').pop() || 'index.html';
}

/**
 * Safely escapes a string for HTML injection.
 *
 * @param {string} value
 * @returns {string}
 */
export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Derives a deterministic, URL-safe avatar seed from a Firebase user object.
 * Uses the first 8 characters of the UID, or 'guest' for unauthenticated users.
 *
 * @param {import('firebase/auth').User | null} user
 * @returns {string}
 */
export function getAvatarSeed(user) {
  return user?.uid ? user.uid.slice(0, 8) : 'guest';
}

/**
 * Safely triggers lucide icon rendering within a given scope.
 * No-ops silently if Lucide has not been loaded on the page.
 *
 * @param {ParentNode} [scope=document]
 */
export function renderIcons(scope = document) {
  if (!window.lucide || typeof window.lucide.createIcons !== 'function') return;
  try {
    window.lucide.createIcons();
  } catch {
    // Icon rendering is cosmetic — never let it crash the app.
  }
}

/**
 * Returns a cached map of the nav's key DOM elements.
 * Always queries the live DOM — safe to call after any innerHTML swap.
 *
 * @returns {{
 *   nav: HTMLElement | null,
 *   navUser: HTMLElement | null,
 *   avatarButton: HTMLButtonElement | null,
 *   dropdown: HTMLElement | null,
 *   commandButton: HTMLButtonElement | null,
 *   commandButtonMobile: HTMLButtonElement | null,
 *   commandPalette: HTMLElement | null,
 *   commandInput: HTMLInputElement | null,
 *   commandList: HTMLElement | null,
 *   commandClose: HTMLButtonElement | null,
 * }}
 */
export function getNavElements() {
  return {
    nav: document.getElementById('app-nav'),
    navUser: document.getElementById('nav-user'),
    avatarButton: document.getElementById('avatar-btn'),
    dropdown: document.getElementById('user-dropdown'),
    commandButton: document.getElementById('nav-command-button'),
    commandButtonMobile: document.getElementById('nav-command-button-mobile'),
    commandPalette: document.getElementById('nav-command-palette'),
    commandInput: document.getElementById('nav-command-input'),
    commandList: document.getElementById('nav-command-list'),
    commandClose: document.getElementById('nav-command-close'),
  };
}
