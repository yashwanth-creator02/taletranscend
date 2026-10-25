// src/pages/admin/modules/deletions/__tests__/deletions.test.js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '../deletions.js';
import {
  listDeletionRequestsPage,
  getDeletionRequestDetail,
  decideDeletionRequest,
} from '@services/admin/deletion.service.js';
import { showConfirmModal } from '@/ui/components/confirmModal.js';
import { showToast } from '@/ui/components/toast.js';

vi.mock('@services/admin/deletion.service.js', () => ({
  listDeletionRequestsPage: vi.fn(),
  getDeletionRequestDetail: vi.fn(),
  decideDeletionRequest: vi.fn(),
}));

vi.mock('@/ui/components/confirmModal.js', () => ({
  showConfirmModal: vi.fn(),
}));

vi.mock('@/ui/components/toast.js', () => ({
  showToast: vi.fn(),
}));

const ACCESS = { role: 'admin', isAdmin: true, isModerator: false, isStaff: true };

const REQUEST = {
  id: 'req-1',
  taleId: 'tale-1',
  userId: 'author-1',
  reason: 'The author wishes to withdraw the chronicle.',
  status: 'pending',
  createdAt: '2026-10-01T10:00:00.000Z',
};

const DETAIL = {
  ...REQUEST,
  tale: {
    id: 'tale-1',
    title: 'The Long Night',
    authorId: 'author-1',
    authorName: 'A. Author',
  },
};

/**
 * @returns {HTMLElement}
 */
function createContainer() {
  document.body.innerHTML = '<div id="admin-container"></div>';
  return document.getElementById('admin-container');
}

