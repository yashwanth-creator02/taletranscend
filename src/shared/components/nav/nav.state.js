// src/shared/nav/nav.state.js
//
// Centralised mutable state for the navigation system.
// A single plain object acts as a shared store — lightweight,
// no framework required, easy to reason about.
//
// All nav sub-modules import this object and mutate it directly.
// It is never exported from the public nav.js entry point.

/**
 * @typedef {Object} NavState
 * @property {import('firebase/auth').User | null} currentUser     - The currently authenticated Firebase user, or null.
 * @property {boolean}                             commandPaletteOpen - Whether the command palette overlay is visible.
 * @property {number}                              commandFocusedIndex - Index of the keyboard-focused command item (-1 = none).
 * @property {Array<Object>}                       commandFilteredItems - Current filtered command item list (set by renderCommandList).
 * @property {boolean}                             listenersAttached - Whether global document listeners are active.
 * @property {(() => void) | null}                 scrollCleanup     - Cleanup function returned by initScrollBehavior.
 * @property {(() => void) | null}                 unsubscribeAuth   - Firebase onAuthStateChanged unsubscribe function.
 */

/** @type {NavState} */
export const navState = {
  currentUser: null,
  commandPaletteOpen: false,
  commandFocusedIndex: -1,
  commandFilteredItems: [],
  listenersAttached: false,
  scrollCleanup: null,
  unsubscribeAuth: null,
};
