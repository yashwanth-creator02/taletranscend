// src/pages/admin/modules/users/__tests__/users.test.js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '../users.js';
import {
  listUsersPage,
  getUserDetail,
  updateWriterVerification,
} from '@services/admin/users.service.js';

const serviceMocks = vi.hoisted(() => ({
  listUsersPage: vi.fn(),
  getUserDetail: vi.fn(),
  updateWriterVerification: vi.fn(),
}));

const uiMocks = vi.hoisted(() => ({
  showToast: vi.fn(),
}));

vi.mock('@services/admin/users.service.js', () => ({
  listUsersPage: serviceMocks.listUsersPage,
  getUserDetail: serviceMocks.getUserDetail,
  updateWriterVerification: serviceMocks.updateWriterVerification,
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
    serviceMocks.updateWriterVerification.mockResolvedValue({ isVerifiedWriter: false });
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
    expect(window.updateWriterVerification).toBeUndefined();
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

  it('offers writer verification but no role or ban controls', async () => {
    serviceMocks.listUsersPage.mockResolvedValue(makePage([makeUser()]));
    serviceMocks.getUserDetail.mockResolvedValue({ ...makeUser(), taleCount: 0 });

    const { container, unmount } = setup();

    await vi.waitFor(() => {
      expect(container.querySelector('[data-action="view-user"]')).not.toBeNull();
    });
    await openDetailFor(container);

    expect(container.querySelector('[data-action="toggle-verified"]')).not.toBeNull();
    expect(container.querySelector('[data-action="toggle-ban"]')).toBeNull();
    expect(container.querySelector('[data-action="apply-role"]')).toBeNull();
    expect(container.querySelector('[data-role="role-select"]')).toBeNull();
    expect(container.textContent).toContain('does not change them');

    unmount();
  });

  it('toggles writer verification without a confirmation dialog', async () => {
    serviceMocks.listUsersPage.mockResolvedValue(makePage([makeUser()]));
    serviceMocks.getUserDetail.mockResolvedValue({ ...makeUser(), taleCount: 0 });
    serviceMocks.updateWriterVerification.mockResolvedValue({
      isVerifiedWriter: true,
    });

    const { container, unmount } = setup();

    await vi.waitFor(() => {
      expect(container.querySelector('[data-action="view-user"]')).not.toBeNull();
    });
    await openDetailFor(container);

    container.querySelector('[data-action="toggle-verified"]').click();

    await vi.waitFor(() => {
      expect(updateWriterVerification).toHaveBeenCalledWith('user-1', true);
    });
    expect(uiMocks.showToast).toHaveBeenCalledWith('Writer verified.', 'success');

    unmount();
  });

  it('escapes names and bios before rendering them', async () => {
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
    expect(window.__usersPwned).toBeUndefined();

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
