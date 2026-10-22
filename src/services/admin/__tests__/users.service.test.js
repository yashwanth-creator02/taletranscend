// src/services/admin/__tests__/users.service.test.js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { USER_ROLES, getUserDetail, listUsersPage, updateUserFlags } from '../users.service.js';
import { refs } from '@fb/refs.js';

const mocks = vi.hoisted(() => ({
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  getCountFromServer: vi.fn(),
  query: vi.fn((ref, ...constraints) => ({ ref, constraints })),
  where: vi.fn((field, op, value) => ({ field, op, value })),
  serverTimestamp: vi.fn(() => 'server-timestamp'),
  fetchAdminPage: vi.fn(),
  writeAdminAuditLog: vi.fn(),
  getStaffIdentity: vi.fn(),
  users: vi.fn(() => 'users-collection'),
  user: vi.fn((uid) => `user:${uid}`),
  tales: vi.fn(() => 'tales-collection'),
}));

vi.mock('@fb/index.js', () => ({
  getDoc: mocks.getDoc,
  updateDoc: mocks.updateDoc,
  getCountFromServer: mocks.getCountFromServer,
  query: mocks.query,
  where: mocks.where,
  serverTimestamp: mocks.serverTimestamp,
}));

vi.mock('@fb/refs.js', () => ({
  refs: {
    users: mocks.users,
    user: mocks.user,
    tales: mocks.tales,
  },
}));

vi.mock('../pagination.service.js', () => ({
  ADMIN_PAGE_SIZE: 20,
  fetchAdminPage: mocks.fetchAdminPage,
}));

vi.mock('../audit.service.js', () => ({
  writeAdminAuditLog: mocks.writeAdminAuditLog,
}));

vi.mock('../session.service.js', () => ({
  getStaffIdentity: mocks.getStaffIdentity,
}));

/** @param {string} id @param {Record<string, unknown>} data */
function makeSnapshot(id, data) {
  return {
    id,
    exists: () => true,
    data: () => data,
  };
}

function makePage(items, { lastDoc = null, hasMore = false } = {}) {
  return { items, lastDoc, hasMore };
}

