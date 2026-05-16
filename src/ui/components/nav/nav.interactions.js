// src/ui/components/nav/nav.interactions.js
//
// Wires all interactive behaviour to the nav:
//   - Global click delegation (dropdown, command palette, sign out)
//   - Keyboard shortcuts (Cmd/Ctrl+K, Escape, Arrow keys, Enter)
//   - Scroll-aware styling and progress bar
//   - Auth state → DOM updates
//
// Depends on:
//   nav.state.js            — shared mutable state
//   nav.utils.js            — getNavElements, renderIcons, getCurrentPage
//   nav.templates.js        — buildAuthenticatedUser, buildGuestUser, buildMobileDock
//   nav.command-palette.js  — open/close/execute helpers

import { auth, signOut } from '@fb/index.js';
import { navState } from './nav.state.js';
import { getNavElements, renderIcons, getCurrentPage } from './nav.utils.js';
import { USER_LINKS } from './nav.config.js';
import { buildAuthenticatedUser, buildGuestUser, buildMobileDock } from './nav.templates.js';
import {
  openCommandPalette,
  closeCommandPalette,
  executeCommand,
  executeActiveFocusedItem,
  moveFocus,
  renderCommandList,
} from './nav.command-palette.js';

/* ─────────────────────────────────────────────
   Dropdown
   ───────────────────────────────────────────── */

/**
 * Opens the account dropdown and updates aria-expanded.
 */
export function openDropdown() {
  const { avatarButton, dropdown } = getNavElements();
  if (!avatarButton || !dropdown) return;

  dropdown.hidden = false;
  dropdown.classList.remove('is-closing');
  avatarButton.setAttribute('aria-expanded', 'true');
}

/**
 * Closes the account dropdown with an exit animation.
 *
 * @param {boolean} [returnFocus=true]
 */
export function closeDropdown(returnFocus = true) {
  const { avatarButton, dropdown } = getNavElements();
  if (!avatarButton || !dropdown || dropdown.hidden) return;

  avatarButton.setAttribute('aria-expanded', 'false');
  dropdown.classList.add('is-closing');

  window.setTimeout(() => {
    dropdown.hidden = true;
    dropdown.classList.remove('is-closing');
    if (returnFocus) avatarButton.focus();
  }, 220);
}

/**
 * Toggles the account dropdown.
 */
function toggleDropdown() {
  const { avatarButton } = getNavElements();
  if (!avatarButton) return;

  const isOpen = avatarButton.getAttribute('aria-expanded') === 'true';
  isOpen ? closeDropdown() : openDropdown();
}

/* ─────────────────────────────────────────────
   Click Delegation
   ───────────────────────────────────────────── */

/**
 * Global click handler — routes all nav interactions via event delegation.
 * Keeps the number of addEventListener calls to an absolute minimum.
 *
 * @param {MouseEvent} event
 */
function handleDocumentClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;

  // ── Command palette open triggers ──────────────
  if (target.closest('#nav-command-button') || target.closest('#nav-command-button-mobile')) {
    event.preventDefault();
    openCommandPalette(true);
    return;
  }

  // ── Command palette close triggers ────────────
  if (target.closest('#nav-command-close') || target.closest('[data-command-close]')) {
    event.preventDefault();
    closeCommandPalette(true);
    return;
  }

  // ── Command item click ─────────────────────────
  const commandItem = target.closest('.command-item');
  if (commandItem instanceof HTMLElement) {
    event.preventDefault();
    executeCommand(commandItem);
    return;
  }

  // ── Click outside command panel ────────────────
  const { commandPalette } = getNavElements();
  if (commandPalette && navState.commandPaletteOpen) {
    const panel = commandPalette.querySelector('.command-panel');
    if (panel && !panel.contains(target)) {
      closeCommandPalette(false);
      return;
    }
  }

  // ── Avatar button ──────────────────────────────
  if (target.closest('#avatar-btn')) {
    event.preventDefault();
    toggleDropdown();
    return;
  }

  // ── Sign Out button (dropdown) ─────────────────
  if (target.closest('#signout-btn')) {
    event.preventDefault();
    closeDropdown(false);
    signOut(auth).catch((err) => console.error('[nav] Sign out error:', err));
    return;
  }

  // ── Click outside dropdown ─────────────────────
  const { avatarButton, dropdown } = getNavElements();
  if (dropdown && avatarButton) {
    const isOpen = avatarButton.getAttribute('aria-expanded') === 'true';
    if (isOpen && !dropdown.contains(target) && !avatarButton.contains(target)) {
      closeDropdown(false);
    }
  }
}

