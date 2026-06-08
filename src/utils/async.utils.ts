// src/utils/async.utils.ts
// Wraps async operations with consistent error handling and user feedback.

import { showToast } from '@ui/components/toast.js';

interface SafeAsyncOptions<T> {
  onError?: (err: any) => void;
  fallback?: T;
  logContext?: string;
  errorMessage?: string;
}

/**
 * Robust async wrapper for consistent error handling across the app.
 * Resolves CB-002 by ensuring no 'naked' awaits crash the application.
 *
 * @param promise - The async operation to protect
 * @param options - Configuration for fallbacks, logging, and callbacks
 */
export async function safeAsync<T>(
  promise: Promise<T>,
  options: SafeAsyncOptions<T> = {}
): Promise<T> {
  const {
    onError,
    fallback = null as unknown as T,
    logContext = 'async.op',
    errorMessage,
  } = options;

  try {
    return await promise;
  } catch (err) {
    console.error(`[${logContext}] Failure:`, err);

    if (errorMessage) {
      showToast(errorMessage, 'error');
    }

    if (onError) {
      onError(err);
    }

    return fallback;
  }
}

/**
 * @deprecated Use safeAsync instead.
 */
export async function safeCall<T>(
  promise: Promise<T>,
  fallback: T,
  errorMessage: string = 'Something went wrong. Please try again.',
  silent: boolean = false
): Promise<T> {
  return safeAsync(promise, {
    fallback,
    errorMessage: silent ? undefined : errorMessage,
    logContext: 'legacy.safeCall',
  });
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
