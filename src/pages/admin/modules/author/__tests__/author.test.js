// src/pages/admin/modules/author/__tests__/author.test.js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '../author.js';
import {
  getAuthorTalesPage,
  getAuthorDeletionRequestsPage,
  requestTaleDeletion,
} from '@services/admin/mycontent.service.js';
import { showToast } from '@/ui/components/toast.js';

vi.mock('@services/admin/mycontent.service.js', () => ({
  DELETION_REASON_MIN: 5,
  DELETION_REASON_MAX: 2000,
  getAuthorTalesPage: vi.fn(),
  getAuthorDeletionRequestsPage: vi.fn(),
  requestTaleDeletion: vi.fn(),
}));

vi.mock('@/ui/components/toast.js', () => ({
  showToast: vi.fn(),
}));

function tale(overrides = {}) {
  return {
    id: 'tale-1',
    title: 'The Lantern Keeper',
    status: 'published',
    wordCount: 1500,
    publishedAt: '2026-10-01T10:00:00Z',
    commentCount: 5,
    ...overrides,
  };
}

function request(overrides = {}) {
  return {
    id: 'req-1',
    taleId: 'tale-1',
    status: 'pending',
    createdAt: '2026-10-02T10:00:00Z',
    reason: 'Outdated chapters.',
    ...overrides,
  };
}

