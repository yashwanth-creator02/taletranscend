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
//   nav.templates.js        — buildBrandMark, buildAuthenticatedUser, buildGuestUser
//   nav.command-palette.js  — open/close/execute helpers

import { signOutAndForget, upgradeAnonymousToGoogle } from '@fb/index.js';
import { navState } from './nav.state.js';
import { getNavElements, renderIcons, getCurrentPage } from './nav.utils.js';
import { USER_LINKS } from './nav.config.js';
import { buildBrandMark, buildAuthenticatedUser, buildGuestUser } from './nav.templates.js';
import { showToast } from '@ui/components/toast.js';
import { createLogger } from '@/utils';
import {
  openCommandPalette,
  closeCommandPalette,
  executeCommand,
  executeActiveFocusedItem,
  moveFocus,
  renderCommandList,
} from './nav.command-palette.js';
import {
  toggleNotificationsPopover,
  closeNotificationsPopover,
  initNotifications,
  destroyNotifications,
  updateNotificationBadge,
  loadAndRenderNotifications,
  toggleNotificationPin,
} from './notifications.popover.js';
import { markAllNotificationsAsRead } from '@services/notification.service.js';

const log = createLogger('NavInteractions');

/* ─────────────────────────────────────────────
   Dropdown
   ───────────────────────────────────────────── */

/**
 * Opens the account dropdown and updates aria-expanded.
 */
export function openDropdown() {
  const { menuButton, dropdown } = getNavElements();
  if (!menuButton || !dropdown) return;

  // A hide animation still in flight must not swallow this open.
  window.clearTimeout(navState.dropdownHideTimer);
  navState.dropdownHideTimer = null;

  dropdown.hidden = false;
  dropdown.classList.remove('is-closing');
  menuButton.setAttribute('aria-expanded', 'true');
}

/**
 * Closes the account dropdown with an exit animation.
 *
 * @param {boolean} [returnFocus=true]
 */
export function closeDropdown(returnFocus = true) {
  const { menuButton, dropdown } = getNavElements();
  if (!menuButton || !dropdown || dropdown.hidden) return;

  menuButton.setAttribute('aria-expanded', 'false');
  dropdown.classList.add('is-closing');

  navState.dropdownHideTimer = window.setTimeout(() => {
    navState.dropdownHideTimer = null;
    dropdown.hidden = true;
    dropdown.classList.remove('is-closing');
    if (returnFocus) menuButton.focus();
  }, 220);
}

/**
 * Toggles the account dropdown.
 */
