// src/services/admin/__tests__/session.service.test.js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSignedInUser, getStaffIdentity, requireSignedInUser } from '../session.service.js';

vi.mock('@fb/index.js', () => ({
  auth: { currentUser: null },
}));

/** @param {{ claims?: Record<string, unknown>, fail?: boolean }} options */
function makeUser({ claims = {}, fail = false } = {}) {
  return {
    uid: 'staff-uid',
    email: 'staff@example.com',
    displayName: 'Archive Staff',
    getIdTokenResult: vi.fn(async () => {
      if (fail) throw new Error('token unavailable');
      return { claims };
    }),
  };
}

describe('admin session service', () => {
  beforeEach(async () => {
    const { auth } = await import('@fb/index.js');
    auth.currentUser = null;
  });

  it('rejects when no account is signed in', async () => {
    await expect(getStaffIdentity()).rejects.toThrow(/sign in/i);
    expect(() => requireSignedInUser()).toThrow(/sign in/i);
    expect(getSignedInUser()).toBeNull();
  });

  it('resolves an administrator from the force-refreshed claim', async () => {
    const { auth } = await import('@fb/index.js');
    const user = makeUser({ claims: { admin: true } });
    auth.currentUser = user;

    const identity = await getStaffIdentity();

    expect(user.getIdTokenResult).toHaveBeenCalledWith(true);
    expect(identity).toEqual({
      uid: 'staff-uid',
      role: 'admin',
      email: 'staff@example.com',
      displayName: 'Archive Staff',
    });
  });

  it('resolves a moderator and prefers admin when both claims exist', async () => {
    const { auth } = await import('@fb/index.js');
    auth.currentUser = makeUser({ claims: { moderator: true } });
    expect((await getStaffIdentity()).role).toBe('moderator');

    auth.currentUser = makeUser({ claims: { admin: true, moderator: true } });
    expect((await getStaffIdentity()).role).toBe('admin');
  });

  it('rejects a signed-in account without a staff claim', async () => {
    const { auth } = await import('@fb/index.js');
    auth.currentUser = makeUser({ claims: {} });
    await expect(getStaffIdentity()).rejects.toThrow(/staff claim/i);
  });

  it('rejects when the token cannot be refreshed', async () => {
    const { auth } = await import('@fb/index.js');
    auth.currentUser = makeUser({ fail: true });
    await expect(getStaffIdentity()).rejects.toThrow(/verify staff credentials/i);
  });

  it('returns any signed-in user for owner-scoped actions', async () => {
    const { auth } = await import('@fb/index.js');
    const user = makeUser();
    auth.currentUser = user;
    expect(requireSignedInUser()).toBe(user);
  });
});
