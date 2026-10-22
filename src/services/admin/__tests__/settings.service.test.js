// src/services/admin/__tests__/settings.service.test.js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FEATURE_FLAG_DEFINITIONS,
  MAX_FEATURE_FLAGS,
  getAppConfig,
  getFeatureFlags,
  setAppConfig,
  setFeatureFlag,
} from '../settings.service.js';
import { getDoc, getDocs, limit, query, setDoc, serverTimestamp } from '@fb/index.js';
import { refs } from '@fb/refs.js';
import { writeAdminAuditLog } from '../audit.service.js';
import { getStaffIdentity } from '../session.service.js';

vi.mock('@fb/index.js', () => ({
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn((value) => ({ type: 'limit', value })),
  query: vi.fn((...args) => ({ type: 'query', args })),
  serverTimestamp: vi.fn(() => 'SERVER_TS'),
  setDoc: vi.fn(),
}));

vi.mock('@fb/refs.js', () => ({
  refs: {
    appConfig: vi.fn(() => 'appConfig/site'),
    featureFlags: vi.fn(() => 'featureFlags'),
    featureFlag: vi.fn((id) => `featureFlags/${id}`),
  },
}));

vi.mock('../audit.service.js', () => ({
  writeAdminAuditLog: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../session.service.js', () => ({
  getStaffIdentity: vi.fn(),
}));

describe('settings service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serverTimestamp.mockReturnValue('SERVER_TS');
    getStaffIdentity.mockResolvedValue({
      uid: 'admin-1',
      role: 'admin',
      email: 'admin@example.com',
      displayName: 'Archive Admin',
    });
  });

  it('returns an empty object when the config document is missing', async () => {
    getDoc.mockResolvedValue({ exists: () => false });

    await expect(getAppConfig()).resolves.toEqual({});
  });

  it('returns the stored config document', async () => {
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ siteName: 'TaleTranscend' }) });

    await expect(getAppConfig()).resolves.toEqual({ siteName: 'TaleTranscend' });
  });

  it('merges the four known flags with every stored flag using a bounded query', async () => {
    getDocs.mockResolvedValue({
      docs: [
        { id: 'darkMode', data: () => ({ enabled: true }) },
        { id: 'customFlag', data: () => ({ enabled: true, updatedAt: 'stored-ts' }) },
      ],
    });

    const flags = await getFeatureFlags();

    expect(query).toHaveBeenCalledWith('featureFlags', { type: 'limit', value: MAX_FEATURE_FLAGS });
    expect(limit).toHaveBeenCalledWith(MAX_FEATURE_FLAGS);
    for (const definition of FEATURE_FLAG_DEFINITIONS) {
      expect(flags[definition.id]).toMatchObject({
        label: definition.label,
        description: definition.description,
      });
    }
    expect(flags.betaAccess.enabled).toBe(false);
    expect(flags.darkMode.enabled).toBe(true);
    expect(flags.newReaderFlow.enabled).toBe(false);
    expect(flags.enhancedSearch.enabled).toBe(false);
    expect(flags.customFlag).toMatchObject({
      id: 'customFlag',
      label: 'customFlag',
      enabled: true,
      updatedAt: 'stored-ts',
    });
  });

  it('merges appConfig/site with the real administrator identity', async () => {
    setDoc.mockResolvedValue(undefined);

    await setAppConfig('siteName', 'TaleTranscend');

    expect(getStaffIdentity).toHaveBeenCalled();
    expect(refs.appConfig).toHaveBeenCalled();
    expect(setDoc).toHaveBeenCalledWith(
      'appConfig/site',
      { siteName: 'TaleTranscend', updatedAt: 'SERVER_TS' },
      { merge: true }
    );
    expect(writeAdminAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-1',
        actorRole: 'admin',
        action: 'settings.update',
        targetType: 'appConfig',
        targetId: 'siteName',
      })
    );
  });

  it('merges a feature flag with the real administrator identity', async () => {
    setDoc.mockResolvedValue(undefined);

    await setFeatureFlag('betaAccess', true);

    expect(setDoc).toHaveBeenCalledWith(
      'featureFlags/betaAccess',
      { enabled: true, updatedAt: 'SERVER_TS' },
      { merge: true }
    );
    expect(writeAdminAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-1',
        actorRole: 'admin',
        action: 'featureFlag.update',
        targetType: 'featureFlag',
        targetId: 'betaAccess',
      })
    );
  });

  it('refuses a settings write from a moderator before touching Firestore', async () => {
    getStaffIdentity.mockResolvedValue({
      uid: 'moderator-1',
      role: 'moderator',
      email: 'mod@example.com',
      displayName: 'Moderator',
    });

    await expect(setFeatureFlag('betaAccess', true)).rejects.toThrow(/administrator/i);
    await expect(setAppConfig('siteName', 'Changed')).rejects.toThrow(/administrator/i);

    expect(setDoc).not.toHaveBeenCalled();
    expect(writeAdminAuditLog).not.toHaveBeenCalled();
  });

  it('refuses an empty configuration key or flag id', async () => {
    await expect(setAppConfig('   ', 'value')).rejects.toThrow(/configuration key/i);
    await expect(setFeatureFlag('', true)).rejects.toThrow(/feature flag ID/i);

    expect(setDoc).not.toHaveBeenCalled();
  });
});
