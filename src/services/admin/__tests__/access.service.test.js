// src/services/admin/__tests__/access.service.test.js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@fb/index.js';
import { getAuthorStatus } from '../../author.service.js';
import {
  DASHBOARD_MODULES,
  canAccessModule,
  defaultModuleFor,
  getAllowedModules,
  resolveDashboardAccess,
  roleLabel,
} from '../access.service.js';

vi.mock('../../author.service.js', () => ({
  getAuthorStatus: vi.fn(),
}));

function userWithClaims(claims) {
  return {
    uid: 'user-1',
    getIdTokenResult: vi.fn().mockResolvedValue({ claims }),
  };
}

describe('admin access service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.currentUser = null;
    vi.mocked(getAuthorStatus).mockResolvedValue({ isAuthor: false });
  });

  it('treats a signed-out visitor as a guest without dashboard access', async () => {
    const access = await resolveDashboardAccess(null);
    expect(access).toMatchObject({ role: 'guest', canEnter: false, isStaff: false });
    expect(getAllowedModules(access)).toEqual([]);
  });

  it('resolves an administrator from the custom claim', async () => {
    const access = await resolveDashboardAccess(userWithClaims({ admin: true }));
    expect(access).toMatchObject({ role: 'admin', isAdmin: true, isStaff: true, canEnter: true });
    expect(getAllowedModules(access).map((m) => m.id)).toEqual(DASHBOARD_MODULES.map((m) => m.id));
    expect(canAccessModule(access, 'content')).toBe(true);
    expect(canAccessModule(access, 'comments')).toBe(true);
    expect(defaultModuleFor(access)).toBe('overview');
  });

  it('resolves a moderator and denies administrator-only modules', async () => {
    const access = await resolveDashboardAccess(userWithClaims({ moderator: true }));
    expect(access).toMatchObject({
      role: 'moderator',
      isModerator: true,
      isStaff: true,
      canEnter: true,
    });
    expect(canAccessModule(access, 'reports')).toBe(true);
    expect(canAccessModule(access, 'comments')).toBe(true);
    expect(canAccessModule(access, 'content')).toBe(false);
    expect(canAccessModule(access, 'users')).toBe(false);
    expect(canAccessModule(access, 'audit')).toBe(false);
  });

  it('never elevates from the profile role field alone', async () => {
    const user = userWithClaims({});
    user.role = 'admin';
    const access = await resolveDashboardAccess(user);
    expect(access.role).toBe('user');
    expect(access.canEnter).toBe(false);
    expect(getAllowedModules(access)).toEqual([]);
  });

  it('lets a recognised author enter only the author studio', async () => {
    vi.mocked(getAuthorStatus).mockResolvedValue({ isAuthor: true });
    const access = await resolveDashboardAccess(userWithClaims({}));
    expect(access).toMatchObject({ role: 'author', isAuthor: true, canEnter: true });
    expect(getAllowedModules(access).map((m) => m.id)).toEqual(['author']);
    expect(defaultModuleFor(access)).toBe('author');
  });

  it('fails closed when the ID token cannot be read', async () => {
    const user = {
      uid: 'user-2',
      getIdTokenResult: vi.fn().mockRejectedValue(new Error('offline')),
    };
    const access = await resolveDashboardAccess(user);
    expect(access.role).toBe('user');
    expect(access.canEnter).toBe(false);
    expect(getAuthorStatus).not.toHaveBeenCalled();
  });

  it('labels each role for the shell and audit entries', () => {
    expect(roleLabel('guest')).toBe('Visitor');
    expect(roleLabel('user')).toBe('Reader');
    expect(roleLabel('author')).toBe('Chronicler');
    expect(roleLabel('moderator')).toBe('Moderator');
    expect(roleLabel('admin')).toBe('Administrator');
  });
});