describe('admin users service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.serverTimestamp.mockReturnValue('server-timestamp');
    mocks.writeAdminAuditLog.mockResolvedValue({ success: true });
  });

  it('pages the users collection instead of deriving users from tales', async () => {
    mocks.fetchAdminPage.mockResolvedValue(
      makePage([{ id: 'user-1', name: 'Ada Lovelace', role: 'author' }], {
        lastDoc: 'cursor-1',
        hasMore: true,
      })
    );

    const result = await listUsersPage();

    expect(refs.users).toHaveBeenCalledTimes(1);
    expect(refs.tales).not.toHaveBeenCalled();
    expect(mocks.fetchAdminPage).toHaveBeenCalledWith('users-collection', {
      conditions: [],
      orderField: 'name',
      direction: 'asc',
      cursor: null,
      pageSize: 20,
    });
    expect(result.items).toEqual([
      { id: 'user-1', uid: 'user-1', name: 'Ada Lovelace', role: 'author' },
    ]);
    expect(result.lastDoc).toBe('cursor-1');
    expect(result.hasMore).toBe(true);
  });

  it('builds a name-prefix range and keeps search results name-ordered', async () => {
    mocks.fetchAdminPage.mockResolvedValue(makePage([]));

    await listUsersPage({ search: '  Ada  ', sort: 'newest', cursor: 'cursor-1' });

    expect(mocks.fetchAdminPage).toHaveBeenCalledWith('users-collection', {
      conditions: [
        ['name', '>=', 'Ada'],
        ['name', '<=', 'Ada\uf8ff'],
      ],
      orderField: 'name',
      direction: 'asc',
      cursor: 'cursor-1',
      pageSize: 20,
    });
  });

  it('orders the newest view by joinedAt descending', async () => {
    mocks.fetchAdminPage.mockResolvedValue(makePage([]));

    await listUsersPage({ sort: 'newest', pageSize: 10 });

    expect(mocks.fetchAdminPage).toHaveBeenCalledWith('users-collection', {
      conditions: [],
      orderField: 'joinedAt',
      direction: 'desc',
      cursor: null,
      pageSize: 10,
    });
  });

  it('resolves an exact profile when the search is a full uid', async () => {
    const uid = 'a'.repeat(28);
    mocks.getDoc.mockResolvedValue(makeSnapshot(uid, { name: 'Exact Reader', role: 'user' }));

    const result = await listUsersPage({ search: uid, sort: 'newest' });

    expect(refs.user).toHaveBeenCalledWith(uid);
    expect(mocks.fetchAdminPage).not.toHaveBeenCalled();
    expect(result.items).toEqual([{ id: uid, uid, name: 'Exact Reader', role: 'user' }]);
    expect(result.lastDoc).toBeNull();
    expect(result.hasMore).toBe(false);
  });

  it('falls back to a name search when a uid-shaped search has no profile', async () => {
    const uid = 'b'.repeat(28);
    mocks.getDoc.mockResolvedValue({ id: uid, exists: () => false, data: () => ({}) });
    mocks.fetchAdminPage.mockResolvedValue(makePage([]));

    await listUsersPage({ search: uid });

    expect(mocks.getDoc).toHaveBeenCalledTimes(1);
    expect(mocks.fetchAdminPage).toHaveBeenCalledWith('users-collection', {
      conditions: [
        ['name', '>=', uid],
        ['name', '<=', `${uid}\uf8ff`],
      ],
      orderField: 'name',
      direction: 'asc',
      cursor: null,
      pageSize: 20,
    });
  });

  it('reads a real profile and a live tale count', async () => {
    mocks.getDoc.mockResolvedValue(
      makeSnapshot('user-1', {
        name: 'Ada Lovelace',
        role: 'author',
        bio: 'Mathematician',
      })
    );
    mocks.getCountFromServer.mockResolvedValue({ data: () => ({ count: 7 }) });

    const result = await getUserDetail('user-1');

    expect(refs.user).toHaveBeenCalledWith('user-1');
    expect(mocks.query).toHaveBeenCalledWith('tales-collection', {
      field: 'authorId',
      op: '==',
      value: 'user-1',
    });
    expect(result).toEqual({
      id: 'user-1',
      uid: 'user-1',
      name: 'Ada Lovelace',
      role: 'author',
      bio: 'Mathematician',
      taleCount: 7,
    });
  });

  it('returns a null tale count when the count query fails', async () => {
    mocks.getDoc.mockResolvedValue(makeSnapshot('user-1', { name: 'Ada Lovelace' }));
    mocks.getCountFromServer.mockRejectedValue(new Error('count unavailable'));

    const result = await getUserDetail('user-1');

    expect(result.taleCount).toBeNull();
    expect(result.name).toBe('Ada Lovelace');
  });

  it('returns null for a missing profile without attempting a count', async () => {
    mocks.getDoc.mockResolvedValue({ id: 'missing', exists: () => false, data: () => ({}) });

    await expect(getUserDetail('missing')).resolves.toBeNull();
    expect(mocks.getCountFromServer).not.toHaveBeenCalled();
  });

  it('writes only supplied flags plus a server timestamp and audits the real caller', async () => {
    mocks.getStaffIdentity.mockResolvedValue({
      uid: 'staff-1',
      role: 'admin',
      email: 'staff@example.com',
      displayName: 'Archive Staff',
    });
    mocks.updateDoc.mockResolvedValue(undefined);

    const result = await updateUserFlags('user-1', { isBanned: true, role: 'moderator' });

    expect(mocks.serverTimestamp).toHaveBeenCalledTimes(1);
    expect(mocks.updateDoc).toHaveBeenCalledWith('user:user-1', {
      isBanned: true,
      role: 'moderator',
      updatedAt: 'server-timestamp',
    });

    const patch = mocks.updateDoc.mock.calls[0][1];
    expect(Object.keys(patch).sort()).toEqual(['isBanned', 'role', 'updatedAt']);

    expect(mocks.writeAdminAuditLog).toHaveBeenCalledWith({
      actorId: 'staff-1',
      actorRole: 'admin',
      action: 'user.flags.update',
      targetType: 'user',
      targetId: 'user-1',
      summary: expect.stringContaining('isBanned'),
    });

    const auditEntry = mocks.writeAdminAuditLog.mock.calls[0][0];
    expect(auditEntry.actorId).not.toBe('user-1');
    expect(auditEntry.summary.length).toBeLessThanOrEqual(1000);
    expect(result).toEqual({ isBanned: true, role: 'moderator' });
  });

  it('ignores keys the Firestore rules would reject', async () => {
    mocks.getStaffIdentity.mockResolvedValue({
      uid: 'staff-1',
      role: 'admin',
      email: '',
      displayName: '',
    });
    mocks.updateDoc.mockResolvedValue(undefined);

    await updateUserFlags('user-1', {
      isVerifiedWriter: false,
      name: 'Injected Name',
      actorId: 'forged-actor',
    });

    expect(mocks.updateDoc).toHaveBeenCalledWith('user:user-1', {
      isVerifiedWriter: false,
      updatedAt: 'server-timestamp',
    });
  });

  it('validates the role against the Firestore enum before any write', async () => {
    expect(USER_ROLES).toEqual(['user', 'author', 'moderator', 'admin']);

    await expect(updateUserFlags('user-1', { role: 'superadmin' })).rejects.toThrow(
      /role must be one of/i
    );
    expect(mocks.getStaffIdentity).not.toHaveBeenCalled();
    expect(mocks.updateDoc).not.toHaveBeenCalled();
    expect(mocks.writeAdminAuditLog).not.toHaveBeenCalled();
  });

  it('rejects non-boolean flag values', async () => {
    await expect(updateUserFlags('user-1', { isBanned: 'yes' })).rejects.toThrow(
      /isBanned must be a boolean/i
    );
    await expect(updateUserFlags('user-1', { isVerifiedWriter: 1 })).rejects.toThrow(
      /isVerifiedWriter must be a boolean/i
    );
    expect(mocks.updateDoc).not.toHaveBeenCalled();
  });

  it('rejects an empty update', async () => {
    await expect(updateUserFlags('user-1', {})).rejects.toThrow(/at least one user flag/i);
    expect(mocks.updateDoc).not.toHaveBeenCalled();
  });

  it('does not write when the staff identity cannot be resolved', async () => {
    mocks.getStaffIdentity.mockRejectedValue(new Error('No staff claim'));

    await expect(updateUserFlags('user-1', { isBanned: true })).rejects.toThrow(/staff claim/i);
    expect(mocks.updateDoc).not.toHaveBeenCalled();
    expect(mocks.writeAdminAuditLog).not.toHaveBeenCalled();
  });

  it('keeps the update when the audit entry fails', async () => {
    mocks.getStaffIdentity.mockResolvedValue({
      uid: 'staff-1',
      role: 'admin',
      email: '',
      displayName: '',
    });
    mocks.updateDoc.mockResolvedValue(undefined);
    mocks.writeAdminAuditLog.mockResolvedValue({ success: false });

    await expect(updateUserFlags('user-1', { isBanned: true })).resolves.toEqual({
      isBanned: true,
    });
    expect(mocks.updateDoc).toHaveBeenCalledTimes(1);
  });

  it('keeps the update when the audit write rejects', async () => {
    mocks.getStaffIdentity.mockResolvedValue({
      uid: 'staff-1',
      role: 'admin',
      email: '',
      displayName: '',
    });
    mocks.updateDoc.mockResolvedValue(undefined);
    mocks.writeAdminAuditLog.mockRejectedValue(new Error('audit offline'));

    await expect(updateUserFlags('user-1', { isVerifiedWriter: true })).resolves.toEqual({
      isVerifiedWriter: true,
    });
    expect(mocks.updateDoc).toHaveBeenCalledTimes(1);
  });
});
