// src/utils/async.utils.ts
// Wraps async operations with consistent error handling and user feedback.

import { showToast } from '@ui/components/toast.js';

/**
 * Wraps a promise with error handling.
 * On failure, shows a toast and returns the fallback value.
 * Optionally suppresses the toast for silent background ops.
 *
 * @param promise - The async operation
 * @param fallback - Value to return on failure
 * @param errorMessage - Human-readable message for the toast
 * @param silent - If true, no toast is shown (for background syncs)
 * @returns Promise resolving to the result or fallback
 */
export async function safeCall<T>(
  promise: Promise<T>,
  fallback: T,
  errorMessage: string = 'Something went wrong. Please try again.',
  silent: boolean = false
): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    console.error('[safeCall]', err);
    if (!silent) showToast(errorMessage, 'error');
    return fallback;
  }
}

/**
 * Returns true if the browser is currently offline.
 */
export function isOffline(): boolean {
  return !navigator.onLine;
}

/**
 * Shows an offline warning toast if the browser is offline.
 * Returns true if offline (caller should abort the network operation).
 */
export function guardOffline(): boolean {
  if (!navigator.onLine) {
    showToast('You are offline. Changes will sync when connection returns.', 'warning');
    return true;
  }
  return false;
}
