// src/services/auth-memory.storage.js
// Browser-storage record of the visitor's authentication memory.
//
// Why this exists: the first-visit login gate used to infer "returning
// visitor" from a generic visit flag plus a `firebase:authUser` probe against
// localStorage. That key is the Firebase v8 format — the modern SDK persists
// sessions in IndexedDB (`firebaseLocalStorageDb`), so the probe could never
// match and the gate re-appeared for anyone who left the login page without
// completing a login.
//
// This module keeps one explicit record instead:
//   - durable (localStorage)   -> remembered across browser restarts
//   - session (sessionStorage) -> remembered until the browser closes
// Unchecking "Keep me signed in" writes the session record and clears the
// durable one, so the login page is allowed to return in a later session.
//
// The record is deliberately small and versioned so a future shape change can
// be detected rather than misread.

import { createLogger } from '../utils/logger.ts';

const log = createLogger('AuthMemory');

/** Storage key. Lives in whichever area the record's scope requires. */
export const AUTH_MEMORY_KEY = 'tt_auth';

/**
 * Legacy "has visited" flag written by older builds and by
 * `markUserVisited()`. Still honoured on read so existing browsers keep
 * working after this change, and cleared whenever the durable memory is.
 */
export const HAS_VISITED_KEY = 'tt_has_visited';

/** Record schema version. */
export const AUTH_MEMORY_VERSION = 1;

/**
 * Returns the requested storage area, or null when unavailable
 * (SSR, or a browser where storage access throws).
 *
 * @param {boolean} durable
 * @returns {Storage|null}
 */
function storageArea(durable) {
  if (typeof window === 'undefined') return null;
  try {
    return durable ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Reads and validates a record out of one storage area.
 *
 * @param {Storage|null} area
 * @returns {Object|null}
 */
function readRecord(area) {
  if (!area) return null;
  try {
    const raw = area.getItem(AUTH_MEMORY_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.v !== AUTH_MEMORY_VERSION) return null;

    return parsed;
  } catch {
    // Corrupt or unreadable records are treated as absent, never thrown.
    return null;
  }
}

/**
 * Returns the remembered auth record, preferring the durable one.
 *
 * @returns {{v: number, uid: string|null, anonymous: boolean, method: string, at: number, scope: 'local'|'session'}|null}
 */
export function getAuthMemory() {
  const durableRecord = readRecord(storageArea(true));
  if (durableRecord) return { ...durableRecord, scope: 'local' };

  const sessionRecord = readRecord(storageArea(false));
  if (sessionRecord) return { ...sessionRecord, scope: 'session' };

  return null;
}

/**
 * True when any auth memory exists, durable or session-scoped.
 *
 * @returns {boolean}
 */
export function hasAuthMemory() {
  return getAuthMemory() !== null;
}

/**
 * Writes the auth memory record, clearing the opposite storage area so the
 * two can never disagree about the visitor's remembered state.
 *
 * The clear happens only after the write succeeds. A blocked or full storage
 * area then cannot leave the visitor with no memory at all.
 *
 * @param {{uid?: string|null, anonymous?: boolean, method?: string}} record
 * @param {{durable?: boolean}} [options]
 * @returns {Object|null} The record that was written (with `scope` resolved),
 *   or null when the write failed.
 */
export function rememberAuth(record = {}, { durable = true } = {}) {
  const payload = {
    v: AUTH_MEMORY_VERSION,
    uid: record.uid ?? null,
    anonymous: record.anonymous ?? false,
    method: record.method ?? 'unknown',
    at: Date.now(),
  };

  let written = false;

  try {
    const target = storageArea(durable);
    if (target) {
      target.setItem(AUTH_MEMORY_KEY, JSON.stringify(payload));
      written = true;
    }
  } catch (err) {
    log.warn('Could not persist auth memory:', err?.message || err);
  }

  if (written) {
    try {
      storageArea(!durable)?.removeItem(AUTH_MEMORY_KEY);
    } catch {
      // Ignore storage restrictions
    }
  }

  return written ? { ...payload, scope: durable ? 'local' : 'session' } : null;
}

/**
 * Reports whether the visitor is currently remembered durably.
 *
 * Restoring a session must never change how long the visitor asked to be
 * remembered: a session-only login stays session-only when another page
 * loads it, and vice versa.
 *
 * @param {boolean} [fallback=true] Value used when nothing is remembered yet.
 * @returns {boolean}
 */
export function isRememberedDurably(fallback = true) {
  const existing = getAuthMemory();
  return existing ? existing.scope === 'local' : fallback;
}

/**
 * Forgets the auth memory. Defaults to clearing both scopes, which is what
 * sign-out and account deletion want.
 *
 * Clearing the durable scope also removes the legacy visit flag, so the
 * first-visit login gate can engage again.
 *
 * @param {{durable?: boolean, session?: boolean}} [options]
 */
export function clearAuthMemory({ durable = true, session = true } = {}) {
  try {
    if (durable) {
      const area = storageArea(true);
      area?.removeItem(AUTH_MEMORY_KEY);
      area?.removeItem(HAS_VISITED_KEY);
    }
    if (session) {
      storageArea(false)?.removeItem(AUTH_MEMORY_KEY);
    }
  } catch {
    // Ignore storage restrictions
  }
}

log.debug('Auth memory storage initialized');
