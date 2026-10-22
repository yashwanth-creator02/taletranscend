// src/pages/admin/modules/users/__tests__/users.test.js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '../users.js';
import { listUsersPage, getUserDetail, updateUserFlags } from '@services/admin/users.service.js';

const serviceMocks = vi.hoisted(() => ({
  listUsersPage: vi.fn(),
  getUserDetail: vi.fn(),
  updateUserFlags: vi.fn(),
}));

const uiMocks = vi.hoisted(() => ({
  showConfirmModal: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('@services/admin/users.service.js', () => ({
  listUsersPage: serviceMocks.listUsersPage,
  getUserDetail: serviceMocks.getUserDetail,
  updateUserFlags: serviceMocks.updateUserFlags,
  USER_ROLES: ['user', 'author', 'moderator', 'admin'],
}));

vi.mock('@/ui/components/confirmModal.js', () => ({
  showConfirmModal: uiMocks.showConfirmModal,
}));

vi.mock('@/ui/components/toast.js', () => ({
  showToast: uiMocks.showToast,
}));

const ADMIN_ACCESS = {
  role: 'admin',
  isAdmin: true,
  isModerator: false,
  isStaff: true,
  isAuthor: false,
  canEnter: true,
};

/** @param {Record<string, unknown>} [overrides] */
function makeUser(overrides = {}) {
  return {
    id: 'user-1',
    uid: 'user-1',
    name: 'Ada Lovelace',
    role: 'author',
    joinedAt: '2026-01-02T03:04:00Z',
    isBanned: false,
    isVerifiedWriter: false,
    ...overrides,
  };
}

function makePage(items, { lastDoc = null, hasMore = false } = {}) {
  return { items, lastDoc, hasMore };
}

function setup(access = ADMIN_ACCESS) {
  document.body.innerHTML = '<div id="admin-container"></div>';
  const container = document.getElementById('admin-container');
  const unmount = mount({ container, access, navigate: vi.fn() });
  return { container, unmount };
}

async function openDetailFor(container) {
  const viewButton = container.querySelector('[data-action="view-user"]');
  expect(viewButton).not.toBeNull();
  viewButton.click();
  await vi.waitFor(() => {
    expect(getUserDetail).toHaveBeenCalled();
  });
  await vi.waitFor(() => {
    expect(container.querySelector('.admin-detail-panel')).not.toBeNull();
  });
}

describe('admin users module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.listUsersPage.mockResolvedValue(makePage([]));
    serviceMocks.getUserDetail.mockResolvedValue(null);
    serviceMocks.updateUserFlags.mockResolvedValue({});
    uiMocks.showConfirmModal.mockResolvedValue(true);
  });

  it('blocks non-administrators without reading user data', () => {
    const { container } = setup({ ...ADMIN_ACCESS, role: 'moderator', isAdmin: false });

    expect(container.textContent).toContain('Administrator access is required');
    expect(listUsersPage).not.toHaveBeenCalled();
    expect(container.querySelector('[data-role="search"]')).toBeNull();
  });

  it('renders real profiles with a count, controls, and cursor pagination', async () => {
    serviceMocks.listUsersPage.mockResolvedValue(
      makePage([makeUser()], { lastDoc: { id: 'cursor-1' }, hasMore: true })
    );

    const { container, unmount } = setup();

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Ada Lovelace');
    });

    expect(listUsersPage).toHaveBeenCalledWith({
      search: '',
      sort: 'name',
      cursor: null,
      pageSize: 20,
    });
    expect(container.querySelector('[data-role="search"]')).not.toBeNull();
    expect(container.querySelector('[data-role="sort"]').value).toBe('name');
    expect(container.querySelector('[data-region="count"]').textContent).toContain('1+');
    expect(container.querySelector('[data-action="load-more"]')).not.toBeNull();
    expect(window.loadMore).toBeUndefined();
    expect(window.handleBan).toBeUndefined();
    expect(container.innerHTML).not.toContain('onclick');
    expect(container.innerHTML).not.toContain('onchange');

    unmount();
  });

  it('debounces search and starts a fresh cursor query', async () => {
    serviceMocks.listUsersPage
      .mockResolvedValueOnce(makePage([makeUser()]))
      .mockResolvedValueOnce(
        makePage([makeUser({ id: 'user-2', uid: 'user-2', name: 'Grace Hopper' })])
      );

    const { container, unmount } = setup();

    await vi.waitFor(() => {
      expect(listUsersPage).toHaveBeenCalledTimes(1);
    });

    const search = container.querySelector('[data-role="search"]');
    search.value = 'Grace';
    search.dispatchEvent(new Event('input', { bubbles: true }));

    expect(listUsersPage).toHaveBeenCalledTimes(1);

    await vi.waitFor(
      () => {
        expect(listUsersPage).toHaveBeenCalledTimes(2);
      },
      { timeout: 2000 }
    );

    expect(listUsersPage).toHaveBeenLastCalledWith({
      search: 'Grace',
      sort: 'name',
      cursor: null,
      pageSize: 20,
    });
    await vi.waitFor(() => {
      expect(container.textContent).toContain('Grace Hopper');
    });

    unmount();
  });

  it('reloads from the first page when the sort changes', async () => {
    serviceMocks.listUsersPage.mockResolvedValue(makePage([makeUser()]));

    const { container, unmount } = setup();

    await vi.waitFor(() => {
      expect(listUsersPage).toHaveBeenCalledTimes(1);
    });

    const sort = container.querySelector('[data-role="sort"]');
    sort.value = 'newest';
    sort.dispatchEvent(new Event('change', { bubbles: true }));

    await vi.waitFor(() => {
      expect(listUsersPage).toHaveBeenLastCalledWith({
        search: '',
        sort: 'newest',
        cursor: null,
        pageSize: 20,
      });
    });

    unmount();
  });

  it('appends the next cursor page and removes the load-more control at the end', async () => {
    serviceMocks.listUsersPage
      .mockResolvedValueOnce(makePage([makeUser()], { lastDoc: { id: 'cursor-1' }, hasMore: true }))
      .mockResolvedValueOnce(
        makePage([makeUser({ id: 'user-2', uid: 'user-2', name: 'Grace Hopper' })])
      );

    const { container, unmount } = setup();

    await vi.waitFor(() => {
      expect(container.querySelector('[data-action="load-more"]')).not.toBeNull();
    });

    container.querySelector('[data-action="load-more"]').click();

    await vi.waitFor(() => {
      expect(listUsersPage).toHaveBeenCalledTimes(2);
    });

    expect(listUsersPage).toHaveBeenLastCalledWith({
      search: '',
      sort: 'name',
      cursor: { id: 'cursor-1' },
      pageSize: 20,
    });
    await vi.waitFor(() => {
      expect(container.textContent).toContain('Grace Hopper');
    });
    expect(container.textContent).toContain('Ada Lovelace');
    expect(container.querySelector('[data-action="load-more"]')).toBeNull();

    unmount();
  });

  it('shows an error state with retry when the first page fails', async () => {
    serviceMocks.listUsersPage
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(makePage([makeUser()]));

    const { container, unmount } = setup();

    await vi.waitFor(() => {
      expect(container.querySelector('.admin-error')).not.toBeNull();
    });
    expect(container.textContent).toContain('Could not load user profiles');

    container.querySelector('[data-action="retry-list"]').click();

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Ada Lovelace');
    });
    expect(listUsersPage).toHaveBeenCalledTimes(2);

    unmount();
  });

  it('renders the detail panel from the real profile and live tale count', async () => {
    serviceMocks.listUsersPage.mockResolvedValue(makePage([makeUser()]));
    serviceMocks.getUserDetail.mockResolvedValue({
      ...makeUser({ isVerifiedWriter: true }),
      penName: 'A. Lovelace',
      location: 'London',
      bio: 'Mathematician and writer',
      taleCount: 4,
    });

    const { container, unmount } = setup();

    await vi.waitFor(() => {
      expect(container.querySelector('[data-action="view-user"]')).not.toBeNull();
    });

    await openDetailFor(container);

    expect(getUserDetail).toHaveBeenCalledWith('user-1');
    expect(container.textContent).toContain('Mathematician and writer');
    expect(container.textContent).toContain('A. Lovelace');
    expect(container.textContent).toContain('London');
    expect(container.textContent).toContain('Tales authored');
    expect(container.textContent).toContain('4');
    expect(container.textContent).toContain('user-1');
    expect(container.querySelector('[data-action="view-user"]').textContent.trim()).toBe('Close');

    unmount();
  });

  it('never invents a tale count when the live count is unavailable', async () => {
    serviceMocks.listUsersPage.mockResolvedValue(makePage([makeUser()]));
    serviceMocks.getUserDetail.mockResolvedValue({ ...makeUser(), taleCount: null });

    const { container, unmount } = setup();

    await vi.waitFor(() => {
      expect(container.querySelector('[data-action="view-user"]')).not.toBeNull();
    });
    await openDetailFor(container);

    expect(container.textContent).toContain('Unavailable');

    unmount();
  });

  it('handles a missing profile in the detail panel', async () => {
    serviceMocks.listUsersPage.mockResolvedValue(makePage([makeUser()]));
    serviceMocks.getUserDetail.mockResolvedValue(null);

    const { container, unmount } = setup();

    await vi.waitFor(() => {
      expect(container.querySelector('[data-action="view-user"]')).not.toBeNull();
    });

    container.querySelector('[data-action="view-user"]').click();

    await vi.waitFor(() => {
      expect(container.textContent).toContain('no longer exists');
    });
    expect(container.querySelector('[data-action="retry-detail"]')).not.toBeNull();

    unmount();
  });

  it('confirms a ban and sends only the isBanned flag', async () => {
    serviceMocks.listUsersPage.mockResolvedValue(makePage([makeUser()]));
    serviceMocks.getUserDetail.mockResolvedValue({ ...makeUser(), taleCount: 0 });
    serviceMocks.updateUserFlags.mockResolvedValue({ isBanned: true });

    const { container, unmount } = setup();

    await vi.waitFor(() => {
      expect(container.querySelector('[data-action="view-user"]')).not.toBeNull();
    });
    await openDetailFor(container);

    container.querySelector('[data-action="toggle-ban"]').click();

    await vi.waitFor(() => {
      expect(uiMocks.showConfirmModal).toHaveBeenCalledTimes(1);
    });
    expect(uiMocks.showConfirmModal).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Ban this reader?',
        confirmVariant: 'danger',
      })
    );

    await vi.waitFor(() => {
      expect(updateUserFlags).toHaveBeenCalledWith('user-1', { isBanned: true });
    });
    await vi.waitFor(() => {
      expect(uiMocks.showToast).toHaveBeenCalledWith('Reader banned.', 'success');
    });
    expect(container.textContent).toContain('Unban user');

    unmount();
  });

  it('does not update when the ban confirmation is cancelled', async () => {
    serviceMocks.listUsersPage.mockResolvedValue(makePage([makeUser()]));
    serviceMocks.getUserDetail.mockResolvedValue({ ...makeUser(), taleCount: 0 });
    uiMocks.showConfirmModal.mockResolvedValue(false);

    const { container, unmount } = setup();

    await vi.waitFor(() => {
      expect(container.querySelector('[data-action="view-user"]')).not.toBeNull();
    });
    await openDetailFor(container);

    container.querySelector('[data-action="toggle-ban"]').click();

    await vi.waitFor(() => {
      expect(uiMocks.showConfirmModal).toHaveBeenCalledTimes(1);
    });
    expect(updateUserFlags).not.toHaveBeenCalled();

    unmount();
  });

  it('toggles writer verification without a confirmation dialog', async () => {
    serviceMocks.listUsersPage.mockResolvedValue(makePage([makeUser()]));
    serviceMocks.getUserDetail.mockResolvedValue({ ...makeUser(), taleCount: 0 });
    serviceMocks.updateUserFlags.mockResolvedValue({
      isVerifiedWriter: true,
    });

    const { container, unmount } = setup();

    await vi.waitFor(() => {
      expect(container.querySelector('[data-action="view-user"]')).not.toBeNull();
    });
    await openDetailFor(container);

    container.querySelector('[data-action="toggle-verified"]').click();

    await vi.waitFor(() => {
      expect(updateUserFlags).toHaveBeenCalledWith('user-1', { isVerifiedWriter: true });
    });
    expect(uiMocks.showConfirmModal).not.toHaveBeenCalled();
    expect(uiMocks.showToast).toHaveBeenCalledWith('Writer verified.', 'success');

    unmount();
  });

  it('confirms a role change and sends only the validated role', async () => {
    serviceMocks.listUsersPage.mockResolvedValue(makePage([makeUser()]));
    serviceMocks.getUserDetail.mockResolvedValue({ ...makeUser(), taleCount: 0 });
    serviceMocks.updateUserFlags.mockResolvedValue({ role: 'moderator' });

    const { container, unmount } = setup();

    await vi.waitFor(() => {
      expect(container.querySelector('[data-action="view-user"]')).not.toBeNull();
    });
    await openDetailFor(container);

    const roleSelect = container.querySelector('[data-role="role-select"]');
    roleSelect.value = 'moderator';
    container.querySelector('[data-action="apply-role"]').click();

    await vi.waitFor(() => {
      expect(uiMocks.showConfirmModal).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Change this profile role?' })
      );
    });
    await vi.waitFor(() => {
      expect(updateUserFlags).toHaveBeenCalledWith('user-1', { role: 'moderator' });
    });

    unmount();
  });

  it('escapes names and bios before rendering them or interpolating a modal message', async () => {
    const hostile = '<img src=x onerror="window.__usersPwned=1">';
    serviceMocks.listUsersPage.mockResolvedValue(makePage([makeUser({ name: hostile })]));
    serviceMocks.getUserDetail.mockResolvedValue({
      ...makeUser({ name: hostile }),
      bio: hostile,
      taleCount: 1,
    });

    const { container, unmount } = setup();

    await vi.waitFor(() => {
      expect(container.textContent).toContain(hostile);
    });
    expect(container.querySelector('img')).toBeNull();
    expect(window.__usersPwned).toBeUndefined();

    await openDetailFor(container);

    expect(container.querySelector('img')).toBeNull();

    container.querySelector('[data-action="toggle-ban"]').click();

    await vi.waitFor(() => {
      expect(uiMocks.showConfirmModal).toHaveBeenCalledTimes(1);
    });
    const message = uiMocks.showConfirmModal.mock.calls[0][0].message;
    expect(message).toContain('&lt;img');
    expect(message).not.toContain('<img');

    unmount();
  });

  it('removes listeners and cancels a pending search timer on cleanup', async () => {
    serviceMocks.listUsersPage.mockResolvedValue(makePage([makeUser()]));

    const { container, unmount } = setup();

    await vi.waitFor(() => {
      expect(listUsersPage).toHaveBeenCalledTimes(1);
    });

    const search = container.querySelector('[data-role="search"]');
    search.value = 'Grace';
    search.dispatchEvent(new Event('input', { bubbles: true }));

    unmount();

    search.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(listUsersPage).toHaveBeenCalledTimes(1);
  });
});
