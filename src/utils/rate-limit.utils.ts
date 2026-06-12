// src/utils/rate-limit.utils.ts
/**
 * Simple client-side rate limiting to prevent UI spam and Firestore quota abuse.
 * Keeps track of the last execution time for various action keys.
 */

const _lastActionTimes = new Map<string, number>();

/**
 * Checks if an action is allowed based on a cooldown period.
 *
 * @param key - Unique identifier for the action (e.g., 'comment:user123')
 * @param cooldownMs - Cooldown duration in milliseconds
 * @returns {boolean} True if the action is allowed, false if rate-limited
 */
export function checkRateLimit(key: string, cooldownMs: number): boolean {
  const now = Date.now();
  const lastTime = _lastActionTimes.get(key) || 0;

  if (now - lastTime < cooldownMs) {
    return false;
  }

  _lastActionTimes.set(key, now);
  return true;
}

/**
 * Gets the remaining cooldown time for a specific key.
 *
 * @param key - Unique identifier for the action
 * @param cooldownMs - Cooldown duration in milliseconds
 * @returns {number} Remaining time in milliseconds (0 if not rate-limited)
 */
export function getRemainingTime(key: string, cooldownMs: number): number {
  const now = Date.now();
  const lastTime = _lastActionTimes.get(key) || 0;
  const elapsed = now - lastTime;

  return Math.max(0, cooldownMs - elapsed);
}

/**
 * Resets the rate limit for a specific key.
 * Useful if an action fails and you want to let the user try again immediately.
 */
export function resetRateLimit(key: string): void {
  _lastActionTimes.delete(key);
}