/* ─────────────────────────────────────────────
   Keyboard Handling
   ───────────────────────────────────────────── */

/**
 * Global keydown handler.
 * Handles: Cmd/Ctrl+K (toggle palette), Escape, Arrow keys, Enter.
 *
 * @param {KeyboardEvent} event
 */
function handleDocumentKeydown(event) {
  // ── Cmd/Ctrl + K — toggle command palette ──────
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    navState.commandPaletteOpen ? closeCommandPalette(true) : openCommandPalette(true);
    return;
  }

  // ── Escape ─────────────────────────────────────
  if (event.key === 'Escape') {
    if (navState.commandPaletteOpen) {
      closeCommandPalette(true);
      return;
    }

    const { avatarButton } = getNavElements();
    if (avatarButton?.getAttribute('aria-expanded') === 'true') {
      closeDropdown();
    }
    return;
  }

  // ── Arrow navigation inside command palette ────
  if (navState.commandPaletteOpen) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveFocus('down');
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveFocus('up');
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const { commandInput } = getNavElements();
      executeActiveFocusedItem(commandInput?.value ?? '');
      return;
    }
  }
}

/**
 * Input event handler for the command palette search field.
 * Resets focused index on every keystroke so the list always starts fresh.
 *
 * @param {Event} event
 */
function handleCommandInput(event) {
  if (!(event.target instanceof HTMLInputElement)) return;
  navState.commandFocusedIndex = -1;
  renderCommandList(event.target.value);
}

/* ─────────────────────────────────────────────
   Scroll Behaviour
   ───────────────────────────────────────────── */

/**
 * Attaches a passive scroll listener that:
 *   1. Adds `is-scrolled` class after 12px of scroll (for background opacity)
 *   2. Updates `--scroll-progress` CSS variable (powers the progress bar)
 *
 * Uses requestAnimationFrame throttling for performance.
 *
 * @returns {() => void} Cleanup function to remove the listener.
 */
export function initScrollBehavior() {
  const nav = document.getElementById('app-nav');
  if (!nav) return () => {};

  const onScroll = () => {
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;

    // Use a small threshold for is-scrolled state
    nav.classList.toggle('is-scrolled', scrollY > 20);
    nav.style.setProperty('--scroll-progress', progress.toFixed(2));
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // Set initial state

  return () => window.removeEventListener('scroll', onScroll);
}

/* ─────────────────────────────────────────────
   Listener Lifecycle
   ───────────────────────────────────────────── */

/**
 * Attaches all global event listeners exactly once.
 * Guards against double-attachment via navState.listenersAttached.
 */
export function attachGlobalListeners() {
  if (navState.listenersAttached) return;

  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleDocumentKeydown);

  const { commandInput } = getNavElements();
  commandInput?.addEventListener('input', handleCommandInput);

  navState.scrollCleanup = initScrollBehavior();
  navState.listenersAttached = true;
}

/**
 * Removes all global event listeners.
 * Safe to call even if listeners were never attached.
 */
export function detachGlobalListeners() {
  if (!navState.listenersAttached) return;

  document.removeEventListener('click', handleDocumentClick);
  document.removeEventListener('keydown', handleDocumentKeydown);

  const { commandInput } = getNavElements();
  commandInput?.removeEventListener('input', handleCommandInput);

  navState.scrollCleanup?.();
  navState.scrollCleanup = null;
  navState.listenersAttached = false;
}

/* ─────────────────────────────────────────────
   Auth → DOM Sync
   ───────────────────────────────────────────── */

/**
 * Called on every Firebase auth state change.
 * Replaces the user area in the desktop header and re-renders the mobile dock.
 *
 * @param {import('firebase/auth').User | null} user
 */
export function updateNavUser(user) {
  navState.currentUser = user;

  const { nav, navUser } = getNavElements();
  if (!nav || !navUser) return;

  const current = getCurrentPage();

  // Swap desktop user area
  navUser.outerHTML = user ? buildAuthenticatedUser(user, current, USER_LINKS) : buildGuestUser();

  // Re-render mobile dock to reflect auth state (profile icon + label)
  const dockContainer = document.getElementById('mobile-dock-container');
  if (dockContainer) {
    dockContainer.innerHTML = buildMobileDock(current, user);
    renderIcons();
  }

  renderIcons();

  // Refresh command list if palette is open (adds/removes Sign In/Out item)
  if (navState.commandPaletteOpen) {
    const { commandInput } = getNavElements();
    renderCommandList(commandInput?.value ?? '');
  }
}
