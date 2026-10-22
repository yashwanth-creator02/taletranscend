// src/services/admin/settings.service.js
import { getDoc, setDoc, updateDoc } from '@fb/index.js';
import { refs } from '@fb/refs.js';
import { writeAdminAuditLog } from './audit.service.js';

export async function getAppConfig() {
  const snap = await getDoc(refs.appConfig());
  if (!snap.exists()) return {};
  return snap.data();
}

export async function setAppConfig(field, value) {
  await updateDoc(refs.appConfig(), { [field]: value, updatedAt: new Date().toISOString() });
  await writeAdminAuditLog({
    actorId: 'admin',
    actorRole: 'admin',
    action: 'settings.update',
    targetType: 'appConfig',
    targetId: field,
    summary: `Updated ${field}`,
  });
}

export async function getFeatureFlags() {
  const flags = {};
  // Read a known set of feature flag IDs
  const knownFlags = ['betaAccess', 'darkMode', 'newReaderFlow', 'enhancedSearch'];
  await Promise.all(
    knownFlags.map(async (flagId) => {
      const snap = await getDoc(refs.featureFlag(flagId));
      if (snap.exists()) flags[flagId] = snap.data();
    })
  );
  return flags;
}

export async function setFeatureFlag(flagId, enabled) {
  await setDoc(refs.featureFlag(flagId), {
    enabled,
    updatedAt: new Date().toISOString(),
  });
  await writeAdminAuditLog({
    actorId: 'admin',
    actorRole: 'admin',
    action: 'featureFlag.update',
    targetType: 'featureFlag',
    targetId: flagId,
    summary: `Flag ${flagId} set to ${enabled}`,
  });
}