describe('author module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="admin-container"></div>';
    getAuthorTalesPage.mockResolvedValue({
      items: [tale()],
      lastDoc: null,
      hasMore: false,
    });
    getAuthorDeletionRequestsPage.mockResolvedValue({
      items: [],
      lastDoc: null,
      hasMore: false,
    });
  });

  it('renders tales with links and their deletion-request state', async () => {
    getAuthorDeletionRequestsPage.mockResolvedValue({
      items: [request()],
      lastDoc: null,
      hasMore: false,
    });

    const container = document.getElementById('admin-container');
    const unmount = mount({ container, access: { role: 'author', isAuthor: true } });

    await vi.waitFor(() => {
      expect(container.textContent).toContain('The Lantern Keeper');
    });

    const link = container.querySelector('a[href="tale.html?id=tale-1"]');
    expect(link).not.toBeNull();
    expect(container.textContent).toContain('pending');
    expect(container.textContent).toContain('Outdated chapters.');
    const requestButton = container.querySelector('[data-action="request-deletion"]');
    expect(requestButton).not.toBeNull();
    expect(requestButton.disabled).toBe(true);
    expect(requestButton.textContent).toContain('Request Pending');
    expect(container.textContent).not.toContain('Pending Reports');
    expect(container.innerHTML).not.toContain('onclick=');

    unmount();
  });

  it('allows another request when the previous request was rejected', async () => {
    getAuthorDeletionRequestsPage.mockResolvedValue({
      items: [request({ status: 'rejected' })],
      lastDoc: null,
      hasMore: false,
    });

    const container = document.getElementById('admin-container');
    const unmount = mount({ container, access: { role: 'author', isAuthor: true } });

    await vi.waitFor(() => {
      expect(container.textContent).toContain('The Lantern Keeper');
    });

    const requestButton = container.querySelector('[data-action="request-deletion"]');
    expect(requestButton.disabled).toBe(false);
    expect(requestButton.textContent).toContain('Request Again');

    requestButton.click();

    await vi.waitFor(() => {
      expect(container.querySelector('[data-role="deletion-reason"]')).not.toBeNull();
    });

    unmount();
  });

  it('rejects a reason shorter than five characters without calling the service', async () => {
    const container = document.getElementById('admin-container');
    const unmount = mount({ container, access: { role: 'author', isAuthor: true } });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-action="request-deletion"]')).not.toBeNull();
    });

    container.querySelector('[data-action="request-deletion"]').click();

    await vi.waitFor(() => {
      expect(container.querySelector('[data-role="deletion-reason"]')).not.toBeNull();
    });

    const textarea = container.querySelector('[data-role="deletion-reason"]');
    textarea.value = 'bad';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    const form = container.querySelector('[data-role="deletion-form"]');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Enter a reason between 5 and 2000 characters.');
    });
    expect(requestTaleDeletion).not.toHaveBeenCalled();

    unmount();
  });

  it('submits a trimmed valid reason and reloads the author content', async () => {
    requestTaleDeletion.mockResolvedValue('req-new');

    const container = document.getElementById('admin-container');
    const unmount = mount({ container, access: { role: 'author', isAuthor: true } });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-action="request-deletion"]')).not.toBeNull();
    });

    container.querySelector('[data-action="request-deletion"]').click();

    await vi.waitFor(() => {
      expect(container.querySelector('[data-role="deletion-reason"]')).not.toBeNull();
    });

    const textarea = container.querySelector('[data-role="deletion-reason"]');
    textarea.value = '  This tale is outdated.  ';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    const form = container.querySelector('[data-role="deletion-form"]');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(requestTaleDeletion).toHaveBeenCalledWith('tale-1', 'This tale is outdated.');
      expect(showToast).toHaveBeenCalledWith('Deletion request submitted.', 'success');
    });

    expect(container.querySelector('[data-role="deletion-form"]')).toBeNull();
    expect(getAuthorTalesPage).toHaveBeenCalledTimes(2);

    unmount();
  });

  it('loads more tales and requests with their cursors', async () => {
    getAuthorTalesPage
      .mockResolvedValueOnce({
        items: [tale()],
        lastDoc: 'tales-cursor',
        hasMore: true,
      })
      .mockResolvedValueOnce({
        items: [tale({ id: 'tale-2', title: 'A Second Tale' })],
        lastDoc: 'tales-cursor-2',
        hasMore: false,
      });
    getAuthorDeletionRequestsPage
      .mockResolvedValueOnce({
        items: [request()],
        lastDoc: 'requests-cursor',
        hasMore: true,
      })
      .mockResolvedValueOnce({
        items: [request({ id: 'req-2', taleId: 'tale-2', status: 'rejected' })],
        lastDoc: null,
        hasMore: false,
      });

    const container = document.getElementById('admin-container');
    const unmount = mount({ container, access: { role: 'author', isAuthor: true } });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-action="load-more-tales"]')).not.toBeNull();
      expect(container.querySelector('[data-action="load-more-requests"]')).not.toBeNull();
    });

    container.querySelector('[data-action="load-more-tales"]').click();

    await vi.waitFor(() => {
      expect(container.textContent).toContain('A Second Tale');
    });
    expect(getAuthorTalesPage.mock.calls[1][0]).toBe('tales-cursor');

    container.querySelector('[data-action="load-more-requests"]').click();

    await vi.waitFor(() => {
      expect(container.querySelectorAll('tbody tr')).toHaveLength(4);
    });
    expect(getAuthorDeletionRequestsPage.mock.calls[1][0]).toBe('requests-cursor');

    unmount();
  });

  it('renders a load error and retries', async () => {
    getAuthorTalesPage
      .mockRejectedValueOnce(new Error('permission-denied'))
      .mockResolvedValueOnce({ items: [tale()], lastDoc: null, hasMore: false });

    const container = document.getElementById('admin-container');
    const unmount = mount({ container, access: { role: 'author', isAuthor: true } });

    await vi.waitFor(() => {
      expect(container.textContent).toContain(
        'Your tales and deletion requests could not be read.'
      );
    });

    container.querySelector('[data-action="retry"]').click();

    await vi.waitFor(() => {
      expect(container.textContent).toContain('The Lantern Keeper');
    });

    unmount();
  });

  it('stops listening after unmount', async () => {
    const container = document.getElementById('admin-container');
    const unmount = mount({ container, access: { role: 'author', isAuthor: true } });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-action="request-deletion"]')).not.toBeNull();
    });

    unmount();
    container.querySelector('[data-action="request-deletion"]').click();
    await Promise.resolve();

    expect(container.querySelector('[data-role="deletion-reason"]')).toBeNull();
    expect(requestTaleDeletion).not.toHaveBeenCalled();
  });
});
