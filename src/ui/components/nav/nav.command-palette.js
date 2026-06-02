// src/ui/components/nav/nav.command-palette.js
//
// Manages the command palette: open/close state, list rendering,
// fuzzy filtering, keyboard navigation (arrow keys + Enter), and
// command execution (navigation + sign out).
//
// Depends on:
//   nav.config.js  — BASE_COMMANDS
//   nav.utils.js   — getNavElements, getCurrentPage, renderIcons
//   nav.state.js   — read currentUser, commandPaletteOpen flag

import { auth, signOut } from '@fb/index.js';
import { BASE_COMMANDS } from './nav.config.js';
import { getNavElements, getCurrentPage, renderIcons } from './nav.utils.js';
import { navState } from './nav.state.js';
import { escapeText as escapeHtml } from '@/utils';

/* ─────────────────────────────────────────────
   Command Item Builders
   ───────────────────────────────────────────── */

/**
 * Returns the full list of available commands for the current auth state.
 * Auth-sensitive items (Sign In / Sign Out) are appended dynamically.
 *
 * @returns {Array<Object>}
 */
function getCommandItems() {
  const commands = [...BASE_COMMANDS];

  if (navState.currentUser) {
    commands.push({
      action: 'signout',
      icon: 'log-out',
      label: 'Sign Out',
      keywords: ['logout', 'sign out', 'exit', 'leave'],
    });
  } else {
    commands.push({
      href: 'profile.html',
      icon: 'log-in',
      label: 'Sign In',
      keywords: ['login', 'sign in', 'account'],
    });
  }

  return commands;
}

/**
 * Builds the HTML for a single command palette item.
 *
 * @param {{ href?: string, action?: string, icon: string, label: string, shortcut?: string }} item
 * @param {string} current - Current page filename
 * @param {boolean} isFocused - Whether this item has keyboard focus
 * @returns {string}
 */
function buildCommandItem(item, current, isFocused = false) {
  const isActive = item.href ? item.href === current : false;
  const hrefAttr = item.href ? `data-href="${item.href}"` : '';
  const actionAttr = item.action ? `data-action="${item.action}"` : '';

  let classes = 'command-item';
  if (isActive) classes += ' command-item--active';
  if (isFocused) classes += ' is-focused';

  return `
    <button
      type="button"
      class="${classes}"
      role="option"
      aria-selected="${isActive ? 'true' : 'false'}"
      ${hrefAttr}
      ${actionAttr}
      tabindex="-1"
    >
      <span class="command-item__icon-wrap" aria-hidden="true">
        <i data-lucide="${item.icon}" class="command-item__icon"></i>
      </span>
      <span class="command-item__label">${escapeHtml(item.label)}</span>
      ${item.shortcut ? `<span class="command-item__shortcut" aria-label="Shortcut: ${item.shortcut}">${item.shortcut}</span>` : ''}
      ${isActive ? '<span class="command-item__badge">Current</span>' : ''}
    </button>
  `;
}

/* ─────────────────────────────────────────────
   List Rendering
   ───────────────────────────────────────────── */

/**
 * Filters and renders command items into the palette list.
 * Uses simple substring matching across label + keywords.
 *
 * @param {string} [query='']
 */
export function renderCommandList(query = '') {
  const { commandList } = getNavElements();
  if (!commandList) return;

  const current = getCurrentPage();
  const normalized = query.trim().toLowerCase();
  const focusedIndex = navState.commandFocusedIndex;

  const filtered = getCommandItems().filter((item) => {
    if (!normalized) return true;
    const searchable = [item.label, ...(item.keywords || [])].join(' ').toLowerCase();
    return searchable.includes(normalized);
  });

  navState.commandFilteredItems = filtered;

  if (!filtered.length) {
    commandList.innerHTML = `
      <div class="command-empty" role="status" aria-live="polite">
        No results for "<strong>${escapeHtml(query)}</strong>"
      </div>
    `;
    renderIcons(commandList);
    return;
  }

  commandList.innerHTML = filtered
    .map((item, i) => buildCommandItem(item, current, i === focusedIndex))
    .join('');

  renderIcons(commandList);
}

/* ─────────────────────────────────────────────
   Open / Close
   ───────────────────────────────────────────── */

/**
 * Opens the command palette, resets query and focus index,
 * renders the full item list, and optionally focuses the input.
 *
 * @param {boolean} [focusInput=true]
 */
export function openCommandPalette(focusInput = true) {
  const { commandPalette, commandInput } = getNavElements();
  if (!commandPalette) return;

  navState.commandPaletteOpen = true;
  navState.commandFocusedIndex = -1;
  navState.commandFilteredItems = [];

  commandPalette.hidden = false;
  commandPalette.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden'; // Prevent background scroll

  if (commandInput) commandInput.value = '';
  renderCommandList('');

  if (focusInput && commandInput) {
    window.requestAnimationFrame(() => commandInput.focus());
  }
}

/**
 * Closes the command palette and restores background scroll.
 *
 * @param {boolean} [returnFocus=true]
 */
export function closeCommandPalette(returnFocus = true) {
  const { commandPalette, commandButton, commandButtonMobile } = getNavElements();
  if (!commandPalette) return;

  navState.commandPaletteOpen = false;
  navState.commandFocusedIndex = -1;

  commandPalette.hidden = true;
  commandPalette.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';

  if (returnFocus) {
    const trigger = commandButton ?? commandButtonMobile;
    trigger?.focus?.();
  }
}

/* ─────────────────────────────────────────────
   Keyboard Navigation (Arrow Keys)
   ───────────────────────────────────────────── */

/**
 * Moves keyboard focus within the command list.
 * Wraps around at both ends.
 *
 * @param {'up' | 'down'} direction
 */
export function moveFocus(direction) {
  const { commandInput } = getNavElements();
  const items = navState.commandFilteredItems;
  if (!items.length) return;

  const len = items.length;
  let next = navState.commandFocusedIndex;

  if (direction === 'down') {
    next = next < len - 1 ? next + 1 : 0;
  } else {
    next = next > 0 ? next - 1 : len - 1;
  }

  navState.commandFocusedIndex = next;
  renderCommandList(commandInput?.value ?? '');

  // Scroll focused item into view
  const focusedEl = document.querySelector('.command-item.is-focused');
  focusedEl?.scrollIntoView({ block: 'nearest' });
}

/* ─────────────────────────────────────────────
   Command Execution
   ───────────────────────────────────────────── */

/**
 * Executes the command represented by a given DOM button element.
 * Navigates to href or triggers a named action.
 *
 * @param {HTMLElement} element
 */
export async function executeCommand(element) {
  const href = element.dataset.href;
  const action = element.dataset.action;

  closeCommandPalette(false);

  if (href) {
    window.location.href = href;
    return;
  }

  if (action === 'signout') {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('[nav] Sign out failed:', error);
    }
  }
}

/**
 * Executes the currently keyboard-focused command item (on Enter keypress).
 * Falls back to the first visible item if nothing is focused.
 */
export function executeActiveFocusedItem() {
  const idx = navState.commandFocusedIndex;
  const items = document.querySelectorAll('.command-item');
  const target = idx >= 0 ? items[idx] : items[0];

  if (target instanceof HTMLElement) {
    executeCommand(target);
  }
}
