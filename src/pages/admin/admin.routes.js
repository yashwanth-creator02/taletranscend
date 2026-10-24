// src/pages/admin/admin.routes.js
// Pure hash-route resolution for the admin shell. Keeping this out of admin.js
// lets the router be tested without Firebase, the DOM, or lazy module imports.

import { canAccessModule } from '@services/admin/access.service.js';

/**
 * Extract the first path segment from a dashboard hash.
 * Accepts `#/users`, `#users`, and `#/users/abc`; returns null for the home
 * route and for hashes that do not contain a module slug.
 *
 * @param {string} [hash]
 * @returns {string | null}
 */
export function moduleIdFromHash(hash = '') {
  const match = String(hash ?? '').match(/^#\/?([a-z][a-z0-9-]*)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

/**
 * Resolve the requested hash against the signed-in role.
 *
 * `denied` is true when the hash names a section the role may not open. That
 * includes unknown module ids: the shell shows one generic denial state rather
 * than leaking which sections exist.
 *
 * @param {{ role: string, canEnter?: boolean }} access
 * @param {string} [hash]
 * @returns {{ requested: string | null, active: string | null, denied: boolean }}
 */
export function resolveAdminRoute(access, hash = '') {
  const raw = String(hash ?? '').trim();
  const requested = moduleIdFromHash(raw);
  if (!requested) {
    const isHome = raw === '' || raw === '#' || raw === '#/';
    return {
      requested: isHome ? null : raw,
      active: null,
      denied: !isHome,
    };
  }
  if (canAccessModule(access, requested)) {
    return { requested, active: requested, denied: false };
  }
  return { requested, active: null, denied: true };
}
