// src/pages/admin/admin.state.js
// Page-local mutable state for the admin shell. Modules receive their own
// access snapshot and never read or mutate this object directly.

/**
 * @typedef {{
 *   role: 'guest' | 'user' | 'author' | 'moderator' | 'admin',
 *   isAdmin: boolean,
 *   isModerator: boolean,
 *   isAuthor: boolean,
 *   isStaff: boolean,
 *   canEnter: boolean
 * }} AdminAccess
 */

/** @type {{ access: AdminAccess | null, activeModule: string | null, cleanup: (() => void) | null, mounted: boolean }} */
export const adminState = {
  access: null,
  activeModule: null,
  cleanup: null,
  mounted: false,
};

/** Reset page-local state. Used by tests and by a full teardown. */
export function resetAdminState() {
  adminState.cleanup?.();
  adminState.access = null;
  adminState.activeModule = null;
  adminState.cleanup = null;
  adminState.mounted = false;
}
