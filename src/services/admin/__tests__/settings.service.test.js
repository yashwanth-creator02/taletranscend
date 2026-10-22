// src/services/admin/__tests__/settings.service.test.js
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getAppConfig, setFeatureFlag } from '../settings.service.js';
import { writeAdminAuditLog } from '../audit.service.js';

vi.mock('../audit.service.js', () => ({
  writeAdminAuditLog: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@fb/index.js', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

vi.mock('@fb/refs.js', () => ({
  refs: {
    appConfig: vi.fn(),
    featureFlag: vi.fn(),
  },
}));

describe('settings service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty object when no config exists', async () => {
    const { getDoc } = await import('@fb/index.js');
    getDoc.mockResolvedValue({ exists: () => false, data: () => ({}) });

    const config = await getAppConfig();
    expect(config).toEqual({});
  });

  it('writes an audit log when toggling a feature flag', async () => {
    const { setDoc } = await import('@fb/index.js');
    setDoc.mockResolvedValue(undefined);

    await setFeatureFlag('betaAccess', true);

    expect(writeAdminAuditLog).toHaveBeenCalled();
    expect(writeAdminAuditLog.mock.calls[0][0]).toMatchObject({
      action: 'featureFlag.update',
      targetType: 'featureFlag',
      targetId: 'betaAccess',
    });
  });
});
