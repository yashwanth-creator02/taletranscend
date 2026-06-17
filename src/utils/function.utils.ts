// src/utils/function.utils.ts
// Pure function utilities — debounce, throttle, once.

import { createLogger } from './logger.ts';

const log = createLogger('FunctionUtils');

/**
 * Returns a debounced version of a function.
 *
 * @param fn - Function to debounce
 * @param wait - Delay in milliseconds
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/**
 * Returns a throttled version of a function that fires at most once per `wait` ms.
 *
 * @param fn - Function to throttle
 * @param wait - Minimum interval in milliseconds
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let last = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      fn(...args);
    }
  };
}

/**
 * Returns a version of a function that only executes on the first call.
 *
 * @param fn - Function to wrap
 */
export function once<T extends (...args: unknown[]) => unknown>(
  fn: T
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let called = false;
  let result: ReturnType<T> | undefined;
  return (...args: Parameters<T>) => {
    if (!called) {
      called = true;
      result = fn(...args) as ReturnType<T>;
    }
    return result;
  };
}

log.debug('FunctionUtils initialized');