function toggleDropdown() {
  const { menuButton } = getNavElements();
  if (!menuButton) return;

  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
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

  // ── Command palette clear button ──────────────
  if (target.closest('#nav-command-clear')) {
    event.preventDefault();
    const { commandInput } = getNavElements();
    if (commandInput) {
      commandInput.value = '';
      renderCommandList('');
      commandInput.focus();
    }
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

  // ── Notification pin toggle ────────────────────
  if (target.closest('.nav-notifications-item__pin')) {
    event.preventDefault();
    const pinBtn = target.closest('.nav-notifications-item__pin');
    if (pinBtn instanceof HTMLElement && pinBtn.dataset.notificationId) {
      toggleNotificationPin(pinBtn.dataset.notificationId);
    }
    return;
  }

  // ── Notifications bell button ─────────────────
  if (target.closest('#nav-notifications-btn')) {
    event.preventDefault();
    toggleNotificationsPopover();
    return;
  }

  // ── Notifications mark read button ─────────────
  if (target.closest('#nav-notifications-mark-read')) {
    event.preventDefault();
    if (navState.currentUser?.uid) {
      markAllNotificationsAsRead(navState.currentUser.uid).then(() => {
        updateNotificationBadge(0);
        loadAndRenderNotifications(navState.currentUser.uid);
      });
    }
    return;
  }

  // ── Click outside notifications popover ────────
  if (!target.closest('#nav-notifications-container')) {
    closeNotificationsPopover();
  }

  // ── Brand menu button (account dropdown trigger) ──
  if (target.closest('#nav-menu-btn')) {
    event.preventDefault();
    toggleDropdown();
    return;
  }

  // ── Sign Out button (dropdown) ─────────────────
  if (target.closest('#signout-btn')) {
    event.preventDefault();
    closeDropdown(false);
    signOutAndForget().catch((err) => log.error('Sign out error', err));
    return;
  }

  // ── Secure Account button (dropdown) ───────────
  if (target.closest('#nav-upgrade-btn')) {
    event.preventDefault();
    closeDropdown(false);
    upgradeAnonymousToGoogle()
      .then(() => {
        showToast('Account secured with Google!', 'success');
      })
      .catch((err) => {
        if (err.code !== 'auth/popup-closed-by-user') {
          log.error('Upgrade error', err);
          showToast('Account link failed. Try again.', 'error');
        }
      });
    return;
  }

  // ── Click outside dropdown ─────────────────────
  const { menuButton, dropdown } = getNavElements();
  if (dropdown && menuButton) {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    if (isOpen && !dropdown.contains(target) && !menuButton.contains(target)) {
      closeDropdown(false);
    }
  }
}

/* ─────────────────────────────────────────────
   Keyboard Handling
   ───────────────────────────────────────────── */

/**
 * Global keydown handler.
 * Handles:
 *   - Cmd/Ctrl+K (toggle palette)
 *   - Cmd/Ctrl+A (select all in focused inputs/textareas)
 *   - Slash "/" (quick search jump when not typing)
 *   - Tab (focus trapping in active dialogs)
 *   - Escape (clear search query / close modals & dropdown)
 *   - Arrow keys, Home, End, Enter (palette & dropdown navigation)
 *
 * @param {KeyboardEvent} event
 */
function handleDocumentKeydown(event) {
  // ── Cmd/Ctrl + A — select all in focused input/textarea ──
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      target.select();
    }
  }

  // ── Cmd/Ctrl + K — toggle command palette ──────
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    navState.commandPaletteOpen ? closeCommandPalette(true) : openCommandPalette(true);
    return;
  }

  // ── Focus Trap for Command Palette ────────────
  if (navState.commandPaletteOpen && event.key === 'Tab') {
    const { commandPalette } = getNavElements();
    if (commandPalette) {
      // Only real tab stops participate: command items (arrow-key model) and
      // the clear control are `tabindex="-1"`, so they must never resolve as
      // the trap's first or last element.
      const focusables = Array.from(
        commandPalette.querySelectorAll(
          'button:not([disabled]):not([tabindex="-1"]), [href]:not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"])'
        )
      ).filter((el) => el instanceof HTMLElement && el.offsetParent !== null);

      if (focusables.length > 0) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            event.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            event.preventDefault();
          }
        }
      }
    }
    return;
  }

  // ── Escape ─────────────────────────────────────
  if (event.key === 'Escape') {
    if (navState.commandPaletteOpen) {
      const { commandInput } = getNavElements();
      // If search box has text, first Escape clears it
      if (commandInput && document.activeElement === commandInput && commandInput.value) {
        event.preventDefault();
        commandInput.value = '';
        renderCommandList('');
        return;
      }
      closeCommandPalette(true);
      return;
    }

    const notifPopover = document.getElementById('nav-notifications-popover');
    if (notifPopover && !notifPopover.classList.contains('hidden')) {
      closeNotificationsPopover(true);
      return;
    }

    const { menuButton } = getNavElements();
    if (menuButton?.getAttribute('aria-expanded') === 'true') {
      closeDropdown(true);
      return;
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
      executeActiveFocusedItem();
      return;
    }
  }

  // ── Arrow navigation inside user dropdown ──────
  const { menuButton, dropdown } = getNavElements();
  const isDropdownOpen = menuButton?.getAttribute('aria-expanded') === 'true';

  if (isDropdownOpen && dropdown && !dropdown.hidden) {
    const menuItems = Array.from(
      dropdown.querySelectorAll('a[role="menuitem"], button[role="menuitem"]')
    ).filter((el) => el instanceof HTMLElement && !el.hasAttribute('disabled'));

    if (menuItems.length > 0) {
      const currentIndex = menuItems.indexOf(document.activeElement);

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const nextIndex = currentIndex < menuItems.length - 1 ? currentIndex + 1 : 0;
        menuItems[nextIndex].focus();
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : menuItems.length - 1;
        menuItems[prevIndex].focus();
        return;
      }
      if (event.key === 'Home') {
        event.preventDefault();
        menuItems[0].focus();
        return;
      }
      if (event.key === 'End') {
        event.preventDefault();
        menuItems[menuItems.length - 1].focus();
        return;
      }
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
 * It uses event capturing to listen for scroll events from any scrollable
 * container (supporting the independent scrolling system).
 *
 * @returns {() => void} Cleanup function to remove the listener.
 */
export function initScrollBehavior() {
  const nav = document.getElementById('app-nav');
  if (!nav) return () => {};

  const onScroll = (e) => {
    // If we have a scroll container, use it; otherwise fallback to document
    const target =
      e && e.target !== document ? e.target : document.scrollingElement || document.documentElement;

    // Only track scroll if it's the main scroll container or the document
    // This prevents sidebar scrolls from affecting the main progress bar
    const isMainScroll =
      target === document.documentElement ||
      target === document.body ||
      target === document.scrollingElement ||
      target.classList.contains('scroll-container');

    if (!isMainScroll) return;

    const scrollY = target.scrollTop ?? window.scrollY;
    const scrollHeight = target.scrollHeight ?? document.documentElement.scrollHeight;
    const clientHeight = target.clientHeight ?? window.innerHeight;

    const docHeight = scrollHeight - clientHeight;
    const progress = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;

    // Use a small threshold for is-scrolled state
    nav.classList.toggle('is-scrolled', scrollY > 20);
    nav.style.setProperty('--scroll-progress', progress.toFixed(2));
  };

  // Listen with capture: true to catch scroll events from containers that don't bubble
  window.addEventListener('scroll', onScroll, { passive: true, capture: true });
  onScroll(); // Set initial state

  return () => window.removeEventListener('scroll', onScroll, { capture: true });
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
  // Subscription and timer cleanup runs unconditionally: destroyNav() must not
  // leak snapshot listeners just because the DOM listeners were never attached.
  destroyNotifications();
  window.clearTimeout(navState.dropdownHideTimer);
  navState.dropdownHideTimer = null;
  navState.scrollCleanup?.();
  navState.scrollCleanup = null;

  if (!navState.listenersAttached) return;

  document.removeEventListener('click', handleDocumentClick);
  document.removeEventListener('keydown', handleDocumentKeydown);

  const { commandInput } = getNavElements();
  commandInput?.removeEventListener('input', handleCommandInput);

  navState.listenersAttached = false;
}

/* ─────────────────────────────────────────────
   Auth → DOM Sync
   ───────────────────────────────────────────── */

/**
 * Called on every Firebase auth state change.
 * Replaces the user area in the desktop header. The mobile dock is
 * auth-independent, so it is not rebuilt here.
 *
 * @param {import('firebase/auth').User | null} user
 */
export function updateNavUser(user) {
  navState.currentUser = user;
  navState.isStaff = false;

  const { nav, navUser } = getNavElements();
  if (!nav || !navUser) return;

  const current = getCurrentPage();

  // Swap desktop user area: avatar profile link (member) or Sign In CTA (guest)
  navUser.outerHTML = user ? buildAuthenticatedUser(user) : buildGuestUser();

  // Swap the brand slot: account menu trigger + dropdown for members,
  // plain home link for guests
  const brandAnchor = document.getElementById('nav-brand-anchor');
  if (brandAnchor) {
    brandAnchor.innerHTML = buildBrandMark(user, current, USER_LINKS);
  }

  // The mobile dock is auth-independent (Home, Library, Shelf), so it is
  // rendered once by buildNav() and needs no rebuild here.

  initNotifications(user);
  renderIcons();

  // Refresh command list if palette is open (adds/removes Sign In/Out item)
  if (navState.commandPaletteOpen) {
    const { commandInput } = getNavElements();
    renderCommandList(commandInput?.value ?? '');
  }

  // Custom claims are the only UI source for staff navigation. Resolve them
  // after the first paint so an anonymous or ordinary reader never waits on
  // a network round-trip for a link they cannot use. A failed claim read
  // leaves isStaff false; Firestore rules still decide every real operation.
  if (!user || typeof user.getIdTokenResult !== 'function') return;
  const claimUser = user;
  user
    .getIdTokenResult()
    .then((result) => {
      if (navState.currentUser !== claimUser) return;
      const claims = result?.claims ?? {};
      const isStaff = claims.admin === true || claims.moderator === true;
      if (navState.isStaff === isStaff) return;
      navState.isStaff = isStaff;

      const anchor = document.getElementById('nav-brand-anchor');
      if (anchor) {
        anchor.innerHTML = buildBrandMark(claimUser, current, USER_LINKS, isStaff);
        renderIcons();
      }
      if (navState.commandPaletteOpen) {
        const { commandInput } = getNavElements();
        renderCommandList(commandInput?.value ?? '');
      }
    })
    .catch((err) => {
      log.warn('Could not resolve staff claims; hiding the staff link', err);
    });
}
