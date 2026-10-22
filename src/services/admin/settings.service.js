// src/services/admin/settings.service.js
// Site configuration and feature-flag reads/writes for the administrator-only
// settings module. Every write resolves the real staff identity before it runs,
// so the audit trail can never claim a role the caller does not hold.

import { getDoc, getDocs, limit, query, serverTimestamp, setDoc } from '@fb/index.js';
import { refs } from '@fb/refs.js';
import { writeAdminAuditLog } from './audit.service.js';
import { getStaffIdentity } from './session.service.js';

/** The feature flags the dashboard always shows, even before a document exists. */
export const FEATURE_FLAG_DEFINITIONS = Object.freeze([
  {
    id: 'betaAccess',
    label: 'Beta Access',
    description: 'Offers the beta reading experience to invited readers.',
  },
  {
    id: 'darkMode',
    label: 'Dark Mode',
    description: 'Enables the archive-wide dark appearance.',
  },
  {
    id: 'newReaderFlow',
    label: 'New Reader Flow',
    description: 'Routes readers through the redesigned chapter reader.',
  },
  {
    id: 'enhancedSearch',
    label: 'Enhanced Search',
    description: 'Enables richer filters in archive search.',
  },
]);

/**
 * A flag collection is configuration, not a content archive. This bound keeps
 * one malformed response from turning the settings screen into an unbounded read.
 */
export const MAX_FEATURE_FLAGS = 50;

/** @returns {Record<string, {id: string, label: string, description: string, enabled: boolean, updatedAt: unknown}>} */
function buildDefaultFeatureFlags() {
  return Object.fromEntries(
    FEATURE_FLAG_DEFINITIONS.map(({ id, label, description }) => [
      id,
      { id, label, description, enabled: false, updatedAt: null },
    ])
  );
}

/**
 * Resolve the signed-in staff identity and require the administrator claim.
 * Reading settings is public, but every write is administrator-only in the rules.
 * @returns {Promise<{uid: string, role: 'admin' | 'moderator'}>}
 */
async function requireAdministrator() {
  const identity = await getStaffIdentity();
  if (identity.role !== 'admin') {
    throw new Error('Only an administrator may change site settings.');
  }
  return identity;
}

/**
 * Read the public site configuration document.
 * @returns {Promise<Record<string, unknown>>}
 */
export async function getAppConfig() {
  const snap = await getDoc(refs.appConfig());
  if (!snap.exists()) return {};
  return snap.data() ?? {};
}

/**
 * Write one site configuration field. `merge: true` creates appConfig/site when
 * it does not exist yet instead of failing on a missing document.
 *
 * @param {string} field
 * @param {unknown} value
 * @returns {Promise<void>}
 */
export async function setAppConfig(field, value) {
  const key = String(field ?? '').trim();
  if (!key) throw new Error('A configuration key is required.');

  const identity = await requireAdministrator();
  await setDoc(refs.appConfig(), { [key]: value, updatedAt: serverTimestamp() }, { merge: true });
  await writeAdminAuditLog({
    actorId: identity.uid,
    actorRole: identity.role,
    action: 'settings.update',
    targetType: 'appConfig',
    targetId: key,
    summary: `Updated site setting ${key}.`,
  });
}

/**
 * Read every stored feature flag with a bounded query, then merge the known
 * flags so a missing document still appears as an explicit disabled default.
 *
 * @returns {Promise<Record<string, {id: string, label: string, description: string, enabled: boolean, updatedAt: unknown}>>}
 */
export async function getFeatureFlags() {
  const snap = await getDocs(query(refs.featureFlags(), limit(MAX_FEATURE_FLAGS)));
  const flags = buildDefaultFeatureFlags();

  for (const docSnap of snap.docs) {
    const id = docSnap.id;
    if (!id) continue;
    const data = docSnap.data() ?? {};
    const known = flags[id];
    flags[id] = {
      id,
      label: known?.label ?? id,
      description: known?.description ?? 'Custom feature flag stored in Firestore.',
      enabled: data.enabled === true,
      updatedAt: data.updatedAt ?? null,
    };
  }

  return flags;
}

/**
 * Enable or disable one feature flag. `merge: true` creates the flag document
 * when it is missing, and the write is audited under the real caller.
 *
 * @param {string} flagId
 * @param {boolean} enabled
 * @returns {Promise<{ id: string, enabled: boolean }>}
 */
export async function setFeatureFlag(flagId, enabled) {
  const id = String(flagId ?? '').trim();
  if (!id) throw new Error('A feature flag ID is required.');

  const identity = await requireAdministrator();
  const nextEnabled = enabled === true;

  await setDoc(
    refs.featureFlag(id),
    { enabled: nextEnabled, updatedAt: serverTimestamp() },
    { merge: true }
  );
  await writeAdminAuditLog({
    actorId: identity.uid,
    actorRole: identity.role,
    action: 'featureFlag.update',
    targetType: 'featureFlag',
    targetId: id,
    summary: `Set feature flag ${id} to ${nextEnabled ? 'enabled' : 'disabled'}.`,
  });

  return { id, enabled: nextEnabled };
}