describe('deletion module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listDeletionRequestsPage).mockResolvedValue({
      items: [],
      lastDoc: null,
      hasMore: false,
    });
    vi.mocked(getDeletionRequestDetail).mockResolvedValue(DETAIL);
    vi.mocked(decideDeletionRequest).mockResolvedValue({
      requestId: 'req-1',
      status: 'approved',
    });
    vi.mocked(showConfirmModal).mockResolvedValue(true);
  });

  it('renders pending requests with delegated controls and no inline handlers', async () => {
    vi.mocked(listDeletionRequestsPage).mockResolvedValue({
      items: [REQUEST],
      lastDoc: null,
      hasMore: false,
    });

    const container = createContainer();
    const unmount = mount({ container, access: ACCESS });

    await vi.waitFor(() => {
      expect(container.textContent).toContain('The author wishes to withdraw the chronicle.');
    });

    expect(container.querySelector('table.admin-table')).not.toBeNull();
    expect(container.querySelector('[data-filter="status"]')).not.toBeNull();
    expect(container.querySelector('[data-filter="direction"]')).not.toBeNull();
    expect(container.querySelector('[onclick]')).toBeNull();
    expect(container.querySelector('[onchange]')).toBeNull();
    expect(window.handleApprove).toBeUndefined();

    unmount();
  });

  it('reloads the first page when the status or sort filter changes', async () => {
    const container = createContainer();
    const unmount = mount({ container, access: ACCESS });

    await vi.waitFor(() => {
      expect(listDeletionRequestsPage).toHaveBeenCalledWith({
        status: 'pending',
        search: '',
        direction: 'desc',
      });
    });

    const statusFilter = container.querySelector('[data-filter="status"]');
    statusFilter.value = 'approved';
    statusFilter.dispatchEvent(new Event('change', { bubbles: true }));

    await vi.waitFor(() => {
      expect(listDeletionRequestsPage).toHaveBeenLastCalledWith({
        status: 'approved',
        search: '',
        direction: 'desc',
      });
    });

    const directionFilter = container.querySelector('[data-filter="direction"]');
    directionFilter.value = 'asc';
    directionFilter.dispatchEvent(new Event('change', { bubbles: true }));

    await vi.waitFor(() => {
      expect(listDeletionRequestsPage).toHaveBeenLastCalledWith({
        status: 'approved',
        search: '',
        direction: 'asc',
      });
    });

    unmount();
  });

  it('searches by tale id prefix after a debounce', async () => {
    const container = createContainer();
    const unmount = mount({ container, access: ACCESS });

    await vi.waitFor(() => {
      expect(listDeletionRequestsPage).toHaveBeenCalledTimes(1);
    });

    const search = container.querySelector('[data-role="search"]');
    search.value = 'tale-';
    search.dispatchEvent(new Event('input', { bubbles: true }));

    await vi.waitFor(
      () => {
        expect(listDeletionRequestsPage).toHaveBeenLastCalledWith({
          status: 'pending',
          search: 'tale-',
          direction: 'desc',
        });
      },
      { timeout: 1500 }
    );
    expect(container.textContent).toContain('No deletion requests match that search');

    unmount();
  });

  it('appends the next cursor page when Load more is pressed', async () => {
    const cursor = { id: 'cursor-1' };
    vi.mocked(listDeletionRequestsPage)
      .mockResolvedValueOnce({ items: [REQUEST], lastDoc: cursor, hasMore: true })
      .mockResolvedValueOnce({
        items: [{ ...REQUEST, id: 'req-2', reason: 'Second petition reason.' }],
        lastDoc: null,
        hasMore: false,
      });

    const container = createContainer();
    const unmount = mount({ container, access: ACCESS });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-action="load-more"]')).not.toBeNull();
    });

    container.querySelector('[data-action="load-more"]').click();

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Second petition reason.');
    });
    expect(listDeletionRequestsPage).toHaveBeenLastCalledWith({
      status: 'pending',
      search: '',
      direction: 'desc',
      cursor,
    });

    unmount();
  });

  it('opens a detail panel with the tale title, author, and reason', async () => {
    vi.mocked(listDeletionRequestsPage).mockResolvedValue({
      items: [REQUEST],
      lastDoc: null,
      hasMore: false,
    });

    const container = createContainer();
    const unmount = mount({ container, access: ACCESS });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-action="view"]')).not.toBeNull();
    });

    container.querySelector('[data-action="view"]').click();

    await vi.waitFor(() => {
      expect(container.querySelector('.admin-detail-panel')).not.toBeNull();
    });
    expect(container.textContent).toContain('The Long Night');
    expect(container.textContent).toContain('A. Author');
    expect(container.textContent).toContain('The author wishes to withdraw the chronicle.');
    expect(getDeletionRequestDetail).toHaveBeenCalledWith('req-1');

    unmount();
  });

  it('confirms removal from public view before approving and passes reviewer notes', async () => {
    vi.mocked(listDeletionRequestsPage).mockResolvedValue({
      items: [REQUEST],
      lastDoc: null,
      hasMore: false,
    });

    const container = createContainer();
    const unmount = mount({ container, access: ACCESS });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-action="view"]')).not.toBeNull();
    });
    container.querySelector('[data-action="view"]').click();
    await vi.waitFor(() => {
      expect(container.querySelector('[data-role="deletion-notes"]')).not.toBeNull();
    });

    container.querySelector('[data-role="deletion-notes"]').value = 'Verified by council.';
    container.querySelector('[data-action="decide"][data-decision="approved"]').click();

    await vi.waitFor(() => {
      expect(decideDeletionRequest).toHaveBeenCalledWith('req-1', 'approved', {
        notes: 'Verified by council.',
      });
    });

    expect(showConfirmModal).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('remove'),
      })
    );
    expect(showConfirmModal.mock.calls[0][0].message).toContain('The Long Night');
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('removed'), 'success');

    unmount();
  });

  it('does not decide anything when the confirmation is cancelled', async () => {
    vi.mocked(showConfirmModal).mockResolvedValue(false);
    vi.mocked(listDeletionRequestsPage).mockResolvedValue({
      items: [REQUEST],
      lastDoc: null,
      hasMore: false,
    });

    const container = createContainer();
    const unmount = mount({ container, access: ACCESS });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-action="view"]')).not.toBeNull();
    });
    container.querySelector('[data-action="view"]').click();
    await vi.waitFor(() => {
      expect(
        container.querySelector('[data-action="decide"][data-decision="rejected"]')
      ).not.toBeNull();
    });

    container.querySelector('[data-action="decide"][data-decision="rejected"]').click();

    await vi.waitFor(() => {
      expect(showConfirmModal).toHaveBeenCalled();
    });
    expect(decideDeletionRequest).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();

    unmount();
  });

  it('shows an error state and retries the page load', async () => {
    vi.mocked(listDeletionRequestsPage)
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce({ items: [REQUEST], lastDoc: null, hasMore: false });

    const container = createContainer();
    const unmount = mount({ container, access: ACCESS });

    await vi.waitFor(() => {
      expect(container.querySelector('.admin-error')).not.toBeNull();
    });
    expect(container.textContent).toContain('network unavailable');

    container.querySelector('[data-action="retry"]').click();

    await vi.waitFor(() => {
      expect(container.textContent).toContain('The author wishes to withdraw the chronicle.');
    });
    expect(listDeletionRequestsPage).toHaveBeenCalledTimes(2);

    unmount();
  });

  it('removes delegated listeners on unmount', async () => {
    const container = createContainer();
    const unmount = mount({ container, access: ACCESS });

    await vi.waitFor(() => {
      expect(listDeletionRequestsPage).toHaveBeenCalledTimes(1);
    });

    unmount();
    container
      .querySelector('[data-filter="status"]')
      .dispatchEvent(new Event('change', { bubbles: true }));

    expect(listDeletionRequestsPage).toHaveBeenCalledTimes(1);
  });
});
